import type { ImageSourcePropType } from "react-native";

/**
 * Artwork per achievement. Metro resolves require() at build time, so these
 * have to be written out one by one rather than built from the id; the upside
 * is that a missing file fails the build loudly instead of rendering a blank
 * tile on someone's phone.
 */
export const BADGE_ART: Record<string, ImageSourcePropType> = {
  "first-drive": require("@/assets/badges/first-drive.png"),
  "ten-trips": require("@/assets/badges/ten-trips.png"),
  explorer: require("@/assets/badges/explorer.png"),
  "road-warrior": require("@/assets/badges/road-warrior.png"),
  century: require("@/assets/badges/century.png"),
  smooth: require("@/assets/badges/smooth.png"),
  endurance: require("@/assets/badges/endurance.png"),
  "night-rider": require("@/assets/badges/night-rider.png"),
};

export const EMPTY_TRIPS_ART: ImageSourcePropType = require("@/assets/illustrations/empty-trips.png");

/** Mascot poses. Swap the files, keep the names. */
export const MASCOT = {
  hello: require("@/assets/mascot/hello.png"),
  cheer: require("@/assets/mascot/cheer.png"),
  sleep: require("@/assets/mascot/sleep.png"),
} as const;

/** Top-down vehicle sprites for the live map marker. Nose points up. */
export const VEHICLE_SPRITES = {
  straight: require("@/assets/vehicle/straight.png"),
  leanLeft: require("@/assets/vehicle/lean-left.png"),
  leanRight: require("@/assets/vehicle/lean-right.png"),
} as const;

/** Mode buttons in the cockpit dock. */
export const MODE_ART = {
  Car: require("@/assets/modes/car.png"),
  Moto: require("@/assets/modes/moto.png"),
  Bike: require("@/assets/modes/bike.png"),
  Run: require("@/assets/modes/run.png"),
} as const;
