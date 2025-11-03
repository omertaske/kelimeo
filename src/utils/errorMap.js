// Centralized error code -> i18n key or message mapping for match errors

export const MATCH_ERROR_MAP = {
  INVALID_TURN: 'toast.notYourTurn',
  NOT_YOUR_TURN: 'toast.notYourTurn',
  INVALID_WORD: 'toast.invalidWord',
  DICTIONARY_REJECT: 'toast.dictReject',
  MATCH_NOT_FOUND: 'toast.matchNotFound',
  ROOM_NOT_FOUND: 'toast.roomNotFound',
  INVALID_MOVE: 'toast.invalidMove',
  TIMEOUT: 'toast.turnTimeout',
};

export function mapMatchErrorCode(code) {
  return MATCH_ERROR_MAP[code] || null;
}

const ErrorMap = { MATCH_ERROR_MAP, mapMatchErrorCode };
export default ErrorMap;
