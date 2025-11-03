export const validateOrientationAndContiguity = (placedTiles, baseBoard) => {
  if (!placedTiles || placedTiles.length === 0) return { ok: false, msg: 'toast.needWord' };
  const rows = new Set(placedTiles.map(t => t.row));
  const cols = new Set(placedTiles.map(t => t.col));
  let orientation;
  if (rows.size === 1) orientation = 'H';
  else if (cols.size === 1) orientation = 'V';
  else return { ok: false, msg: 'Harfler tek satırda veya tek sütunda olmalı' };

  const n = baseBoard?.length || 0;
  const m = n ? baseBoard[0]?.length || 0 : 0;
  if (!n || !m) return { ok: false, msg: 'Tahta hazır değil' };

  // İlk hamle ise merkez zorunlu
  const anyCommitted = baseBoard.some(r => r.some(c => !!c.letter));
  if (!anyCommitted) {
    const center = Math.floor(n / 2);
    const hitsCenter = placedTiles.some(t => t.row === center && t.col === center);
    if (!hitsCenter) return { ok: false, msg: 'İlk hamlede merkez yıldız kullanılmalı' };
  }

  // Bitişiklik/bağlılık: yerleştirilen aralıkta boşluk kalmamalı (varsa mevcut harf köprü kurmalı)
  if (orientation === 'H') {
    const row = placedTiles[0].row;
    const minC = Math.min(...placedTiles.map(t => t.col));
    const maxC = Math.max(...placedTiles.map(t => t.col));
    for (let c = minC; c <= maxC; c++) {
      const hasPlaced = placedTiles.some(t => t.col === c);
      const hasExisting = !!baseBoard[row]?.[c]?.letter;
      if (!hasPlaced && !hasExisting) return { ok: false, msg: 'Yerleştirilen harfler bitişik olmalı' };
    }
  } else {
    const col = placedTiles[0].col;
    const minR = Math.min(...placedTiles.map(t => t.row));
    const maxR = Math.max(...placedTiles.map(t => t.row));
    for (let r = minR; r <= maxR; r++) {
      const hasPlaced = placedTiles.some(t => t.row === r);
      const hasExisting = !!baseBoard[r]?.[col]?.letter;
      if (!hasPlaced && !hasExisting) return { ok: false, msg: 'Yerleştirilen harfler bitişik olmalı' };
    }
  }
  return { ok: true, orientation };
};
