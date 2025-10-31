/**
 * Rank (derece) yönetimi için yardımcı fonksiyonlar
 */

export const RANK_ICONS = {
  'Acemi': '🌱',
  'Çırak': '🛠️',
  'Stajyer Kelimeci': '📖',
  'Kelime Kaşifi': '🧭',
  'Sözcük Avcısı': '🎯',
  'Dil Ustası': '📚',
  'Strateji Uzmanı': '♜',
  'Söz Bilgesi': '💎',
  'Şampiyon Kelimeci': '🏆',
  'Usta': '👑'
};

export const RANK_COLORS = {
  'Acemi': '#7f8c8d',
  'Çırak': '#3498db',
  'Stajyer Kelimeci': '#1abc9c',
  'Kelime Kaşifi': '#16a085',
  'Sözcük Avcısı': '#27ae60',
  'Dil Ustası': '#8e44ad',
  'Strateji Uzmanı': '#2980b9',
  'Söz Bilgesi': '#f1c40f',
  'Şampiyon Kelimeci': '#e67e22',
  'Usta': '#e74c3c'
};

export const RANK_THRESHOLDS = [
  { rank: 'Acemi', minScore: 0 },
  { rank: 'Çırak', minScore: 200 },
  { rank: 'Stajyer Kelimeci', minScore: 500 },
  { rank: 'Kelime Kaşifi', minScore: 1000 },
  { rank: 'Sözcük Avcısı', minScore: 2000 },
  { rank: 'Dil Ustası', minScore: 3500 },
  { rank: 'Strateji Uzmanı', minScore: 5000 },
  { rank: 'Söz Bilgesi', minScore: 7500 },
  { rank: 'Şampiyon Kelimeci', minScore: 10000 },
  { rank: 'Usta', minScore: 15000 }
];

/**
 * Rank ikonu al
 * @param {string} rank - Rank adı
 * @returns {string} - Rank ikonu
 */
export const getRankIcon = (rank) => {
  return RANK_ICONS[rank] || '🎯';
};

/**
 * Rank rengi al
 * @param {string} rank - Rank adı
 * @returns {string} - Rank rengi
 */
export const getRankColor = (rank) => {
  return RANK_COLORS[rank] || '#34495e';
};

/**
 * Toplam puana göre rank belirle
 * @param {number} totalScore - Toplam puan
 * @returns {string} - Rank adı
 */
export const calculateRank = (totalScore) => {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalScore >= RANK_THRESHOLDS[i].minScore) {
      return RANK_THRESHOLDS[i].rank;
    }
  }
  return 'Acemi';
};

/**
 * Bir sonraki rank için kalan puanı hesapla
 * @param {number} totalScore - Toplam puan
 * @returns {Object} - {nextRank, pointsNeeded}
 */
export const getNextRankInfo = (totalScore) => {
  const currentIndex = RANK_THRESHOLDS.findIndex((r, i) => {
    const nextThreshold = RANK_THRESHOLDS[i + 1];
    return !nextThreshold || totalScore < nextThreshold.minScore;
  });

  if (currentIndex === RANK_THRESHOLDS.length - 1) {
    return {
      nextRank: null,
      pointsNeeded: 0,
      isMaxRank: true
    };
  }

  const nextRank = RANK_THRESHOLDS[currentIndex + 1];
  return {
    nextRank: nextRank.rank,
    pointsNeeded: nextRank.minScore - totalScore,
    isMaxRank: false
  };
};
