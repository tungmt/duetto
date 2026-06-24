import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type CreateStudentRoute = RouteProp<
  { CreateStudent: { classId: string; className?: string } },
  "CreateStudent"
>;
type CreateStudentNavigationProp = NativeStackNavigationProp<any, "CreateStudent">;

export default function CreateStudentScreen() {
  const navigation = useNavigation<CreateStudentNavigationProp>();
  const route = useRoute<CreateStudentRoute>();
  const { classId, className } = route.params;

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function createStudent() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter a student email.");
      return;
    }

    setLoading(true);
    try {
      const data = await api(`/api/classes/${classId}/students`, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim() || undefined
        })
      });

      Alert.alert(
        "Student Created",
        `Email: ${data.student.email}\nDefault password: ${data.defaultPassword}\n\nShare these credentials with the student and ask them to change password after first login.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not create student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.heroTitle}>Create Student</Text>
              </View>
              <Text style={styles.heroEyebrow}>Student Setup</Text>
              <Text style={styles.heroSubtitle}>Create a student account for {className ?? "this class"}.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Student Info</Text>
              <Text style={styles.status}>A default password will be generated automatically.</Text>

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.title, { marginBottom: 8 }]}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="student@example.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.title, { marginBottom: 8 }]}>Display Name (Optional)</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Student full name"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={createStudent}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Creating..." : "Create Student"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
