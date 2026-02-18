
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View, Text, Alert, TouchableOpacity } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Stack } from "expo-router";
import * as Location from "expo-location";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";

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
      
      if (!permissionGranted) {
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
    console.log("User tapped Start button - Starting GPS tracking");
    if (!hasPermission) {
      Alert.alert("Permission Required", "Location permission is required to track speed and distance.");
      return;
    }

    setIsTracking(true);
    lastPosition.current = null;
    setDistance(0);
    setSpeed(0);

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
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          const speedInMps = location.coords.speed !== null && location.coords.speed >= 0 
            ? location.coords.speed 
            : 0;
          const speedInKmh = speedInMps * 3.6;
          setSpeed(Math.max(0, Math.round(speedInKmh)));
          console.log("Speed calculated:", speedInKmh, "km/h");

          const altitudeValue = location.coords.altitude || 0;
          setAltitude(Math.round(altitudeValue));

          if (lastPosition.current && speedInMps > 0.5) {
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

          lastPosition.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      );
      console.log("Location tracking started successfully");
    } catch (error) {
      console.error("Error starting location tracking:", error);
      Alert.alert("Error", "Failed to start GPS tracking");
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    console.log("User tapped Stop button - Stopping GPS tracking");
    if (locationSubscription.current) {
      try {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      } catch (error) {
        console.log("Error removing subscription:", error);
      }
    }
    setIsTracking(false);
    console.log("Tracking stopped");
  };

  const speedDisplay = speed;
  const altitudeDisplay = altitude;
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
          <Speedometer speed={speedDisplay} maxSpeed={200} color={colors.primary} textColor={colors.text} />
          <View style={styles.speedTextContainer}>
            <Text style={[styles.speedValue, { color: colors.text }]}>
              {speedDisplay}
            </Text>
            <Text style={[styles.speedUnit, { color: colors.text }]}>km/h</Text>
          </View>
        </View>

        <View style={styles.distanceContainer}>
          <Text style={[styles.distanceLabel, { color: colors.text }]}>Distance</Text>
          <Text style={[styles.distanceValue, { color: colors.text }]}>
            {distanceDisplay}
          </Text>
          <Text style={[styles.distanceUnit, { color: colors.text }]}>km</Text>
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

interface SpeedometerProps {
  speed: number;
  maxSpeed: number;
  color: string;
  textColor: string;
}

function Speedometer({ speed, maxSpeed, color, textColor }: SpeedometerProps) {
  const size = 340;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const progress = Math.min(speed / maxSpeed, 1);
  const progressOffset = circumference * (1 - progress * 0.75);

  const centerX = size / 2;
  const centerY = size / 2;
  
  const tickMarks = [];
  const speedLabels = [0, 40, 80, 120, 160, 200];
  
  for (let i = 0; i <= 200; i += 10) {
    const angle = -135 + (i / 200) * 270;
    const angleRad = (angle * Math.PI) / 180;
    
    const isMainTick = i % 40 === 0;
    const tickLength = isMainTick ? 20 : 12;
    const tickWidth = isMainTick ? 3 : 2;
    
    const innerRadius = radius - tickLength;
    const outerRadius = radius;
    
    const x1 = centerX + innerRadius * Math.cos(angleRad);
    const y1 = centerY + innerRadius * Math.sin(angleRad);
    const x2 = centerX + outerRadius * Math.cos(angleRad);
    const y2 = centerY + outerRadius * Math.sin(angleRad);
    
    tickMarks.push(
      <Line
        key={`tick-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={textColor}
        strokeWidth={tickWidth}
        opacity={0.6}
      />
    );
  }
  
  const speedLabelElements = speedLabels.map((labelSpeed) => {
    const angle = -135 + (labelSpeed / 200) * 270;
    const angleRad = (angle * Math.PI) / 180;
    const labelRadius = radius - 40;
    
    const x = centerX + labelRadius * Math.cos(angleRad);
    const y = centerY + labelRadius * Math.sin(angleRad);
    
    return (
      <SvgText
        key={`label-${labelSpeed}`}
        x={x}
        y={y}
        fill={textColor}
        fontSize="16"
        fontWeight="600"
        textAnchor="middle"
        alignmentBaseline="middle"
        opacity={0.7}
      >
        {labelSpeed}
      </SvgText>
    );
  });

  return (
    <Svg width={size} height={size} style={styles.speedometer}>
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke="#333"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset={-circumference * 0.125}
        strokeLinecap="round"
      />
      
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset={progressOffset - circumference * 0.125}
        strokeLinecap="round"
      />
      
      {tickMarks}
      {speedLabelElements}
    </Svg>
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
  speedometerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  speedometer: {
    transform: [{ rotate: "0deg" }],
  },
  speedTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  speedValue: {
    fontSize: 96,
    fontWeight: "bold",
    letterSpacing: -2,
  },
  speedUnit: {
    fontSize: 28,
    opacity: 0.7,
    marginTop: 4,
    fontWeight: "600",
  },
  distanceContainer: {
    alignItems: "center",
  },
  distanceLabel: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 48,
    fontWeight: "bold",
  },
  distanceUnit: {
    fontSize: 18,
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
