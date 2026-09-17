import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { speedColor } from "@/constants/speed";
import { colors, radius, shadow, softEdge } from "@/constants/theme";
import { fonts } from "@/constants/typography";
import type { TrackPoint } from "@/contexts/LocationContext";

/** Bars drawn across the card. More than this and each becomes a hairline. */
const MAX_BARS = 54;

type Props = {
  points: TrackPoint[];
  gaugeMax: number;
  unit: string;
  multiplier: number;
};

/**
 * Speed across the whole trip, drawn as plain Views rather than pulling in a
 * charting library: the shape is the point, and a column per sample is all it
 * takes. Long trips are averaged down into buckets so the bars stay readable.
 */
export default function SpeedChart({
  points,
  gaugeMax,
  unit,
  multiplier,
}: Props) {
  const bars = useMemo(() => {
    if (points.length === 0) return [];
    const bucketSize = Math.max(1, Math.ceil(points.length / MAX_BARS));
    const buckets: { speed: number }[] = [];
    for (let i = 0; i < points.length; i += bucketSize) {
      const slice = points.slice(i, i + bucketSize);
      const total = slice.reduce((sum, point) => sum + point.speed, 0);
      buckets.push({ speed: total / slice.length });
    }
    return buckets;
  }, [points]);

  const peak = useMemo(
    () => bars.reduce((highest, bar) => Math.max(highest, bar.speed), 0),
    [bars],
  );

  // A flat trip would divide by zero; a floor also stops a slow crawl filling
  // the card to the brim and reading as fast.
  const ceiling = Math.max(peak * 1.15, 10);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Speed through the trip</Text>
        <Text style={styles.peak}>
          peak {Math.round(peak * multiplier)} {unit.toLowerCase()}
        </Text>
      </View>

      <View style={styles.plot}>
        {bars.map((bar, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${Math.max((bar.speed / ceiling) * 100, 2)}%`,
                backgroundColor: speedColor(bar.speed, gaugeMax),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>Start</Text>
        <Text style={styles.axisLabel}>Finish</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...shadow.card,
    ...softEdge,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  peak: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.regular },
  plot: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 88,
    gap: 2,
  },
  bar: { flex: 1, borderRadius: 2, minHeight: 2 },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  axisLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.regular,
  },
});
