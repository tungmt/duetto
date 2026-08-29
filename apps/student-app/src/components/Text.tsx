import React, { forwardRef } from "react";
import {
	Text as ReactNativeText,
	TextProps,
	TextStyle,
	StyleSheet
} from "react-native";

export const Text = forwardRef<ReactNativeText, TextProps>(
	({ style, ...props }, ref) => (
		<ReactNativeText ref={ref} {...props} style={[styles.text, style]} />
	)
);

Text.displayName = "Text";

const styles = StyleSheet.create<{ text: TextStyle }>({
	text: {
		fontFamily: "Nunito"
	}
});

export default Text;
