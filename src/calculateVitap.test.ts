import { describe, expect, it } from 'vitest';
import { calculateVitap, parseSocket, shiftedVariants, socketNumericValue, VITAP_SOCKETS } from './calculateVitap';

function values(result: ReturnType<typeof calculateVitap>) {
  return result.coordinates.map((item) => item.coordinate);
}

function sockets(result: ReturnType<typeof calculateVitap>) {
  return result.coordinates.map((item) => item.socket);
}

describe('Vitap socket system', () => {
  it('lists Alfa 21 sockets in physical order with alternating rotation labels', () => {
    expect(VITAP_SOCKETS).toEqual([
      '320R',
      '288L',
      '256R',
      '224L',
      '192R',
      '160L',
      '128R',
      '96L',
      '64R',
      '32L',
      '0',
      '32L',
      '64R',
      '96L',
      '128R',
      '160L',
      '192R',
      '224L',
      '256R',
      '288L',
      '320R',
    ]);
  });

  it('parses socket rotation label data', () => {
    expect(parseSocket('224L')).toEqual({ number: '224', side: 'L' });
    expect(parseSocket('192R')).toEqual({ number: '192', side: 'R' });
    expect(parseSocket('0')).toEqual({ number: '0', side: null });
    expect(parseSocket('-')).toBeNull();
  });

  it('uses only the numeric socket value for fence position calculations', () => {
    expect(socketNumericValue('288L')).toBe(288);
    expect(socketNumericValue('256R')).toBe(256);
    expect(socketNumericValue('0')).toBe(0);
  });
});

describe('symmetry mode', () => {
  it('keeps edge holes primary for two holes', () => {
    const result = calculateVitap(500, 2, 37, 'symmetry', 10);

    expect(result.offset).toBe(42);
    expect(result.base).toBe(416);
    expect(result.steps).toBe(13);
    expect(result.intervalSteps).toEqual([13]);
    expect(values(result)).toEqual([42, 458]);
    expect(sockets(result)).toEqual(['0', '-']);
  });

  it('keeps the actual offset above the entered minimum offset', () => {
    const result = calculateVitap(267, 2, 50, 'symmetry', 10);

    expect(result.offset).toBe(53.5);
    expect(Math.round(result.offset)).toBe(54);
    expect(values(result)).toEqual([54, 214]);
  });

  it('shows both equally centered inner positions without shrinking the edge base', () => {
    const result = calculateVitap(200, 3, 37, 'symmetry', 10);

    expect(result.offset).toBe(52);
    expect(result.base).toBe(96);
    expect(result.steps).toBe(3);
    expect(result.intervalSteps).toEqual([1, 2]);
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
    expect(result.steps).toBe(13);
    expect(result.intervalSteps).toEqual([6, 7]);
    expect(values(result)).toEqual([42, 234, 458]);
    expect(sockets(result)).toEqual(['192R', '0', '224L']);
    expect(result.variants.map((variant) => variant.values)).toEqual([
      [42, 234, 458],
      [42, 266, 458],
    ]);
    expect(result.variants.map((variant) => variant.sockets)).toEqual([
      ['192R', '0', '224L'],
      ['224L', '0', '192R'],
    ]);
  });

  it('uses the selected center socket as an anchor when it creates a full three-hole socket set', () => {
    const result = calculateVitap(500, 3, 37, 'symmetry', 10, 'right');

    expect(values(result)).toEqual([42, 234, 458]);
    expect(result.variants.map((variant) => variant.sockets)).toEqual([
      ['192R', '0', '224L'],
      ['224L', '0', '192R'],
    ]);
  });

  it('maps displayed socket variants from the selected start socket', () => {
    const result = calculateVitap(500, 3, 37, 'symmetry', 1);

    expect(values(result)).toEqual([42, 234, 458]);
    expect(sockets(result)).toEqual(['288L', '96L', '128R']);
    expect(result.variants.map((variant) => variant.sockets)).toEqual([
      ['288L', '96L', '128R'],
      ['288L', '64R', '128R'],
    ]);
  });

  it('shows the full socket pair for two holes from the selected start socket', () => {
    const result = calculateVitap(500, 2, 37, 'symmetry', 1);

    expect(values(result)).toEqual([42, 458]);
    expect(sockets(result)).toEqual(['288L', '128R']);
    expect(result.variants[0].sockets).toEqual(['288L', '128R']);
  });

  it('builds socket pairs backwards from a right-side start socket', () => {
    const result = calculateVitap(500, 2, 37, 'symmetry', 19, 'right');

    expect(values(result)).toEqual([42, 458]);
    expect(sockets(result)).toEqual(['288L', '128R']);
    expect(result.variants[0].sockets).toEqual(['288L', '128R']);
  });
});

describe('standard offset mode', () => {
  it('keeps the entered edge offset and reduces the base to a 32 mm step', () => {
    const result = calculateVitap(2000, 6, 100, 'standard', 10);

    expect(result.offset).toBe(100);
    expect(result.base).toBe(1792);
    expect(result.steps).toBe(56);
    expect(values(result)[0]).toBe(100);
    expect(values(result).at(-1)).toBe(1892);
  });

  it('places internal holes on available 32 mm positions near the center', () => {
    const result = calculateVitap(500, 3, 37, 'standard', 10);

    expect(result.offset).toBe(37);
    expect(result.base).toBe(416);
    expect(result.intervalSteps).toEqual([7, 6]);
    expect(values(result)).toEqual([37, 261, 453]);
    expect(sockets(result)).toEqual(['224L', '0', '192R']);
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
        sockets: ['192R', '0', '224L'],
      },
      {
        title: 'Смещение вправо +16 мм',
        values: [58, 250, 474],
        sockets: ['192R', '0', '224L'],
      },
    ]);
  });
});
