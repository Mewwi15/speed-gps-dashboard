import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RouteMap from "@/components/RouteMap";
import { GAUGE_CONFIG, UNIT_MULTIPLIERS } from "@/constants/speed";
import { colors, radius, shadow } from "@/constants/theme";
import useSettings from "@/contexts/SettingsContext";
import useTrips, { type Trip } from "@/contexts/TripsContext";

/** Points advanced per tick while replaying. */
const REPLAY_STEP = 2;
const REPLAY_INTERVAL_MS = 80;

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatDistance(metres: number) {
  return metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(2)} km`;
}

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loadTrip, deleteTrip } = useTrips();
  const { unit, gaugeColor } = useSettings();
  const multiplier = UNIT_MULTIPLIERS[unit];

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const trackWidth = useRef(1);

  useEffect(() => {
    let cancelled = false;
    loadTrip(id)
      .then((result) => {
        if (cancelled) return;
        setTrip(result);
        setCursor(result ? result.points.length - 1 : 0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, loadTrip]);

  useEffect(() => {
    if (!isPlaying || !trip) return;
    const timer = setInterval(() => {
      setCursor((previous) => {
        const next = previous + REPLAY_STEP;
        if (next >= trip.points.length - 1) {
          setPlaying(false);
          return trip.points.length - 1;
        }
        return next;
      });
    }, REPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPlaying, trip]);

  if (isLoading) {
    return (
      <View style={[styles.wrapper, styles.centred, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Loading trip…</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.wrapper, styles.centred, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>This trip could not be loaded.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.link, { color: gaugeColor }]}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gaugeMax = GAUGE_CONFIG[trip.mode][unit].max;
  const scrubPoint = trip.points[Math.min(cursor, trip.points.length - 1)];
  const progress =
    trip.points.length > 1 ? cursor / (trip.points.length - 1) : 1;

  const seekFromTouch = (x: number) => {
    const ratio = Math.min(Math.max(x / trackWidth.current, 0), 1);
    setCursor(Math.round(ratio * (trip.points.length - 1)));
  };

  const stats = [
    { label: "DISTANCE", value: formatDistance(trip.distanceM) },
    { label: "TIME", value: formatDuration(trip.durationMs) },
    {
      label: `TOP ${unit}`,
      value: Math.round(trip.topSpeed * multiplier).toString(),
    },
    {
      label: `AVG ${unit}`,
      value: Math.round(trip.avgSpeed * multiplier).toString(),
    },
    { label: "ELEVATION", value: `${trip.elevationGainM} m` },
    { label: "POINTS", value: trip.points.length.toString() },
  ];

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonLabel}>BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {trip.startAddress.toUpperCase()} → {trip.endAddress.toUpperCase()}
          </Text>
          <Text style={styles.headerSubtitle}>
            {new Date(trip.startedAt).toLocaleString("en-GB")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={async () => {
            await deleteTrip(trip.id);
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonLabel, { color: colors.danger }]}>
            DELETE
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapHolder}>
        <RouteMap
          points={trip.points}
          gaugeMax={gaugeMax}
          accent={gaugeColor}
          scrubPoint={scrubPoint}
          fitToRoute
        />
      </View>

      <View style={styles.replayBar}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: gaugeColor }]}
          onPress={() => {
            if (!isPlaying && cursor >= trip.points.length - 1) setCursor(0);
            setPlaying((value) => !value);
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.playLabel, { color: colors.bg }]}>
            {isPlaying ? "II" : "PLAY"}
          </Text>
        </TouchableOpacity>

        <Pressable
          style={styles.track}
          onLayout={(event: LayoutChangeEvent) => {
            trackWidth.current = event.nativeEvent.layout.width;
          }}
          onPress={(event) => seekFromTouch(event.nativeEvent.locationX)}
        >
          <View style={styles.trackBase} />
          <View
            style={[
              styles.trackFill,
              { width: `${progress * 100}%`, backgroundColor: gaugeColor },
            ]}
          />
        </Pressable>

        <View style={styles.replaySpeed}>
          <Text style={[styles.replaySpeedValue, { color: gaugeColor }]}>
            {Math.round(scrubPoint.speed * multiplier)}
          </Text>
          <Text style={styles.replaySpeedUnit}>{unit}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.statsGrid,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg },
  centred: { alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.textMuted, fontSize: 13 },
  link: { fontSize: 12, fontWeight: "900", letterSpacing: 1.6 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  headerTitles: { flex: 1, gap: 3 },
  headerTitle: {
    fontWeight: "900",
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontWeight: "700",
    color: colors.textMuted,
    fontSize: 10,
  },
  buttonLabel: {
    fontWeight: "900",
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  playLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  iconButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mapHolder: {
    height: 300,
    marginHorizontal: 18,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  replayBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...shadow.card,
  },
  playButton: {
    height: 40,
    paddingHorizontal: 14,
    minWidth: 54,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  track: { flex: 1, height: 28, justifyContent: "center" },
  trackBase: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
  },
  trackFill: {
    position: "absolute",
    height: 6,
    borderRadius: radius.pill,
  },
  replaySpeed: { alignItems: "center", minWidth: 46 },
  replaySpeedValue: { fontSize: 19, fontWeight: "900", fontStyle: "italic" },
  replaySpeedUnit: {
    fontWeight: "800",
    color: colors.textMuted,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    padding: 18,
  },
  statCard: {
    width: "31%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: "center",
    gap: 5,
    ...shadow.card,
  },
  statValue: {
    fontWeight: "900",
    fontStyle: "italic",
    color: colors.textPrimary,
    fontSize: 16,
  },
  statLabel: {
    fontWeight: "800",
    color: colors.textMuted,
    fontSize: 8.5,
    letterSpacing: 1,
  },
});
