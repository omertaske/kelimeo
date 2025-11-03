import { computeRemainingSeconds } from '../time';

describe('computeRemainingSeconds', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  test('returns 0 when no expiry', () => {
    expect(computeRemainingSeconds(null)).toBe(0);
    expect(computeRemainingSeconds(undefined)).toBe(0);
  });

  test('computes remaining seconds with fake timers', () => {
    const now = new Date('2025-01-01T00:00:00Z').getTime();
    jest.setSystemTime(now);
    const exp = now + 30500; // 30.5s
    expect(computeRemainingSeconds(exp)).toBe(30);
    jest.setSystemTime(now + 10000);
    expect(computeRemainingSeconds(exp)).toBe(20);
    jest.setSystemTime(now + 31000);
    expect(computeRemainingSeconds(exp)).toBe(0);
  });
});
