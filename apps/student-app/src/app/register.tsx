import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "../components/Text";
import { api } from "../actions/api";
import { styles } from "../actions/styles";
import colors from "../configs/colors";

export default function RegisterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("student@example.com");
  const [name, setName] = useState("Student");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        body: JSON.stringify({ email, name, password, profileKind: "STUDENT" })
      });
      Alert.alert("Verification code", data.verificationCode);
      navigation.navigate("Verification", { email, code: data.verificationCode });
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
          <View style={{ gap: 24, marginHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 24 }}>
            <Text style={styles.heroTitle}>Create Account</Text>
            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                style={styles.input}
              />
            </View>
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
                  placeholder="At least 6 characters"
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
                  placeholder="Re-enter password"
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
              onPress={register}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Creating account..." : "Create Account"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ marginTop: 24, alignItems: "center", marginBottom: insets.bottom + 24, }}>
        <Text style={{ fontSize: 14, color: '#BDB5C7' }}>Already have an account?
            <Text onPress={() => navigation.navigate("Login")} style={{color: colors.secondary, fontWeight: "bold"}}>{` Sign in`}</Text>
        </Text>
      </View>
    </View>
  );
}

