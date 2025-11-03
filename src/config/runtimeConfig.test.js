import { getSocketUrl } from './runtimeConfig';

describe('runtimeConfig', () => {
  it('prefers window.__CONFIG__ SOCKET_URL when present', () => {
    const g = globalThis;
    const prevWin = g.window;
    // Ensure window object exists and mutate only __CONFIG__
    g.window = prevWin || {};
    const prevCfg = g.window.__CONFIG__;
    g.window.__CONFIG__ = { SOCKET_URL: 'https://example.com' };
    try {
      expect(getSocketUrl()).toBe('https://example.com');
    } finally {
      // Restore
      if (prevCfg === undefined) delete g.window.__CONFIG__;
      else g.window.__CONFIG__ = prevCfg;
      if (!prevWin) delete g.window; else g.window = prevWin;
    }
  });
});
