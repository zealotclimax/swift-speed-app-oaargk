
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Stack } from "expo-router";
import * as Location from "expo-location";
import Svg, { Circle } from "react-native-svg";

export default function HomeScreen() {
  const { colors } = useTheme();
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastPosition = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    console.log("Requesting location permissions");
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const permissionGranted = status === "granted";
      setHasPermission(permissionGranted);
      console.log("Location permission granted:", permissionGranted);
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
    if (!hasPermission) {
      Alert.alert("Permission Required", "Location permission is required to track speed.");
      return;
    }

    console.log("Starting GPS tracking");
    setIsTracking(true);
    lastPosition.current = null;
    setDistance(0);

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          console.log("Location update received");
          
          const speedInKmh = location.coords.speed ? location.coords.speed * 3.6 : 0;
          setSpeed(Math.max(0, speedInKmh));

          const altitudeValue = location.coords.altitude || 0;
          setAltitude(altitudeValue);

          if (lastPosition.current) {
            const distanceIncrement = calculateDistance(
              lastPosition.current.latitude,
              lastPosition.current.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
            setDistance((prev) => prev + distanceIncrement);
          }

          lastPosition.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      );
    } catch (error) {
      console.error("Error starting location tracking:", error);
      Alert.alert("Error", "Failed to start GPS tracking");
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    console.log("Stopping GPS tracking");
    if (locationSubscription.current) {
      try {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      } catch (error) {
        console.log("Error stopping tracking:", error);
      }
    }
    setIsTracking(false);
    lastPosition.current = null;
  };

  const speedDisplay = Math.round(speed);
  const altitudeDisplay = Math.round(altitude);
  const distanceDisplay = (distance / 1000).toFixed(2);

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

        <View style={styles.speedometerContainer}>
          <Speedometer speed={speedDisplay} maxSpeed={200} color={colors.primary} />
          <View style={styles.speedTextContainer}>
            <Text style={[styles.speedValue, { color: colors.text }]}>
              {speedDisplay}
            </Text>
            <Text style={[styles.speedUnit, { color: colors.text }]}>km/h</Text>
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.startButton,
              { backgroundColor: isTracking ? "#666" : "#4CAF50" },
              !hasPermission && styles.disabledButton,
            ]}
            onPress={startTracking}
            disabled={isTracking || !hasPermission}
          >
            <Text style={styles.buttonText}>START</Text>
          </TouchableOpacity>

          <View style={styles.distanceContainer}>
            <Text style={[styles.distanceLabel, { color: colors.text }]}>Distance</Text>
            <Text style={[styles.distanceValue, { color: colors.text }]}>
              {distanceDisplay}
            </Text>
            <Text style={[styles.distanceUnit, { color: colors.text }]}>km</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.stopButton,
              { backgroundColor: isTracking ? "#F44336" : "#666" },
            ]}
            onPress={stopTracking}
            disabled={!isTracking}
          >
            <Text style={styles.buttonText}>STOP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

interface SpeedometerProps {
  speed: number;
  maxSpeed: number;
  color: string;
}

function Speedometer({ speed, maxSpeed, color }: SpeedometerProps) {
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const progress = Math.min(speed / maxSpeed, 1);
  const progressOffset = circumference * (1 - progress * 0.75);

  return (
    <Svg width={size} height={size} style={styles.speedometer}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#333"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset={-circumference * 0.125}
        strokeLinecap="round"
      />
      
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset={progressOffset - circumference * 0.125}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
    paddingTop: 60,
  },
  altitudeContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  altitudeLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  altitudeValue: {
    fontSize: 24,
    fontWeight: "600",
  },
  altitudeUnit: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  speedometerContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  speedometer: {
    transform: [{ rotate: "135deg" }],
  },
  speedTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  speedValue: {
    fontSize: 72,
    fontWeight: "bold",
  },
  speedUnit: {
    fontSize: 20,
    opacity: 0.7,
    marginTop: 4,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  startButton: {},
  stopButton: {},
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  distanceContainer: {
    alignItems: "center",
    flex: 1,
  },
  distanceLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  distanceUnit: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
});
