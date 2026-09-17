import { Link, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { computeLevel, computeStats, computeXp } from "@/constants/achievements";
import { MASCOT } from "@/constants/badgeArt";
import { UNIT_MULTIPLIERS } from "@/constants/speed";
import { colors, radius, shadow, softEdge } from "@/constants/theme";
import { fonts, tracking } from "@/constants/typography";
import useSettings from "@/contexts/SettingsContext";
import useTrips, { type TripSummary } from "@/contexts/TripsContext";

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

function formatWhen(epoch: number) {
  const date = new Date(epoch);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} · ${hours}:${minutes}`;
}

export default function History() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, isLoading } = useTrips();
  const { unit, gaugeColor } = useSettings();
  const multiplier = UNIT_MULTIPLIERS[unit];

  const level = useMemo(() => {
    const stats = computeStats(trips);
    return computeLevel(computeXp(stats, trips));
  }, [trips]);

  const renderTrip = ({ item }: { item: TripSummary }) => (
    <Link href={{ pathname: "/trip/[id]", params: { id: item.id } }} asChild>
      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        <View style={styles.thumbWrap}>
          {item.snapshotUri ? (
            <Image
              source={{ uri: item.snapshotUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnail} />
          )}
          {/* Snapshots come out of iOS in light mode; this settles them into
              the dark list instead of glaring out of it. */}
          <View style={styles.thumbScrim} />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardWhen}>{formatWhen(item.startedAt)}</Text>

          <Text style={styles.cardRoute} numberOfLines={2}>
            <Text style={{ color: colors.routeStart }}>{item.startAddress}</Text>
            <Text style={styles.routeJoin}> to </Text>
            <Text style={{ color: colors.routeEnd }}>{item.endAddress}</Text>
          </Text>

          <View style={styles.cardStats}>
            <Text style={styles.statText}>
              {formatDistance(item.distanceM)}
            </Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>
              {formatDuration(item.durationMs)}
            </Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>
              {Math.round(item.topSpeed * multiplier)} {unit.toLowerCase()}
            </Text>
          </View>

          <View style={styles.cardTags}>
            <Text style={[styles.modeTag, { color: gaugeColor }]}>
              {item.mode}
            </Text>
            {item.isDemo && <Text style={styles.demoTag}>Simulated</Text>}
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          activeOpacity={0.7}
        >
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Trip history</Text>
          <Text style={styles.headerSubtitle}>
            {trips.length} saved {trips.length === 1 ? "trip" : "trips"}
          </Text>
        </View>
      </View>

      <Link href="/achievements" asChild>
        <TouchableOpacity style={styles.levelCard} activeOpacity={0.85}>
          <View style={styles.levelTopRow}>
            <Text style={styles.levelLabel}>
              Level {level.level} · {level.title}
            </Text>
            <Text style={[styles.levelCta, { color: gaugeColor }]}>
              See progress
            </Text>
          </View>
          <View style={styles.levelTrack}>
            <View
              style={[
                styles.levelFill,
                {
                  width: `${level.progress * 100}%`,
                  backgroundColor: gaugeColor,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      </Link>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>Loading…</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.empty}>
          <Image
            source={MASCOT.sleep}
            style={styles.emptyArt}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Nothing recorded yet</Text>
          <Text style={styles.emptyBody}>
            Tap Start recording on the cockpit and go for a drive. Your route
            and speeds land here the moment you stop.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  backLabel: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
  },
  backButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    fontSize: 22,
    letterSpacing: tracking.heading,
  },
  headerSubtitle: {
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    fontSize: 9.5,
    letterSpacing: 1,
    marginTop: 2,
  },
  levelCard: {
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 10,
    ...shadow.card,
    ...softEdge,
  },
  levelTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  levelCta: { fontSize: 13, fontFamily: fonts.medium },
  levelTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  levelFill: { height: 8, borderRadius: radius.pill },
  list: { paddingHorizontal: 18, gap: 10 },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    ...shadow.card,
    ...softEdge,
  },
  thumbWrap: {
    width: 104,
    height: 104,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  thumbnail: { width: "100%", height: "100%" },
  thumbScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,21,24,0.28)",
  },
  cardBody: { flex: 1, justifyContent: "center", gap: 5 },
  cardWhen: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  cardRoute: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    lineHeight: 19,
  },
  routeJoin: { color: colors.textMuted, fontFamily: fonts.regular },
  cardStats: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  statDot: { color: colors.textMuted, fontSize: 13 },
  cardTags: { flexDirection: "row", gap: 8, marginTop: 1 },
  modeTag: { fontSize: 12, fontFamily: fonts.medium },
  demoTag: {
    color: colors.warning,
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 44,
  },
  emptyArt: { width: 180, height: 180, opacity: 0.8, marginBottom: 4 },
  emptyTitle: {
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    fontSize: 17,
    letterSpacing: tracking.heading,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
