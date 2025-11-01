import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  LETTER_SCORES, 
  PREMIUM_SQUARES, 
  PREMIUM_POSITIONS, 
  BOARD_TYPES, 
  GAME_STATES
} from './gameConstants';
import { 
  validateWord as validateWordUtil, 
  calculateScore as calculateScoreUtil, 
  findAllWords as findAllWordsUtil,
  getBotWordByDifficulty,
  getPlayableWords,
  getCenterPosition,
  validateMove,
  findValidBotPositions
} from './gameUtils';
import { getGlobalTileBag, resetGlobalTileBag } from '../utils/game/tileBag';
import { useMultiplayerSync } from '../hooks/useGameSync';
import { 
  createGame, 
  submitMove as submitMoveToAPI, 
  passMove as passMoveToAPI,
  endGame as endGameOnServer,
  fetchGameState
} from '../services/gameService';
import { 
  createGameState, 
  getPlayerRole, 
  isMyTurn,
  PLAYER_ROLES 
} from '../services/gameStateHelper';
import { 
  initializeMultiplayerGame,
  sendMultiplayerMove,
  sendMultiplayerPass,
  applyServerGameState 
} from '../utils/multiplayerHelpers';

// ============================================================================
// TEK ORTAK TILE BAG (Global Paylaşılan Torba)
// ============================================================================
// Oyun boyunca TÜM oyuncular için ORTAK bir tileBag kullanılır.
// Oyuncu başına ayrı torba YOK - herkes aynı global torbadan çeker.
// ============================================================================

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { currentUser, updateUserStats, bots, startMatch } = useAuth();
  const [gameState, setGameState] = useState(GAME_STATES.WAITING);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [matchingTimer, setMatchingTimer] = useState(0);
  const [gameTimer, setGameTimer] = useState(300); // 5 dakika = 300 saniye
  const [turnTimer, setTurnTimer] = useState(60); // 60 saniye hamle süresi
  const [currentTurn, setCurrentTurn] = useState(null);
  const currentTurnRef = useRef(null); // Timer için ref
  const [playerLetters, setPlayerLetters] = useState([]);
  // REMOVED: letterBag artık state değil, global tileBag kullanılıyor
  // TEK ORTAK TILE BAG — tüm çekimler/harcamalar global tileBag'i günceller
  const tileBag = useMemo(() => getGlobalTileBag(), []); // Singleton instance
  const [tileBagSnapshot, setTileBagSnapshot] = useState({}); // UI için snapshot
  const [gameBoard, setGameBoard] = useState([]);
  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [placedTiles, setPlacedTiles] = useState([]); // Geçici yerleştirilen harfler
  const [wordMeanings, setWordMeanings] = useState({}); // Kelime anlamları {word: meaning}
  const [playerPassCount, setPlayerPassCount] = useState(0); // Oyuncu pas sayısı  
  const [opponentPassCount, setOpponentPassCount] = useState(0); // Rakip pas sayısı
  const playerPassCountRef = useRef(0); // Timer closure için ref
  const opponentPassCountRef = useRef(0); // Timer closure için ref
  const [opponentLetters, setOpponentLetters] = useState([]); // Bot/Rakip harfleri (oyun sonu için)
  
  // Multiplayer için ek state'ler
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [myRole, setMyRole] = useState(null); // 'player1' veya 'player2'
  const [serverGameState, setServerGameState] = useState(null); // API'den gelen oyun durumu
  
  // Pas sayaçlarını state değişikliği için kullanıyoruz
  console.log('Pas durumu:', { playerPassCount, opponentPassCount });

  // TileBag snapshot guncellemesi (UI icin)
  const updateTileBagSnapshot = useCallback(() => {
    setTileBagSnapshot(tileBag.getSnapshot());
  }, [tileBag]);

  // ============================================================================
  // MULTIPLAYER CALLBACKS
  // ============================================================================

  // Server'dan oyun güncellemesi geldiğinde
  const handleGameUpdate = useCallback((serverGame) => {
    console.log('Oyun guncellendi:', {
      version: serverGame.version,
      currentTurn: serverGame.currentTurn,
    });

    // Server state'i local state'e uygula
    applyServerGameState(serverGame, {
      setGameBoard,
      setScore,
      setCurrentTurn,
      setMoveHistory,
      setPlayerPassCount,
      setOpponentPassCount,
      setGameTimer,
      setTurnTimer,
      playerPassCountRef,
      opponentPassCountRef,
      myRole,
    });

    setServerGameState(serverGame);
  }, [myRole]);

  // Oyun bittiğinde
  const handleGameEnd = useCallback((serverGame) => {
    console.log('Oyun bitti:', {
      status: serverGame.status,
      winner: serverGame.winner,
    });

    setGameState(GAME_STATES.FINISHED);
    setServerGameState(serverGame);

    // İstatistikleri güncelle
    const isWinner = serverGame.winner === myRole;
    const finalScores = serverGame.finalScores || serverGame.scores;
    
    const myFinalScore = myRole === PLAYER_ROLES.PLAYER1 
      ? finalScores.player1 
      : finalScores.player2;

    const newStats = {
      gamesPlayed: (currentUser?.gamesPlayed || 0) + 1,
      gamesWon: isWinner ? (currentUser?.gamesWon || 0) + 1 : (currentUser?.gamesWon || 0),
      totalScore: (currentUser?.totalScore || 0) + myFinalScore,
      bestScore: Math.max(currentUser?.bestScore || 0, myFinalScore),
    };

    updateUserStats(newStats);
  }, [myRole, currentUser, updateUserStats]);

  // Multiplayer senkronizasyon hook'u
  useMultiplayerSync({
    currentGame,
    currentUserId: currentUser?.id,
    onGameUpdate: handleGameUpdate,
    onGameEnd: handleGameEnd,
  });
  
  // TEK ORTAK TILE BAG — Oyuncu için harf çekme (ASYNC, atomic çekim)
  const generatePlayerLetters = useCallback(async () => {
    // Global tileBag'den 7 taş çek
    const result = await tileBag.drawFromBag(7);
    
    if (result.success) {
      setPlayerLetters(result.tiles);
      // TEK ORTAK TILE BAG — çekilen taşlar commit edildi (kullanıldı)
      await tileBag.commitMove(result.tiles);
      updateTileBagSnapshot();
      console.log('🎮 Oyuncu harfleri çekildi:', result.tiles);
    } else {
      console.error('❌ Oyuncu harfleri çekilemedi:', result.error);
      setPlayerLetters([]);
    }
  }, [tileBag, updateTileBagSnapshot]);

  const initializeBoard = useCallback(() => {
    if (!currentRoom) {
      console.warn('currentRoom tanımlı değil, tahta oluşturulamadı');
      return;
    }

    const size = currentRoom.boardSize || 15;
    const board = new Array(size)
      .fill(null)
      .map(() =>
        new Array(size)
          .fill(null)
          .map(() => ({
            letter: null,
            multiplier: null,
            isCenter: false,
            owner: null, // 'player' veya 'opponent'
            // Premium kare kullanımının kalıcı işaretlenmesi ve joker temsili için alanlar
            usedMultipliers: false,
            isBlank: false,
            blankAs: null
          }))
      );

    // Merkez pozisyonunu doğru hesapla
    const centerPos = getCenterPosition(size);
    if (board[centerPos.row] && board[centerPos.row][centerPos.col]) {
      board[centerPos.row][centerPos.col].isCenter = true;
    }

    // Premium kareleri yerleştir - sadece tahta sınırları içinde
    for (const [type, positions] of Object.entries(PREMIUM_POSITIONS)) {
      for (const [row, col] of positions) {
        if (row < size && col < size && board[row] && board[row][col]) {
          board[row][col].multiplier = type;
        }
      }
    }

    setGameBoard(board);
  }, [currentRoom]);

  const switchTurn = useCallback(() => {
    const newTurn = currentTurnRef.current === 'player' ? 'opponent' : 'player';
    setCurrentTurn(newTurn);
    currentTurnRef.current = newTurn;
    setTurnTimer(60); // Her hamle için 60 saniye
  }, []);

  // currentTurn değiştiğinde ref'i güncelle
  useEffect(() => {
    currentTurnRef.current = currentTurn;
  }, [currentTurn]);

  // Pas sayaçları değiştiğinde ref'leri güncelle
  useEffect(() => {
    playerPassCountRef.current = playerPassCount;
  }, [playerPassCount]);

  useEffect(() => {
    opponentPassCountRef.current = opponentPassCount;
  }, [opponentPassCount]);

  const validateWord = useCallback(async (word) => {
    return await validateWordUtil(word);
  }, []);

  const calculateScore = useCallback((word, positions, board) => {
    return calculateScoreUtil(word, positions, board);
  }, []);

  // Tahtadaki tüm kelimeleri bul
  const findAllWords = useCallback((board, newPositions) => {
    return findAllWordsUtil(board, newPositions);
  }, []);

  const makeBotMove = useCallback(async () => {
    // Tahta henüz hazır değilse çık
    if (!gameBoard || gameBoard.length === 0) {
      console.warn('Tahta henüz hazır değil, bot hamlesi yapılamadı');
      switchTurn();
      return;
    }

    const botRank = opponent?.rank || opponent?.level || 'Usta';
    const startTime = Date.now();
    const TIMEOUT_MS = 15000; // 15 saniye timeout
    
    console.log(`[BOT ${botRank}] Hamle başladı - Elindeki harfler:`, opponentLetters);
    
    // Bot'un elindeki harflerle yapabileceği kelimeleri bul
    const playableWords = getPlayableWords(opponentLetters, botRank, gameBoard);
    
    console.log(`[BOT ${botRank}] ${playableWords.length} olası kelime bulundu - 15 saniye boyunca deneyecek`);
    
    if (playableWords.length === 0) {
      console.warn(`❌ Bot elindeki harflerle kelime oluşturamıyor, pas geçiyor...`);
      
      const newOpponentPassCount = opponentPassCount + 1;
      setOpponentPassCount(newOpponentPassCount);
      
      setMoveHistory(prev => [...prev, {
        player: 'opponent',
        word: 'PAS',
        score: 0,
        timestamp: new Date().toISOString(),
        type: 'pass'
      }]);

      if (newOpponentPassCount >= 3 && playerPassCount >= 3) {
        setTimeout(() => {
          setGameState(GAME_STATES.FINISHED);
        }, 500);
        return;
      }

      switchTurn();
      return;
    }
    
    // En uzun kelimeleri önce dene (daha yüksek puan)
    const sortedWords = [...playableWords].sort((a, b) => b.length - a.length);
    
    let bestMove = null;
    let bestMoveScore = 0;
    let attemptCount = 0;
    
    // 15 saniye boyunca sürekli dene - limit yok!
    for (const word of sortedWords) {
      // Timeout kontrolü - HER denemede
      const elapsed = Date.now() - startTime;
      if (elapsed > TIMEOUT_MS) {
        console.log(`⏱️ 15 saniye doldu - ${attemptCount} kelime denendi`);
        break;
      }
      
      attemptCount++;
      
      if (attemptCount % 10 === 0) {
        const elapsedSec = (elapsed / 1000).toFixed(1);
        console.log(`[BOT ${botRank}] ${attemptCount} kelime denendi (${elapsedSec}s)`);
      }
      
      // Oyun kurallarına uygun pozisyonları bul - TÜM POZİSYONLAR
      const validPositions = findValidBotPositions(gameBoard, word, opponentLetters);

      if (validPositions.length === 0) {
        continue;
      }

      // TÜM pozisyonları değerlendir (sadece ilk 3 değil!)
      for (const position of validPositions) {
        // Timeout kontrolü
        if (Date.now() - startTime > TIMEOUT_MS) break;
        
        const tempBoard = gameBoard.map(row => row.map(cell => ({ ...cell })));
        position.forEach(({ letter, row, col }) => {
          tempBoard[row][col] = {
            ...tempBoard[row][col],
            letter: letter,
            owner: 'opponent'
          };
        });
        
        const positions = position.map(pos => ({ row: pos.row, col: pos.col }));
        
        // Oluşan TÜM kelimeleri bul
        const formedWords = findAllWords(tempBoard, positions);
        
        if (formedWords.length === 0) continue;

        // TÜM kelimeleri TDK'da doğrula (paralel)
        const validationPromises = formedWords
          .filter(({ word: formedWord }) => formedWord.length >= 2)
          .map(({ word: formedWord }) => validateWord(formedWord));
        
        try {
          const validationResults = await Promise.all(validationPromises);
          const allWordsValid = validationResults.every(result => result.valid);

          if (!allWordsValid) continue;

          // Geçerli hamle! Puanı hesapla
          const scoreResult = calculateScore(word, positions, gameBoard);
          const moveScore = scoreResult.score;

          // En iyi hamleyi sakla
          if (moveScore > bestMoveScore) {
            bestMoveScore = moveScore;
            bestMove = {
              word,
              position,
              positions,
              formedWords,
              score: moveScore
            };
            
            console.log(`🎯 Yeni en iyi: "${word}" (${moveScore} puan) - ${formedWords.map(w => w.word).join(', ')}`);
          }
        } catch (error) {
          // TDK hatası - devam et
          continue;
        }
      }
      
      // Timeout kontrolü
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log(`⏱️ 15 saniye doldu`);
        break;
      }
    }
    
    // En iyi hamleyi uygula
    if (bestMove) {
      const { word, position, positions, formedWords, score: botScore } = bestMove;
      
      setGameBoard(prevBoard => {
        const newBoard = prevBoard.map(row => row.map(cell => ({ ...cell })));
        position.forEach(({ letter, row, col }) => {
          newBoard[row][col] = {
            ...newBoard[row][col],
            letter: letter,
            owner: 'opponent'
          };
        });
        return newBoard;
      });

      setLastMove({
        word,
        positions,
        owner: 'opponent',
        timestamp: Date.now()
      });

      setMoveHistory(prev => [...prev, { 
        word, 
        positions, 
        owner: 'opponent', 
        timestamp: Date.now() 
      }]);

      setScore(prev => ({
        ...prev,
        opponent: prev.opponent + botScore
      }));

      // Bot hamle yaptı - pas sayacını sıfırla
      setOpponentPassCount(0);
      opponentPassCountRef.current = 0; // Ref'i de sıfırla

      // Bot harflerini güncelle
      const usedLetters = position.filter(pos => pos.isNew).map(pos => pos.letter);
      
      const updatedBotLetters = [...opponentLetters];
      for (const letter of usedLetters) {
        const index = updatedBotLetters.indexOf(letter);
        if (index > -1) {
          updatedBotLetters.splice(index, 1);
        } else {
          const blankIndex = updatedBotLetters.indexOf('*');
          if (blankIndex > -1) {
            updatedBotLetters.splice(blankIndex, 1);
          }
        }
      }
      
      // Yeni harfler çek
      const neededLetters = usedLetters.length;
      const drawResult = await tileBag.drawFromBag(neededLetters);
      
      if (drawResult.success && drawResult.tiles.length > 0) {
        updatedBotLetters.push(...drawResult.tiles);
        await tileBag.commitMove(drawResult.tiles);
        updateTileBagSnapshot();
      }
      
      setOpponentLetters(updatedBotLetters);
      
      // Pas sayaçlarını sıfırla
      setPlayerPassCount(0);
      setOpponentPassCount(0);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      switchTurn();
      console.log(`✅ Bot "${word}" oynadı (${botScore} puan, ${elapsedTime}s, ${attemptCount} deneme) - Kelimeler: ${formedWords.map(w => w.word).join(', ')}`);
      
      // Oyun bitiş kontrolü
      setTimeout(() => {
        const tileBagEmpty = tileBag.isEmpty();
        
        if (updatedBotLetters.length === 0 && tileBagEmpty) {
          setGameState(GAME_STATES.FINISHED);
        }
      }, 100);
      
      return; // ✅ Başarıyla tamamlandı
    }

    // Hiçbir geçerli hamle bulunamadı - pas geç
    console.warn(`❌ Bot ${attemptCount} deneme yaptı ama geçerli hamle bulamadı, pas geçiyor...`);
    
    const newOpponentPassCount = opponentPassCount + 1;
    setOpponentPassCount(newOpponentPassCount);
    
    setMoveHistory(prev => [...prev, {
      player: 'opponent',
      word: 'PAS',
      score: 0,
      timestamp: new Date().toISOString(),
      type: 'pass'
    }]);

    // BİR OYUNCU 4 KEZ PAS GEÇTİ Mİ KONTROLÜ (hükmen mağlubiyet)
    if (newOpponentPassCount >= 4) {
      setTimeout(() => {
        console.log('🚫 Bot 4 kez pas geçti - HÜKMEN MAĞLUBİYET!');
        setGameState(GAME_STATES.FINISHED);
      }, 500);
      return;
    }
    if (playerPassCount >= 4) {
      setTimeout(() => {
        console.log('🚫 Oyuncu 4 kez pas geçti - HÜKMEN MAĞLUBİYET!');
        setGameState(GAME_STATES.FINISHED);
      }, 500);
      return;
    }

    switchTurn();
  }, [switchTurn, calculateScore, gameBoard, validateWord, findAllWords, opponentPassCount, playerPassCount, opponentLetters, tileBag, updateTileBagSnapshot, opponent?.rank, opponent?.level]);

  const startGame = useCallback(async (opponentData, options = {}) => {
    if (!currentRoom) return;

    const {
      gameId = `local-${Date.now()}`,
      boardId = currentRoom.id,
      opponentIsBot = opponentData?.isBot ?? false,
      startedAt = new Date().toISOString(),
      isMultiplayer = false,
    } = options;

    setOpponent(opponentData);
    
    const gameConfig = {
      id: gameId,
      boardId,
      opponentId: opponentData?.id ?? null,
      opponentIsBot,
      startedAt
    };
    
    setCurrentGame(gameConfig);
    setGameState(GAME_STATES.PLAYING);
    
    // Multiplayer ise mevcut oyunu API'den çek
    if (isMultiplayer && !opponentIsBot && currentUser?.id && opponentData?.id) {
      setIsMultiplayer(true);
      
      // API'den mevcut oyunu çek (lobby'de zaten oluşturuldu)
      const { success, game } = await fetchGameState(gameId);
      
      if (success && game) {
        const playerRole = getPlayerRole(game, currentUser.id);
        setMyRole(playerRole);
        setServerGameState(game);
        
        // Server'dan gelen sıra bilgisini kullan
        const isMyTurn = game.currentTurn === playerRole;
        const localTurn = isMyTurn ? 'player' : 'opponent';
        setCurrentTurn(localTurn);
        
        console.log('Multiplayer oyun yuklendi:', {
          gameId: game.id,
          myRole: playerRole,
          isMyTurn,
          localTurn,
          status: game.status,
        });
      } else {
        console.error('Oyun API\'den yuklenemedi:', gameId);
        setIsMultiplayer(false);
        setCurrentTurn(Math.random() > 0.5 ? 'player' : 'opponent');
      }
    } else {
      // Bot oyunu - local mod
      setIsMultiplayer(false);
      setMyRole(null);
      setCurrentTurn(Math.random() > 0.5 ? 'player' : 'opponent');
    }
    
    setGameTimer(300); // 5 dakika = 300 saniye
    setTurnTimer(60); // 60 saniye hamle süresi
    setScore({ player: 0, opponent: 0 });
    setPlayerPassCount(0); // Oyuncu pas sayacını sıfırla
    setOpponentPassCount(0); // Rakip pas sayacını sıfırla
    playerPassCountRef.current = 0; // Ref'leri de sıfırla
    opponentPassCountRef.current = 0;

    // TEK ORTAK TILE BAG — Yeni oyun başlarken torbayı sıfırla
    resetGlobalTileBag();
    
    initializeBoard();
    generatePlayerLetters(); // Async çekim
    
    // TEK ORTAK TILE BAG — Rakip/Bot için de başlangıç harfleri çek (async)
    (async () => {
      const botDrawResult = await tileBag.drawFromBag(7);
      if (botDrawResult.success) {
        setOpponentLetters(botDrawResult.tiles);
        await tileBag.commitMove(botDrawResult.tiles);
        updateTileBagSnapshot();
      }
    })();

    if (currentUser?.username && opponentData?.username) {
      console.log(`Oyun basladi: ${currentUser.username} vs ${opponentData.username}`);
    }
  }, [currentRoom, generatePlayerLetters, initializeBoard, currentUser, tileBag, updateTileBagSnapshot]);

  const availableBots = useMemo(() => {
    if (!bots?.length) {
      return [
        {
          id: 'bot-fallback',
          username: 'Scrabble Bot',
          isBot: true,
          avatar: '🤖',
          botMeta: {
            difficulty: 'balanced',
            strategy: 'random',
            flavorText: 'Kelime pratiği için hazır bekleyen genel amaçlı bot.'
          }
        }
      ];
    }

    return bots.map(({ password, ...rest }) => ({
      ...rest,
      avatar: rest.avatar || '🤖'
    }));
  }, [bots]);

  const startGameWithBot = useCallback(() => {
    if (!availableBots.length) {
      console.warn('Hiç bot bulunamadı, oyun başlatılamadı.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableBots.length);
    const selectedBot = availableBots[randomIndex];

    const botOpponent = {
      ...selectedBot,
      level: selectedBot.botMeta?.difficulty || selectedBot.rank || 'standart',
      isBot: true
    };

    startGame(botOpponent, {
      gameId: `bot-${Date.now()}`,
      opponentIsBot: true
    });
  }, [availableBots, startGame]);

  const makeMove = useCallback(async (word, positions) => {
    if (gameState !== GAME_STATES.PLAYING || currentTurn !== 'player') {
      return { success: false, error: 'Şu an hamle yapamazsınız!' };
    }

    // Oyun kurallarını kontrol et (validateMove - gameRules.js'den)
    const moveValidation = validateMove(gameBoard, positions);
    if (!moveValidation.valid) {
      return { success: false, error: moveValidation.error };
    }

    // Geçici tahta oluştur (yeni harflerle)
    const tempBoard = gameBoard.map(row => row.map(cell => ({ ...cell })));
    placedTiles.forEach(({ letter, row, col, isBlank, repr }) => {
      tempBoard[row][col] = {
        ...tempBoard[row][col],
        letter: isBlank ? repr : letter, // Blank ise repr kullan
        owner: 'player',
        isBlank: isBlank || false,
        value: isBlank ? 0 : (LETTER_SCORES[letter] || 0)
      };
    });

    // Tüm oluşan kelimeleri bul
    const formedWords = findAllWords(tempBoard, positions);
    
    if (formedWords.length === 0) {
      return { success: false, error: 'Geçerli bir kelime oluşturmalısınız!' };
    }

    // Tüm kelimeleri doğrula
    let totalScore = 0;
    const validatedWords = [];
    
    for (const { word: formedWord, positions: wordPositions, isSingleLetter } of formedWords) {
      // Tek harf kontrolü
      if (isSingleLetter) {
        return { success: false, error: 'En az 2 harfli kelime oluşturmalısınız!' };
      }

      // TDK kontrolü
      const validation = await validateWord(formedWord);
      
      if (!validation.valid) {
        return { 
          success: false, 
          error: `"${formedWord}" kelimesi TDK sözlüğünde bulunamadı!\n${validation.error || ''}` 
        };
      }

      // Her kelime için skor hesapla
      const scoreResult = calculateScore(formedWord, wordPositions, gameBoard);
      totalScore += scoreResult.score;
      validatedWords.push({ word: formedWord, score: scoreResult.score, meaning: validation.meaning });
    }

    // Kelime anlamlarını kaydet
    const newMeanings = {};
    validatedWords.forEach(({ word, meaning }) => {
      if (word && meaning) {
        newMeanings[word] = meaning;
      }
    });
    setWordMeanings(prev => ({ ...prev, ...newMeanings }));

    // BINGO bonusu (7 harf kullanıldıysa)
    if (placedTiles.length === 7) {
      totalScore += 50;
    }

    // Ana kelimeyi belirle (en uzun veya ilk)
    const mainWord = formedWords.reduce((longest, current) => 
      current.word.length > longest.word.length ? current : longest
    );

    // Tahtayı güncelle - SADECE YENİ yerleştirilen harfleri yaz
    setGameBoard(prevBoard => {
      const newBoard = prevBoard.map(row => row.map(cell => ({ ...cell })));
      
      // placedTiles kullan - blank için repr kullan
      placedTiles.forEach(({ letter, row, col, isBlank, repr }) => {
        const prevCell = newBoard[row][col] || {};
        const hadMultiplier = !!prevCell.multiplier;
        newBoard[row][col] = {
          ...prevCell,
          letter: isBlank ? repr : letter, // Blank ise repr harfi görünsün
          owner: 'player',
          isBlank: isBlank || false, // Tahtada blank olduğunu işaretle
          blankAs: isBlank ? (repr || null) : null,
          value: isBlank ? 0 : (LETTER_SCORES[letter] || 0),
          // Bu kare bir premium ise ve ilk kez kullanılıyorsa işaretle
          usedMultipliers: prevCell.usedMultipliers || hadMultiplier ? true : false
        };
      });
      
      return newBoard;
    });

    // Hamleyi kaydet
    setLastMove({
      word: mainWord.word,
      positions,
      owner: 'player',
      timestamp: Date.now()
    });

    setMoveHistory(prev => [...prev, { 
      word: mainWord.word, 
      positions, 
      owner: 'player', 
      timestamp: Date.now() 
    }]);

    // TEK ORTAK TILE BAG — Kullanılan harfleri elden kaldır ve yeni harfler çek
    const usedLetters = placedTiles.map(t => t.letter);
    
    // Kullanılan harfleri raftan çıkar
    const updatedPlayerLetters = [...playerLetters];
    for (const letter of usedLetters) {
      const index = updatedPlayerLetters.indexOf(letter);
      if (index > -1) updatedPlayerLetters.splice(index, 1);
    }
    
    // TEK ORTAK TILE BAG — Eksik harfleri çek (7'ye tamamla)
    const neededCount = 7 - updatedPlayerLetters.length;
    if (neededCount > 0) {
      const drawResult = await tileBag.drawFromBag(neededCount);
      if (drawResult.success && drawResult.tiles.length > 0) {
        updatedPlayerLetters.push(...drawResult.tiles);
        // TEK ORTAK TILE BAG — Çekilen taşları commit et
        await tileBag.commitMove(drawResult.tiles);
        updateTileBagSnapshot();
      }
    }
    
    setPlayerLetters(updatedPlayerLetters);

    // Skoru güncelle
    setScore(prev => ({
      ...prev,
      player: prev.player + totalScore
    }));
    
    // placedTiles'ı temizle
    setPlacedTiles([]);

    // Oyuncu hamle yaptı - pas sayacını sıfırla (sadece oyuncunun)
    setPlayerPassCount(0);
    playerPassCountRef.current = 0; // Ref'i de sıfırla

    // Multiplayer ise hamleyi API'ye gönder
    if (isMultiplayer && currentGame?.id && currentUser?.id) {
      const newScore = score.player + totalScore;
      
      await sendMultiplayerMove({
        gameId: currentGame.id,
        playerId: currentUser.id,
        word: mainWord.word,
        positions,
        gameBoard: tempBoard, // Güncel tahta durumu
        scores: {
          [myRole === PLAYER_ROLES.PLAYER1 ? 'player1' : 'player2']: newScore,
          [myRole === PLAYER_ROLES.PLAYER1 ? 'player2' : 'player1']: score.opponent,
        },
        formedWords: validatedWords,
      });
      
      console.log('Multiplayer hamle gonderildi:', mainWord.word);
    }

    // Sırayı değiştir
    switchTurn();
    
    // TEK ORTAK TILE BAG — Hamle sonrası oyun bitiş kontrolü
    setTimeout(() => {
      const tileBagEmpty = tileBag.isEmpty();
      const playerEmpty = updatedPlayerLetters.length === 0;
      
      if (playerEmpty && tileBagEmpty) {
        // Oyuncunun harfleri bitti ve torba boş - oyuncu kazandı
        setGameState(GAME_STATES.FINISHED);
      }
    }, 100);

    return { 
      success: true, 
      score: totalScore,
      words: validatedWords,
      mainWord: mainWord.word
    };
  }, [calculateScore, gameState, currentTurn, switchTurn, validateWord, gameBoard, placedTiles, findAllWords, playerLetters, tileBag, updateTileBagSnapshot, isMultiplayer, currentGame, currentUser, myRole, score]);

  const endGame = useCallback(async (isWin, reason = '', finalizeScores = true) => {
    let finalPlayerScore = score.player;
    let finalOpponentScore = score.opponent;

    // Oyun sonu puanlama kuralları
    if (finalizeScores) {
      // Oyuncunun rafındaki harflerin toplam puanı
      const playerRackScore = playerLetters.reduce((sum, letter) => {
        return sum + (LETTER_SCORES[letter] || 0);
      }, 0);

      // Rakibin rafındaki harflerin toplam puanı
      const opponentRackScore = opponentLetters.reduce((sum, letter) => {
        return sum + (LETTER_SCORES[letter] || 0);
      }, 0);

      if (reason === 'finished' || reason === 'Tüm taşlar bitti!' || reason === 'Bir oyuncunun harfleri bitti!') {
        // TEK ORTAK TILE BAG — Bir oyuncu tüm taşlarını bitirdi
        // Kazanan: rafı boş olan
        const tileBagEmpty = tileBag.isEmpty();
        
        if (playerLetters.length === 0 && tileBagEmpty) {
          // Oyuncu bitirdi - rakibin rafındaki taşlar oyuncuya eklenir
          finalPlayerScore += opponentRackScore;
          finalOpponentScore -= opponentRackScore;
        } else if (opponentLetters.length === 0 && tileBagEmpty) {
          // Rakip bitirdi - oyuncunun rafındaki taşlar rakibe eklenir
          finalOpponentScore += playerRackScore;
          finalPlayerScore -= playerRackScore;
        }
      } else if (reason === 'Ardışık 6 pas, oyun bitti!') {
        // Ardışık 6 pas - her oyuncu kendi rafındaki taşları kaybeder
        finalPlayerScore -= playerRackScore;
        finalOpponentScore -= opponentRackScore;
      }
    }

    const gameResult = {
      isWin,
      score: finalPlayerScore,
      opponentScore: finalOpponentScore,
      reason,
      boardType: currentRoom?.id || 'unknown'
    };

    const newStats = {
      gamesPlayed: (currentUser?.gamesPlayed || 0) + 1,
      gamesWon: isWin ? (currentUser?.gamesWon || 0) + 1 : (currentUser?.gamesWon || 0),
      totalScore: (currentUser?.totalScore || 0) + finalPlayerScore,
      bestScore: Math.max(currentUser?.bestScore || 0, finalPlayerScore)
    };

    updateUserStats(newStats);
    
    // Final skorları güncelle
    setScore({
      player: finalPlayerScore,
      opponent: finalOpponentScore
    });
    
    setGameState(GAME_STATES.FINISHED);

    // Multiplayer ise oyun bitişini API'ye bildir
    if (isMultiplayer && currentGame?.id && currentUser?.id) {
      const winnerId = isWin ? currentUser.id : (opponent?.id || null);
      const finalScores = {
        [myRole === PLAYER_ROLES.PLAYER1 ? 'player1' : 'player2']: finalPlayerScore,
        [myRole === PLAYER_ROLES.PLAYER1 ? 'player2' : 'player1']: finalOpponentScore
      };
      
      await endGameOnServer(currentGame.id, {
        winner: winnerId,
        scores: finalScores,
        reason
      });
      
      console.log('Multiplayer oyun bitis bildirimi gonderildi');
    }

    console.log('Oyun bitti:', gameResult);
  }, [score, currentRoom, currentUser, updateUserStats, playerLetters, opponentLetters, tileBag, isMultiplayer, currentGame, myRole, opponent]);

  const resetGame = useCallback(() => {
    setGameState(GAME_STATES.WAITING);
    setCurrentRoom(null);
    setCurrentGame(null);
    setOpponent(null);
    setMatchingTimer(0);
    setGameTimer(0);
    setCurrentTurn(null);
    setPlayerLetters([]);
    setOpponentLetters([]);
    // TEK ORTAK TILE BAG — Torbayı sıfırla
    resetGlobalTileBag();
    updateTileBagSnapshot();
    setGameBoard([]);
    setScore({ player: 0, opponent: 0 });
    setMoveHistory([]);
    setLastMove(null);
    setPlacedTiles([]);
    setWordMeanings({});
    setPlayerPassCount(0);
    setOpponentPassCount(0);
    
    // Multiplayer state'lerini de sıfırla
    setIsMultiplayer(false);
    setMyRole(null);
    setServerGameState(null);
  }, [updateTileBagSnapshot]);

  const shuffleLetters = useCallback(() => {
    if (currentTurn !== 'player') return false;
    
    setPlayerLetters(prev => [...prev].sort(() => Math.random() - 0.5));
    return true;
  }, [currentTurn]);

  const exchangeLetters = useCallback((selectedLetters) => {
    if (currentTurn !== 'player' || selectedLetters.length === 0) {
      return { success: false, error: 'Harf değiştiremezsiniz!' };
    }

    // Seçilen harfleri çıkar ve yeni harfler ekle
    const newLetters = playerLetters.filter(l => !selectedLetters.includes(l));
    const addCount = selectedLetters.length;

    const turkishLetters = [
      'A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'Ç', 'D', 'D',
      'E', 'E', 'E', 'E', 'E', 'E', 'F', 'G', 'Ğ', 'H', 'H',
      'I', 'I', 'I', 'I', 'İ', 'İ', 'İ', 'İ', 'J', 'K', 'K',
      'L', 'L', 'L', 'M', 'M', 'N', 'N', 'N', 'N', 'O', 'O',
      'Ö', 'P', 'R', 'R', 'R', 'R', 'S', 'S', 'S', 'Ş', 'T',
      'T', 'T', 'T', 'U', 'U', 'Ü', 'V', 'Y', 'Y', 'Z'
    ];

    const shuffled = [...turkishLetters].sort(() => Math.random() - 0.5);
    const additionalLetters = shuffled.slice(0, addCount);

    setPlayerLetters([...newLetters, ...additionalLetters]);
    switchTurn();

    return { success: true, message: `${addCount} harf değiştirildi!` };
  }, [currentTurn, playerLetters, switchTurn]);

  const passMove = useCallback(async () => {
    if (currentTurn !== 'player') {
      return { success: false, error: 'Şu an pas geçemezsiniz!' };
    }
    
    if (gameState !== GAME_STATES.PLAYING) {
      return { success: false, error: 'Oyun aktif değil!' };
    }

    // Oyuncu pas sayacını artır
    const newPlayerPassCount = playerPassCount + 1;
    setPlayerPassCount(newPlayerPassCount);
    
    // Hamle geçmişine ekle
    setMoveHistory(prev => [...prev, {
      player: 'player',
      word: 'PAS',
      score: 0,
      timestamp: new Date().toISOString(),
      type: 'pass'
    }]);

    // Multiplayer ise pas'ı API'ye gönder
    if (isMultiplayer && currentGame?.id && currentUser?.id) {
      await sendMultiplayerPass({
        gameId: currentGame.id,
        playerId: currentUser.id,
      });
      
      console.log('Multiplayer pas gonderildi');
    }

    // Her iki oyuncu da 2 kez pas geçti mi kontrol et (4 tur toplam)
    if (newPlayerPassCount >= 2 && opponentPassCount >= 2) {
      setTimeout(() => {
        // Oyun bitti - 4 tur boyunca hamle yapılmadı
        console.log('Her iki taraf 2 kez pas gecti, oyun bitiyor...');
        setGameState(GAME_STATES.FINISHED);
      }, 500);
      return { success: true, message: '4 tur pas geçildi! Oyun sona erdi.', gameEnded: true };
    }

    // Sırayı değiştir
    switchTurn();

    return { success: true, message: 'Sıra geçildi!' };
  }, [currentTurn, switchTurn, gameState, playerPassCount, opponentPassCount, isMultiplayer, currentGame, currentUser]);

  const placeTile = useCallback((letter, row, col, blankRepr = null) => {
    if (currentTurn !== 'player') return false;

    // Blank (*) joker için repr bilgisi ekle
    const tileData = {
      letter,
      row,
      col,
      isBlank: letter === '*',
      repr: letter === '*' ? blankRepr : letter,
      value: letter === '*' ? 0 : (LETTER_SCORES[letter] || 0)
    };

    setPlacedTiles(prev => [...prev, tileData]);
    setPlayerLetters(prev => {
      const index = prev.indexOf(letter);
      if (index === -1) return prev;
      const newLetters = [...prev];
      newLetters.splice(index, 1);
      return newLetters;
    });

    return true;
  }, [currentTurn]);

  const removeTile = useCallback((row, col) => {
    const tile = placedTiles.find(t => t.row === row && t.col === col);
    if (!tile) return false;

    setPlacedTiles(prev => prev.filter(t => !(t.row === row && t.col === col)));
    // Blank joker geri eklenir, repr bilgisi kaybolur
    setPlayerLetters(prev => [...prev, tile.letter]);

    return true;
  }, [placedTiles]);

  const clearPlacedTiles = useCallback(() => {
    if (!placedTiles || placedTiles.length === 0) return;
    
    for (const tile of placedTiles) {
      setPlayerLetters(prev => [...prev, tile.letter]);
    }
    setPlacedTiles([]);
  }, [placedTiles]);

  const leaveGame = useCallback(() => {
    if (gameState === GAME_STATES.PLAYING) {
      endGame(false, 'Oyundan çıktınız!');
    } else {
      resetGame();
    }
  }, [endGame, gameState, resetGame]);

  const runMatchmaking = useCallback(async (room) => {
    try {
      if (startMatch) {
        const result = await startMatch({ roomId: room.id });
        if (result?.success && result.match) {
          const { match } = result;
          const opponentData = {
            ...match.opponent,
            isBot: match.opponentIsBot ?? match.opponent?.isBot
          };

          console.log('İnsan rakip bulundu:', opponentData.username);
          startGame(opponentData, {
            gameId: match.gameId,
            boardId: match.boardId || room.id,
            opponentIsBot: match.opponentIsBot,
            startedAt: match.startedAt
          });
          return;
        }
      }
    } catch (error) {
      console.error('startMatch hatası:', error);
    }

    // Gerçek rakip bulunamadı, 10 saniye timer bot'u başlatacak
    console.log('İnsan rakip bulunamadı, 10 saniye sonra bot ile eşleşilecek...');
  }, [startMatch, startGame]);

  const joinRoom = useCallback((boardType) => {
    let room = BOARD_TYPES[boardType];
    if (!room) {
      room = Object.values(BOARD_TYPES).find((r) => r.id === boardType);
    }
    if (!room) return false;

    setCurrentRoom(room);
    setGameState(GAME_STATES.MATCHING);
    setMatchingTimer(0);

    console.log(`${room.name} odasına katıldı, eşleşme arıyor...`);

    runMatchmaking(room);
    return true;
  }, [runMatchmaking]);

  useEffect(() => {
    let interval;
    if (gameState === GAME_STATES.MATCHING) {
      interval = setInterval(() => {
        setMatchingTimer(prev => prev + 1);
      }, 1000);
    } else {
      setMatchingTimer(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState]);

  // Oyun zamanlayıcısı (5 dakika)
  useEffect(() => {
    let interval;
    if (gameState === GAME_STATES.PLAYING) {
      interval = setInterval(() => {
        setGameTimer(prev => {
          if (prev <= 1) {
            // Oyun süresi bitti - oyunu sonlandır
            console.log('⏰ Oyun süresi doldu! Oyun bitiyor...');
            setGameState(GAME_STATES.FINISHED);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState]);

  // Hamle süresi (60 saniye) - süre biterse otomatik pas
  useEffect(() => {
    let interval;
    if (gameState === GAME_STATES.PLAYING && currentTurn) {
      interval = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            // Süre bitti - pas geçildi
            console.log('⏰ Hamle süresi doldu, otomatik pas geçiliyor...');
            console.log('Mevcut sıra (ref):', currentTurnRef.current);
            
            // Ref'ten güncel değeri al
            if (currentTurnRef.current === 'player') {
              // Oyuncu sırasındaysa pas geç
              setPlayerPassCount(prev => {
                const newCount = prev + 1;
                playerPassCountRef.current = newCount; // Ref'i güncelle
                console.log('✅ Oyuncu pas sayısı:', newCount);
                
                // 4 pas kontrolü
                if (newCount >= 4) {
                  console.log('🚫 Oyuncu 4 kez pas geçti - HÜKMEN MAĞLUBİYET!');
                  setTimeout(() => setGameState(GAME_STATES.FINISHED), 100);
                  return newCount;
                }
                
                return newCount;
              });
              
              setMoveHistory(prev => [...prev, {
                player: 'player',
                word: 'PAS (Süre Doldu)',
                score: 0,
                timestamp: new Date().toISOString(),
                type: 'timeout'
              }]);
            } else {
              // Bot sırasındaysa pas geç
              setOpponentPassCount(prev => {
                const newCount = prev + 1;
                opponentPassCountRef.current = newCount; // Ref'i güncelle
                console.log('✅ Bot pas sayısı:', newCount);
                
                // 4 pas kontrolü
                if (newCount >= 4) {
                  console.log('🚫 Bot 4 kez pas geçti - HÜKMEN MAĞLUBİYET!');
                  setTimeout(() => setGameState(GAME_STATES.FINISHED), 100);
                  return newCount;
                }
                
                return newCount;
              });
              
              setMoveHistory(prev => [...prev, {
                player: 'opponent',
                word: 'PAS (Süre Doldu)',
                score: 0,
                timestamp: new Date().toISOString(),
                type: 'timeout'
              }]);
            }
            
            // Sıra değiştir (pas sayısı 4'ten azsa)
            setTimeout(() => {
              // Ref'lerden güncel değerleri kontrol et
              if (playerPassCountRef.current < 4 && opponentPassCountRef.current < 4) {
                switchTurn();
              }
            }, 100);
            
            return 60; // Timer'ı resetle
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Oyun durduğunda timer'ı resetle
      setTurnTimer(60);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, currentTurn, switchTurn]);

  // Bot sırası geldiğinde otomatik hamle yap
  useEffect(() => {
    if (gameState === GAME_STATES.PLAYING && 
        currentTurn === 'opponent' && 
        opponent?.isBot && 
        gameBoard && 
        gameBoard.length > 0) {
      const timer = setTimeout(() => {
        makeBotMove();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, currentTurn, opponent?.isBot, gameBoard, makeBotMove]);

  const value = useMemo(() => ({
    // State
    gameState,
    currentRoom,
    currentGame,
    opponent,
    matchingTimer,
    gameTimer,
    turnTimer, // 60 saniye hamle süresi
    currentTurn,
    playerLetters,
    gameBoard,
    score,
    moveHistory,
    lastMove,
    placedTiles,
    wordMeanings,
    // TEK ORTAK TILE BAG — Global tileBag instance (UI için)
    tileBag,
    tileBagSnapshot, // UI için snapshot
    opponentLetters,
    currentUser,
    
    // Actions
    joinRoom,
    startGame,
    makeMove,
    leaveGame,
    endGame,
    resetGame,
    switchTurn,
    shuffleLetters,
    exchangeLetters,
    passMove,
    placeTile,
    removeTile,
    clearPlacedTiles,
    updateUserStats,
    
    // Utility Functions
    validateWord,
    calculateScore,
    findAllWords,
    
    // Constants
    BOARD_TYPES,
    GAME_STATES,
    LETTER_SCORES,
    PREMIUM_SQUARES
  }), [
    gameState,
    currentRoom,
    currentGame,
    opponent,
    matchingTimer,
    gameTimer,
    turnTimer,
    currentTurn,
    playerLetters,
    gameBoard,
    score,
    moveHistory,
    lastMove,
    placedTiles,
    wordMeanings,
    tileBag, // TEK ORTAK TILE BAG
    tileBagSnapshot, // Snapshot state
    opponentLetters,
    currentUser,
    joinRoom,
    startGame,
    makeMove,
    leaveGame,
    endGame,
    resetGame,
    switchTurn,
    shuffleLetters,
    exchangeLetters,
    passMove,
    placeTile,
    removeTile,
    clearPlacedTiles,
    updateUserStats,
    validateWord,
    calculateScore,
    findAllWords
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};