import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { saveSession } from "../src/session";
import { styles } from "../src/styles";

export default function LoginScreen({ navigation }: any) {
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
        navigation.navigate("UpdateProfile");
        return;
      }
      navigation.replace("Dashboard");
    } catch (error) {
      Alert.alert("Could not login", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Sign in to your student account</Text>
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
            <Pressable onPress={() => navigation.navigate("Register")} style={styles.buttonSecondary}>
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
