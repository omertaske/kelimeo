import React, { useMemo, useState, useEffect } from 'react';
import './BagDrawer.css';
import { snapshotToDistribution, compareDistributions } from './bagUtils';
import { logEvent } from '../../../utils/telemetry';

/**
 * TEK ORTAK TILE BAG — Torba İçeriği Görüntüleyici
 * Global tileBag'in snapshot'ını kullanarak torbadaki harfleri gösterir
 */
const BagDrawer = ({ tileBagSnapshot, mpLetterScores, mpDistribution }) => {
  const [isOpen, setIsOpen] = useState(false);

  // TEK ORTAK TILE BAG — Snapshot'tan harf frekanslarını al
  const getLetterFrequency = () => {
    // MP mod: dağılım gelmişse başlangıç dağılımını göster (kalan sayıları server vermiyor olabilir)
    if (!tileBagSnapshot && (mpDistribution || mpLetterScores)) {
      const letters = Object.keys(mpLetterScores || {}).sort((a, b) => a.localeCompare(b, 'tr'));
      return letters.map(letter => ({
        letter,
        count: mpDistribution && mpDistribution[letter] ? mpDistribution[letter] : 0,
        value: (mpLetterScores && mpLetterScores[letter]) || 0,
      }));
    }
    if (!tileBagSnapshot) return [];
    
    const frequency = [];
    
    Object.values(tileBagSnapshot).forEach(tile => {
      if (tile.remaining > 0) {
        frequency.push({
          letter: tile.letter,
          count: tile.remaining,
          value: tile.value
        });
      }
    });
    
    // Harfleri alfabetik sırala
    return frequency.sort((a, b) => a.letter.localeCompare(b.letter, 'tr'));
  };

  const letterFrequency = getLetterFrequency();
  
  // TEK ORTAK TILE BAG — Toplam kalan taş sayısı
  const totalLetters = letterFrequency.reduce((sum, item) => sum + item.count, 0);

  // MP dağılımı ile UI snapshot karşılaştırması (varsa)
  const equality = useMemo(() => {
    if (!tileBagSnapshot || !mpDistribution) return null;
    const uiDist = snapshotToDistribution(tileBagSnapshot);
    return compareDistributions(uiDist, mpDistribution);
  }, [tileBagSnapshot, mpDistribution]);

  useEffect(() => {
    if (equality && equality.equal === false) {
      logEvent('state_divergence', { kind: 'tilebag_distribution', at: equality.diffAt, ui: equality.a, server: equality.b });
    }
  }, [equality]);

  return (
    <div className={`bag-drawer ${isOpen ? 'open' : 'closed'}`}>
      <button 
        className="drawer-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Torba detayları"
      >
        <span className="toggle-icon">{isOpen ? '✕' : '🎒'}</span>
        <span className="toggle-text">
          {isOpen ? 'Kapat' : `Torba (${totalLetters})`}
        </span>
      </button>

      {isOpen && (
        <div className="drawer-content">
          <div className="drawer-header">
            <h3>🎒 Torbadaki Harfler</h3>
            <p className="total-count">Toplam: <strong>{totalLetters}</strong> harf{!tileBagSnapshot && (mpDistribution || mpLetterScores) ? ' (başlangıç dağılımı)' : ''}</p>
          </div>
          
          <div className="letters-grid">
            {letterFrequency.map((item) => (
              <div key={item.letter} className="letter-item">
                <div className="letter-display">
                  <span className="letter">{item.letter}</span>
                  <span className="letter-score">{item.value}</span>
                </div>
                <div className="letter-count">
                  <span className="count-badge">{item.count}</span>
                  <span className="count-label">adet</span>
                </div>
              </div>
            ))}
          </div>

          {equality && (
            <div className="distribution-check" role="status" aria-live="polite" style={{marginTop: 8, fontSize: '0.85rem'}}>
              {equality.equal ? '✅ Sunucu dağılımı ile UI snapshot eşleşiyor.' : `⚠️ Dağılım farkı: ${equality.diffAt} (UI: ${equality.a} / Sunucu: ${equality.b})`}
            </div>
          )}

          {totalLetters === 0 && (
            <div className="empty-bag">
              <span className="empty-icon">📭</span>
              <p>Torba boş!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BagDrawer;
