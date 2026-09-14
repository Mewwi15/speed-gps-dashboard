import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

export default function useLocation() {
  const [speed, setSpeed] = useState<number>(0);
  const [topSpeed, setTopSpeed] = useState<number>(0);
  const [avgSpeed, setAvgSpeed] = useState<number>(0);
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [alt, setAlt] = useState<number>(0);
  const [address, setAddress] = useState<string>("Loading...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const speedSum = useRef(0);
  const speedCount = useRef(0);
  const lastGeocodeTime = useRef(0);

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const initTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission denied");
          return;
        }

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          async (location) => {
            const currentLat = location.coords.latitude;
            const currentLng = location.coords.longitude;
            const currentAlt = location.coords.altitude || 0;

            let speedInMps = location.coords.speed || 0;
            if (speedInMps < 0) speedInMps = 0;

            let currentSpeedKmh = 0;
            if (speedInMps >= 1.0) {
              currentSpeedKmh = Math.round(speedInMps * 3.6);
            }

            setLat(currentLat);
            setLng(currentLng);
            setAlt(Math.round(currentAlt));
            setSpeed(currentSpeedKmh);

            setTopSpeed((prev) => Math.max(prev, currentSpeedKmh));

            if (currentSpeedKmh > 0) {
              speedSum.current += currentSpeedKmh;
              speedCount.current += 1;
              setAvgSpeed(Math.round(speedSum.current / speedCount.current));
            }

            const now = Date.now();
            if (now - lastGeocodeTime.current > 10000) {
              lastGeocodeTime.current = now;
              try {
                const geo = await Location.reverseGeocodeAsync({
                  latitude: currentLat,
                  longitude: currentLng,
                });
                if (geo && geo.length > 0) {
                  const place = geo[0];
                  const streetName =
                    place.street ||
                    place.name ||
                    place.district ||
                    "Unknown Road";
                  setAddress(streetName);
                }
              } catch {}
            }
          },
        );
      } catch {
        setErrorMsg("Error getting location");
      }
    };

    initTracking();

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, []);

  return { speed, topSpeed, avgSpeed, lat, lng, alt, address, errorMsg };
}
