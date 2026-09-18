import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../configs/colors";

type IconCircleButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  style?: object;
};

export default function IconCircleButton({ icon, onPress, size = 40, style }: IconCircleButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && { opacity: 0.7 },
        style
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: "center",
    justifyContent: "center"
  }
});
