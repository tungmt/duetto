import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.heroCard,
              {
                marginHorizontal: -20,
                marginTop: -20,
                paddingTop: insets.top + 16,
                paddingHorizontal: 16,
                paddingBottom: 16
              }
            ]}
          >
            <View style={styles.heroTopRow}>
              <Pressable style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
                <Text style={styles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={styles.heroTitle}>Create Class</Text>
            </View>
            <Text style={styles.heroEyebrow}>Class Setup</Text>
            <Text style={styles.heroSubtitle}>Set up a new class for your students.</Text>
          </View>

          <View style={styles.card}>
            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Class Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Period 1 English"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                style={styles.input}
              />
            </View>

            <View>
              <Text style={[styles.title, { marginBottom: 8 }]}>Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add class description"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                multiline
                style={[styles.input, styles.inputMultiline]}
              />
            </View>

            <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={createClass} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Creating..." : "Create Class"}</Text>
            </Pressable>

            <Pressable style={styles.buttonSecondary} onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

