# Eşleşme ve Oyun Akış Algoritması (Tiklenebilir Checklist)

## Sunucu Tarafı

- Eşleşme oluştuğunda
  - [x] matchId üret.
  - [x] RoomManager’a { roomId, player1, player2 } kaydet.
  - [x] gameStates[matchId] yoksa oluştur (status='waiting', scores, currentTurn?, timestamps).

- join_match(matchId, roomId, userId) alındığında
  - [x] Kullanıcının bu match’e aitliğini doğrula; değilse match_error gönder.
  - [x] Socket’i matchId odasına al.
  - [x] userId → socket.id eşlemesini güncelle.
  - [x] gameStates[matchId] yoksa oluştur (scores, currentTurn, startedAt/lastMoveAt, status).
  - [x] Odada socket sayısı 2 ise iki tarafa game_ready yayınla; değilse sadece katılana waiting_opponent gönder.

- place_tiles(matchId, roomId, userId, move) alındığında
  - [x] Kullanıcının matche aitliğini ve sıranın onda olduğunu doğrula; değilse yok say veya match_error.
  - [x] (Opsiyonel) Hamleyi doğrula ve puanla (basit: move.meta.points).
  - [x] State’i güncelle (board/tiles, scores, moves, lastMoveAt).
  - [x] Odaya state_patch yayınla (payload: matchId, move, meta.ts).
  - [x] Sırayı diğer oyuncuya çevir.
  - [x] turn_changed(reason='normal') yayınla.

- pass_turn(matchId, roomId, userId) alındığında
  - [x] Kullanıcı ve sıra doğrulaması yap.
  - [x] Sırayı değiştir.
  - [x] turn_changed(reason='pass') yayınla.

- leave_match veya disconnect olduğunda
  - [x] Oda içindeki rakibe opponent_left yayınla.
  - [x] (Opsiyonel) Tek taraf ayrıldıysa N saniye reconnection bekle (gracePeriod: 15s).
  - [x] Süre içinde dönmezse game_over(reason='opponent_disconnected') yayınla.
  - [x] Maç bitti/iptal ise gameStates’ten temizle (temizlik).

- Oyun bitişi
  - [x] Bitirme kriterini denetle (süre/timeout: aynı oyuncu 2 kez süre aşarsa rakip kazanır).
  - [x] game_over(payload) yayınla.
  - [x] State’i temizle veya kalıcı depoya yaz.

## İstemci Tarafı

- Eşleşme alındığında (matched)
  - [x] socket.emit('join_match', { matchId, roomId, userId }) gönder.
  - [x] Game ekranına matchId ile yönlen.

- Game ekranında olaylar
  - [x] game_ready: rakip bilgisi, başlangıç sırası ve ilk state’i UI’a uygula. (MultiplayerRoom)
  - [x] state_patch: puan ve hamle güncelle (basit UI). (MultiplayerRoom)
  - [x] turn_changed: aktif oyuncuyu değiştir, UI’da göster. (MultiplayerRoom)
  - [x] opponent_left: bekleme mesajı göster. (MultiplayerRoom)
  - [x] game_over: sonucu göster, çıkış akışını hazırla. (MultiplayerRoom)

- Hamle gönderimi
  - [x] Kullanıcı hamlesini move nesnesine çevir. (MultiplayerRoom demo hamlesi)
  - [x] place_tiles ile sunucuya gönder; state_patch ile kesinleştir. (ghost UI basit tutularak atlandı)

- Pas/terk
  - [x] pass_turn veya leave_match yayınla.
  - [x] UI durumunu uygun şekilde güncelle. (bilgi mesajları ve durum etiketleri)

- Reconnection
  - [x] Yeniden bağlanınca join_match’i tekrar gönder. (MultiplayerRoom + Socket reconnect)
  - [x] (Opsiyonel) Sunucudan full_state iste; UI’ı senkronla.

## Socket.IO Olay Sözleşmesi (Payload Özeti)

