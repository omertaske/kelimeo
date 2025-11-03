export function computeRemainingSeconds(expiresAt, nowMs = Date.now()) {
  if (!expiresAt || typeof expiresAt !== 'number') return 0;
  const diffMs = expiresAt - nowMs;
  return Math.max(0, Math.floor(diffMs / 1000));
}

const Time = { computeRemainingSeconds };
export default Time;
