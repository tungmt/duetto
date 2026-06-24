import { useEffect, useRef, useState } from "react";
import { Audio, AVPlaybackStatusSuccess, ResizeMode, Video } from "expo-av";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { styles } from "../../src/styles";

type Challenge = { id: string; title: string; description?: string | null; sourceVideoUrl: string };

export default function ChallengeDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const challengeVideoRef = useRef<Video | null>(null);
  const syncBusyRef = useRef(false);

  useEffect(() => {
    api(`/api/videos/${id}`).then((data) => {
      setChallenge(data.challenge ?? null);
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
      }
    };
  }, [id]);

  async function ensurePreviewSound() {
    if (!recordedUri) {
      return null;
    }

    if (soundRef.current) {
      return soundRef.current;
    }

    const { sound } = await Audio.Sound.createAsync({ uri: recordedUri }, { shouldPlay: false, positionMillis: 0 });
    soundRef.current = sound;
    return sound;
  }

  async function syncAnswerToVideo(status: AVPlaybackStatusSuccess) {
    if (!recordedUri || syncBusyRef.current) {
      return;
    }

    syncBusyRef.current = true;
    try {
      const sound = await ensurePreviewSound();
      if (!sound) {
        return;
      }

      const soundStatus = await sound.getStatusAsync();
      if (!soundStatus.isLoaded) {
        return;
      }

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
      // Keep video playback working even if audio sync fails on a single update.
    } finally {
      syncBusyRef.current = false;
    }
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      Alert.alert("Error", "Could not start recording.");
    }
  }

  async function stopRecording() {
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setRecordedUri(recording.getURI() || "");
      setIsRecording(false);
    } catch (error) {
      Alert.alert("Error", "Could not stop recording.");
    }
  }

  async function submitAnswer() {
    if (!recordedUri) {
      Alert.alert("No answer", "Please record your answer first.");
      return;
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

    setLoading(true);
    setUploadProgress(0);
    try {
      const contentType = "audio/mp4";
      const uploadData = await api("/api/submissions/upload-url", {
        method: "POST",
        body: JSON.stringify({
          fileName: fileNameFromUri(recordedUri),
          contentType,
          fileType: "answer"
        })
      });

      await uploadWithProgress(recordedUri, uploadData.uploadUrl, contentType);

      await api("/api/submissions", {
        method: "POST",
        body: JSON.stringify({ challengeId: id, answerMediaUrl: uploadData.publicUrl, practiceDurationMs: 45000 })
      });
      Alert.alert("Success", "Your answer has been submitted!");
      nav.reset("AppStack", {
        screen: "Dashboard",
        params: { screen: "ChallengesTab" }
      });
    } catch (error) {
      Alert.alert("Could not submit", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.status}>Loading challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <View style={{ backgroundColor: "#0f2742", borderRadius: 20, padding: 18, gap: 6, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <Pressable
                  style={{
                    backgroundColor: "rgba(147, 197, 253, 0.2)",
                    borderColor: "rgba(147, 197, 253, 0.5)",
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7
                  }}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={{ color: "#dbeafe", fontSize: 13, fontWeight: "700" }}>← Back</Text>
                </Pressable>
                <Text style={{ flex: 1, color: "#f8fafc", fontSize: 26, fontWeight: "800" }} numberOfLines={1}>
                  {challenge.title}
                </Text>
              </View>
              <Text style={{ color: "#93c5fd", fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" }}>
                Challenge Workout
              </Text>
              <Text style={{ color: "#cbd5e1", fontSize: 14, fontWeight: "500", lineHeight: 20 }}>
                {challenge.description || "Record and submit your answer video."}
              </Text>
            </View>

            <Video
              ref={(ref) => {
                challengeVideoRef.current = ref;
              }}
              source={{ uri: challenge.sourceVideoUrl }}
              style={styles.videoContainer}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              onPlaybackStatusUpdate={(status) => {
                if (!status.isLoaded) return;
                syncAnswerToVideo(status);
              }}
            />

            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Record Your Answer</Text>
              <Text style={styles.status}>Press record and provide your response</Text>

              <View style={{ gap: 12, marginTop: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    style={[styles.button, { flex: 1, backgroundColor: isRecording ? "#ef4444" : "#0369a1" }]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {isRecording ? "⏹ Stop" : "⏺ Record"}
                    </Text>
                  </Pressable>
                </View>

                {recordedUri ? (
                  <View style={styles.cardDark}>
                    <Text style={styles.title}>✓ Answer recorded</Text>
                    <Text style={styles.status}>Use the challenge video controls above to preview video + your answer audio together.</Text>
                  </View>
                ) : null}

                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled, !recordedUri && { opacity: 0.5 }]}
                  onPress={submitAnswer}
                  disabled={!recordedUri || loading}
                >
                  <Text style={styles.buttonText}>
                    {loading
                      ? uploadProgress != null
                        ? `Uploading ${(uploadProgress * 100).toFixed(0)}%...`
                        : "Submitting..."
                      : "Submit Answer"}
                  </Text>
                </Pressable>

                {loading && uploadProgress != null ? (
                  <View style={{ marginTop: 2 }}>
                    <View
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#dbe4ef",
                        overflow: "hidden"
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.max(2, Math.round(uploadProgress * 100))}%`,
                          height: "100%",
                          backgroundColor: "#0369a1"
                        }}
                      />
                    </View>
                    <Text style={{ color: "#64748b", fontSize: 12, marginTop: 6, fontWeight: "600" }}>
                      Uploading answer to cloud storage...
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
