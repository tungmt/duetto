import React from "react";
import { StyleSheet, View, ViewStyle, TextStyle } from "react-native";
import Text from "./Text";
import colors from "../configs/colors";

type BadgeTone = "cyan" | "neutral" | "pink" | "yellow";

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle | ViewStyle[];
};

export default function Badge({ label, tone = "cyan", style }: BadgeProps) {
  return (
    <View style={[styles.base, toneStyles[tone].container, style]}>
      <Text style={[styles.text, toneStyles[tone].text]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  }
});

const toneStyles: Record<BadgeTone, { container: ViewStyle; text: TextStyle }> = {
  cyan: {
    container: { backgroundColor: "rgba(118, 87, 255, 0.1)", borderColor: "rgba(118, 87, 255, 0.28)" },
    text: { color: colors.secondary }
  },
  neutral: {
    container: { backgroundColor: "#F7F5F8", borderColor: colors.borderColor },
    text: { color: colors.textSecondary }
  },
  pink: {
    container: { backgroundColor: "rgba(255, 47, 120, 0.1)", borderColor: "rgba(255, 47, 120, 0.28)" },
    text: { color: colors.accent }
  },
  yellow: {
    container: { backgroundColor: "rgba(255, 212, 71, 0.2)", borderColor: "rgba(255, 212, 71, 0.48)" },
    text: { color: "#8A6500" }
  }
};
