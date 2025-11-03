/*
 E2E reconnect and full_state sync
 Run with: node tests/e2e_reconnect.js
*/

const { io: Client } = require('socket.io-client');
const { server } = require('../server/server');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('🔧 Starting E2E reconnect...');
  const URL = 'http://localhost:4000';

  const c1 = new Client(URL, { transports: ['websocket'] });
  const c2 = new Client(URL, { transports: ['websocket'] });

  const roomId = 'room_1';
  const u1 = 'e2e_user_R1';
  const u2 = 'e2e_user_R2';

  let matchId;
  let gotFullStateAfterReconnect = false;

  c1.on('matched', (m) => { matchId = m.matchId; });

  c1.emit('enterRoom', { roomId, userId: u1 });
  c2.emit('enterRoom', { roomId, userId: u2 });
  await wait(1200);
  if (!matchId) throw new Error('No match created');

  c1.emit('join_match', { matchId, roomId, userId: u1 });
  c2.emit('join_match', { matchId, roomId, userId: u2 });
  await wait(300);

  // Disconnect and reconnect c1
  c1.disconnect();
  await wait(300);
  const c1b = new Client(URL, { transports: ['websocket'] });
  // Listen for full_state on the reconnected client
  c1b.on('full_state', (s) => {
    if (s && s.id === matchId) {
      console.log('c1b full_state after reconnect');
      gotFullStateAfterReconnect = true;
    }
  });
  c1b.emit('join_match', { matchId, roomId, userId: u1 });
  c1b.emit('request_full_state', { matchId });
  await wait(500);

  if (!gotFullStateAfterReconnect) throw new Error('Expected full_state after reconnect');

  console.log('✅ E2E reconnect complete');
  cleanup();

  function cleanup() {
    try { c1b.disconnect(); } catch {}
    try { c2.disconnect(); } catch {}
    try { server.close(); } catch {}
  }
}
// Wrapper with explicit exit codes
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
