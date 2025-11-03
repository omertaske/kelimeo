// mpMode veri adaptörü: UI state <-> MP state
// Not: İlk sürüm minimaldir; zamanla genişletilecektir.

export function getMpStateFromUiState({ board, rack }) {
  // UI board hücrelerini MP'e uygun basit yapıya dönüştür (immuatable kopya)
  const mpBoard = Array.isArray(board)
    ? board.map(row => row.map(cell => ({
        letter: cell.letter || null,
        isBlank: !!cell.isBlank,
        blankAs: cell.blankAs || null,
        multiplier: cell.multiplier || null,
        isCenter: !!cell.isCenter,
        owner: cell.owner || null,
      })))
    : [];
  const mpRack = Array.isArray(rack) ? [...rack] : [];
  return { mpBoard, mpRack };
}

export function getUiStateFromMpState({ board, rack }) {
  const uiBoard = Array.isArray(board)
    ? board.map(row => row.map(cell => ({
        letter: cell.letter || null,
        isBlank: !!cell.isBlank,
        blankAs: cell.blankAs || null,
        multiplier: cell.multiplier || null,
        isCenter: !!cell.isCenter,
        owner: cell.owner || null,
      })))
    : [];
  const uiRack = Array.isArray(rack) ? [...rack] : [];
  return { uiBoard, uiRack };
}

export default { getMpStateFromUiState, getUiStateFromMpState };
