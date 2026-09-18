import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "../components/Text";
import { api } from "../actions/api";
import nav from "../actions/navigation";
import { styles } from "../actions/styles";
import AppLogo from "../components/AppLogo";
import Button from "../components/Button";
import FormInput from "../components/FormInput";

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
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <AppLogo />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Complete Your Profile</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>
              Update your student profile information.
            </Text>

            <View style={{ gap: 18 }}>
              <FormInput
                label="Display Name"
                icon="person-outline"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                editable={!loading}
              />

              <FormInput
                label="Grade Level"
                icon="school-outline"
                value={gradeLevel}
                onChangeText={setGradeLevel}
                placeholder="e.g., 10th Grade"
                editable={!loading}
              />

              <FormInput
                label="Learning Goal"
                icon="star-outline"
                value={learningGoal}
                onChangeText={setLearningGoal}
                placeholder="What would you like to learn?"
                multiline
                numberOfLines={4}
                style={styles.inputMultiline}
                editable={!loading}
              />

              <Button
                title={loading ? "Saving..." : "Save Profile"}
                icon="checkmark-outline"
                onPress={save}
                loading={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
