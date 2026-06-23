import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type ChallengesScreenNavigationProp = NativeStackNavigationProp<any, "ChallengesTab">;

type Challenge = { id: string; title: string; status: string; _count?: { submissions: number } };
type Answer = { id: string; status: string; score: number | null; student?: { name: string }; challenge?: { title: string } };

export default function TeacherChallengesScreen() {
  const navigation = useNavigation<ChallengesScreenNavigationProp>();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [score, setScore] = useState("90");
  const [feedback, setFeedback] = useState("Good practice.");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [videosData, progressData] = await Promise.all([api("/api/videos"), api("/api/me/progress")]);
      setChallenges(videosData.videos);
      setAnswers(progressData.studentAnswers ?? []);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function scoreAnswer(answerId: string) {
    if (!score.trim() || !feedback.trim()) {
      Alert.alert("Missing info", "Please enter a score and feedback.");
      return;
    }
    try {
      await api(`/api/submissions/${answerId}/score`, {
        method: "PATCH",
        body: JSON.stringify({ score: Number(score), feedbackText: feedback })
      });
      Alert.alert("Success", "Feedback submitted.");
      await refresh();
    } catch (error) {
      Alert.alert("Could not score", error instanceof Error ? error.message : "Unknown error");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.heading}>Challenges</Text>
              <Text style={styles.subheading}>Create and manage your challenges</Text>
            </View>

            <Pressable style={styles.card} onPress={() => navigation.navigate("RecordVideo")}>
              <Text style={styles.title}>🎥 Create New Challenge</Text>
              <Text style={styles.status}>Record, edit, and publish a challenge</Text>
              <Text style={[styles.link, { marginTop: 12 }]}>Open Editor →</Text>
            </Pressable>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>Loading challenges...</Text>
              </View>
            ) : challenges.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>No challenges published yet</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Published Challenges</Text>
                <FlatList
                  scrollEnabled={false}
                  data={challenges}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.row}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.status}>{item.status} • {item._count?.submissions ?? 0} submissions</Text>
                    </View>
                  )}
                />
              </View>
            )}

            {answers.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Student Submissions</Text>

                <View style={{ gap: 12, marginBottom: 16 }}>
                  <View>
                    <Text style={[styles.title, { marginBottom: 8 }]}>Score (0-100)</Text>
                    <TextInput
                      value={score}
                      onChangeText={setScore}
                      placeholder="Score"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  <View>
                    <Text style={[styles.title, { marginBottom: 8 }]}>Feedback</Text>
                    <TextInput
                      value={feedback}
                      onChangeText={setFeedback}
                      placeholder="Enter feedback for the student"
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      style={[styles.input, styles.inputMultiline]}
                    />
                  </View>
                </View>

                <FlatList
                  scrollEnabled={false}
                  data={answers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.row}>
                      <Text style={styles.title}>{item.student?.name ?? "Student"}</Text>
                      <Text style={styles.status}>{item.challenge?.title ?? "Challenge"}</Text>
                      <Text style={styles.status}>Current Score: {item.score ?? "Not graded"}</Text>
                      <Pressable
                        style={[styles.button, { marginTop: 12 }]}
                        onPress={() => scoreAnswer(item.id)}
                      >
                        <Text style={styles.buttonText}>Give Feedback</Text>
                      </Pressable>
                    </View>
                  )}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
