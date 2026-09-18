import React, { forwardRef } from "react";
import { Text as ReactNativeText, TextProps } from "react-native";

export const Text = forwardRef<ReactNativeText, TextProps>((props, ref) => (
	<ReactNativeText ref={ref} {...props} />
));

Text.displayName = "Text";

export default Text;
