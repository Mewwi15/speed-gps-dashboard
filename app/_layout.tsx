import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LocationProvider } from "@/contexts/LocationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { TripsProvider } from "@/contexts/TripsContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <LocationProvider>
          <TripsProvider>
            <StatusBar barStyle="light-content" />
            <Stack screenOptions={{ headerShown: false }} />
          </TripsProvider>
        </LocationProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
