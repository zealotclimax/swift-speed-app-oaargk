
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View, Text, Alert, TouchableOpacity } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Stack } from "expo-router";
import * as Location from "expo-location";
import Svg, { Circle, Line, Text as SvgText, Path, Defs, RadialGradient, Stop } from "react-native-svg";

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

          if (isTracking) {
            lastPosition.current = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
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
    setDistance(0);
  };

  const stopTracking = () => {
    console.log("User tapped Stop button - Stopping distance tracking");
    setIsTracking(false);
    lastPosition.current = null;
    console.log("Distance tracking stopped");
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
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <View style={styles.altitudeContainer}>
          <Text style={styles.altitudeLabel}>Altitude</Text>
          <Text style={styles.altitudeValue}>
            {altitudeDisplay}
          </Text>
          <Text style={styles.altitudeUnit}>m</Text>
        </View>

        <View style={styles.speedometerContainer}>
          <Speedometer speed={speedDisplay} maxSpeed={240} />
          <View style={styles.speedTextContainer}>
            <Text style={styles.speedValue}>
              {speedDisplay}
            </Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        </View>

        <View style={styles.bottomInfoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>TRIP A</Text>
            <Text style={styles.infoValue}>0.0 km</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>TOTAL</Text>
            <Text style={styles.infoValue}>
              {distanceDisplay}
            </Text>
            <Text style={styles.infoUnit}>km</Text>
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

interface SpeedometerProps {
  speed: number;
  maxSpeed: number;
}

function Speedometer({ speed, maxSpeed }: SpeedometerProps) {
  const size = 380;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2 - 10;
  
  const startAngle = 210;
  const endAngle = 330;
  const angleRange = endAngle - startAngle + 360;
  
  const progress = Math.min(speed / maxSpeed, 1);

  const centerX = size / 2;
  const centerY = size / 2;
  
  const tickMarks = [];
  const speedLabels = [];
  
  for (let i = 0; i <= 240; i += 10) {
    const angle = startAngle + (i / 240) * angleRange;
    const angleRad = (angle * Math.PI) / 180;
    
    const isMainTick = i % 20 === 0;
    const tickLength = isMainTick ? 20 : 12;
    const tickWidth = isMainTick ? 2.5 : 1.5;
    
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
        stroke="#FFFFFF"
        strokeWidth={tickWidth}
        opacity={0.9}
      />
    );
    
    if (i % 20 === 0) {
      const labelRadius = radius - 38;
      const x = centerX + labelRadius * Math.cos(angleRad);
      const y = centerY + labelRadius * Math.sin(angleRad);
      
      speedLabels.push(
        <SvgText
          key={`label-${i}`}
          x={x}
          y={y}
          fill="#FFFFFF"
          fontSize="16"
          fontWeight="600"
          textAnchor="middle"
          alignmentBaseline="middle"
          opacity={0.95}
        >
          {i}
        </SvgText>
      );
    }
  }
  
  const kmhLabelAngle = 90;
  const kmhLabelRad = (kmhLabelAngle * Math.PI) / 180;
  const kmhLabelRadius = radius - 60;
  const kmhX = centerX + kmhLabelRadius * Math.cos(kmhLabelRad);
  const kmhY = centerY + kmhLabelRadius * Math.sin(kmhLabelRad);

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const backgroundPath = describeArc(centerX, centerY, radius, startAngle, endAngle);

  const currentSpeedAngle = startAngle + progress * angleRange;
  const progressPath = describeArc(centerX, centerY, radius, startAngle, currentSpeedAngle);

  const needleAngle = startAngle + progress * angleRange;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius - 30;
  const needleX = centerX + needleLength * Math.cos(needleRad);
  const needleY = centerY + needleLength * Math.sin(needleRad);

  return (
    <Svg width={size} height={size} style={styles.speedometer}>
      <Defs>
        <RadialGradient id="dialGradient" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#1a1a1a" stopOpacity="1" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
        </RadialGradient>
      </Defs>
      
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius + 20}
        fill="url(#dialGradient)"
      />
      
      <Path
        d={backgroundPath}
        stroke="#2a2a2a"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      
      <Path
        d={progressPath}
        stroke="#E53935"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      
      {tickMarks}
      {speedLabels}
      
      <SvgText
        x={kmhX}
        y={kmhY}
        fill="#FFFFFF"
        fontSize="14"
        fontWeight="500"
        textAnchor="middle"
        alignmentBaseline="middle"
        opacity={0.7}
      >
        km/h
      </SvgText>
      
      <Line
        x1={centerX}
        y1={centerY}
        x2={needleX}
        y2={needleY}
        stroke="#E53935"
        strokeWidth={3}
        strokeLinecap="round"
      />
      
      <Circle
        cx={centerX}
        cy={centerY}
        r={8}
        fill="#E53935"
      />
      
      <Circle
        cx={centerX}
        cy={centerY}
        r={4}
        fill="#000000"
      />
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
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
  altitudeValue: {
    fontSize: 24,
    fontWeight: "700",
    color: '#FFFFFF',
  },
  altitudeUnit: {
    fontSize: 14,
    color: '#999999',
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
    top: 180,
  },
  speedValue: {
    fontSize: 90,
    fontWeight: "bold",
    letterSpacing: -2,
    color: '#FFFFFF',
  },
  speedUnit: {
    fontSize: 20,
    color: '#999999',
    marginTop: 0,
    fontWeight: "500",
  },
  bottomInfoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    marginTop: -20,
  },
  infoBox: {
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: '#FFFFFF',
  },
  infoUnit: {
    fontSize: 11,
    color: '#999999',
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
    backgroundColor: "#1a1a1a",
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
