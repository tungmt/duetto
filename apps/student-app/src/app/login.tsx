import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../actions/api";
import nav from "../actions/navigation";
import { saveSession } from "../actions/session";
import { styles } from "../actions/styles";
import Text from "../components/Text";
import colors from "../configs/colors";

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

          <View style={{ gap: 24, marginHorizontal: 16, paddingTop: insets.top + 24, paddingBottom: 24 }}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>Welcome Back</Text>
            </View>

            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Username or email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
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

            <View style={{ width: "100%", alignItems: "flex-end" }}>
              <Pressable onPress={() => navigation.navigate("ResetPassword")}>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>


        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ marginTop: 24, alignItems: "center", marginBottom: insets.bottom + 24, }}>
        <Text style={{ fontSize: 14, color: '#BDB5C7' }}>Don't have an account? 
          <Text onPress={() => navigation.navigate("Register")} style={{ color: colors.secondary, fontWeight: "bold" }}>{` Sign up`}</Text>
        </Text>
      </View>
    </View>
  );
}

