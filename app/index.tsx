import { BlurView } from "expo-blur";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GaugePanel from "@/components/GaugePanel";
import LocationBlocked from "@/components/LocationBlocked";
import RouteMap from "@/components/RouteMap";
import ThrottleSlider from "@/components/ThrottleSlider";
import { UNIT_MULTIPLIERS } from "@/constants/speed";
import { ACCENT_DEFAULT, colors, radius, shadow, softEdge } from "@/constants/theme";
import { fonts, tracking } from "@/constants/typography";
import useLocation from "@/contexts/LocationContext";
import useSettings from "@/contexts/SettingsContext";
import useSpeedWarning from "@/components/useSpeedWarning";
import useTrips from "@/contexts/TripsContext";

const ACCENT_COLORS = [
  ACCENT_DEFAULT,
  "#00e5ff", "#00ffcc", "#00ff66", "#39ff14", "#ccff00", "#ffff00",
  "#ffaa00", "#ff5e00", "#ff003c", "#ff007f", "#ff00ea", "#bf00ff",
  "#7b00ff", "#3d00ff", "#0055ff", "#ffffff", "#b0bec5", "#78909c",
  "#455a64", "#263238", "#ff4081", "#00e676", "#1de9b6", "#00b0ff",
  "#651fff", "#f50057", "#ff9100", "#ffd600", "#aeea00", "#00bfa5",
];

type ViewMode = "GAUGE" | "MAP";

