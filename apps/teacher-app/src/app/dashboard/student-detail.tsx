import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import AppLogo from "../../components/AppLogo";
import Badge from "../../components/Badge";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

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

function getSubmissionTone(status: string): "cyan" | "neutral" | "pink" | "yellow" {
  const normalized = status.toLowerCase();
  if (normalized.includes("review") || normalized.includes("complete") || normalized.includes("graded")) {
    return "cyan";
  }
  if (normalized.includes("draft") || normalized.includes("started")) {
    return "yellow";
  }
  if (normalized.includes("submitted") || normalized.includes("pending")) {
    return "pink";
  }
  return "neutral";
}

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
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              <Badge label="Student Detail" tone="neutral" />
            </View>

            <AppLogo color={colors.primary} icon="person-circle-outline" />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]} numberOfLines={2}>
              {detail?.student.displayName || detail?.student.name || studentName || "Student"}
            </Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>{detail?.student.email || "Student detail"}</Text>

            <View style={[styles.card, { gap: 16 }]}> 
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Badge label={detail?.student.gradeLevel || "No grade level"} tone={detail?.student.gradeLevel ? "pink" : "neutral"} />
                <Badge label={detail?.student.learningGoal || "No learning goal"} tone={detail?.student.learningGoal ? "cyan" : "neutral"} />
              </View>
              <View>
                <Text style={styles.title}>Profile</Text>
                <Text style={[styles.subtitle, { marginTop: 6 }]}>{detail?.student.bio || "No bio yet"}</Text>
              </View>
            </View>

            <View style={[styles.card, { gap: 14 }]}> 
              <Text style={styles.title}>Class Progress</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Badge label={`${detail?.stats.totalSubmissions ?? 0} Submission${(detail?.stats.totalSubmissions ?? 0) === 1 ? "" : "s"}`} tone="cyan" />
                <Badge label={`${detail?.stats.reviewedSubmissions ?? 0} Reviewed`} tone="yellow" />
              </View>
              <Text style={[styles.subtitle, { marginTop: 0 }]}>Average Score: {detail?.stats.averageScore == null ? "Not available" : Math.round(detail.stats.averageScore)}</Text>
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading submission history...</Text>
              </View>
            ) : (detail?.submissions.length ?? 0) === 0 ? (
              <View style={[styles.card, styles.emptyContainer, { alignItems: "flex-start", gap: 12 }]}> 
                <Badge label="No Activity Yet" tone="neutral" />
                <Text style={styles.title}>No submissions in this class yet</Text>
                <Text style={[styles.subtitle, { marginTop: 0 }]}>Student work will appear here once challenges have been submitted.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Submission History</Text>
                <FlatList
                  scrollEnabled={false}
                  data={detail?.submissions ?? []}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                  renderItem={({ item }) => (
                    <View style={[styles.row, { marginTop: 0 }]}> 
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.title}>{item.challenge.title}</Text>
                          <Text style={[styles.hint, { marginTop: 8 }]}>{new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                        <Badge label={item.status} tone={getSubmissionTone(item.status)} />
                      </View>
                      <Text style={[styles.subtitle, { marginTop: 14 }]}>Score: {item.score == null ? "Not graded" : item.score}</Text>
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
