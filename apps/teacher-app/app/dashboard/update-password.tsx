import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";

type UpdatePasswordScreenNavigationProp = NativeStackNavigationProp<any, "UpdatePassword">;

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef3f8"
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 36
  },
  heroCard: {
    backgroundColor: "#0f2742",
    borderRadius: 20,
    padding: 18,
    gap: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4
  },
  backButton: {
    backgroundColor: "rgba(147, 197, 253, 0.2)",
    borderColor: "rgba(147, 197, 253, 0.5)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  backButtonText: {
    color: "#dbeafe",
    fontSize: 13,
    fontWeight: "700"
  },
  heroEyebrow: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  heroTitle: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20
  },
  panelCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbe4ef"
  },
  cardText: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20
  },
  formSection: {
    gap: 16
  },
  inputGroup: {
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a"
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    width: '100%'
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ef",
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "500",
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%"
  },
  button: {
    backgroundColor: "#0369a1",
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  cancelButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dbe4ef",
    marginTop: 8
  },
  cancelButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700"
  }
});

export default function UpdatePasswordScreen() {
  const navigation = useNavigation<UpdatePasswordScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    if (!currentPassword.trim()) {
      Alert.alert("Missing info", "Please enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Missing info", "Please enter a new password.");
      return;
    }
    if (!confirmPassword.trim()) {
      Alert.alert("Missing info", "Please confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await api("/api/auth/update-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      Alert.alert("Success", "Password updated successfully.", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={localStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={localStyles.content} keyboardShouldPersistTaps="handled">
          <View
            style={[
              localStyles.heroCard,
              {
                marginHorizontal: -16,
                marginTop: -16,
                paddingTop: insets.top + 16,
                paddingHorizontal: 16,
                paddingBottom: 16
              }
            ]}
          >
            <View style={localStyles.heroTopRow}>
              <Pressable style={localStyles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
                <Text style={localStyles.backButtonText}>{"< Back"}</Text>
              </Pressable>
              <Text style={localStyles.heroTitle}>Change Password</Text>
            </View>
            <Text style={localStyles.heroEyebrow}>Security</Text>
            <Text style={localStyles.heroSubtitle}>Use a strong password to keep your account secure.</Text>
          </View>

          <View style={localStyles.panelCard}>
            <Text style={localStyles.cardText}>
              Keep your account secure by using a strong password. Your password must be at least 8 characters long.
            </Text>

            <View style={localStyles.formSection}>
              <View style={localStyles.inputGroup}>
                <Text style={localStyles.label}>Current Password</Text>
                <View style={localStyles.inputContainer}>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter your current password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showCurrentPassword}
                    editable={!loading}
                    style={[localStyles.input, { paddingRight: 48 }]}
                  />
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    disabled={loading}
                    style={({ pressed }) => ({
                      position: "absolute",
                      right: 12,
                      padding: 8,
                      opacity: pressed ? 0.6 : 1
                    })}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#64748b"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={localStyles.inputGroup}>
                <Text style={localStyles.label}>New Password</Text>
                <View style={localStyles.inputContainer}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter a new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showNewPassword}
                    editable={!loading}
                    style={[localStyles.input, { paddingRight: 48 }]}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    disabled={loading}
                    style={({ pressed }) => ({
                      position: "absolute",
                      right: 12,
                      padding: 8,
                      opacity: pressed ? 0.6 : 1
                    })}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#64748b"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={localStyles.inputGroup}>
                <Text style={localStyles.label}>Confirm New Password</Text>
                <View style={localStyles.inputContainer}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                    style={[localStyles.input, { paddingRight: 48 }]}
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
                style={[localStyles.button, loading && localStyles.buttonDisabled]}
                onPress={updatePassword}
                disabled={loading}
              >
                <Text style={localStyles.buttonText}>{loading ? "Updating..." : "Update Password"}</Text>
              </Pressable>

              <Pressable
                style={localStyles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text style={localStyles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

