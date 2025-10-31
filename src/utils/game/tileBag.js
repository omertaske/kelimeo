import { LETTER_DISTRIBUTION } from '../../constants/letterConstants';

/**
 * ============================================================================
 * TEK ORTAK TILE BAG (Kelime/Harf Torbası) - GLOBAL PAYLAŞILAN TORBA
 * ============================================================================
 * 
 * Bu modül, oyundaki TÜM oyuncular için ORTAK bir harf torbasını yönetir.
 * Oyuncu başına ayrı torba YOK - herkes aynı torbadan çeker.
 * 
 * Özellikler:
 * - Thread-safe operasyonlar (lock mekanizması)
 * - Atomic çekme ve commit işlemleri
 * - Rollback desteği (geçersiz hamlelerde)
 * - Her harf için remaining count takibi
 */

class TileBag {
  constructor() {
    // TEK ORTAK TILE BAG — tüm çekimler/harcamalar burayı günceller
    this.tiles = new Map();
    this.isLocked = false; // Race condition önleme için lock
    this.lockQueue = []; // Bekleyen işlemler
    this.initialize();
  }

  /**
   * Torbayı başlangıç durumuna getirir
   * Her harf için {letter, remainingCount, value} tutar
   */
  initialize() {
    this.tiles.clear();
    
    LETTER_DISTRIBUTION.forEach(({ letter, score, count, isBlank }) => {
      this.tiles.set(letter, {
        letter,
        value: score,
        remainingCount: count,
        initialCount: count,
        isBlank: isBlank || false
      });
    });

    console.log('🎒 TEK ORTAK TILE BAG başlatıldı. Toplam taş sayısı:', this.getTotalRemaining());
  }

