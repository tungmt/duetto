import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Linking, Pressable, type GestureResponderEvent, type PressableProps, type TextStyle } from 'react-native';
import { type ComponentProps } from 'react';
import { ThemedText } from '@/components/themed-text';

type Props = Omit<PressableProps, 'onPress'> & {
  href: string;
  textStyle?: TextStyle;
  children?: ComponentProps<typeof ThemedText>['children'];
};

export function ExternalLink({ href, textStyle, children, ...rest }: Props) {
  async function onPress(event: GestureResponderEvent) {
    if (process.env.EXPO_OS !== 'web') {
      // Open external urls in an in-app browser on native.
      await openBrowserAsync(href, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
      return;
    }

    await Linking.openURL(href);
  }

  return (
    <Pressable {...rest} onPress={onPress}>
      <ThemedText type="link" style={textStyle}>
        {children ?? href}
      </ThemedText>
    </Pressable>
  );
}
