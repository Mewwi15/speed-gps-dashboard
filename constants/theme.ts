/**
 * Carbon and amber. The base is a warm near-black rather than a blue-black, so
 * the amber accent sits on it without the cold cast the earlier slate palette
 * gave it. Each surface steps up a little, which is what separates a card from
 * its background when there is no iconography doing that work.
 */
export const colors = {
  /** Page background. */
  bg: "#12100e",
  /** Slightly raised, for the gauge face and bars. */
  bgRaised: "#1a1713",
  /** Cards, docks, modals. */
  surface: "#1f1b16",
  /** Controls sitting inside a surface. */
  surfaceAlt: "#2a251e",
  surfaceHigh: "#3a3228",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.18)",

  textPrimary: "#faf7f2",
  textSecondary: "#c4b9a9",
  textMuted: "#8a7f70",

  danger: "#ff3b30",
  dangerDim: "#5c231d",
  warning: "#ffc53d",

  tickIdle: "#3a332a",
  tickMajorIdle: "#6b6053",
  needleWeight: "#6b6053",
} as const;

/** Default cockpit accent; the palette picker can override it. */
export const ACCENT_DEFAULT = "#ff9e2c";

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  gauge: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 20,
  },
} as const;
