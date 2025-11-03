// Basit önizleme tahta hesaplayıcısı
// baseBoard: 2D array of cells
// placedTiles: [{row, col, letter, isBlank, repr}]
export function computePreviewBoard(baseBoard = [], placedTiles = []) {
  if (!Array.isArray(baseBoard) || baseBoard.length === 0) return baseBoard;
  const next = baseBoard.map(row => row.map(cell => ({ ...cell })));
  for (const { row, col, letter, isBlank, repr } of (placedTiles || [])) {
    const cell = next[row]?.[col];
    if (!cell) continue;
    next[row][col] = {
      ...cell,
      letter: isBlank ? (repr || '') : letter,
      isBlank: !!isBlank,
      owner: 'player', // preview sahibini işaretle
    };
  }
  return next;
}

export default { computePreviewBoard };
