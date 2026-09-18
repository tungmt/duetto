import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../configs/colors";

type TabIconMap = Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }>;

type FloatingTabBarProps = BottomTabBarProps & {
  icons: TabIconMap;
  centerAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
};

export default function FloatingTabBar({ state, navigation, icons, centerAction }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const midIndex = Math.ceil(routes.length / 2);
  const leftRoutes = routes.slice(0, midIndex);
  const rightRoutes = routes.slice(midIndex);

  function renderTab(route: (typeof routes)[number], index: number) {
    const isFocused = state.index === index;
    const meta = icons[route.name] ?? { active: "ellipse", inactive: "ellipse-outline", label: route.name };

    function onPress() {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tabButton}>
        <Ionicons
          name={isFocused ? meta.active : meta.inactive}
          size={24}
          color={isFocused ? colors.primary : colors.textTertiary}
        />
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom > 0 ? insets.bottom - 8 : 12 }]}>
      <View style={styles.bar}>
        {leftRoutes.map(renderTab)}

        {centerAction ? (
          <View style={styles.centerSlot}>
            <Pressable onPress={centerAction.onPress} style={styles.centerButton}>
              <Ionicons name={centerAction.icon} size={26} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        {rightRoutes.map((route, i) => renderTab(route, midIndex + i))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgColor,
    alignItems: "center",
    paddingTop: 0
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: 64,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderColor: colors.borderColor,
    paddingHorizontal: 20
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44
  },
  centerSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: 56
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
    borderWidth: 3,
    borderColor: colors.bgColor,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3
  }
});
