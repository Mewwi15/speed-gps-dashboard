import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
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
import type { Mode } from "@/constants/speed";
import useLocation, {
  LOCATING_LABEL,
  type TrackPoint,
} from "@/contexts/LocationContext";
import useSettings from "@/contexts/SettingsContext";

/** What the history list needs, without dragging every point into memory. */
export type TripSummary = {
  id: string;
  startedAt: number;
  endedAt: number;
  /** Metres. */
  distanceM: number;
  /** Milliseconds of wall-clock time between start and stop. */
  durationMs: number;
  /** km/h. */
  topSpeed: number;
  /** km/h, averaged over the moving portion only. */
  avgSpeed: number;
  /** Metres climbed, summing only the positive altitude changes. */
  elevationGainM: number;
  /** Highest point reached, in metres. */
  maxAltitudeM: number;
  /** Milliseconds spent actually moving, as opposed to stopped. */
  movingMs: number;
  /** Saved snapshot of the route, written on first viewing. */
  snapshotUri?: string;
  mode: Mode;
  /** 0-100, docked for each harsh acceleration and each harsh brake. */
  driveScore: number;
  harshAccelerations: number;
  harshBrakes: number;
  startAddress: string;
  endAddress: string;
  /** Recorded from the scripted demo drive rather than real GPS. */
  isDemo?: boolean;
};

/** A moment the vehicle was pushed or pulled hard enough to notice. */
export type DriveEvent = {
  kind: "accel" | "brake";
  latitude: number;
  longitude: number;
  /** Magnitude in m/s², always positive. */
  force: number;
};

export type Trip = TripSummary & {
  points: TrackPoint[];
  events: DriveEvent[];
};

type TripsValue = {
  isRecording: boolean;
  /** Points captured since recording began. */
  recordingPoints: TrackPoint[];
  recordingStartedAt: number | null;
  trips: TripSummary[];
  isLoading: boolean;
  startRecording: () => void;
  /** Stops and saves. Returns the trip id, or null when nothing was worth keeping. */
  stopRecording: () => Promise<string | null>;
  loadTrip: (id: string) => Promise<Trip | null>;
  deleteTrip: (id: string) => Promise<void>;
  /** Stores a rendered map image against a trip, keeping it out of the cache. */
  attachSnapshot: (id: string, temporaryUri: string) => Promise<string | null>;
};

/** Where route images live, safe from the OS clearing the cache. */
const SNAPSHOT_DIR = "trip-maps";

const INDEX_KEY = "speedgps.trips.index.v1";
const tripKey = (id: string) => `speedgps.trip.${id}.v1`;

/** Trips shorter than this are treated as accidental taps and discarded. */
const MIN_TRIP_POINTS = 2;

const TripsContext = createContext<TripsValue | null>(null);

/**
 * The placeholder is a live status, not a place. Saving it would stamp a
 * trip with "Locating…" whenever recording crosses a fix it has not
 * geocoded yet — most easily by leaving the demo mid-recording.
 */
function nameOrUnknown(label: string) {
  return !label || label === LOCATING_LABEL ? "Unknown Road" : label;
}

