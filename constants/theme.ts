/**
 * Neutral graphite with an amber accent. Grey rather than near-black keeps the
 * screens from reading as a void, and because it carries no hue of its own the
 * amber stays the only colour on the page. Each surface steps up a little,
 * which is what separates a card from its background when there is no
 * iconography doing that work.
 */
export const colors = {
  /** Page background. */
  bg: "#1b1c1f",
  /** Slightly raised, for the gauge face and bars. */
  bgRaised: "#212227",
  /**
   * Cards, docks and modals are a film of light over the background rather
   * than a solid block. Translucency is what separates a panel that sits in
   * the interface from one that sits on top of it.
   */
  surface: "rgba(255,255,255,0.055)",
  /** Controls sitting inside a surface. */
  surfaceAlt: "rgba(255,255,255,0.085)",
  surfaceHigh: "rgba(255,255,255,0.14)",
  /**
   * Transparent by design. Drawn borders were what made the panels read as
   * pasted-on rectangles; depth now comes from the fill and the shadow, the
   * way the system's own materials do it.
   */
  border: "transparent",
  borderStrong: "rgba(255,255,255,0.22)",

  textPrimary: "#f4f5f7",
  textSecondary: "#b9bec6",
  textMuted: "#878d97",

  /** Start and finish of a route, used by both the map pins and the summary. */
  routeStart: "#3ddc84",
  routeEnd: "#ff5c4d",

  danger: "#ff3b30",
  dangerDim: "#5c231d",
  warning: "#ffc53d",

  tickIdle: "#3b3f46",
  tickMajorIdle: "#6e757f",
  needleWeight: "#6e757f",
} as const;

/** Default cockpit accent; the palette picker can override it. */
export const ACCENT_DEFAULT = "#ff9e2c";

export const radius = {
  sm: 16,
  md: 24,
  lg: 30,
  xl: 38,
  pill: 999,
} as const;

/**
 * Soft and wide rather than tight and dark. A large blur at low opacity lifts
 * a surface off the background without drawing a hard edge under it, which is
 * what separates a panel that feels moulded from one that feels cut out.
 */
export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
  gauge: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.65,
    shadowRadius: 44,
    elevation: 24,
  },
} as const;

/**
 * A hairline lighter than the surface, applied to the top edge only. It reads
 * as light falling from above and rounds a panel off visually, doing the work
 * a hard border used to do without the hard border.
 */
export const softEdge = {
  borderTopWidth: 1,
  borderTopColor: "rgba(255,255,255,0.1)",
} as const;
