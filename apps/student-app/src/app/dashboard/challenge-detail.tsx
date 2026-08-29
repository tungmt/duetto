import { useEffect, useRef, useState } from "react";
import { useEventListener } from "expo";
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { Camera, CameraView } from "expo-camera";
import { VideoView, useVideoPlayer } from "expo-video";
import { Alert, Image, KeyboardAvoidingView, LayoutChangeEvent, Platform, Pressable, ScrollView, View } from "react-native";
import Text from "../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import nav from "../../actions/navigation";
import { styles } from "../../actions/styles";
import { ExportManager } from "../../actions/export-manager";

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

  const challengeRef = useRef<Challenge | null>(null);
  const cameraVideoUriRef = useRef<string | null>(null);
  const orchestrateStateRef = useRef<OrchestrateState>("idle");
  const segmentUrisRef = useRef<string[]>([]);
  const currentPeriodIndexRef = useRef(0);
  const isOrchestratingRef = useRef(false);
  const recordingArmedRef = useRef(false);
  const previewSoundRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const previewSyncBusyRef = useRef(false);
  const cameraRecordingPromiseRef = useRef<Promise<{ uri: string }> | null>(null);
  const isCameraReadyRef = useRef(false);
  const cameraReadyResolverRef = useRef<((ready: boolean) => void) | null>(null);
  const cameraReadyAtMsRef = useRef(0);
  const hasSeparateAudioRecordingRef = useRef(false);

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
  const [cameraVideoUri, setCameraVideoUri] = useState<string | null>(null);
  const [isComposingVideo, setIsComposingVideo] = useState(false);
  const [composedVideoUri, setComposedVideoUri] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const challengeSource = challenge?.sourceVideoUrl ?? null;
  const previewStudentUri = composedVideoUri || studentVideoUri;
  const hasPeriods = (challenge?.answerPeriods?.length ?? 0) > 0;

  const challengeVideoPlayer = useVideoPlayer(challengeSource, (player) => {
    player.timeUpdateEventInterval = 0.1;
    player.audioMixingMode = "auto";
  });

  const previewChallengePlayer = useVideoPlayer(orchestrateState === "done" ? challengeSource : null, (player) => {
    player.muted = true;
  });

  const studentPreviewPlayer = useVideoPlayer(orchestrateState === "done" ? previewStudentUri : null, (player) => {
    player.muted = true;
  });

  const mergedDuetPlayer = useVideoPlayer(orchestrateState === "done" ? composedVideoUri : null, (player) => {
    player.muted = false;
    player.audioMixingMode = "auto";
  });

  useEffect(() => {
    challengeRef.current = challenge;
  }, [challenge]);

  useEffect(() => {
    cameraVideoUriRef.current = cameraVideoUri;
  }, [cameraVideoUri]);

  useEffect(() => {
    api(`/api/videos/${id}`).then((data) => {
      const nextChallenge = data.challenge ?? null;
      if (nextChallenge && !Array.isArray(nextChallenge.answerPeriods)) nextChallenge.answerPeriods = [];
      setChallenge(nextChallenge);
    });

    return () => {
      previewSoundRef.current?.remove();
      previewSoundRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    (async () => {
      const cameraPerm = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(cameraPerm.granted);
      await Camera.requestMicrophonePermissionsAsync();
    })();
  }, []);

  useEventListener(mergedDuetPlayer, "sourceLoad", () => {
    if (orchestrateStateRef.current === "done" && composedVideoUri) {
      mergedDuetPlayer.currentTime = 0;
      mergedDuetPlayer.play();
    }
  });

  useEventListener(challengeVideoPlayer, "sourceLoad", ({ duration }) => {
    setVideoDurationMs(Math.round(duration * 1000));
    if (orchestrateStateRef.current === "idle") {
      challengeVideoPlayer.play();
    }
  });

  useEventListener(challengeVideoPlayer, "timeUpdate", ({ currentTime }) => {
    const positionMs = Math.round(currentTime * 1000);
    const durationMs = Math.round(challengeVideoPlayer.duration * 1000);
    setVideoPositionMs(positionMs);
    setVideoDurationMs(durationMs);

    if (orchestrateStateRef.current === "done") {
      void syncPreviewToVideo(positionMs, challengeVideoPlayer.playing, false);
      return;
    }

    if ((challengeRef.current?.answerPeriods?.length ?? 0) > 0) {
      void onVideoPositionUpdate(positionMs, false);
    }
  });

  useEventListener(challengeVideoPlayer, "playingChange", ({ isPlaying }) => {
    if (orchestrateStateRef.current === "done") {
      void syncPreviewToVideo(Math.round(challengeVideoPlayer.currentTime * 1000), isPlaying, false);
    }
  });

  useEventListener(challengeVideoPlayer, "playToEnd", () => {
    const endMs = Math.round(challengeVideoPlayer.duration * 1000);
    setVideoPositionMs(endMs);

    if ((challengeRef.current?.answerPeriods?.length ?? 0) > 0) {
      void onVideoPositionUpdate(endMs, true);
    }

    if (orchestrateStateRef.current === "recording" && recordingArmedRef.current) {
      void finalizeRecordingSession();
    }

    if (orchestrateStateRef.current === "done") {
      void syncPreviewToVideo(endMs, false, true);
    }
  });

  async function startDuetting() {
    const cameraPerm = await Camera.requestCameraPermissionsAsync();
    const microphonePerm = await Camera.requestMicrophonePermissionsAsync();
    if (!cameraPerm.granted) {
      Alert.alert("Camera Permission Required", "Please enable camera access in Settings to use the Duet feature.");
      return;
    }
    if (!microphonePerm.granted) {
      Alert.alert("Microphone Permission Required", "Please enable microphone access in Settings to record your duet audio.");
      return;
    }
    resetOrchestration();
    setCameraPermission(true);
    isCameraReadyRef.current = false;
    setIsCameraReady(false);
    challengeVideoPlayer.currentTime = 0;
    challengeVideoPlayer.pause();
    setOrchestrateState("duetting");
    orchestrateStateRef.current = "duetting";
  }

  async function cancelDuetting() {
    setOrchestrateState("idle");
    orchestrateStateRef.current = "idle";
    isCameraReadyRef.current = false;
    setIsCameraReady(false);
  }

  function onCameraReady() {
    console.log("Camera is ready");
    isCameraReadyRef.current = true;
    cameraReadyAtMsRef.current = Date.now();
    setIsCameraReady(true);
    if (cameraReadyResolverRef.current) {
      cameraReadyResolverRef.current(true);
      cameraReadyResolverRef.current = null;
    }
  }

  async function waitForCameraReady(timeoutMs = 4000): Promise<boolean> {
    if (isCameraReadyRef.current) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cameraReadyResolverRef.current = null;

        if(!isCameraReadyRef.current) {
          resolve(false);
        } else {
          resolve(true);
        }
      }, timeoutMs);

      cameraReadyResolverRef.current = (ready: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(ready);
      };
    });
  }

  async function startPeriodRecording() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone Permission Required", "Please enable microphone access in Settings to record your answer.");
      return false;
    }

    challengeVideoPlayer.muted = true;
    setIsMuted(true);

    hasSeparateAudioRecordingRef.current = false;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      hasSeparateAudioRecordingRef.current = true;
    } catch (error) {
      // Some devices cannot prepare a second recorder while camera captures audio.
      // Keep duet recording alive and rely on camera audio track for merge.
      console.error("Audio recorder prepare failed, continuing with camera audio only:", error);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }

    orchestrateStateRef.current = "recording";
    setOrchestrateState("recording");
    return true;
  }

  async function stopPeriodRecording() {
    if (hasSeparateAudioRecordingRef.current) {
      try {
        await audioRecorder.stop();
      } catch {
        // Continue cleanup even if stopping recorder fails.
      }

      const uri = audioRecorder.uri ?? "";
      if (uri) {
        segmentUrisRef.current = [...segmentUrisRef.current, uri];
        setSegmentCount(segmentUrisRef.current.length);
      }
    }

    hasSeparateAudioRecordingRef.current = false;

    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    challengeVideoPlayer.muted = false;
    setIsMuted(false);
  }

  async function onVideoPositionUpdate(positionMs: number, didJustFinish: boolean) {
    if (isOrchestratingRef.current) return;
    if (!recordingArmedRef.current) return;

    const periods = challengeRef.current?.answerPeriods ?? [];
    if (periods.length === 0) return;

    const state = orchestrateStateRef.current;
    if (state === "done") return;

    const nextIndex = periods.findIndex((period) => positionMs < period.endMs);
    const normalizedIndex = nextIndex === -1 ? periods.length : nextIndex;
    if (normalizedIndex !== currentPeriodIndexRef.current) {
      currentPeriodIndexRef.current = normalizedIndex;
      setCurrentPeriodIndex(normalizedIndex);
    }

    if (state === "recording" && didJustFinish) {
      await finalizeRecordingSession();
    }
  }

  async function finalizeRecordingSession() {
    if (isOrchestratingRef.current) return;

    isOrchestratingRef.current = true;
    try {
      await stopPeriodRecording();

      if (cameraRef.current?.stopRecording) {
        try {
          await cameraRef.current.stopRecording();
        } catch (error) {
          console.error("Error stopping camera recording:", error);
        }
      }

      let finalCameraUri = cameraVideoUriRef.current;
      if (cameraRecordingPromiseRef.current) {
        try {
          const recordedVideo = await cameraRecordingPromiseRef.current;
          if (recordedVideo?.uri) {
            finalCameraUri = recordedVideo.uri;
            cameraVideoUriRef.current = recordedVideo.uri;
            setCameraVideoUri(recordedVideo.uri);
            setStudentVideoUri(recordedVideo.uri);
          }
        } catch (error) {
          console.error("Camera recording finalize error:", error);
        } finally {
          cameraRecordingPromiseRef.current = null;
        }
      }

      const periodCount = challengeRef.current?.answerPeriods?.length ?? 0;
      currentPeriodIndexRef.current = periodCount;
      setCurrentPeriodIndex(periodCount);
      orchestrateStateRef.current = "done";
      setOrchestrateState("done");
      recordingArmedRef.current = false;
      setIsRecordingArmed(false);

      if (finalCameraUri) {
        await composeAndExportVideo(finalCameraUri);
      } else {
        Alert.alert("Merge Skipped", "No recorded camera video was found, so merged duet could not be generated.");
      }
    } finally {
      isOrchestratingRef.current = false;
    }
  }

  async function composeAndExportVideo(studentSourceUri?: string) {
    try {
      setIsComposingVideo(true);

      const leftVideoUri = studentSourceUri || cameraVideoUriRef.current;
      if (!leftVideoUri || !challengeRef.current?.sourceVideoUrl) {
        throw new Error("Missing video sources for composition");
      }

      const exportManager = new ExportManager();
      const fileName = `duet-${Date.now()}.mp4`;

      const result = await exportManager.exportDuetVideo(
        leftVideoUri,
        challengeRef.current.sourceVideoUrl,
        fileName,
        (progress) => {
          console.log(`Export progress: ${progress.stage} - ${progress.progress}%`);
        }
      );

      setComposedVideoUri(result.uri);
      console.log("Video composition successful:", result.uri);
    } catch (error) {
      console.error("Error composing video:", error);
      Alert.alert("Composition Error", `Failed to compose video: ${error}`);
    } finally {
      setIsComposingVideo(false);
    }
  }

  function resetOrchestration() {
    void audioRecorder.stop().catch(() => undefined);
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
    setCameraVideoUri(null);
    setComposedVideoUri(null);
    cameraRecordingPromiseRef.current = null;
    hasSeparateAudioRecordingRef.current = false;
    isCameraReadyRef.current = false;
    cameraReadyAtMsRef.current = 0;
    setIsCameraReady(false);
    cameraReadyResolverRef.current = null;
    challengeVideoPlayer.pause();
    challengeVideoPlayer.muted = false;
    challengeVideoPlayer.currentTime = 0;
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    previewSoundRef.current?.remove();
    previewSoundRef.current = null;
    setPreviewReady(false);
  }

  async function startAutoRecordingFromBeginning() {
    void audioRecorder.stop().catch(() => undefined);
    segmentUrisRef.current = [];
    currentPeriodIndexRef.current = 0;
    setCurrentPeriodIndex(0);
    setSegmentCount(0);
    setIsMuted(false);
    setStudentVideoUri(null);
    setCameraVideoUri(null);
    cameraVideoUriRef.current = null;
    setComposedVideoUri(null);
    previewSoundRef.current?.remove();
    previewSoundRef.current = null;
    setPreviewReady(false);
    challengeVideoPlayer.pause();
    challengeVideoPlayer.muted = false;
    challengeVideoPlayer.currentTime = 0;

    recordingArmedRef.current = true;
    setIsRecordingArmed(true);
    orchestrateStateRef.current = "duetting";
    setOrchestrateState("duetting");

    // const ready = await waitForCameraReady();
    // if (!ready) {
    //   recordingArmedRef.current = false;
    //   setIsRecordingArmed(false);
    //   Alert.alert("Camera Not Ready", "Camera is still preparing. Please wait a moment and tap Record again.");
    //   return;
    // }

    const elapsedSinceReady = Date.now() - cameraReadyAtMsRef.current;
    const warmupMs = Math.max(0, 300 - elapsedSinceReady);
    if (warmupMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, warmupMs));
    }

    try {
      if (cameraRef.current?.recordAsync) {
        const durationSeconds = Math.max(
          1,
          Math.ceil(
            (videoDurationMs || Math.round(challengeVideoPlayer.duration * 1000) || 60000) / 1000
          )
        );

        const startCameraRecording = () => Promise.resolve().then(() => {
          if (!cameraRef.current?.recordAsync) {
            throw new Error("Camera not available for recording");
          }

          return cameraRef.current.recordAsync({
            maxDuration: durationSeconds
          }) as Promise<{ uri: string }>;
        });

        let cameraRecordingPromise = startCameraRecording();
        cameraRecordingPromise = cameraRecordingPromise.catch(async (error: any) => {
          const message = String(error?.message || "");
          const isNotReady = message.includes("CameraOutputNotReadyException") || message.includes("Camera is not ready yet");
          if (!isNotReady) {
            throw error;
          }

          const becameReady = await waitForCameraReady(2000);
          if (!becameReady) {
            throw error;
          }

          await new Promise<void>((resolve) => setTimeout(resolve, 250));

          return startCameraRecording();
        });

        cameraRecordingPromiseRef.current = cameraRecordingPromise;

        if (cameraRecordingPromise) {
          cameraRecordingPromise.then((video) => {
            if (video?.uri) {
              cameraVideoUriRef.current = video.uri;
              setCameraVideoUri(video.uri);
              setStudentVideoUri(video.uri);
            }
          }).catch((error) => {
            console.error("Camera recording error:", error);
            recordingArmedRef.current = false;
            setIsRecordingArmed(false);
            orchestrateStateRef.current = "duetting";
            setOrchestrateState("duetting");
            Alert.alert("Camera Recording Error", "Camera failed to start recording. Please try again.");
          }).finally(() => {
            cameraRecordingPromiseRef.current = null;
          });
        }
      }
    } catch (error) {
      console.error("Error starting camera recording:", error);
    }

    // const didStart = await startPeriodRecording();
    // if (!didStart) {
    //   recordingArmedRef.current = false;
    //   setIsRecordingArmed(false);
    //   if (cameraRef.current?.stopRecording) {
    //     try {
    //       await cameraRef.current.stopRecording();
    //     } catch {
    //       // ignore
    //     }
    //   }
    //   return;
    // }

    challengeVideoPlayer.currentTime = 0;
    challengeVideoPlayer.play();
  }

  async function cancelAutoRecording() {
    resetOrchestration();
    challengeVideoPlayer.pause();
  }

  async function seekTo(targetMs: number) {
    if (videoDurationMs <= 0) {
      return;
    }
    const next = Math.max(0, Math.min(targetMs, videoDurationMs));
    challengeVideoPlayer.currentTime = next / 1000;
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

  async function syncPreviewToVideo(positionMs: number, isPlaying: boolean, didJustFinish: boolean) {
    const sound = previewSoundRef.current;
    if (!sound || previewSyncBusyRef.current) return;

    previewSyncBusyRef.current = true;
    try {
      const drift = Math.abs(Math.round(sound.currentTime * 1000) - positionMs);
      if (drift > 250) {
        await sound.seekTo(positionMs / 1000);
      }
      if (didJustFinish) {
        sound.pause();
        await sound.seekTo(0);
        return;
      }
      if (isPlaying && !sound.playing) sound.play();
      else if (!isPlaying && sound.playing) sound.pause();
    } finally {
      previewSyncBusyRef.current = false;
    }
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
      const sound = createAudioPlayer({ uri: segmentUrisRef.current[0] }, { keepAudioSessionActive: true });
      await sound.seekTo(0);
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

    await sound.seekTo(0);
    challengeVideoPlayer.currentTime = 0;
    challengeVideoPlayer.play();
    sound.play();
  }

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
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(1);
          resolve();
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
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
      for (let index = 0; index < segments.length; index++) {
        const uploadData = await api("/api/submissions/upload-url", {
          method: "POST",
          body: JSON.stringify({ fileName: fileNameFromUri(segments[index]), contentType, fileType: "answer" })
        });
        await uploadWithProgress(segments[index], uploadData.uploadUrl, contentType, (progress) => {
          setUploadProgress(index * step + progress * step);
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

  function formatMs(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function periodStatusLabel() {
    const periods = challenge?.answerPeriods ?? [];
    if (orchestrateState === "done") return "All answer periods recorded ✓";
    if (orchestrateState === "recording") {
      return "🎙 Recording in progress. Speak during the highlighted answer periods.";
    }
    if (!isRecordingArmed) {
      return "Press Record Your Answer to restart from the beginning and auto-record answer periods.";
    }
    const period = periods[currentPeriodIndex];
    return `▶ Recording armed — period ${currentPeriodIndex + 1} starts at ${formatMs(period?.startMs ?? 0)}`;
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

            {orchestrateState === "duetting" || orchestrateState === "recording" ? (
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
                      height: 320,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: "#000000"
                    }}
                  >
                    <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" onCameraReady={onCameraReady} />
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
                          {orchestrateState === "recording" ? "Recording" : isCameraReady ? "Ready" : "Loading"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                      <VideoView
                        player={challengeVideoPlayer}
                        style={{ flex: 1 }}
                        contentFit="cover"
                        nativeControls={false}
                        surfaceType="textureView"
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
                {cameraPermission && orchestrateState === "duetting" ? (
                  <View style={{ gap: 8 }}>
                    <Pressable
                      style={styles.button}
                      onPress={startAutoRecordingFromBeginning}
                      disabled={loading || !isCameraReady}
                    >
                      <Text style={styles.buttonText}>{isCameraReady ? "⏺ Record Duet" : "Preparing Camera..."}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.buttonSecondary}
                      onPress={cancelDuetting}
                      disabled={loading}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : null}

                {cameraPermission && orchestrateState === "recording" ? (
                  <View style={{ gap: 8 }}>
                    <Pressable style={[styles.button, { opacity: 0.7 }]} disabled>
                      <Text style={styles.buttonText}>Recording…</Text>
                    </Pressable>
                    <Pressable
                      style={styles.buttonSecondary}
                      onPress={cancelAutoRecording}
                      disabled={loading}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel Recording</Text>
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
              <View>
                <VideoView
                  player={challengeVideoPlayer}
                  style={styles.videoContainer}
                  contentFit="contain"
                  nativeControls
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
                      ? challenge.answerPeriods.map((period, index) => {
                          const leftPct = (period.startMs / videoDurationMs) * 100;
                          const widthPct = Math.max(((period.endMs - period.startMs) / videoDurationMs) * 100, 0.75);
                          return (
                            <View
                              key={`${period.startMs}-${period.endMs}-${index}`}
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

                {orchestrateState === "idle" ? (
                  <Pressable
                    style={[styles.button, { marginTop: 10 }]}
                    onPress={startDuetting}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>Duet</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {hasPeriods ? (
              <View style={{ marginTop: 14, gap: 12 }}>
                <Text style={styles.sectionTitle}>Auto-Recording</Text>

                <View
                  style={{
                    borderRadius: 10,
                    padding: 12,
                    backgroundColor: orchestrateState === "recording"
                      ? "rgba(239,68,68,0.1)"
                      : orchestrateState === "done"
                        ? "rgba(34,197,94,0.1)"
                        : "#f0f9ff"
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 14,
                      color: orchestrateState === "recording"
                        ? "#ef4444"
                        : orchestrateState === "done"
                          ? "#16a34a"
                          : "#0369a1"
                    }}
                  >
                    {periodStatusLabel()}
                  </Text>
                </View>

                <View style={{ gap: 6 }}>
                  {challenge.answerPeriods.map((period, index) => {
                    const isDone = orchestrateState === "done" || index < currentPeriodIndex;
                    const isActive =
                      orchestrateState === "recording" &&
                      index === currentPeriodIndex &&
                      videoPositionMs >= period.startMs &&
                      videoPositionMs < period.endMs;
                    return (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          backgroundColor: isActive ? "rgba(239,68,68,0.08)" : isDone ? "rgba(34,197,94,0.08)" : "#f8fafc",
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: isActive ? "#ef4444" : isDone ? "#86efac" : "#dbe4ef"
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{isActive ? "🎙" : isDone ? "✅" : "○"}</Text>
                        <Text style={{ flex: 1, color: "#0f172a", fontWeight: "600", fontSize: 13 }}>
                          Period {index + 1}: {formatMs(period.startMs)} → {formatMs(period.endMs)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {orchestrateState === "done" ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.cardDark}>
                      <Text style={styles.title}>✓ {segmentCount} segment{segmentCount !== 1 ? "s" : ""} recorded</Text>
                      <Text style={styles.status}>Merged duet is generated automatically after recording. Preview below, then submit.</Text>
                    </View>

                    {composedVideoUri ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.sectionTitle}>Merged Duet Result</Text>
                        <VideoView
                          player={mergedDuetPlayer}
                          style={styles.videoContainer}
                          contentFit="contain"
                          nativeControls
                        />
                        <Text style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>
                          This merged video includes your answer audio and the original challenge audio.
                        </Text>
                      </View>
                    ) : null}

                    {!composedVideoUri && previewStudentUri ? (
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
                          <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                            <VideoView
                              player={previewChallengePlayer}
                              style={{ flex: 1 }}
                              contentFit="cover"
                              nativeControls={false}
                              surfaceType="textureView"
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

                          <View style={{ flex: 1, backgroundColor: "#1e293b", position: "relative" }}>
                            <VideoView
                              player={studentPreviewPlayer}
                              style={{ flex: 1 }}
                              contentFit="cover"
                              nativeControls={false}
                              surfaceType="textureView"
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
                          Your merged duet video is generated automatically after recording finishes
                        </Text>
                      </View>
                    ) : null}

                    {isComposingVideo ? (
                      <Text style={styles.status}>Preparing duet preview video...</Text>
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

            {challenge.teacher?.id ? (
              <Pressable
                onPress={() => nav.navigate("TeacherDetail", { teacherId: challenge.teacher?.id })}
                style={[styles.card, { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 }]}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

