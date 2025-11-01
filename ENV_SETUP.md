# 🔐 Environment Variables Setup

## Render.com (Backend Server)

### Environment Variables:

```
PORT = 4000
NODE_ENV = production
ALLOWED_ORIGINS = https://kelimeo.vercel.app,https://kelimeo-git-main-omertaskes-projects.vercel.app,https://kelimeo-git-gh-pages-omertaskes-projects.vercel.app
```

### Nasıl Eklenir:

1. Render Dashboard → Service seç
2. **Environment** tab → **Environment Variables**
3. Her satırı **Add Environment Variable** ile ekle:

   | Key | Value |
   |-----|-------|
   | `PORT` | `4000` |
   | `NODE_ENV` | `production` |
   | `ALLOWED_ORIGINS` | `https://kelimeo.vercel.app,https://kelimeo-git-main-omertaskes-projects.vercel.app` |

4. **Save Changes**
5. **Manual Deploy** → Deploy latest commit

---

## Vercel (Frontend)

### Environment Variables:

```
REACT_APP_SOCKET_URL = https://kelimeo-socket.onrender.com
```

### Nasıl Eklenir:

1. Vercel Dashboard → Project seç → **Settings**
2. **Environment Variables** tab
3. **Add New**:
   - **Key:** `REACT_APP_SOCKET_URL`
   - **Value:** `https://kelimeo-socket.onrender.com`
   - **Environments:** Production, Preview, Development (hepsi seçili)
4. **Save**
5. **Deployments** → Latest → **Redeploy**

---

## 🔍 Neden Gerekli?

### CORS (Cross-Origin Resource Sharing)
- **Frontend (Vercel)** `https://kelimeo.vercel.app` adresinden
- **Backend (Render)** `https://kelimeo-socket.onrender.com` adresine
- **WebSocket** bağlantısı kuruyor

→ **CORS** olmadan tarayıcı bunu **engellerdi**!

### Environment Variables
- **Hardcoded URL'ler** yerine **environment variable** kullanıyoruz
- **Güvenlik:** URL'leri kod içinde göstermiyoruz
- **Esneklik:** Farklı ortamlar için farklı URL'ler

---

## ✅ Doğrulama

### 1. Render Server Logları:
```
🔐 CORS Allowed Origins: [
  'http://localhost:3000',
  'https://kelimeo.vercel.app',
  ...
]
```

### 2. Health Check:
```bash
curl https://kelimeo-socket.onrender.com/health
```

Response:
```json
{
  "status": "healthy",
  "totalRooms": 10,
  ...
}
```

### 3. Frontend Console (F12):
```
✅ Socket connected: xyz123
```

Eğer CORS hatası olsaydı:
```
❌ Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

---

## 🎯 Özet

| Service | Variable | Value |
|---------|----------|-------|
| **Render** | `PORT` | `4000` |
| **Render** | `NODE_ENV` | `production` |
| **Render** | `ALLOWED_ORIGINS` | `https://kelimeo.vercel.app,...` |
| **Vercel** | `REACT_APP_SOCKET_URL` | `https://kelimeo-socket.onrender.com` |

**Sonuç:** Frontend ↔ Backend güvenli iletişim! 🔐
