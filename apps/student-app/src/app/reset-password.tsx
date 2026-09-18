import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "../components/Text";
import { api } from "../actions/api";
import { styles } from "../actions/styles";
import colors from "../configs/colors";
import AppLogo from "../components/AppLogo";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import IconCircleButton from "../components/IconCircleButton";

type Step = "request" | "verify";

export default function ResetPasswordScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestReset() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email: email.toLowerCase() }) });
      Alert.alert("Code sent", "Check your email for the reset code.");
      setStep("verify");
    } catch (error) {
      Alert.alert("Could not send reset code", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndReset() {
    if (!code.trim()) {
      Alert.alert("Missing code", "Please enter the code from your email.");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Missing password", "Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api("/api/auth/verify-reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.toLowerCase(), code, newPassword })
      });
      Alert.alert("Success", "Password reset successful. You can now log in.", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert("Could not reset password", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ marginBottom: 20 }}>
              <IconCircleButton
                icon="arrow-back"
                onPress={() => {
                  navigation.goBack();
                  setStep("request");
                }}
              />
            </View>

            <AppLogo />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Reset Password</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>
              {step === "request"
                ? "We'll send you a code to reset your password."
                : "Enter the code and your new password."}
            </Text>

            {step === "request" ? (
              <View style={{ gap: 18 }}>
                <FormInput
                  label="Email Address"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="student@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />

                <Button
                  title={loading ? "Sending..." : "Send Reset Code"}
                  icon="paper-plane-outline"
                  onPress={requestReset}
                  loading={loading}
                />
              </View>
            ) : (
              <View style={{ gap: 18 }}>
                <FormInput
                  label="Reset Code"
                  icon="keypad-outline"
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  keyboardType="number-pad"
                  editable={!loading}
                />

                <FormInput
                  label="New Password"
                  icon="lock-closed-outline"
                  isPassword
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  editable={!loading}
                />

                <FormInput
                  label="Confirm Password"
                  icon="checkmark-circle-outline"
                  isPassword
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  editable={!loading}
                />

                <Button
                  title={loading ? "Resetting..." : "Reset Password"}
                  icon="checkmark-done-outline"
                  onPress={verifyAndReset}
                  loading={loading}
                />

                <Pressable onPress={() => setStep("request")} disabled={loading} style={{ alignItems: "center" }}>
                  <Text style={{ color: colors.secondary, fontWeight: "700", fontSize: 14 }}>Back to email entry</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={() => {
                navigation.goBack();
                setStep("request");
              }}
              disabled={loading}
              style={{ alignItems: "center", marginTop: 20 }}
            >
              <Text style={{ color: colors.secondary, fontWeight: "700", fontSize: 14 }}>Back to login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
