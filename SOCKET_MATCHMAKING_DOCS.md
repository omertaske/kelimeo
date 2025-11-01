# Room-Based Socket Matchmaking System

## 🎯 Overview

Socket.IO tabanlı, oda-seviyesinde rastgele eşleştirme sistemi. Her oda kendi içindeki aktif kullanıcıları bağımsız olarak eşleştirir.

## 🏗️ Architecture

### Server Side (`/server`)

#### 1. **server.js**
- Express + Socket.IO server
- Port 4000'de çalışır
- CORS configuration
- Health check endpoint: `GET /health`

#### 2. **roomManager.js**
- 10 oda yönetimi (room_1 - room_10)
- Her oda için state:
  ```javascript
  {
    activeUsers: Set<userId>,
    processing: boolean,
    matches: Map<matchId, {player1, player2}>,
    userSockets: Map<userId, socketId>
  }
  ```

#### 3. **matchingEngine.js**
- **ROOM-LEVEL MATCHING** - Atomic eşleştirme
- Fisher-Yates shuffle algoritması
- Debouncer (500ms) - Aynı anda gelen joinleri toplar
- Process flow:
  1. Lock room (processing = true)
  2. Shuffle active users
  3. Pair users (2-2)
  4. Handle odd user (tek kalan bekliyor)
  5. Emit "matched" events
  6. Unlock room

#### 4. **socketHandlers.js**
- Socket event handlers
- Events handled:
  - `enterRoom` - Odaya gir
  - `leaveRoom` - Odadan çık
  - `setActive` - Aktif/pasif durumu
  - `cancelMatchmaking` - Eşleştirmeyi iptal et
  - `acceptMatch` - Eşleşmeyi kabul et
  - `disconnect` - Bağlantı kopması

### Client Side (`/src`)

#### 1. **SocketContext.js**
- React Context for socket management
- Auto-connect on user login
- Auto-disconnect on logout
- Methods:
  - `enterRoom(roomId)`
  - `leaveRoom(roomId)`
  - `setActive(roomId, active)`
  - `cancelMatchmaking(roomId)`
  - `on(event, callback)`
  - `off(event, callback)`

#### 2. **roomMatchmakingService.js**
- Hook: `useRoomMatchmaking()`
- Functions:
  - `joinRoomAndMatch(roomId)` - Odaya gir ve eşleşmeyi başlat
  - `leaveRoomAndCancel(roomId)` - Odadan çık ve iptal et
  - `onMatchFound(callback)` - Eşleşme bulundu eventi
  - `onMatchCancelled(callback)` - Eşleşme iptal eventi
  - `onQueueStatus(callback)` - Kuyruk durumu eventi

## 🔄 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `enterRoom` | `{ roomId, userId }` | Odaya giriş yap |
| `leaveRoom` | `{ roomId, userId }` | Odadan çık |
| `setActive` | `{ roomId, userId, active }` | Aktif durumu ayarla |
| `cancelMatchmaking` | `{ roomId, userId }` | Eşleştirmeyi iptal et |
| `acceptMatch` | `{ roomId, matchId, userId }` | Eşleşmeyi kabul et |
| `getRoomStatus` | `{ roomId }` | Oda durumunu getir |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `matched` | `{ matchId, partnerId, roomId, role }` | Eşleşme bulundu! |
| `matchCancelled` | `{ matchId, reason, partnerId }` | Eşleşme iptal edildi |
| `queueStatus` | `{ roomId, waitingCount }` | Kuyruk durumu |
| `roomJoined` | `{ roomId, userId, activeCount }` | Odaya girildi |
| `roomLeft` | `{ roomId, userId }` | Odadan çıkıldı |
| `error` | `{ message }` | Hata oluştu |

## 🚀 Usage

### 1. Start Server
```bash
npm run server
```

Server runs on: http://localhost:4000

### 2. Start Client
```bash
npm start
```

Client runs on: http://localhost:3000

### 3. Development (Both)
```bash
npm run dev
```

### 4. Component Usage

