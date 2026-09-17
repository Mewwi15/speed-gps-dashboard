import * as Location from "expo-location";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SPEED_FLOOR_MPS } from "@/constants/speed";
import useSettings from "@/contexts/SettingsContext";
import {
  createDriveState,
  DEMO_TICK_MS,
  ROUTE_START,
  ROUTE_START_LABEL,
  stepDrive,
  type DriveState,
} from "@/constants/demoDrive";

/** Shown while no street name is known yet. Never saved onto a trip. */
export const LOCATING_LABEL = "Locating…";

export type TrackPoint = {
  latitude: number;
  longitude: number;
  /** Speed at this point, in km/h, matching what the gauge showed. */
  speed: number;
  /** Metres above sea level, for a trip's elevation gain. */
  altitude: number;
  /** Epoch millis; also the point's identity when recording a trip. */
  t: number;
};

export type LocationValue = {
  speed: number;
  topSpeed: number;
  avgSpeed: number;
  lat: number;
  lng: number;
  alt: number;
  /** Degrees clockwise from true north, or -1 when the fix has no heading. */
  heading: number;
  /**
   * Degrees of heading change per second, signed: negative turns left. Used to
   * lean the map marker into a corner.
   */
  turnRate: number;
  address: string;
  errorMsg: string | null;
  /** False until the first fix arrives, so the map does not jump to 0,0. */
  hasFix: boolean;
  path: TrackPoint[];
  peakPoint: TrackPoint | null;
  /** Distance covered along the recorded route, in metres. */
  distanceM: number;
  /** True while synthetic fixes are driving the app instead of the GPS. */
  isDemo: boolean;
  setDemo: (on: boolean) => void;
  /** Asks for location again after the user has changed their mind. */
  retryPermission: () => void;
  /** "auto" replays the scripted drive; "manual" follows the throttle. */
  demoMode: DemoMode;
  setDemoMode: (mode: DemoMode) => void;
  /** Speed the presenter is holding, in km/h, while driving by hand. */
  manualSpeed: number;
  setManualSpeed: (kmh: number) => void;
};

export type DemoMode = "auto" | "manual";

/** Points closer together than this are dropped, to keep the route light. */
const MIN_POINT_DISTANCE_M = 5;

/** Oldest points are discarded past this many. */
const MAX_PATH_POINTS = 5000;

const LocationContext = createContext<LocationValue | null>(null);

function metresBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const latRadians = (a.latitude * Math.PI) / 180;
  const dLat = (b.latitude - a.latitude) * 111320;
  const dLng = (b.longitude - a.longitude) * 111320 * Math.cos(latRadians);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

type Fix = {
  latitude: number;
  longitude: number;
  altitude: number;
  speedMps: number;
  heading: number;
  timestamp: number;
  /** Set by the demo scripts, which carry their own English street names. */
  label?: string;
};

