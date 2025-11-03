/*
 E2E idempotency: same moveId sent twice should not double-apply
 Run with: node tests/e2e_idempotency.js
*/

const { io: Client } = require('socket.io-client');
const { server } = require('../server/server');
const { v4: uuidv4 } = require('uuid');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('🔧 Starting E2E idempotency...');
  const URL = 'http://localhost:4000';

  const c1 = new Client(URL, { transports: ['websocket'] });
  const c2 = new Client(URL, { transports: ['websocket'] });

  const roomId = 'room_1';
  const u1 = 'e2e_user_I1';
  const u2 = 'e2e_user_I2';

  let matchId;
  let currentTurn;
  let duplicateObserved = false;
  let turnChangedCount = 0;

  c1.on('matched', (m) => { matchId = m.matchId; });
  c1.on('game_ready', (p) => { currentTurn = p.state?.currentTurn || p.currentTurn; });
  c2.on('game_ready', (p) => { currentTurn = p.state?.currentTurn || p.currentTurn; });

  // Count patches and observe duplicate meta
  const onPatch = (payload) => {
    if (payload?.move?.meta?.duplicate) duplicateObserved = true;
  };
  c1.on('state_patch', onPatch);
  c2.on('state_patch', onPatch);
  c1.on('turn_changed', () => { turnChangedCount += 1; });

  c1.emit('enterRoom', { roomId, userId: u1 });
  c2.emit('enterRoom', { roomId, userId: u2 });
  await wait(1200);
  if (!matchId) throw new Error('No match created');

  c1.emit('join_match', { matchId, roomId, userId: u1 });
  c2.emit('join_match', { matchId, roomId, userId: u2 });
  await wait(300);

  const actor = currentTurn; // who has the turn
  const actorClient = actor === u1 ? c1 : c2;
  const moveId = uuidv4();
  const move = { type: 'place_tiles', tiles: [{ row: 7, col: 7, letter: 'B' }], meta: { words: ['BA'], moveId } };

  // Send the same move twice with a tiny delay to ensure first is processed
  actorClient.emit('place_tiles', { matchId, roomId, userId: actor, move });
  await wait(100);
  actorClient.emit('place_tiles', { matchId, roomId, userId: actor, move });
  await wait(800);

  if (turnChangedCount !== 1) throw new Error(`Expected exactly 1 turn_changed, got ${turnChangedCount}`);

  console.log('✅ E2E idempotency complete');
  try { c1.disconnect(); } catch {}
  try { c2.disconnect(); } catch {}
  try { server.close(); } catch {}
}

(async () => {
  try {
    await run();
    process.exit(0);
  } catch (e) {
    console.error(e);
    try { server.close(); } catch {}
    process.exit(1);
  }
})();
