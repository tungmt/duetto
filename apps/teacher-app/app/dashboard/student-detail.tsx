import { RouteProp, useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type StudentDetailRoute = RouteProp<
  { StudentDetail: { classId: string; studentId: string; studentName?: string } },
  "StudentDetail"
>;

type StudentSubmission = {
  id: string;
  status: string;
  score: number | null;
  createdAt: string;
  challenge: { id: string; title: string };
};

type StudentDetailResponse = {
  student: {
    id: string;
    name: string;
    email: string;
    displayName?: string;
    bio?: string | null;
    gradeLevel?: string | null;
    learningGoal?: string | null;
  };
  stats: {
    totalSubmissions: number;
    reviewedSubmissions: number;
    averageScore: number | null;
  };
  submissions: StudentSubmission[];
};

export default function StudentDetailScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<StudentDetailRoute>();
  const { classId, studentId, studentName } = route.params;

  const [detail, setDetail] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api(`/api/classes/${classId}/students/${studentId}`);
      setDetail(data);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not load student detail");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [classId, studentId]);

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View
              style={[
                styles.heroCard,
                {
                  marginBottom: 2,
                  marginHorizontal: -20,
                  marginTop: -20,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 16
                }
              ]}
            >
              <View style={styles.heroTopRow}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.heroTitle} numberOfLines={1}>{detail?.student.displayName || detail?.student.name || studentName || "Student"}</Text>
              </View>
              <Text style={styles.heroEyebrow}>Student Detail</Text>
              <Text style={styles.heroSubtitle}>{detail?.student.email || "Student detail"}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Profile</Text>
              <Text style={styles.status}>{detail?.student.gradeLevel || "No grade level set"}</Text>
              <Text style={styles.status}>{detail?.student.learningGoal || "No learning goal set"}</Text>
              <Text style={styles.status}>{detail?.student.bio || "No bio yet"}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Class Progress</Text>
              <Text style={styles.status}>Submissions: {detail?.stats.totalSubmissions ?? 0}</Text>
              <Text style={styles.status}>Reviewed: {detail?.stats.reviewedSubmissions ?? 0}</Text>
              <Text style={styles.status}>
                Average Score: {detail?.stats.averageScore == null ? "Not available" : Math.round(detail.stats.averageScore)}
              </Text>
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>Loading submission history...</Text>
              </View>
            ) : (detail?.submissions.length ?? 0) === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>No submissions in this class yet.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Submission History</Text>
                <FlatList
                  scrollEnabled={false}
                  data={detail?.submissions ?? []}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.row}>
                      <Text style={styles.title}>{item.challenge.title}</Text>
                      <Text style={styles.status}>Status: {item.status}</Text>
                      <Text style={styles.status}>Score: {item.score == null ? "Not graded" : item.score}</Text>
                      <Text style={styles.hint}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                  )}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

