import { Link, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UNIT_MULTIPLIERS } from "@/constants/speed";
import { colors, radius, shadow } from "@/constants/theme";
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

  const renderTrip = ({ item }: { item: TripSummary }) => (
    <Link href={{ pathname: "/trip/[id]", params: { id: item.id } }} asChild>
      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <Text style={[styles.modeTag, { color: gaugeColor }]}>
            {item.mode.toUpperCase()}
          </Text>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardWhen}>{formatWhen(item.startedAt)}</Text>
            <Text style={styles.cardRoute} numberOfLines={1}>
              {item.startAddress.toUpperCase()} →{" "}
              {item.endAddress.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatDistance(item.distanceM)}
            </Text>
            <Text style={styles.statLabel}>DISTANCE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatDuration(item.durationMs)}
            </Text>
            <Text style={styles.statLabel}>TIME</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round(item.topSpeed * multiplier)}
            </Text>
            <Text style={styles.statLabel}>TOP {unit}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round(item.avgSpeed * multiplier)}
            </Text>
            <Text style={styles.statLabel}>AVG {unit}</Text>
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
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backLabel}>BACK</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>TRIP HISTORY</Text>
          <Text style={styles.headerSubtitle}>
            {trips.length} SAVED {trips.length === 1 ? "TRIP" : "TRIPS"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>Loading…</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>NO TRIPS YET</Text>
          <Text style={styles.emptyBody}>
            Tap START RECORDING on the cockpit, then ride. Your route and speeds
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
    fontWeight: "900",
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  modeTag: {
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1.4,
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
    fontWeight: "900",
    color: colors.textPrimary,
    fontSize: 19,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontWeight: "800",
    color: colors.textMuted,
    fontSize: 9.5,
    letterSpacing: 2,
    marginTop: 2,
  },
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
    fontWeight: "800",
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  cardRoute: {
    fontWeight: "700",
    color: colors.textMuted,
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
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
    fontWeight: "900",
    fontStyle: "italic",
    color: colors.textPrimary,
    fontSize: 15,
  },
  statLabel: {
    fontWeight: "800",
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
  emptyTitle: {
    fontWeight: "900",
    color: colors.textSecondary,
    fontSize: 14,
    letterSpacing: 2,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
