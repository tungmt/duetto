import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../src/api";

type UpdateProfileScreenNavigationProp = NativeStackNavigationProp<any, "UpdateProfile">;

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
  avatarSection: {
    alignItems: "center",
    gap: 12,
    marginBottom: 8
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#dbe4ef",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0284c7"
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 60
  },
  avatarPlaceholder: {
    fontSize: 40,
    color: "#999"
  },
  changeAvatarButton: {
    backgroundColor: "#0369a1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  changeAvatarButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600"
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
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    color: "#0f172a"
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top"
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

export default function UpdateProfileScreen() {
  const navigation = useNavigation<UpdateProfileScreenNavigationProp>();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await api("/api/me/teacher-profile");
      if (data.profile) {
        setDisplayName(data.profile.displayName || "");
        setHeadline(data.profile.headline || "");
        setBio(data.profile.bio || "");
        setAvatar(data.profile.avatar || null);
      }
    } catch (error) {
      // Handle error silently
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  async function pickAvatar() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow access to your photo library to select an avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not select avatar");
    }
  }

  async function save() {
    if (!displayName.trim()) {
      Alert.alert("Missing name", "Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("displayName", displayName.trim());
      formData.append("headline", headline.trim());
      formData.append("bio", bio.trim());

      // If avatar is a new local file (not a URL), upload it
      if (avatar && avatar.startsWith("file://")) {
        const filename = avatar.split("/").pop() || "avatar.jpg";
        formData.append("avatar", {
          uri: avatar,
          type: "image/jpeg",
          name: filename
        } as any);
      }

      await api("/api/me/teacher-profile", {
        method: "PUT",
        body: formData as any
      });

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={localStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={localStyles.content} keyboardShouldPersistTaps="handled">
          <View style={localStyles.header}>
            <Text style={localStyles.headerTitle}>Edit Profile</Text>
            <Text style={localStyles.headerSubtitle}>Update your account information</Text>
          </View>

          <View style={localStyles.avatarSection}>
            <View style={localStyles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={localStyles.avatar} />
              ) : (
                <Text style={localStyles.avatarPlaceholder}>👤</Text>
              )}
            </View>
            <Pressable style={localStyles.changeAvatarButton} onPress={pickAvatar} disabled={loading}>
              <Text style={localStyles.changeAvatarButtonText}>Change Avatar</Text>
            </Pressable>
          </View>

          <View style={localStyles.formSection}>
            <View style={localStyles.inputGroup}>
              <Text style={localStyles.label}>Full Name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                style={localStyles.input}
              />
            </View>

            <View style={localStyles.inputGroup}>
              <Text style={localStyles.label}>Headline</Text>
              <TextInput
                value={headline}
                onChangeText={setHeadline}
                placeholder="e.g., Music Teacher, Piano Specialist"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                style={localStyles.input}
              />
            </View>

            <View style={localStyles.inputGroup}>
              <Text style={localStyles.label}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell students about yourself, your experience, and teaching style..."
                placeholderTextColor="#9ca3af"
                multiline
                editable={!loading}
                style={[localStyles.input, localStyles.textArea]}
              />
            </View>

            <Pressable
              style={[localStyles.button, loading && localStyles.buttonDisabled]}
              onPress={save}
              disabled={loading}
            >
              <Text style={localStyles.buttonText}>{loading ? "Saving..." : "Save Profile"}</Text>
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

