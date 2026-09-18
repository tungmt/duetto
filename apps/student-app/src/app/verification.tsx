import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "../components/Text";
import { api } from "../actions/api";
import nav from "../actions/navigation";
import { saveSession } from "../actions/session";
import { styles } from "../actions/styles";
import AppLogo from "../components/AppLogo";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormInput from "../components/FormInput";

export default function VerificationScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const params = route?.params || {};
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState(params.code ?? "");
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!email.trim() || !code.trim()) {
      Alert.alert("Missing information", "Please enter your email and verification code.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) });
      await saveSession(data.user.id);
      nav.reset("AppStack", { screen: "Dashboard" });
    } catch (error) {
      Alert.alert("Could not verify", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 20 }}>
              <Badge label="Secure Check" tone="cyan" />
            </View>

            <AppLogo />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Verify Your Email</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>We sent a 6-digit code to the email below.</Text>

            <View style={{ gap: 18 }}>
              <FormInput
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="student@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <FormInput
                label="Verification Code"
                icon="keypad-outline"
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />

              <Button
                title={loading ? "Verifying..." : "Verify Email"}
                icon="shield-checkmark-outline"
                onPress={verify}
                loading={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
