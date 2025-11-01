/*
 Minimal E2E smoke for join → move → pass using Socket.IO.
 Run with: node tests/e2e_matchflow.js
 Note: Uses the in-repo server; ensure no other process uses port 4000.
*/

const { io: Client } = require('socket.io-client');
const { server } = require('../server/server'); // ensure server starts

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('🔧 Starting E2E matchflow...');
  const URL = 'http://localhost:4000';

  const c1 = new Client(URL, { transports: ['websocket'] });
  const c2 = new Client(URL, { transports: ['websocket'] });

  const roomId = 'room_1';
  const u1 = 'e2e_user_1';
  const u2 = 'e2e_user_2';

  // Basic logs
  c1.on('connect', () => console.log('c1 connected', c1.id));
  c2.on('connect', () => console.log('c2 connected', c2.id));

  // Queue status listener just to observe
  c1.on('roomsStatus', (s) => console.log('c1 roomsStatus', s));
  c2.on('roomsStatus', (s) => console.log('c2 roomsStatus', s));

  // Match found handler
  let matchId;
  c1.on('matched', (m) => { console.log('c1 matched', m); matchId = m.matchId; });
  c2.on('matched', (m) => { console.log('c2 matched', m); matchId = m.matchId; });

  // Match/game events
  c1.on('game_ready', (p) => console.log('c1 game_ready', p.state));
  c2.on('game_ready', (p) => console.log('c2 game_ready', p.state));
  c1.on('full_state', (s) => console.log('c1 full_state scores:', s.scores));
  c2.on('full_state', (s) => console.log('c2 full_state scores:', s.scores));
  c1.on('state_patch', (p) => console.log('c1 state_patch points:', p.move?.meta?.points));
  c2.on('state_patch', (p) => console.log('c2 state_patch points:', p.move?.meta?.points));
  c1.on('turn_changed', (t) => console.log('c1 turn_changed', t.currentTurn));
  c2.on('turn_changed', (t) => console.log('c2 turn_changed', t.currentTurn));

  // Enter room and match
  c1.emit('enterRoom', { roomId, userId: u1 });
  c2.emit('enterRoom', { roomId, userId: u2 });

  // Wait a bit for match
  await wait(1200);

  if (!matchId) {
    console.error('❌ No match created');
    cleanup();
    return;
  }

  // Join match
  c1.emit('join_match', { matchId, roomId, userId: u1 });
  c2.emit('join_match', { matchId, roomId, userId: u2 });

  await wait(300);
  // Request full state (optional)
  c1.emit('request_full_state', { matchId });
  c2.emit('request_full_state', { matchId });

  // Make a demo move from c1 (center A)
  const center = 7;
  c1.emit('place_tiles', { matchId, roomId, userId: u1, move: { type: 'place_tiles', tiles: [{ row: center, col: center, letter: 'A' }], meta: { words: ['A'] } } });

  await wait(300);
  // c2 passes
  c2.emit('pass_turn', { matchId, roomId, userId: u2 });

  await wait(500);
  console.log('✅ E2E smoke complete');
  cleanup();

  function cleanup() {
    try { c1.disconnect(); } catch {}
    try { c2.disconnect(); } catch {}
    try { server.close(); } catch {}
  }
}

run().catch((e) => { console.error(e); try { server.close(); } catch {} });
