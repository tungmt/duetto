import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { styles } from "../src/styles";

export default function ResetPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function reset() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) });
      Alert.alert("Request sent", "Check your email for reset instructions.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Could not reset", error instanceof Error ? error.message : "Unknown error");
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
              <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={styles.heroTitle}>Reset Password</Text>
            </View>
            <Text style={styles.heroEyebrow}>Account Recovery</Text>
            <Text style={styles.heroSubtitle}>We will send you instructions to reset your password.</Text>
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Email Address</Text>
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
              onPress={reset}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Sending..." : "Send Reset Link"}</Text>
            </Pressable>

            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Back to login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
