import AsyncStorage from "@react-native-async-storage/async-storage";
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
import useLocation, { type TrackPoint } from "@/contexts/LocationContext";
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
  mode: Mode;
  startAddress: string;
  endAddress: string;
  /** Recorded from the scripted demo drive rather than real GPS. */
  isDemo?: boolean;
};

export type Trip = TripSummary & { points: TrackPoint[] };

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
};

const INDEX_KEY = "speedgps.trips.index.v1";
const tripKey = (id: string) => `speedgps.trip.${id}.v1`;

/** Trips shorter than this are treated as accidental taps and discarded. */
const MIN_TRIP_POINTS = 2;

const TripsContext = createContext<TripsValue | null>(null);

function metresBetween(a: TrackPoint, b: TrackPoint) {
  const latRadians = (a.latitude * Math.PI) / 180;
  const dLat = (b.latitude - a.latitude) * 111320;
  const dLng = (b.longitude - a.longitude) * 111320 * Math.cos(latRadians);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function summarise(points: TrackPoint[]) {
  let distanceM = 0;
  let topSpeed = 0;
  let movingSum = 0;
  let movingCount = 0;
  let elevationGainM = 0;

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (point.speed > topSpeed) topSpeed = point.speed;
    if (point.speed > 0) {
      movingSum += point.speed;
      movingCount += 1;
    }
    if (i > 0) {
      distanceM += metresBetween(points[i - 1], point);
      const climb = point.altitude - points[i - 1].altitude;
      if (climb > 0) elevationGainM += climb;
    }
  }

  return {
    distanceM,
    topSpeed,
    avgSpeed: movingCount > 0 ? Math.round(movingSum / movingCount) : 0,
    elevationGainM: Math.round(elevationGainM),
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
    const summary: TripSummary = {
      id: `${startedAt}`,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      mode,
      startAddress: startAddress.current || "Unknown",
      endAddress: latestAddress.current || "Unknown",
      isDemo: wasDemo.current,
      ...summarise(points),
    };

    const trip: Trip = { ...summary, points };
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

  const deleteTrip = useCallback(
    async (id: string) => {
      const nextIndex = trips.filter((trip) => trip.id !== id);
      setTrips(nextIndex);
      try {
        await AsyncStorage.removeItem(tripKey(id));
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(nextIndex));
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
