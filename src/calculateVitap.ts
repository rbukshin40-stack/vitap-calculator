export type Mode = 'symmetry' | 'standard';

export type Result = {
  offset: number;
  base: number;
  steps: number;
  intervalSteps: number[];
  coordinates: Array<{ coordinate: number; socket: string }>;
  variants: Array<{ title: string; values: number[]; sockets: string[] }>;
};

export type SocketParts = {
  number: string;
  side: 'L' | 'R' | null;
};

const VITAP_MIN = -320;
const VITAP_MAX = 320;

export const VITAP_SOCKETS = Array.from({ length: 21 }, (_, index) => socketLabel(VITAP_MIN + index * 32));

export function socketLabel(position: number) {
  if (position === 0) {
    return '0';
  }

  const value = Math.abs(position);
  const side = (value / 32) % 2 === 0 ? 'R' : 'L';

  return `${value}${side}`;
}

export function parseSocket(socket: string): SocketParts | null {
  if (socket === '-' || !socket) {
    return null;
  }

  const side = socket.endsWith('L') ? 'L' : socket.endsWith('R') ? 'R' : null;
  const number = side ? socket.slice(0, -1) : socket;

  return { number, side };
}

export function socketNumericValue(socket: string) {
  const parts = parseSocket(socket);

  return parts ? Number(parts.number) || 0 : 0;
}

function coordinatesFromOffset(offset: number, step: number, holes: number) {
  return Array.from({ length: holes }, (_, index) => Math.round(offset + step * index));
}

function intervalStepsFromCoordinates(coordinates: number[]) {
  return coordinates.slice(1).map((coordinate, index) => Math.round((coordinate - coordinates[index]) / 32));
}

function combineValues<T>(items: T[], count: number): T[][] {
  if (count === 0) {
    return [[]];
  }

  if (items.length < count) {
    return [];
  }

  const [first, ...rest] = items;
  return [
    ...combineValues(rest, count - 1).map((combination) => [first, ...combination]),
    ...combineValues(rest, count),
  ];
}

function symmetrySockets(coordinates: number[], first: number, steps: number) {
  const firstSocketPosition = -Math.ceil(steps / 2) * 32;

  return coordinates.map((coordinate) => {
    const stepsFromFirst = Math.round((coordinate - first) / 32);
    const socketPosition = firstSocketPosition + stepsFromFirst * 32;

    return socketPosition >= VITAP_MIN && socketPosition <= VITAP_MAX ? socketLabel(socketPosition) : '-';
  });
}

function socketsFromStart(coordinates: number[], first: number, startSocketIndex: number) {
  return coordinates.map((coordinate) => {
    const stepsFromFirst = Math.round((coordinate - first) / 32);
    const socketIndex = startSocketIndex + stepsFromFirst;

    return VITAP_SOCKETS[socketIndex] ?? '-';
  });
}

function symmetryVariants(first: number, last: number, steps: number, holes: number, center: number) {
  const internalCount = Math.max(holes - 2, 0);

  if (holes <= 1) {
    return [[Math.round(center)]];
  }

  if (internalCount === 0) {
    return [[Math.round(first), Math.round(last)]];
  }

  const available = Array.from({ length: Math.max(steps - 1, 0) }, (_, index) => first + (index + 1) * 32);

  if (available.length <= internalCount) {
    return [[Math.round(first), ...available.map(Math.round), Math.round(last)]];
  }

  const ranked = available
    .map((coordinate) => ({
      coordinate,
      distance: Math.abs(coordinate - center),
    }))
    .sort((a, b) => a.distance - b.distance || a.coordinate - b.coordinate);
  const threshold = ranked[internalCount - 1].distance;
  const required = ranked.filter((item) => item.distance < threshold).map((item) => item.coordinate);
  const tied = ranked.filter((item) => item.distance === threshold).map((item) => item.coordinate);
  const neededFromTie = internalCount - required.length;

  return combineValues(tied, neededFromTie)
    .slice(0, 8)
    .map((combination) => [first, ...required, ...combination, last].sort((a, b) => a - b).map(Math.round));
}

export function calculateVitap(
  length: number,
  holes: number,
  minOffset: number,
  mode: Mode,
  standardStartSocketIndex: number,
): Result {
  const safeHoles = Math.max(1, Math.min(15, holes));

  if (mode === 'standard') {
    const fixedOffset = Math.max(minOffset, 0);
    const baseMax = Math.max(length - 2 * fixedOffset, 0);
    const steps = Math.floor(baseMax / 32);
    const base = steps * 32;
    const first = fixedOffset;
    const last = fixedOffset + base;
    const variants = symmetryVariants(first, last, steps, safeHoles, length / 2);
    const primaryCoordinates = variants[0] ?? [Math.round(first), Math.round(last)];
    const primarySockets = socketsFromStart(primaryCoordinates, first, standardStartSocketIndex);
    const intervalSteps = intervalStepsFromCoordinates(primaryCoordinates);

    return {
      offset: fixedOffset,
      base,
      steps,
      intervalSteps,
      coordinates: primaryCoordinates.map((coordinate, index) => ({
        coordinate,
        socket: primarySockets[index] ?? '-',
      })),
      variants: variants.map((values, index) => ({
        title: variants.length === 1 ? 'Фиксированный отступ' : `Вариант ${index + 1}`,
        values,
        sockets: socketsFromStart(values, first, standardStartSocketIndex),
      })),
    };
  }

  const baseMax = Math.max(length - 2 * minOffset, 0);
  const steps = Math.floor(baseMax / 32);
  const base = steps * 32;
  const offset = (length - base) / 2;
  const first = offset;
  const last = offset + base;
  const variants = symmetryVariants(first, last, steps, safeHoles, length / 2);
  const primaryCoordinates = variants[0] ?? [Math.round(first), Math.round(last)];
  const primarySockets = socketsFromStart(primaryCoordinates, first, standardStartSocketIndex);
  const intervalSteps = intervalStepsFromCoordinates(primaryCoordinates);

  return {
    offset,
    base,
    steps,
    intervalSteps,
    coordinates: primaryCoordinates.map((coordinate, index) => ({
      coordinate,
      socket: primarySockets[index] ?? '-',
    })),
    variants: variants.map((values, index) => ({
      title: variants.length === 1 ? 'Сохранить крайние' : `Вариант ${index + 1}`,
      values,
      sockets: socketsFromStart(values, first, standardStartSocketIndex),
    })),
  };
}

export function shiftedVariants(result: Result, shiftInput: number) {
  const shift = Math.abs(shiftInput || 0);

  if (shift === 0) {
    return [];
  }

  return [
    {
      title: `Смещение влево -${shift} мм`,
      values: result.coordinates.map((item) => item.coordinate - shift),
      sockets: result.coordinates.map((item) => item.socket),
    },
    {
      title: `Смещение вправо +${shift} мм`,
      values: result.coordinates.map((item) => item.coordinate + shift),
      sockets: result.coordinates.map((item) => item.socket),
    },
  ];
}
