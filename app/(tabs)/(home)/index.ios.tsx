
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View, Text, Alert, TouchableOpacity } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Stack } from "expo-router";
import * as Location from "expo-location";

export default function HomeScreen() {
  const { colors } = useTheme();
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [distance, setDistance] = useState(0);
  const [altitudeGain, setAltitudeGain] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastPosition = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastAltitude = useRef<number | null>(null);

  useEffect(() => {
    console.log("Requesting location permissions and starting continuous speed tracking");
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const permissionGranted = status === "granted";
      setHasPermission(permissionGranted);
      console.log("Location permission granted:", permissionGranted);
      
      if (permissionGranted) {
        startContinuousSpeedTracking();
      } else {
        Alert.alert("Permission Required", "Location permission is required to track speed and distance.");
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

          if (isTracking && lastPosition.current && speedInMps > 0.5) {
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

          if (isTracking && lastAltitude.current !== null) {
            const altitudeDifference = altitudeValue - lastAltitude.current;
            if (altitudeDifference > 0) {
              console.log("Altitude gain:", altitudeDifference, "meters");
              setAltitudeGain((prev) => {
                const newGain = prev + altitudeDifference;
                console.log("Total altitude gain:", newGain, "meters");
                return newGain;
              });
            }
          }

          if (isTracking) {
            lastPosition.current = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            lastAltitude.current = altitudeValue;
          }
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
    if (!hasPermission) {
      Alert.alert("Permission Required", "Location permission is required to track speed and distance.");
      return;
    }

    setIsTracking(true);
    lastPosition.current = null;
    lastAltitude.current = null;
    setDistance(0);
    setAltitudeGain(0);
  };

  const stopTracking = () => {
    console.log("User tapped Stop button - Stopping distance tracking");
    setIsTracking(false);
    lastPosition.current = null;
    lastAltitude.current = null;
    console.log("Distance tracking stopped");
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
    justifyContent: "space-evenly",
    paddingVertical: 40,
    paddingTop: 60,
  },
  altitudeContainer: {
    alignItems: "center",
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
    flex: 1,
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
