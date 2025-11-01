import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useMatchGame } from '../../services/matchGameService';
import './GameRoom.css';

/**
 * Minimal multiplayer room to drive socket-based game events
 * Shows scores, current turn, recent moves and provides basic actions.
 */
const MultiplayerRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { socket, on, off } = useSocket();
  const { joinMatch, placeTiles, passTurn, leaveMatch, requestFullState,
    onGameReady, onStatePatch, onTurnChanged, onOpponentLeft, onGameOver, onMatchError, onWaitingOpponent, onFullState } = useMatchGame();

  const initialData = useMemo(() => location.state || {}, [location.state]);
  const [matchId, setMatchId] = useState(initialData.matchId);
  const [partnerId, setPartnerId] = useState(initialData.partnerId);
  const [role, setRole] = useState(initialData.role);

  const [scores, setScores] = useState({});
  const [board, setBoard] = useState([]);
  const [myRack, setMyRack] = useState([]);
  const [opponentRackCount, setOpponentRackCount] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [status, setStatus] = useState('waiting');
  const [moves, setMoves] = useState([]);
  const [info, setInfo] = useState('Bağlanılıyor...');
  const [tileBagRemaining, setTileBagRemaining] = useState();

  // Join on mount or when reconnected
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    if (!roomId) {
      navigate('/rooms');
      return;
    }

    // If navigated directly without state, try to recover from sessionStorage
    const ssKey = 'kelimeo:lastMatch';
    if (!matchId) {
      const saved = sessionStorage.getItem(ssKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.matchId && parsed?.roomId === roomId) {
            setMatchId(parsed.matchId);
            setPartnerId(parsed.partnerId);
            setRole(parsed.role);
          }
        } catch {}
      }
    } else {
      // Persist for refresh/reconnect
      sessionStorage.setItem(ssKey, JSON.stringify({ matchId, roomId, partnerId, role }));
    }
  }, [currentUser, navigate, roomId, matchId, partnerId, role]);

  // Event subscriptions
  useEffect(() => {
    const c1 = onGameReady((payload) => {
      setInfo('Rakip hazır, oyun başlıyor');
      setStatus('playing');
      setScores(payload.state?.scores || {});
      setCurrentTurn(payload.state?.currentTurn || null);
    });
    const c2 = onStatePatch(({ move, boardDiff, scores: newScores, tileBagRemaining: tbr, currentTurn: newTurn }) => {
      setMoves((m) => [...m.slice(-9), move]);
      if (newScores) setScores(newScores);
      if (typeof tbr === 'number') setTileBagRemaining(tbr);
      if (newTurn) setCurrentTurn(newTurn);
      if (Array.isArray(boardDiff) && boardDiff.length) {
        setBoard(prev => {
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
    const c3 = onTurnChanged(({ currentTurn, reason }) => {
      setCurrentTurn(currentTurn);
      setInfo(reason === 'timeout' ? 'Süre doldu, sıra değişti' : reason === 'pass' ? 'Pas verildi' : 'Sıra değişti');
    });
    const c4 = onOpponentLeft(() => {
      setInfo('Rakip ayrıldı, bekleniyor...');
      setStatus('waiting_opponent');
    });
    const c5 = onGameOver((payload) => {
      setStatus('finished');
      setInfo(`Oyun bitti. Kazanan: ${payload.winner ?? 'Yok'}`);
    });
    const c6 = onMatchError((e) => setInfo(`Hata: ${e.message}`));
    const c7 = onWaitingOpponent(() => setInfo('Rakip bekleniyor...'));
    const c8 = onFullState((full) => {
      setScores(full.scores || {});
      setCurrentTurn(full.currentTurn || null);
      setStatus(full.status || 'playing');
      setMoves(full.moves || []);
      if (Array.isArray(full.board)) setBoard(full.board);
      if (full.rack) {
        setMyRack(full.rack.me || []);
        setOpponentRackCount(full.rack.opponentCount || 0);
      }
      if (typeof full.tileBagRemaining === 'number') setTileBagRemaining(full.tileBagRemaining);
      setInfo('Senkronize edildi');
    });

    return () => { c1(); c2(); c3(); c4(); c5(); c6(); c7(); c8(); };
  }, [onGameReady, onStatePatch, onTurnChanged, onOpponentLeft, onGameOver, onMatchError, onWaitingOpponent, onFullState]);

  // Join or rejoin
  useEffect(() => {
    if (!matchId || !roomId || !currentUser) return;
    // If connected, join now
    if (socket?.connected) {
      joinMatch({ matchId, roomId });
      requestFullState({ matchId });
    }
    // On reconnect, rejoin
    const handleConnect = () => {
      joinMatch({ matchId, roomId });
      requestFullState({ matchId });
    };
    on('connect', handleConnect);
    return () => off('connect', handleConnect);
  }, [socket, matchId, roomId, currentUser, joinMatch, requestFullState, on, off]);

  const myId = currentUser?.id;
  const myScore = scores[myId] || 0;
  const oppId = partnerId;
  const oppScore = scores[oppId] || 0;
  const myTurn = currentTurn === myId;

  const handlePlaceTiles = () => {
    if (!matchId) return;
    // Demo: merkez hücreye 'A' koy (uygunsa)
    const size = board?.length || 15;
    const center = Math.floor(size / 2);
    placeTiles({ matchId, roomId, move: { type: 'place_tiles', tiles: [{ row: center, col: center, letter: 'A', isBlank: false }], meta: { words: ['A'] } } });
  };
  const handlePass = () => {
    if (!matchId) return;
    passTurn({ matchId, roomId });
  };
  const handleLeave = () => {
    if (!matchId) return;
    leaveMatch({ matchId, roomId });
    navigate('/rooms');
  };

  return (
    <div className="game-room" style={{ padding: 20 }}>
      <h2>Çok Oyunculu Oda ({roomId})</h2>
      <div style={{ marginBottom: 8, opacity: 0.8 }}>{info}</div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="score-card">
          <strong>Ben</strong>
          <div>id: {myId}</div>
          <div>Skor: {myScore}</div>
          <div>{myTurn ? 'Sıra: Ben' : 'Sıra: Rakip'}</div>
          <div>Raf: {myRack.join(' ')}</div>
        </div>
        <div className="score-card">
          <strong>Rakip</strong>
          <div>id: {oppId || '-'}</div>
          <div>Skor: {oppScore}</div>
          <div>Raf: {opponentRackCount} taş</div>
        </div>
        <div className="score-card">
          <strong>Torba</strong>
          <div>Kalan: {typeof tileBagRemaining === 'number' ? tileBagRemaining : '-'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 2, gridTemplateColumns: `repeat(${board?.[0]?.length || 15}, 28px)`, marginBottom: 16 }}>
        {(board && board.length ? board : Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => ({})))).map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div key={`${rIdx}-${cIdx}`} style={{ width: 28, height: 28, border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cell.letter ? '#fafafa' : '#fff', fontSize: 12 }}>
              {cell.letter || ''}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handlePlaceTiles} disabled={!myTurn || status !== 'playing'}>Hamle Yap (+puan)</button>
        <button onClick={handlePass} disabled={!myTurn || status !== 'playing'}>Pas Geç</button>
        <button onClick={handleLeave}>Maçtan Ayrıl</button>
      </div>

      <div>
        <h3>Son Hamleler</h3>
        <ul>
          {moves.slice().reverse().map((m) => (
            <li key={m?.meta?.moveId || m.id}>
              {new Date(m?.meta?.ts || Date.now()).toLocaleTimeString()} - {m?.by} → {m?.meta?.points ?? 0} puan {m?.meta?.duplicate ? '(tekrar)' : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MultiplayerRoom;
