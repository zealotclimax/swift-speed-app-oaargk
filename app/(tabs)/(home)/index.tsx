
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View, Text, Alert, TouchableOpacity, Platform } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ExpoKeepAwake from "expo-keep-awake";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "swift_speed_history";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function HomeScreen() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    ExpoKeepAwake.activateKeepAwakeAsync();
    return () => {
      ExpoKeepAwake.deactivateKeepAwake();
    };
  }, []);
  const { colors } = useTheme();
  const router = useRouter();
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [distance, setDistance] = useState(0);
  const [altitudeGain, setAltitudeGain] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastPosition = useRef<{ latitude: number; longitude: number } | null>(null);
  const prevAltitudeRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const distanceRef = useRef(0);
  const altitudeGainRef = useRef(0);

  // Keep refs in sync with state so stopTracking can read latest values
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);

  useEffect(() => {
    altitudeGainRef.current = altitudeGain;
  }, [altitudeGain]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    console.log("Requesting location permissions and starting continuous speed tracking");
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const permissionGranted = status === "granted";
      setHasPermission(permissionGranted);
      console.log("Location permission granted:", permissionGranted);

      if (permissionGranted) {
        startContinuousSpeedTracking();
      } else {
        showAlert("Permission Required", "Location permission is required to track speed and distance.");
      }
    })();

    return () => {
      if (locationSubscription.current) {
        console.log("Cleaning up location subscription");
        try {
          locationSubscription.current.remove();
        } catch (error) {
          console.log("Error removing subscription:", error);
        }
      }
    };
  }, []);

  const startContinuousSpeedTracking = async () => {
    console.log("Starting continuous speed tracking");
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0.5,
        },
        (location) => {
          console.log("Location update:", {
            speed: location.coords.speed,
            altitude: location.coords.altitude,
          });

          const speedInMps = location.coords.speed !== null && location.coords.speed >= 0
            ? location.coords.speed
            : 0;
          const speedInKmh = speedInMps * 3.6;
          setSpeed(Math.max(0, Math.round(speedInKmh)));

          const altitudeValue = location.coords.altitude || 0;
          setAltitude(Math.round(altitudeValue));

          if (isTrackingRef.current && lastPosition.current && speedInMps > 0.5) {
            const distanceIncrement = calculateDistance(
              lastPosition.current.latitude,
              lastPosition.current.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
            console.log("Distance increment:", distanceIncrement, "meters");
            setDistance((prev) => {
              const newDistance = prev + distanceIncrement;
              console.log("Total distance:", newDistance / 1000, "km");
              return newDistance;
            });
          }

          if (isTrackingRef.current) {
            if (prevAltitudeRef.current !== null) {
              const altitudeDifference = altitudeValue - prevAltitudeRef.current;
              if (altitudeDifference > 0.5) {
                const newGain = altitudeGainRef.current + altitudeDifference;
                altitudeGainRef.current = newGain;
                setAltitudeGain(newGain);
                console.log("Altitude gain increment:", altitudeDifference, "meters. Total altitude gain:", newGain, "meters");
              }
            }
            prevAltitudeRef.current = altitudeValue;
          }

          // Always update lastPosition on every tick so the
          // first movement after pressing Start has a valid previous position.
          lastPosition.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      );
      console.log("Continuous speed tracking started successfully");
    } catch (error) {
      console.error("Error starting continuous speed tracking:", error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const startTracking = async () => {
    console.log("User tapped Start button - Starting distance tracking");
    if (!hasPermission && Platform.OS !== "web") {
      showAlert("Permission Required", "Location permission is required to track speed and distance.");
      return;
    }

    setIsTracking(true);
    lastPosition.current = null;
    prevAltitudeRef.current = null;
    distanceRef.current = 0;
    altitudeGainRef.current = 0;
    setDistance(0);
    setAltitudeGain(0);
  };

  const stopTracking = async () => {
    console.log("User tapped Stop button - Stopping distance tracking");
    const finalDistance = distanceRef.current;
    const finalAltitudeGain = altitudeGainRef.current;

    setIsTracking(false);
    lastPosition.current = null;
    prevAltitudeRef.current = null;
    console.log("Distance tracking stopped. Final distance:", finalDistance / 1000, "km, altitude gain:", finalAltitudeGain, "m");

    if (finalDistance > 0) {
      try {
        const record = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          distance: finalDistance,
          altitudeGain: finalAltitudeGain,
        };
        console.log("Saving session to history:", record);
        const existing = await AsyncStorage.getItem(HISTORY_KEY);
        const history = existing ? JSON.parse(existing) : [];
        const updated = [record, ...history].slice(0, 20);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        console.log("Session saved to history. Total records:", updated.length);
      } catch (error) {
        console.error("Error saving session to history:", error);
      }
    } else {
      console.log("Session not saved - distance was 0");
    }
  };

  const handleHistoryPress = () => {
    console.log("User tapped History button - navigating to /history");
    router.push("/history");
  };

  const speedDisplay = speed;
  const altitudeDisplay = altitude;
  const distanceDisplay = (distance / 1000).toFixed(2);
  const altitudeGainDisplay = Math.round(altitudeGain);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.historyButton, { backgroundColor: colors.card }]}
          onPress={handleHistoryPress}
        >
          <Text style={[styles.historyButtonText, { color: colors.text }]}>History</Text>
        </TouchableOpacity>

        <View style={styles.altitudeContainer}>
          <Text style={[styles.altitudeLabel, { color: colors.text }]}>Altitude</Text>
          <Text style={[styles.altitudeValue, { color: colors.text }]}>
            {altitudeDisplay}
          </Text>
          <Text style={[styles.altitudeUnit, { color: colors.text }]}>m</Text>
        </View>

        <View style={styles.speedContainer}>
          <Text style={[styles.speedValue, { color: colors.text }]}>
            {speedDisplay}
          </Text>
          <Text style={[styles.speedUnit, { color: colors.text }]}>km/h</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.text }]}>Distance</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {distanceDisplay}
            </Text>
            <Text style={[styles.statUnit, { color: colors.text }]}>km</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.text }]}>Altitude Gain</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {altitudeGainDisplay}
            </Text>
            <Text style={[styles.statUnit, { color: colors.text }]}>m</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.startButton, !isTracking && { backgroundColor: '#4CAF50' }]}
            onPress={startTracking}
            disabled={isTracking}
          >
            <Text style={[styles.buttonText, !isTracking && { color: '#FFFFFF' }]}>START</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.stopButton, isTracking && { backgroundColor: '#F44336' }]}
            onPress={stopTracking}
            disabled={!isTracking}
          >
            <Text style={[styles.buttonText, isTracking && { color: '#FFFFFF' }]}>STOP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 140,
  },
  historyButton: {
    position: "absolute",
    top: 60,
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    opacity: 0.85,
    zIndex: 10,
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  altitudeContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  altitudeLabel: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 4,
  },
  altitudeValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  altitudeUnit: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 2,
  },
  speedContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  speedValue: {
    fontSize: 200,
    fontWeight: "bold",
    letterSpacing: -8,
    lineHeight: 220,
  },
  speedUnit: {
    fontSize: 48,
    opacity: 0.7,
    marginTop: 8,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
    gap: 20,
    marginTop: 60,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "bold",
  },
  statUnit: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    position: "absolute",
    bottom: 40,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#333",
  },
  startButton: {
    marginRight: "auto",
  },
  stopButton: {
    marginLeft: "auto",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
  },
});
