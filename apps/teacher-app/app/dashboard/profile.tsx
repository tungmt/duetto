import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { clearSession } from "../../src/session";

type ProfileScreenNavigationProp = NativeStackNavigationProp<any, "ProfileTab">;

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef3f8"
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 14
  },
  header: {
    marginBottom: 6
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b"
  },
  heroCard: {
    backgroundColor: "#0f2742",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#223a59",
    borderWidth: 1,
    borderColor: "#355171",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarInitials: {
    color: "#e2e8f0",
    fontSize: 20,
    fontWeight: "700"
  },
  heroIdentity: {
    flex: 1,
    gap: 2
  },
  heroName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc"
  },
  heroHeadline: {
    fontSize: 13,
    color: "#cbd5e1"
  },
  heroTag: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3b5778",
    backgroundColor: "#1b3453"
  },
  heroTagText: {
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2
  },
  quickActions: {
    flexDirection: "row",
    gap: 10
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a"
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden"
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center"
  },
  menuIconText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155"
  },
  menuTextWrap: {
    flex: 1
  },
  menuItemText: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "600"
  },
  menuItemDescription: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2
  },
  arrow: {
    fontSize: 18,
    color: "#0c4a6e"
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginLeft: 58
  },
  loadingWrap: {
    paddingVertical: 36,
    alignItems: "center",
    gap: 12
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b"
  },
  actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 10
  },
  logoutButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbe3ee"
  },
  logoutButtonText: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "700"
  },
  deleteButton: {
    backgroundColor: "#fff5f5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fca5a5"
  },
  deleteButtonText: {
    fontSize: 15,
    color: "#b91c1c",
    fontWeight: "600"
  }
});

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
    <View style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.content} keyboardShouldPersistTaps="handled">
        <View
          style={[
            localStyles.heroCard,
            {
              marginHorizontal: -16,
              marginTop: -14,
              paddingTop: insets.top + 16,
              paddingHorizontal: 16,
              paddingBottom: 16
            }
          ]}
        >
          <View style={localStyles.heroTop}>
            <View style={localStyles.avatarCircle}>
              <Text style={localStyles.avatarInitials}>{initials}</Text>
            </View>
            <View style={localStyles.heroIdentity}>
              <Text style={localStyles.heroName}>{profile?.displayName ?? "Teacher Account"}</Text>
              <Text style={localStyles.heroHeadline}>{profile?.headline || "Teacher"}</Text>
              <View style={localStyles.heroTag}>
                <Text style={localStyles.heroTagText}>PROFILE READY</Text>
              </View>
            </View>
          </View>

          <View style={localStyles.quickActions}>
            <Pressable style={localStyles.quickActionButton} onPress={() => navigation.navigate("UpdateProfileFromDashboard")}>
              <Text style={localStyles.quickActionText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={localStyles.quickActionButton} onPress={() => navigation.navigate("UpdatePassword")}>
              <Text style={localStyles.quickActionText}>Password</Text>
            </Pressable>
          </View>
        </View>

        {loadingProfile ? (
          <View style={localStyles.loadingWrap}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={localStyles.loadingText}>Refreshing your profile...</Text>
          </View>
        ) : null}

        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Account</Text>
          <View style={localStyles.listCard}>
            <Pressable
              style={localStyles.menuItem}
              onPress={() => navigation.navigate("UpdateProfileFromDashboard")}
            >
              <View style={localStyles.menuLeft}>
                <View style={localStyles.menuIcon}>
                  <Ionicons name="person-outline" size={18} color="#334155" />
                </View>
                <View style={localStyles.menuTextWrap}>
                  <Text style={localStyles.menuItemDescription}>Personal information and public bio</Text>
                  <Text style={localStyles.menuItemText}>Edit Profile Details</Text>
                </View>
              </View>
              <Text style={localStyles.arrow}>{">"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Security</Text>
          <View style={localStyles.listCard}>
            <Pressable
              style={localStyles.menuItem}
              onPress={() => navigation.navigate("UpdatePassword")}
            >
              <View style={localStyles.menuLeft}>
                <View style={localStyles.menuIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color="#334155" />
                </View>
                <View style={localStyles.menuTextWrap}>
                  <Text style={localStyles.menuItemDescription}>Keep your account secure</Text>
                  <Text style={localStyles.menuItemText}>Change Password</Text>
                </View>
              </View>
              <Text style={localStyles.arrow}>{">"}</Text>
            </Pressable>
            <View style={localStyles.divider} />
            <Pressable style={localStyles.menuItem} onPress={logout}>
              <View style={localStyles.menuLeft}>
                <View style={localStyles.menuIcon}>
                  <Ionicons name="log-out-outline" size={18} color="#334155" />
                </View>
                <View style={localStyles.menuTextWrap}>
                  <Text style={localStyles.menuItemDescription}>End this session on this device</Text>
                  <Text style={localStyles.menuItemText}>Log Out</Text>
                </View>
              </View>
              <Text style={localStyles.arrow}>{">"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Resources</Text>
          <View style={localStyles.listCard}>
            <Pressable style={localStyles.menuItem} onPress={openPrivacyPolicy}>
              <View style={localStyles.menuLeft}>
                <View style={localStyles.menuIcon}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#334155" />
                </View>
                <View style={localStyles.menuTextWrap}>
                  <Text style={localStyles.menuItemDescription}>How we collect and protect your data</Text>
                  <Text style={localStyles.menuItemText}>Privacy Policy</Text>
                </View>
              </View>
              <Text style={localStyles.arrow}>{">"}</Text>
            </Pressable>
            <View style={localStyles.divider} />
            <Pressable style={localStyles.menuItem} onPress={openSupport}>
              <View style={localStyles.menuLeft}>
                <View style={localStyles.menuIcon}>
                  <Ionicons name="headset-outline" size={18} color="#334155" />
                </View>
                <View style={localStyles.menuTextWrap}>
                  <Text style={localStyles.menuItemDescription}>Need help? Contact our support team</Text>
                  <Text style={localStyles.menuItemText}>Support</Text>
                </View>
              </View>
              <Text style={localStyles.arrow}>{">"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Danger Zone</Text>
          <View style={localStyles.actionsCard}>
            <Pressable style={localStyles.logoutButton} onPress={logout}>
              <Text style={localStyles.logoutButtonText}>Log Out</Text>
            </Pressable>
            <Pressable style={localStyles.deleteButton} onPress={deleteAccount}>
              <Text style={localStyles.deleteButtonText}>Delete Account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

