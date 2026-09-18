import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../actions/api";
import { styles } from "../actions/styles";
import AppLogo from "../components/AppLogo";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import IconCircleButton from "../components/IconCircleButton";
import Text from "../components/Text";
import colors from "../configs/colors";

type OnboardingScreenNavigationProp = NativeStackNavigationProp<any, "Onboarding">;

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  async function completeOnboarding() {
    if (!fullName.trim()) {
      Alert.alert("Missing name", "Please enter your full name.");
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert("Missing phone", "Please enter your phone number.");
      return;
    }

    setLoading(true);
    try {
      await api("/api/me/teacher-profile", {
        method: "PUT",
        body: JSON.stringify({ displayName: fullName, phoneNumber })
      });
      navigation.navigate("Dashboard");
    } catch (error) {
      Alert.alert("Could not complete onboarding", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 32 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: navigation.canGoBack() ? "space-between" : "flex-end", marginBottom: 20 }}>
              {navigation.canGoBack() ? (
                <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              ) : null}
              <Badge label="Teacher Setup" tone="neutral" />
            </View>

            <AppLogo color={colors.secondary} icon="school-outline" />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Welcome to duetTo</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>Let’s finish your teacher profile so you can publish challenges and guide students.</Text>

            <View style={[styles.card, localStyles.infoCard]}>
              <Badge label="Profile Setup" tone="pink" />
              <Text style={styles.title}>A few details to get started</Text>
              <Text style={styles.subtitle}>Your name and phone number help students and parents recognize you in the app.</Text>
            </View>

            <View style={{ gap: 18, marginTop: 20 }}>
              <FormInput
                label="Full Name"
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                editable={!loading}
              />

              <FormInput
                label="Phone Number"
                icon="call-outline"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                editable={!loading}
              />

              <Button
                title={loading ? "Setting up..." : "Get Started"}
                icon="arrow-forward"
                onPress={completeOnboarding}
                loading={loading}
                style={{ marginTop: 4 }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  infoCard: {
    marginTop: 4,
    gap: 10
  }
});
