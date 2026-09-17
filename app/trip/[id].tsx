import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RouteMap, { type RouteMapHandle } from "@/components/RouteMap";
import SpeedChart from "@/components/SpeedChart";
import { MASCOT } from "@/constants/badgeArt";
import { GAUGE_CONFIG, UNITS, UNIT_MULTIPLIERS } from "@/constants/speed";
import { colors, radius, shadow } from "@/constants/theme";
import { fonts, tracking } from "@/constants/typography";
import useSettings from "@/contexts/SettingsContext";
import useTrips, { type Trip } from "@/contexts/TripsContext";

/** Points advanced per tick while replaying. */
const REPLAY_STEP = 2;
const REPLAY_INTERVAL_MS = 80;

/** The map needs a beat to draw tiles before it is worth photographing. */
const SNAPSHOT_DELAY_MS = 1800;

const MODE_NAMES = {
  Car: "Car",
  Moto: "Motorcycle",
  Bike: "Bicycle",
  Run: "Running",
} as const;

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

/** Minutes per kilometre, the way a running app states it. */
function formatPace(distanceM: number, movingMs: number) {
  if (distanceM < 10 || movingMs < 1000) return "—";
  const minutesPerKm = movingMs / 60000 / (distanceM / 1000);
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

function formatClockTime(epoch: number) {
  const date = new Date(epoch);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function formatFullDate(epoch: number) {
  const date = new Date(epoch);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "long" });
  return `${day} ${month} ${date.getFullYear()}`;
}

