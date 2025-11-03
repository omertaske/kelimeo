import { shouldEnableMultiplayer } from '../rollout';

const withConfig = (cfg, fn) => {
  const w = global;
  const old = w.window ? { ...w.window.__CONFIG__ } : undefined;
  w.window = w.window || {};
  w.window.__CONFIG__ = cfg;
  try { fn(); } finally { if (old) { w.window.__CONFIG__ = old; } }
};

describe('rollout.shouldEnableMultiplayer', () => {
  test('all mode enables for everyone', () => {
    withConfig({ FEATURES: { MULTIPLAYER: true, ROLLOUT: { mode: 'all' } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'user1' })).toBe(true);
    });
  });

  test('internal mode allows only internal users', () => {
    withConfig({ FEATURES: { MULTIPLAYER: true, ROLLOUT: { mode: 'internal' } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'x@kelimeo.dev' })).toBe(true);
      expect(shouldEnableMultiplayer({ id: 'x@example.com' })).toBe(false);
    });
  });

  test('beta mode with list', () => {
    withConfig({ FEATURES: { MULTIPLAYER: true, ROLLOUT: { mode: 'beta', betaUsers: ['a','b'] } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'a' })).toBe(true);
      expect(shouldEnableMultiplayer({ id: 'z' })).toBe(false);
    });
  });

  test('beta mode with percent uses stable bucketing', () => {
    withConfig({ FEATURES: { MULTIPLAYER: true, ROLLOUT: { mode: 'beta', percent: 50 } } }, () => {
      const u1 = shouldEnableMultiplayer({ id: 'user-1' });
      const u2 = shouldEnableMultiplayer({ id: 'user-1' });
      expect(u1).toBe(u2);
    });
  });
});
