const { GameStateManager } = require('../server/gameStateManager');

/**
 * Simple tests for match-level game flow (idempotency, turn switching)
 */
function testIdempotentMoves() {
  console.log('\n🧪 Testing Idempotent Moves...');
  const gsm = new GameStateManager();
  const matchId = 'm1';
  const roomId = 'r1';
  const players = { player1: 'u1', player2: 'u2' };

  const state = gsm.ensureState(matchId, roomId, players);
  console.log('Initialized state. Current turn =', state.currentTurn);

  // First move by player1
  const move = { type: 'place_tiles', tiles: [], meta: { moveId: 'mv-123', points: 5 } };
  const r1 = gsm.applyMove(matchId, 'u1', move);
  console.log('After first apply:', {
    scores: r1.state.scores,
    currentTurn: r1.state.currentTurn,
    moves: r1.state.moves.length
  });

  // Duplicate move (same moveId)
  const r2 = gsm.applyMove(matchId, 'u1', move);
  console.log('After duplicate apply:', {
    scores: r2.state.scores,
    currentTurn: r2.state.currentTurn,
    moves: r2.state.moves.length,
    duplicate: r2.safeMove?.meta?.duplicate === true
  });

  const ok = r1.state.moves.length === 1 && r2.safeMove?.meta?.duplicate === true;
  console.log('Idempotency:', ok ? '✅' : '❌');
}

function testTurnSwitching() {
  console.log('\n🧪 Testing Turn Switching...');
  const gsm = new GameStateManager();
  const matchId = 'm2';
  const roomId = 'r1';
  const players = { player1: 'u1', player2: 'u2' };

  gsm.ensureState(matchId, roomId, players);
  const s1 = gsm.getState(matchId);
  console.log('Initial turn:', s1.currentTurn);

  // player1 passes
  gsm.passTurn(matchId, 'u1');
  const s2 = gsm.getState(matchId);
  console.log('After passTurn by u1:', s2.currentTurn);

  // player2 move
  gsm.applyMove(matchId, 'u2', { type: 'place_tiles', tiles: [], meta: { points: 3 } });
  const s3 = gsm.getState(matchId);
  console.log('After move by u2:', s3.currentTurn);

  const ok = s1.currentTurn === 'u1' && s2.currentTurn === 'u2' && s3.currentTurn === 'u1';
  console.log('Turn switching:', ok ? '✅' : '❌');
}

async function runAll() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   🧪 GAME FLOW TESTS                  ║');
  console.log('╚═══════════════════════════════════════╝');

  testIdempotentMoves();
  testTurnSwitching();

  // TileBag sanity
  console.log('\n🧪 Testing TileBag draws...');
  const { TileBag } = require('../server/utils/tileBag');
  const bag = new TileBag();
  const first = bag.draw(7);
  const second = bag.draw(7);
  console.log('Draw1 length:', first.length, 'Draw2 length:', second.length, 'Remaining:', bag.remaining());
  const letters = new Set(first.map(t=>t.letter).concat(second.map(t=>t.letter)));
  console.log('Unique letters count (<=14):', letters.size <= 14 ? '✅' : '❌');

  console.log('\n✅ Game flow tests completed!\n');
}

if (require.main === module) {
  runAll().catch(console.error);
}

module.exports = { runAll, testIdempotentMoves, testTurnSwitching };
