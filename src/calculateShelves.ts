export type ShelfCalculationSide = 'top' | 'bottom';
export type ShelfDistanceMode = 'equal' | 'custom';

export type ShelfInput = {
  cabinetHeight?: number;
  shelfThickness: number;
  side: ShelfCalculationSide;
  shelfCount: number;
  distanceMode?: ShelfDistanceMode;
  equalDistance?: number;
  distances: number[];
};

export type ShelfResult = {
  coordinates: number[];
  remainingToEdge: number | null;
  fits: boolean | null;
};

export function calculateShelves({
  cabinetHeight,
  distanceMode = 'custom',
  equalDistance,
  shelfThickness,
  shelfCount,
  distances,
}: ShelfInput): ShelfResult {
  const safeShelfCount = Math.max(1, Math.min(15, Math.floor(shelfCount || 1)));
  const safeThickness = Math.max(shelfThickness || 0, 0);
  const halfThickness = safeThickness / 2;
  const firstOffset = Math.max(distances[0] || 0, 0);
  const coordinates = [firstOffset + halfThickness];

  for (let index = 1; index < safeShelfCount; index += 1) {
    const rawDistance = distanceMode === 'equal' ? equalDistance : distances[index];
    const distanceBetweenShelves = Math.max(rawDistance || 0, 0);
    const previousCoordinate = coordinates[index - 1];

    coordinates.push(previousCoordinate + safeThickness + distanceBetweenShelves);
  }

  if (!cabinetHeight || cabinetHeight <= 0) {
    return {
      coordinates: coordinates.map(Math.round),
      remainingToEdge: null,
      fits: null,
    };
  }

  const lastShelfOuterEdge = coordinates[coordinates.length - 1] + halfThickness;
  const remainingToEdge = cabinetHeight - lastShelfOuterEdge;

  return {
    coordinates: coordinates.map(Math.round),
    remainingToEdge: Math.round(remainingToEdge),
    fits: remainingToEdge >= 0,
  };
}
