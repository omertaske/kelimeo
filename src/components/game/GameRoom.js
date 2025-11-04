import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../hooks/useSound';
import { toLowerCaseTurkish } from '../../helpers/stringHelpers';
import { useMatchGame } from '../../services/matchGameService';
import { useSocket } from '../../context/SocketContext';
import { v4 as uuidv4 } from 'uuid';
import { tilesToPayload, applyBoardDiffImmutable } from '../../utils/game/tileAdapter';
import Toast from '../gameRoom/ui/Toast';
import { logEvent, incrementCounter } from '../../utils/telemetry';
import ScoreStar from '../gameRoom/ui/ScoreStar';
import { mapMatchErrorCode } from '../../utils/errorMap';
import GameEndScreen from '../gameRoom/ui/GameEndScreen';
import BagDrawer from '../gameRoom/ui/BagDrawer';
import BlankLetterModal from '../gameRoom/ui/BlankLetterModal';
import './GameRoom.css';
import './GameBoard.css';
import t from '../../i18n';
import { getConfig } from '../../config/runtimeConfig';
import { shouldEnableMultiplayer } from '../../config/rollout';
import { computePreviewBoard } from '../../utils/game/preview';
import { validateOrientationAndContiguity as validateOC } from '../../utils/game/validators';
import { isMyTurn } from '../../utils/game/selectors';
import { toServerPlayerId } from '../../utils/game/playerMap';

// Yardımcılar
const toastForTurnReason = (reason) => {
  if (reason === 'timeout') return t('toast.turnTimeout');
  if (reason === 'pass') return t('toast.pass');
  return t('toast.turnChanged');
};

const multiplierLabel = (m) => {
  if (m === 'TW') return '×3';
  if (m === 'DW') return '×2';
  if (m === 'TL') return '×3';
  if (m === 'DL') return '×2';
  return m || '';
};

