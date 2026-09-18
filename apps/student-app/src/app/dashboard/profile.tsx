import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import nav from "../../actions/navigation";
import { clearSession } from "../../actions/session";
import { styles } from "../../actions/styles";
import AppLogo from "../../components/AppLogo";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import Text from "../../components/Text";

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<{ displayName?: string; learningGoal?: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
                  paddingBottom: 20,
                  gap: 14
                }
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <AppLogo size={52} />
                <Badge label="Account" tone="pink" />
              </View>
              <View>
                <Text style={styles.heroTitle}>Profile</Text>
                <Text style={[styles.heroEyebrow, { marginTop: 8 }]}>Account Settings</Text>
                <Text style={[styles.heroSubtitle, { marginTop: 6 }]}>Manage your account details and password.</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.sectionLabel, { marginBottom: 2 }]}>Your Profile</Text>
                  <Text style={[styles.title, { fontSize: 18 }]}>{profile?.displayName ?? "Your Name"}</Text>
                  <Text style={styles.status}>{profile?.learningGoal ?? "Add a learning goal to personalize your practice."}</Text>
                </View>
                <Badge label={profile?.learningGoal ? "Active" : "Needs Update"} tone={profile?.learningGoal ? "cyan" : "yellow"} />
              </View>
              <Button
                title="Edit Profile"
                variant="secondary"
                icon="create-outline"
                onPress={() => navigation.navigate("UpdateProfileFromDashboard")}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={[styles.status, { marginTop: -4 }]}>Use your current password to set a new one.</Text>

              <View style={{ gap: 14 }}>
                <FormInput
                  label="Current Password"
                  icon="lock-closed-outline"
                  isPassword
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  editable={!loading}
                />

                <FormInput
                  label="New Password"
                  icon="sparkles-outline"
                  isPassword
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  editable={!loading}
                />

                <Button
                  title={loading ? "Updating..." : "Update Password"}
                  icon="arrow-forward"
                  onPress={updatePassword}
                  loading={loading}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Session</Text>
              <Text style={[styles.status, { marginTop: -4 }]}>Sign out on this device or permanently remove your account.</Text>
              <View style={{ gap: 12 }}>
                <Button title="Log Out" variant="secondary" icon="log-out-outline" onPress={logout} />
                <Button title="Delete Account" variant="dark" icon="trash-outline" onPress={deleteAccount} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
