import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
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

type CreateStudentRoute = RouteProp<
  { CreateStudent: { classId: string; className?: string } },
  "CreateStudent"
>;
type CreateStudentNavigationProp = NativeStackNavigationProp<any, "CreateStudent">;

export default function CreateStudentScreen() {
  const navigation = useNavigation<CreateStudentNavigationProp>();
  const insets = useSafeAreaInsets();
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
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              <Badge label="Student Setup" tone="neutral" />
            </View>

            <AppLogo color={colors.secondary} icon="person-add-outline" />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Create Student</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>Create a student account for {className ?? "this class"} and share the generated credentials securely.</Text>

            <View style={styles.card}>
              <Badge label="Auto Password" tone="yellow" />
              <Text style={[styles.subtitle, { marginTop: 0 }]}>A default password will be generated automatically after the account is created.</Text>

              <FormInput
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="student@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <FormInput
                label="Display Name (Optional)"
                icon="person-outline"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Student full name"
                editable={!loading}
              />

              <View style={{ gap: 12, marginTop: 4 }}>
                <Button
                  title={loading ? "Creating..." : "Create Student"}
                  icon="person-add-outline"
                  iconPosition="left"
                  onPress={createStudent}
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
