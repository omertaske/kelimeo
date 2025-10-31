# Kelimeo Scrabble - Proje Yapısı

Bu proje, modüler ve ölçeklenebilir bir şekilde organize edilmiştir.

## 📁 Klasör Yapısı

```
src/
├── components/           # React componentleri
│   ├── auth/            # Giriş/kayıt ile ilgili componentler
│   │   ├── AuthContainer.js      # Ana auth container
│   │   ├── LoginForm.js          # Giriş formu
│   │   ├── RegisterForm.js       # Kayıt formu
│   │   ├── DemoButton.js         # Demo giriş butonu
│   │   ├── AuthTabs.js           # Giriş/Kayıt sekmeleri
│   │   └── FloatingLetters.js    # Animasyonlu harfler
│   │
│   ├── lobby/           # Oyun lobisi componentleri
│   │   ├── GameLobbyContainer.js # Ana lobby container
│   │   ├── Leaderboard.js        # Lider tablosu
│   │   ├── LeaderboardItem.js    # Lider tablosu öğesi
│   │   ├── OnlineUsers.js        # Çevrimiçi kullanıcılar listesi
│   │   ├── OnlineUser.js         # Tek kullanıcı kartı
│   │   ├── UserProfile.js        # Kullanıcı profil kartı
│   │   ├── MatchmakingButtons.js # Maç bulma butonları
│   │   └── WaitingMatch.js       # Maç bekleme ekranı
│   │
│   ├── gameRoom/        # Oyun odası componentleri
│   │   ├── board/
│   │   │   ├── GameBoard.js      # Oyun tahtası
│   │   │   └── BoardCell.js      # Tahta hücresi
│   │   ├── rack/
│   │   │   ├── LetterRack.js     # Harf rafı
│   │   │   └── LetterTile.js     # Harf taşı
│   │   ├── controls/
│   │   │   └── GameControls.js   # Oyun kontrolleri
│   │   ├── header/
│   │   │   └── GameHeader.js     # Oyun başlığı
│   │   └── ui/
│   │       ├── MessageBar.js     # Mesaj çubuğu
│   │       ├── DraggingLetter.js # Sürüklenen harf
│   │       └── FullscreenToggle.js # Tam ekran butonu
│   │
│   ├── game/            # Eski oyun componentleri (legacy)
│   └── layout/          # Layout componentleri
│
├── constants/           # Sabit değerler
│   ├── letterConstants.js    # Harf puanları ve dağılımı
│   ├── boardConstants.js     # Tahta tipleri ve premium kareler
│   ├── gameStateConstants.js # Oyun durumları
│   ├── scoreConstants.js     # Skor sabitleri
│   └── index.js              # Tüm constants'ları export eder
│
├── utils/               # Yardımcı fonksiyonlar
│   ├── game/           # Oyun mantığı utilities
│   │   ├── scoreUtils.js        # Skor hesaplama
│   │   ├── validationUtils.js   # Kelime doğrulama
│   │   ├── boardUtils.js        # Tahta işlemleri
│   │   ├── letterUtils.js       # Harf yönetimi
│   │   ├── botUtils.js          # Bot AI
│   │   └── index.js
│   └── validation/     # Form validasyonları
│       └── authValidation.js    # Giriş/kayıt validasyonu
│
├── services/            # API ve servis katmanı
│   ├── tdkService.js           # TDK Sözlük API
│   ├── storageService.js       # LocalStorage yönetimi
│   └── index.js
│
├── helpers/             # Genel yardımcı fonksiyonlar
│   ├── rankHelpers.js          # Rank/seviye hesaplama
│   ├── timeHelpers.js          # Zaman formatlama
│   ├── stringHelpers.js        # String işlemleri
│   └── index.js
│
├── hooks/               # Custom React hooks
│   ├── useDragAndDrop.js       # Sürükle-bırak mantığı
│   ├── useGameTimer.js         # Oyun zamanlayıcısı
│   ├── useTilePlacement.js     # Taş yerleştirme
│   ├── useGameMessages.js      # Mesaj gösterimi
│   └── index.js
│
├── context/             # React Context API
│   ├── AuthContext.js          # Kimlik doğrulama state
│   ├── GameContext.js          # Oyun state
│   ├── gameConstants.js        # (Legacy - constants'a yönlendirir)
│   ├── gameUtils.js            # (Legacy - utils/game'e yönlendirir)
│   └── index.js
│
├── store/               # Redux store (opsiyonel)
│   ├── userSlice.js            # Kullanıcı state
│   └── index.js
│
└── models/              # Veri modelleri
    └── userModel.js

```

## 🎯 Tasarım Prensipleri

### 1. **Tek Sorumluluk İlkesi (Single Responsibility)**
Her dosya ve component tek bir işlevden sorumludur:
- `scoreUtils.js` → Sadece skor hesaplama
- `validationUtils.js` → Sadece doğrulama
- `BoardCell.js` → Sadece tek bir tahta hücresi
- `LetterTile.js` → Sadece tek bir harf taşı

### 2. **Modülerlik**
İlgili fonksiyonlar kendi klasörlerinde gruplanmıştır:
- `utils/game/` → Oyun mantığı
- `components/gameRoom/` → Oyun odası UI
- `services/` → API ve veri servisleri

### 3. **Yeniden Kullanılabilirlik**
Her component ve utility bağımsız ve yeniden kullanılabilir:
- `LetterTile` hem rafta hem tahtada kullanılabilir
- `calculateScore` farklı senaryolarda kullanılabilir
- Custom hooks birden fazla component'te kullanılabilir

### 4. **Okunabilirlik**
- Açıklayıcı dosya ve fonksiyon isimleri
- Her klasörde `index.js` ile kolay import
- JSDoc yorumları ile dokümantasyon

## 📦 Import Örnekleri

```javascript
// Constants
import { LETTER_SCORES, BOARD_TYPES, GAME_STATES } from '../constants';

// Utils
import { calculateScore, validateWord } from '../utils/game';
import { validateEmail } from '../utils/validation/authValidation';

// Services
import { getWordMeaning } from '../services';

// Helpers
import { getRankIcon, formatTime } from '../helpers';

// Hooks
import { useDragAndDrop, useGameTimer } from '../hooks';

// Components
import { LoginForm, RegisterForm } from './auth';
import { GameBoard, LetterRack } from './gameRoom';
```

## 🔄 Geriye Dönük Uyumluluk

Eski kodların çalışmaya devam etmesi için:
- `context/gameConstants.js` → `constants/` klasörüne yönlendirir
- `context/gameUtils.js` → `utils/game/` klasörüne yönlendirir

## ✅ Avantajlar

1. **Kolay Bakım**: Bir özelliği bulmak ve düzenlemek kolay
2. **Test Edilebilir**: Her modül ayrı ayrı test edilebilir
3. **Ölçeklenebilir**: Yeni özellikler eklemek kolay
4. **Organize**: Kod tabanında gezinmek basit
5. **İşbirliği**: Ekip üyeleri farklı modüllerde çalışabilir

## 🚀 Kullanım

Her klasörde `index.js` dosyası bulunur, bu sayede import'lar kısa ve temiz olur:

```javascript
// ❌ Kötü
import { calculateScore } from '../utils/game/scoreUtils';
import { validateWord } from '../utils/game/validationUtils';

// ✅ İyi
import { calculateScore, validateWord } from '../utils/game';
```
