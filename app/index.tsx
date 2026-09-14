import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useLocation from "./utils/useLocation";

const ADVANCED_COLORS = [
  "#00e5ff",
  "#00ffcc",
  "#00ff66",
  "#39ff14",
  "#ccff00",
  "#ffff00",
  "#ffaa00",
  "#ff5e00",
  "#ff003c",
  "#ff007f",
  "#ff00ea",
  "#bf00ff",
  "#7b00ff",
  "#3d00ff",
  "#0055ff",
  "#ffffff",
  "#b0bec5",
  "#78909c",
  "#455a64",
  "#263238",
  "#ff4081",
  "#00e676",
  "#1de9b6",
  "#00b0ff",
  "#651fff",
  "#f50057",
  "#ff9100",
  "#ffd600",
  "#aeea00",
  "#00bfa5",
];

const UNIT_MULTIPLIERS: Record<string, number> = {
  "KM/H": 1,
  MPH: 0.621371,
  KNOT: 0.539957,
};

const GAUGE_CONFIG: Record<string, Record<string, any>> = {
  Car: {
    "KM/H": { max: 240, redline: 160, tick: 4, num: 20 },
    MPH: { max: 160, redline: 100, tick: 2, num: 20 },
    KNOT: { max: 140, redline: 90, tick: 2, num: 20 },
  },
  Moto: {
    "KM/H": { max: 200, redline: 140, tick: 4, num: 20 },
    MPH: { max: 140, redline: 90, tick: 2, num: 20 },
    KNOT: { max: 120, redline: 80, tick: 2, num: 20 },
  },
  Bike: {
    "KM/H": { max: 60, redline: 40, tick: 1, num: 5 },
    MPH: { max: 40, redline: 25, tick: 1, num: 5 },
    KNOT: { max: 40, redline: 25, tick: 1, num: 5 },
  },
  Run: {
    "KM/H": { max: 40, redline: 25, tick: 1, num: 5 },
    MPH: { max: 25, redline: 15, tick: 1, num: 5 },
    KNOT: { max: 25, redline: 15, tick: 1, num: 5 },
  },
};

