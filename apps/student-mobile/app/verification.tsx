import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { saveSession } from "../src/session";
import { styles } from "../src/styles";

export default function VerificationScreen() {
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState(params.code ?? "");
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!email.trim() || !code.trim()) {
      Alert.alert("Missing information", "Please enter your email and verification code.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) });
      await saveSession(data.user.id);
      router.replace("/dashboard/challenges");
    } catch (error) {
      Alert.alert("Could not verify", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.heading}>Verify Email</Text>
            <Text style={styles.subheading}>Enter the code sent to your email</Text>
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
              <Text style={[styles.title, { marginBottom: 8 }]}>Verification Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                style={styles.input}
              />
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={verify}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Verifying..." : "Verify Email"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
