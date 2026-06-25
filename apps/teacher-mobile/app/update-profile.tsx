import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { styles } from "../src/styles";

export default function UpdateProfileScreen() {
  const [displayName, setDisplayName] = useState("Teacher Dev User");
  const [headline, setHeadline] = useState("English teacher");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!displayName.trim()) {
      Alert.alert("Missing name", "Please enter your display name.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/me/teacher-profile", {
        method: "PUT",
        body: JSON.stringify({ displayName, headline, bio })
      });
      router.replace("/dashboard/profile");
    } catch (error) {
      Alert.alert("Could not save profile", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.heading}>Profile</Text>
              <Text style={styles.subheading}>Update your teacher profile information</Text>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Display Name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Headline</Text>
                <TextInput
                  value={headline}
                  onChangeText={setHeadline}
                  placeholder="e.g., English Teacher"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Bio</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell students about yourself"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                  style={[styles.input, styles.inputMultiline]}
                />
              </View>

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={save}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? "Saving..." : "Save Profile"}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

