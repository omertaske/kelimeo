import { getConfig } from './runtimeConfig';

describe('runtimeConfig FEATURES merge', () => {
  it('merges injected FEATURES over defaults', () => {
  const g = (typeof window !== 'undefined') ? window : {};
  const prevCfg = g.__CONFIG__;
  g.__CONFIG__ = { FEATURES: { MULTIPLAYER: false, PREVIEW_OVERLAY: false } };
    try {
      const cfg = getConfig();
      expect(cfg.FEATURES.MULTIPLAYER).toBe(false);
      expect(cfg.FEATURES.PREVIEW_OVERLAY).toBe(false);
      expect(cfg.FEATURES.TELEMETRY).toBe(true);
    } finally {
      if (prevCfg === undefined) delete g.__CONFIG__;
      else g.__CONFIG__ = prevCfg;
    }
  });
});
