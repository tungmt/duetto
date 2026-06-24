import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { styles } from "../src/styles";

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("student@example.com");
  const [name, setName] = useState("Student");
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.heroCard, { marginBottom: 16 }]}> 
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>Create Account</Text>
            </View>
            <Text style={styles.heroEyebrow}>Student Onboarding</Text>
            <Text style={styles.heroSubtitle}>Join as a student to get started.</Text>
          </View>

          <View style={{ gap: 12 }}>
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
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                editable={!loading}
                style={styles.input}
              />
            </View>
            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                editable={!loading}
                style={styles.input}
              />
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={register}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Creating account..." : "Create Account"}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 24 }}>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
