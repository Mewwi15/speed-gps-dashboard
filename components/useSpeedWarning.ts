import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useEffect, useRef } from "react";

/** Silence between repeat warnings, so a steady overspeed does not nag. */
const REPEAT_COOLDOWN_MS = 12000;

/** Drop back under the limit by this much before the warning can fire again. */
const RESET_MARGIN_KMH = 3;

type Options = {
  speedKmh: number;
  limitKmh: number | null;
  /** Spoken aloud, so it is phrased in the unit on screen. */
  spokenLimit: string;
};

/**
 * Speaks and vibrates once when the limit is crossed. Cheap to run and the one
 * part of the app that works without looking at the screen, which is the point:
 * a speedometer you have to read while driving is the wrong shape.
 */
export default function useSpeedWarning({
  speedKmh,
  limitKmh,
  spokenLimit,
}: Options) {
  const isOver = useRef(false);
  const lastWarnedAt = useRef(0);

  useEffect(() => {
    if (limitKmh === null) {
      isOver.current = false;
      return;
    }

    if (speedKmh <= limitKmh - RESET_MARGIN_KMH) {
      isOver.current = false;
      return;
    }

    if (speedKmh <= limitKmh || isOver.current) return;

    const now = Date.now();
    if (now - lastWarnedAt.current < REPEAT_COOLDOWN_MS) return;

    isOver.current = true;
    lastWarnedAt.current = now;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    Speech.speak(`Over the limit. ${spokenLimit}.`, {
      language: "en-US",
      rate: 1.0,
    });
  }, [speedKmh, limitKmh, spokenLimit]);
}
