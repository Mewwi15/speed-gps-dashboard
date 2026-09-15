import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";

function formatTime(date: Date) {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDate(date: Date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${d} ${m} ${date.getFullYear()}`;
}

/**
 * Kept apart from the dial on purpose. The clock re-renders every second, and
 * when it lived inside GaugePanel that tick dragged the whole gauge, ticks and
 * numerals through a re-render with it.
 */
function CockpitClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.date}>{formatDate(now)}</Text>
      <Text style={styles.time}>{formatTime(now)}</Text>
    </View>
  );
}

export default memo(CockpitClock);

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    top: 68,
    alignSelf: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  date: {
    fontWeight: "700",
    fontFamily: "monospace",
    color: colors.textMuted,
    fontSize: 9.5,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  time: {
    fontWeight: "800",
    fontFamily: "monospace",
    color: colors.textPrimary,
    fontSize: 17,
    letterSpacing: 2,
  },
});
