import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api";
import nav from "../src/navigation";
import { styles } from "../src/styles";

export default function UpdateProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("Student Dev User");
  const [gradeLevel, setGradeLevel] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!displayName.trim()) {
      Alert.alert("Missing name", "Please enter your display name.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/me/student-profile", {
        method: "PUT",
        body: JSON.stringify({ displayName, gradeLevel, learningGoal })
      });
      nav.reset("AppStack", { screen: "Dashboard" });
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
            <View
              style={[
                styles.heroCard,
                {
                  marginBottom: 6,
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
              <Text style={styles.heroEyebrow}>Student Profile</Text>
              <Text style={styles.heroSubtitle}>Update your student profile information.</Text>
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
                <Text style={[styles.title, { marginBottom: 8 }]}>Grade Level</Text>
                <TextInput
                  value={gradeLevel}
                  onChangeText={setGradeLevel}
                  placeholder="e.g., 10th Grade"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Learning Goal</Text>
                <TextInput
                  value={learningGoal}
                  onChangeText={setLearningGoal}
                  placeholder="What would you like to learn?"
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

