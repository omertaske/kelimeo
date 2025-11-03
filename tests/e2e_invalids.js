/*
 E2E negative cases for multiplayer:
 - invalid turn (not your turn)
 - invalid word (dictionary reject or short length)
 Run with: node tests/e2e_invalids.js
*/

const { io: Client } = require('socket.io-client');
const { server } = require('../server/server');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('🔧 Starting E2E invalids...');
  const URL = 'http://localhost:4000';

  const c1 = new Client(URL, { transports: ['websocket'] });
  const c2 = new Client(URL, { transports: ['websocket'] });

  const roomId = 'room_1';
  const u1 = 'e2e_user_A';
  const u2 = 'e2e_user_B';

  let matchId;
  let currentTurn;
  let errors = [];

  c1.on('match_error', (e) => { console.log('c1 match_error', e); errors.push({ who: 'c1', e }); });
  c2.on('match_error', (e) => { console.log('c2 match_error', e); errors.push({ who: 'c2', e }); });
  c1.on('matched', (m) => { matchId = m.matchId; });
  c2.on('matched', (m) => { matchId = m.matchId; });
  c1.on('game_ready', (p) => { currentTurn = p.state?.currentTurn || p.currentTurn; });
  c2.on('game_ready', (p) => { currentTurn = p.state?.currentTurn || p.currentTurn; });
  c1.on('turn_changed', (t) => { currentTurn = t.currentTurn; });
  c2.on('turn_changed', (t) => { currentTurn = t.currentTurn; });

  c1.emit('enterRoom', { roomId, userId: u1 });
  c2.emit('enterRoom', { roomId, userId: u2 });
  await wait(1200);
  if (!matchId) throw new Error('No match created');

  c1.emit('join_match', { matchId, roomId, userId: u1 });
  c2.emit('join_match', { matchId, roomId, userId: u2 });
  await wait(300);

  // Attempt invalid turn from the user who is NOT currentTurn
  const offender = currentTurn === u1 ? u2 : u1;
  const offenderClient = offender === u1 ? c1 : c2;
  offenderClient.emit('place_tiles', { matchId, roomId, userId: offender, move: { type: 'place_tiles', tiles: [{ row: 7, col: 7, letter: 'B' }], meta: { words: ['BA'] } } });
  await wait(200);

  const hasInvalidTurn = errors.some(x => x?.e?.code === 'INVALID_TURN');
  if (!hasInvalidTurn) throw new Error('Expected INVALID_TURN for c2');

  // Now try invalid word from the actual currentTurn player (single-letter "A" is rejected)
  const validTurnUser = currentTurn; // whoever currently has the turn
  const validClient = validTurnUser === u1 ? c1 : c2;
  validClient.emit('place_tiles', { matchId, roomId, userId: validTurnUser, move: { type: 'place_tiles', tiles: [{ row: 7, col: 7, letter: 'A' }], meta: { words: ['A'] } } });
  await wait(300);

  const hasInvalidWord = errors.some(x => x?.e?.code === 'INVALID_WORD');
  if (!hasInvalidWord) throw new Error('Expected INVALID_WORD for c1');

  console.log('✅ E2E invalids complete');
  cleanup();

  function cleanup() {
    try { c1.disconnect(); } catch {}
    try { c2.disconnect(); } catch {}
    try { server.close(); } catch {}
  }
}

// Wrapper to allow top-level await style without ESM
(async () => {
  try {
    await run();
    // Ensure clean success exit code
    process.exit(0);
  } catch (e) {
    console.error(e);
    try { server.close(); } catch {}
    process.exit(1);
  }
})();
