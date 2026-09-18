import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, api } from "../actions/api";
import nav from "../actions/navigation";
import { saveSession } from "../actions/session";
import { styles } from "../actions/styles";
import colors from "../configs/colors";
import Text from "../components/Text";
import AppLogo from "../components/AppLogo";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import IconCircleButton from "../components/IconCircleButton";

type LoginScreenNavigationProp = NativeStackNavigationProp<any, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
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
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      await saveSession(data.user.id);

      if (!data.user.teacherProfile) {
        nav.reset("AppStack", { screen: "UpdateProfileFromDashboard" });
        return;
      }

      nav.reset("AppStack", { screen: "Dashboard" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        try {
          await api("/api/auth/send-verification-email", {
            method: "POST",
            body: JSON.stringify({ email })
          });
        } catch {
          // Ignore resend failure here; verification screen still allows manual retry.
        }

        navigation.navigate("Verification", { email, initialCooldownSeconds: 120 });
        return;
      }

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
              <Badge label="Educator Access" tone="cyan" />
            </View>

            <AppLogo />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Welcome back!</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>
              Sign in to manage your classes and review student duets.
            </Text>

            <View style={{ gap: 18 }}>
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

              <Button
                title="Create a new account"
                variant="secondary"
                onPress={() => navigation.navigate("Register")}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
