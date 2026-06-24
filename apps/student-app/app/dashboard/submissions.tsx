import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type Answer = {
  id: string;
  status: string;
  score: number | null;
  feedbackText: string | null;
  answerMediaUrl: string;
  challenge?: { title: string };
};

export default function SubmissionsScreen() {
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={[styles.heroCard, { marginBottom: 2 }]}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>Submissions</Text>
            </View>
            <Text style={styles.heroEyebrow}>Progress Center</Text>
            <Text style={styles.heroSubtitle}>Track your answers and feedback.</Text>
          </View>

          <View style={styles.card}>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.status}>Submitted</Text>
                <Text style={[styles.title, { marginTop: 4 }]}>{progress.submittedAnswers ?? 0}</Text>
              </View>
              <View>
                <Text style={styles.status}>Reviewed</Text>
                <Text style={[styles.title, { marginTop: 4 }]}>{progress.reviewedAnswers ?? 0}</Text>
              </View>
              <View>
                <Text style={styles.status}>Average Score</Text>
                <Text style={[styles.title, { marginTop: 4 }]}>{progress.averageScore ?? "-"}</Text>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.status}>Loading submissions...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.status}>No submissions yet</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.title}>{item.challenge?.title ?? "Challenge"}</Text>
                  <Text style={styles.status}>Score: {item.score ?? "Pending"}</Text>
                  {item.feedbackText ? (
                    <View style={{ marginTop: 8, backgroundColor: "#f9fafb", padding: 10, borderRadius: 8 }}>
                      <Text style={styles.hint}>Feedback:</Text>
                      <Text style={[styles.status, { marginTop: 4 }]}>{item.feedbackText}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.status, { marginTop: 8 }]}>Waiting for teacher feedback...</Text>
                  )}
                  <Text style={[styles.status, { marginTop: 8, fontSize: 12 }]}>Status: {item.status}</Text>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
