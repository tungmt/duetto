import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api";
import nav from "../src/navigation";
import { saveSession } from "../src/session";
import { styles } from "../src/styles";

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
              <Text style={styles.heroTitle}>Welcome Back</Text>
            </View>
            <Text style={styles.heroEyebrow}>Student Login</Text>
            <Text style={styles.heroSubtitle}>Sign in to your student account.</Text>
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="student@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                style={styles.input}
              />
            </View>

            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Password</Text>
              <View style={{ flexDirection: "row", alignItems: "center", position: "relative" }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
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

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={login}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 24, gap: 12 }}>
            <Pressable onPress={() => navigation.navigate("Register")} style={styles.buttonSecondary}>
              <Text style={styles.buttonSecondaryText}>Create a new account</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("ResetPassword")}>
              <Text style={styles.link}>Forgot your password?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

