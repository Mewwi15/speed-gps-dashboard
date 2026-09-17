import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ACHIEVEMENTS,
  computeLevel,
  computeStats,
  computeXp,
} from "@/constants/achievements";
import { colors, radius, shadow } from "@/constants/theme";
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

        {ACHIEVEMENTS.map((achievement) => {
          const { current, target } = achievement.measure(stats);
          const isDone = current >= target;
          const progress = Math.min(current / target, 1);

          return (
            <View
              key={achievement.id}
              style={[
                styles.badge,
                isDone && { borderColor: `${gaugeColor}66` },
              ]}
            >
              <View style={styles.badgeTop}>
                <Text
                  style={[
                    styles.badgeTitle,
                    isDone ? { color: gaugeColor } : undefined,
                  ]}
                >
                  {achievement.title}
                </Text>
                <Text style={styles.badgeCount}>
                  {achievement.format(Math.min(current, target))} /{" "}
                  {achievement.format(target)}
                </Text>
              </View>

              <Text style={styles.badgeDetail}>{achievement.detail}</Text>

              <View style={styles.badgeTrack}>
                <View
                  style={[
                    styles.badgeFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: isDone ? gaugeColor : colors.surfaceHigh,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
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
    borderWidth: 1,
    borderColor: colors.border,
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
  badge: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  badgeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  badgeTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  badgeCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  badgeDetail: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  badgeTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  badgeFill: { height: 6, borderRadius: radius.pill },
});
