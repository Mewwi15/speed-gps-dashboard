import { DEMO_ROUTE } from "@/constants/demoRoute";

/**
 * Mock data for demos and screenshots, so the gauge, the coloured route and the
 * trip stats can be shown without driving.
 *
 * Position is read off a real route traced along Bangkok streets rather than
 * integrated from a heading, which is what stops the trail cutting through
 * buildings. Both demo modes walk the same road: the scripted run eases towards
 * each road's typical speed, and the hand-driven mode travels at whatever the
 * presenter holds on the throttle.
 */

export type DemoFix = {
  latitude: number;
  longitude: number;
  /** Metres per second, matching what expo-location reports. */
  speedMps: number;
  altitude: number;
  /** Degrees clockwise from north. */
  heading: number;
  /** Street name to display, always in English. */
  label: string;
};

export const DEMO_TICK_MS = 1000;

/** How quickly speed eases towards a road's typical pace, per second. */
const SPEED_EASE = 0.22;

const METRES_PER_DEG_LAT = 111320;

function metresBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
) {
  const latRadians = (aLat * Math.PI) / 180;
  const dLat = (bLat - aLat) * METRES_PER_DEG_LAT;
  const dLng = (bLng - aLng) * METRES_PER_DEG_LAT * Math.cos(latRadians);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function bearingBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const latRadians = (aLat * Math.PI) / 180;
  const dLat = bLat - aLat;
  const dLng = (bLng - aLng) * Math.cos(latRadians);
  const degrees = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/** Distance from the route start to each point, in metres. */
const CUMULATIVE: number[] = (() => {
  const totals = [0];
  for (let i = 1; i < DEMO_ROUTE.length; i += 1) {
    const [prevLat, prevLng] = DEMO_ROUTE[i - 1];
    const [lat, lng] = DEMO_ROUTE[i];
    totals.push(totals[i - 1] + metresBetween(prevLat, prevLng, lat, lng));
  }
  return totals;
})();

export const ROUTE_LENGTH_M = CUMULATIVE[CUMULATIVE.length - 1];

export const ROUTE_START = {
  latitude: DEMO_ROUTE[0][0],
  longitude: DEMO_ROUTE[0][1],
};

/** Binary search for the segment containing a distance along the route. */
function segmentAt(distanceM: number) {
  let low = 0;
  let high = CUMULATIVE.length - 1;
  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (CUMULATIVE[mid] <= distanceM) low = mid;
    else high = mid;
  }
  return low;
}

export type RoutePosition = {
  latitude: number;
  longitude: number;
  heading: number;
  road: string;
  /** Typical speed for the road under the vehicle, in km/h. */
  typicalKmh: number;
};

/** Interpolates a position, heading and road name at a distance along the route. */
export function positionAlongRoute(distanceM: number): RoutePosition {
  const wrapped = ((distanceM % ROUTE_LENGTH_M) + ROUTE_LENGTH_M) % ROUTE_LENGTH_M;
  const index = segmentAt(wrapped);
  const next = Math.min(index + 1, DEMO_ROUTE.length - 1);

  const [lat, lng, typicalKmh, road] = DEMO_ROUTE[index];
  const [nextLat, nextLng] = DEMO_ROUTE[next];

  const segmentLength = CUMULATIVE[next] - CUMULATIVE[index];
  const ratio = segmentLength > 0 ? (wrapped - CUMULATIVE[index]) / segmentLength : 0;

  return {
    latitude: lat + (nextLat - lat) * ratio,
    longitude: lng + (nextLng - lng) * ratio,
    heading: Math.round(bearingBetween(lat, lng, nextLat, nextLng)),
    road,
    typicalKmh,
  };
}

/** Where the drive has reached, carried between ticks. */
export type DriveState = {
  /** Metres travelled along the route. */
  distanceM: number;
  speedKmh: number;
};

export function createDriveState(): DriveState {
  return { distanceM: 0, speedKmh: 0 };
}

/**
 * Advances one second at the given speed. Passing `null` lets the scripted run
 * pick the speed from the road the car is currently on.
 */
export function stepDrive(
  state: DriveState,
  requestedKmh: number | null,
): { next: DriveState; fix: DemoFix } {
  const here = positionAlongRoute(state.distanceM);

  const target = requestedKmh ?? here.typicalKmh;
  const speedKmh =
    requestedKmh !== null
      ? requestedKmh
      : state.speedKmh + (target - state.speedKmh) * SPEED_EASE;

  const metres = (speedKmh * 1000) / 3600;
  const next: DriveState = {
    distanceM: state.distanceM + metres,
    speedKmh,
  };

  const moved = positionAlongRoute(next.distanceM);

  return {
    next,
    fix: {
      latitude: moved.latitude,
      longitude: moved.longitude,
      speedMps: metres,
      altitude: 12,
      heading: moved.heading,
      label: moved.road,
    },
  };
}
