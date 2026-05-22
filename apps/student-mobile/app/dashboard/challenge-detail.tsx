import { useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import { Video, ResizeMode } from "expo-av";
import { useLocalSearchParams, router } from "expo-router";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type Challenge = { id: string; title: string; description?: string | null; sourceVideoUrl: string };

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState("");
  const [loading, setLoading] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    api(`/api/videos/${id}`).then((data) => {
      setChallenge(data.challenge ?? null);
    });
  }, [id]);

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
    setLoading(true);
    try {
      await api("/api/submissions", {
        method: "POST",
        body: JSON.stringify({ challengeId: id, answerMediaUrl: recordedUri, practiceDurationMs: 45000 })
      });
      Alert.alert("Success", "Your answer has been submitted!");
      router.replace("/dashboard/challenges");
    } catch (error) {
      Alert.alert("Could not submit", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
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
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.heading}>{challenge.title}</Text>
              <Text style={styles.status}>{challenge.description}</Text>
            </View>

            <Video
              source={{ uri: challenge.sourceVideoUrl }}
              style={styles.videoContainer}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
            />

            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Record Your Answer</Text>
              <Text style={styles.status}>Press record and provide your response</Text>

              <View style={{ gap: 12, marginTop: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    style={[styles.button, { flex: 1, backgroundColor: isRecording ? "#ef4444" : "#2563eb" }]}
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
                    <Text style={styles.status}>Ready to submit</Text>
                  </View>
                ) : null}

                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled, !recordedUri && { opacity: 0.5 }]}
                  onPress={submitAnswer}
                  disabled={!recordedUri || loading}
                >
                  <Text style={styles.buttonText}>{loading ? "Submitting..." : "Submit Answer"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