```javascript
import { useRoomMatchmaking } from '../services/roomMatchmakingService';

function MyComponent() {
  const { 
    isConnected, 
    joinRoomAndMatch, 
    onMatchFound,
    leaveRoomAndCancel 
  } = useRoomMatchmaking();

  useEffect(() => {
    // Join room
    joinRoomAndMatch('room_1');

    // Listen for matches
    const cleanup = onMatchFound((data) => {
      console.log('Match found!', data);
      // Navigate to game or show match UI
    });

    return () => {
      cleanup();
      leaveRoomAndCancel('room_1');
    };
  }, []);

  return <div>...</div>;
}
```

## 🧪 Testing

### Unit Tests
```bash
node tests/matchmaking.test.js
```

Tests:
- ✅ Fisher-Yates shuffle correctness
- ✅ Pairing logic (5 users → 2 pairs + 1 odd)
- ✅ Pairing logic (10 users → 5 pairs)
- ✅ Concurrency prevention (processing flag)

### Manual Testing

1. **Single Room Test:**
   - Open 2 browsers
   - Login different users
   - Both join same room (e.g., room_1)
   - Should match instantly

2. **Odd User Test:**
   - Open 3 browsers
   - All join same room
   - 2 should match, 1 should wait

3. **Disconnect Test:**
   - 2 users match
   - 1 user disconnects before accepting
   - Partner should get `matchCancelled` event

4. **Multiple Rooms Test:**
   - Users in room_1 only match with room_1 users
   - Users in room_2 only match with room_2 users

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T...",
  "totalRooms": 10,
  "rooms": {
    "room_1": {
      "activeUsers": 2,
      "activeMatches": 1,
      "processing": false,
      "lastMatchAttempt": 1698765432100
    },
    ...
  }
}
```

### Server Logs

Matching logs format:
```
🎯 ROOM_MATCH attempting for room_1...
🔒 room_1 locked for matching
👥 room_1 has 4 active users
🎲 Shuffled users: user3, user1, user4, user2
✅ Created 2 pairs
🎮 ROOM_MATCH room_1 uuid-123 users[user3, user1]
🎮 ROOM_MATCH room_1 uuid-456 users[user4, user2]
✉️  Sent "matched" to user3 (partner: user1)
✉️  Sent "matched" to user1 (partner: user3)
🔓 room_1 unlocked
```

## 🔒 Concurrency Safety

- **Per-room mutex**: `processing` flag prevents race conditions
- **Atomic operations**: Lock → Match → Unlock
- **Debouncing**: 500ms delay batches rapid joins
- **No duplicate matches**: UUID for each match
- **Cleanup on disconnect**: Auto-remove from all rooms

## 🎮 Edge Cases Handled

1. ✅ **Odd user** - Tek kalan kullanıcı bekliyor
2. ✅ **Partner leaves** - Eşleşme iptal, kullanıcı kuyruğa dönüyor
3. ✅ **Disconnect** - Tüm matchler iptal, odalardan temizleniyor
4. ✅ **Reconnect** - Yeni socket ID ile yeniden bağlanıyor
5. ✅ **Concurrent joins** - Debouncer sayesinde toplu eşleştirme
6. ✅ **Room isolation** - Odalar birbirini etkilemiyor

## 📝 Migration from MockAPI

Old code:
```javascript
const { game } = await findOrCreateGame({ userId, boardId });
```

New code:
```javascript
const { joinRoomAndMatch, onMatchFound } = useRoomMatchmaking();

await joinRoomAndMatch(boardId); // e.g., 'room_1'

onMatchFound((data) => {
  // data = { matchId, partnerId, roomId, role }
});
```

## 🐛 Debugging

Enable detailed logs:
```javascript
// Client
localStorage.debug = 'socket.io-client:*';

// Server
DEBUG=* node server/server.js
```

## 🔐 Security Notes

- CORS configured for localhost:3000
- Socket authentication via userId
- No sensitive data in socket payloads
- Rate limiting recommended for production

## 📦 Dependencies

Server:
- `express` - HTTP server
- `socket.io` - WebSocket server
- `cors` - CORS middleware
- `uuid` - Match ID generation

Client:
- `socket.io-client` - WebSocket client
- `react` - UI framework

## 🎯 Future Improvements

- [ ] Redis for multi-server scaling
- [ ] ELO-based matchmaking
- [ ] Match confirmation timeout
- [ ] Room capacity limits
- [ ] Skill-based pairing
- [ ] Statistics & analytics
- [ ] Admin dashboard
