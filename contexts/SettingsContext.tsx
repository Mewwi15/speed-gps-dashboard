import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GAUGE_CONFIG, type GaugeSpec, type Mode, type Unit } from "@/constants/speed";
import { ACCENT_DEFAULT } from "@/constants/theme";

type SettingsValue = {
  mode: Mode;
  unit: Unit;
  gaugeColor: string;
  setMode: (mode: Mode) => void;
  setUnit: (unit: Unit) => void;
  setGaugeColor: (color: string) => void;
  /** Gauge bounds for the current mode and unit. */
  gauge: GaugeSpec;
};

const SettingsContext = createContext<SettingsValue | null>(null);

/**
 * Cockpit preferences shared by every screen, so the map reads out the same
 * unit and accent the gauge is using.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("Car");
  const [unit, setUnit] = useState<Unit>("KM/H");
  const [gaugeColor, setGaugeColor] = useState<string>(ACCENT_DEFAULT);

  const value = useMemo<SettingsValue>(
    () => ({
      mode,
      unit,
      gaugeColor,
      setMode,
      setUnit,
      setGaugeColor,
      gauge: GAUGE_CONFIG[mode][unit],
    }),
    [mode, unit, gaugeColor],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export default function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used inside a <SettingsProvider>");
  }
  return value;
}
