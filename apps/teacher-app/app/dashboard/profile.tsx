import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { clearSession } from "../../src/session";
import { styles } from "../../src/styles";

type ProfileScreenNavigationProp = NativeStackNavigationProp<any, "ProfileTab">;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [profile, setProfile] = useState<{ displayName?: string; headline?: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const data = await api("/api/me/teacher-profile");
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
    navigation.reset({
      index: 0,
      routes: [{ name: "AuthStack" }]
    });
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
            navigation.reset({
              index: 0,
              routes: [{ name: "AuthStack" }]
            });
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.heading}>Profile</Text>
              <Text style={styles.subheading}>Manage your account</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>{profile?.displayName ?? "Your Name"}</Text>
              <Text style={styles.status}>{profile?.headline ?? "Headline"}</Text>
              <Pressable style={[styles.buttonSecondary, { marginTop: 12 }]} onPress={() => navigation.navigate("UpdateProfileFromDashboard")}>
                <Text style={styles.buttonSecondaryText}>Edit Profile</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Change Password</Text>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Current Password</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  editable={!loading}
                  style={styles.input}
                />
              </View>
              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>New Password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  editable={!loading}
                  style={styles.input}
                />
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
    </SafeAreaView>
  );
}
