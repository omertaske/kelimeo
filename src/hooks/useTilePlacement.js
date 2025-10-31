import { useState, useCallback } from 'react';

/**
 * Tile (harf) yerleştirme yönetimi için custom hook
 */
export const useTilePlacement = () => {
  const [placedTiles, setPlacedTiles] = useState([]);

  const placeTile = useCallback((letter, row, col) => {
    setPlacedTiles(prev => [...prev, { letter, row, col }]);
    return true;
  }, []);

  const removeTile = useCallback((row, col) => {
    const removedTile = placedTiles.find(t => t.row === row && t.col === col);
    if (!removedTile) return null;

    setPlacedTiles(prev => prev.filter(t => !(t.row === row && t.col === col)));
    return removedTile;
  }, [placedTiles]);

  const clearAllTiles = useCallback(() => {
    const cleared = [...placedTiles];
    setPlacedTiles([]);
    return cleared;
  }, [placedTiles]);

  const getTile = useCallback((row, col) => {
    return placedTiles.find(t => t.row === row && t.col === col);
  }, [placedTiles]);

  const hasTileAt = useCallback((row, col) => {
    return placedTiles.some(t => t.row === row && t.col === col);
  }, [placedTiles]);

  return {
    placedTiles,
    placeTile,
    removeTile,
    clearAllTiles,
    getTile,
    hasTileAt
  };
};
