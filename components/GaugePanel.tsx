import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import CockpitClock from "@/components/CockpitClock";
import {
  formatLatitude,
  formatLongitude,
  MODES,
  UNITS,
  UNIT_MULTIPLIERS,
} from "@/constants/speed";
import { colors, radius, shadow } from "@/constants/theme";
import { fonts, tracking } from "@/constants/typography";
import LocationBlocked from "@/components/LocationBlocked";
import useLocation from "@/contexts/LocationContext";
import useSettings from "@/contexts/SettingsContext";

/**
 * How long the needle and the readout take to reach a new reading. Matched to
 * the roughly one-second gap between GPS fixes: shorter and the needle arrives
 * early then sits still until the next fix, which reads as a stutter.
 */
const SWEEP_MS = 1000;

/** The face the dial was drawn against; every measurement scales from it. */
const REFERENCE_DIAL = 326;

/** Side padding the screen already reserves, plus a little breathing room. */
const DIAL_MARGIN = 44;

/**
 * Walks a readout towards its target one unit at a time. GPS fixes land about
 * once a second, so a raw reading jumps 26 -> 42 in a single frame; a real
 * digital speedometer climbs through every number in between. The step rate is
 * derived from the gap so the climb always lands in about `durationMs`,
 * matching the needle sweep.
 */
function useCountUp(target: number, durationMs = SWEEP_MS) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (shownRef.current === target) return;

    const gap = Math.abs(target - shownRef.current);
    const stepMs = Math.max(Math.round(durationMs / gap), 16);

    const timer = setInterval(() => {
      const next = shownRef.current + (target > shownRef.current ? 1 : -1);
      shownRef.current = next;
      setShown(next);
      if (next === target) clearInterval(timer);
    }, stepMs);

    return () => clearInterval(timer);
  }, [target, durationMs]);

  return shown;
}

