const { LETTER_DISTRIBUTION } = require('../constants/board');

class TileBag {
  constructor() {
    this.tiles = [];
    this._init();
  }

  _init() {
    this.tiles.length = 0;
    for (const { letter, score, count, isBlank } of LETTER_DISTRIBUTION) {
      for (let i = 0; i < count; i++) {
        this.tiles.push({ letter, score: score ?? 0, isBlank: !!isBlank });
      }
    }
    // karıştır
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  remaining() {
    return this.tiles.length;
  }

  draw(n) {
    const out = [];
    for (let i = 0; i < n && this.tiles.length > 0; i++) {
      out.push(this.tiles.pop());
    }
    return out;
  }
}

module.exports = { TileBag };
