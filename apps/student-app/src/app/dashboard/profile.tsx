import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import nav from "../../actions/navigation";
import { clearSession } from "../../actions/session";
import { styles } from "../../actions/styles";
import AppLogo from "../../components/AppLogo";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

type MenuItem = {
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <View style={[styles.card, { padding: 8, gap: 0 }]}>
      {items.map((item, index) => (
        <View key={item.title}>
          <Pressable
            style={({ pressed }) => [
              { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 12 },
              pressed && { opacity: 0.7 }
            ]}
            onPress={item.onPress}
          >
            <IconCircleButton icon={item.icon} size={38} style={{ backgroundColor: colors.inputBg }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={[styles.status, { marginTop: 2 }]}>{item.description}</Text>
            </View>
            <IconCircleButton icon="chevron-forward" size={28} style={{ backgroundColor: "transparent", borderWidth: 0 }} />
          </Pressable>
          {index < items.length - 1 ? (
            <View style={{ height: 1, backgroundColor: colors.borderColor, marginLeft: 58 }} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<{ displayName?: string; learningGoal?: string } | null>(null);

  async function refresh() {
    try {
      const data = await api("/api/me/student-profile");
      setProfile(data.profile);
    } catch (error) {
      // Handle error
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

            <View style={{ gap: 10 }}>
              <Text style={styles.sectionLabel}>Security</Text>
              <MenuList
                items={[
                  {
                    icon: "lock-closed-outline",
                    title: "Change Password",
                    description: "Keep your account secure",
                    onPress: () => navigation.navigate("UpdatePassword")
                  }
                ]}
              />
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.sectionLabel}>Resources</Text>
              <MenuList
                items={[
                  {
                    icon: "headset-outline",
                    title: "Contact Us",
                    description: "Need help? Reach our support team",
                    onPress: () => navigation.navigate("ContactUs")
                  },
                  {
                    icon: "shield-checkmark-outline",
                    title: "Privacy Policy",
                    description: "How we collect and protect your data",
                    onPress: () => navigation.navigate("PrivacyPolicy")
                  }
                ]}
              />
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
