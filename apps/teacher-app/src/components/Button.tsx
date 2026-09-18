import React from "react";
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import colors from "../configs/colors";

type ButtonVariant = "primary" | "secondary" | "outline" | "dark";

export type ButtonProps = Omit<PressableProps, "style"> & {
  title: string;
  loading?: boolean;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  style?: ViewStyle | ViewStyle[];
};

export default function Button({
  title,
  loading,
  disabled,
  variant = "primary",
  icon,
  iconPosition = "right",
  style,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || Boolean(loading);
  const textColor = variant === "primary" ? "#FFFFFF" : colors.textPrimary;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "outline" && styles.outline,
        variant === "dark" && styles.dark,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && iconPosition === "left" ? (
            <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: 8 }} />
          ) : null}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
          {icon && iconPosition === "right" ? (
            <Ionicons name={icon} size={18} color={textColor} style={{ marginLeft: 8 }} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 20
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2
  },
  secondary: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderColor
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.borderColor
  },
  dark: {
    backgroundColor: colors.darkBg,
    borderWidth: 1,
    borderColor: colors.borderColor
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }]
  },
  text: {
    fontSize: 16,
    fontWeight: "700"
  }
});
