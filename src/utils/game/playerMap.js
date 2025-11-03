/**
 * Player ID ↔ UID mapping helper.
 * For now identity mapping. Later can be extended for server-specific ids.
 */
export function toServerPlayerId(uid) {
  return uid;
}

export function fromServerPlayerId(pid) {
  return pid;
}

const playerMap = { toServerPlayerId, fromServerPlayerId };
export default playerMap;
