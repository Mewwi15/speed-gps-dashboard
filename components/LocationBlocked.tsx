import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import { fonts } from "@/constants/typography";

type Props = {
  message: string;
  accent: string;
  onRetry: () => void;
};

/**
 * Shown when location is unavailable. The previous version printed the error
 * and stopped there, which left no way forward: iOS only shows its permission
 * prompt once, so a user who tapped Don't Allow could never recover without
 * deleting the app.
 */
export default function LocationBlocked({ message, accent, onRetry }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{message}</Text>
      <Text style={styles.body}>
        Speed and route come from your location. Grant access to use the
        cockpit, or turn on the demo drive to explore the app without it.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primary, { backgroundColor: accent }]}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryLabel, { color: colors.bg }]}>
            Try again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => Linking.openSettings()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryLabel}>Open settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: fonts.semibold,
    letterSpacing: -0.4,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 21,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  primary: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { fontSize: 15, fontFamily: fonts.semibold },
  secondary: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: fonts.medium,
  },
});
