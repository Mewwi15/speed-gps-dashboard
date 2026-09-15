export const UNITS = ["KM/H", "MPH", "KNOT"] as const;
export type Unit = (typeof UNITS)[number];

export const MODES = ["Car", "Moto", "Bike", "Run"] as const;
export type Mode = (typeof MODES)[number];

/** Multiply a km/h value by these to get the displayed unit. */
export const UNIT_MULTIPLIERS: Record<Unit, number> = {
  "KM/H": 1,
  MPH: 0.621371,
  KNOT: 0.539957,
};

export type GaugeSpec = {
  max: number;
  redline: number;
  tick: number;
  num: number;
};

export const GAUGE_CONFIG: Record<Mode, Record<Unit, GaugeSpec>> = {
  Car: {
    "KM/H": { max: 240, redline: 160, tick: 4, num: 20 },
    MPH: { max: 160, redline: 100, tick: 2, num: 20 },
    KNOT: { max: 140, redline: 90, tick: 2, num: 20 },
  },
  Moto: {
    "KM/H": { max: 200, redline: 140, tick: 4, num: 20 },
    MPH: { max: 140, redline: 90, tick: 2, num: 20 },
    KNOT: { max: 120, redline: 80, tick: 2, num: 20 },
  },
  Bike: {
    "KM/H": { max: 60, redline: 40, tick: 1, num: 5 },
    MPH: { max: 40, redline: 25, tick: 1, num: 5 },
    KNOT: { max: 40, redline: 25, tick: 1, num: 5 },
  },
  Run: {
    "KM/H": { max: 40, redline: 25, tick: 1, num: 5 },
    MPH: { max: 25, redline: 15, tick: 1, num: 5 },
    KNOT: { max: 25, redline: 15, tick: 1, num: 5 },
  },
};

/**
 * Route colouring, cool through hot. The ramp is walked by the speed's
 * position on the current gauge, so a bike at 50 km/h reads as hot while a
 * car at the same speed still reads as cool.
 */
const SPEED_RAMP = [
  "#22d3ee",
  "#22c55e",
  "#a3e635",
  "#facc15",
  "#fb923c",
  "#ff1e56",
] as const;

export function speedColor(speedKmh: number, gaugeMax: number): string {
  const ratio = gaugeMax > 0 ? speedKmh / gaugeMax : 0;
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const index = Math.min(
    Math.round(clamped * (SPEED_RAMP.length - 1)),
    SPEED_RAMP.length - 1,
  );
  return SPEED_RAMP[index];
}

/** Legend entries for the map, evenly spaced across the current gauge. */
export function speedLegend(gaugeMax: number) {
  return SPEED_RAMP.map((color, i) => ({
    color,
    label: Math.round((gaugeMax / (SPEED_RAMP.length - 1)) * i).toString(),
  }));
}

/**
 * Formats a coordinate with its hemisphere. The readout used to print "N" and
 * "E" unconditionally, so anywhere west of Greenwich or south of the equator
 * was labelled wrongly.
 */
export function formatLatitude(latitude: number) {
  return `${Math.abs(latitude).toFixed(4)}\u00b0 ${latitude >= 0 ? "N" : "S"}`;
}

export function formatLongitude(longitude: number) {
  return `${Math.abs(longitude).toFixed(4)}\u00b0 ${longitude >= 0 ? "E" : "W"}`;
}

/**
 * Speeds below this read as stationary, filtering the jitter GPS reports at
 * rest. A single 1 m/s floor suited cars but erased walking and jogging
 * entirely, so the floor follows the vehicle.
 */
export const SPEED_FLOOR_MPS: Record<Mode, number> = {
  Car: 1,
  Moto: 1,
  Bike: 0.4,
  Run: 0.3,
};
