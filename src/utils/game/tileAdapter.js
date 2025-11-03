// Tile adapter & helpers for consistent payloads
// placedTiles: [{row, col, letter, isBlank, repr}]
// Returns payload tiles expected by server
import { toUpperTR, normalizeNFC } from '../string/locale';
import { uiToServerCoords } from './coords';

export const tilesToPayload = (placedTiles = []) => {
  return placedTiles.map(({ row, col, letter, isBlank, repr }) => {
    const { row: r, col: c } = uiToServerCoords({ row, col });
    const normLetter = isBlank ? toUpperTR(normalizeNFC(repr || '')) : letter;
    return {
      row: r,
      col: c,
      letter: normLetter,
      isBlank: !!isBlank,
      repr: isBlank ? normLetter : undefined,
    };
  });
};

// DnD payload adapter: unify tile shape for drag & drop contexts
// UI letters can be plain strings. This adapter promotes them to objects.
export const toMpTile = (input) => {
  if (!input) return null;
  if (typeof input === 'string') {
    const isBlank = input === '*';
    return {
      id: undefined,
      letter: input,
      value: isBlank ? 0 : undefined,
      isBlank,
    };
  }
  const { id, letter, value, isBlank } = input;
  return { id, letter, value: value ?? (isBlank ? 0 : undefined), isBlank: !!isBlank };
};

export const fromMpTile = (tile) => {
  if (!tile) return null;
  return tile.letter || null;
};

// Optionally normalize server board diffs if needed in future
export const applyBoardDiffImmutable = (board, boardDiff, ownerId) => {
  if (!Array.isArray(board) || !Array.isArray(boardDiff) || board.length === 0) return board;
  const next = board.map(r => r.map(c => ({ ...c })));
  for (const { row, col, letter, isBlank, blankAs } of boardDiff) {
    const cell = next[row]?.[col];
    if (!cell) continue;
    const hadMult = !!cell.multiplier;
    next[row][col] = {
      ...cell,
      letter,
      owner: ownerId,
      isBlank: !!isBlank,
      blankAs: blankAs || (isBlank ? letter : null),
      usedMultipliers: !!(cell.usedMultipliers || hadMult),
    };
  }
  return next;
};
