import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
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

type ProfileScreenNavigationProp = NativeStackNavigationProp<any, "ProfileTab">;

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

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [profile, setProfile] = useState<{ displayName?: string; headline?: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const insets = useSafeAreaInsets();

  function resetToAuthStack() {
    nav.reset("AuthStack");
  }

  const refresh = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const data = await api("/api/me/teacher-profile");
      setProfile(data.profile);
    } catch (error) {
      Alert.alert("Error", "Could not load profile details.");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const initials = useMemo(() => {
    const raw = (profile?.displayName || "Teacher").trim();
    if (!raw) {
      return "T";
    }
    const parts = raw.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "T";
    const second = parts.length > 1 ? parts[1][0] : "";
    return (first + second).toUpperCase();
  }, [profile?.displayName]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function logout() {
    await clearSession();
    resetToAuthStack();
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
            resetToAuthStack();
          } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Could not delete account");
          }
        },
        style: "destructive"
      }
    ]);
  }

  function openPrivacyPolicy() {
    Alert.alert("Privacy Policy", "Privacy Policy page will be available soon.");
  }

  function openSupport() {
    Alert.alert("Support", "Support page will be available soon.");
  }

  return (
    <View style={styles.safe}>
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <AppLogo size={58} icon="person" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.heroTitle}>{profile?.displayName ?? "Teacher Account"}</Text>
                <Text style={styles.heroSubtitle}>{profile?.headline || "Teacher"}</Text>
                <Badge label="Profile Ready" tone="cyan" style={{ marginTop: 6 }} />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button
                title="Edit Profile"
                variant="secondary"
                icon="create-outline"
                onPress={() => navigation.navigate("UpdateProfileFromDashboard")}
                style={{ flex: 1, height: 48 }}
              />
              <Button
                title="Password"
                variant="secondary"
                icon="lock-closed-outline"
                onPress={() => navigation.navigate("UpdatePassword")}
                style={{ flex: 1, height: 48 }}
              />
            </View>
          </View>

          {loadingProfile ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.emptyText, { marginTop: 8 }]}>Refreshing your profile...</Text>
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>Account</Text>
            <MenuList
              items={[
                {
                  icon: "person-outline",
                  title: "Edit Profile Details",
                  description: "Personal information and public bio",
                  onPress: () => navigation.navigate("UpdateProfileFromDashboard")
                }
              ]}
            />
          </View>

          <View style={{ gap: 10, marginTop: 20 }}>
            <Text style={styles.sectionLabel}>Security</Text>
            <MenuList
              items={[
                {
                  icon: "lock-closed-outline",
                  title: "Change Password",
                  description: "Keep your account secure",
                  onPress: () => navigation.navigate("UpdatePassword")
                },
                {
                  icon: "log-out-outline",
                  title: "Log Out",
                  description: "End this session on this device",
                  onPress: logout
                }
              ]}
            />
          </View>

          <View style={{ gap: 10, marginTop: 20 }}>
            <Text style={styles.sectionLabel}>Resources</Text>
            <MenuList
              items={[
                {
                  icon: "shield-checkmark-outline",
                  title: "Privacy Policy",
                  description: "How we collect and protect your data",
                  onPress: openPrivacyPolicy
                },
                {
                  icon: "headset-outline",
                  title: "Support",
                  description: "Need help? Contact our support team",
                  onPress: openSupport
                }
              ]}
            />
          </View>

          <View style={{ gap: 12, marginTop: 20 }}>
            <Text style={styles.sectionLabel}>Danger Zone</Text>
            <Button title="Log Out" variant="secondary" icon="log-out-outline" onPress={logout} />
            <Button title="Delete Account" variant="dark" icon="trash-outline" onPress={deleteAccount} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
