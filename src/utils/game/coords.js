// Koordinat normalizasyon yardımcıları
// Not: Şu anda UI ve sunucu 0-bazlı (row,col) kullanıyor. Gelecekte değişirse tek noktadan düzeltmek için bu fonksiyonları kullanın.

export function uiToServerCoords({ row, col }) {
  // Eğer bir yerde 1-bazlı kullanılırsa: return { row: row - 1, col: col - 1 };
  return { row, col };
}

export function serverToUiCoords({ row, col }) {
  // Eğer bir yerde 1-bazlı kullanılırsa: return { row: row + 1, col: col + 1 };
  return { row, col };
}

export function normalizeCoordsList(list = []) {
  return list.map(uiToServerCoords);
}

const coords = { uiToServerCoords, serverToUiCoords, normalizeCoordsList };
export default coords;