export default function TripSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loadTrip, deleteTrip, attachSnapshot } = useTrips();
  const { unit, gaugeColor } = useSettings();
  const multiplier = UNIT_MULTIPLIERS[unit];

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [isReviewing, setReviewing] = useState(false);
  const mapHandle = useRef<RouteMapHandle>(null);
  const trackWidth = useRef(1);
  const hasCaptured = useRef(false);

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

  // The first time a trip is opened, photograph its route so the history list
  // and this header can show it without mounting a live map every time.
  const captureRoute = useCallback(() => {
    if (hasCaptured.current || !trip || trip.snapshotUri) return;
    hasCaptured.current = true;
    setTimeout(async () => {
      const temporary = await mapHandle.current?.capture();
      if (!temporary) return;
      const saved = await attachSnapshot(trip.id, temporary);
      if (saved) setTrip((current) => (current ? { ...current, snapshotUri: saved } : current));
    }, SNAPSHOT_DELAY_MS);
  }, [trip, attachSnapshot]);

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
        <TouchableOpacity onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/history")
          }>
          <Text style={[styles.link, { color: gaugeColor }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gaugeMax = GAUGE_CONFIG[trip.mode][unit].max;
  const scrubPoint = trip.points[Math.min(cursor, trip.points.length - 1)];
  const progress = trip.points.length > 1 ? cursor / (trip.points.length - 1) : 1;

  const seekFromTouch = (x: number) => {
    const ratio = Math.min(Math.max(x / trackWidth.current, 0), 1);
    setCursor(Math.round(ratio * (trip.points.length - 1)));
  };

  // A finished trip deserves a reaction, not just a table of numbers.
  const praise =
    trip.driveScore >= 95
      ? "Beautifully smooth."
      : trip.driveScore >= 80
        ? "Nicely driven."
        : trip.driveScore >= 60
          ? "Decent run."
          : "Room to smooth out.";

  const scoreTone =
    trip.driveScore >= 85
      ? colors.routeStart
      : trip.driveScore >= 65
        ? colors.warning
        : colors.routeEnd;

  const headline = [
    { label: "Distance", value: formatDistance(trip.distanceM) },
    { label: "Total time", value: formatDuration(trip.durationMs) },
    {
      label: `Top ${unit}`,
      value: Math.round(trip.topSpeed * multiplier).toString(),
    },
  ];

  const details = [
    { label: "Moving time", value: formatDuration(trip.movingMs) },
    {
      label: "Stopped time",
      value: formatDuration(Math.max(trip.durationMs - trip.movingMs, 0)),
    },
    { label: "Pace", value: formatPace(trip.distanceM, trip.movingMs) },
    { label: "Elevation gain", value: `${trip.elevationGainM} m` },
    { label: "Max altitude", value: `${trip.maxAltitudeM} m` },
    { label: "GPS points", value: trip.points.length.toString() },
  ];

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/history")
          }
          activeOpacity={0.7}
        >
          <Text style={styles.headerButtonLabel}>Done</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your trip</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            Alert.alert(
              "Delete this trip?",
              "The route and everything recorded with it will be gone for good.",
              [
                { text: "Keep it", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteTrip(trip.id);
                    if (router.canGoBack()) router.back();
                    else router.replace("/history");
                  },
                },
              ],
            )
          }
          activeOpacity={0.7}
        >
          <Text style={[styles.headerButtonLabel, { color: colors.danger }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <Text style={styles.date}>{formatFullDate(trip.startedAt)}</Text>
          <Text style={styles.route} numberOfLines={3}>
            <Text style={{ color: colors.routeStart }}>{trip.startAddress}</Text>
            <Text style={styles.routeJoin}> To </Text>
            <Text style={{ color: colors.routeEnd }}>{trip.endAddress}</Text>
          </Text>
          <Text style={styles.window}>
            {formatClockTime(trip.startedAt)} – {formatClockTime(trip.endedAt)}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { borderColor: `${gaugeColor}66` }]}>
              <Text style={[styles.badgeText, { color: gaugeColor }]}>
                {MODE_NAMES[trip.mode]}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unit}</Text>
            </View>
            {trip.isDemo && (
              <View style={[styles.badge, styles.badgeWarn]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>
                  Simulated
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headlineRow}>
          {headline.map((stat) => (
            <View key={stat.label} style={styles.headlineStat}>
              <Text style={styles.headlineValue}>{stat.value}</Text>
              <Text style={styles.headlineLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.scoreCard, { borderColor: `${scoreTone}55` }]}>
          <View style={styles.scoreLeft}>
            <Text style={[styles.scoreValue, { color: scoreTone }]}>
              {trip.driveScore}
            </Text>
            <Text style={styles.scoreOutOf}>/ 100</Text>
          </View>
          <Image source={MASCOT.cheer} style={styles.scoreMascot} resizeMode="contain" />
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreTitle}>{praise}</Text>
            <Text style={styles.scoreDetail}>
              {trip.harshAccelerations === 0 && trip.harshBrakes === 0
                ? "Smooth throughout — no harsh acceleration or braking."
                : `${trip.harshBrakes} harsh brake${
                    trip.harshBrakes === 1 ? "" : "s"
                  }, ${trip.harshAccelerations} hard acceleration${
                    trip.harshAccelerations === 1 ? "" : "s"
                  }.`}
            </Text>
          </View>
        </View>

        <View style={styles.mapHolder}>
          {trip.snapshotUri && !isReviewing ? (
            <Image
              source={{ uri: trip.snapshotUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <RouteMap
              ref={mapHandle}
              points={trip.points}
              gaugeMax={gaugeMax}
              accent={gaugeColor}
              events={trip.events}
              scrubPoint={isReviewing ? scrubPoint : null}
              fitToRoute
              showLegend={isReviewing}
              onRouteFramed={captureRoute}
            />
          )}
        </View>

        {isReviewing ? (
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
                {isPlaying ? "Pause" : "Play"}
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
        ) : (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => {
              setReviewing(true);
              setCursor(0);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.reviewLabel, { color: gaugeColor }]}>
              Replay this trip
            </Text>
          </TouchableOpacity>
        )}

        <SpeedChart
          points={trip.points}
          gaugeMax={gaugeMax}
          unit={unit}
          multiplier={multiplier}
        />

        <View style={styles.speedTable}>
          <View style={styles.speedHeaderRow}>
            <Text style={[styles.speedUnitCell, styles.speedHeadLabel]}>
              Speed
            </Text>
            <Text style={[styles.speedValueCell, styles.speedHeadLabel]}>
              Top
            </Text>
            <Text style={[styles.speedValueCell, styles.speedHeadLabel]}>
              Average
            </Text>
          </View>

          {UNITS.map((row) => {
            const factor = UNIT_MULTIPLIERS[row];
            const isSelected = row === unit;
            return (
              <View key={row} style={styles.speedRow}>
                <Text
                  style={[
                    styles.speedUnitCell,
                    isSelected && { color: gaugeColor },
                  ]}
                >
                  {row.toLowerCase()}
                </Text>
                <Text
                  style={[
                    styles.speedValueCell,
                    styles.speedFigure,
                    isSelected && { color: gaugeColor },
                  ]}
                >
                  {Math.round(trip.topSpeed * factor)}
                </Text>
                <Text
                  style={[
                    styles.speedValueCell,
                    styles.speedFigure,
                    isSelected && { color: gaugeColor },
                  ]}
                >
                  {Math.round(trip.avgSpeed * factor)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.detailGrid}>
          {details.map((stat) => (
            <View key={stat.label} style={styles.detailCard}>
              <Text style={styles.detailValue}>{stat.value}</Text>
              <Text style={styles.detailLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg },
  centred: { alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.textMuted, fontSize: 13 },
  link: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.6 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  headerButton: { paddingVertical: 10, paddingHorizontal: 4, minWidth: 62 },
  headerButtonLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.semibold,
    letterSpacing: tracking.heading,
  },
  scroll: { paddingHorizontal: 18, gap: 11 },
  identity: { gap: 4, marginBottom: 2 },
  date: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.medium,
    letterSpacing: 1,
  },
  route: {
    color: colors.textPrimary,
    fontSize: 22,
    fontFamily: fonts.semibold,
    lineHeight: 29,
    letterSpacing: tracking.heading,
  },
  routeJoin: { color: colors.textMuted, fontFamily: fonts.regular },
  window: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.regular },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  badgeWarn: { borderColor: `${colors.warning}66` },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  headlineRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    ...shadow.card,
  },
  headlineStat: { flex: 1, alignItems: "center", gap: 6 },
  headlineValue: {
    color: colors.textPrimary,
    fontSize: 27,
    fontFamily: fonts.bold,
    letterSpacing: tracking.display,
  },
  headlineLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  mapHolder: {
    height: 330,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reviewButton: {
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  reviewLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    letterSpacing: 0,
  },
  replayBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
    minWidth: 68,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  playLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    letterSpacing: 0,
  },
  track: { flex: 1, height: 28, justifyContent: "center" },
  trackBase: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
  },
  trackFill: { position: "absolute", height: 6, borderRadius: radius.pill },
  replaySpeed: { alignItems: "center", minWidth: 46 },
  replaySpeedValue: {
    fontSize: 21,
    letterSpacing: tracking.display,
  },
  replaySpeedUnit: {
    color: colors.textMuted,
    fontSize: 8,
    fontFamily: fonts.semibold,
    letterSpacing: 0.8,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...shadow.card,
  },
  scoreLeft: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  scoreValue: {
    fontSize: 42,
    fontFamily: fonts.bold,
    letterSpacing: tracking.display,
  },
  scoreOutOf: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  scoreMascot: { width: 52, height: 52 },
  scoreCopy: { flex: 1, gap: 4 },
  scoreTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  scoreDetail: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  speedTable: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...shadow.card,
  },
  speedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  speedRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  speedUnitCell: {
    flex: 1.2,
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  speedValueCell: {
    flex: 1,
    textAlign: "right",
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  speedFigure: {
    fontSize: 19,
    fontFamily: fonts.semibold,
    letterSpacing: tracking.heading,
  },
  speedHeadLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.medium,
    letterSpacing: 1,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9,
  },
  detailCard: {
    width: "32%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 4,
    ...shadow.card,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontFamily: fonts.semibold,
    letterSpacing: tracking.heading,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontFamily: fonts.semibold,
    letterSpacing: 0.9,
    textAlign: "center",
  },
});
