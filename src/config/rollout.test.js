import { shouldEnableMultiplayer } from './rollout';

// Helper to set window.__CONFIG__ for each test
function withConfig(cfg, fn) {
  const g = globalThis;
  if (!g.window) g.window = {};
  const old = ('__CONFIG__' in g.window) ? g.window.__CONFIG__ : undefined;
  g.window.__CONFIG__ = cfg;
  try {
    fn();
  } finally {
    if (old === undefined) delete g.window.__CONFIG__;
    else g.window.__CONFIG__ = old;
  }
}

describe('rollout.shouldEnableMultiplayer', () => {
  test('mode=all enables for everyone', () => {
    withConfig({ FEATURES: { ROLLOUT: { mode: 'all' } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'u1' })).toBe(true);
      expect(shouldEnableMultiplayer({ username: 'someone' })).toBe(true);
      expect(shouldEnableMultiplayer(null)).toBe(true);
    });
  });

  test('mode=internal only enables for internal users', () => {
    withConfig({ FEATURES: { ROLLOUT: { mode: 'internal' } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'external' })).toBe(false);
      expect(shouldEnableMultiplayer({ email: 'dev@kelimeo.dev' })).toBe(true);
      expect(shouldEnableMultiplayer({ id: 'x', isInternal: true })).toBe(true);
    });
  });

  test('mode=beta with explicit betaUsers list', () => {
    withConfig({ FEATURES: { ROLLOUT: { mode: 'beta', betaUsers: ['a', 'b'] } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'a' })).toBe(true);
      expect(shouldEnableMultiplayer({ username: 'b' })).toBe(true);
      expect(shouldEnableMultiplayer({ email: 'c@example.com' })).toBe(false);
    });
  });

  test('mode=beta with percent edge cases 0% and 100%', () => {
    withConfig({ FEATURES: { ROLLOUT: { mode: 'beta', percent: 0 } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'any-user' })).toBe(false);
    });
    withConfig({ FEATURES: { ROLLOUT: { mode: 'beta', percent: 100 } } }, () => {
      expect(shouldEnableMultiplayer({ id: 'any-user' })).toBe(true);
    });
  });
});
