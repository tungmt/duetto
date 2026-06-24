import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { saveSession } from "../src/session";
import { styles } from "../src/styles";

export default function VerificationScreen({ navigation, route }: any) {
  const params = route?.params || {};
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
      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      });
    } catch (error) {
      Alert.alert("Could not verify", error instanceof Error ? error.message : "Unknown error");
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
              <Text style={styles.heroTitle}>Verify Email</Text>
            </View>
            <Text style={styles.heroEyebrow}>Email Verification</Text>
            <Text style={styles.heroSubtitle}>Enter the code sent to your email.</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
