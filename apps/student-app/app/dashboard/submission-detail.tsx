import { Audio, AVPlaybackStatusSuccess, ResizeMode, Video } from "expo-av";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { styles } from "../../src/styles";

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

export default function SubmissionDetailScreen() {
  const navigation = useNavigation<SubmissionDetailNavigationProp>();
  const route = useRoute();
  const submissionId = ((route as SubmissionDetailRoute).params?.submissionId ?? "").trim();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const challengeVideoRef = useRef<Video | null>(null);
  const answerSoundRef = useRef<Audio.Sound | null>(null);
  const answerSoundUriRef = useRef("");
  const syncBusyRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replacementUri, setReplacementUri] = useState("");

  const currentAnswerUri = replacementUri || submission?.answerMediaUrl || "";

  async function ensureAnswerSound() {
    if (!currentAnswerUri) {
      return null;
    }

    const existing = answerSoundRef.current;
    if (existing) {
      if (answerSoundUriRef.current === currentAnswerUri) {
        return existing;
      }
      await existing.unloadAsync().catch(() => undefined);
      answerSoundRef.current = null;
      answerSoundUriRef.current = "";
    }

    const { sound } = await Audio.Sound.createAsync({ uri: currentAnswerUri }, { shouldPlay: false, positionMillis: 0 });
    answerSoundRef.current = sound;
    answerSoundUriRef.current = currentAnswerUri;
    return sound;
  }

  async function syncAnswerToVideo(status: AVPlaybackStatusSuccess) {
    if (!currentAnswerUri || syncBusyRef.current) {
      return;
    }

    syncBusyRef.current = true;
    try {
      const sound = await ensureAnswerSound();
      if (!sound) return;

      const soundStatus = await sound.getStatusAsync();
      if (!soundStatus.isLoaded) return;

      const drift = Math.abs((soundStatus.positionMillis ?? 0) - (status.positionMillis ?? 0));
      if (drift > 220) {
        await sound.setPositionAsync(status.positionMillis ?? 0);
      }

      if (status.didJustFinish) {
        if (soundStatus.isPlaying) {
          await sound.pauseAsync();
        }
        await sound.setPositionAsync(0);
        return;
      }

      if (status.isPlaying && !soundStatus.isPlaying) {
        await sound.playAsync();
      } else if (!status.isPlaying && soundStatus.isPlaying) {
        await sound.pauseAsync();
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
        if (answerSoundRef.current) {
          answerSoundRef.current.unloadAsync().catch(() => undefined);
          answerSoundRef.current = null;
          answerSoundUriRef.current = "";
        }
      };
    }, [])
  );

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      Alert.alert("Error", "Could not start recording.");
    }
  }

  async function stopRecording() {
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      if (answerSoundRef.current) {
        await answerSoundRef.current.unloadAsync().catch(() => undefined);
        answerSoundRef.current = null;
        answerSoundUriRef.current = "";
      }
      setReplacementUri(recording.getURI() || "");
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
        await answerSoundRef.current.unloadAsync().catch(() => undefined);
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
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>Loading submission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!submission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>Submission not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isReviewed = submission.status === "REVIEWED";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.heroTitle}>Submission Detail</Text>
              </View>
              <Text style={styles.heroEyebrow}>Answer Review</Text>
              <Text style={styles.heroSubtitle}>Preview your answer, review teacher feedback, and manage this submission.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>{submission.challenge.title}</Text>
              <Text style={styles.status}>Teacher: {submission.challenge.teacher?.name ?? "Teacher"}</Text>
              <Text style={styles.status}>Status: {submission.status}</Text>
              <Text style={styles.status}>Score: {submission.score ?? "Pending"}</Text>
              <Text style={styles.status}>Submitted: {new Date(submission.createdAt).toLocaleString()}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Challenge Preview</Text>
              <Text style={[styles.status, { marginBottom: 8 }]}>Use this play button to preview challenge video with your answer audio together.</Text>
              <Video
                ref={(ref) => {
                  challengeVideoRef.current = ref;
                }}
                source={{ uri: submission.challenge.sourceVideoUrl }}
                style={styles.videoContainer}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                onPlaybackStatusUpdate={(status) => {
                  if (!status.isLoaded) return;
                  syncAnswerToVideo(status);
                }}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Your Submission</Text>
              <Text style={styles.status}>Current answer track is attached to the challenge preview player above.</Text>
              {submission.feedbackText ? (
                <View style={styles.cardDark}>
                  <Text style={styles.title}>Teacher Review</Text>
                  <Text style={styles.status}>{submission.feedbackText}</Text>
                </View>
              ) : (
                <Text style={styles.status}>Waiting for teacher review.</Text>
              )}
            </View>

            {!isReviewed ? (
              <View style={styles.card}>
                <Text style={styles.title}>Update Answer</Text>
                <Text style={styles.status}>You can replace or cancel this submission until the teacher reviews it.</Text>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    style={[styles.button, { flex: 1, backgroundColor: isRecording ? "#ef4444" : "#0369a1" }]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={saving}
                  >
                    <Text style={styles.buttonText}>{isRecording ? "⏹ Stop Recording" : "⏺ Record New Answer"}</Text>
                  </Pressable>
                </View>

                {replacementUri ? (
                  <View style={styles.cardDark}>
                    <Text style={styles.title}>New answer ready</Text>
                    <Text style={styles.status}>Preview above, then save to replace the current submission.</Text>
                  </View>
                ) : null}

                <Pressable
                  style={[styles.button, (saving || !replacementUri) && styles.buttonDisabled, !replacementUri && { opacity: 0.5 }]}
                  onPress={updateSubmission}
                  disabled={saving || !replacementUri}
                >
                  <Text style={styles.buttonText}>
                    {saving
                      ? uploadProgress != null
                        ? `Uploading ${(uploadProgress * 100).toFixed(0)}%...`
                        : "Saving..."
                      : "Save New Answer"}
                  </Text>
                </Pressable>

                {saving && uploadProgress != null ? (
                  <View>
                    <View style={{ width: "100%", height: 8, borderRadius: 999, backgroundColor: "#dbe4ef", overflow: "hidden" }}>
                      <View style={{ width: `${Math.max(2, Math.round(uploadProgress * 100))}%`, height: "100%", backgroundColor: "#0369a1" }} />
                    </View>
                    <Text style={{ color: "#64748b", fontSize: 12, marginTop: 6, fontWeight: "600" }}>Uploading replacement answer...</Text>
                  </View>
                ) : null}

                <Pressable style={[styles.button, styles.buttonDanger]} onPress={cancelSubmission} disabled={saving}>
                  <Text style={styles.buttonText}>Cancel Submission</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
