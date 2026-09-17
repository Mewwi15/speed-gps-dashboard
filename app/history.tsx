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
import { EMPTY_TRIPS_ART } from "@/constants/badgeArt";
import { UNIT_MULTIPLIERS } from "@/constants/speed";
import { colors, radius, shadow } from "@/constants/theme";
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
        <View style={styles.cardTop}>
          <Text style={[styles.modeTag, { color: gaugeColor }]}>
            {item.mode}
          </Text>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardWhen}>{formatWhen(item.startedAt)}</Text>
            <Text style={styles.cardRoute} numberOfLines={1}>
              <Text style={{ color: colors.routeStart }}>
                {item.startAddress}
              </Text>
              <Text style={styles.routeJoin}> To </Text>
              <Text style={{ color: colors.routeEnd }}>{item.endAddress}</Text>
            </Text>
          </View>
        </View>

        {item.snapshotUri && (
          <Image
            source={{ uri: item.snapshotUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}

        <View style={styles.cardStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatDistance(item.distanceM)}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatDuration(item.durationMs)}
            </Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round(item.topSpeed * multiplier)}
            </Text>
            <Text style={styles.statLabel}>Top {unit}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round(item.avgSpeed * multiplier)}
            </Text>
            <Text style={styles.statLabel}>Avg {unit}</Text>
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
        <TouchableOpacity
          style={[styles.levelCard, { borderColor: `${gaugeColor}55` }]}
          activeOpacity={0.85}
        >
          <View style={styles.levelCopy}>
            <Text style={styles.levelLabel}>
              Level {level.level} · {level.title}
            </Text>
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
          </View>
          <Text style={[styles.levelCta, { color: gaugeColor }]}>Progress</Text>
        </TouchableOpacity>
      </Link>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>Loading…</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.empty}>
          <Image
            source={EMPTY_TRIPS_ART}
            style={styles.emptyArt}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyBody}>
            Tap Start recording on the cockpit, then ride. Your route and speeds
            are saved here when you stop.
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
  modeTag: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 0,
    minWidth: 46,
  },
  backButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  levelCopy: { flex: 1, gap: 10 },
  levelLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  levelTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  levelFill: { height: 8, borderRadius: radius.pill },
  levelCta: { fontSize: 13, fontFamily: fonts.medium },
  list: { paddingHorizontal: 18, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow.card,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitleBlock: { flex: 1, gap: 3 },
  cardWhen: {
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    fontSize: 15,
    letterSpacing: 0,
  },
  cardRoute: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0,
  },
  thumbnail: {
    width: "100%",
    height: 120,
    borderRadius: radius.md,
    marginTop: 14,
    backgroundColor: colors.surfaceAlt,
  },
  routeJoin: { color: colors.textMuted },
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statDivider: { width: 1, height: 26, backgroundColor: colors.border },
  statValue: {
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    fontSize: 17,
    letterSpacing: tracking.heading,
  },
  statLabel: {
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    fontSize: 8.5,
    letterSpacing: 1,
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
