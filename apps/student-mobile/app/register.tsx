import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { styles } from "../src/styles";

export default function RegisterScreen() {
  const [email, setEmail] = useState("student@example.com");
  const [name, setName] = useState("Student");
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!email.trim() || !name.trim()) {
      Alert.alert("Missing information", "Please enter your email and name.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, profileKind: "STUDENT" })
      });
      Alert.alert("Verification code", data.verificationCode);
      router.push({ pathname: "/verification", params: { email, code: data.verificationCode } });
    } catch (error) {
      Alert.alert("Could not register", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>Join as a student to get started</Text>
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

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={register}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Creating account..." : "Create Account"}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 24 }}>
            <Link href="/login" asChild>
              <Pressable>
                <Text style={styles.link}>Already have an account? Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
