import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";

type UpdatePasswordScreenNavigationProp = NativeStackNavigationProp<any, "UpdatePassword">;

export default function UpdatePasswordScreen() {
  const navigation = useNavigation<UpdatePasswordScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    if (!currentPassword.trim()) {
      Alert.alert("Missing info", "Please enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Missing info", "Please enter a new password.");
      return;
    }
    if (!confirmPassword.trim()) {
      Alert.alert("Missing info", "Please confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await api("/api/auth/update-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      Alert.alert("Success", "Password updated successfully.", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 32 }}>
            <View style={[styles.heroCard, localStyles.heroCard]}>
              <View style={[styles.heroTopRow, { justifyContent: "space-between" }]}>
                <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
                <Badge label="Security" tone="neutral" />
              </View>

              <Text style={styles.heading}>Change Password</Text>
              <Text style={[styles.subheading, { marginBottom: 0 }]}>Use a strong password to keep your account secure.</Text>
            </View>

            <View style={[styles.card, { marginTop: 20 }]}>
              <Badge label="Password Update" tone="pink" />
              <Text style={styles.title}>Protect your account</Text>
              <Text style={styles.subtitle}>
                Keep your account secure by using a unique password with at least 8 characters.
              </Text>

              <View style={localStyles.formGroup}>
                <FormInput
                  label="Current Password"
                  icon="lock-closed-outline"
                  isPassword
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  editable={!loading}
                />

                <FormInput
                  label="New Password"
                  icon="key-outline"
                  isPassword
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter a new password"
                  editable={!loading}
                />

                <FormInput
                  label="Confirm New Password"
                  icon="checkmark-circle-outline"
                  isPassword
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your new password"
                  editable={!loading}
                />
              </View>

              <View style={localStyles.actions}>
                <Button
                  title={loading ? "Updating..." : "Update Password"}
                  icon="shield-checkmark-outline"
                  iconPosition="left"
                  onPress={updatePassword}
                  loading={loading}
                />

                <Button
                  title="Cancel"
                  variant="outline"
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

const localStyles = StyleSheet.create({
  heroCard: {
    padding: 20,
    gap: 12
  },
  formGroup: {
    gap: 18,
    marginTop: 4
  },
  actions: {
    gap: 12,
    marginTop: 4
  }
});
