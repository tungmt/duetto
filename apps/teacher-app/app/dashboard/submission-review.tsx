import { ResizeMode, Video } from "expo-av";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type SubmissionReviewNavigationProp = NativeStackNavigationProp<any, "SubmissionReview">;
type SubmissionReviewRoute = { params?: { challengeId?: string; submissionId?: string } };

type Submission = {
  id: string;
  status: string;
  score: number | null;
  feedbackText?: string | null;
  answerMediaUrl: string;
  challenge?: { id: string; title: string };
  student?: { id: string; name: string; email: string };
};

type ChallengeResponse = {
  challenge: {
    id: string;
    title: string;
    sourceVideoUrl: string;
    submissions: Submission[];
  };
};

export default function SubmissionReviewScreen() {
  const navigation = useNavigation<SubmissionReviewNavigationProp>();
  const route = useRoute();
  const params = (route as SubmissionReviewRoute).params ?? {};
  const challengeId = (params.challengeId ?? "").trim();
  const submissionId = (params.submissionId ?? "").trim();

  const [challengeTitle, setChallengeTitle] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState("90");
  const [feedback, setFeedback] = useState("Great effort.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSubmission = useCallback(async () => {
    if (!challengeId || !submissionId) {
      Alert.alert("Missing data", "Submission data is missing.");
      return;
    }

    setLoading(true);
    try {
      const data = (await api(`/api/videos/${challengeId}`)) as ChallengeResponse;
      const matched = data.challenge.submissions.find((item) => item.id === submissionId) ?? null;
      setChallengeTitle(data.challenge.title);
      setSubmission(matched);

      if (matched?.score !== null && matched?.score !== undefined) {
        setScore(String(matched.score));
      }
      if (matched?.feedbackText) {
        setFeedback(matched.feedbackText);
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not load submission");
    } finally {
      setLoading(false);
    }
  }, [challengeId, submissionId]);

  useFocusEffect(
    useCallback(() => {
      loadSubmission();
    }, [loadSubmission])
  );

  async function saveScore() {
    if (!submission) {
      return;
    }

    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
      Alert.alert("Invalid score", "Score must be a number from 0 to 100.");
      return;
    }

    setSaving(true);
    try {
      await api(`/api/submissions/${submission.id}/score`, {
        method: "PATCH",
        body: JSON.stringify({
          score: Math.round(numericScore),
          feedbackText: feedback.trim()
        })
      });
      Alert.alert("Saved", "Submission has been scored.");
      await loadSubmission();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not save score");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={styles.heroTitle}>Answer Review</Text>
            </View>
            <Text style={styles.heroEyebrow}>Submission Review</Text>
            <Text style={styles.heroSubtitle}>Watch student answer and score on a separate screen.</Text>
          </View>

          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.status}>Loading answer video...</Text>
            </View>
          ) : !submission ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.status}>Submission not found.</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.title}>{submission.student?.name ?? "Student"}</Text>
                <Text style={styles.status}>Challenge: {challengeTitle || submission.challenge?.title || "Challenge"}</Text>
                <Text style={styles.status}>Status: {submission.status}</Text>
                <Text style={styles.status}>Current score: {submission.score ?? "Not graded"}</Text>
              </View>

              <View style={styles.preview}>
                <Video
                  source={{ uri: submission.answerMediaUrl }}
                  style={{ width: "100%", minHeight: 220, borderRadius: 12 }}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                />
              </View>

              <View style={styles.card}>
                <View>
                  <Text style={[styles.title, { marginBottom: 8 }]}>Score (0-100)</Text>
                  <TextInput
                    value={score}
                    onChangeText={setScore}
                    placeholder="90"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    editable={!saving}
                    style={styles.input}
                  />
                </View>

                <View>
                  <Text style={[styles.title, { marginBottom: 8 }]}>Feedback</Text>
                  <TextInput
                    value={feedback}
                    onChangeText={setFeedback}
                    placeholder="Feedback for student"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    editable={!saving}
                    style={[styles.input, styles.inputMultiline]}
                  />
                </View>

                <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={saveScore} disabled={saving}>
                  <Text style={styles.buttonText}>{saving ? "Saving..." : "Save Score & Feedback"}</Text>
                </Pressable>

                <Pressable style={styles.buttonSecondary} onPress={() => navigation.goBack()}>
                  <Text style={styles.buttonSecondaryText}>Back To Challenge Detail</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