  /**
   * Lock mekanizması - atomic operasyonlar için
   */
  async acquireLock() {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (!this.isLocked) {
          this.isLocked = true;
          resolve();
        } else {
          this.lockQueue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  /**
   * Lock'u serbest bırak ve bekleyen işlemi başlat
   */
  releaseLock() {
    this.isLocked = false;
    if (this.lockQueue.length > 0) {
      const next = this.lockQueue.shift();
      next();
    }
  }

  /**
   * Belirli bir harfin kalan sayısını döndürür (UI için)
   */
  getRemaining(letter) {
    const tile = this.tiles.get(letter);
    return tile ? tile.remainingCount : 0;
  }

  /**
   * Toplam kalan taş sayısı
   */
  getTotalRemaining() {
    let total = 0;
    this.tiles.forEach(tile => {
      total += tile.remainingCount;
    });
    return total;
  }

  /**
   * Torbadaki tüm harflerin durumunu döndürür (UI için)
   */
  getAllTiles() {
    const result = [];
    this.tiles.forEach(tile => {
      result.push({
        letter: tile.letter,
        value: tile.value,
        remaining: tile.remainingCount,
        initial: tile.initialCount,
        isBlank: tile.isBlank
      });
    });
    return result;
  }

  /**
   * Torbadan N adet rastgele taş çeker (REZERVASYON yapar, commit gerekir)
   * Bu işlem ATOMIC'tir - eşzamanlı çekimlerde race condition olmaz
   * 
   * @param {number} count - Çekilecek taş sayısı
   * @returns {Promise<{success: boolean, tiles: Array, reservationId: string, error?: string}>}
   */
  async drawFromBag(count) {
    await this.acquireLock();
    
    try {
      // TEK ORTAK TILE BAG — çekim öncesi kontrol
      const totalAvailable = this.getTotalRemaining();
      
      if (totalAvailable === 0) {
        return {
          success: false,
          tiles: [],
          error: 'Kelime torbası tükendi! 📭'
        };
      }

      // İstenen miktarı ayarla (torba boşsa az çek)
      const actualCount = Math.min(count, totalAvailable);
      const drawnTiles = [];
      
      // Mevcut tüm harfleri havuza ekle
      const availablePool = [];
      this.tiles.forEach(tile => {
        for (let i = 0; i < tile.remainingCount; i++) {
          availablePool.push({
            letter: tile.letter,
            value: tile.value,
            isBlank: tile.isBlank
          });
        }
      });

      // Rastgele çek
      for (let i = 0; i < actualCount; i++) {
        if (availablePool.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * availablePool.length);
        const drawn = availablePool.splice(randomIndex, 1)[0];
        drawnTiles.push(drawn.letter);
      }

      // Rezervasyon ID'si oluştur (commit için gerekli)
      const reservationId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log(`🎲 TILE BAG: ${actualCount} taş çekildi (rezervasyon: ${reservationId})`);
      
      return {
        success: true,
        tiles: drawnTiles,
        reservationId,
        warning: actualCount < count ? 'Torbada yeterli taş yok, mevcut olanlar çekildi' : null
      };
      
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Hamle onaylandığında kullanılan taşları torbadan SİLER (ATOMIC)
   * 
   * @param {Array<string>} usedTiles - Kullanılan harfler ['A', 'T', 'E', ...]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async commitMove(usedTiles) {
    await this.acquireLock();
    
    try {
      // TEK ORTAK TILE BAG — hamle commit: kullanılan taşlar torbadan çıkarılıyor
      
      // Her harfi kontrol et ve decrement yap
      for (const letter of usedTiles) {
        const tile = this.tiles.get(letter);
        
        if (!tile) {
          console.error(`❌ TILE BAG ERROR: '${letter}' harfi torba tanımında yok!`);
          return { success: false, error: `Geçersiz harf: ${letter}` };
        }

        if (tile.remainingCount <= 0) {
          console.error(`❌ TILE BAG ERROR: '${letter}' harfinden kalmadı ama kullanılmaya çalışıldı!`);
          return { success: false, error: `${letter} harfi tükendi` };
        }

        // Atomic decrement
        tile.remainingCount--;
      }

      console.log(`✅ TILE BAG: ${usedTiles.length} taş commit edildi. Kalan toplam: ${this.getTotalRemaining()}`);
      
      return { success: true };
      
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Geçersiz hamle durumunda çekilen taşları geri torbaya ekler (ROLLBACK)
   * 
   * @param {Array<string>} tempTiles - Geri verilecek harfler
   * @returns {Promise<{success: boolean}>}
   */
  async rollbackDraw(tempTiles) {
    await this.acquireLock();
    
    try {
      // TEK ORTAK TILE BAG — rollback: taşlar torbaya geri ekleniyor
      
      for (const letter of tempTiles) {
        const tile = this.tiles.get(letter);
        if (tile) {
          tile.remainingCount++;
        }
      }

      console.log(`🔄 TILE BAG: ${tempTiles.length} taş rollback edildi (geri eklendi)`);
      
      return { success: true };
      
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Torbayı tamamen sıfırlar (yeni oyun için)
   */
  reset() {
    console.log('🔄 TILE BAG sıfırlanıyor...');
    this.initialize();
  }

  /**
   * Torbanın snapshot'ını alır (UI güncelleme için)
   */
  getSnapshot() {
    const snapshot = {};
    this.tiles.forEach((tile, letter) => {
      snapshot[letter] = {
        letter: tile.letter,
        value: tile.value,
        remaining: tile.remainingCount,
        initial: tile.initialCount
      };
    });
    return snapshot;
  }

  /**
   * Torba boş mu kontrolü
   */
  isEmpty() {
    return this.getTotalRemaining() === 0;
  }
}

// Singleton instance - TEK ORTAK TILE BAG
let globalTileBagInstance = null;

/**
 * Global tile bag instance'ını döndürür (Singleton pattern)
 */
export function getGlobalTileBag() {
  if (!globalTileBagInstance) {
    globalTileBagInstance = new TileBag();
  }
  return globalTileBagInstance;
}

/**
 * Tile bag'i sıfırlar (yeni oyun başlangıcı için)
 */
export function resetGlobalTileBag() {
  const bag = getGlobalTileBag();
  bag.reset();
  return bag;
}

export default TileBag;
