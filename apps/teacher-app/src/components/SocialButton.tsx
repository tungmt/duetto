import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import colors from "../configs/colors";

type SocialButtonProps = {
  label: string;
  provider: "google" | "apple";
  onPress?: () => void;
  style?: object;
};

export default function SocialButton({ label, provider, onPress, style }: SocialButtonProps) {
  const isApple = provider === "apple";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isApple ? styles.apple : styles.google,
        pressed && { opacity: 0.85 },
        style
      ]}
    >
      <View style={styles.row}>
        {isApple ? (
          <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
        ) : (
          <View style={styles.googleG}>
            <Text style={styles.googleGText}>G</Text>
          </View>
        )}
        <Text style={[styles.text, isApple ? styles.appleText : styles.googleText]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  google: {
    backgroundColor: colors.cardBg,
    borderColor: colors.borderColor
  },
  apple: {
    backgroundColor: "#000000",
    borderColor: "#000000"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  text: {
    fontSize: 15,
    fontWeight: "700"
  },
  googleText: {
    color: colors.textPrimary
  },
  appleText: {
    color: "#FFFFFF"
  },
  googleG: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  googleGText: {
    color: "#4285F4",
    fontSize: 12,
    fontWeight: "800"
  }
});
