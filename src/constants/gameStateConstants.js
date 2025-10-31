// Oyun durumları
export const GAME_STATES = {
  WAITING: 'waiting',
  MATCHING: 'matching',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished'
};

// Oyuncu sırası
export const TURN_TYPES = {
  PLAYER: 'player',
  OPPONENT: 'opponent'
};

// Oyun sonuç tipleri
export const GAME_RESULT_TYPES = {
  WIN: 'win',
  LOSE: 'lose',
  DRAW: 'draw',
  FORFEIT: 'forfeit'
};

// Hareket tipleri
export const MOVE_TYPES = {
  PLACE_WORD: 'place_word',
  PASS: 'pass',
  EXCHANGE: 'exchange'
};
