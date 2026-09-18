import { useEventListener } from "expo";
import { setAudioModeAsync } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

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

function getSubmissionTone(status?: string): "cyan" | "neutral" | "pink" | "yellow" {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "reviewed" || normalized === "graded" || normalized === "approved") {
    return "cyan";
  }

  if (normalized === "pending") {
    return "yellow";
  }

  if (normalized === "rejected") {
    return "pink";
  }

  return "neutral";
}

export default function SubmissionReviewScreen() {
  const navigation = useNavigation<SubmissionReviewNavigationProp>();
  const insets = useSafeAreaInsets();
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
  const answerSource = submission?.answerMediaUrl ?? null;
  const answerPlayer = useVideoPlayer(answerSource, (player) => {
    player.audioMixingMode = "auto";
  });

  useEventListener(answerPlayer, "playToEnd", () => {
    answerPlayer.pause();
  });

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
      void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
      loadSubmission();
      return () => {
        answerPlayer.pause();
      };
    }, [answerPlayer, loadSubmission])
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
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.heroCard,
              {
                marginHorizontal: -20,
                marginTop: -20,
                paddingTop: insets.top + 16,
                paddingHorizontal: 16,
                paddingBottom: 16
              }
            ]}
          >
            <View style={[styles.heroTopRow, { justifyContent: "space-between" }]}> 
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              <Badge label="Submission Review" tone="neutral" />
            </View>
            <Text style={styles.heroTitle}>Answer Review</Text>
            <Text style={styles.heroSubtitle}>Watch the student response, score the work, and leave clear feedback.</Text>
          </View>

          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.status}>Loading answer video...</Text>
            </View>
          ) : !submission ? (
            <View style={[styles.card, styles.emptyContainer, { alignItems: "flex-start" }]}> 
              <Badge label="Unavailable" tone="neutral" />
              <Text style={[styles.title, { marginTop: 6 }]}>Submission not found.</Text>
              <Text style={styles.subtitle}>Go back to the challenge details and try another submission.</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={localStyles.headerMetaRow}>
                  <Badge label={submission.status || "Unknown"} tone={getSubmissionTone(submission.status)} />
                  <Badge label={submission.score !== null ? `${submission.score}/100` : "Not graded"} tone="cyan" />
                </View>
                <Text style={styles.title}>{submission.student?.name ?? "Student"}</Text>
                <Text style={styles.subtitle}>{submission.student?.email ?? "No email available"}</Text>
                <Text style={styles.status}>Challenge: {challengeTitle || submission.challenge?.title || "Challenge"}</Text>
              </View>

              <View style={styles.card}>
                <View style={localStyles.videoHeader}>
                  <Text style={styles.title}>Submitted Answer</Text>
                  <Badge label="Video" tone="pink" />
                </View>
                <View style={localStyles.videoWrap}>
                  <VideoView
                    player={answerPlayer}
                    style={localStyles.video}
                    contentFit="contain"
                    nativeControls
                  />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.title}>Review Notes</Text>
                <Text style={styles.subtitle}>Score from 0 to 100 and share actionable feedback for the student.</Text>

                <FormInput
                  label="Score (0-100)"
                  icon="trophy-outline"
                  value={score}
                  onChangeText={setScore}
                  placeholder="90"
                  keyboardType="number-pad"
                  editable={!saving}
                />

                <FormInput
                  label="Feedback"
                  icon="chatbubble-ellipses-outline"
                  value={feedback}
                  onChangeText={setFeedback}
                  placeholder="Feedback for student"
                  multiline
                  numberOfLines={4}
                  editable={!saving}
                  style={localStyles.feedbackInput}
                />

                <View style={localStyles.actionGroup}>
                  <Button
                    title={saving ? "Saving..." : "Save Score & Feedback"}
                    icon="checkmark-circle-outline"
                    iconPosition="left"
                    onPress={saveScore}
                    loading={saving}
                  />

                  <Button
                    title="Back To Challenge Detail"
                    variant="outline"
                    icon="arrow-back-outline"
                    iconPosition="left"
                    onPress={() => navigation.goBack()}
                    disabled={saving}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  headerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4
  },
  videoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  videoWrap: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.darkBg
  },
  video: {
    width: "100%",
    minHeight: 240,
    borderRadius: 18
  },
  feedbackInput: {
    minHeight: 128,
    paddingTop: 16,
    textAlignVertical: "top"
  },
  actionGroup: {
    gap: 12,
    marginTop: 4
  }
});
