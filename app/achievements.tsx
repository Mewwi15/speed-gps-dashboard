import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ACHIEVEMENTS,
  computeLevel,
  computeStats,
  computeXp,
} from "@/constants/achievements";
import { BADGE_ART } from "@/constants/badgeArt";
import { colors, radius, shadow, softEdge } from "@/constants/theme";
import { fonts, tracking } from "@/constants/typography";
import useSettings from "@/contexts/SettingsContext";
import useTrips from "@/contexts/TripsContext";

export default function Achievements() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips } = useTrips();
  const { gaugeColor } = useSettings();

  const { stats, xp, level } = useMemo(() => {
    const computed = computeStats(trips);
    const earned = computeXp(computed, trips);
    return { stats: computed, xp: earned, level: computeLevel(earned) };
  }, [trips]);

  const unlocked = ACHIEVEMENTS.filter((achievement) => {
    const { current, target } = achievement.measure(stats);
    return current >= target;
  }).length;

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/history")
          }
          activeOpacity={0.7}
        >
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSubtitle}>
            {unlocked} of {ACHIEVEMENTS.length} unlocked
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.levelCard, { borderColor: `${gaugeColor}55` }]}>
          <View style={styles.levelTopRow}>
            <View>
              <Text style={styles.levelLabel}>Level {level.level}</Text>
              <Text style={[styles.levelTitle, { color: gaugeColor }]}>
                {level.title}
              </Text>
            </View>
            <Text style={styles.xpTotal}>{xp.toLocaleString()} XP</Text>
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

          <Text style={styles.levelHint}>
            {level.isMax
              ? "Top level reached."
              : `${level.xpForNext - level.xpIntoLevel} XP to level ${level.level + 1}`}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Earned from your trips</Text>

        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((achievement) => {
            const { current, target } = achievement.measure(stats);
            const isDone = current >= target;
            const progress = Math.min(current / target, 1);

            return (
              <View
                key={achievement.id}
                style={[
                  styles.badge,
                  isDone
                    ? { borderColor: `${gaugeColor}66` }
                    : { borderColor: colors.border },
                ]}
              >
                <Image
                  source={BADGE_ART[achievement.id]}
                  style={[styles.badgeArt, !isDone && styles.badgeArtLocked]}
                  resizeMode="contain"
                />

                <Text
                  style={[
                    styles.badgeTitle,
                    isDone ? { color: gaugeColor } : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {achievement.title}
                </Text>

                <Text style={styles.badgeDetail} numberOfLines={2}>
                  {achievement.detail}
                </Text>

                <View style={styles.badgeTrack}>
                  <View
                    style={[
                      styles.badgeFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: isDone
                          ? gaugeColor
                          : colors.surfaceHigh,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.badgeCount}>
                  {achievement.format(Math.min(current, target))} /{" "}
                  {achievement.format(target)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  backButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontFamily: fonts.bold,
    letterSpacing: tracking.heading,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  scroll: { paddingHorizontal: 18, gap: 12 },
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
    ...shadow.card,
  },
  levelTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  levelLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  levelTitle: {
    fontSize: 26,
    fontFamily: fonts.bold,
    letterSpacing: tracking.heading,
    marginTop: 2,
  },
  xpTotal: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  levelTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  levelFill: { height: 10, borderRadius: radius.pill },
  levelHint: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontFamily: fonts.regular,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 8,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  badge: {
    width: "48.5%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 8,
    ...shadow.card,
    ...softEdge,
  },
  badgeArt: { width: 72, height: 72, marginBottom: 2 },
  badgeArtLocked: { opacity: 0.22 },
  badgeTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.semibold,
    textAlign: "center",
  },
  badgeDetail: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontFamily: fonts.regular,
    textAlign: "center",
    lineHeight: 16,
    minHeight: 32,
  },
  badgeCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  badgeTrack: {
    width: "100%",
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  badgeFill: { height: 6, borderRadius: radius.pill },
});
