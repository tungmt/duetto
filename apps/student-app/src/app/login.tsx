import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../actions/api";
import nav from "../actions/navigation";
import { saveSession } from "../actions/session";
import { styles } from "../actions/styles";
import Text from "../components/Text";
import AppLogo from "../components/AppLogo";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import IconCircleButton from "../components/IconCircleButton";
import SocialButton from "../components/SocialButton";
import colors from "../configs/colors";

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Missing password", "Please enter your password.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      await saveSession(data.user.id);
      if (!data.user.studentProfile) {
        nav.reset("AuthStack", { screen: "UpdateProfile" });
        return;
      }
      nav.reset("AppStack", { screen: "Dashboard" });
    } catch (error) {
      Alert.alert("Could not login", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: navigation.canGoBack() ? "space-between" : "flex-end", marginBottom: 20 }}>
              {navigation.canGoBack() ? (
                <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              ) : null}
              <Badge label="Safe & Verified" tone="cyan" />
            </View>

            <AppLogo />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Welcome back!</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>
              Log in to keep dueting with your crew and sharing feedback.
            </Text>

            <View style={{ gap: 18 }}>
              <FormInput
                label="Username or Email"
                icon="person-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="leo_dancer"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <View>
                <FormInput
                  label="Password"
                  icon="lock-closed-outline"
                  isPassword
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  editable={!loading}
                />
                <Pressable onPress={() => navigation.navigate("ResetPassword")} style={{ alignSelf: "flex-end", marginTop: 10 }}>
                  <Text style={{ color: colors.yellow, fontWeight: "700", fontSize: 13 }}>Forgot Password?</Text>
                </Pressable>
              </View>

              <Button title="Log in" icon="arrow-forward" onPress={login} loading={loading} style={{ marginTop: 4 }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.borderColor }} />
                <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}>
                  OR CONTINUE WITH
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.borderColor }} />
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <SocialButton label="Google" provider="google" />
                <SocialButton label="Apple" provider="apple" />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ alignItems: "center", marginBottom: insets.bottom + 24, marginTop: 12 }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          Don't have an account?
          <Text onPress={() => navigation.navigate("Register")} style={{ color: colors.secondary, fontWeight: "bold" }}>{` Sign up`}</Text>
        </Text>
      </View>
    </View>
  );
}
