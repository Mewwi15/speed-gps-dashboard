import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { speedColor, speedLegend } from "@/constants/speed";
import { colors, radius } from "@/constants/theme";
import { fonts } from "@/constants/typography";
import type { TrackPoint } from "@/contexts/LocationContext";

const DEFAULT_DELTA = 0.004;

type Segment = { color: string; coordinates: TrackPoint[] };

/**
 * Split the route into runs of one colour. A single Polyline cannot carry a
 * gradient on iOS, so the route is drawn as consecutive solid segments, each
 * repeating its predecessor's point to stay visually joined.
 */
function buildSegments(points: TrackPoint[], gaugeMax: number): Segment[] {
  const segments: Segment[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const color = speedColor(points[i].speed, gaugeMax);
    const current = segments[segments.length - 1];
    if (current && current.color === color) {
      current.coordinates.push(points[i]);
    } else {
      segments.push({ color, coordinates: [points[i - 1], points[i]] });
    }
  }
  return segments;
}

type Props = {
  points: TrackPoint[];
  gaugeMax: number;
  accent: string;
  /** Live position marker. Omit for a finished trip. */
  live?: { latitude: number; longitude: number; heading: number } | null;
  /** Marker dragged along the route when reviewing a saved trip. */
  scrubPoint?: TrackPoint | null;
  /** Pins the whole route on first render instead of following a live fix. */
  fitToRoute?: boolean;
  showLegend?: boolean;
  /** Called once the route has been framed, so a snapshot can be taken. */
  onRouteFramed?: () => void;
};

export type RouteMapHandle = {
  /** Renders the current map to a PNG and resolves its temporary file URI. */
  capture: () => Promise<string | null>;
};

function RouteMap(
  {
    points,
    gaugeMax,
    accent,
    live = null,
    scrubPoint = null,
    fitToRoute = false,
    showLegend = true,
    onRouteFramed,
  }: Props,
  ref: React.Ref<RouteMapHandle>,
) {
  const mapRef = useRef<MapView>(null);
  const [isFollowing, setFollowing] = useState(!fitToRoute);
  const hasFitted = useRef(false);

  const segments = useMemo(
    () => buildSegments(points, gaugeMax),
    [points, gaugeMax],
  );
  const legend = useMemo(() => speedLegend(gaugeMax), [gaugeMax]);

  useImperativeHandle(ref, () => ({
    capture: async () => {
      if (!mapRef.current) return null;
      try {
        return await mapRef.current.takeSnapshot({
          format: "png",
          quality: 0.9,
          result: "file",
        });
      } catch {
        return null;
      }
    },
  }));

  const start = points.length > 0 ? points[0] : null;
  const end = points.length > 1 ? points[points.length - 1] : null;

  const initialPoint = live ?? start;

  useEffect(() => {
    if (!fitToRoute || hasFitted.current || points.length < 2 || !mapRef.current)
      return;
    hasFitted.current = true;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 60, right: 50, bottom: 70, left: 50 },
      animated: false,
    });
    onRouteFramed?.();
  }, [fitToRoute, points, onRouteFramed]);

  useEffect(() => {
    if (fitToRoute || !isFollowing || !live || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: { latitude: live.latitude, longitude: live.longitude } },
      { duration: 600 },
    );
  }, [fitToRoute, isFollowing, live]);

  useEffect(() => {
    if (!scrubPoint || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: { latitude: scrubPoint.latitude, longitude: scrubPoint.longitude } },
      { duration: 180 },
    );
  }, [scrubPoint]);

  const recenter = () => {
    setFollowing(true);
    if (!live || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: { latitude: live.latitude, longitude: live.longitude }, zoom: 16 },
      { duration: 500 },
    );
  };

  return (
    <View style={styles.wrapper}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        initialRegion={{
          latitude: initialPoint?.latitude ?? 0,
          longitude: initialPoint?.longitude ?? 0,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        }}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPanDrag={() => setFollowing(false)}
      >
        {segments.map((segment, index) => (
          <Polyline
            key={`seg-${index}`}
            coordinates={segment.coordinates}
            strokeColor={segment.color}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {start && (
          <Marker coordinate={start} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.endpoint, styles.startPin]}>
              <Text style={styles.endpointLabel}>A</Text>
            </View>
          </Marker>
        )}

        {end && !live && (
          <Marker coordinate={end} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.endpoint, styles.endPin]}>
              <Text style={styles.endpointLabel}>B</Text>
            </View>
          </Marker>
        )}

        {scrubPoint && (
          <Marker coordinate={scrubPoint} anchor={{ x: 0.5, y: 0.5 }} flat>
            <View style={[styles.scrubDot, { backgroundColor: accent }]} />
          </Marker>
        )}

        {live && (
          <Marker
            coordinate={{ latitude: live.latitude, longitude: live.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View
              style={[
                styles.headingWrapper,
                live.heading >= 0 && {
                  transform: [{ rotate: `${live.heading}deg` }],
                },
              ]}
            >
              {live.heading >= 0 && (
                <View style={[styles.headingCone, { borderBottomColor: accent }]} />
              )}
              <View style={[styles.meDot, { backgroundColor: accent }]} />
            </View>
          </Marker>
        )}
      </MapView>

      {showLegend && (
        <View style={styles.legend}>
          {legend.map((entry) => (
            <View key={entry.color} style={styles.legendEntry}>
              <View
                style={[styles.legendSwatch, { backgroundColor: entry.color }]}
              />
              <Text style={styles.legendLabel}>{entry.label}</Text>
            </View>
          ))}
        </View>
      )}

      {live && !isFollowing && (
        <TouchableOpacity
          style={[styles.recenter, { borderColor: `${accent}60` }]}
          onPress={recenter}
          activeOpacity={0.8}
        >
          <Text style={[styles.recenterText, { color: accent }]}>Recenter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default forwardRef(RouteMap);

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg, overflow: "hidden" },
  meDot: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.bgRaised,
  },
  scrubDot: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  headingWrapper: { alignItems: "center", justifyContent: "center" },
  headingCone: {
    position: "absolute",
    top: -14,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    opacity: 0.9,
  },
  endpoint: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  startPin: { backgroundColor: "#22c55e" },
  endPin: { backgroundColor: colors.danger },
  endpointLabel: { color: "#ffffff", fontSize: 13, fontFamily: fonts.bold },
  legend: {
    position: "absolute",
    left: 12,
    // Sits at the top: the provider attribution lives in the bottom-left
    // corner and has to stay legible, and a short map leaves no room below.
    top: 12,
    flexDirection: "row",
    backgroundColor: "rgba(22,31,52,0.92)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 9,
    gap: 8,
  },
  legendEntry: { alignItems: "center", gap: 3 },
  legendSwatch: { width: 16, height: 4, borderRadius: radius.pill },
  legendLabel: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.medium },
  recenter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22,31,52,0.94)",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  recenterText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    letterSpacing: 0,
  },
});
