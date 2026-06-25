import { useEffect, useRef, useState } from "react";
import { Audio, AVPlaybackStatusSuccess, ResizeMode, Video } from "expo-av";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { styles } from "../../src/styles";

type AnswerPeriod = { startMs: number; endMs: number };

type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  sourceVideoUrl: string;
  answerPeriods: AnswerPeriod[];
  teacher?: {
    id: string;
    name: string;
    teacherProfile?: {
      displayName?: string | null;
      avatarUrl?: string | null;
      headline?: string | null;
      bio?: string | null;
      yearsExperience?: number | null;
    } | null;
  } | null;
};

// idle: playing, mic off  |  recording: mic on, video muted  |  done: all periods captured
type OrchestrateState = "idle" | "recording" | "done";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "T";
}

export default function ChallengeDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Orchestration (refs avoid re-render races in onPlaybackStatusUpdate)
  const challengeVideoRef = useRef<Video | null>(null);
  const orchestrateStateRef = useRef<OrchestrateState>("idle");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const segmentUrisRef = useRef<string[]>([]);
  const currentPeriodIndexRef = useRef(0);
  const isOrchestratingRef = useRef(false);

  // Preview sync refs
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const previewSyncBusyRef = useRef(false);

  // UI state derived from orchestration
  const [orchestrateState, setOrchestrateState] = useState<OrchestrateState>("idle");
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const hasPeriods = (challenge?.answerPeriods?.length ?? 0) > 0;

  useEffect(() => {
    api(`/api/videos/${id}`).then((data) => {
      const c = data.challenge ?? null;
      if (c && !Array.isArray(c.answerPeriods)) c.answerPeriods = [];
      setChallenge(c);
    });
    return () => {
      previewSoundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, [id]);

  // ── Orchestration engine ─────────────────────────────────────────────────

  async function startPeriodRecording() {
    await Audio.requestPermissionsAsync();
    await challengeVideoRef.current?.setIsMutedAsync(true);
    setIsMuted(true);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    orchestrateStateRef.current = "recording";
    setOrchestrateState("recording");
  }

  async function stopPeriodRecording() {
    const recording = recordingRef.current;
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI() ?? "";
    recordingRef.current = null;
    if (uri) {
      segmentUrisRef.current = [...segmentUrisRef.current, uri];
      setSegmentCount(segmentUrisRef.current.length);
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    await challengeVideoRef.current?.setIsMutedAsync(false);
    setIsMuted(false);
  }

  async function onVideoPositionUpdate(status: AVPlaybackStatusSuccess) {
    if (isOrchestratingRef.current) return;
    const periods = challenge?.answerPeriods ?? [];
    if (periods.length === 0) return;
    const pos = status.positionMillis ?? 0;
    const state = orchestrateStateRef.current;
    const idx = currentPeriodIndexRef.current;
    if (state === "done" || idx >= periods.length) return;
    const period = periods[idx];

    if (state === "idle" && pos >= period.startMs) {
      isOrchestratingRef.current = true;
      try { await startPeriodRecording(); } finally { isOrchestratingRef.current = false; }
    } else if (state === "recording" && pos >= period.endMs) {
      isOrchestratingRef.current = true;
      try {
        await stopPeriodRecording();
        const nextIdx = idx + 1;
        currentPeriodIndexRef.current = nextIdx;
        setCurrentPeriodIndex(nextIdx);
        if (nextIdx >= periods.length) {
          orchestrateStateRef.current = "done";
          setOrchestrateState("done");
          await challengeVideoRef.current?.pauseAsync();
        } else {
          orchestrateStateRef.current = "idle";
          setOrchestrateState("idle");
        }
      } finally { isOrchestratingRef.current = false; }
    }
  }

  function resetOrchestration() {
    recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
    recordingRef.current = null;
    segmentUrisRef.current = [];
    currentPeriodIndexRef.current = 0;
    orchestrateStateRef.current = "idle";
    setOrchestrateState("idle");
    setCurrentPeriodIndex(0);
    setSegmentCount(0);
    setIsMuted(false);
    challengeVideoRef.current?.setIsMutedAsync(false).catch(() => undefined);
    challengeVideoRef.current?.setPositionAsync(0).catch(() => undefined);
    previewSoundRef.current?.unloadAsync().catch(() => undefined);
    previewSoundRef.current = null;
    setPreviewReady(false);
  }

  // ── Preview: answer audio synced to video replay ─────────────────────────

  async function syncPreviewToVideo(status: AVPlaybackStatusSuccess) {
    const sound = previewSoundRef.current;
    if (!sound || previewSyncBusyRef.current) return;
    previewSyncBusyRef.current = true;
    try {
      const ss = await sound.getStatusAsync();
      if (!ss.isLoaded) return;
      const drift = Math.abs((ss.positionMillis ?? 0) - (status.positionMillis ?? 0));
      if (drift > 250) await sound.setPositionAsync(status.positionMillis ?? 0);
      if (status.didJustFinish) {
        if (ss.isPlaying) await sound.pauseAsync();
        await sound.setPositionAsync(0);
        return;
      }
      if (status.isPlaying && !ss.isPlaying) await sound.playAsync();
      else if (!status.isPlaying && ss.isPlaying) await sound.pauseAsync();
    } catch { /* ignore single-frame errors */ } finally { previewSyncBusyRef.current = false; }
  }

  async function loadPreviewAudio() {
    if (segmentUrisRef.current.length === 0 || previewSoundRef.current) return;
    setPreviewLoading(true);
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: segmentUrisRef.current[0] },
        { shouldPlay: false, positionMillis: 0 }
      );
      previewSoundRef.current = sound;
      setPreviewReady(true);
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Upload & Submit ───────────────────────────────────────────────────────

  function fileNameFromUri(uri: string) {
    const parts = uri.split("/");
    return parts[parts.length - 1] || `answer-${Date.now()}.m4a`;
  }

  async function uploadWithProgress(fileUri: string, uploadUrl: string, contentType: string, onProgress: (p: number) => void) {
    const blob = await (await fetch(fileUri)).blob();
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total); };
      xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { onProgress(1); resolve(); } else reject(new Error(`Upload failed (${xhr.status})`)); };
      xhr.onerror = () => reject(new Error("Upload failed due to network error."));
      xhr.send(blob as any);
    });
  }

  async function submitAnswer() {
    const segments = segmentUrisRef.current;
    if (segments.length === 0) {
      Alert.alert("No answer", "Please complete the challenge recording first.");
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    try {
      const contentType = "audio/mp4";
      const segmentUrls: string[] = [];
      const step = 1 / segments.length;
      for (let i = 0; i < segments.length; i++) {
        const uploadData = await api("/api/submissions/upload-url", {
          method: "POST",
          body: JSON.stringify({ fileName: fileNameFromUri(segments[i]), contentType, fileType: "answer" })
        });
        await uploadWithProgress(segments[i], uploadData.uploadUrl, contentType, (p) => {
          setUploadProgress(i * step + p * step);
        });
        segmentUrls.push(uploadData.publicUrl);
      }

      await api("/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          challengeId: id,
          answerMediaUrl: segmentUrls[0],
          answerSegments: segmentUrls,
          practiceDurationMs: 45000
        })
      });

      Alert.alert("Submitted!", "Your answer has been submitted successfully.");
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatMs(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function periodStatusLabel() {
    const periods = challenge?.answerPeriods ?? [];
    if (orchestrateState === "done") return "All answer periods recorded ✓";
    if (orchestrateState === "recording") {
      const p = periods[currentPeriodIndex];
      return `🎙 Recording period ${currentPeriodIndex + 1}/${periods.length}  (ends ${formatMs(p?.endMs ?? 0)})`;
    }
    const p = periods[currentPeriodIndex];
    return `▶ Press play — period ${currentPeriodIndex + 1} starts at ${formatMs(p?.startMs ?? 0)}`;
  }

  if (!challenge) {
    return (
      <View style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.status}>Loading challenge...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* Header */}
            <View
              style={[
                styles.heroCard,
                {
                  marginBottom: 14,
                  marginHorizontal: -20,
                  marginTop: -20,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 16
                }
              ]}
            >
              <View style={styles.heroTopRow}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {challenge.title}
                </Text>
              </View>
              <Text style={styles.heroEyebrow}>Challenge</Text>
              <Text style={styles.heroSubtitle}>
                {challenge.description || "Watch the video and record your answer during the marked periods."}
              </Text>
            </View>

            {challenge.teacher?.id ? (
              <Pressable
                onPress={() => nav.navigate("TeacherDetail", { teacherId: challenge.teacher?.id })}
                style={[styles.card, { marginTop: -2, flexDirection: "row", alignItems: "center", gap: 14 }]}
              >
                {challenge.teacher?.teacherProfile?.avatarUrl ? (
                  <Image
                    source={{ uri: challenge.teacher.teacherProfile.avatarUrl }}
                    style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#cbd5e1" }}
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#0369a1",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "800" }}>
                      {getInitials(challenge.teacher.teacherProfile?.displayName || challenge.teacher.name || "Teacher")}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{challenge.teacher?.teacherProfile?.displayName || challenge.teacher?.name || "Teacher"}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {challenge.teacher?.teacherProfile?.headline || "Open teacher profile"}
                  </Text>
                  {typeof challenge.teacher?.teacherProfile?.yearsExperience === "number" ? (
                    <Text style={styles.status}>{challenge.teacher.teacherProfile.yearsExperience} years experience</Text>
                  ) : null}
                </View>
                <Text style={styles.link}>View →</Text>
              </Pressable>
            ) : null}

            {/* Video */}
            <View>
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
                  if (orchestrateState === "done") {
                    syncPreviewToVideo(status as AVPlaybackStatusSuccess);
                  } else if (hasPeriods) {
                    onVideoPositionUpdate(status as AVPlaybackStatusSuccess);
                  }
                }}
              />
              {isMuted ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 8, padding: 8 }}>
                  <Text style={{ fontSize: 16 }}>🔇</Text>
                  <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "700", flex: 1 }}>
                    Video audio muted — microphone is active
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Orchestrated or manual recording */}
            {hasPeriods ? (
              <View style={{ marginTop: 14, gap: 12 }}>
                <Text style={styles.sectionTitle}>Auto-Recording</Text>

                {/* Status badge */}
                <View style={{
                  borderRadius: 10, padding: 12,
                  backgroundColor: orchestrateState === "recording" ? "rgba(239,68,68,0.1)"
                    : orchestrateState === "done" ? "rgba(34,197,94,0.1)" : "#f0f9ff"
                }}>
                  <Text style={{
                    fontWeight: "700", fontSize: 14,
                    color: orchestrateState === "recording" ? "#ef4444"
                      : orchestrateState === "done" ? "#16a34a" : "#0369a1"
                  }}>
                    {orchestrateState === "idle" && currentPeriodIndex === 0
                      ? "Press ▶ on the video to start. Recording begins automatically at the right moments."
                      : periodStatusLabel()}
                  </Text>
                </View>

                {/* Period timeline */}
                <View style={{ gap: 6 }}>
                  {challenge.answerPeriods.map((p, i) => {
                    const isDone = orchestrateState === "done" || i < currentPeriodIndex;
                    const isActive = i === currentPeriodIndex && orchestrateState === "recording";
                    return (
                      <View key={i} style={{
                        flexDirection: "row", alignItems: "center", gap: 10,
                        backgroundColor: isActive ? "rgba(239,68,68,0.08)" : isDone ? "rgba(34,197,94,0.08)" : "#f8fafc",
                        borderRadius: 10, padding: 10, borderWidth: 1,
                        borderColor: isActive ? "#ef4444" : isDone ? "#86efac" : "#dbe4ef"
                      }}>
                        <Text style={{ fontSize: 16 }}>{isActive ? "🎙" : isDone ? "✅" : "○"}</Text>
                        <Text style={{ flex: 1, color: "#0f172a", fontWeight: "600", fontSize: 13 }}>
                          Period {i + 1}: {formatMs(p.startMs)} → {formatMs(p.endMs)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {orchestrateState === "done" ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.cardDark}>
                      <Text style={styles.title}>✓ {segmentCount} segment{segmentCount !== 1 ? "s" : ""} recorded</Text>
                      <Text style={styles.status}>Replay the video to preview your answer audio in sync. Then submit below.</Text>
                    </View>
                    <Pressable
                      style={[styles.buttonSecondary, (previewLoading || previewReady) && { opacity: 0.6 }]}
                      onPress={loadPreviewAudio}
                      disabled={previewLoading || previewReady}
                    >
                      <Text style={styles.buttonSecondaryText}>
                        {previewLoading ? "Preparing audio…" : previewReady ? "▶ Press play on video to preview" : "Load Answer Audio for Preview"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={submitAnswer}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {loading
                          ? uploadProgress != null ? `Uploading ${(uploadProgress * 100).toFixed(0)}%…` : "Submitting…"
                          : "Submit Answer"}
                      </Text>
                    </Pressable>
                    {loading && uploadProgress != null ? (
                      <View>
                        <View style={{ width: "100%", height: 8, borderRadius: 999, backgroundColor: "#dbe4ef", overflow: "hidden" }}>
                          <View style={{ width: `${Math.max(2, Math.round(uploadProgress * 100))}%`, height: "100%", backgroundColor: "#0369a1" }} />
                        </View>
                        <Text style={{ color: "#64748b", fontSize: 12, marginTop: 6, fontWeight: "600" }}>Uploading answer segments…</Text>
                      </View>
                    ) : null}
                    <Pressable style={styles.buttonSecondary} onPress={resetOrchestration}>
                      <Text style={styles.buttonSecondaryText}>↺ Record Again</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              /* No periods: manual recording fallback */
              <View style={{ marginTop: 14, gap: 12 }}>
                <Text style={styles.sectionTitle}>Record Your Answer</Text>
                <Text style={styles.status}>This challenge has no defined answer periods. Record manually below.</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    style={[styles.button, { flex: 1, backgroundColor: orchestrateState === "recording" ? "#ef4444" : "#0369a1" }]}
                    onPress={async () => {
                      if (orchestrateState === "recording") {
                        await stopPeriodRecording();
                        orchestrateStateRef.current = "done";
                        setOrchestrateState("done");
                      } else {
                        await startPeriodRecording();
                      }
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {orchestrateState === "recording" ? "⏹ Stop" : "⏺ Record"}
                    </Text>
                  </Pressable>
                </View>
                {orchestrateState === "done" && segmentCount > 0 ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.cardDark}>
                      <Text style={styles.title}>✓ Answer recorded</Text>
                      <Text style={styles.status}>Use the challenge video controls above to preview with your answer audio.</Text>
                    </View>
                    <Pressable
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={submitAnswer}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {loading
                          ? uploadProgress != null ? `Uploading ${(uploadProgress * 100).toFixed(0)}%…` : "Submitting…"
                          : "Submit Answer"}
                      </Text>
                    </Pressable>
                    {loading && uploadProgress != null ? (
                      <View>
                        <View style={{ width: "100%", height: 8, borderRadius: 999, backgroundColor: "#dbe4ef", overflow: "hidden" }}>
                          <View style={{ width: `${Math.max(2, Math.round(uploadProgress * 100))}%`, height: "100%", backgroundColor: "#0369a1" }} />
                        </View>
                        <Text style={{ color: "#64748b", fontSize: 12, marginTop: 6, fontWeight: "600" }}>Uploading answer…</Text>
                      </View>
                    ) : null}
                    <Pressable style={styles.buttonSecondary} onPress={resetOrchestration}>
                      <Text style={styles.buttonSecondaryText}>↺ Record Again</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