// (taşındı) Yerleştirme doğrulamaları utils/validators.js'de

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = useMemo(() => {
    if (location.state) return location.state;
    // Fallback: refresh/reconnect durumunda son maçı sessionStorage'tan yükle
    try {
      const saved = sessionStorage.getItem('kelimeo:lastMatch');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.roomId === roomId) return parsed;
      }
    } catch {}
    return {};
  }, [location.state, roomId]);
  const matchId = initialData?.matchId;
  const partnerId = initialData?.partnerId;
  const mpMode = !!matchId; // Eşleşmeden geldiysek çok oyunculu mod
  const { on, off } = useSocket();
  const {
    joinMatch: mpJoinMatch,
    placeTiles: mpPlaceTiles,
    passTurn: mpPassTurn,
    shuffleRack: mpShuffleRack,
    leaveMatch: mpLeaveMatch,
    requestFullState,
    onGameReady,
    onStatePatch,
    onTurnChanged,
    onOpponentLeft,
    onGameOver,
    onMatchError,
    onWaitingOpponent,
    onFullState,
    onYourRack,
  } = useMatchGame();
  const { 
    gameState, 
    GAME_STATES, 
    BOARD_TYPES,
    currentRoom,
    opponent,
    matchingTimer,
    gameTimer,
    turnTimer, // 60 saniye hamle süresi
    currentTurn,
    playerLetters,
    gameBoard,
    score,
    makeMove,
    leaveGame,
    joinRoom,
    shuffleLetters,
    passMove,
    placedTiles,
    placeTile,
    removeTile,
    clearPlacedTiles,
    lastMove,
    moveHistory,
    LETTER_SCORES,
    wordMeanings,
    resetGame,
    tileBagSnapshot, // TEK ORTAK TILE BAG — UI snapshot
    opponentLetters,
    calculateScore,
    findAllWords,
    updateUserStats,
    currentUser
  } = useGame();

  const [toastMessage, setToastMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggingLetter, setDraggingLetter] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rackPosition, setRackPosition] = useState({ bottom: 20, left: '50%' });
  const [isDraggingRack, setIsDraggingRack] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [blankSelection, setBlankSelection] = useState(null); // { row, col, tileId } - Blank seçimi için
  const [currentScore, setCurrentScore] = useState(0); // Yerleştirilen harflerin puanı

  const { playSound } = useSound();
  const { FEATURES } = getConfig();

  // Multiplayer (otoriter sunucu) state'leri
  const [mpBoard, setMpBoard] = useState([]);
  const [mpRack, setMpRack] = useState([]);
  const [mpOppRackCount, setMpOppRackCount] = useState(0);
  const [mpScores, setMpScores] = useState({});
  const [mpCurrentTurn, setMpCurrentTurn] = useState(null);
  const [mpTileBagRemaining, setMpTileBagRemaining] = useState();
  const [mpTurnEndsAt, setMpTurnEndsAt] = useState(null); // epoch ms
  const [mpTurnRemaining, setMpTurnRemaining] = useState(0); // seconds
  const [mpLetterScores, setMpLetterScores] = useState(null); // server authoritative scores
  const [mpDistribution, setMpDistribution] = useState(null); // server authoritative distribution
  const prevScoresRef = useRef({});
  const [lastMovePoints, setLastMovePoints] = useState(0);
  const lastSubmitAtRef = useRef(null); // Telemetry: move submit ts
  // MP modda raftaki harfleri yerel olarak (optimiztik) güncellemek için bekleyen taşlar iade/gider hesapları
  // Not: Sunucu otoritesi korunur; state_patch/full_state geldiğinde senkron yapılır.

  // Component mount olduğunda odaya katıl (SADECE eğer oyun başlamamışsa)
  useEffect(() => {
    // Teşhis logları
    try {
      console.log('[diag] route params', { roomId, matchId, partnerId, mpMode });
    } catch {}
    // Eğer oyun zaten PLAYING durumundaysa, joinRoom çağırma (multiplayer'dan gelindi)
    if (mpMode) {
      return; // MP modda local joinRoom yapma
    }
    if (gameState === GAME_STATES.PLAYING) {
      console.log('Oyun zaten başlamış, joinRoom atlandı');
      return;
    }

    // URL'den gelen roomId'yi BOARD_TYPES key'i olarak kontrol et
    const boardKey = roomId?.toUpperCase();
    const boardExists = BOARD_TYPES[boardKey];
    
    if (!boardExists) {
      // Eğer key olarak bulunamadıysa, id olarak ara
      const boardById = Object.values(BOARD_TYPES).find(b => b.id === roomId);
      if (!boardById) {
        navigate('/rooms');
        return;
      }
    }

    // Eğer henüz bu odaya katılmadıysak, katıl
    if (currentRoom?.id !== roomId) {
      console.log(`GameRoom mount: ${roomId} odasına katılıyor...`);
      joinRoom(roomId);
    }
  }, [roomId, matchId, partnerId, navigate, joinRoom, currentRoom, BOARD_TYPES, gameState, GAME_STATES.PLAYING, mpMode]);

  // MP: Socket event abonelikleri
  useEffect(() => {
    if (!mpMode) return;
    const unsubs = [];
    const c1 = onGameReady((payload) => {
      setMpScores(payload.state?.scores || {});
      prevScoresRef.current = payload.state?.scores || {};
      setMpCurrentTurn(payload.state?.currentTurn || null);
      if (payload.turn_expires_at) {
        setMpTurnEndsAt(payload.turn_expires_at);
        const drift = (payload.turn_expires_at - Date.now()) - 30000;
        logEvent('timer_drift_ms', { matchId, roomId, drift });
        logEvent('turn_timer_drift_ms', { matchId, roomId, drift });
      }
      if (payload.tilebag_info?.letterScores) {
        setMpLetterScores(payload.tilebag_info.letterScores);
      }
      if (payload.tilebag_info?.distribution) {
        // Normalize distribution array/object to a map { [letter]: count }
        const dist = Array.isArray(payload.tilebag_info.distribution)
          ? payload.tilebag_info.distribution.reduce((acc, d) => {
              if (d && d.letter) acc[d.letter] = (typeof d.count === 'number' ? d.count : 0);
              return acc;
            }, {})
          : (payload.tilebag_info.distribution || null);
        if (dist) setMpDistribution(dist);
      }
      // After game is ready, request full state (board/racks)
      try { requestFullState({ matchId, roomId }); } catch {}
    });
    unsubs.push(c1);
    const c2 = onStatePatch(({ move, boardDiff, scores, tileBagRemaining, currentTurn, turn_expires_at, turnExpiresAt, tilebag_info, rackCounts }) => {
      if (scores) {
        // Son hamle puanı: skor farkından hesapla
        try {
          const by = move?.by;
          if (by && typeof prevScoresRef.current?.[by] === 'number' && typeof scores[by] === 'number') {
            const delta = scores[by] - prevScoresRef.current[by];
            if (by === currentUser?.id && delta > 0) {
              setLastMovePoints(delta);
              setTimeout(() => setLastMovePoints(0), 2000);
            }
          }
        } catch {}
        prevScoresRef.current = scores;
        setMpScores(scores);
      }
      if (typeof tileBagRemaining === 'number') setMpTileBagRemaining(tileBagRemaining);
      if (currentTurn) setMpCurrentTurn(currentTurn);
  if (turn_expires_at || turnExpiresAt) setMpTurnEndsAt(turn_expires_at || turnExpiresAt);
      // Update opponent rack count if provided (lightweight sync)
      if (rackCounts && partnerId) {
        try {
          const opp = rackCounts[partnerId];
          if (typeof opp === 'number') setMpOppRackCount(opp);
        } catch (e) {}
      }
      if (tilebag_info?.letterScores) setMpLetterScores(tilebag_info.letterScores);
      if (tilebag_info?.distribution) {
        const dist = Array.isArray(tilebag_info.distribution)
          ? tilebag_info.distribution.reduce((acc, d) => {
              if (d && d.letter) acc[d.letter] = (typeof d.count === 'number' ? d.count : 0);
              return acc;
            }, {})
          : (tilebag_info.distribution || null);
        if (dist) setMpDistribution(dist);
      }
      // Telemetry: ack latency
      if (move?.by && currentUser?.id && move.by === currentUser.id && lastSubmitAtRef.current) {
        const ms = Date.now() - lastSubmitAtRef.current;
        logEvent('move_ack_ms', { matchId, roomId, ms });
        lastSubmitAtRef.current = null;
      }
      if (Array.isArray(boardDiff) && boardDiff.length) {
        setMpBoard(prev => applyBoardDiffImmutable(prev, boardDiff, move?.by));
        // Başarılı ack UX: kendi hamlemizse bilgi ver
        if (move?.by && currentUser?.id && move.by === currentUser.id) {
          logEvent('move_ack', { matchId, roomId, by: move.by });
          setToastMessage({ text: t('toast.ackOk'), type: 'success', duration: 1200 });
        }
      }
    });
    unsubs.push(c2);
    const c3 = onTurnChanged(({ currentTurn, reason, turn_expires_at, turnExpiresAt }) => {
      setMpCurrentTurn(currentTurn);
      if (turn_expires_at || turnExpiresAt) {
        const exp = turn_expires_at || turnExpiresAt;
        setMpTurnEndsAt(exp);
        const drift = (exp - Date.now()) - 30000;
        logEvent('timer_drift_ms', { matchId, roomId, drift });
        logEvent('turn_timer_drift_ms', { matchId, roomId, drift });
      }
      setToastMessage({ text: toastForTurnReason(reason), type: 'info', duration: 1500 });
    });
    unsubs.push(c3);
    const c4 = onOpponentLeft(() => {
      setToastMessage({ text: t('toast.opponentLeft'), type: 'yellow', duration: 2000 });
    });
    unsubs.push(c4);
    const c5 = onGameOver(({ winner }) => {
      setToastMessage({ text: `${t('toast.gameOver')} Kazanan: ${winner ?? 'Yok'}`, type: 'blue', duration: 2500 });
    });
    unsubs.push(c5);
    const c6 = onMatchError((e) => {
      const key = mapMatchErrorCode(e?.code);
      const msg = key ? t(key) : (e?.message || 'Bilinmeyen hata');
  logEvent('move_error', { code: e?.code, message: e?.message });
      if (['ROOM_NOT_FOUND','MATCH_NOT_FOUND','UNAUTHORIZED','JOIN_FAILED','INVALID_STATE'].includes(e?.code)) {
        logEvent('room_bootstrap_fail', { matchId, roomId, code: e?.code });
      }
      if (e?.code) incrementCounter('move_err_code_count', e.code);
      setToastMessage({ text: `❌ ${msg}`, type: 'error', duration: 2500 });
      if (['ROOM_NOT_FOUND','MATCH_NOT_FOUND','UNAUTHORIZED','INVALID_STATE'].includes(e?.code)) {
        // Graceful fallback to rooms list
        navigate('/rooms');
      }
      // Optimistik yerleştirmeyi geri al
      if (placedTiles.length) {
        // MP raftan düşülen harfleri geri ekle
        setMpRack(prev => prev.concat(placedTiles.map(t => t.letter)));
        clearPlacedTiles();
        setCurrentScore(0);
      }
    });
    unsubs.push(c6);
    const c7 = onWaitingOpponent(() => setToastMessage({ text: t('toast.waitingOpponent'), type: 'info', duration: 1500 }));
    unsubs.push(c7);
    const c8 = onFullState((full) => {
      setMpScores(full.scores || {});
      prevScoresRef.current = full.scores || {};
      setMpCurrentTurn(full.currentTurn || null);
      if (Array.isArray(full.board)) setMpBoard(full.board);
      if (full.rack) {
        setMpRack(full.rack.me || []);
        setMpOppRackCount(full.rack.opponentCount || 0);
      }
      if (typeof full.tileBagRemaining === 'number') setMpTileBagRemaining(full.tileBagRemaining);
      if (full.tilebag_info?.letterScores) setMpLetterScores(full.tilebag_info.letterScores);
      if (full.tilebag_info?.distribution) {
        const dist = Array.isArray(full.tilebag_info.distribution)
          ? full.tilebag_info.distribution.reduce((acc, d) => {
              if (d && d.letter) acc[d.letter] = (typeof d.count === 'number' ? d.count : 0);
              return acc;
            }, {})
          : (full.tilebag_info.distribution || null);
        if (dist) setMpDistribution(dist);
      }
      // Optimistik pending temizliği: tam state geldiğinde yerel geçici yerleştirmeleri sıfırla
      if (placedTiles.length) {
        clearPlacedTiles();
        setCurrentScore(0);
      }
      logEvent('full_state_sync', { matchId, roomId });
    });
    unsubs.push(c8);
    return () => {
      for (const fn of unsubs) {
        try { typeof fn === 'function' && fn(); } catch {}
      }
    };
  }, [mpMode, onGameReady, onStatePatch, onTurnChanged, onOpponentLeft, onGameOver, onMatchError, onWaitingOpponent, onFullState, placedTiles, clearPlacedTiles, currentUser?.id, matchId, roomId, navigate, requestFullState, partnerId]);

  // MP: Maça katıl ve tam state iste
  useEffect(() => {
    if (!mpMode) return;
    // roomId/matchId yoksa geri dön (geçersiz rota)
    if (!roomId || !matchId) {
      navigate('/rooms');
      return;
    }
    // currentUser henüz hydrate edilmemiş olabilir; yönlendirme yapmadan bekle
    if (!currentUser) {
      return;
    }
    const doJoin = () => {
      mpJoinMatch({ matchId, roomId });
      // full_state will be requested after game_ready to avoid race; still add a small fallback delay
      setTimeout(() => { try { requestFullState({ matchId, roomId }); } catch {} }, 200);
      logEvent('reconnect_join', { matchId, roomId });
      logEvent('room_bootstrap_ok', { matchId, roomId });
    };
    const c9 = onYourRack(({ rack }) => {
      if (Array.isArray(rack)) setMpRack(rack || []);
    });
    // Join now and also on reconnect
    doJoin();
    on('connect', doJoin);
    return () => {
      try { off('connect', doJoin); } catch {}
      try { c9(); } catch {}
    };
  }, [mpMode, matchId, roomId, mpJoinMatch, requestFullState, currentUser, navigate, on, off, onYourRack]);

  // Mouse move listener for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingLetter) {
        setCursorPosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (draggingLetter) {
  const glob = (typeof window !== 'undefined') ? window : undefined;
      glob?.addEventListener('mousemove', handleMouseMove);
      return () => glob?.removeEventListener('mousemove', handleMouseMove);
    }
  }, [draggingLetter]);

  // Matchmaking timer gösterimi - artık kullanılmıyor, eşleşme ekranında gösteriliyor
  useEffect(() => {
    // Boş - matchmaking mesajları eşleşme ekranında gösteriliyor
  }, [gameState, matchingTimer, GAME_STATES.MATCHING]);

  // Hamle süresini title'da göster
  useEffect(() => {
    if (gameState === GAME_STATES.PLAYING && turnTimer !== undefined) {
      const mins = Math.floor(turnTimer / 60);
      const secs = turnTimer % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  document.title = `⏱️ ${timeStr} - Kelimeo`;
    } else {
  document.title = 'Kelimeo - Türkçe Kelime Oyunu';
    }
    
    return () => {
      document.title = 'Kelimeo - Türkçe Kelime Oyunu';
    };
  }, [gameState, turnTimer, GAME_STATES.PLAYING]);

  // MP: Turn kalan süre hesabı (500ms tick)
  useEffect(() => {
    if (!mpMode) return; 
    let iv;
    const tick = () => {
      if (!mpTurnEndsAt) { setMpTurnRemaining(0); return; }
      const diff = Math.max(0, Math.floor((mpTurnEndsAt - Date.now()) / 1000));
      setMpTurnRemaining(diff);
    };
    tick();
    iv = setInterval(tick, 500);
    return () => iv && clearInterval(iv);
  }, [mpMode, mpTurnEndsAt]);

  // MP: Turn süresi 0'a düştüğünde ama event gelmediyse, hafif senkron (self-heal)
  useEffect(() => {
    if (!mpMode) return;
    if (mpTurnRemaining !== 0) return;
    if (!matchId) return;
    // 1 sn sonra halen 0 ise full state iste (ör. arka plan zamanlayıcı gecikmesi)
    const t = setTimeout(() => {
      if (mpTurnRemaining === 0) {
        try { requestFullState({ matchId, roomId }); } catch {}
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [mpMode, mpTurnRemaining, matchId, requestFullState, roomId]);

  // Teşhis: selector değerleri (bir kez)
  useEffect(() => {
    try {
      const myTurnTop = isMyTurn(mpMode, mpCurrentTurn, currentUser?.id, currentTurn);
      console.log('[diag] selectors', { mpMode, mpCurrentTurn, myId: currentUser?.id, currentTurn, myTurnTop });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Yerleştirilen harfler değiştiğinde puanı hesapla
  useEffect(() => {
    if (placedTiles.length === 0) {
      setCurrentScore(0);
      return;
    }

    // Geçici tahta oluştur
    const baseBoard = (mpMode ? mpBoard : gameBoard) || [];
    if (!baseBoard.length) return;
    const tempBoard = baseBoard.map(row => row.map(cell => ({ ...cell })));
    placedTiles.forEach(({ letter, row, col, isBlank, repr }) => {
      tempBoard[row][col] = {
        ...tempBoard[row][col],
        letter: isBlank ? repr : letter,
        owner: 'player',
        isBlank: isBlank || false,
        value: isBlank ? 0 : (LETTER_SCORES[letter] || 0)
      };
    });


    // TÜM oluşan kelimeleri bul ve toplam puanı hesapla
    try {
  const positions = placedTiles.map(({ row, col }) => ({ row, col }));
      
      // findAllWords kullanarak tüm kelimeleri bul (context'ten gelen fonksiyon)
  const formedWords = findAllWords ? findAllWords(tempBoard, positions) : [];
      
      if (formedWords.length === 0) {
        setCurrentScore(0);
        return;
      }
      
      // Her kelime için puan hesapla ve topla
      let totalScore = 0;
      for (const { word, positions: wordPositions } of formedWords) {
        if (word.length < 2) continue; // Tek harfler sayılmaz
        
    const scoreResult = calculateScore(word, wordPositions, baseBoard);
        totalScore += scoreResult.score;
      }
      
      // BINGO bonusu (7 harf kullanıldıysa)
      if (placedTiles.length === 7) {
        totalScore += 50;
      }
      
      setCurrentScore(totalScore);
    } catch (error) {
      console.error('Puan hesaplama hatası:', error);
      setCurrentScore(0);
    }
  }, [placedTiles, gameBoard, mpBoard, mpMode, LETTER_SCORES, calculateScore, findAllWords]);

  // Bot pas geçme bildirimi
  useEffect(() => {
    if (moveHistory && moveHistory.length > 0) {
      const lastMoveEntry = moveHistory[moveHistory.length - 1];
      
      // Bot pas geçmişse bildir (toast ile)
      if (lastMoveEntry.player === 'opponent' && lastMoveEntry.type === 'pass') {
        setToastMessage({ 
          text: '🤖 Bot geçerli hamle bulamadı ve pas geçti!', 
          type: 'info',
          duration: 2000
        });
        playSound('rakipOynadi', 0.4);
      } else if (lastMoveEntry.player === 'opponent' && lastMoveEntry.type === 'word') {
        // Bot kelime oynadı
        playSound('rakipOynadi', 0.4);
      }
    }
  }, [moveHistory, playSound]);

  const handleLetterSelect = (letter) => {
  const myTurn = mpMode ? (mpCurrentTurn === toServerPlayerId(currentUser?.id)) : (currentTurn === 'player');
    const isPlaying = mpMode ? true : (gameState === GAME_STATES.PLAYING);
    if (!myTurn || !isPlaying) return;
    
    // Harfi sürükleme moduna al
    setDraggingLetter(letter);
    try { logEvent('dnd_start', { letter }); } catch {}
    
    // Sarı toast mesajı göster (1 saniye) + ses efekti
  setToastMessage({ text: `${letter} seçildi`, type: 'yellow', duration: 1000 });
    playSound('kelimeEklendi', 0.3);
  };

  const handleBoardClick = (row, col) => {
  const board = mpMode ? mpBoard : gameBoard;
    if (!board?.[row]?.[col]) return;
    const cell = board[row][col];
    const placedTile = placedTiles.find(t => t.row === row && t.col === col);
    
    // Eğer hücrede onaylanmış bir harf varsa ve oyun devam ediyorsa, kelime anlamını göster
    if (cell.letter && cell.owner && (mpMode ? true : (gameState === GAME_STATES.PLAYING))) {
      const word = findWordAtCell(row, col);
      if (word && word.length >= 2) {
        // Eğer kelime anlamı cache'de varsa göster, yoksa TDK'dan getir
  const cached = wordMeanings?.[word];
        if (cached) {
          setToastMessage({ text: `📖 ${word}: ${cached}`, type: 'blue', duration: 5000 });
          playSound('toastKelimeAnlami', 0.4);
        } else {
          fetchWordMeaning(word);
        }
      }
      return; // Kelime gösterimi yapıldı, yerleştirme yapma
    }
    
    // Oyuncu sırası değilse çık
  const myTurn = mpMode ? (mpCurrentTurn === toServerPlayerId(currentUser?.id)) : (currentTurn === 'player');
  const isPlaying = mpMode ? true : (gameState === GAME_STATES.PLAYING);
  if (!myTurn || !isPlaying) {
    logEvent('dnd_drop_rejected_not_turn', { matchId, row, col });
    return;
  }
    
    // Eğer sürüklenen harf varsa, yerleştir
    if (draggingLetter) {
      // Sadece boş hücrelere yerleştir (onaylanmış harflerin üzerine yazma)
      if (!cell.letter && !placedTile) {
        // Blank (*) joker ise modal aç
        if (draggingLetter === '*') {
          setBlankSelection({ row, col, tileId: uuidv4() });
          setDraggingLetter(null);
        } else {
          // MP modda context.placeTile turn guard'ını force=true ile geçiyoruz (sadece önizleme için)
          placeTile(draggingLetter, row, col, null, undefined, mpMode ? { force: true } : undefined);
          try { logEvent('dnd_drop', { letter: draggingLetter, row, col }); } catch {}
          if (mpMode) {
            // MP raftan optimistik çıkar
            setMpRack(prev => {
              const next = [...prev];
              const idx = next.indexOf(draggingLetter);
              if (idx > -1) next.splice(idx, 1);
              return next;
            });
          }
          setToastMessage({ text: `${draggingLetter}${t('toast.placed')}`, type: 'yellow', duration: 1000 });
          setDraggingLetter(null);
        }
      } else if (cell.letter) {
  setToastMessage({ text: t('toast.cannotOverwrite'), type: 'error', duration: 2000 });
        playSound('toastUyari', 0.5);
        setDraggingLetter(null);
      }
      return;
    }
    
    // Sadece geçici yerleştirilen harfleri kaldırabilir
    // Onaylanmış harfler (cell.letter && cell.owner) kaldırılamaz
    if (placedTile) {
      removeTile(row, col);
      if (mpMode) {
        // MP rafta harfi geri göster
        setMpRack(prev => [...prev, placedTile.letter]);
      }
      // Geri alma toast'ı kaldırıldı - sessiz işlem
    } else if (cell.letter && cell.owner) {
      // Onaylanmış harfler uyarısı kaldırıldı
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
  setToastMessage({ text: t('toast.fullscreenFail'), type: 'error', duration: 2000 });
        playSound('toastUyari', 0.5);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleBlankSelect = (letter) => {
    if (blankSelection) {
      const { row, col, tileId } = blankSelection;
  // MP modda force=true ile önizleme için yerleştir
  placeTile('*', row, col, letter, tileId, mpMode ? { force: true } : undefined); // Blank joker + repr + id
      if (mpMode) {
        // MP raftan '*' düşür
        setMpRack(prev => {
          const next = [...prev];
          const idx = next.indexOf('*');
          if (idx > -1) next.splice(idx, 1);
          return next;
        });
      }
      setToastMessage({ text: `🃏 Joker "${letter}" harfini temsil ediyor`, type: 'success', duration: 2000 });
      playSound('toastBasarili', 0.6);
      setBlankSelection(null);
    }
  };

  const handleBlankCancel = () => {
    // Joker seçimi iptal edildi - sadece modal'ı kapat, harf zaten rafta
    setBlankSelection(null);
  };

  const handleRackMouseDown = (e) => {
    if (e.target.closest('.letter-tile')) return; // Harf tıklanıyorsa drag yapma
    
    setIsDraggingRack(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleRackMouseMove = useCallback((e) => {
    if (!isDraggingRack) return;
    
    const newLeft = e.clientX - dragOffset.x;
    const newTop = e.clientY - dragOffset.y;
    
    setRackPosition({
      left: newLeft,
      top: newTop,
      bottom: 'auto'
    });
  }, [isDraggingRack, dragOffset]);

  const handleRackMouseUp = useCallback(() => {
    setIsDraggingRack(false);
  }, []);

  // Rack drag için global event listener
  useEffect(() => {
    if (isDraggingRack) {
  const glob = (typeof window !== 'undefined') ? window : undefined;
      glob?.addEventListener('mousemove', handleRackMouseMove);
      glob?.addEventListener('mouseup', handleRackMouseUp);
      return () => {
        glob?.removeEventListener('mousemove', handleRackMouseMove);
        glob?.removeEventListener('mouseup', handleRackMouseUp);
      };
    }
  }, [isDraggingRack, handleRackMouseMove, handleRackMouseUp]);

  const handleSubmitWord = async () => {
    if (placedTiles.length === 0 || isSubmitting) return;
    if (mpMode) {
      // Turn guard in MP
      if (mpCurrentTurn !== toServerPlayerId(currentUser?.id)) {
        setToastMessage({ text: t('toast.notYourTurn'), type: 'error', duration: 1200 });
        return;
      }
      // Otoriter sunucu: hamleyi göndermeden önce temel doğrulamalar ve payload normalizasyonu
      const baseBoard = (mpBoard?.length ? mpBoard : gameBoard) || [];
      if (!baseBoard?.length) return;
      // İstemci: yön ve bitişiklik doğrulaması
      const validation = validateOC(placedTiles, baseBoard);
      if (!validation.ok) {
        const msg = validation.msg && validation.msg.startsWith('toast.') ? t(validation.msg) : validation.msg;
        setToastMessage({ text: `❌ ${msg}`, type: 'error', duration: 1800 });
        // MP: İstemci doğrulaması başarısızsa pending taşları rafta geri göster ve temizle
        if (placedTiles.length) {
          setMpRack(prev => prev.concat(placedTiles.map(t => t.letter)));
          clearPlacedTiles();
          setCurrentScore(0);
        }
        return;
      }
      const temp = baseBoard.map(r => r.map(c => ({ ...c })));
      const positions = placedTiles.map(({ row, col }) => ({ row, col }));
      // Geçici yerleştir
      for (const { letter, row, col, isBlank, repr } of placedTiles) {
        temp[row][col] = {
          ...temp[row][col],
          letter: isBlank ? repr : letter,
          owner: 'player',
          isBlank: !!isBlank,
        };
      }
      // Oluşan kelimeleri bul
      const formed = findAllWords ? findAllWords(temp, positions) : [];
      if (!formed.length) {
        setToastMessage({ text: t('toast.needWord'), type: 'error', duration: 2000 });
        if (placedTiles.length) {
          setMpRack(prev => prev.concat(placedTiles.map(t => t.letter)));
          clearPlacedTiles();
          setCurrentScore(0);
        }
        return;
      }
      // Tek harf/blank temsilcisi kontrolü
      for (const p of placedTiles) {
        if (p.isBlank && !p.repr) {
          setToastMessage({ text: t('toast.selectBlank'), type: 'error', duration: 2000 });
          setMpRack(prev => prev.concat(placedTiles.map(t => t.letter)));
          clearPlacedTiles();
          setCurrentScore(0);
          return;
        }
      }
      const words = formed
        .filter(w => w.word && w.word.length >= 2)
        .map(w => w.word);
      if (!words.length) {
        setToastMessage({ text: t('toast.needTwoLetters'), type: 'error', duration: 2000 });
        setMpRack(prev => prev.concat(placedTiles.map(t => t.letter)));
        clearPlacedTiles();
        setCurrentScore(0);
        return;
      }
      // Payload
      const tiles = tilesToPayload(placedTiles);
      const moveId = uuidv4();
      lastSubmitAtRef.current = Date.now();
      mpPlaceTiles({
        matchId,
        roomId,
        move: {
          type: 'place_tiles',
          tiles,
          meta: {
            moveId,
            words,
            // İsteğe bağlı: formed words pozisyonları
            validatedWords: formed.map(({ word, positions }) => ({ word, positions })),
          }
        }
      });
      // Optimistik: rafı server ack gelene kadar dokunma; sadece pending temizle
      clearPlacedTiles();
      setCurrentScore(0);
      // Kısa süre sonra tam state iste (raf senkronu için)
      setTimeout(() => requestFullState({ matchId, roomId }), 250);
      return;
    }

    setIsSubmitting(true);
    setToastMessage({ text: 'Kelime kontrol ediliyor...', type: 'info', duration: 2000 });
    const positions = placedTiles.map(({ row, col }) => ({ row, col }));
    try {
      const result = await makeMove('', positions);
      if (result.success) {
        const wordsText = result.words.map(w => w.word).join(', ');
        let successMessage = `✅ Harika! "${wordsText}" - ${result.score} puan!`;
        if (placedTiles.length === 7) {
          successMessage += ' 🎉 BINGO! +50 bonus puan!';
        }
        setToastMessage({ text: successMessage, type: 'success', duration: 3000 });
        playSound('kelimeKabulEdildi', 0.6);
        setCurrentScore(0);
      } else {
        setToastMessage({ text: `❌ ${result.error}`, type: 'error', duration: 3000 });
        playSound('toastUyari', 0.5);
        clearPlacedTiles();
        setCurrentScore(0);
      }
    } catch (error) {
      console.error('makeMove error:', error);
      setToastMessage({ text: '❌ Bir hata oluştu!', type: 'error', duration: 2000 });
      playSound('toastUyari', 0.5);
      clearPlacedTiles();
      setCurrentScore(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShuffle = () => {
    if (mpMode) {
      if (mpCurrentTurn !== toServerPlayerId(currentUser?.id)) {
        setToastMessage({ text: t('toast.notYourTurn'), type: 'error', duration: 1200 });
        return;
      }
      mpShuffleRack({ matchId, roomId });
      setToastMessage({ text: '🔀 Raf karıştırma istendi', type: 'info', duration: 1000 });
      return;
    }
    shuffleLetters();
    setToastMessage({ text: '🔀 Harfler karıştırıldı!', type: 'info', duration: 1000 });
  };

  const handlePass = () => {
    if (mpMode) {
      if (mpCurrentTurn !== toServerPlayerId(currentUser?.id)) {
        setToastMessage({ text: t('toast.notYourTurn'), type: 'error', duration: 1200 });
        return;
      }
      mpPassTurn({ matchId, roomId });
      return;
    }
    const result = passMove();
    if (result.success) {
      setToastMessage({ text: '⏭️ Sıra geçildi!', type: 'info', duration: 2000 });
    } else {
      setToastMessage({ text: `❌ ${result.error}`, type: 'error', duration: 2000 });
      playSound('toastUyari', 0.5);
    }
  };

  const handleClear = () => {
    if (mpMode && placedTiles.length) {
      // MP: pending taşları rafta geri göster
      setMpRack(prev => prev.concat(placedTiles.map(t => t.letter)));
    }
    clearPlacedTiles();
    setToastMessage({ text: '🗑️ Yerleştirilen harfler temizlendi!', type: 'info', duration: 1000 });
  };

  // TDK'dan kelime anlamını çek
  const fetchWordMeaning = async (word) => {
    try {
      setToastMessage({ text: '📖 Kelime anlamı getiriliyor...', type: 'info', duration: 1000 });
      
      const response = await fetch(
        `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(toLowerCaseTurkish(word))}`
      );
      
      if (!response.ok) {
        setToastMessage({ text: '❌ Kelime anlamı alınamadı!', type: 'error', duration: 2000 });
        playSound('toastUyari', 0.5);
        return;
      }

      const data = await response.json();
      
      if (!data || data.error || !Array.isArray(data) || data.length === 0) {
        setToastMessage({ text: `❌ "${word}" kelimesinin anlamı bulunamadı!`, type: 'error', duration: 2000 });
        playSound('toastUyari', 0.5);
        return;
      }

      const meaning = data[0]?.anlamlarListe?.[0]?.anlam || 'Anlam bulunamadı';
      
      // Mavi toast mesajı olarak göster (5 saniye)
      setToastMessage({ 
        text: `📖 ${word}: ${meaning}`, 
        type: 'blue',
        duration: 5000
      });
      playSound('toastKelimeAnlami', 0.4);
      
    } catch (error) {
      console.error('TDK API error:', error);
      setToastMessage({ text: '❌ Bağlantı hatası!', type: 'error', duration: 2000 });
      playSound('toastUyari', 0.5);
    }
  };

  // Hücredeki kelimeyi bul (yatay veya dikey)
  const findWordAtCell = (row, col) => {
    const board = mpMode ? mpBoard : gameBoard;
    if (!board[row] || !board[row][col] || !board[row][col].letter) {
      return null;
    }

    // Yatay kelime bul
    let startCol = col;
    let endCol = col;
    
    // Başlangıcı bul
    while (startCol > 0 && board[row][startCol - 1]?.letter) {
      startCol--;
    }
    
    // Bitişi bul
    while (endCol < board[row].length - 1 && board[row][endCol + 1]?.letter) {
      endCol++;
    }
    
    // Yatay kelime oluştur
    let horizontalWord = '';
    for (let c = startCol; c <= endCol; c++) {
      horizontalWord += board[row][c].letter;
    }
    
    // Dikey kelime bul
    let startRow = row;
    let endRow = row;
    
    // Başlangıcı bul
    while (startRow > 0 && board[startRow - 1]?.[col]?.letter) {
      startRow--;
    }
    
    // Bitişi bul
    while (endRow < board.length - 1 && board[endRow + 1]?.[col]?.letter) {
      endRow++;
    }
    
    // Dikey kelime oluştur
    let verticalWord = '';
    for (let r = startRow; r <= endRow; r++) {
      verticalWord += board[r][col].letter;
    }
    
    // En az 2 harfli kelimeyi döndür
    if (horizontalWord.length >= 2) {
      return horizontalWord;
    } else if (verticalWord.length >= 2) {
      return verticalWord;
    }
    
    return null;
  };

  // Hücreye hover olduğunda - kelime anlamı varsa göster
  const handleCellHover = (row, col) => {
    const board = mpMode ? mpBoard : gameBoard;
    const cell = board[row]?.[col];
    if (!cell || !cell.letter || !cell.owner) return; // Sadece onaylanmış harfler için
    
    // Hover efekti için kullanılabilir (şimdilik boş)
  };

  const handleLeaveGame = () => {
    if (gameState === GAME_STATES.PLAYING) {
  const g = (typeof window !== 'undefined') ? window : undefined;
      if (g?.confirm && g.confirm('Oyundan çıkmak istediğinize emin misiniz? Bu durum yenilgi sayılacaktır!')) {
        // Yarıda bırakma = mağlubiyet
        if (!mpMode && currentUser && opponent) {
          updateUserStats(currentUser.id, {
            gamesPlayed: 1,
            losses: 1
          });
          console.log('❌ Oyun yarıda bırakıldı - mağlubiyet kaydedildi');
        }
        
        if (mpMode) mpLeaveMatch({ matchId, roomId }); else leaveGame();
        try { sessionStorage.removeItem('kelimeo:lastMatch'); } catch {}
        navigate('/rooms');
      }
    } else {
      try { sessionStorage.removeItem('kelimeo:lastMatch'); } catch {}
      navigate('/rooms');
    }
  };

  const getBoardCellClass = (row, col, cell) => {
    let classes = ['board-cell'];
    
    // Premium kare tipleri
    if (cell.multiplier) {
      classes.push(cell.multiplier);
    }
    
    if (cell.isCenter && !cell.letter) {
      classes.push('center-cell');
    }
    
    // Harf durumu
    if (cell.letter) {
      classes.push('filled');
      if (cell.owner === 'player') classes.push('player-tile');
      else if (cell.owner === 'opponent') classes.push('opponent-tile');
      
      // Blank joker kontrolü
      if (cell.isBlank) {
        classes.push('blank-tile');
      }
    }
    
    // Geçici yerleştirilmiş harf (blank kontrolü)
    const placedTile = placedTiles.find(t => t.row === row && t.col === col);
    if (placedTile) {
      classes.push('placed');
      if (placedTile.isBlank) {
        classes.push('blank-tile');
      }
    }
    
    // Son hamle vurgusu
    if (lastMove && lastMove.positions.some(p => p.row === row && p.col === col)) {
      classes.push('last-move-highlight');
    }
    
    return classes.join(' ');
  };

  const renderBoard = () => {
  const board = mpMode ? mpBoard : gameBoard;
    if ((mpMode && (!board || !board.length)) || (!mpMode && (!currentRoom || !board.length))) return null;

    const size = mpMode ? (board?.length || 15) : currentRoom.boardSize;
    const myTurnTop = isMyTurn(mpMode, mpCurrentTurn, currentUser?.id, currentTurn);
    
    return (
      <div className="game-board-container">
        {/* Fullscreen Toggle Button */}
        <button 
          className="fullscreen-toggle"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
        >
          {isFullscreen ? '🗙' : '⛶'}
        </button>

        {/* Dragging Letter Following Cursor */}
        {draggingLetter && (
          <div 
            className="letter-tile dragging"
            style={{
              left: `${cursorPosition.x - 25}px`,
              top: `${cursorPosition.y - 25}px`
            }}
          >
            {draggingLetter}
            <span className="letter-tile-score">{mpLetterScores?.[draggingLetter] || LETTER_SCORES[draggingLetter] || 0}</span>
          </div>
        )}

        <div className="game-board" style={{ 
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`
        }}>
          {(() => {
            const start = performance.now?.() || Date.now();
            const preview = FEATURES.PREVIEW_OVERLAY ? computePreviewBoard(board, placedTiles) : board;
            const rows = preview.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const displayLetter = cell.letter; // preview hesaplandıysa doğrudan cell.letter
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={getBoardCellClass(rowIndex, colIndex, cell)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBoardClick(rowIndex, colIndex); }}
                  onClick={() => handleBoardClick(rowIndex, colIndex)}
                  onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                  onMouseLeave={() => {}}
                  title={cell.multiplier || ''}
                  style={{ 
                    cursor: draggingLetter ? 'crosshair' : 'pointer',
                    position: 'relative'
                  }}
                >
                  {displayLetter ? (
                    <>
                      <span className="cell-letter">{displayLetter}</span>
                      <span className="cell-score">{mpLetterScores?.[displayLetter] || LETTER_SCORES[displayLetter] || 0}</span>
                    </>
                  ) : cell.isCenter ? (
                    <span className="center-star">⭐</span>
                  ) : cell.multiplier ? (
                    <span className="cell-multiplier">{multiplierLabel(cell.multiplier)}</span>
                  ) : null}
                </div>
              );
            }));
            const end = performance.now?.() || Date.now();
            if (FEATURES.PREVIEW_OVERLAY) {
              logEvent('preview_render_ms', { matchId, roomId, ms: end - start });
            }
            return rows;
          })()}
        </div>
        {/* Not your turn overlay (görsel) */}
        {mpMode && (!myTurnTop) && (
          <div className="board-overlay not-your-turn" aria-disabled="true" title={t('ui.notYourTurnOverlay')}>{t('ui.notYourTurnOverlay')}</div>
        )}
        
        {/* Letter Rack - Floating & Draggable */}
        <div 
          className={`letter-rack ${isDraggingRack ? 'dragging' : ''}`}
          style={{
            position: 'fixed',
            left: rackPosition.left,
            top: rackPosition.top,
            bottom: rackPosition.bottom,
            transform: rackPosition.bottom !== 'auto' ? 'translateX(-50%)' : 'none',
            cursor: isDraggingRack ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleRackMouseDown}
        >
          <div className="letter-rack-title">
            ✋ Harfleriniz ({(mpMode ? mpRack.length : playerLetters.length)}/7) {draggingLetter ? '- Sürükleniyor...' : isDraggingRack ? '- Taşınıyor...' : ''}
          </div>
          <div className="letter-tiles">
            {(mpMode ? mpRack : playerLetters).map((letter, index) => (
              <div
                key={`${letter}-${index}`}
                className={`letter-tile ${draggingLetter === letter ? 'selected' : ''} ${(mpMode ? (mpCurrentTurn !== toServerPlayerId(currentUser?.id)) : (currentTurn !== 'player')) ? 'disabled' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLetterSelect(letter); }}
                onClick={() => handleLetterSelect(letter)}
                style={{ cursor: (mpMode ? (mpCurrentTurn === toServerPlayerId(currentUser?.id)) : (currentTurn === 'player')) ? 'grab' : 'not-allowed' }}
              >
                {letter}
                <span className="letter-tile-score">{mpLetterScores?.[letter] || LETTER_SCORES[letter] || 0}</span>
              </div>
            ))}
          </div>
          
          {/* Kontrol Butonları */}
          <div className="rack-controls">
            <button
              className="control-button primary"
              onClick={handleSubmitWord}
              disabled={placedTiles.length === 0 || (mpMode ? (mpCurrentTurn !== toServerPlayerId(currentUser?.id)) : (currentTurn !== 'player')) || isSubmitting}
            >
              ✅ Gönder
            </button>
            
            <button
              className="control-button secondary"
              onClick={handleClear}
              disabled={placedTiles.length === 0}
            >
              �️ Temizle
            </button>
            
            <button
              className="control-button secondary"
              onClick={handleShuffle}
              disabled={(mpMode ? (mpCurrentTurn !== toServerPlayerId(currentUser?.id)) : (currentTurn !== 'player'))}
            >
              � Karıştır
            </button>
            
            <button
              className="control-button secondary"
              onClick={handlePass}
              disabled={(mpMode ? (mpCurrentTurn !== toServerPlayerId(currentUser?.id)) : (currentTurn !== 'player'))}
            >
              ⏭️ Pas
            </button>
          </div>
        </div>
      </div>
    );
  };

  // roomId'yi hem uppercase key hem de id olarak kontrol et
  const currentBoardType = mpMode
    ? (BOARD_TYPES[roomId?.toUpperCase()] || Object.values(BOARD_TYPES).find(b => b.id === roomId) || { name: 'Çok Oyunculu', icon: '🎮', description: 'Eşleşmeli oyun', id: roomId })
    : (BOARD_TYPES[roomId?.toUpperCase()] || Object.values(BOARD_TYPES).find(b => b.id === roomId));

  if (!currentBoardType) {
    return (
      <div className="game-room error">
        <h2>❌ Oda bulunamadı!</h2>
        <button onClick={() => navigate('/rooms')}>Odalara Dön</button>
      </div>
    );
  }

  // MP özellik bayrağı kapalıysa MP ekrana izin verme
  // Rollout/Canary kontrolü
  const mpEnabledByRollout = shouldEnableMultiplayer(currentUser);
  const effectiveMpMode = mpMode && FEATURES.MULTIPLAYER !== false && mpEnabledByRollout;
  const effectiveState = effectiveMpMode ? GAME_STATES.PLAYING : gameState;
  if (effectiveState === GAME_STATES.MATCHING) {
    return (
      <div className="game-room matching">
        <div className="matching-screen">
          <div className="room-info">
            <h2>🎯 {currentBoardType.name}</h2>
            <p>{currentBoardType.description}</p>
          </div>
          
          <div className="matching-animation">
            <div className="spinner"></div>
            <h3>🔍 Rakip Arıyor...</h3>
            <p className="timer-text">
              {matchingTimer <= 10 
                ? `${10 - matchingTimer}s kaldı` 
                : 'Bot ile eşleşiliyor...'}
            </p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(matchingTimer / 10) * 100}%` }}
              ></div>
            </div>
          </div>

          <button className="cancel-button" onClick={handleLeaveGame}>
            ❌ İptal Et
          </button>
        </div>
      </div>
    );
  }

  if (effectiveMpMode && !FEATURES.MULTIPLAYER) {
    // MP kapalıysa odalara dön
    navigate('/rooms');
    return null;
  }

  if (effectiveState === GAME_STATES.PLAYING) {
    return (
      <div className="game-room playing">
        {/* Game Header */}
        <div className="game-header">
          <div className="room-title">
            <h2>{currentBoardType.icon} {currentBoardType.name}</h2>
          </div>
          
          <div className="game-info">
            <div className="timer-section">
              <div className={`game-timer ${gameTimer <= 10 ? 'urgent' : gameTimer <= 30 ? 'warning' : ''}`}>
                ⏰ {Math.floor(gameTimer / 60)}:{(gameTimer % 60).toString().padStart(2, '0')}
              </div>
              {mpMode ? (
                <div className={`turn-timer ${mpTurnRemaining <= 10 ? 'urgent' : mpTurnRemaining <= 20 ? 'warning' : ''}`}>
                  ⏱️ Hamle: {mpTurnRemaining}s
                </div>
              ) : (
                <div className={`turn-timer ${turnTimer <= 10 ? 'urgent' : turnTimer <= 20 ? 'warning' : ''}`}>
                  ⏱️ Hamle: {turnTimer}s
                </div>
              )}
              <div className="turn-indicator">
                {(mpMode ? (mpCurrentTurn === toServerPlayerId(currentUser?.id)) : (currentTurn === 'player')) ? t('ui.yourTurn') : t('ui.oppTurn')}
              </div>
            </div>
            
            <div className="score-section">
              <div className="score-board">
                <div className="player-score">
                  <span className="score-label">👤 Sen</span>
                  <span className="score-value">{mpMode ? (mpScores?.[currentUser?.id] || 0) : score.player}</span>
                  <span className="letter-count">🎴 {mpMode ? mpRack.length : playerLetters.length} harf</span>
                </div>
                <div className="vs-separator">VS</div>
                <div className="opponent-score">
                  <span className="score-label">{mpMode ? '👤 Rakip' : (opponent?.isBot ? '🤖' : '👤')} {mpMode ? (partnerId || '') : (opponent?.username || '')}</span>
                  <span className="score-value">{mpMode ? (partnerId ? (mpScores?.[partnerId] || 0) : 0) : score.opponent}</span>
                  <span className="letter-count">🎴 {mpMode ? mpOppRackCount : opponentLetters.length} harf</span>
                </div>
              </div>
              <div className="bag-info">
                📦 Torbada: {mpMode ? (typeof mpTileBagRemaining === 'number' ? mpTileBagRemaining : '-') : (tileBagSnapshot ? Object.values(tileBagSnapshot).reduce((sum, tile) => sum + tile.remaining, 0) : 0)} harf
              </div>
            </div>
            
            <button className="leave-button" onClick={handleLeaveGame}>
              🚪 Çıkış
            </button>
          </div>
        </div>

        {/* Toast Messages */}
        {toastMessage && (
          <Toast 
            message={toastMessage.text}
            type={toastMessage.type}
            duration={toastMessage.duration || 3000}
            onClose={() => setToastMessage(null)}
          />
        )}

  {/* Bag Drawer - MP modda server dağılımı/harf puanları mevcutsa göster */}
  <BagDrawer 
    tileBagSnapshot={mpMode ? undefined : tileBagSnapshot}
    mpLetterScores={mpLetterScores}
  mpDistribution={mpDistribution}
  />

        {/* Blank Letter Selection Modal */}
        {blankSelection && (
          <BlankLetterModal
            onSelect={handleBlankSelect}
            onCancel={handleBlankCancel}
          />
        )}

        {/* Score Star - Sol Alt Köşe */}
        <ScoreStar lastMovePoints={lastMovePoints} currentScore={currentScore} />

        {/* Game Content */}
        <div className="game-content">
          {/* Game Board - Full Width */}
          <div className="board-section full-width">
            {renderBoard()}
          </div>
        </div>
      </div>
    );
  }

  if (effectiveState === GAME_STATES.FINISHED) {
    const isWin = score.player > score.opponent;
    
    return (
      <div className="game-room finished">
        <GameEndScreen
          isWin={isWin}
          playerScore={score.player}
          opponentScore={score.opponent}
          onClose={() => {
            resetGame();
            navigate('/rooms');
          }}
          onRematch={() => {
            resetGame();
            // Aynı odaya tekrar katıl
            if (currentRoom) {
              joinRoom(currentRoom.id);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="game-room waiting">
      <h2>⏳ Oyun hazırlanıyor...</h2>
      <button onClick={handleLeaveGame}>🔙 Geri Dön</button>
    </div>
  );
};

export default GameRoom;