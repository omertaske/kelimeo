// Premium kare tipleri
export const PREMIUM_SQUARES = {
  DOUBLE_LETTER: 'DL',
  TRIPLE_LETTER: 'TL',
  DOUBLE_WORD: 'DW',
  TRIPLE_WORD: 'TW'
};

// Yıldız Tahta premium kare konumları (tüm odalar için ortak)
export const PREMIUM_POSITIONS = {
  // Triple Word (kırmızı) - yıldız uçları
  'TW': [[0,0], [0,7], [0,14], [7,0], [7,14], [14,0], [14,7], [14,14]],
  // Double Word (pembe) - yıldız çapraz kolları
  'DW': [[1,1], [2,2], [3,3], [4,4], [10,10], [11,11], [12,12], [13,13], 
         [1,13], [2,12], [3,11], [4,10], [10,4], [11,3], [12,2], [13,1]],
  // Triple Letter (mavi) - yıldız iç çemberi
  'TL': [[1,5], [1,9], [5,1], [5,5], [5,9], [5,13], [9,1], [9,5], [9,9], [9,13], [13,5], [13,9]],
  // Double Letter (açık mavi) - yıldız dış çemberi
  'DL': [[0,3], [0,11], [2,6], [2,8], [3,0], [3,7], [3,14], [6,2], [6,6], [6,8], [6,12],
         [7,3], [7,11], [8,2], [8,6], [8,8], [8,12], [11,0], [11,7], [11,14], [12,6], [12,8], [14,3], [14,11]]
};

// 10 Oda Sistemi - Zorluk/Rank Seviyelerine Göre
export const BOARD_TYPES = {
  ROOM_1: {
    id: 'room_1',
    name: '🌟 Çırak Odası',
    description: 'Yeni başlayanlar için - Kolay bot',
    rank: 'Çırak',
    difficulty: 'very_easy',
    icon: '🌱',
    maxPlayers: 2,
    timeLimit: 180,
    boardSize: 15,
    botLevel: 'Çırak',
    minRankRequired: 0,
    color: '#27ae60'
  },
  ROOM_2: {
    id: 'room_2',
    name: '🎯 Stajyer Odası',
    description: 'Başlangıç seviyesi - Rahat oyun',
    rank: 'Stajyer Kelimeci',
    difficulty: 'easy',
    icon: '📝',
    maxPlayers: 2,
    timeLimit: 150,
    boardSize: 15,
    botLevel: 'Stajyer Kelimeci',
    minRankRequired: 100,
    color: '#2ecc71'
  },
  ROOM_3: {
    id: 'room_3',
    name: '🏃 Kaşif Odası',
    description: 'Kelime kaşifleri için - Orta zorluk',
    rank: 'Kelime Kaşifi',
    difficulty: 'medium',
    icon: '🔍',
    maxPlayers: 2,
    timeLimit: 130,
    boardSize: 15,
    botLevel: 'Kelime Kaşifi',
    minRankRequired: 300,
    color: '#3498db'
  },
  ROOM_4: {
    id: 'room_4',
    name: '⚔️ Avcı Odası',
    description: 'Kelime avcıları için - Zorlu rakipler',
    rank: 'Sözcük Avcısı',
    difficulty: 'medium_hard',
    icon: '🎯',
    maxPlayers: 2,
    timeLimit: 120,
    boardSize: 15,
    botLevel: 'Sözcük Avcısı',
    minRankRequired: 600,
    color: '#9b59b6'
  },
  ROOM_5: {
    id: 'room_5',
    name: '📚 Bilge Odası',
    description: 'Bilge oyuncular için - İleri seviye',
    rank: 'Söz Bilgesi',
    difficulty: 'hard',
    icon: '🧙',
    maxPlayers: 2,
    timeLimit: 110,
    boardSize: 15,
    botLevel: 'Söz Bilgesi',
    minRankRequired: 1000,
    color: '#e67e22'
  },
  ROOM_6: {
    id: 'room_6',
    name: '🎖️ Usta Odası',
    description: 'Ustalar için - Yüksek rekabet',
    rank: 'Usta',
    difficulty: 'very_hard',
    icon: '🏆',
    maxPlayers: 2,
    timeLimit: 100,
    boardSize: 15,
    botLevel: 'Usta',
    minRankRequired: 1500,
    color: '#e74c3c'
  },
  ROOM_7: {
    id: 'room_7',
    name: '👑 Dil Ustası Odası',
    description: 'Dil ustaları için - Expert seviye',
    rank: 'Dil Ustası',
    difficulty: 'expert',
    icon: '💎',
    maxPlayers: 2,
    timeLimit: 90,
    boardSize: 15,
    botLevel: 'Dil Ustası',
    minRankRequired: 2200,
    color: '#c0392b'
  },
  ROOM_8: {
    id: 'room_8',
    name: '🚀 Strateji Odası',
    description: 'Strateji uzmanları için - Taktik oyun',
    rank: 'Strateji Uzmanı',
    difficulty: 'master',
    icon: '🎲',
    maxPlayers: 2,
    timeLimit: 80,
    boardSize: 15,
    botLevel: 'Strateji Uzmanı',
    minRankRequired: 3000,
    color: '#8e44ad'
  },
  ROOM_9: {
    id: 'room_9',
    name: '⚡ Şampiyon Odası',
    description: 'Şampiyonlar için - En yüksek seviye',
    rank: 'Şampiyon Kelimeci',
    difficulty: 'champion',
    icon: '🏅',
    maxPlayers: 2,
    timeLimit: 70,
    boardSize: 15,
    botLevel: 'Şampiyon Kelimeci',
    minRankRequired: 4000,
    color: '#f39c12'
  },
  ROOM_10: {
    id: 'room_10',
    name: '🔥 Efsane Odası',
    description: 'Efsaneler için - İmkansız zorluk',
    rank: 'Kelime Efsanesi',
    difficulty: 'legend',
    icon: '👑',
    maxPlayers: 2,
    timeLimit: 60,
    boardSize: 15,
    botLevel: 'Kelime Efsanesi',
    minRankRequired: 5000,
    color: '#d35400'
  }
};

// Tahta boyutları
export const BOARD_SIZES = {
  SMALL: 11,
  MEDIUM: 13,
  STANDARD: 15,
  LARGE: 17
};
