import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api";
import { styles } from "../src/styles";

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<any, "ResetPassword">;
type Step = "request" | "verify";

export default function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
          <View
            style={[
              styles.heroCard,
              {
                marginBottom: 16,
                paddingTop: insets.top + 16,
                paddingHorizontal: 16,
                paddingBottom: 16
              }
            ]}
          >
            <View style={styles.heroTopRow}>
              <Pressable onPress={() => { navigation.goBack(); setStep("request"); }} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={styles.heroTitle}>Reset Password</Text>
            </View>
            <Text style={styles.heroEyebrow}>Account Recovery</Text>
            <Text style={styles.heroSubtitle}>
              {step === "request" ? "We'll send you a code to reset your password." : "Enter the code and your new password."}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {step === "request" ? (
              <>
                <View>
                  <Text style={[styles.title, { marginBottom: 8 }]}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="teacher@example.com"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                    style={styles.input}
                  />
                </View>

                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={requestReset}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? "Sending..." : "Send Reset Code"}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View>
                  <Text style={[styles.title, { marginBottom: 8 }]}>Reset Code</Text>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    editable={!loading}
                    style={styles.input}
                  />
                </View>

                <View>
                  <Text style={[styles.title, { marginBottom: 8 }]}>New Password</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", position: "relative" }}>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showPassword}
                      editable={!loading}
                      style={[styles.input, { flex: 1, paddingRight: 48 }]}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      style={({ pressed }) => ({
                        position: "absolute",
                        right: 12,
                        padding: 8,
                        opacity: pressed ? 0.6 : 1
                      })}
                    >
                      <Ionicons
                        name={showPassword ? "eye" : "eye-off"}
                        size={20}
                        color="#64748b"
                      />
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text style={[styles.title, { marginBottom: 8 }]}>Confirm Password</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", position: "relative" }}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showConfirmPassword}
                      editable={!loading}
                      style={[styles.input, { flex: 1, paddingRight: 48 }]}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      style={({ pressed }) => ({
                        position: "absolute",
                        right: 12,
                        padding: 8,
                        opacity: pressed ? 0.6 : 1
                      })}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye" : "eye-off"}
                        size={20}
                        color="#64748b"
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={verifyAndReset}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? "Resetting..." : "Reset Password"}</Text>
                </Pressable>

                <Pressable onPress={() => setStep("request")} disabled={loading}>
                  <Text style={styles.link}>Back to email entry</Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={() => { navigation.goBack(); setStep("request"); }} disabled={loading}>
              <Text style={styles.link}>Back to login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

