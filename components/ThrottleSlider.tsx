import { useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { colors, radius } from "@/constants/theme";

type Props = {
  value: number;
  max: number;
  accent: string;
  unit: string;
  onChange: (value: number) => void;
};

/**
 * Drag-to-set throttle for presenting. Built on PanResponder rather than a
 * slider dependency: the only behaviour needed is "wherever the finger is, that
 * is the speed", including tapping straight to a value mid-sentence.
 */
export default function ThrottleSlider({
  value,
  max,
  accent,
  unit,
  onChange,
}: Props) {
  const [width, setWidth] = useState(1);
  const widthRef = useRef(1);
  const maxRef = useRef(max);
  maxRef.current = max;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromX = (x: number) => {
    const ratio = Math.min(Math.max(x / widthRef.current, 0), 1);
    onChangeRef.current(Math.round(ratio * maxRef.current));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => setFromX(event.nativeEvent.locationX),
      onPanResponderMove: (event) => setFromX(event.nativeEvent.locationX),
    }),
  ).current;

  const filled = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>THROTTLE</Text>
        <Text style={[styles.readout, { color: accent }]}>
          {value}
          <Text style={styles.readoutUnit}> {unit}</Text>
        </Text>
      </View>

      <View
        style={styles.track}
        onLayout={(event: LayoutChangeEvent) => {
          const next = event.nativeEvent.layout.width;
          widthRef.current = next;
          setWidth(next);
        }}
        {...responder.panHandlers}
      >
        <View style={styles.trackBase} />
        <View
          style={[
            styles.trackFill,
            { width: `${filled * 100}%`, backgroundColor: accent },
          ]}
        />
        <View
          style={[
            styles.knob,
            {
              left: Math.max(Math.min(filled * width, width) - 13, 0),
              borderColor: accent,
            },
          ]}
        />
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>0</Text>
        <Text style={styles.scaleLabel}>{Math.round(max / 2)}</Text>
        <Text style={styles.scaleLabel}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  readout: { fontSize: 20, fontWeight: "900", fontStyle: "italic" },
  readoutUnit: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  track: { height: 34, justifyContent: "center" },
  trackBase: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
  },
  trackFill: {
    position: "absolute",
    height: 8,
    borderRadius: radius.pill,
  },
  knob: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.bgRaised,
    borderWidth: 3,
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  scaleLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