export default function Index() {
  const { speed, topSpeed, avgSpeed, lat, lng, alt, address, errorMsg } =
    useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [mode, setMode] = useState("Car");
  const [unit, setUnit] = useState("KM/H");
  const [gaugeColor, setGaugeColor] = useState("#00e5ff");
  const [isColorPickerVisible, setColorPickerVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    const sec = date.getSeconds().toString().padStart(2, "0");
    return `${h}:${min}:${sec}`;
  };

  const formatDate = (date: Date) => {
    const d = date.getDate().toString().padStart(2, "0");
    const m = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const y = date.getFullYear().toString().slice(-2);
    return `${d} ${m} 20${y}`;
  };

  const currentMultiplier = UNIT_MULTIPLIERS[unit];
  const displaySpeed = Math.round(speed * currentMultiplier);
  const displayTopSpeed = Math.round(topSpeed * currentMultiplier);
  const displayAvgSpeed = Math.round(avgSpeed * currentMultiplier);

  const { max, redline, tick, num } = GAUGE_CONFIG[mode][unit];
  const isCurrentRedline = displaySpeed >= redline;
  const needleAngle = -135 + (Math.min(displaySpeed, max) * 270) / max;
  const peakAngle = -135 + (Math.min(displayTopSpeed, max) * 270) / max;

  const Ticks = () => {
    let ticks = [];
    for (let i = 0; i <= max; i += tick) {
      let isMajor = i % num === 0;
      let isActive = i <= displaySpeed;
      let isTickRedline = i >= redline;

      let color = "#1a1f26";
      if (isTickRedline) {
        color = isActive ? "#ff1e56" : "#4d0b1a";
      } else if (isActive) {
        color = gaugeColor;
      } else if (isMajor) {
        color = "#374151";
      }

      let angle = -135 + (i * 270) / max;
      ticks.push(
        <View
          key={`t${i}`}
          style={[
            styles.tickWrapper,
            { transform: [{ rotate: `${angle}deg` }] },
          ]}
        >
          <View
            style={[
              styles.tick,
              {
                width: isMajor ? 3.5 : 1.5,
                height: isMajor ? 16 : 8,
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
    return <View style={StyleSheet.absoluteFill}>{ticks}</View>;
  };

  const Numbers = () => {
    let nums = [];
    for (let i = 0; i <= max; i += num) {
      let isNumRedline = i >= redline;
      let isActive = i <= displaySpeed;

      let color = isNumRedline
        ? isActive
          ? "#ff1e56"
          : "#801428"
        : isActive
          ? "#ffffff"
          : "#6b7280";

      let angleRad = (-135 + (i * 270) / max - 90) * (Math.PI / 180);
      let radius = 126;
      let x = radius * Math.cos(angleRad);
      let y = radius * Math.sin(angleRad);

      nums.push(
        <Text
          key={`n${i}`}
          style={[
            styles.numText,
            { color: color, left: 170 + x - 18, top: 170 + y - 10 },
          ]}
        >
          {i}
        </Text>,
      );
    }
    return <View style={StyleSheet.absoluteFill}>{nums}</View>;
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View
              style={[styles.brandAccent, { backgroundColor: gaugeColor }]}
            />
            <View>
              <Text style={styles.headerTitle}>SPEED GPS</Text>
              <Text style={styles.headerSubtitle}>TELEMETRY COCKPIT</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.paletteLauncher, { borderColor: `${gaugeColor}40` }]}
            onPress={() => setColorPickerVisible(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.launcherColorDot,
                { backgroundColor: gaugeColor, shadowColor: gaugeColor },
              ]}
            />
            <MaterialCommunityIcons
              name="palette-outline"
              size={18}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={24}
              color="#ff1e56"
            />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : (
          <>
            <View
              style={[styles.addressBadge, { borderColor: `${gaugeColor}25` }]}
            >
              <View
                style={[styles.gpsIndicator, { backgroundColor: gaugeColor }]}
              />
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={16}
                color={gaugeColor}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.addressText} numberOfLines={1}>
                {address.toUpperCase()}
              </Text>
            </View>

            <View style={styles.gaugeContainer}>
              <View
                style={[styles.outerBezel, { borderColor: `${gaugeColor}15` }]}
              >
                <View style={styles.innerBezel}>
                  <Ticks />
                  <Numbers />

                  {displayTopSpeed > 0 && (
                    <View
                      style={[
                        styles.peakMarkerWrapper,
                        { transform: [{ rotate: `${peakAngle}deg` }] },
                      ]}
                    >
                      <View style={styles.peakMarker} />
                      <View style={styles.peakGlow} />
                    </View>
                  )}

                  <View style={styles.lcdScreen}>
                    <Text style={styles.lcdDate}>
                      {formatDate(currentTime)}
                    </Text>
                    <Text style={styles.lcdTime}>
                      {formatTime(currentTime)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.digitalSpeedBox,
                      {
                        borderColor: isCurrentRedline
                          ? "#ff1e5640"
                          : `${gaugeColor}30`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.digitalSpeedText,
                        {
                          color: isCurrentRedline ? "#ff1e56" : gaugeColor,
                          textShadowColor: isCurrentRedline
                            ? "#ff1e5699"
                            : `${gaugeColor}99`,
                        },
                      ]}
                    >
                      {displaySpeed}
                    </Text>
                    <View style={styles.speedUnitBadge}>
                      <Text
                        style={[
                          styles.digitalSpeedUnit,
                          { color: isCurrentRedline ? "#ff1e56" : gaugeColor },
                        ]}
                      >
                        {unit}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.needleWrapper,
                      { transform: [{ rotate: `${needleAngle}deg` }] },
                    ]}
                  >
                    <View
                      style={[
                        styles.needleBody,
                        {
                          backgroundColor: isCurrentRedline
                            ? "#ff1e56"
                            : gaugeColor,
                          shadowColor: isCurrentRedline
                            ? "#ff1e56"
                            : gaugeColor,
                        },
                      ]}
                    />
                    <View style={styles.needleCounterWeight} />
                  </View>

                  <View style={styles.centerCap}>
                    <View
                      style={[
                        styles.centerCapCore,
                        {
                          backgroundColor: isCurrentRedline
                            ? "#ff1e56"
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
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={16}
                    color="#eab308"
                  />
                  <Text style={styles.statLabel}>PEAK SPEED</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{displayTopSpeed}</Text>
                  <Text style={styles.unitSmall}>{unit.toLowerCase()}</Text>
                </View>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={16}
                    color="#38bdf8"
                  />
                  <Text style={styles.statLabel}>AVERAGE</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{displayAvgSpeed}</Text>
                  <Text style={styles.unitSmall}>{unit.toLowerCase()}</Text>
                </View>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name="altimeter"
                    size={16}
                    color="#a855f7"
                  />
                  <Text style={styles.statLabel}>ALTITUDE</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{alt}</Text>
                  <Text style={styles.unitSmall}>m</Text>
                </View>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={16}
                    color="#22c55e"
                  />
                  <Text style={styles.statLabel}>POSITION</Text>
                </View>
                <Text style={styles.statCoords}>{lat.toFixed(4)}° N</Text>
                <Text style={styles.statCoords}>{lng.toFixed(4)}° E</Text>
              </View>
            </View>

            <View style={styles.controlDock}>
              <View style={styles.dockSegment}>
                <Text style={styles.dockHeader}>VEHICLE MODE</Text>
                <View style={styles.dockRow}>
                  {[
                    { id: "Car", icon: "car-sports" },
                    { id: "Moto", icon: "motorbike" },
                    { id: "Bike", icon: "bicycle" },
                    { id: "Run", icon: "run-fast" },
                  ].map((m) => {
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
                        <MaterialCommunityIcons
                          name={m.icon as any}
                          size={24}
                          color={isActive ? gaugeColor : "#4b5563"}
                        />
                        {isActive && (
                          <View
                            style={[
                              styles.activeDot,
                              { backgroundColor: gaugeColor },
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.dockDivider} />

              <View style={styles.dockSegment}>
                <Text style={styles.dockHeader}>METRIC SYSTEM</Text>
                <View style={styles.dockRow}>
                  {["KM/H", "MPH", "KNOT"].map((u) => {
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

      <Modal
        visible={isColorPickerVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>ACCENT PALETTE</Text>
                <Text style={styles.modalSubTitle}>
                  SELECT COCKPIT AMBIENT THEME
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalExitIcon}
                onPress={() => setColorPickerVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.paletteGrid}>
              {ADVANCED_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.paletteSwatch,
                    { backgroundColor: c },
                    gaugeColor === c && [
                      styles.paletteSwatchActive,
                      { borderColor: "#ffffff" },
                    ],
                  ]}
                  onPress={() => {
                    setGaugeColor(c);
                    setColorPickerVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  {gaugeColor === c && <View style={styles.paletteCheckCore} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: "#08090d",
    paddingTop: 45,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 25,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 26,
    color: "#ffffff",
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 2.5,
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: -2,
  },
  paletteLauncher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#11141c",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  launcherColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  addressBadge: {
    flexDirection: "row",
    backgroundColor: "#0d1117",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  gpsIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  addressText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#9ca3af",
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  outerBezel: {
    width: 346,
    height: 346,
    borderRadius: 173,
    backgroundColor: "#07090e",
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 20,
  },
  innerBezel: {
    width: 326,
    height: 326,
    borderRadius: 163,
    backgroundColor: "#0b0d13",
    borderWidth: 2,
    borderColor: "#1a1f2c",
    position: "relative",
  },
  tickWrapper: {
    position: "absolute",
    width: 326,
    height: 326,
    alignItems: "center",
  },
  tick: {
    marginTop: 6,
    borderRadius: 1,
  },
  peakMarkerWrapper: {
    position: "absolute",
    width: 326,
    height: 326,
    alignItems: "center",
  },
  peakMarker: {
    width: 3.5,
    height: 20,
    backgroundColor: "#f59e0b",
    marginTop: 4,
    borderRadius: 2,
  },
  peakGlow: {
    position: "absolute",
    top: 4,
    width: 8,
    height: 20,
    backgroundColor: "#f59e0b33",
    borderRadius: 4,
  },
  numText: {
    position: "absolute",
    width: 36,
    height: 20,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  lcdScreen: {
    position: "absolute",
    top: 68,
    alignSelf: "center",
    backgroundColor: "#05070a",
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  lcdDate: {
    color: "#64748b",
    fontSize: 9.5,
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  lcdTime: {
    color: "#f8fafc",
    fontSize: 17,
    fontFamily: "monospace",
    fontWeight: "800",
    letterSpacing: 2,
  },
  digitalSpeedBox: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
    backgroundColor: "rgba(5, 7, 10, 0.85)",
    paddingHorizontal: 22,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  digitalSpeedText: {
    fontSize: 48,
    fontWeight: "900",
    fontStyle: "italic",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  speedUnitBadge: {
    backgroundColor: "#11141c",
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: -4,
    marginBottom: 4,
  },
  digitalSpeedUnit: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  needleWrapper: {
    position: "absolute",
    width: 326,
    height: 326,
    justifyContent: "center",
    alignItems: "center",
  },
  needleBody: {
    width: 4,
    height: 135,
    transform: [{ translateY: -50 }],
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  needleCounterWeight: {
    position: "absolute",
    bottom: 110,
    width: 6,
    height: 16,
    backgroundColor: "#334155",
    borderRadius: 3,
  },
  centerCap: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0f131a",
    borderWidth: 3,
    borderColor: "#334155",
    top: 142,
    left: 142,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  centerCapCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  telemetryGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 20,
  },
  telemetryCard: {
    width: "48.5%",
    backgroundColor: "#0d1117",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1a1f2c",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statValue: {
    color: "#f9fafb",
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
  },
  statCoords: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  unitSmall: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
  },
  controlDock: {
    width: "100%",
    backgroundColor: "#0d1117",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a1f2c",
    padding: 14,
  },
  dockSegment: {
    width: "100%",
  },
  dockHeader: {
    color: "#6b7280",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  dockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#131822",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  modeBtnActive: {
    backgroundColor: "#172030",
  },
  activeDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dockDivider: {
    height: 1,
    backgroundColor: "#1a1f2c",
    marginVertical: 14,
  },
  unitBtn: {
    flex: 1,
    height: 40,
    backgroundColor: "#131822",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  unitBtnActive: {
    backgroundColor: "#172030",
  },
  unitBtnText: {
    color: "#4b5563",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#0d1117",
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },
  modalSubTitle: {
    color: "#6b7280",
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  modalExitIcon: {
    backgroundColor: "#1f2937",
    padding: 6,
    borderRadius: 14,
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
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  paletteSwatchActive: {
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  paletteCheckCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
  },
  errorText: {
    color: "#ff1e56",
    fontSize: 14,
    fontWeight: "bold",
  },
});