export default function GaugePanel() {
  const { speed, topSpeed, avgSpeed, lat, lng, alt, address, errorMsg, retryPermission } =
    useLocation();
  const { mode, unit, gaugeColor, setMode, setUnit, gauge } = useSettings();

  // The dial was a fixed 326pt, which overflowed the narrowest phones and left
  // the largest ones with wasted space. Everything inside it is derived from
  // this one measurement instead.
  const { width: screenWidth } = useWindowDimensions();
  const dial = Math.min(REFERENCE_DIAL, screenWidth - DIAL_MARGIN);
  const scale = dial / REFERENCE_DIAL;
  const px = useCallback(
    (value: number) => Math.round(value * scale),
    [scale],
  );
  const centre = dial / 2;

  const currentMultiplier = UNIT_MULTIPLIERS[unit];
  const displaySpeed = Math.round(speed * currentMultiplier);
  const displayTopSpeed = Math.round(topSpeed * currentMultiplier);
  const displayAvgSpeed = Math.round(avgSpeed * currentMultiplier);

  const { max, redline, tick, num } = gauge;
  const climbingSpeed = useCountUp(displaySpeed);
  const isCurrentRedline = climbingSpeed >= redline;
  const needleAngle = -135 + (Math.min(displaySpeed, max) * 270) / max;
  const sweep = useRef(new Animated.Value(needleAngle)).current;

  // Linear, and the same duration as the readout climb. An eased curve put the
  // needle ahead of the number for most of the sweep, so the two never agreed.
  useEffect(() => {
    Animated.timing(sweep, {
      toValue: needleAngle,
      duration: SWEEP_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [needleAngle, sweep]);

  const needleRotation = sweep.interpolate({
    inputRange: [-135, 135],
    outputRange: ["-135deg", "135deg"],
  });
  const peakAngle = -135 + (Math.min(displayTopSpeed, max) * 270) / max;

  // Quantised so the 61 tick views rebuild when a tick is crossed, not on
  // every single number the readout climbs through.
  const litTicks = Math.floor(climbingSpeed / tick);
  const ticks = useMemo(() => {
    const items = [];
    const litUpTo = litTicks * tick;
    for (let i = 0; i <= max; i += tick) {
      let isMajor = i % num === 0;
      let isActive = i <= litUpTo;
      let isTickRedline = i >= redline;

      let color: string = colors.tickIdle;
      if (isTickRedline) {
        color = isActive ? colors.danger : colors.dangerDim;
      } else if (isActive) {
        color = gaugeColor;
      } else if (isMajor) {
        color = colors.tickMajorIdle;
      }

      let angle = -135 + (i * 270) / max;
      items.push(
        <View
          key={`t${i}`}
          style={[
            styles.tickWrapper,
            { width: dial, height: dial, transform: [{ rotate: `${angle}deg` }] },
          ]}
        >
          <View
            style={[
              styles.tick,
              {
                width: isMajor ? 3.5 : 1.5,
                height: px(isMajor ? 16 : 8),
                backgroundColor: color,
                shadowColor: isActive ? color : "transparent",
                shadowOpacity: isActive ? 0.9 : 0,
                shadowRadius: isActive ? 6 : 0,
              },
            ]}
          />
        </View>,
      );
    }
    return items;
  }, [max, tick, num, redline, litTicks, gaugeColor, px, dial]);

  const numerals = useMemo(() => {
    const items = [];
    for (let i = 0; i <= max; i += num) {
      let isNumRedline = i >= redline;
      let isActive = i <= climbingSpeed;

      let color = isNumRedline
        ? isActive
          ? colors.danger
          : colors.dangerDim
        : isActive
          ? colors.textPrimary
          : colors.textMuted;

      const angleRad = (-135 + (i * 270) / max - 90) * (Math.PI / 180);
      const ringRadius = centre * 0.775;
      const x = ringRadius * Math.cos(angleRad);
      const y = ringRadius * Math.sin(angleRad);

      items.push(
        <Text
          key={`n${i}`}
          style={[
            styles.numText,
            {
              color,
              left: centre + x - 18,
              top: centre + y - 10,
              fontSize: px(14),
            },
          ]}
        >
          {i}
        </Text>,
      );
    }
    return items;
  }, [max, num, redline, climbingSpeed, centre, px]);

  return (
    <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >

        {errorMsg ? (
          <LocationBlocked
            message={errorMsg}
            accent={gaugeColor}
            onRetry={retryPermission}
          />
        ) : (
          <>
            <View
              style={[styles.addressBadge, { borderColor: `${gaugeColor}25` }]}
            >
              <Text style={styles.addressText} numberOfLines={1}>
                {address}
              </Text>
            </View>

            <View style={styles.gaugeContainer}>
              <View
                style={[
                  styles.outerBezel,
                  {
                    borderColor: `${gaugeColor}15`,
                    width: dial + 20,
                    height: dial + 20,
                    borderRadius: (dial + 20) / 2,
                    borderWidth: px(8),
                  },
                ]}
              >
                <View
                  style={[
                    styles.innerBezel,
                    { width: dial, height: dial, borderRadius: centre },
                  ]}
                >
                  <View style={StyleSheet.absoluteFill}>{ticks}</View>
                  <View style={StyleSheet.absoluteFill}>{numerals}</View>

                  {displayTopSpeed > 0 && (
                    <View
                      style={[
                        styles.peakMarkerWrapper,
                        {
                          width: dial,
                          height: dial,
                          transform: [{ rotate: `${peakAngle}deg` }],
                        },
                      ]}
                    >
                      <View style={styles.peakMarker} />
                      <View style={styles.peakGlow} />
                    </View>
                  )}

                  <CockpitClock />

                  <View
                    style={[
                      styles.digitalSpeedBox,
                      {
                        borderColor: isCurrentRedline
                          ? "rgba(255,77,109,0.35)"
                          : `${gaugeColor}30`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.digitalSpeedText,
                        {
                          color: isCurrentRedline ? colors.danger : gaugeColor,
                          textShadowColor: isCurrentRedline
                            ? "rgba(255,77,109,0.6)"
                            : `${gaugeColor}99`,
                        },
                      ]}
                    >
                      {climbingSpeed}
                    </Text>
                    <View style={styles.speedUnitBadge}>
                      <Text
                        style={[
                          styles.digitalSpeedUnit,
                          { color: isCurrentRedline ? colors.danger : gaugeColor },
                        ]}
                      >
                        {unit}
                      </Text>
                    </View>
                  </View>

                  <Animated.View
                    style={[
                      styles.needleWrapper,
                      {
                        width: dial,
                        height: dial,
                        transform: [{ rotate: needleRotation }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.needleBody,
                        {
                          height: px(135),
                          transform: [{ translateY: px(-50) }],
                          backgroundColor: isCurrentRedline
                            ? colors.danger
                            : gaugeColor,
                          shadowColor: isCurrentRedline
                            ? colors.danger
                            : gaugeColor,
                        },
                      ]}
                    />
                    <View style={styles.needleCounterWeight} />
                  </Animated.View>

                  <View
                    style={[
                      styles.centerCap,
                      { top: centre - px(22), left: centre - px(22) },
                    ]}
                  >
                    <View
                      style={[
                        styles.centerCapCore,
                        {
                          backgroundColor: isCurrentRedline
                            ? colors.danger
                            : gaugeColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>PEAK SPEED</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{displayTopSpeed}</Text>
                  <Text style={styles.unitSmall}>{unit.toLowerCase()}</Text>
                </View>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>AVERAGE</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{displayAvgSpeed}</Text>
                  <Text style={styles.unitSmall}>{unit.toLowerCase()}</Text>
                </View>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>ALTITUDE</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{alt}</Text>
                  <Text style={styles.unitSmall}>m</Text>
                </View>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>POSITION</Text>
                </View>
                <Text style={styles.statCoords}>{formatLatitude(lat)}</Text>
                <Text style={styles.statCoords}>{formatLongitude(lng)}</Text>
              </View>
            </View>

            <View style={styles.controlDock}>
              <View style={styles.dockSegment}>
                <Text style={styles.dockHeader}>VEHICLE MODE</Text>
                <View style={styles.dockRow}>
                  {MODES.map((id) => {
                    const m = { id };
                    const isActive = mode === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.modeBtn,
                          isActive && [
                            styles.modeBtnActive,
                            { borderColor: gaugeColor },
                          ],
                        ]}
                        onPress={() => setMode(m.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.modeBtnText,
                            { color: isActive ? gaugeColor : colors.textMuted },
                          ]}
                        >
                          {m.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.dockDivider} />

              <View style={styles.dockSegment}>
                <Text style={styles.dockHeader}>METRIC SYSTEM</Text>
                <View style={styles.dockRow}>
                  {UNITS.map((u) => {
                    const isActive = unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitBtn,
                          isActive && [
                            styles.unitBtnActive,
                            { borderColor: `${gaugeColor}70` },
                          ],
                        ]}
                        onPress={() => setUnit(u)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.unitBtnText,
                            isActive && { color: gaugeColor },
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandAccent: {
    width: 5,
    height: 38,
    borderRadius: radius.pill,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: tracking.heading,
  },
  headerSubtitle: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    letterSpacing: 1,
    marginTop: 1,
  },
  paletteLauncher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 9,
  },
  launcherColorDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  addressBadge: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
    ...shadow.card,
  },
  addressText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: tracking.heading,
    color: colors.textSecondary,
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  outerBezel: {

    backgroundColor: colors.bgRaised,

    alignItems: "center",
    justifyContent: "center",
    ...shadow.gauge,
  },
  innerBezel: {

    backgroundColor: colors.bgRaised,
    borderWidth: 2,
    borderColor: colors.border,
    position: "relative",
  },
  tickWrapper: {
    position: "absolute",

    alignItems: "center",
  },
  tick: {
    marginTop: 6,
    borderRadius: radius.pill,
  },
  peakMarkerWrapper: {
    position: "absolute",

    alignItems: "center",
  },
  peakMarker: {
    width: 3.5,
    height: 20,
    backgroundColor: colors.warning,
    marginTop: 4,
    borderRadius: radius.pill,
  },
  peakGlow: {
    position: "absolute",
    top: 4,
    width: 9,
    height: 20,
    backgroundColor: "rgba(251,191,36,0.22)",
    borderRadius: radius.pill,
  },
  numText: {
    fontFamily: fonts.bold,
    position: "absolute",
    width: 36,
    height: 20,
    textAlign: "center",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  digitalSpeedBox: {
    position: "absolute",
    bottom: 46,
    alignSelf: "center",
    backgroundColor: "rgba(18,16,14,0.78)",
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: "center",
  },
  digitalSpeedText: {
    fontFamily: fonts.bold,
    fontSize: 52,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    letterSpacing: -2.5,
  },
  speedUnitBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: -2,
    marginBottom: 4,
  },
  digitalSpeedUnit: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  needleWrapper: {
    position: "absolute",

    justifyContent: "center",
    alignItems: "center",
  },
  needleBody: {
    width: 4,

    borderRadius: radius.pill,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  needleCounterWeight: {
    position: "absolute",
    bottom: 110,
    width: 6,
    height: 16,
    backgroundColor: colors.needleWeight,
    borderRadius: radius.pill,
  },
  centerCap: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.surfaceHigh,

    justifyContent: "center",
    alignItems: "center",
    ...shadow.card,
  },
  centerCapCore: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
  },
  telemetryGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 22,
  },
  telemetryCard: {
    width: "48.5%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  modeBtnText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0,
  },
  statLabel: {
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  statValue: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    fontSize: 26,
    letterSpacing: tracking.display,
  },
  statCoords: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    fontSize: 12.5,
        letterSpacing: 0.4,
  },
  unitSmall: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  controlDock: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadow.card,
  },
  dockSegment: {
    width: "100%",
  },
  dockHeader: {
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    fontSize: 9.5,
    letterSpacing: 1,
    marginBottom: 14,
  },
  dockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    height: 54,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  modeBtnActive: {
    backgroundColor: colors.surfaceHigh,
  },
  dockDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  unitBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  unitBtnActive: {
    backgroundColor: colors.surfaceHigh,
  },
  unitBtnText: {
    fontFamily: fonts.medium,
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(6,10,20,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    width: "100%",
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  modalSubTitle: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontFamily: fonts.medium,
    letterSpacing: 1,
    marginTop: 3,
  },
  modalExitIcon: {
    backgroundColor: colors.surfaceAlt,
    padding: 8,
    borderRadius: radius.pill,
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  paletteSwatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  paletteSwatchActive: {
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  paletteCheckCore: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: "#ffffff",
  },
});
