import { useEventListener } from "expo";
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import { VideoView, useVideoPlayer } from "expo-video";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import nav from "../../actions/navigation";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

type SubmissionDetailNavigationProp = NativeStackNavigationProp<any, "SubmissionDetail">;
type SubmissionDetailRoute = { params?: { submissionId?: string } };

type SubmissionDetail = {
  id: string;
  status: string;
  score: number | null;
  feedbackText?: string | null;
  answerMediaUrl: string;
  createdAt: string;
  challenge: {
    id: string;
    title: string;
    description?: string | null;
    sourceVideoUrl: string;
    teacher?: { id: string; name: string } | null;
  };
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

export default function SubmissionDetailScreen() {
  const navigation = useNavigation<SubmissionDetailNavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const submissionId = ((route as SubmissionDetailRoute).params?.submissionId ?? "").trim();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const answerSoundRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const answerSoundUriRef = useRef("");
  const syncBusyRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replacementUri, setReplacementUri] = useState("");

  const currentAnswerUri = replacementUri || submission?.answerMediaUrl || "";
  const challengeVideoPlayer = useVideoPlayer(submission?.challenge.sourceVideoUrl ?? null, (player) => {
    player.timeUpdateEventInterval = 0.1;
    player.audioMixingMode = "auto";
  });

  async function ensureAnswerSound() {
    if (!currentAnswerUri) {
      return null;
    }

    const existing = answerSoundRef.current;
    if (existing) {
      if (answerSoundUriRef.current === currentAnswerUri) {
        return existing;
      }
      existing.remove();
      answerSoundRef.current = null;
      answerSoundUriRef.current = "";
    }

    const sound = createAudioPlayer({ uri: currentAnswerUri }, { keepAudioSessionActive: true });
    await sound.seekTo(0);
    answerSoundRef.current = sound;
    answerSoundUriRef.current = currentAnswerUri;
    return sound;
  }

  async function syncAnswerToVideo(positionMs: number, isPlaying: boolean, didJustFinish: boolean) {
    if (!currentAnswerUri || syncBusyRef.current) {
      return;
    }

    syncBusyRef.current = true;
    try {
      const sound = await ensureAnswerSound();
      if (!sound) return;

      const drift = Math.abs(Math.round(sound.currentTime * 1000) - positionMs);
      if (drift > 220) {
        await sound.seekTo(positionMs / 1000);
      }

      if (didJustFinish) {
        sound.pause();
        await sound.seekTo(0);
        return;
      }

      if (isPlaying && !sound.playing) {
        sound.play();
      } else if (!isPlaying && sound.playing) {
        sound.pause();
      }
    } catch {
      // Keep video controls responsive even if one sync update fails.
    } finally {
      syncBusyRef.current = false;
    }
  }

  const loadSubmission = useCallback(async () => {
    if (!submissionId) {
      Alert.alert("Missing submission", "Submission ID is missing.");
      return;
    }

    setLoading(true);
    try {
      const data = await api(`/api/submissions/${submissionId}`);
      setSubmission(data.submission ?? null);
      setReplacementUri("");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not load submission");
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useFocusEffect(
    useCallback(() => {
      loadSubmission();
    }, [loadSubmission])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        challengeVideoPlayer.pause();
        if (answerSoundRef.current) {
          answerSoundRef.current.remove();
          answerSoundRef.current = null;
          answerSoundUriRef.current = "";
        }
      };
    }, [challengeVideoPlayer])
  );

  useEventListener(challengeVideoPlayer, "timeUpdate", ({ currentTime }) => {
    void syncAnswerToVideo(Math.round(currentTime * 1000), challengeVideoPlayer.playing, false);
  });

  useEventListener(challengeVideoPlayer, "playingChange", ({ isPlaying }) => {
    void syncAnswerToVideo(Math.round(challengeVideoPlayer.currentTime * 1000), isPlaying, false);
  });

  useEventListener(challengeVideoPlayer, "playToEnd", () => {
    void syncAnswerToVideo(Math.round(challengeVideoPlayer.duration * 1000), false, true);
  });

  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Error", "Microphone permission is required.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch {
      Alert.alert("Error", "Could not start recording.");
    }
  }

  async function stopRecording() {
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (answerSoundRef.current) {
        answerSoundRef.current.remove();
        answerSoundRef.current = null;
        answerSoundUriRef.current = "";
      }
      setReplacementUri(audioRecorder.uri || "");
      setIsRecording(false);
    } catch {
      Alert.alert("Error", "Could not stop recording.");
    }
  }

  function fileNameFromUri(uri: string) {
    const parts = uri.split("/");
    return parts[parts.length - 1] || `answer-${Date.now()}.m4a`;
  }

  async function uploadWithProgress(fileUri: string, uploadUrl: string, contentType: string) {
    const fileResp = await fetch(fileUri);
    const fileBlob = await fileResp.blob();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          setUploadProgress(event.loaded / event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(1);
          resolve();
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed due to network error."));
      xhr.send(fileBlob as any);
    });
  }

  async function updateSubmission() {
    if (!submission || !replacementUri) {
      Alert.alert("No replacement", "Please record a new answer first.");
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const contentType = "audio/mp4";
      const uploadData = await api("/api/submissions/upload-url", {
        method: "POST",
        body: JSON.stringify({
          fileName: fileNameFromUri(replacementUri),
          contentType,
          fileType: "answer"
        })
      });

      await uploadWithProgress(replacementUri, uploadData.uploadUrl, contentType);

      await api(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        body: JSON.stringify({ answerMediaUrl: uploadData.publicUrl, practiceDurationMs: 45000 })
      });

      if (answerSoundRef.current) {
        answerSoundRef.current.remove();
        answerSoundRef.current = null;
        answerSoundUriRef.current = "";
      }

      Alert.alert("Updated", "Your submission has been updated.");
      await loadSubmission();
    } catch (error) {
      Alert.alert("Could not update", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  }

  async function cancelSubmission() {
    if (!submission) {
      return;
    }

    Alert.alert("Cancel submission", "This will remove your current submission. Continue?", [
      { text: "Keep" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await api(`/api/submissions/${submission.id}`, { method: "DELETE" });
            Alert.alert("Removed", "Submission has been cancelled.");
            nav.reset("AppStack", {
              screen: "Dashboard",
              params: { screen: "SubmissionsTab" }
            });
          } catch (error) {
            Alert.alert("Could not cancel", error instanceof Error ? error.message : "Unknown error");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  }

  if (loading) {
    return (
      <View style={styles.safe}>
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>Loading submission...</Text>
        </View>
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={styles.safe}>
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>Submission not found.</Text>
        </View>
      </View>
    );
  }

  const isReviewed = submission.status === "REVIEWED";

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View
              style={[
                styles.heroCard,
                {
                  marginHorizontal: -20,
                  marginTop: -20,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 20,
                  gap: 14
                }
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
                <Badge label={submission.status} tone={getStatusTone(submission.status)} />
              </View>
              <View>
                <Text style={styles.heroTitle}>Submission Detail</Text>
                <Text style={[styles.heroEyebrow, { marginTop: 8 }]}>Answer Review</Text>
                <Text style={[styles.heroSubtitle, { marginTop: 6 }]}>Preview your answer, review teacher feedback, and manage this submission.</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={[styles.title, { fontSize: 18 }]}>{submission.challenge.title}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Badge label={submission.challenge.teacher?.name ?? "Teacher"} tone="neutral" />
                <Badge label={submission.score != null ? `Score ${submission.score}` : "Score Pending"} tone={submission.score != null ? "yellow" : "neutral"} />
              </View>
              <Text style={styles.status}>Submitted: {new Date(submission.createdAt).toLocaleString()}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Challenge Preview</Text>
              <Text style={[styles.status, { marginBottom: 8 }]}>Use the player below to preview the challenge video with your answer audio together.</Text>
              <View style={[styles.cardDark, { padding: 10, borderRadius: 20 }]}> 
                <VideoView
                  player={challengeVideoPlayer}
                  style={[styles.videoContainer, { marginTop: 0 }]}
                  contentFit="contain"
                  nativeControls
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Your Submission</Text>
              <Text style={styles.status}>Current answer audio is attached to the challenge preview player above.</Text>
              {submission.feedbackText ? (
                <View style={[styles.cardDark, { borderRadius: 18 }]}> 
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Text style={styles.title}>Teacher Review</Text>
                    <Badge label="Feedback" tone="pink" />
                  </View>
                  <Text style={[styles.status, { color: colors.textSecondary }]}>{submission.feedbackText}</Text>
                </View>
              ) : (
                <View style={[styles.cardDark, { borderRadius: 18 }]}> 
                  <Badge label="Pending Review" tone="neutral" />
                  <Text style={styles.status}>Waiting for teacher review.</Text>
                </View>
              )}
            </View>

            {!isReviewed ? (
              <View style={styles.card}>
                <Text style={styles.title}>Update Answer</Text>
                <Text style={styles.status}>You can replace or cancel this submission until the teacher reviews it.</Text>

                <Button
                  title={isRecording ? "Stop Recording" : "Record New Answer"}
                  icon={isRecording ? "stop-circle-outline" : "mic-outline"}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={saving}
                />

                {replacementUri ? (
                  <View style={[styles.cardDark, { borderRadius: 18 }]}> 
                    <Badge label="New Recording Ready" tone="cyan" />
                    <Text style={styles.status}>Preview above, then save to replace the current submission.</Text>
                  </View>
                ) : null}

                <Button
                  title={
                    saving
                      ? uploadProgress != null
                        ? `Uploading ${(uploadProgress * 100).toFixed(0)}%...`
                        : "Saving..."
                      : "Save New Answer"
                  }
                  icon="cloud-upload-outline"
                  onPress={updateSubmission}
                  disabled={saving || !replacementUri}
                  loading={saving && uploadProgress == null}
                />

                {saving && uploadProgress != null ? (
                  <View>
                    <View
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: colors.inputBg,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: colors.borderColor
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.max(2, Math.round(uploadProgress * 100))}%`,
                          height: "100%",
                          backgroundColor: colors.secondary
                        }}
                      />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, fontWeight: "600" }}>
                      Uploading replacement answer...
                    </Text>
                  </View>
                ) : null}

                <Button title="Cancel Submission" variant="dark" icon="trash-outline" onPress={cancelSubmission} disabled={saving} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
