import { describe, expect, it } from 'vitest';
import { calculateVitap, parseSocket, shiftedVariants, VITAP_SOCKETS } from './calculateVitap';

function values(result: ReturnType<typeof calculateVitap>) {
  return result.coordinates.map((item) => item.coordinate);
}

function sockets(result: ReturnType<typeof calculateVitap>) {
  return result.coordinates.map((item) => item.socket);
}

describe('Vitap socket system', () => {
  it('lists Alfa 21 sockets from 320L to 320R with 32 mm step', () => {
    expect(VITAP_SOCKETS).toEqual([
      '320L',
      '288L',
      '256L',
      '224L',
      '192L',
      '160L',
      '128L',
      '96L',
      '64L',
      '32L',
      '0',
      '32R',
      '64R',
      '96R',
      '128R',
      '160R',
      '192R',
      '224R',
      '256R',
      '288R',
      '320R',
    ]);
  });

  it('parses socket side colors data', () => {
    expect(parseSocket('224L')).toEqual({ number: '224', side: 'L' });
    expect(parseSocket('192R')).toEqual({ number: '192', side: 'R' });
    expect(parseSocket('0')).toEqual({ number: '0', side: null });
    expect(parseSocket('-')).toBeNull();
  });
});

describe('symmetry mode', () => {
  it('keeps edge holes primary for two holes', () => {
    const result = calculateVitap(500, 2, 37, 'symmetry', 10);

    expect(result.offset).toBe(42);
    expect(result.base).toBe(416);
    expect(result.steps).toBe(13);
    expect(values(result)).toEqual([42, 458]);
    expect(sockets(result)).toEqual(['224L', '192R']);
  });

  it('shows both equally centered inner positions without shrinking the edge base', () => {
    const result = calculateVitap(200, 3, 37, 'symmetry', 10);

    expect(result.offset).toBe(52);
    expect(result.base).toBe(96);
    expect(result.steps).toBe(3);
    expect(result.variants.map((variant) => variant.values)).toEqual([
      [52, 84, 148],
      [52, 116, 148],
    ]);
    expect(result.variants.map((variant) => variant.values)).not.toContainEqual([68, 100, 132]);
  });

  it('keeps 500 mm edge holes and offers both center-near options for three holes', () => {
    const result = calculateVitap(500, 3, 37, 'symmetry', 10);

    expect(result.offset).toBe(42);
    expect(result.base).toBe(416);
    expect(values(result)).toEqual([42, 234, 458]);
    expect(sockets(result)).toEqual(['224L', '32L', '192R']);
    expect(result.variants.map((variant) => variant.values)).toEqual([
      [42, 234, 458],
      [42, 266, 458],
    ]);
  });
});

describe('standard offset mode', () => {
  it('calculates coordinates with 32 mm step and maps real sockets from selected start', () => {
    const result = calculateVitap(0, 4, 37, 'standard', 10);

    expect(values(result)).toEqual([37, 69, 101, 133]);
    expect(sockets(result)).toEqual(['0', '32R', '64R', '96R']);
  });

  it('can start from a left-side socket and continue through neighbors', () => {
    const result = calculateVitap(0, 3, 37, 'standard', 3);

    expect(values(result)).toEqual([37, 69, 101]);
    expect(sockets(result)).toEqual(['224L', '192L', '160L']);
  });
});

describe('coordinate shift alternatives', () => {
  it('does not mutate the main result and produces left and right shifted alternatives', () => {
    const result = calculateVitap(500, 3, 37, 'symmetry', 10);
    const variants = shiftedVariants(result, 16);

    expect(values(result)).toEqual([42, 234, 458]);
    expect(variants).toEqual([
      {
        title: 'Смещение влево -16 мм',
        values: [26, 218, 442],
        sockets: ['224L', '32L', '192R'],
      },
      {
        title: 'Смещение вправо +16 мм',
        values: [58, 250, 474],
        sockets: ['224L', '32L', '192R'],
      },
    ]);
  });
});
