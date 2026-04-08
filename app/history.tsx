
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "swift_speed_history";

type SessionRecord = {
  id: string;
  date: string;
  distance: number;
  altitudeGain: number;
};

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${dayName}, ${day} ${month} ${year} · ${hours}:${minutes}`;
}

function BackButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const handleBack = () => {
    console.log("User tapped Back button on History screen");
    router.back();
  };
  return (
    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
      <Text style={[styles.backButtonText, { color: colors.primary }]}>‹ Back</Text>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [history, setHistory] = useState<SessionRecord[]>([]);

  const MAX_RECORDS = 5;

  const loadHistory = useCallback(async () => {
    console.log("Loading session history from AsyncStorage");
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      const parsed: SessionRecord[] = stored ? JSON.parse(stored) : [];
      const limited = parsed.slice(-MAX_RECORDS).reverse();
      setHistory(limited);
      console.log("Loaded", parsed.length, "history records, displaying", limited.length);
    } catch (error) {
      console.error("Error loading history:", error);
      setHistory([]);
    }
  }, []);

  const clearHistory = async () => {
    console.log("User tapped Clear All — deleting all history from AsyncStorage");
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
      setHistory([]);
      console.log("History cleared successfully");
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const renderItem = ({ item }: { item: SessionRecord }) => {
    const distanceKm = (item.distance / 1000).toFixed(2);
    const altGain = Math.round(item.altitudeGain);
    const dateLabel = formatDate(item.date);
    const distanceLabel = `${distanceKm} km`;
    const altLabel = `↑ ${altGain} m`;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardDate, { color: colors.text }]}>{dateLabel}</Text>
        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatValue, { color: colors.text }]}>{distanceLabel}</Text>
            <Text style={[styles.cardStatLabel, { color: colors.text }]}>Distance</Text>
          </View>
          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatValue, { color: colors.text }]}>{altLabel}</Text>
            <Text style={[styles.cardStatLabel, { color: colors.text }]}>Altitude Gain</Text>
          </View>
        </View>
      </View>
    );
  };

  const emptyComponent = (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.text }]}>No sessions recorded yet</Text>
      <Text style={[styles.emptySubtext, { color: colors.text }]}>
        Start a tracking session to see your history here
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "History",
          headerShown: true,
          headerLeft: () => <BackButton />,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text },
        }}
      />
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        ListFooterComponent={
          history.length > 0 ? (
            <TouchableOpacity
              style={[styles.clearButton, { borderColor: colors.border }]}
              onPress={clearHistory}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { backgroundColor: colors.background },
          history.length === 0 && styles.listContentEmpty,
        ]}
        style={{ backgroundColor: colors.background }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardDate: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 12,
    fontWeight: "500",
  },
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardStat: {
    flex: 1,
    alignItems: "center",
  },
  cardStatValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardStatLabel: {
    fontSize: 12,
    opacity: 0.55,
    fontWeight: "500",
  },
  cardDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: "center",
    lineHeight: 20,
  },
  backButton: {
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: "400",
  },
  clearButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF3B30",
  },
});
