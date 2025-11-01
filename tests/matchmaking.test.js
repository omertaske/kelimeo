const { shuffle } = require('../server/matchingEngine');

/**
 * Test utilities for room-based matchmaking system
 */

/**
 * Test shuffle function
 */
function testShuffle() {
  console.log('\n🧪 Testing Fisher-Yates Shuffle...\n');
  
  const original = [1, 2, 3, 4, 5];
  const shuffled = shuffle(original);
  
  console.log('Original:', original);
  console.log('Shuffled:', shuffled);
  
  // Verify all elements still exist
  const allPresent = original.every(item => shuffled.includes(item));
  console.log('All elements present:', allPresent ? '✅' : '❌');
  
  // Verify length unchanged
  console.log('Length unchanged:', original.length === shuffled.length ? '✅' : '❌');
  
  // Test with 10 users
  const users = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'];
  const shuffledUsers = shuffle(users);
  
  console.log('\n10 Users shuffled:');
  console.log('Original:', users.join(', '));
  console.log('Shuffled:', shuffledUsers.join(', '));
}

/**
 * Test pairing logic
 */
function testPairing() {
  console.log('\n🧪 Testing Pairing Logic...\n');
  
  // Test with 5 users (should create 2 pairs + 1 odd)
  const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
  const shuffled = shuffle(users);
  
  const pairs = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  
  const oddUser = shuffled.length % 2 !== 0 ? shuffled[shuffled.length - 1] : null;
  
  console.log('5 Users:', users.join(', '));
  console.log('Pairs created:', pairs.length, '(expected: 2)');
  pairs.forEach((pair, i) => {
    console.log(`  Pair ${i + 1}:`, pair.join(' vs '));
  });
  console.log('Odd user:', oddUser || 'none', '(expected: 1 user)');
  
  console.log('\nResults:', pairs.length === 2 && oddUser ? '✅' : '❌');
  
  // Test with 10 users (should create 5 pairs)
  const users10 = Array.from({ length: 10 }, (_, i) => `user${i + 1}`);
  const shuffled10 = shuffle(users10);
  
  const pairs10 = [];
  for (let i = 0; i + 1 < shuffled10.length; i += 2) {
    pairs10.push([shuffled10[i], shuffled10[i + 1]]);
  }
  
  const oddUser10 = shuffled10.length % 2 !== 0 ? shuffled10[shuffled10.length - 1] : null;
  
  console.log('\n10 Users test:');
  console.log('Pairs created:', pairs10.length, '(expected: 5)');
  console.log('Odd user:', oddUser10 || 'none', '(expected: none)');
  console.log('Results:', pairs10.length === 5 && !oddUser10 ? '✅' : '❌');
}

/**
 * Test concurrent matching prevention
 */
async function testConcurrency() {
  console.log('\n🧪 Testing Concurrency Prevention...\n');
  
  const { RoomManager } = require('../server/roomManager');
  const { matchRoom } = require('../server/matchingEngine');
  
  const roomManager = new RoomManager();
  const mockIo = {
    to: () => ({
      emit: (event, data) => {
        console.log(`[MOCK] Emitting ${event}:`, data);
      }
    })
  };
  
  const roomId = 'room_1';
  
  // Add 4 users
  for (let i = 1; i <= 4; i++) {
    roomManager.addUserToRoom(roomId, `user${i}`, `socket${i}`);
  }
  
  console.log('Added 4 users to room_1');
  console.log('Active users:', roomManager.getActiveUserCount(roomId));
  
  // Try to match twice simultaneously
  console.log('\nAttempting concurrent matches...');
  
  const match1Promise = matchRoom(roomId, roomManager, mockIo);
  const match2Promise = matchRoom(roomId, roomManager, mockIo);
  
  const [result1, result2] = await Promise.all([match1Promise, match2Promise]);
  
  console.log('\nMatch 1 result:', result1);
  console.log('Match 2 result:', result2);
  
  // One should succeed, one should fail with 'already_processing'
  const oneSucceeded = (result1.success && !result2.success) || (!result1.success && result2.success);
  const oneBlockedByProcessing = result1.reason === 'already_processing' || result2.reason === 'already_processing';
  
  console.log('\nConcurrency test:', oneSucceeded && oneBlockedByProcessing ? '✅' : '❌');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   🧪 MATCHMAKING UNIT TESTS           ║');
  console.log('╚═══════════════════════════════════════╝');
  
  testShuffle();
  testPairing();
  await testConcurrency();
  
  console.log('\n✅ All tests completed!\n');
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testShuffle,
  testPairing,
  testConcurrency,
  runAllTests
};
