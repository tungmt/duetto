import React, { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  TextInputProps,
  View,
  ViewStyle
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../configs/colors";

export type FormInputProps = TextInputProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  label?: string;
  containerStyle?: ViewStyle | ViewStyle[];
  isPassword?: boolean;
};

const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ icon, rightIcon, onRightIconPress, label, containerStyle, style, isPassword, secureTextEntry, ...props }, ref) => {
    const [hidden, setHidden] = useState(Boolean(isPassword));
    const showRightIcon = isPassword ? (hidden ? "eye-off" : "eye") : rightIcon;

    function handleRightIconPress() {
      if (isPassword) {
        setHidden((prev) => !prev);
        return;
      }
      onRightIconPress?.();
    }

    return (
      <View style={containerStyle}>
        {label ? <RNText style={styles.label}>{label}</RNText> : null}
        <View style={styles.wrap}>
          {icon ? <Ionicons name={icon} size={18} color={colors.textTertiary} style={styles.leftIcon} /> : null}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry={isPassword ? hidden : secureTextEntry}
            style={[
              styles.input,
              icon ? styles.inputWithLeftIcon : null,
              showRightIcon ? styles.inputWithRightIcon : null,
              style
            ]}
            {...props}
          />
          {showRightIcon ? (
            <Pressable onPress={handleRightIconPress} style={styles.rightIcon} hitSlop={10}>
              <Ionicons name={showRightIcon} size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }
);

FormInput.displayName = "FormInput";

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8
  },
  wrap: {
    position: "relative",
    justifyContent: "center"
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary
  },
  inputWithLeftIcon: {
    paddingLeft: 46
  },
  inputWithRightIcon: {
    paddingRight: 46
  },
  leftIcon: {
    position: "absolute",
    left: 18,
    zIndex: 1
  },
  rightIcon: {
    position: "absolute",
    right: 18
  }
});

export default FormInput;
