import { describe, expect, it } from 'vitest';
import { calculateShelves } from './calculateShelves';

describe('shelf drilling mode', () => {
  it('calculates shelf centers with equal distances', () => {
    const result = calculateShelves({
      cabinetHeight: 2000,
      shelfThickness: 16,
      side: 'top',
      shelfCount: 5,
      distanceMode: 'equal',
      equalDistance: 370,
      distances: [100],
    });

    expect(result.coordinates).toEqual([108, 494, 880, 1266, 1652]);
    expect(result.remainingToEdge).toBe(340);
    expect(result.fits).toBe(true);
  });

  it('calculates shelf center coordinates from the chosen edge', () => {
    const result = calculateShelves({
      cabinetHeight: 2000,
      shelfThickness: 16,
      side: 'top',
      shelfCount: 5,
      distanceMode: 'custom',
      distances: [100, 370, 400, 400, 200],
    });

    expect(result.coordinates).toEqual([108, 494, 910, 1326, 1542]);
    expect(result.remainingToEdge).toBe(450);
    expect(result.fits).toBe(true);
  });

  it('works without cabinet height', () => {
    const result = calculateShelves({
      shelfThickness: 18,
      side: 'bottom',
      shelfCount: 3,
      distances: [50, 300, 300],
    });

    expect(result.coordinates).toEqual([59, 377, 695]);
    expect(result.remainingToEdge).toBeNull();
    expect(result.fits).toBeNull();
  });

  it('detects shelves that do not fit into the cabinet height', () => {
    const result = calculateShelves({
      cabinetHeight: 700,
      shelfThickness: 22,
      side: 'top',
      shelfCount: 3,
      distances: [100, 300, 300],
    });

    expect(result.coordinates).toEqual([111, 433, 755]);
    expect(result.remainingToEdge).toBe(-66);
    expect(result.fits).toBe(false);
  });
});