function formatClock(ms: number) {
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

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    lat,
    lng,
    heading,
    turnRate,
    hasFix,
    errorMsg,
    path,
    isDemo,
    setDemo,
    retryPermission,
    demoMode,
    setDemoMode,
    manualSpeed,
    setManualSpeed,
    speed,
  } = useLocation();
  const {
    gaugeColor,
    setGaugeColor,
    gauge,
    unit,
    speedLimitKmh,
    setSpeedLimitKmh,
  } = useSettings();
  const {
    isRecording,
    recordingPoints,
    recordingStartedAt,
    startRecording,
    stopRecording,
  } = useTrips();

  // Limits are offered in the unit on screen but held in km/h, so switching
  // unit does not silently move the threshold.
  const limitChoices = useMemo(() => {
    const factor = UNIT_MULTIPLIERS[unit];
    const steps = [0.25, 0.4, 0.55, 0.7];
    return steps.map((fraction) => {
      const kmh = Math.round((gauge.max / factor) * fraction / 5) * 5;
      return { kmh, label: `${Math.round(kmh * factor)}` };
    });
  }, [gauge.max, unit]);

  useSpeedWarning({
    speedKmh: speed,
    limitKmh: speedLimitKmh,
    spokenLimit:
      speedLimitKmh === null
        ? ""
        : `${Math.round(speedLimitKmh * UNIT_MULTIPLIERS[unit])} ${unit === "KM/H" ? "kilometres per hour" : unit.toLowerCase()}`,
  });

  const [viewMode, setViewMode] = useState<ViewMode>("GAUGE");
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isRecording || recordingStartedAt === null) {
      setElapsedMs(0);
      return;
    }
    const tick = () => setElapsedMs(Date.now() - recordingStartedAt);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isRecording, recordingStartedAt]);

  // While recording, the map shows the trip so far; otherwise the live trail.
  const mapPoints = isRecording ? recordingPoints : path;
  const recordedDistance = recordingPoints.reduce((total, point, index) => {
    if (index === 0) return 0;
    const previous = recordingPoints[index - 1];
    const latRadians = (previous.latitude * Math.PI) / 180;
    const dLat = (point.latitude - previous.latitude) * 111320;
    const dLng =
      (point.longitude - previous.longitude) * 111320 * Math.cos(latRadians);
    return total + Math.sqrt(dLat * dLat + dLng * dLng);
  }, 0);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={[styles.brandAccent, { backgroundColor: gaugeColor }]} />
          <View>
            <Text style={styles.brandTitle}>SPEED GPS</Text>
            <Text style={styles.brandSubtitle}>TELEMETRY COCKPIT</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <Link href="/history" asChild>
            <TouchableOpacity style={styles.textButton} activeOpacity={0.7}>
              <Text style={styles.textButtonLabel}>Trips</Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={[styles.textButton, { borderColor: `${gaugeColor}55` }]}
            onPress={() => setPaletteOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.textButtonLabel, { color: gaugeColor }]}>
              Theme
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.toggle}>
        {(["GAUGE", "MAP"] as ViewMode[]).map((option) => {
          const isActive = viewMode === option;
          return (
            <TouchableOpacity
              key={option === "GAUGE" ? "Gauge" : "Map"}
              style={[
                styles.toggleOption,
                isActive && [
                  styles.toggleOptionActive,
                  { borderColor: gaugeColor },
                ],
              ]}
              onPress={() => setViewMode(option)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  { color: isActive ? gaugeColor : colors.textMuted },
                ]}
              >
                {option === "GAUGE" ? "Gauge" : "Map"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isDemo && (
        <View style={[styles.demoBanner, { borderColor: `${gaugeColor}55` }]}>
          <Text style={[styles.demoBannerText, { color: gaugeColor }]}>
            {demoMode === "manual"
              ? "Manual demo · simulated data"
              : "Demo drive · simulated data"}
          </Text>
        </View>
      )}

      {isDemo && demoMode === "manual" && (
        <ThrottleSlider
          value={manualSpeed}
          max={gauge.max}
          accent={gaugeColor}
          unit={unit}
          onChange={setManualSpeed}
        />
      )}

      <View style={styles.content}>
        {viewMode === "GAUGE" ? (
          <GaugePanel />
        ) : errorMsg ? (
          <View style={styles.mapError}>
            <LocationBlocked
              message={errorMsg}
              accent={gaugeColor}
              onRetry={retryPermission}
            />
          </View>
        ) : (
          <View style={styles.mapHolder}>
            <RouteMap
              points={mapPoints}
              gaugeMax={gauge.max}
              accent={gaugeColor}
              live={
                hasFix
                  ? { latitude: lat, longitude: lng, heading, turnRate }
                  : null
              }
            />
          </View>
        )}
      </View>

      <View style={[styles.recBar, { paddingBottom: insets.bottom + 10 }]}>
        {isRecording && (
          <View style={styles.recStats}>
            <View style={styles.recStat}>
              <Text style={styles.recStatLabel}>TIME</Text>
              <Text style={styles.recStatValue}>{formatClock(elapsedMs)}</Text>
            </View>
            <View style={styles.recStatDivider} />
            <View style={styles.recStat}>
              <Text style={styles.recStatLabel}>DISTANCE</Text>
              <Text style={styles.recStatValue}>
                {formatDistance(recordedDistance)}
              </Text>
            </View>
            <View style={styles.recStatDivider} />
            <View style={styles.recStat}>
              <Text style={styles.recStatLabel}>POINTS</Text>
              <Text style={styles.recStatValue}>{recordingPoints.length}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.demoButton,
            isDemo
              ? { backgroundColor: `${gaugeColor}24` }
              : { backgroundColor: colors.surfaceAlt },
          ]}
          onPress={() => setDemo(!isDemo)}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.demoButtonText,
              { color: isDemo ? gaugeColor : colors.textSecondary },
            ]}
          >
            {isDemo ? "Stop demo" : "Start demo"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.recButton,
            isRecording
              ? styles.recButtonActive
              : { backgroundColor: gaugeColor },
          ]}
          onPress={() => {
            if (isRecording) {
              stopRecording().then((tripId) => {
                if (tripId) {
                  router.push({ pathname: "/trip/[id]", params: { id: tripId } });
                  return;
                }
                // Too few fixes to be a route. Saying so beats leaving the
                // button looking broken — which is exactly how it reads when
                // a recording is stopped where the signal never moved.
                Alert.alert(
                  "Nothing to save",
                  "This recording did not move far enough to draw a route. Start again and give it a few seconds.",
                );
              });
            } else {
              startRecording();
              setViewMode("MAP");
            }
          }}
          activeOpacity={0.85}
          disabled={!!errorMsg}
        >
          <Text
            style={[
              styles.recButtonText,
              { color: isRecording ? "#ffffff" : colors.bg },
            ]}
          >
            {isRecording ? "Stop & save" : "Start recording"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isPaletteOpen} transparent animationType="fade">
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <BlurView intensity={60} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Settings</Text>
                <Text style={styles.modalSubtitle}>
                  Cockpit appearance and demo
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setPaletteOpen(false)}
              >
                <Text style={styles.modalCloseLabel}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.demoRow}>
              <View style={styles.demoCopy}>
                <Text style={styles.demoTitle}>Demo drive</Text>
                <Text style={styles.demoBody}>
                  Feeds the app simulated fixes so the gauge and route can be
                  shown without driving. Street names stay in English.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.demoToggle,
                  isDemo
                    ? { backgroundColor: gaugeColor, borderColor: gaugeColor }
                    : { borderColor: colors.borderStrong },
                ]}
                onPress={() => setDemo(!isDemo)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.demoToggleText,
                    { color: isDemo ? colors.bg : colors.textSecondary },
                  ]}
                >
                  {isDemo ? "On" : "Off"}
                </Text>
              </TouchableOpacity>
            </View>

            {isDemo && (
              <View style={styles.demoModeRow}>
                {(["auto", "manual"] as const).map((option) => {
                  const isActive = demoMode === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.demoModeOption,
                        isActive
                          ? {
                              backgroundColor: colors.surfaceHigh,
                              borderColor: gaugeColor,
                            }
                          : { borderColor: "transparent" },
                      ]}
                      onPress={() => setDemoMode(option)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.demoModeLabel,
                          {
                            color: isActive ? gaugeColor : colors.textMuted,
                          },
                        ]}
                      >
                        {option === "auto" ? "Scripted run" : "Drive by hand"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionLabel}>Speed warning</Text>
            <Text style={styles.sectionHint}>
              Speaks and vibrates once when you cross the limit.
            </Text>
            <View style={styles.limitRow}>
              {[{ kmh: null as number | null, label: "Off" }, ...limitChoices].map(
                (choice) => {
                  const isActive = speedLimitKmh === choice.kmh;
                  return (
                    <TouchableOpacity
                      key={choice.label}
                      style={[
                        styles.limitOption,
                        isActive
                          ? {
                              backgroundColor: colors.surfaceHigh,
                              borderColor: gaugeColor,
                            }
                          : { borderColor: "transparent" },
                      ]}
                      onPress={() => setSpeedLimitKmh(choice.kmh)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.limitLabel,
                          { color: isActive ? gaugeColor : colors.textMuted },
                        ]}
                      >
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <Text style={styles.sectionLabel}>Accent palette</Text>
            <View style={styles.paletteGrid}>
              {ACCENT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    gaugeColor === color && styles.swatchActive,
                  ]}
                  onPress={() => {
                    setGaugeColor(color);
                    setPaletteOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandAccent: {
    width: 5,
    height: 38,
    borderRadius: radius.pill,
    marginRight: 12,
  },
  brandTitle: {
    fontFamily: fonts.bold,
    fontSize: 25,
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 1,
  },
  topActions: { flexDirection: "row", gap: 10 },
  textButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  textButtonLabel: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
  },
  modalCloseLabel: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0,
  },
  demoBanner: {
    marginHorizontal: 18,
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    ...shadow.card,
    ...softEdge,
  },
  demoBannerText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    letterSpacing: 0,
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 22,
    ...shadow.card,
    ...softEdge,
  },
  demoCopy: { flex: 1, gap: 5 },
  demoTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.semibold,
    letterSpacing: 0,
  },
  demoBody: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  demoToggle: {
    minWidth: 62,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
  },
  demoToggleText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    letterSpacing: 0,
  },
  demoModeRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: 22,
    marginTop: -12,
    ...shadow.card,
    ...softEdge,
  },
  demoModeOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
  demoModeLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    letterSpacing: 0,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: -8,
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: 22,
    ...shadow.card,
    ...softEdge,
  },
  limitOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
  limitLabel: { fontSize: 13, fontFamily: fonts.medium },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    marginBottom: 14,
  },
  toggle: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    ...shadow.card,
    ...softEdge,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  toggleOptionActive: { backgroundColor: colors.surfaceHigh },
  toggleLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    letterSpacing: tracking.heading,
  },
  content: { flex: 1 },
  mapHolder: {
    flex: 1,
    marginHorizontal: 18,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  recBar: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 12,
  },
  recStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    ...shadow.card,
  },
  recStat: { flex: 1, alignItems: "center", gap: 3 },
  recStatDivider: { width: 1, height: 28, backgroundColor: colors.border },
  recStatLabel: {
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 1,
  },
  recStatValue: {
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    fontSize: 19,
    letterSpacing: tracking.heading,
  },
  demoButton: {
    height: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
    ...softEdge,
  },
  demoButtonText: { fontSize: 15, fontFamily: fonts.medium },
  recButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 56,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  recButtonActive: { backgroundColor: colors.danger },
  recButtonText: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    letterSpacing: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(12,13,15,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
    ...softEdge,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    fontSize: 18,
    letterSpacing: tracking.heading,
  },
  modalSubtitle: {
    fontFamily: fonts.medium,
    color: colors.textMuted,
    fontSize: 9.5,
    letterSpacing: 1,
    marginTop: 3,
  },
  modalClose: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: "#ffffff",
    transform: [{ scale: 1.15 }],
  },
});
