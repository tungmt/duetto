import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../configs/colors";

type AppLogoProps = {
  size?: number;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AppLogo({ size = 48, color = colors.primary, icon = "infinite" }: AppLogoProps) {
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color }
      ]}
    >
      <Ionicons name={icon} size={size * 0.55} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center"
  }
});
