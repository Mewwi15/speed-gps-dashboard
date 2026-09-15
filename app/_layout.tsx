import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LocationProvider } from "@/contexts/LocationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { TripsProvider } from "@/contexts/TripsContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    // Reveal the app once the typeface is ready, but never hold the splash
    // hostage to a font that failed to load.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
