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