function metresBetween(a: TrackPoint, b: TrackPoint) {
  const latRadians = (a.latitude * Math.PI) / 180;
  const dLat = (b.latitude - a.latitude) * 111320;
  const dLng = (b.longitude - a.longitude) * 111320 * Math.cos(latRadians);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Thresholds in m/s². Everyday driving sits under 2.5; insurers treat anything
 * past 3 as a harsh event, and braking harder than accelerating is both more
 * common and more telling, so it is weighted more heavily in the score.
 */
const HARSH_ACCEL_MPS2 = 3;
const HARSH_BRAKE_MPS2 = -3;
const ACCEL_PENALTY = 6;
const BRAKE_PENALTY = 8;

function summarise(points: TrackPoint[]) {
  let distanceM = 0;
  let topSpeed = 0;
  let movingSum = 0;
  let movingCount = 0;
  let elevationGainM = 0;
  let maxAltitudeM = points.length > 0 ? points[0].altitude : 0;
  let movingMs = 0;
  let harshAccelerations = 0;
  let harshBrakes = 0;
  const events: DriveEvent[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (point.speed > topSpeed) topSpeed = point.speed;
    if (point.altitude > maxAltitudeM) maxAltitudeM = point.altitude;
    if (point.speed > 0) {
      movingSum += point.speed;
      movingCount += 1;
    }
    if (i > 0) {
      const previous = points[i - 1];
      distanceM += metresBetween(previous, point);
      const climb = point.altitude - previous.altitude;
      if (climb > 0) elevationGainM += climb;
      if (point.speed > 0) movingMs += Math.max(point.t - previous.t, 0);

      const seconds = Math.max(point.t - previous.t, 1) / 1000;
      const accelMps2 = (point.speed - previous.speed) / 3.6 / seconds;
      if (accelMps2 >= HARSH_ACCEL_MPS2) {
        harshAccelerations += 1;
        events.push({
          kind: "accel",
          latitude: point.latitude,
          longitude: point.longitude,
          force: Math.round(accelMps2 * 10) / 10,
        });
      } else if (accelMps2 <= HARSH_BRAKE_MPS2) {
        harshBrakes += 1;
        events.push({
          kind: "brake",
          latitude: point.latitude,
          longitude: point.longitude,
          force: Math.round(Math.abs(accelMps2) * 10) / 10,
        });
      }
    }
  }

  const penalty =
    harshAccelerations * ACCEL_PENALTY + harshBrakes * BRAKE_PENALTY;

  return {
    distanceM,
    topSpeed,
    avgSpeed: movingCount > 0 ? Math.round(movingSum / movingCount) : 0,
    elevationGainM: Math.round(elevationGainM),
    maxAltitudeM,
    movingMs,
    harshAccelerations,
    harshBrakes,
    driveScore: Math.max(0, Math.min(100, 100 - penalty)),
    events,
  };
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const { path, address, isDemo } = useLocation();
  const { mode } = useSettings();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingPoints, setRecordingPoints] = useState<TrackPoint[]>([]);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null,
  );
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const startAddress = useRef("");
  const wasDemo = useRef(false);
  const latestAddress = useRef(address);
  latestAddress.current = address;
  const isDemoRef = useRef(isDemo);
  isDemoRef.current = isDemo;

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(INDEX_KEY)
      .then((raw) => {
        if (cancelled) return;
        setTrips(raw ? (JSON.parse(raw) as TripSummary[]) : []);
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Toggling the demo mid-recording restarts the recording. The simulated
  // drive and the real one are different places on Earth, and a buffer that
  // spans the switch joins them with a straight line across the ocean — tens
  // of thousands of kilometres of "distance" that never happened. It would
  // also keep the demo flag from the moment Start was pressed, leaving a
  // simulated trip unmarked.
  const previousDemo = useRef(isDemo);
  useEffect(() => {
    if (previousDemo.current === isDemo) return;
    previousDemo.current = isDemo;
    if (!isRecording) return;
    startAddress.current = latestAddress.current;
    wasDemo.current = isDemo;
    setRecordingPoints([]);
    setRecordingStartedAt(Date.now());
  }, [isDemo, isRecording]);

  // Mirror new fixes into the recording buffer. The provider reads the live
  // path rather than opening its own subscription, so there is still exactly
  // one GPS watcher in the app.
  useEffect(() => {
    if (!isRecording || path.length === 0) return;
    const latest = path[path.length - 1];
    setRecordingPoints((previous) => {
      const last = previous[previous.length - 1];
      if (last && last.t === latest.t) return previous;
      return [...previous, latest];
    });
  }, [isRecording, path]);

  const startRecording = useCallback(() => {
    startAddress.current = latestAddress.current;
    wasDemo.current = isDemoRef.current;
    setRecordingPoints([]);
    setRecordingStartedAt(Date.now());
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    const points = recordingPoints;
    const startedAt = recordingStartedAt ?? Date.now();
    setRecordingStartedAt(null);

    if (points.length < MIN_TRIP_POINTS) {
      setRecordingPoints([]);
      return null;
    }

    const endedAt = Date.now();
    const measured = summarise(points);
    const { events, ...summaryFields } = measured;

    const summary: TripSummary = {
      id: `${startedAt}`,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      mode,
      startAddress: nameOrUnknown(startAddress.current),
      endAddress: nameOrUnknown(latestAddress.current),
      isDemo: wasDemo.current,
      ...summaryFields,
    };

    const trip: Trip = { ...summary, points, events };
    const nextIndex = [summary, ...trips];

    try {
      await AsyncStorage.setItem(tripKey(trip.id), JSON.stringify(trip));
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(nextIndex));
      setTrips(nextIndex);
    } catch {
      // Keep the in-memory list usable even if the write failed.
      setTrips(nextIndex);
    }

    setRecordingPoints([]);
    return trip.id;
  }, [recordingPoints, recordingStartedAt, mode, trips]);

  const loadTrip = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(tripKey(id));
      return raw ? (JSON.parse(raw) as Trip) : null;
    } catch {
      return null;
    }
  }, []);

  const attachSnapshot = useCallback(
    async (id: string, temporaryUri: string) => {
      try {
        const folder = new Directory(Paths.document, SNAPSHOT_DIR);
        if (!folder.exists) folder.create({ intermediates: true });

        const source = new File(temporaryUri);
        const destination = new File(folder, `${id}.png`);
        if (destination.exists) destination.delete();
        source.move(destination);

        const uri = destination.uri;
        const nextIndex = trips.map((trip) =>
          trip.id === id ? { ...trip, snapshotUri: uri } : trip,
        );
        setTrips(nextIndex);
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(nextIndex));

        const raw = await AsyncStorage.getItem(tripKey(id));
        if (raw) {
          const trip = JSON.parse(raw) as Trip;
          await AsyncStorage.setItem(
            tripKey(id),
            JSON.stringify({ ...trip, snapshotUri: uri }),
          );
        }
        return uri;
      } catch {
        // A missing image is cosmetic; the trip itself is already saved.
        return null;
      }
    },
    [trips],
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      const nextIndex = trips.filter((trip) => trip.id !== id);
      setTrips(nextIndex);
      try {
        await AsyncStorage.removeItem(tripKey(id));
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(nextIndex));
        const image = new File(Paths.document, SNAPSHOT_DIR, `${id}.png`);
        if (image.exists) image.delete();
      } catch {}
    },
    [trips],
  );

  const value = useMemo<TripsValue>(
    () => ({
      isRecording,
      recordingPoints,
      recordingStartedAt,
      trips,
      isLoading,
      startRecording,
      stopRecording,
      loadTrip,
      deleteTrip,
      attachSnapshot,
    }),
    [
      isRecording,
      recordingPoints,
      recordingStartedAt,
      trips,
      isLoading,
      startRecording,
      stopRecording,
      loadTrip,
      deleteTrip,
      attachSnapshot,
    ],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export default function useTrips() {
  const value = useContext(TripsContext);
  if (!value) {
    throw new Error("useTrips must be used inside a <TripsProvider>");
  }
  return value;
}
