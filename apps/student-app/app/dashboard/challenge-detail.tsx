import { useEffect, useRef, useState } from "react";
import { Audio, AVPlaybackStatusSuccess, ResizeMode, Video } from "expo-av";
import { Camera, CameraView } from "expo-camera";
import { Alert, Image, KeyboardAvoidingView, LayoutChangeEvent, Platform, Pressable, ScrollView, Text, View } from "react-native";
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

// idle: playing, mic off  |  duetting: camera ready, not recording yet  |  recording: mic on, video muted  |  done: all periods captured
type OrchestrateState = "idle" | "duetting" | "recording" | "done";

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
  const recordingArmedRef = useRef(false);

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
  const [isRecordingArmed, setIsRecordingArmed] = useState(false);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoDurationMs, setVideoDurationMs] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const cameraRef = useRef<CameraView | null>(null);
  const [studentVideoUri, setStudentVideoUri] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

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

  useEffect(() => {
    (async () => {
      const cameraPerm = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(cameraPerm.granted);
    })();
  }, []);

  async function startDuetting() {
    const cameraPerm = await Camera.requestCameraPermissionsAsync();
    if (!cameraPerm.granted) {
      Alert.alert("Camera Permission Required", "Please enable camera access in Settings to use the Duet feature.");
      return;
    }
    setCameraPermission(true);
    setOrchestrateState("duetting");
  }

  async function cancelDuetting() {
    setOrchestrateState("idle");
  }

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
    if (!recordingArmedRef.current) return;
    const periods = challenge?.answerPeriods ?? [];
    if (periods.length === 0) return;
    const pos = status.positionMillis ?? 0;
    const state = orchestrateStateRef.current;
    if (state === "done") return;

    // Keep period progress in sync for UI while recording a single full-length track.
    const nextIndex = periods.findIndex((p) => pos < p.endMs);
    const normalizedIndex = nextIndex === -1 ? periods.length : nextIndex;
    if (normalizedIndex !== currentPeriodIndexRef.current) {
      currentPeriodIndexRef.current = normalizedIndex;
      setCurrentPeriodIndex(normalizedIndex);
    }

    // Finalize recording only when the full video finishes.
    if (state === "recording" && status.didJustFinish) {
      isOrchestratingRef.current = true;
      try {
        await stopPeriodRecording();
        currentPeriodIndexRef.current = periods.length;
        setCurrentPeriodIndex(periods.length);
        orchestrateStateRef.current = "done";
        setOrchestrateState("done");
        recordingArmedRef.current = false;
        setIsRecordingArmed(false);
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
    recordingArmedRef.current = false;
    setIsRecordingArmed(false);
    setStudentVideoUri(null);
    challengeVideoRef.current?.setIsMutedAsync(false).catch(() => undefined);
    challengeVideoRef.current?.setPositionAsync(0).catch(() => undefined);
    previewSoundRef.current?.unloadAsync().catch(() => undefined);
    previewSoundRef.current = null;
    setPreviewReady(false);
  }

  async function startAutoRecordingFromBeginning() {
    resetOrchestration();
    recordingArmedRef.current = true;
    setIsRecordingArmed(true);
    // Show placeholder for side-by-side preview
    setStudentVideoUri("placeholder");
    await startPeriodRecording();
    await challengeVideoRef.current?.setPositionAsync(0);
    await challengeVideoRef.current?.playAsync();
  }

  async function cancelAutoRecording() {
    resetOrchestration();
    await challengeVideoRef.current?.pauseAsync();
  }

  // ── Custom video tracker ─────────────────────────────────────────────────

  async function seekTo(targetMs: number) {
    if (!challengeVideoRef.current || videoDurationMs <= 0) {
      return;
    }
    const next = Math.max(0, Math.min(targetMs, videoDurationMs));
    await challengeVideoRef.current.setPositionAsync(next);
  }

  async function onTimelinePress(event: any) {
    if (videoDurationMs <= 0 || timelineWidth <= 0) {
      return;
    }

    const x = event.nativeEvent?.locationX ?? 0;
    const ratio = Math.max(0, Math.min(x / timelineWidth, 1));
    await seekTo(ratio * videoDurationMs);
  }

  function onTimelineLayout(event: LayoutChangeEvent) {
    setTimelineWidth(event.nativeEvent.layout.width);
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

  async function ensurePreviewAudioReady() {
    if (previewSoundRef.current) {
      return previewSoundRef.current;
    }
    if (segmentUrisRef.current.length === 0) {
      return null;
    }

    setPreviewLoading(true);
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: segmentUrisRef.current[0] },
        { shouldPlay: false, positionMillis: 0 }
      );
      previewSoundRef.current = sound;
      setPreviewReady(true);
      return sound;
    } finally {
      setPreviewLoading(false);
    }
  }

  async function playPreviewFromBeginning() {
    if (segmentUrisRef.current.length === 0) {
      return;
    }

    const sound = await ensurePreviewAudioReady();
    if (!sound) {
      return;
    }

    await sound.setPositionAsync(0);
    await challengeVideoRef.current?.setPositionAsync(0);
    await challengeVideoRef.current?.playAsync();
    await sound.playAsync();
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
      return `🎙 Recording in progress. Speak during the highlighted answer periods.`;
    }
    if (!isRecordingArmed) {
      return "Press Record Your Answer to restart from the beginning and auto-record answer periods.";
    }
    const p = periods[currentPeriodIndex];
    return `▶ Recording armed — period ${currentPeriodIndex + 1} starts at ${formatMs(p?.startMs ?? 0)}`;
  }

  const hasDuration = videoDurationMs > 0;
  const progressPct = hasDuration ? Math.max(0, Math.min((videoPositionMs / videoDurationMs) * 100, 100)) : 0;
  const thumbLeftPx = hasDuration && timelineWidth > 0
    ? Math.max(0, Math.min((videoPositionMs / videoDurationMs) * timelineWidth - 5, timelineWidth - 10))
    : 0;

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
            {orchestrateState === "duetting" || orchestrateState === "recording" ? (
              /* Side-by-side during duetting/recording: Camera (left) + Challenge Video (right) */
              <View style={{ marginTop: 12, gap: 8 }}>
                {!cameraPermission ? (
                  <View style={{ backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 12, padding: 12, gap: 8 }}>
                    <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "700" }}>Camera Permission Required</Text>
                    <Text style={{ color: "#666", fontSize: 12 }}>Enable camera access in your device settings to record a duet.</Text>
                    <Pressable
                      style={[styles.button]}
                      onPress={async () => {
                        const cameraPerm = await Camera.requestCameraPermissionsAsync();
                        setCameraPermission(cameraPerm.granted);
                      }}
                    >
                      <Text style={styles.buttonText}>Request Camera Access</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      height: 320,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: "#000000"
                    }}
                  >
                    {/* Camera - LEFT */}
                    <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "600" }}>Your Camera</Text>
                      </View>
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: "rgba(239,68,68,0.8)",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6
                        }}
                      >
                        <Text style={{ fontSize: 10, color: "#ffffff" }}>🔴</Text>
                        <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "600" }}>
                          {orchestrateState === "recording" ? "Recording" : "Ready"}
                        </Text>
                      </View>
                    </View>

                    {/* Challenge Video - RIGHT */}
                    <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                      <Video
                        ref={(ref) => {
                          challengeVideoRef.current = ref;
                        }}
                        source={{ uri: challenge.sourceVideoUrl }}
                        style={{ flex: 1 }}
                        resizeMode={ResizeMode.COVER}
                        onPlaybackStatusUpdate={(status) => {
                          if (!status.isLoaded) return;
                          setVideoPositionMs(status.positionMillis ?? 0);
                          setVideoDurationMs(status.durationMillis ?? 0);
                          if (hasPeriods) {
                            onVideoPositionUpdate(status as AVPlaybackStatusSuccess);
                          }
                        }}
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "600" }}>Challenge</Text>
                      </View>
                    </View>
                  </View>
                )}
                {orchestrateState === "duetting" && cameraPermission ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      style={[styles.button, { flex: 1 }]}
                      onPress={startAutoRecordingFromBeginning}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>Record Your Answer</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.buttonSecondary, { flex: 1 }]}
                      onPress={cancelDuetting}
                      disabled={loading}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : null}
                {isMuted ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: 16 }}>🔇</Text>
                    <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "700", flex: 1 }}>
                      Video audio muted — microphone is active
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              /* Normal view: Full challenge video + timeline */
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
                    setVideoPositionMs(status.positionMillis ?? 0);
                    setVideoDurationMs(status.durationMillis ?? 0);
                    if (orchestrateState === "done") {
                      syncPreviewToVideo(status as AVPlaybackStatusSuccess);
                    } else if (hasPeriods) {
                      onVideoPositionUpdate(status as AVPlaybackStatusSuccess);
                    }
                  }}
                />
                <View style={{ marginTop: 8 }}>
                  <Pressable
                    onLayout={onTimelineLayout}
                    onPress={onTimelinePress}
                    style={{
                      height: 24,
                      borderRadius: 999,
                      backgroundColor: "#e2e8f0",
                      overflow: "hidden",
                      justifyContent: "center",
                      position: "relative"
                    }}
                  >
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${progressPct}%`,
                      backgroundColor: "#7dd3fc"
                    }}
                  />

                  {hasDuration && challenge.answerPeriods?.length
                    ? challenge.answerPeriods.map((p, i) => {
                        const leftPct = (p.startMs / videoDurationMs) * 100;
                        const widthPct = Math.max(((p.endMs - p.startMs) / videoDurationMs) * 100, 0.75);
                        return (
                          <View
                            key={`${p.startMs}-${p.endMs}-${i}`}
                            style={{
                              position: "absolute",
                              top: 5,
                              bottom: 5,
                              borderRadius: 999,
                              backgroundColor: "rgba(2, 132, 199, 0.35)",
                              borderWidth: 1,
                              borderColor: "rgba(2, 132, 199, 0.65)",
                              left: `${leftPct}%`,
                              width: `${widthPct}%`
                            }}
                          />
                        );
                      })
                    : null}

                  <View
                    style={{
                      position: "absolute",
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#0369a1",
                      borderWidth: 1,
                      borderColor: "#ffffff",
                      top: 7,
                      left: thumbLeftPx
                    }}
                  />
                </Pressable>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>{formatMs(videoPositionMs)}</Text>
                  <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>{formatMs(videoDurationMs)}</Text>
                </View>
              </View>
              {isMuted ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 8, padding: 8 }}>
                  <Text style={{ fontSize: 16 }}>🔇</Text>
                  <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "700", flex: 1 }}>
                    Video audio muted — microphone is active
                  </Text>
                </View>
              ) : null}
              </View>
            )}

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
                    {periodStatusLabel()}
                  </Text>
                </View>

                {orchestrateState === "idle" && !isRecordingArmed ? (
                  <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={startDuetting}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>Duet</Text>
                  </Pressable>
                ) : null}

                {orchestrateState === "idle" && isRecordingArmed ? (
                  <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={startDuetting}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>Record Your Answer Again</Text>
                  </Pressable>
                ) : null}

                {orchestrateState === "recording" ? (
                  <Pressable
                    style={styles.buttonSecondary}
                    onPress={cancelAutoRecording}
                    disabled={loading}
                  >
                    <Text style={styles.buttonSecondaryText}>Cancel Recording</Text>
                  </Pressable>
                ) : null}

                {/* Period timeline */}
                <View style={{ gap: 6 }}>
                  {challenge.answerPeriods.map((p, i) => {
                    const isDone = orchestrateState === "done" || i < currentPeriodIndex;
                    const isActive =
                      orchestrateState === "recording" &&
                      i === currentPeriodIndex &&
                      videoPositionMs >= p.startMs &&
                      videoPositionMs < p.endMs;
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
                      <Text style={styles.status}>Preview your answer with the challenge below. Then submit.</Text>
                    </View>

                    {/* Side-by-side video preview */}
                    {studentVideoUri ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.sectionTitle}>Your Duet Preview</Text>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            height: 280,
                            borderRadius: 12,
                            overflow: "hidden",
                            backgroundColor: "#000000"
                          }}
                        >
                          {/* Original Challenge */}
                          <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                            <Video
                              source={{ uri: challenge.sourceVideoUrl }}
                              style={{ flex: 1 }}
                              resizeMode={ResizeMode.COVER}
                              shouldPlay={false}
                              useNativeControls={false}
                            />
                            <View
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 8,
                                backgroundColor: "rgba(0,0,0,0.6)",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6
                              }}
                            >
                              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "600" }}>Challenge</Text>
                            </View>
                          </View>

                          {/* Student Camera */}
                          <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                            <Video
                              source={{ uri: studentVideoUri }}
                              style={{ flex: 1 }}
                              resizeMode={ResizeMode.COVER}
                              shouldPlay={false}
                              useNativeControls={false}
                            />
                            <View
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 8,
                                backgroundColor: "rgba(0,0,0,0.6)",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6
                              }}
                            >
                              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "600" }}>Your Response</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>
                          Your side-by-side video will be generated after you submit
                        </Text>
                      </View>
                    ) : null}

                    <Pressable
                      style={[styles.buttonSecondary, previewLoading && { opacity: 0.6 }]}
                      onPress={playPreviewFromBeginning}
                      disabled={previewLoading}
                    >
                      <Text style={styles.buttonSecondaryText}>
                        {previewLoading ? "Preparing audio…" : previewReady ? "Listen Again (From Start)" : "Listen Again (From Start)"}
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

