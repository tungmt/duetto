import { useEffect, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Text from "../../components/Text";
import colors from "../../configs/colors";

type Answer = {
  id: string;
  status: string;
  score: number | null;
  feedbackText: string | null;
  answerMediaUrl: string;
  challenge?: { title: string };
};

function getStatusTone(status: string) {
  if (status === "REVIEWED") {
    return "cyan" as const;
  }
  if (status === "REJECTED") {
    return "pink" as const;
  }
  return "neutral" as const;
}

export default function SubmissionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<Answer[]>([]);
  const [progress, setProgress] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api("/api/me/progress");
      setHistory(data.answerHistory ?? []);
      setProgress(data.progress ?? {});
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const summaryCards = [
    { label: "Submitted", value: progress.submittedAnswers ?? 0, tone: "pink" as const },
    { label: "Reviewed", value: progress.reviewedAnswers ?? 0, tone: "cyan" as const },
    { label: "Average Score", value: progress.averageScore ?? "-", tone: "yellow" as const }
  ];

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
                paddingBottom: 20,
                gap: 12
              }
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.heroTitle}>Submissions</Text>
              <Badge label="Progress Center" tone="cyan" />
            </View>
            <Text style={styles.heroEyebrow}>Your Answers</Text>
            <Text style={styles.heroSubtitle}>Track your submissions, scores, and teacher feedback in one place.</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {summaryCards.map((card) => (
              <View key={card.label} style={[styles.card, { flex: 1, gap: 8 }]}> 
                <Badge label={card.label} tone={card.tone} />
                <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: "800" }}>{card.value}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={[styles.card, styles.emptyContainer]}>
              <Text style={styles.status}>Loading submissions...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={[styles.card, styles.emptyContainer]}>
              <Text style={styles.status}>No submissions yet</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.row, { gap: 12 }]}> 
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={[styles.title, { fontSize: 17 }]}>{item.challenge?.title ?? "Challenge"}</Text>
                      <Text style={styles.status}>Score: {item.score ?? "Pending"}</Text>
                    </View>
                    <Badge label={item.status} tone={getStatusTone(item.status)} />
                  </View>

                  {item.feedbackText ? (
                    <View
                      style={{
                        marginTop: 4,
                        backgroundColor: colors.inputBg,
                        borderColor: colors.borderColor,
                        borderWidth: 1,
                        padding: 12,
                        borderRadius: 16,
                        gap: 4
                      }}
                    >
                      <Text style={styles.hint}>Teacher Feedback</Text>
                      <Text style={[styles.status, { color: colors.textSecondary }]}>{item.feedbackText}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.status, { marginTop: 4 }]}>Waiting for teacher feedback...</Text>
                  )}

                  <Button
                    title="Open Submission Detail"
                    variant="outline"
                    icon="arrow-forward"
                    onPress={() => navigation.navigate("SubmissionDetail", { submissionId: item.id })}
                  />
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
