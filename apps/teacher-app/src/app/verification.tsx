import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { api } from "../actions/api";
import nav from "../actions/navigation";
import { saveSession } from "../actions/session";
import { styles } from "../actions/styles";
import colors from "../configs/colors";
import Text from "../components/Text";
import AppLogo from "../components/AppLogo";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VerificationScreenNavigationProp = NativeStackNavigationProp<any, "Verification">;
type VerificationScreenRouteProp = {
  params?: { email?: string; code?: string; initialCooldownSeconds?: number };
};

const RESEND_COOLDOWN_SECONDS = 120;

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function VerificationScreen() {
  const navigation = useNavigation<VerificationScreenNavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = (route as VerificationScreenRouteProp).params ?? {};
  const [email] = useState(params.email ?? "");
  const [code, setCode] = useState(params.code ?? "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(
    params.initialCooldownSeconds ?? (params.email ? RESEND_COOLDOWN_SECONDS : 0)
  );

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  async function verify() {
    if (!email.trim() || !code.trim()) {
      Alert.alert("Missing information", "Please enter your email and verification code.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code })
      });
      await saveSession(data.user.id);
      nav.reset("AppStack", { screen: "Dashboard" });
    } catch (error) {
      Alert.alert("Could not verify", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email to resend verification code.");
      return;
    }
    setResending(true);
    try {
      await api("/api/auth/send-verification-email", { method: "POST", body: JSON.stringify({ email }) });
      Alert.alert("Code sent", "Check your email for the new verification code.");
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      Alert.alert("Could not resend code", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setResending(false);
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
              <FormInput label="Email" icon="mail-outline" value={email} editable={false} />

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

              <Button
                title={
                  resending
                    ? "Resending..."
                    : cooldownSeconds > 0
                      ? `Resend available in ${formatCooldown(cooldownSeconds)}`
                      : "Resend verification code"
                }
                variant="secondary"
                onPress={resendCode}
                loading={resending}
                disabled={cooldownSeconds > 0}
              />

              <Pressable
                onPress={() => navigation.navigate("Login")}
                disabled={loading || resending}
                style={{ alignItems: "center", marginTop: 4 }}
              >
                <Text style={{ color: colors.secondary, fontWeight: "700", fontSize: 14 }}>Wrong email? Login again</Text>
              </Pressable>

              <Text style={{ color: colors.textTertiary, fontSize: 13, lineHeight: 18, textAlign: "center" }}>
                Use the same email from login. If this is not your email, go back and sign in again.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
