import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../actions/api";
import { styles } from "../actions/styles";
import colors from "../configs/colors";
import Text from "../components/Text";
import AppLogo from "../components/AppLogo";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import IconCircleButton from "../components/IconCircleButton";

type RegisterScreenNavigationProp = NativeStackNavigationProp<any, "Register">;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("teacher@example.com");
  const [name, setName] = useState("Teacher");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!email.trim() || !name.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing information", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Password and confirm password do not match.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, password, profileKind: "TEACHER" })
      });
      Alert.alert("Verification code", data.verificationCode);
      navigation.navigate("Verification", {
        email,
        code: data.verificationCode,
        initialCooldownSeconds: 120
      });
    } catch (error) {
      Alert.alert("Could not register", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: navigation.canGoBack() ? "space-between" : "flex-end", marginBottom: 20 }}>
              {navigation.canGoBack() ? (
                <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              ) : null}
              <Badge label="Educator Onboarding" tone="neutral" />
            </View>

            <AppLogo color={colors.secondary} icon="sparkles" />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Join duetTo</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>
              Create your teacher account to publish challenges and mentor students.
            </Text>

            <View style={{ gap: 18 }}>
              <FormInput
                label="Full Name"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                editable={!loading}
              />

              <FormInput
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="teacher@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <FormInput
                label="Create Password"
                icon="lock-closed-outline"
                isPassword
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                editable={!loading}
              />

              <FormInput
                label="Confirm Password"
                icon="checkmark-circle-outline"
                isPassword
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                editable={!loading}
              />

              <Button
                title={loading ? "Creating account..." : "Create Account"}
                icon="create-outline"
                onPress={register}
                loading={loading}
                style={{ marginTop: 4 }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ marginTop: 12, alignItems: "center", marginBottom: insets.bottom + 24 }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          Already have an account?
          <Text onPress={() => navigation.navigate("Login")} style={{ color: colors.secondary, fontWeight: "bold" }}>{` Sign in`}</Text>
        </Text>
      </View>
    </View>
  );
}