- Client ← Server
  - game_ready
    - matchId: string
    - roomId: string
    - players: { player1: userId, player2: userId }
    - state: { id, roomId, scores: { [userId]: number }, currentTurn, startedAt }
  - state_patch
    - matchId: string
    - move: { type: 'place_tiles', tiles: [...], meta: { ts: iso, points } }
    - boardDiff: Array<{ row, col, letter, isBlank, blankAs }>
    - scores: { [userId]: number }
    - tileBagRemaining?: number
  - turn_changed
    - matchId: string
    - currentTurn: userId
    - reason: 'normal' | 'pass' | 'timeout' (opsiyonel)
  - opponent_left
    - matchId: string
    - userId: opponentId
  - game_over
    - matchId: string
    - winner: userId | null
    - reason: 'score' | 'timeout' | 'resign' | 'opponent_disconnected' | 'exhausted'
    - finalState: { ...özet }
  - match_error
    - message: string
    - code: 'UNAUTHORIZED' | 'INVALID_STATE' | ...
  - (Opsiyonel) waiting_opponent
    - matchId: string
    - roomId: string
  - (Opsiyonel) full_state
    - id, roomId, players, scores, currentTurn, moves, startedAt, lastMoveAt, status
    - board: Cell[15][15]
    - rack: { me: string[], opponentCount: number }
    - tileBagRemaining?: number

- Client → Server
  - join_match: { matchId: string, roomId: string, userId: string }
  - place_tiles: { matchId: string, roomId: string, userId: string, move: {...} }
  - pass_turn: { matchId: string, roomId: string, userId: string }
  - leave_match: { matchId: string, roomId: string, userId: string }
  - (Opsiyonel) request_full_state: { matchId: string }

## Oyun Durumu Veri Modeli (Sunucu)

- gameStates: Map<matchId, GameState>
- GameState alanları
  - [x] id: matchId
  - [x] roomId
  - [x] players: { player1, player2 }
  - [x] scores: { [userId]: number }
  - [x] currentTurn: userId
  - [x] moves: [] (opsiyonel; son N hamle)
  - [x] startedAt, lastMoveAt
  - [x] status: 'waiting' | 'playing' | 'finished'
  - [x] (Opsiyonel) board/tiles/rack gibi oyun-özel alanlar

## Kurallar ve Kenar Durumları

- [x] Yetkilendirme: Her olayda userId’nin matche aitliği doğrulanmalı.
- [x] Sıra kontrolü: place_tiles/pass_turn yalnızca currentTurn oyuncusundan kabul edilmeli.
 - [x] İdempotensi: moveId kullan; aynı move’un iki kez işlenmesini engelle. (server/gameStateManager)
 - [x] Zaman aşımı: Hamle süresi dolunca turn_changed(reason='timeout'); tekrarında game_over. (server/socketHandlers)
 - [x] Yeniden bağlanma: Disconnect’te gracePeriod (15s); dönmeyene game_over. (server/socketHandlers)
- [x] Senkronizasyon: Patch kaçırılırsa client request_full_state; sunucu full_state ile yanıtlar.
- [x] Temizlik: game_over veya uzun süre inactive match’leri Map’ten kaldır.

## Test Kontrol Listesi

- [ ] 2 client aynı matchId ile join_match → her iki tarafta game_ready.
- [ ] Sırada olmayan oyuncu place_tiles → reddedilir (match_error veya sessizce yok sayılır).
- [ ] Sırada olan oyuncu place_tiles → her iki tarafta state_patch ve turn_changed.
- [ ] pass_turn → turn_changed(reason='pass').
- [ ] Bir oyuncu leave_match → diğer tarafa opponent_left ve (opsiyonel) game_over.
- [ ] Disconnect ve reconnection → join_match sonrası state devam eder.
- [ ] Zaman aşımı (varsa) → doğru tarafa işlenir ve yayınlanır.

## Opsiyonel İyileştirmeler

 - [x] Hamle doğrulama ve puanlama sunucuda (otorite sunucu).
- [ ] moveId + sunucu ACK ile “en az bir kez” teslim garantisi.
- [ ] Kalıcılık (Redis/DB) ile crash sonrası oyunu sürdürme.
- [ ] Spekülatif UI: client hamleyi anında uygular; state_patch ile kesinler, uyuşmazlıkta rollback.