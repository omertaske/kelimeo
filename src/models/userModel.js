export const RANK_LEVELS = [
  { name: 'Acemi', minScore: 0, minWins: 0 },
  { name: 'Çırak', minScore: 150, minWins: 1 },
  { name: 'Stajyer', minScore: 350, minWins: 2 },
  { name: 'Kaşifi', minScore: 600, minWins: 4 },
  { name: 'Kelimeci', minScore: 900, minWins: 6 },
  { name: 'Avcı', minScore: 1300, minWins: 9 },
  { name: 'Uzman', minScore: 1800, minWins: 12 },
  { name: 'Bilge', minScore: 2400, minWins: 16 },
  { name: 'Şampiyon', minScore: 3100, minWins: 21 },
  { name: 'Usta', minScore: 4000, minWins: 27 }
];

const randomSegment = () => Math.random().toString(36).substring(2, 8);

const generateId = (prefix) => `${prefix}-${Date.now()}-${randomSegment()}`;

export const determineRank = ({ totalScore = 0, gamesWon = 0 } = {}) => {
  let currentRank = RANK_LEVELS[0].name;
  for (const level of RANK_LEVELS) {
    const meetsScore = totalScore >= level.minScore;
    const meetsWins = gamesWon >= (level.minWins ?? 0);
    if (meetsScore && meetsWins) {
      currentRank = level.name;
    } else {
      break;
    }
  }
  return currentRank;
};

export const createUser = ({
  id,
  username,
  email,
  password,
  totalScore = 0,
  gamesPlayed = 0,
  gamesWon = 0,
  bestScore = 0,
  gamesLost,
  isOnline = false,
  isBot = false,
  createdAt,
  lastLogin,
  currentGame = null,
  waitingForMatch = false,
  avatar = null,
  streak = 0,
  elo = 1200,
  botMeta
}) => {
  const safeGamesWon = gamesWon ?? 0;
  const safeGamesPlayed = gamesPlayed ?? safeGamesWon;
  const computedGamesLost = gamesLost ?? Math.max(safeGamesPlayed - safeGamesWon, 0);

  const baseUser = {
    id: id || generateId(isBot ? 'bot' : 'user'),
    username,
    email,
    password: isBot ? null : password,
    totalScore: totalScore ?? 0,
    gamesPlayed: safeGamesPlayed,
    gamesWon: safeGamesWon,
    gamesLost: computedGamesLost,
    bestScore: bestScore ?? 0,
    rank: determineRank({ totalScore, gamesWon: safeGamesWon }),
    isOnline,
    isBot,
    createdAt: createdAt || new Date().toISOString(),
    lastLogin: lastLogin || null,
    currentGame,
    waitingForMatch,
    avatar,
    streak,
    elo,
    botMeta: isBot ? botMeta ?? {} : undefined
  };

  if (!isBot) {
    delete baseUser.botMeta;
  }

  return baseUser;
};

export const createBot = ({
  id,
  username,
  difficulty,
  strategy,
  flavorText,
  totalScore = 0,
  gamesPlayed = 0,
  gamesWon = 0,
  bestScore = 0,
  streak = 0,
  elo = 1200
}) =>
  createUser({
    id: id || generateId('bot'),
    username,
    email: `${username.toLowerCase().replace(/[^a-z0-9]/gi, '')}@kelimeo.ai`,
    password: null,
    totalScore,
    gamesPlayed,
    gamesWon,
    bestScore,
    isOnline: false,
    isBot: true,
    botMeta: {
      difficulty,
      strategy,
      flavorText
    },
    streak,
    elo
  });

export const BOT_PROFILES = [
  {
    username: 'AcemiBot',
    difficulty: 'easy',
    strategy: 'random',
    flavorText: 'Yeni başlayanlar için ideal pratik partneri.',
    totalScore: 280,
    gamesPlayed: 18,
    gamesWon: 5,
    bestScore: 65,
    elo: 900
  },
  {
    username: 'ÇırakBot',
    difficulty: 'easy',
    strategy: 'basic-heuristic',
    flavorText: 'Kelimeleri harita gibi okur, basit hamleleri sever.',
    totalScore: 520,
    gamesPlayed: 26,
    gamesWon: 9,
    bestScore: 92,
    elo: 1050
  },
  {
    username: 'KelimeStajyeri',
    difficulty: 'normal',
    strategy: 'balanced',
    flavorText: 'Her oyunda yeni bir kelime öğrenmeye ant içmiş.',
    totalScore: 860,
    gamesPlayed: 32,
    gamesWon: 14,
    bestScore: 118,
    elo: 1200
  },
  {
    username: 'KaşifBot',
    difficulty: 'normal',
    strategy: 'board-control',
    flavorText: 'Premium karelerin etrafında dolanmayı sever.',
    totalScore: 1180,
    gamesPlayed: 40,
    gamesWon: 19,
    bestScore: 148,
    elo: 1320
  },
  {
    username: 'SözcükAvcısıAI',
    difficulty: 'normal',
    strategy: 'hook-builder',
    flavorText: 'Sadece bir harfle oyunu çevirir.',
    totalScore: 1620,
    gamesPlayed: 44,
    gamesWon: 23,
    bestScore: 176,
    elo: 1480
  },
  {
    username: 'DilUstasıBot',
    difficulty: 'hard',
    strategy: 'premium-focus',
    flavorText: 'Çifte kelime bonuslarını asla kaçırmaz.',
    totalScore: 2100,
    gamesPlayed: 52,
    gamesWon: 29,
    bestScore: 203,
    elo: 1620
  },
  {
    username: 'StratejiMühendisi',
    difficulty: 'hard',
    strategy: 'rack-optimization',
    flavorText: 'Tahta üzerinde mühendislik harikaları yaratır.',
    totalScore: 2660,
    gamesPlayed: 60,
    gamesWon: 35,
    bestScore: 241,
    elo: 1780
  },
  {
    username: 'SözBilgesi',
    difficulty: 'expert',
    strategy: 'endgame',
    flavorText: 'Son hamlelerde görünmez hesaplamalar yapar.',
    totalScore: 3180,
    gamesPlayed: 68,
    gamesWon: 42,
    bestScore: 268,
    elo: 1910
  },
  {
    username: 'ŞampiyonKelimeci',
    difficulty: 'expert',
    strategy: 'probabilistic',
    flavorText: 'Çantadaki harfleri sen düşünmeden hesaplar.',
    totalScore: 3820,
    gamesPlayed: 74,
    gamesWon: 48,
    bestScore: 297,
    elo: 2050
  },
  {
    username: 'GrandmasterBot',
    difficulty: 'legendary',
    strategy: 'perfect-play',
    flavorText: 'Kelime tahtasının gölgesi gibi, hep bir adım önde.',
    totalScore: 4520,
    gamesPlayed: 82,
    gamesWon: 56,
    bestScore: 336,
    elo: 2200
  }
];

export const buildDefaultBots = () => BOT_PROFILES.map((profile, index) =>
  createBot({
    id: `bot-${index + 1}`,
    ...profile
  })
);

export const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};
