// Simple rollout/canary helper for MULTIPLAYER feature
// Config shape (optional):
// window.__CONFIG__ = {
//   FEATURES: {
//     MULTIPLAYER: true,
//     ROLLOUT: { mode: 'all'|'beta'|'internal', percent?: 0-100, betaUsers?: string[] }
//   }
// }
import { getConfig } from './runtimeConfig';

export function shouldEnableMultiplayer(currentUser) {
  const { FEATURES } = getConfig();
  if (FEATURES?.MULTIPLAYER === false) return false;
  const r = FEATURES?.ROLLOUT || { mode: 'all' };
  const mode = r.mode || 'all';
  if (mode === 'all') return true;
  const uid = currentUser?.id || currentUser?.username || currentUser?.email || '';
  const isInternal = !!(currentUser?.isInternal || (typeof uid === 'string' && /@kelimeo\.dev$/i.test(uid)));
  if (mode === 'internal') return isInternal;
  if (mode === 'beta') {
    if (Array.isArray(r.betaUsers) && r.betaUsers.length) {
      return r.betaUsers.includes(uid);
    }
    const pct = typeof r.percent === 'number' ? Math.max(0, Math.min(100, r.percent)) : 0;
    if (pct >= 100) return true;
    if (pct <= 0) return false;
    // Stable bucketing by uid hash
    const h = hashString(uid);
    const bucket = h % 100;
    return bucket < pct;
  }
  return true;
}

function hashString(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i) ?? 0;
    h ^= cp;
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0);
}

const Rollout = { shouldEnableMultiplayer };
export default Rollout;
