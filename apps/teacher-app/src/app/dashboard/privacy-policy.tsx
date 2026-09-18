import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";

type PrivacyPolicyScreenNavigationProp = NativeStackNavigationProp<any, "PrivacyPolicy">;

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Information We Collect",
    body: "We collect the information you provide when creating your teacher account, such as your name, email address, phone number, and profile details. We also collect content you upload, including challenge videos and reviews of student submissions."
  },
  {
    title: "2. How We Use Your Information",
    body: "Your information is used to operate and improve the app, deliver challenges to your classes, review submissions, communicate with you about your account, and provide customer support."
  },
  {
    title: "3. Sharing Of Information",
    body: "We do not sell your personal information. We may share limited data with service providers who help us run the app (such as hosting and analytics providers), or when required by law."
  },
  {
    title: "4. Data Security",
    body: "We use industry-standard safeguards to protect your data, including encrypted storage and secure transmission. Access to your data is limited to what is necessary to provide our services."
  },
  {
    title: "5. Your Choices",
    body: "You can review and update your profile information at any time from the Profile screen. You may also request deletion of your account, which will remove your personal data from our systems."
  },
  {
    title: "6. Contact Us",
    body: "If you have any questions about this Privacy Policy or how we handle your data, please reach out to us from the Contact Us screen in your account settings."
  }
];

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<PrivacyPolicyScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 32 }}>
          <View style={[styles.heroCard, localStyles.heroCard]}>
            <View style={[styles.heroTopRow, { justifyContent: "space-between" }]}>
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              <Badge label="Legal" tone="neutral" />
            </View>

            <Text style={styles.heading}>Privacy Policy</Text>
            <Text style={[styles.subheading, { marginBottom: 0 }]}>
              How we collect, use, and protect your data as a teacher on our platform.
            </Text>
          </View>

          <View style={[styles.card, { marginTop: 20, gap: 18 }]}>
            <Text style={styles.status}>Last updated: January 2026</Text>
            {SECTIONS.map((section) => (
              <View key={section.title} style={{ gap: 6 }}>
                <Text style={styles.title}>{section.title}</Text>
                <Text style={styles.subtitle}>{section.body}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  heroCard: {
    padding: 20,
    gap: 12
  }
});
