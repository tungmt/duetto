import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

type ContactUsScreenNavigationProp = NativeStackNavigationProp<any, "ContactUs">;

const SUPPORT_EMAIL = "support@duetto.app";
const SUPPORT_PHONE = "+1 (555) 010-2938";

function ContactMethod({
  icon,
  label,
  value,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
        pressed && { opacity: 0.7 }
      ]}
    >
      <IconCircleButton icon={icon} size={38} style={{ backgroundColor: colors.inputBg }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.status}>{label}</Text>
        <Text style={styles.title}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

export default function ContactUsScreen() {
  const navigation = useNavigation<ContactUsScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMessage() {
    if (!message.trim()) {
      Alert.alert("Missing info", "Please enter a message before sending.");
      return;
    }

    setSending(true);
    try {
      const subject = encodeURIComponent("Support request from teacher app");
      const body = encodeURIComponent(message);
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
      setMessage("");
    } catch (error) {
      Alert.alert("Error", "Could not open your mail app. Please email us directly at " + SUPPORT_EMAIL);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 32 }}>
          <View style={[styles.heroCard, localStyles.heroCard]}>
            <View style={[styles.heroTopRow, { justifyContent: "space-between" }]}>
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              <Badge label="Support" tone="neutral" />
            </View>

            <Text style={styles.heading}>Contact Us</Text>
            <Text style={[styles.subheading, { marginBottom: 0 }]}>
              Need help? Reach our support team or send us a message below.
            </Text>
          </View>

          <View style={[styles.card, { marginTop: 20 }]}>
            <Badge label="Get In Touch" tone="cyan" />
            <Text style={styles.title}>Talk to our team</Text>
            <View style={{ marginTop: 4 }}>
              <ContactMethod
                icon="mail-outline"
                label="Email"
                value={SUPPORT_EMAIL}
                onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              />
              <View style={{ height: 1, backgroundColor: colors.borderColor }} />
              <ContactMethod
                icon="call-outline"
                label="Phone"
                value={SUPPORT_PHONE}
                onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/[^+\d]/g, "")}`)}
              />
            </View>
          </View>

          <View style={[styles.card, { marginTop: 16 }]}>
            <Badge label="Send A Message" tone="pink" />
            <Text style={styles.title}>Describe your issue</Text>
            <Text style={styles.subtitle}>We typically respond within one business day.</Text>

            <View style={{ marginTop: 4 }}>
              <FormInput
                label="Message"
                icon="chatbubble-ellipses-outline"
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us how we can help..."
                multiline
                numberOfLines={5}
                style={{ minHeight: 110, paddingTop: 14, textAlignVertical: "top" }}
                editable={!sending}
              />
            </View>

            <Button
              title={sending ? "Opening mail app..." : "Send Message"}
              icon="paper-plane-outline"
              iconPosition="left"
              onPress={sendMessage}
              loading={sending}
              style={{ marginTop: 4 }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  heroCard: {
    padding: 20,
    gap: 12
  }
});
