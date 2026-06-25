import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api";
import { styles } from "../src/styles";

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
                <Text style={styles.heroTitle}>Welcome to Duetto</Text>
              </View>
              <Text style={styles.heroEyebrow}>Profile Setup</Text>
              <Text style={styles.heroSubtitle}>Let us get your profile started with some basic information.</Text>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Phone Number</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={completeOnboarding}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? "Setting up..." : "Get Started"}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

