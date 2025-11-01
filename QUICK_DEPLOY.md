# 🚀 Quick Start Guide

## Vercel Deployment için Yapman Gerekenler:

### ✅ Vercel (Frontend - Zaten Var)
1. Vercel dashboard → kelimeo projesi → Settings → Environment Variables
2. Ekle:
   ```
   Key: REACT_APP_SOCKET_URL
   Value: (Aşağıdaki Render URL'ini buraya yazacaksın)
   ```

### ✅ Render.com (Backend - Socket Server için YENİ)

1. **https://render.com** → Sign up (GitHub ile)

2. **New → Web Service**

3. **Connect GitHub repo:** `kelimeo` seç

4. **Settings:**
   ```
   Name: kelimeo-socket
   Region: Frankfurt
   Branch: main (ya da gh-pages)
   Root Directory: ./
   Runtime: Node
   Build Command: npm install
   Start Command: node server/server.js
   Instance Type: Free
   ```

5. **Environment Variables (Render'da):**
   ```
   PORT = 4000
   NODE_ENV = production
   ```

6. **Create Web Service** → Deploy başlayacak

7. **Deploy bitince URL'i kopyala** (örn: `https://kelimeo-socket.onrender.com`)

8. **Bu URL'i Vercel'e geri dön:**
   - Vercel → Environment Variables → `REACT_APP_SOCKET_URL`
   - Value: `https://kelimeo-socket.onrender.com`

9. **Vercel'de Redeploy:** Settings → Deployments → Latest → Redeploy

### ✅ Test Et:

1. **Backend health check:**
   ```
   https://kelimeo-socket.onrender.com/health
   ```
   → JSON response görmelisin

2. **Frontend aç:**
   ```
   https://kelimeo.vercel.app
   ```

3. **Console kontrol et (F12):**
   ```
   ✅ Socket connected: xyz123
   ```

## 🎯 ÖZET

**Vercel:** Sadece React frontend (ÜCRETSİZ)
**Render:** Socket.io backend server (ÜCRETSİZ)

Her ikisi de GitHub'dan otomatik deploy olur!

## ⚠️ ÖNEMLİ

- `.env.production` dosyasını **ASLA commit etme**
- Environment variables **sadece Vercel/Render dashboard'larında**
- Local'de test: `npm run dev` (hem frontend hem backend)
- Production'da: Otomatik deploy (push yapınca)
