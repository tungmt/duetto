import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../configs/colors";
import Text from "./Text";

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  function navigateTo(routeName: string) {
    const route = state.routes.find((item) => item.name === routeName);
    if (!route) return;

    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }

  function openCurrentChallenge() {
    navigation.navigate("ChallengesTab", { openActiveChallengeAt: Date.now() });
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        <TabItem
          icon="home-outline"
          activeIcon="home"
          label="Home"
          active={activeRoute === "ChallengesTab"}
          onPress={() => navigateTo("ChallengesTab")}
        />
        <TabItem
          icon="compass-outline"
          activeIcon="compass"
          label="Discover"
          active={false}
          onPress={() => navigateTo("ChallengesTab")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create"
          onPress={openCurrentChallenge}
          style={({ pressed }) => [styles.createSlot, pressed && styles.pressed]}
        >
          <View style={styles.createButton}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.createLabel}>Create</Text>
        </Pressable>
        <TabItem
          icon="heart-dislike-outline"
          activeIcon="heart-dislike"
          label="Feedback"
          active={activeRoute === "SubmissionsTab"}
          onPress={() => navigateTo("SubmissionsTab")}
        />
        <TabItem
          icon="person-outline"
          activeIcon="person"
          label="Profile"
          active={activeRoute === "ProfileTab"}
          onPress={() => navigateTo("ProfileTab")}
        />
      </View>
    </View>
  );
}

function TabItem({
  icon,
  activeIcon,
  label,
  active,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? colors.accent : colors.textTertiary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <Ionicons name={active ? activeIcon : icon} size={20} color={color} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.darkBg,
    alignItems: "center",
    paddingTop: 0
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: 72,
    backgroundColor: colors.darkBg,
    borderTopWidth: 1,
    borderColor: colors.textPrimary,
    padding: 10
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: 52,
    gap: 3
  },
  tabLabel: {
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: "600"
  },
  tabLabelActive: {
    color: colors.accent
  },
  createSlot: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: 52,
    gap: 2
  },
  createButton: {
    width: 48,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  createLabel: {
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: "600"
  },
  pressed: {
    opacity: 0.72
  }
});
