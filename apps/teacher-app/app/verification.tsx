import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { api } from "../src/api";
import nav from "../src/navigation";
import { saveSession } from "../src/session";
import { styles } from "../src/styles";

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

    if (cooldownSeconds > 0) {
      return;
    }

    setResending(true);
    try {
      await api("/api/auth/send-verification-email", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      Alert.alert("Code resent", "A new verification code has been sent to your email.");
    } catch (error) {
      Alert.alert("Could not resend code", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={ui.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={ui.topAccent} />

          <View style={ui.headerWrap}>
            <View style={ui.badge}>
              <Text style={ui.badgeText}>Secure Check</Text>
            </View>
            <Text style={ui.heading}>Verify Your Email</Text>
            <Text style={ui.subheading}>We sent a 6-digit code to the email below.</Text>
          </View>

          <View style={ui.card}>
            <View>
              <Text style={ui.label}>Email</Text>
              <View style={ui.emailBox}>
                <Text style={ui.emailText}>{email || "No email found"}</Text>
              </View>
            </View>

            <View>
              <Text style={ui.label}>Verification Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
                style={[styles.input, ui.codeInput]}
              />
            </View>

            <Pressable
              style={[ui.primaryButton, loading && styles.buttonDisabled]}
              onPress={verify}
              disabled={loading}
            >
              <Text style={ui.primaryButtonText}>{loading ? "Verifying..." : "Verify Email"}</Text>
            </Pressable>

            <Pressable
              style={[ui.secondaryButton, (resending || cooldownSeconds > 0) && styles.buttonDisabled]}
              onPress={resendCode}
              disabled={resending || cooldownSeconds > 0}
            >
              <Text style={ui.secondaryButtonText}>
                {resending
                  ? "Resending..."
                  : cooldownSeconds > 0
                    ? `Resend available in ${formatCooldown(cooldownSeconds)}`
                    : "Resend verification code"}
              </Text>
            </Pressable>

            <Pressable
              style={ui.linkButton}
              onPress={() => navigation.navigate("Login")}
              disabled={loading || resending}
            >
              <Text style={ui.linkButtonText}>Wrong email? Login again</Text>
            </Pressable>

            <Text style={ui.helperText}>Use the same email from login. If this is not your email, go back and sign in again.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ui = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 18
  },
  topAccent: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#0ea5e9",
    marginHorizontal: 24
  },
  headerWrap: {
    gap: 8
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    borderColor: "#bae6fd",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999
  },
  badgeText: {
    color: "#0369a1",
    fontWeight: "700",
    fontSize: 12
  },
  heading: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800"
  },
  subheading: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "500"
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3
  },
  label: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  emailBox: {
    backgroundColor: "#eef2f7",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    justifyContent: "center"
  },
  emailText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "600"
  },
  codeInput: {
    letterSpacing: 2,
    fontWeight: "700"
  },
  primaryButton: {
    backgroundColor: "#0284c7",
    borderRadius: 14,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700"
  },
  linkButton: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 8
  },
  linkButtonText: {
    color: "#0c4a6e",
    fontSize: 15,
    fontWeight: "700"
  },
  helperText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18
  }
});
