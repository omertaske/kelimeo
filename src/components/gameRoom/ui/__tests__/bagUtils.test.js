import { snapshotToDistribution, compareDistributions } from '../bagUtils';

describe('bagUtils', () => {
  test('snapshotToDistribution sums remaining counts', () => {
    const snapshot = {
      A: { letter: 'A', remaining: 2, value: 1 },
      B: { letter: 'B', remaining: 1, value: 3 },
      C: { letter: 'C', remaining: 0, value: 4 },
    };
    const dist = snapshotToDistribution(snapshot);
    expect(dist).toEqual({ A: 2, B: 1, C: 0 });
  });

  test('compareDistributions detects equality and diff', () => {
    const a = { A: 2, B: 1 };
    const b = { A: 2, B: 1 };
    expect(compareDistributions(a, b).equal).toBe(true);
    const c = { A: 2, B: 3 };
    const res = compareDistributions(a, c);
    expect(res.equal).toBe(false);
    expect(res.diffAt).toBe('B');
  });
});
