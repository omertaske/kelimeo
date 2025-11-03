// Simple runtime config reader: prefers window.__CONFIG__ when present
const defaultConfig = {
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000',
  FEATURES: {
    MULTIPLAYER: true,
    TELEMETRY: true,
    PREVIEW_OVERLAY: true,
  },
};

export function getConfig() {
  const w = (typeof window !== 'undefined') ? window : undefined;
  const injected = (w && w.__CONFIG__) ? w.__CONFIG__ : undefined;
  // Shallow merge, deep enough for our current keys
  return {
    ...defaultConfig,
    ...(injected || {}),
    FEATURES: {
      ...defaultConfig.FEATURES,
      ...((injected && injected.FEATURES) ? injected.FEATURES : {}),
    },
  };
}

export function getSocketUrl() {
  const cfg = getConfig();
  return cfg.SOCKET_URL || defaultConfig.SOCKET_URL;
}

const runtimeConfig = { getConfig, getSocketUrl };
export default runtimeConfig;
