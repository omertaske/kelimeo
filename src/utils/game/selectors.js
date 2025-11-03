export function isMyTurn(mpMode, mpCurrentTurn, myId, currentTurn) {
  if (mpMode) return !!myId && mpCurrentTurn === myId;
  return currentTurn === 'player';
}

export default { isMyTurn };
