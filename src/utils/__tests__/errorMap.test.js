import { mapMatchErrorCode, MATCH_ERROR_MAP } from '../errorMap';

describe('errorMap', () => {
  test('maps known codes to i18n keys', () => {
    expect(mapMatchErrorCode('NOT_YOUR_TURN')).toBe('toast.notYourTurn');
    expect(mapMatchErrorCode('INVALID_MOVE')).toBe('toast.invalidMove');
  });
  test('returns null for unknown codes', () => {
    expect(mapMatchErrorCode('SOMETHING_ELSE')).toBeNull();
  });
  test('map object contains expected keys', () => {
    expect(Object.keys(MATCH_ERROR_MAP)).toEqual(expect.arrayContaining(['ROOM_NOT_FOUND','MATCH_NOT_FOUND']));
  });
});
