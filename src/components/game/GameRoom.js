import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../hooks/useSound';
import { toLowerCaseTurkish } from '../../helpers/stringHelpers';
import { useMatchGame } from '../../services/matchGameService';
import Toast from '../gameRoom/ui/Toast';
import GameEndScreen from '../gameRoom/ui/GameEndScreen';
import BagDrawer from '../gameRoom/ui/BagDrawer';
import BlankLetterModal from '../gameRoom/ui/BlankLetterModal';
import './GameRoom.css';
import './GameBoard.css';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = useMemo(() => location.state || {}, [location.state]);
  const matchId = initialData?.matchId;
  const partnerId = initialData?.partnerId;
  const mpMode = !!matchId; // Eşleşmeden geldiysek çok oyunculu mod
  const {
    joinMatch: mpJoinMatch,
    placeTiles: mpPlaceTiles,
    passTurn: mpPassTurn,
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
  const [blankSelection, setBlankSelection] = useState(null); // { row, col } - Blank seçimi için
  const [currentScore, setCurrentScore] = useState(0); // Yerleştirilen harflerin puanı

  const { playSound } = useSound();

  // Multiplayer (otoriter sunucu) state'leri
  const [mpBoard, setMpBoard] = useState([]);
  const [mpRack, setMpRack] = useState([]);
  const [mpOppRackCount, setMpOppRackCount] = useState(0);
  const [mpScores, setMpScores] = useState({});
  const [mpCurrentTurn, setMpCurrentTurn] = useState(null);
  const [mpTileBagRemaining, setMpTileBagRemaining] = useState();

  // Component mount olduğunda odaya katıl (SADECE eğer oyun başlamamışsa)
  useEffect(() => {
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
    if (!currentRoom || currentRoom.id !== roomId) {
      console.log(`GameRoom mount: ${roomId} odasına katılıyor...`);
      joinRoom(roomId);
    }
  }, [roomId, navigate, joinRoom, currentRoom, BOARD_TYPES, gameState, GAME_STATES.PLAYING, mpMode]);

  // MP: Socket event abonelikleri
  useEffect(() => {
    if (!mpMode) return;
    const c1 = onGameReady((payload) => {
      setMpScores(payload.state?.scores || {});
      setMpCurrentTurn(payload.state?.currentTurn || null);
    });
    const c2 = onStatePatch(({ move, boardDiff, scores, tileBagRemaining, currentTurn }) => {
      if (scores) setMpScores(scores);
      if (typeof tileBagRemaining === 'number') setMpTileBagRemaining(tileBagRemaining);
      if (currentTurn) setMpCurrentTurn(currentTurn);
      if (Array.isArray(boardDiff) && boardDiff.length) {
        setMpBoard(prev => {
          if (!prev || prev.length === 0) return prev;
          const next = prev.map(r => r.map(c => ({ ...c })));
          boardDiff.forEach(({ row, col, letter, isBlank, blankAs }) => {
            const cell = next[row]?.[col];
            if (!cell) return;
            const hadMult = !!cell.multiplier;
            next[row][col] = {
              ...cell,
              letter,
              owner: move?.by,
              isBlank: !!isBlank,
              blankAs: blankAs || (isBlank ? letter : null),
              usedMultipliers: cell.usedMultipliers || hadMult ? true : false,
            };
          });
          return next;
        });
      }
    });
  const c3 = onTurnChanged(({ currentTurn }) => setMpCurrentTurn(currentTurn));
  const c4 = onOpponentLeft(() => {});
  const c5 = onGameOver(() => {});
  const c6 = onMatchError(() => {});
  const c7 = onWaitingOpponent(() => {});
    const c8 = onFullState((full) => {
      setMpScores(full.scores || {});
      setMpCurrentTurn(full.currentTurn || null);
      if (Array.isArray(full.board)) setMpBoard(full.board);
      if (full.rack) {
        setMpRack(full.rack.me || []);
        setMpOppRackCount(full.rack.opponentCount || 0);
      }
      if (typeof full.tileBagRemaining === 'number') setMpTileBagRemaining(full.tileBagRemaining);
    });
    return () => { c1(); c2(); c3(); c4(); c5(); c6(); c7(); c8(); };
  }, [mpMode, onGameReady, onStatePatch, onTurnChanged, onOpponentLeft, onGameOver, onMatchError, onWaitingOpponent, onFullState]);

  // MP: Maça katıl ve tam state iste
  useEffect(() => {
    if (!mpMode) return;
    if (matchId && roomId) {
      mpJoinMatch({ matchId, roomId });
      requestFullState({ matchId });
    }
  }, [mpMode, matchId, roomId, mpJoinMatch, requestFullState]);

  // Mouse move listener for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingLetter) {
        setCursorPosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (draggingLetter) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
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

  // Oyun timer uyarıları - artık kullanılmıyor
  useEffect(() => {
    // Boş - timer uyarıları ekranda görünüyor
  }, [gameState, currentTurn, gameTimer, GAME_STATES.PLAYING]);

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
    const myTurn = mpMode ? (mpCurrentTurn === currentUser?.id) : (currentTurn === 'player');
    const isPlaying = mpMode ? true : (gameState === GAME_STATES.PLAYING);
    if (!myTurn || !isPlaying) return;
    
    // Harfi sürükleme moduna al
    setDraggingLetter(letter);
    
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
        const cached = wordMeanings && wordMeanings[word];
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
  const myTurn = mpMode ? (mpCurrentTurn === currentUser?.id) : (currentTurn === 'player');
  const isPlaying = mpMode ? true : (gameState === GAME_STATES.PLAYING);
  if (!myTurn || !isPlaying) return;
    
    // Eğer sürüklenen harf varsa, yerleştir
    if (draggingLetter) {
      // Sadece boş hücrelere yerleştir (onaylanmış harflerin üzerine yazma)
      if (!cell.letter && !placedTile) {
        // Blank (*) joker ise modal aç
        if (draggingLetter === '*') {
          setBlankSelection({ row, col });
          setDraggingLetter(null);
        } else {
          placeTile(draggingLetter, row, col);
          setToastMessage({ text: `${draggingLetter} harfi yerleştirildi`, type: 'yellow', duration: 1000 });
          setDraggingLetter(null);
        }
      } else if (cell.letter) {
        setToastMessage({ text: '⚠️ Bu hücrede zaten onaylanmış bir harf var!', type: 'error', duration: 2000 });
        playSound('toastUyari', 0.5);
        setDraggingLetter(null);
      }
      return;
    }
    
    // Sadece geçici yerleştirilen harfleri kaldırabilir
    // Onaylanmış harfler (cell.letter && cell.owner) kaldırılamaz
    if (placedTile) {
      removeTile(row, col);
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
        setToastMessage({ text: '⚠️ Tam ekran açılamadı', type: 'error', duration: 2000 });
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
      const { row, col } = blankSelection;
      placeTile('*', row, col, letter); // Blank joker + repr
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
      window.addEventListener('mousemove', handleRackMouseMove);
      window.addEventListener('mouseup', handleRackMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleRackMouseMove);
        window.removeEventListener('mouseup', handleRackMouseUp);
      };
    }
  }, [isDraggingRack, handleRackMouseMove, handleRackMouseUp]);

  const handleSubmitWord = async () => {
    if (placedTiles.length === 0 || isSubmitting) return;
    if (mpMode) {
      // Otoriter sunucu: hamleyi gönder
      const tiles = placedTiles.map(({ letter, row, col, isBlank, repr }) => ({
        row,
        col,
        letter: isBlank ? (repr || '') : letter,
        isBlank: !!isBlank,
        repr: isBlank ? (repr || '') : undefined,
      }));
      mpPlaceTiles({ matchId, roomId, move: { type: 'place_tiles', tiles, meta: {} } });
      clearPlacedTiles();
      setCurrentScore(0);
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
      setToastMessage({ text: '❌ Bir hata oluştu!', type: 'error', duration: 2000 });
      playSound('toastUyari', 0.5);
      clearPlacedTiles();
      setCurrentScore(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShuffle = () => {
    shuffleLetters();
    setToastMessage({ text: '🔀 Harfler karıştırıldı!', type: 'info', duration: 1000 });
  };

  const handlePass = () => {
    if (mpMode) {
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
      if (window.confirm('Oyundan çıkmak istediğinize emin misiniz? Bu durum yenilgi sayılacaktır!')) {
        // Yarıda bırakma = mağlubiyet
        if (!mpMode && currentUser && opponent) {
          updateUserStats(currentUser.id, {
            gamesPlayed: 1,
            losses: 1
          });
          console.log('❌ Oyun yarıda bırakıldı - mağlubiyet kaydedildi');
        }
        
        if (mpMode) mpLeaveMatch({ matchId, roomId }); else leaveGame();
        navigate('/rooms');
      }
    } else {
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
            <span className="letter-tile-score">{LETTER_SCORES[draggingLetter] || 0}</span>
          </div>
        )}

        <div className="game-board" style={{ 
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`
        }}>
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const placedTile = placedTiles.find(t => t.row === rowIndex && t.col === colIndex);
              const displayLetter = placedTile ? placedTile.letter : cell.letter;
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={getBoardCellClass(rowIndex, colIndex, cell)}
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
                      <span className="cell-score">{LETTER_SCORES[displayLetter] || 0}</span>
                    </>
                  ) : cell.isCenter ? (
                    <span className="center-star">⭐</span>
                  ) : cell.multiplier ? (
                    <span className="cell-multiplier">
                      {cell.multiplier === 'TW' ? '×3' : 
                       cell.multiplier === 'DW' ? '×2' : 
                       cell.multiplier === 'TL' ? '×3' : 
                       cell.multiplier === 'DL' ? '×2' : cell.multiplier}
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        
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
                className={`letter-tile ${draggingLetter === letter ? 'selected' : ''} ${(mpMode ? (mpCurrentTurn !== currentUser?.id) : (currentTurn !== 'player')) ? 'disabled' : ''}`}
                onClick={() => handleLetterSelect(letter)}
                style={{ cursor: (mpMode ? (mpCurrentTurn === currentUser?.id) : (currentTurn === 'player')) ? 'grab' : 'not-allowed' }}
              >
                {letter}
                <span className="letter-tile-score">{LETTER_SCORES[letter] || 0}</span>
              </div>
            ))}
          </div>
          
          {/* Kontrol Butonları */}
          <div className="rack-controls">
            <button
              className="control-button primary"
              onClick={handleSubmitWord}
              disabled={placedTiles.length === 0 || (mpMode ? (mpCurrentTurn !== currentUser?.id) : (currentTurn !== 'player')) || isSubmitting}
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
              disabled={(mpMode ? (mpCurrentTurn !== currentUser?.id) : (currentTurn !== 'player'))}
            >
              � Karıştır
            </button>
            
            <button
              className="control-button secondary"
              onClick={handlePass}
              disabled={(mpMode ? (mpCurrentTurn !== currentUser?.id) : (currentTurn !== 'player'))}
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

  const effectiveState = mpMode ? GAME_STATES.PLAYING : gameState;
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
              <div className={`turn-timer ${turnTimer <= 10 ? 'urgent' : turnTimer <= 20 ? 'warning' : ''}`}>
                ⏱️ Hamle: {turnTimer}s
              </div>
              <div className="turn-indicator">
                {(mpMode ? (mpCurrentTurn === currentUser?.id) : (currentTurn === 'player')) ? '🎯 Sizin sıranız' : '👤 Rakip oynuyor'}
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

  {/* Bag Drawer - TEK ORTAK TILE BAG (MP modda dağılım bilinmiyor) */}
  <BagDrawer tileBagSnapshot={mpMode ? undefined : tileBagSnapshot} />

        {/* Blank Letter Selection Modal */}
        {blankSelection && (
          <BlankLetterModal
            onSelect={handleBlankSelect}
            onCancel={handleBlankCancel}
          />
        )}

        {/* Score Star - Sol Alt Köşe */}
        {currentScore > 0 && (
          <div className="score-star">
            <div className="star-icon">⭐</div>
            <div className="star-score">{currentScore}</div>
          </div>
        )}

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