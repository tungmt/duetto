import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { clearSession } from "../../src/session";
import { styles } from "../../src/styles";

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<{ displayName?: string; learningGoal?: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const data = await api("/api/me/student-profile");
      setProfile(data.profile);
    } catch (error) {
      // Handle error
    }
  }

  async function updatePassword() {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert("Missing info", "Please enter both passwords.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/update-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      Alert.alert("Success", "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await clearSession();
    nav.reset("AuthStack", { screen: "Login" });
  }

  async function deleteAccount() {
    Alert.alert("Delete account", "This cannot be undone. Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await api("/api/me", { method: "DELETE" });
            await clearSession();
            nav.reset("AuthStack", { screen: "Login" });
          } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Could not delete account");
          }
        },
        style: "destructive"
      }
    ]);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View
              style={[
                styles.heroCard,
                {
                  marginBottom: 2,
                  marginHorizontal: -20,
                  marginTop: -20,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 16
                }
              ]}
            >
              <View style={styles.heroTopRow}>
                <Text style={styles.heroTitle}>Profile</Text>
              </View>
              <Text style={styles.heroEyebrow}>Account Settings</Text>
              <Text style={styles.heroSubtitle}>Manage your account details and password.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>{profile?.displayName ?? "Your Name"}</Text>
              <Text style={styles.status}>{profile?.learningGoal ?? "Learning Goal"}</Text>
              <Pressable 
                style={[styles.buttonSecondary, { marginTop: 12 }]}
                onPress={() => navigation.navigate("UpdateProfileFromDashboard")}
              >
                <Text style={styles.buttonSecondaryText}>Edit Profile</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Change Password</Text>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Current Password</Text>
                <View style={{ flexDirection: "row", alignItems: "center", position: "relative" }}>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showCurrentPassword}
                    editable={!loading}
                    style={[styles.input, { flex: 1, paddingRight: 48 }]}
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
              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>New Password</Text>
                <View style={{ flexDirection: "row", alignItems: "center", position: "relative" }}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showNewPassword}
                    editable={!loading}
                    style={[styles.input, { flex: 1, paddingRight: 48 }]}
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
              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={updatePassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? "Updating..." : "Update Password"}</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 24, gap: 12 }}>
              <Pressable
                style={styles.buttonSecondary}
                onPress={logout}
              >
                <Text style={styles.buttonSecondaryText}>Log Out</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonDanger]}
                onPress={deleteAccount}
              >
                <Text style={styles.buttonText}>Delete Account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
