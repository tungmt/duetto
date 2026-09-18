import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../actions/api";
import { styles } from "../actions/styles";
import colors from "../configs/colors";
import Text from "../components/Text";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import IconCircleButton from "../components/IconCircleButton";

type UpdateProfileScreenNavigationProp = NativeStackNavigationProp<any, "UpdateProfile">;

const localStyles = StyleSheet.create({
  panelCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 18,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.borderColor
  },
  avatarSection: {
    alignItems: "center",
    gap: 12,
    marginBottom: 4
  },
  avatarContainer: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 58
  },
  avatarPlaceholder: {
    fontSize: 40,
    color: colors.textTertiary
  }
});

export default function UpdateProfileScreen() {
  const navigation = useNavigation<UpdateProfileScreenNavigationProp>();
  const insets = useSafeAreaInsets();
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
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ marginBottom: 20 }}>
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
            </View>

            <Text style={[styles.heading, { marginBottom: 6 }]}>Edit Profile</Text>
            <Text style={[styles.subheading, { marginBottom: 24 }]}>
              Update your public profile and teacher details.
            </Text>

            <View style={localStyles.panelCard}>
              <View style={localStyles.avatarSection}>
                <View style={localStyles.avatarContainer}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={localStyles.avatar} />
                  ) : (
                    <Text style={localStyles.avatarPlaceholder}>👤</Text>
                  )}
                </View>
                <Button title="Change Avatar" variant="secondary" icon="camera-outline" onPress={pickAvatar} disabled={loading} style={{ height: 44, paddingHorizontal: 16 }} />
              </View>

              <FormInput
                label="Full Name"
                icon="person-outline"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your full name"
                editable={!loading}
              />

              <FormInput
                label="Headline"
                icon="ribbon-outline"
                value={headline}
                onChangeText={setHeadline}
                placeholder="e.g., Music Teacher, Piano Specialist"
                editable={!loading}
              />

              <FormInput
                label="Bio"
                icon="document-text-outline"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell students about yourself, your experience, and teaching style..."
                multiline
                numberOfLines={4}
                style={styles.inputMultiline}
                editable={!loading}
              />

              <Button title={loading ? "Saving..." : "Save Profile"} icon="checkmark-outline" onPress={save} loading={loading} />

              <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} disabled={loading} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
