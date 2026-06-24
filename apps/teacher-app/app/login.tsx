import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { ApiError, api } from "../src/api";
import nav from "../src/navigation";
import { saveSession } from "../src/session";
import { styles } from "../src/styles";

type LoginScreenNavigationProp = NativeStackNavigationProp<any, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState("teacher@example.com");
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.heroCard, { marginBottom: 16 }]}> 
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>Welcome Back</Text>
            </View>
            <Text style={styles.heroEyebrow}>Teacher Login</Text>
            <Text style={styles.heroSubtitle}>Sign in to your teacher account.</Text>
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Email</Text>
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

            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                editable={!loading}
                style={styles.input}
              />
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={login}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 24, gap: 12 }}>
            <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate("Register")}>
              <Text style={styles.buttonSecondaryText}>Create a new account</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("ResetPassword")}>
              <Text style={styles.link}>Forgot your password?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
