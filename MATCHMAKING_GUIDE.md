# Matchmaking Sistemi Kurulum Rehberi

## MockAPI Kurulumu

1. **MockAPI'ye Git:** https://mockapi.io
2. **Projects → Kelimeo projesini aç**
3. **Yeni Resource Oluştur:**
   - Resource name: `games`
   - Schema:
     ```json
     {
       "id": "string",
       "player1Id": "string",
       "player2Id": "string (nullable)",
       "boardId": "string",
       "status": "string",
       "player1Ready": "boolean",
       "player2Ready": "boolean",
       "countdownStartedAt": "string (nullable)",
       "currentTurn": "string",
       "gameBoard": "array",
       "scores": "object",
       "player1PassCount": "number",
       "player2PassCount": "number",
       "moveHistory": "array",
       "gameTimer": "number",
       "turnTimer": "number",
       "tileBag": "object (nullable)",
       "createdAt": "string",
       "startedAt": "string (nullable)",
       "lastMoveAt": "string",
       "endedAt": "string (nullable)",
       "winner": "string (nullable)",
       "endReason": "string (nullable)",
       "version": "number"
     }
     ```

## Nasıl Çalışır?

### 1. İlk Kullanıcı (Oyuncu 1):
```
"Rakip Bul" → findOrCreateGame çağrılır
  ↓
API'de bekleyen oyun var mı? → YOK
  ↓
Yeni oyun oluştur (player1Id set, player2Id = null, status = 'waiting')
  ↓
Polling başlar, rakip bekler
```

### 2. İkinci Kullanıcı (Oyuncu 2):
```
"Rakip Bul" → findOrCreateGame çağrılır
  ↓
API'de bekleyen oyun var mı? → VAR!
  ↓
Bekleyen oyuna katıl (player2Id set edilir)
  ↓
İkisi de hazır olma ekranına geçer
```

### 3. Her İki Oyuncu Hazır Olunca:
```
Player 1 → "HAZIR" butonuna basar
Player 2 → "HAZIR" butonuna basar
  ↓
5 saniyelik countdown
  ↓
Oyun başlar (status = 'active')
```

## Test Senaryosu

### İki Tarayıcı ile Test:

1. **Chrome:**
   - Kullanıcı 1 ile giriş yap
   - "Rakip Bul" tıkla
   - "Rakip aranıyor..." mesajı görmeli

2. **Firefox:**
   - Kullanıcı 2 ile giriş yap
   - "Rakip Bul" tıkla
   - Otomatik Kullanıcı 1'in oyununa katılmalı

3. **Her İki Tarayıcıda:**
   - Hazır olma ekranı görünmeli
   - "HAZIR" butonuna bas
   - 5 saniyelik countdown
   - Oyun başlamalı!

## Sorun Giderme

### Eşleşme Olmuyor:
- MockAPI'de `/games` endpoint'i var mı kontrol et
- Browser console'da "Bekleyen oyun" loglarını kontrol et
- Network sekmesinde GET `/games` isteklerini izle

### Oyun Oluşturulmuyor:
- MockAPI quota'nız dolmuş olabilir
- API_BASE_URL doğru mu kontrol et
- CORS hatası var mı kontrol et

### Ready Sistemi Çalışmıyor:
- Her iki tarayıcıda da aynı gameId var mı?
- Polling çalışıyor mu? (console'da log olmalı)
- player1Ready ve player2Ready true mu?
