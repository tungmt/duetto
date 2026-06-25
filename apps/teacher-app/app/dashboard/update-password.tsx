import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";

type UpdatePasswordScreenNavigationProp = NativeStackNavigationProp<any, "UpdatePassword">;

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef3f8"
  },
  content: {
    padding: 16,
    gap: 16
  },
  header: {
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
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
    position: "relative"
  },
  passwordInputWrapper: {
    flex: 1,
    position: "relative"
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -10,
    padding: 8
  },
  button: {
    backgroundColor: "#0369a1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  buttonDisabled: {
    backgroundColor: "#ccc"
  },
  cancelButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
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
          <View style={localStyles.header}>
            <Text style={localStyles.headerTitle}>Change Password</Text>
            <Text style={localStyles.headerSubtitle}>Update your account password</Text>
          </View>

          <View style={localStyles.card}>
            <Text style={localStyles.cardText}>
              Keep your account secure by using a strong password. Your password must be at least 8 characters long.
            </Text>
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

