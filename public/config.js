window.__CONFIG__ = Object.assign({
  // Socket origin/path can be overridden at runtime by editing this file after deployment
  SOCKET_URL: 'http://localhost:4000',
  FEATURES: {
    MULTIPLAYER: true,
    TELEMETRY: true,
    PREVIEW_OVERLAY: true,
  }
}, window.__CONFIG__ || {});
