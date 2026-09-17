import type { TripSummary } from "@/contexts/TripsContext";

/**
 * Progression computed from the trips already on the device. Nothing here is
 * mocked or seeded: every number traces back to a recorded drive, which is
 * what makes it worth showing rather than a screen of invented badges.
 */

export type PlayerStats = {
  tripCount: number;
  totalDistanceM: number;
  totalMovingMs: number;
  topSpeedKmh: number;
  bestScore: number;
  longestTripMs: number;
  nightTrips: number;
  /** Distinct calendar days with at least one trip. */
  activeDays: number;
};

export function computeStats(trips: TripSummary[]): PlayerStats {
  const days = new Set<string>();
  let totalDistanceM = 0;
  let totalMovingMs = 0;
  let topSpeedKmh = 0;
  let bestScore = 0;
  let longestTripMs = 0;
  let nightTrips = 0;

  for (const trip of trips) {
    totalDistanceM += trip.distanceM;
    totalMovingMs += trip.movingMs;
    topSpeedKmh = Math.max(topSpeedKmh, trip.topSpeed);
    bestScore = Math.max(bestScore, trip.driveScore ?? 0);
    longestTripMs = Math.max(longestTripMs, trip.durationMs);

    const started = new Date(trip.startedAt);
    const hour = started.getHours();
    if (hour >= 20 || hour < 5) nightTrips += 1;
    days.add(started.toDateString());
  }

  return {
    tripCount: trips.length,
    totalDistanceM,
    totalMovingMs,
    topSpeedKmh,
    bestScore,
    longestTripMs,
    nightTrips,
    activeDays: days.size,
  };
}

/**
 * Experience. Distance is the backbone, a flat bonus rewards finishing a trip
 * at all, and drive score folds in so that covering ground carelessly earns
 * less than covering it smoothly.
 */
export function computeXp(stats: PlayerStats, trips: TripSummary[]) {
  const distanceXp = Math.round((stats.totalDistanceM / 1000) * 12);
  const tripXp = stats.tripCount * 40;
  const smoothnessXp = trips.reduce(
    (total, trip) => total + Math.round((trip.driveScore ?? 0) / 2),
    0,
  );
  return distanceXp + tripXp + smoothnessXp;
}

const LEVEL_TITLES = [
  "Rookie",
  "Commuter",
  "Road Reader",
  "Smooth Operator",
  "Route Master",
  "Telemetry Pro",
  "Track Ready",
  "Grand Tourer",
];

/** Each level costs a little more than the last. */
function xpForLevel(level: number) {
  return Math.round(250 * level ** 1.35);
}

export function computeLevel(xp: number) {
  let level = 1;
  while (level < LEVEL_TITLES.length && xp >= xpForLevel(level)) level += 1;

  const floor = level === 1 ? 0 : xpForLevel(level - 1);
  const ceiling = xpForLevel(level);
  const isMax = level >= LEVEL_TITLES.length;

  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xpIntoLevel: xp - floor,
    xpForNext: isMax ? 0 : ceiling - floor,
    progress: isMax ? 1 : Math.min((xp - floor) / (ceiling - floor), 1),
    isMax,
  };
}

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  /** Current value and the value that unlocks it, for the progress bar. */
  measure: (stats: PlayerStats) => { current: number; target: number };
  format: (value: number) => string;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-drive",
    title: "First Drive",
    detail: "Record your first trip",
    measure: (s) => ({ current: s.tripCount, target: 1 }),
    format: (v) => `${v}`,
  },
  {
    id: "ten-trips",
    title: "Regular",
    detail: "Record 10 trips",
    measure: (s) => ({ current: s.tripCount, target: 10 }),
    format: (v) => `${v}`,
  },
  {
    id: "explorer",
    title: "Explorer",
    detail: "Cover 10 km in total",
    measure: (s) => ({ current: s.totalDistanceM / 1000, target: 10 }),
    format: (v) => `${v.toFixed(1)} km`,
  },
  {
    id: "road-warrior",
    title: "Road Warrior",
    detail: "Cover 100 km in total",
    measure: (s) => ({ current: s.totalDistanceM / 1000, target: 100 }),
    format: (v) => `${v.toFixed(1)} km`,
  },
  {
    id: "century",
    title: "Century",
    detail: "Reach 100 km/h",
    measure: (s) => ({ current: s.topSpeedKmh, target: 100 }),
    format: (v) => `${Math.round(v)} km/h`,
  },
  {
    id: "smooth",
    title: "Smooth Operator",
    detail: "Finish a trip scoring 95 or better",
    measure: (s) => ({ current: s.bestScore, target: 95 }),
    format: (v) => `${Math.round(v)}`,
  },
  {
    id: "endurance",
    title: "Endurance",
    detail: "Drive for 30 minutes without stopping the recording",
    measure: (s) => ({ current: s.longestTripMs / 60000, target: 30 }),
    format: (v) => `${Math.floor(v)} min`,
  },
  {
    id: "night-rider",
    title: "Night Rider",
    detail: "Record a trip between 8pm and 5am",
    measure: (s) => ({ current: s.nightTrips, target: 1 }),
    format: (v) => `${v}`,
  },
];