/**
 * Owns the single GPS subscription for the whole app. Mounted once in the root
 * layout: calling watchPositionAsync per screen would double the battery cost
 * and give each screen its own top/average speed.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  // Mounted inside SettingsProvider, so the noise floor can follow the vehicle:
  // a threshold that makes sense for a car would erase a jogger entirely.
  const { mode } = useSettings();
  const [speed, setSpeed] = useState<number>(0);
  const [topSpeed, setTopSpeed] = useState<number>(0);
  const [avgSpeed, setAvgSpeed] = useState<number>(0);
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [alt, setAlt] = useState<number>(0);
  const [heading, setHeading] = useState<number>(-1);
  const [turnRate, setTurnRate] = useState<number>(0);
  const [address, setAddress] = useState<string>("Loading...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasFix, setHasFix] = useState<boolean>(false);
  const [path, setPath] = useState<TrackPoint[]>([]);
  const [peakPoint, setPeakPoint] = useState<TrackPoint | null>(null);
  const [distanceM, setDistanceM] = useState<number>(0);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [permissionAttempt, setPermissionAttempt] = useState<number>(0);
  const [demoMode, setDemoMode] = useState<DemoMode>("auto");
  const [manualSpeed, setManualSpeed] = useState<number>(0);

  const speedSum = useRef(0);
  const speedCount = useRef(0);
  const lastGeocodeTime = useRef(0);
  const topSpeedSoFar = useRef(0);
  const distanceSoFar = useRef(0);
  const lastAppendedPoint = useRef<TrackPoint | null>(null);
  const latestPosition = useRef({ latitude: 0, longitude: 0 });
  const previousHeading = useRef<number | null>(null);
  const previousHeadingAt = useRef<number>(0);
  const speedFloor = useRef(SPEED_FLOOR_MPS.Car);
  speedFloor.current = SPEED_FLOOR_MPS[mode];
  const manualSpeedRef = useRef(0);
  manualSpeedRef.current = manualSpeed;
  const demoModeRef = useRef<DemoMode>("auto");
  demoModeRef.current = demoMode;

  /** Shared by the real subscription and the demo ticker. */
  const ingest = useCallback((fix: Fix) => {
    const speedMps = Math.max(fix.speedMps, 0);
    let currentSpeedKmh = 0;
    if (speedMps >= speedFloor.current) {
      currentSpeedKmh = Math.round(speedMps * 3.6);
    }

    latestPosition.current = {
      latitude: fix.latitude,
      longitude: fix.longitude,
    };

    if (fix.label) setAddress(fix.label);

    setLat(fix.latitude);
    setLng(fix.longitude);
    setAlt(Math.round(fix.altitude));
    setSpeed(currentSpeedKmh);
    setHeading(fix.heading);
    setHasFix(true);

    // Signed shortest angle between the last heading and this one, per second.
    if (fix.heading >= 0) {
      const last = previousHeading.current;
      if (last !== null) {
        const seconds = Math.max(fix.timestamp - previousHeadingAt.current, 1) / 1000;
        let delta = ((fix.heading - last + 540) % 360) - 180;
        setTurnRate(delta / seconds);
      }
      previousHeading.current = fix.heading;
      previousHeadingAt.current = fix.timestamp;
    }

    if (currentSpeedKmh > topSpeedSoFar.current) {
      topSpeedSoFar.current = currentSpeedKmh;
      setTopSpeed(currentSpeedKmh);
      setPeakPoint({
        latitude: fix.latitude,
        longitude: fix.longitude,
        speed: currentSpeedKmh,
        altitude: Math.round(fix.altitude),
        t: fix.timestamp,
      });
    }

    if (currentSpeedKmh > 0) {
      speedSum.current += currentSpeedKmh;
      speedCount.current += 1;
      setAvgSpeed(Math.round(speedSum.current / speedCount.current));
    }

    // Decided outside the state updater: the updater has to stay pure, and
    // distance would be counted twice if accumulated in there.
    const point: TrackPoint = {
      latitude: fix.latitude,
      longitude: fix.longitude,
      speed: currentSpeedKmh,
      altitude: Math.round(fix.altitude),
      t: fix.timestamp,
    };
    const lastPoint = lastAppendedPoint.current;
    if (!lastPoint || metresBetween(lastPoint, point) >= MIN_POINT_DISTANCE_M) {
      if (lastPoint) {
        distanceSoFar.current += metresBetween(lastPoint, point);
        setDistanceM(distanceSoFar.current);
      }
      lastAppendedPoint.current = point;
      setPath((previous) => {
        const next = [...previous, point];
        return next.length > MAX_PATH_POINTS
          ? next.slice(next.length - MAX_PATH_POINTS)
          : next;
      });
    }
  }, []);

  /** Street name lookups are throttled; Apple's geocoder rejects rapid calls. */
  const refreshAddress = useCallback(async () => {
    const now = Date.now();
    if (now - lastGeocodeTime.current < 10000) return;
    lastGeocodeTime.current = now;
    try {
      const geo = await Location.reverseGeocodeAsync(latestPosition.current);
      if (geo && geo.length > 0) {
        const place = geo[0];
        setAddress(
          place.street || place.name || place.district || "Unknown Road",
        );
      }
    } catch {
      // Leave the last known street name in place rather than blanking it.
    }
  }, []);

  // Real GPS. Suspended while the demo drive is running so the two cannot
  // fight over the same state.
  useEffect(() => {
    if (isDemo) return;

    let subscriber: Location.LocationSubscription | null = null;
    let cancelled = false;

    const initTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Location access is off");
          return;
        }
        setErrorMsg(null);
        if (cancelled) return;

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location) => {
            ingest({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              altitude: location.coords.altitude || 0,
              speedMps: location.coords.speed || 0,
              heading: location.coords.heading ?? -1,
              timestamp: location.timestamp ?? Date.now(),
            });
            refreshAddress();
          },
        );
      } catch {
        setErrorMsg("Error getting location");
      }
    };

    initTracking();

    return () => {
      cancelled = true;
      if (subscriber) subscriber.remove();
    };
  }, [isDemo, ingest, refreshAddress, permissionAttempt]);

  // Demo drive. Both modes follow the same real Bangkok route; the scripted
  // run takes its speed from each road, while hand-driving takes it from the
  // throttle the presenter is holding.
  useEffect(() => {
    if (!isDemo) return;

    let state: DriveState = createDriveState();

    const timer = setInterval(() => {
      const requested = demoModeRef.current === "manual" ? manualSpeedRef.current : null;
      const { next, fix } = stepDrive(state, requested);
      state = next;
      ingest({ ...fix, timestamp: Date.now() });
    }, DEMO_TICK_MS);

    return () => clearInterval(timer);
  }, [isDemo, ingest]);

  const retryPermission = useCallback(() => {
    setErrorMsg(null);
    setPermissionAttempt((attempt) => attempt + 1);
  }, []);

  const setDemo = useCallback((on: boolean) => {
    // Start each demo from a clean slate so the stats read as one drive.
    speedSum.current = 0;
    speedCount.current = 0;
    topSpeedSoFar.current = 0;
    distanceSoFar.current = 0;
    lastAppendedPoint.current = null;
    setTopSpeed(0);
    setAvgSpeed(0);
    setDistanceM(0);
    setPeakPoint(null);
    setPath([]);
    setSpeed(0);
    setManualSpeed(0);
    if (on) {
      setErrorMsg(null);
      // Put the map on the route's first street straight away, rather than
      // leaving it wherever the last real fix was.
      setLat(ROUTE_START.latitude);
      setLng(ROUTE_START.longitude);
      // The street readout is the one piece of state a real fix leaves behind.
      // Without this the first second of a demo — and any trip started inside
      // it — is stamped with wherever the phone actually is.
      setAddress(ROUTE_START_LABEL);
      latestPosition.current = ROUTE_START;
      setHasFix(true);
    } else {
      // Back to real GPS: drop the scripted street so the next fix re-geocodes
      // instead of leaving a Bangkok road name over the user's own location.
      setAddress(LOCATING_LABEL);
      lastGeocodeTime.current = 0;
    }
    setIsDemo(on);
  }, []);

  const value = useMemo<LocationValue>(
    () => ({
      speed,
      topSpeed,
      avgSpeed,
      lat,
      lng,
      alt,
      heading,
      turnRate,
      address,
      errorMsg,
      hasFix,
      path,
      peakPoint,
      distanceM,
      isDemo,
      setDemo,
      retryPermission,
      demoMode,
      setDemoMode,
      manualSpeed,
      setManualSpeed,
    }),
    [
      speed,
      topSpeed,
      avgSpeed,
      lat,
      lng,
      alt,
      heading,
      address,
      errorMsg,
      hasFix,
      path,
      peakPoint,
      distanceM,
      isDemo,
      setDemo,
      demoMode,
      setDemoMode,
      manualSpeed,
      setManualSpeed,
      demoMode,
      setDemoMode,
      manualSpeed,
      setManualSpeed,
    ],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export default function useLocation() {
  const value = useContext(LocationContext);
  if (!value) {
    throw new Error("useLocation must be used inside a <LocationProvider>");
  }
  return value;
}
