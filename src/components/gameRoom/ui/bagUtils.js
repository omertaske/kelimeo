// Compare UI snapshot distribution with server distribution
export function snapshotToDistribution(snapshot) {
  if (!snapshot) return {};
  const dist = {};
  for (const k of Object.keys(snapshot)) {
    const tile = snapshot[k];
    if (!tile) continue;
    const l = tile.letter;
    const c = tile.remaining || 0;
    dist[l] = (dist[l] || 0) + c;
  }
  return dist;
}

export function compareDistributions(a = {}, b = {}) {
  const all = new Set([...Object.keys(a), ...Object.keys(b)]);
  const keys = Array.from(all).sort((x, y) => String(x).localeCompare(String(y), 'tr'));
  for (const k of keys) {
    const av = a[k] || 0;
    const bv = b[k] || 0;
    if (av !== bv) return { equal: false, diffAt: k, a: av, b: bv };
  }
  return { equal: true };
}

const BagUtils = { snapshotToDistribution, compareDistributions };
export default BagUtils;
