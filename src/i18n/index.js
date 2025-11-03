const tr = {
  toast: {
    turnChanged: '🔁 Sıra değişti',
    turnTimeout: '⏰ Süre doldu, sıra değişti',
    pass: '⏭️ Pas verildi',
    notYourTurn: 'Sıra sende değil.',
    invalidMove: 'Geçersiz hamle.',
    invalidWord: 'Geçersiz kelime.',
    dictReject: 'Sözlükte bulunamadı.',
    matchNotFound: 'Eşleşme bulunamadı.',
    roomNotFound: 'Oda bulunamadı.',
    waitingOpponent: '⏳ Rakip bekleniyor...',
    opponentLeft: '👋 Rakip ayrıldı, bekleniyor...',
    gameOver: '🏁 Oyun bitti.',
    submitChecking: 'Kelime kontrol ediliyor...',
    submitSuccess: '✅ Harika!',
    submitError: '❌ Bir hata oluştu!',
    needWord: '❌ Geçerli bir kelime oluşturmalısınız!',
    needTwoLetters: '❌ En az 2 harfli kelime gerekli',
    selectBlank: '🃏 Joker için harf seçmelisiniz!',
    placed: ' harfi yerleştirildi',
    cannotOverwrite: '⚠️ Bu hücrede zaten onaylanmış bir harf var!',
    rackShuffled: '🔀 Harfler karıştırıldı!',
    cleared: '🗑️ Yerleştirilen harfler temizlendi!',
    fullscreenFail: '⚠️ Tam ekran açılamadı',
    ackOk: '✅ Hamle kabul edildi'
  },
  ui: {
    yourTurn: '🎯 Sizin sıranız',
    oppTurn: '👤 Rakip oynuyor',
    bag: '📦 Torbada:',
    notYourTurnOverlay: '👀 Rakip oynuyor'
  }
};

const dictionaries = { tr };

export const t = (path) => {
  const lang = (typeof navigator !== 'undefined' && navigator.language?.startsWith('tr')) ? 'tr' : 'tr';
  const dict = dictionaries[lang] || tr;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : path), dict);
};

export default t;
