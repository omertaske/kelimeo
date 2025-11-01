# 🚀 Deployment Guide - Kelimeo

## ⚠️ Önemli: Vercel Sadece Frontend İçin!

Vercel **serverless** bir platform. Socket.io gibi **stateful** WebSocket serverleri çalıştıramaz. Bu yüzden:

- ✅ **Frontend (React)** → Vercel
- ✅ **Backend (Socket.io Server)** → Render / Railway / Heroku

---

## 📦 1. Backend Deployment (Socket.io Server)

### Seçenek A: Render.com (ÖNERİLEN - ÜCRETSİZ)

1. **Render.com'a Git:** https://render.com
2. **New → Web Service** seç
3. **GitHub repo'nu bağla**
4. **Ayarlar:**
   ```
   Name: kelimeo-socket-server
   Region: Frankfurt (Europe)
   Branch: main
   Root Directory: ./
   Runtime: Node
   Build Command: npm install
   Start Command: node server/server.js
   ```

5. **Environment Variables:**
   ```
   PORT=4000
   NODE_ENV=production
   ```

6. **Deploy** butonuna bas

7. **Server URL'ini kopyala** (örn: `https://kelimeo-socket-server.onrender.com`)

### Seçenek B: Railway.app

1. **Railway.app'e Git:** https://railway.app
2. **New Project → Deploy from GitHub**
3. **Settings:**
   ```
   Start Command: node server/server.js
   ```
4. **Environment Variables:**
   ```
   PORT=4000
   ```
5. **Deploy**

### Seçenek C: Heroku

```bash
# Heroku CLI ile
heroku create kelimeo-socket-server
git push heroku main
heroku config:set NODE_ENV=production
```

---

## 🎨 2. Frontend Deployment (Vercel)

### Adım 1: Environment Variable Ayarla

Vercel Dashboard'da:
```
Settings → Environment Variables → Add

Key: REACT_APP_SOCKET_URL
Value: https://kelimeo-socket-server.onrender.com
```

### Adım 2: Build Settings

Vercel otomatik algılar ama kontrol et:
```
Framework Preset: Create React App
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

### Adım 3: Deploy

```bash
# Manuel deploy
vercel --prod

# Ya da GitHub'dan otomatik
# (Her push'da otomatik deploy olur)
```

---

## 🔧 3. Local Development Setup

### Terminal 1: Backend
```bash
npm run server
```

### Terminal 2: Frontend
```bash
npm start
```

### Ya da Her İkisi Birden (Geliştirme İçin)
```bash
npm run dev
```

---

## 🌐 4. Production URL'leri Güncelle

### Backend (server/server.js)

```javascript
// CORS ayarını güncelle
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',           // Local
      'https://kelimeo.vercel.app'       // Production
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### Frontend (.env.production)

Yeni dosya oluştur: `.env.production`
```
REACT_APP_SOCKET_URL=https://kelimeo-socket-server.onrender.com
```

Local için: `.env.development`
```
REACT_APP_SOCKET_URL=http://localhost:4000
```

---

## ✅ 5. Deployment Checklist

### Backend (Render/Railway)
- [ ] Server deploy edildi
- [ ] Server URL'i alındı (örn: https://xxx.onrender.com)
- [ ] Health check çalışıyor: `curl https://xxx.onrender.com/health`
- [ ] CORS ayarlarına Vercel domain eklendi

### Frontend (Vercel)
- [ ] `REACT_APP_SOCKET_URL` environment variable eklendi
- [ ] `vercel.json` oluşturuldu
- [ ] Build başarılı
- [ ] Deploy başarılı
- [ ] https://kelimeo.vercel.app açılıyor

### Test
- [ ] Frontend açılıyor
- [ ] Socket bağlantısı kuruldu (DevTools Console'da kontrol et)
- [ ] Matchmaking çalışıyor
- [ ] İki farklı cihazdan test edildi

---

## 🐛 Troubleshooting

### "Socket connection failed"

**Sebep:** Backend server çalışmıyor veya CORS hatası

**Çözüm:**
1. Backend health check: `curl https://your-server.onrender.com/health`
2. CORS ayarlarını kontrol et
3. Environment variable doğru mu?

### "404 on page refresh"

**Sebep:** React Router client-side routing

**Çözüm:** `vercel.json` dosyasında rewrites zaten var ✅

### "Build failed on Vercel"

**Sebep:** `npm run dev` kullanılmaya çalışılıyor

**Çözüm:** Build command `npm run build` olmalı ✅

---

## 📊 Monitoring

### Backend Health Check
```bash
curl https://your-server.onrender.com/health
```

Response:
```json
{
  "status": "healthy",
  "totalRooms": 10,
  "rooms": {...}
}
```

### Frontend Console
```javascript
// Chrome DevTools Console'da
localStorage.debug = 'socket.io-client:*';
```

---

## 💰 Maliyet

| Service | Plan | Fiyat | Limit |
|---------|------|-------|-------|
| Vercel | Hobby | **ÜCRETSİZ** | 100GB bandwidth/ay |
| Render | Free | **ÜCRETSİZ** | 750 saat/ay |
| Railway | Free | **ÜCRETSİZ** | $5 credit/ay |

**Toplam:** 🎉 **TAMAMEN ÜCRETSİZ**

---

## 🔐 Security (Production)

1. **CORS:** Sadece kendi domain'ine izin ver
2. **Rate Limiting:** Aşırı istek önle
3. **Environment Variables:** Secrets'ı .env'de sakla, commit etme
4. **HTTPS:** Her iki tarafta da HTTPS kullan (otomatik)

---

## 📝 Notlar

- **Render Free Tier:** 15 dakika aktivite yoksa sleep mode'a girer (ilk istek 30-60 saniye gecikebilir)
- **Railway:** Daha hızlı ama monthly limit var
- **Heroku:** Artık ücretsiz plan yok ❌

**Öneri:** Render kullan, ücretsiz ve yeterli! 🚀
