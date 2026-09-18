import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import AppLogo from "../../components/AppLogo";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

type CreateClassNavigationProp = NativeStackNavigationProp<any, "CreateClass">;

export default function CreateClassScreen() {
  const navigation = useNavigation<CreateClassNavigationProp>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function createClass() {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter a class name.");
      return;
    }

    setLoading(true);
    try {
      await api("/api/classes", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined
        })
      });

      Alert.alert("Success", "Class created successfully.", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not create class");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              <Badge label="Class Setup" tone="neutral" />
            </View>

            <AppLogo color={colors.primary} icon="add-circle-outline" />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Create Class</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>Set up a new class for your students and keep details organized from day one.</Text>

            <View style={styles.card}>
              <FormInput
                label="Class Name"
                icon="school-outline"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Period 1 English"
                editable={!loading}
              />

              <FormInput
                label="Description (Optional)"
                icon="document-text-outline"
                value={description}
                onChangeText={setDescription}
                placeholder="Add class description"
                editable={!loading}
                multiline
                style={{ minHeight: 120, paddingTop: 16, textAlignVertical: "top" }}
              />

              <View style={{ gap: 12, marginTop: 4 }}>
                <Button
                  title={loading ? "Creating..." : "Create Class"}
                  icon="add-circle-outline"
                  iconPosition="left"
                  onPress={createClass}
                  loading={loading}
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  icon="close-outline"
                  iconPosition="left"
                  onPress={() => navigation.goBack()}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
