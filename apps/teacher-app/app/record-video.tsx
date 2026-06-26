import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api";
import { styles } from "../src/styles";

type RecordVideoScreenNavigationProp = NativeStackNavigationProp<any, "RecordVideo">;
type ChallengeStatus = "DRAFT" | "PUBLISHED";
type AnswerPeriod = {
  id: string;
  startMs: number;
  endMs: number;
};

const MIN_PERIOD_MS = 500;

const localStyles = StyleSheet.create({
  previewCard: {
    backgroundColor: "#0b1220",
    borderRadius: 16,
    overflow: "hidden",
    width: "68%",
    minWidth: 220,
    maxWidth: 320,
    aspectRatio: 9 / 16,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  video: {
    width: "100%",
    height: "100%"
  },
  emptyPreview: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a"
  },
  emptyPreviewText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center"
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12
  },
  loadingText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 8
  },
  playerControlsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 10
  },
  controlButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#0f2742",
    alignItems: "center",
    justifyContent: "center"
  },
  playButton: {
    backgroundColor: "#0369a1"
  },
  controlButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  timeText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700"
  },
  timelineTrack: {
    position: "relative",
    height: 26,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
    justifyContent: "center",
    marginTop: 8
  },
  timelineProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#7dd3fc"
  },
  periodBar: {
    position: "absolute",
    top: 6,
    bottom: 6,
    borderRadius: 999,
    backgroundColor: "rgba(3, 105, 161, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(3, 105, 161, 0.7)"
  },
  periodBarSelected: {
    backgroundColor: "rgba(2, 132, 199, 0.5)",
    borderColor: "#0369a1"
  },
  dragHandle: {
    position: "absolute",
    top: 2,
    width: 12,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#0369a1"
  },
  uploadProgressWrap: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    padding: 12,
    gap: 8
  },
  uploadProgressLabel: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600"
  },
  uploadProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden"
  },
  uploadProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563eb"
  },
  answerPeriodCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ef",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  answerPeriodTime: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600"
  },
  answerPeriodCardSelected: {
    borderColor: "#0369a1",
    backgroundColor: "#eff6ff"
  },
  answerPeriodAddButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  answerPeriodAddButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700"
  },
  answerPeriodEmpty: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500"
  },
  pendingBadge: {
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#bae6fd"
  },
  pendingBadgeText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "700"
  }
});

export default function RecordVideoScreen() {
  const navigation = useNavigation<RecordVideoScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [videoUri, setVideoUri] = useState("");
  const [videoFileName, setVideoFileName] = useState("challenge-video.mp4");
  const [videoContentType, setVideoContentType] = useState("video/mp4");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submittingAs, setSubmittingAs] = useState<ChallengeStatus | null>(null);
  const [answerPeriods, setAnswerPeriods] = useState<AnswerPeriod[]>([]);
  const videoRef = useRef<Video | null>(null);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoDurationMs, setVideoDurationMs] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [pendingStartMs, setPendingStartMs] = useState<number | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number | null>(null);

  const leftDragStartMsRef = useRef(0);
  const rightDragStartMsRef = useRef(0);
  const selectedPeriod = selectedPeriodIndex !== null ? answerPeriods[selectedPeriodIndex] : null;

  async function selectVideo() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow access to your photo library to select videos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        setVideoUri(asset.uri);
        setVideoFileName(asset.fileName || `challenge-${Date.now()}.mp4`);
        setVideoContentType(asset.mimeType || "video/mp4");
        setVideoLoading(true);
        setUploadProgress(null);
        setAnswerPeriods([]);
        setVideoPositionMs(0);
        setVideoDurationMs(0);
        setIsVideoPlaying(false);
        setPendingStartMs(null);
        setSelectedPeriodIndex(null);
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not select video");
    }
  }

  async function uploadVideoWithProgress(params: {
    uploadUrl: string;
    fileUri: string;
    contentType: string;
  }) {
    const fileResponse = await fetch(params.fileUri);
    const fileBlob = await fileResponse.blob();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", params.uploadUrl);
      xhr.setRequestHeader("Content-Type", params.contentType);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        setUploadProgress(percent);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          resolve();
          return;
        }

        reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error while uploading video."));
      xhr.onabort = () => reject(new Error("Video upload was cancelled."));

      xhr.send(fileBlob);
    });
  }

  function formatMs(ms: number) {
    const totalSecs = Math.floor(Math.max(ms, 0) / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function onVideoStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) {
      return;
    }
    setVideoPositionMs(status.positionMillis ?? 0);
    setVideoDurationMs(status.durationMillis ?? 0);
    setIsVideoPlaying(status.isPlaying ?? false);
  }

  async function seekTo(targetMs: number) {
    if (!videoRef.current || videoDurationMs <= 0) {
      return;
    }
    const next = Math.max(0, Math.min(targetMs, videoDurationMs));
    await videoRef.current.setPositionAsync(next);
  }

  async function seekBy(deltaMs: number) {
    await seekTo(videoPositionMs + deltaMs);
  }

  async function togglePlayback() {
    if (!videoRef.current) {
      return;
    }

    if (isVideoPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
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

  function updatePeriodEdge(index: number, edge: "start" | "end", nextMs: number) {
    if (!hasDuration) {
      return;
    }

    setAnswerPeriods((prev) => {
      const current = prev[index];
      if (!current) {
        return prev;
      }

      const maxDuration = Math.max(videoDurationMs, 0);
      let start = current.startMs;
      let end = current.endMs;

      if (edge === "start") {
        start = Math.max(0, Math.min(nextMs, end - MIN_PERIOD_MS));
      } else {
        end = Math.min(maxDuration, Math.max(nextMs, start + MIN_PERIOD_MS));
      }

      const next = [...prev];
      next[index] = { ...current, startMs: start, endMs: end };
      return next;
    });
  }

  const leftHandleResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => selectedPeriodIndex !== null,
    onMoveShouldSetPanResponder: () => selectedPeriodIndex !== null,
    onPanResponderGrant: () => {
      if (selectedPeriodIndex === null) {
        return;
      }
      leftDragStartMsRef.current = answerPeriods[selectedPeriodIndex]?.startMs ?? 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (selectedPeriodIndex === null || timelineWidth <= 0 || !hasDuration) {
        return;
      }
      const deltaMs = (gestureState.dx / timelineWidth) * videoDurationMs;
      updatePeriodEdge(selectedPeriodIndex, "start", leftDragStartMsRef.current + deltaMs);
    }
  });

  const rightHandleResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => selectedPeriodIndex !== null,
    onMoveShouldSetPanResponder: () => selectedPeriodIndex !== null,
    onPanResponderGrant: () => {
      if (selectedPeriodIndex === null) {
        return;
      }
      rightDragStartMsRef.current = answerPeriods[selectedPeriodIndex]?.endMs ?? 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (selectedPeriodIndex === null || timelineWidth <= 0 || !hasDuration) {
        return;
      }
      const deltaMs = (gestureState.dx / timelineWidth) * videoDurationMs;
      updatePeriodEdge(selectedPeriodIndex, "end", rightDragStartMsRef.current + deltaMs);
    }
  });

  function addAnswerPeriodFromPlayer() {
    if (videoDurationMs <= 0) {
      Alert.alert("Video not ready", "Wait for the video to load before adding periods.");
      return;
    }

    if (pendingStartMs === null) {
      setPendingStartMs(videoPositionMs);
      return;
    }

    if (videoPositionMs <= pendingStartMs) {
      Alert.alert("Invalid range", "Stop time must be after start time.");
      return;
    }

    const nextPeriod: AnswerPeriod = {
      id: Date.now().toString(),
      startMs: Math.max(0, Math.floor(pendingStartMs)),
      endMs: Math.max(1, Math.ceil(videoPositionMs))
    };

    if (nextPeriod.startMs >= nextPeriod.endMs) {
      Alert.alert("Invalid range", "Selected period is too short. Move a little forward before stopping.");
      return;
    }

    setAnswerPeriods((prev) => {
      const next = [...prev, nextPeriod];
      next.sort((a, b) => a.startMs - b.startMs);
      setSelectedPeriodIndex(next.findIndex((item) => item.id === nextPeriod.id));
      return next;
    });
    setPendingStartMs(null);
  }

  function removeAnswerPeriod(index: number) {
    setAnswerPeriods((prev) => prev.filter((_, i) => i !== index));
    setSelectedPeriodIndex((prev) => {
      if (prev === null) {
        return null;
      }
      if (prev === index) {
        return null;
      }
      return prev > index ? prev - 1 : prev;
    });
  }

  async function submitChallenge(status: ChallengeStatus) {
    if (!videoUri) {
      Alert.alert("Missing video", "Please select a video first.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a challenge title.");
      return;
    }

    setLoading(true);
    setSubmittingAs(status);
    setUploadProgress(0);
    try {
      const uploadInfo = await api("/api/videos/upload-url", {
        method: "POST",
        body: JSON.stringify({
          fileName: videoFileName,
          contentType: videoContentType,
          fileType: "source"
        })
      });

      await uploadVideoWithProgress({
        uploadUrl: uploadInfo.uploadUrl,
        fileUri: videoUri,
        contentType: videoContentType
      });

      await api("/api/videos", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          sourceVideoUrl: uploadInfo.publicUrl,
          status,
          answerPeriods: answerPeriods.map(p => ({
            startMs: p.startMs,
            endMs: p.endMs
          }))
        })
      });

      Alert.alert("Success", status === "PUBLISHED" ? "Challenge published!" : "Draft saved!");
      navigation.navigate("Dashboard");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not publish challenge");
    } finally {
      setSubmittingAs(null);
      setUploadProgress(null);
      setLoading(false);
    }
  }

  const hasDuration = videoDurationMs > 0;
  const progressPct = hasDuration ? Math.max(0, Math.min((videoPositionMs / videoDurationMs) * 100, 100)) : 0;
  const selectedStartPx = selectedPeriod && hasDuration && timelineWidth > 0
    ? Math.round((selectedPeriod.startMs / videoDurationMs) * timelineWidth)
    : 0;
  const selectedEndPx = selectedPeriod && hasDuration && timelineWidth > 0
    ? Math.round((selectedPeriod.endMs / videoDurationMs) * timelineWidth)
    : 0;

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: "#0f2742",
                  marginBottom: 16,
                  marginHorizontal: -20,
                  marginTop: -20,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 16
                }
              ]}
            >
              <View style={styles.heroTopRow}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
                  <Text style={styles.backButtonText}>
                    <Ionicons name="chevron-back" size={14} color="#dbeafe" /> Back
                  </Text>
                </Pressable>
                <Text style={styles.heroTitle}>Create Challenge</Text>
              </View>
              <Text style={styles.heroEyebrow}>Video Challenge</Text>
              <Text style={styles.heroSubtitle}>Select and preview your video</Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>Challenge Details</Text>
              <View style={styles.card}>
                <View>
                  <Text style={styles.title}>Challenge Title</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Scales Practice"
                    placeholderTextColor="#9ca3af"
                    editable={!loading}
                    style={styles.input}
                  />
                </View>

                <View>
                  <Text style={styles.title}>Description (Optional)</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add instructions or coaching notes for students"
                    placeholderTextColor="#9ca3af"
                    multiline
                    editable={!loading}
                    style={[styles.input, styles.inputMultiline]}
                  />
                </View>
              </View>
            </View>

            <View>
              <Text style={styles.sectionTitle}>Video</Text>
              <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={selectVideo} disabled={loading}>
                <Text style={styles.buttonText}>{videoUri ? "Change Video" : "Select Video from Library"}</Text>
              </Pressable>
            </View>

            <View style={localStyles.previewCard}>
              {videoUri ? (
                <>
                  <Video
                    ref={(r) => {
                      videoRef.current = r;
                    }}
                    source={{ uri: videoUri }}
                    style={localStyles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    progressUpdateIntervalMillis={500}
                    onPlaybackStatusUpdate={onVideoStatusUpdate}
                    onLoadStart={() => setVideoLoading(true)}
                    onLoad={() => setVideoLoading(false)}
                  />
                  {videoLoading && (
                    <View style={localStyles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={localStyles.loadingText}>Loading video...</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={localStyles.emptyPreview}>
                  <Text style={localStyles.emptyPreviewText}>No video selected</Text>
                </View>
              )}
            </View>

            {videoUri ? (
              <>
                <View style={localStyles.playerControlsRow}>
                  <Pressable style={localStyles.controlButton} onPress={() => seekBy(-10000)} disabled={!hasDuration || loading}>
                    <Text style={localStyles.controlButtonText}>-10s</Text>
                  </Pressable>
                  <Pressable
                    style={[localStyles.controlButton, localStyles.playButton]}
                    onPress={togglePlayback}
                    disabled={!hasDuration || loading}
                  >
                    <Text style={localStyles.controlButtonText}>{isVideoPlaying ? "Pause" : "Play"}</Text>
                  </Pressable>
                  <Pressable style={localStyles.controlButton} onPress={() => seekBy(10000)} disabled={!hasDuration || loading}>
                    <Text style={localStyles.controlButtonText}>+10s</Text>
                  </Pressable>
                </View>

                <View style={localStyles.timeRow}>
                  <Text style={localStyles.timeText}>{formatMs(videoPositionMs)}</Text>
                  <Text style={localStyles.timeText}>{formatMs(videoDurationMs)}</Text>
                </View>

                <Pressable style={localStyles.timelineTrack} onLayout={onTimelineLayout} onPress={onTimelinePress}>
                  <View style={[localStyles.timelineProgress, { width: `${progressPct}%` }]} />

                  {hasDuration
                    ? answerPeriods.map((period, i) => {
                        const leftPct = (period.startMs / videoDurationMs) * 100;
                        const widthPct = Math.max(((period.endMs - period.startMs) / videoDurationMs) * 100, 0.75);
                        const selected = i === selectedPeriodIndex;
                        return (
                          <Pressable
                            key={period.id}
                            style={[
                              localStyles.periodBar,
                              selected && localStyles.periodBarSelected,
                              { left: `${leftPct}%`, width: `${widthPct}%` }
                            ]}
                            onPress={() => setSelectedPeriodIndex(i)}
                          />
                        );
                      })
                    : null}

                  {selectedPeriod && hasDuration && timelineWidth > 0 ? (
                    <>
                      <View
                        style={[localStyles.dragHandle, { left: Math.max(0, Math.min(selectedStartPx - 6, timelineWidth - 12)) }]}
                        {...leftHandleResponder.panHandlers}
                      />
                      <View
                        style={[localStyles.dragHandle, { left: Math.max(0, Math.min(selectedEndPx - 6, timelineWidth - 12)) }]}
                        {...rightHandleResponder.panHandlers}
                      />
                    </>
                  ) : null}
                </Pressable>
              </>
            ) : null}

            <View>
              <Text style={styles.sectionTitle}>Answer Periods (Optional)</Text>
              <Text style={styles.subtitle}>Mark time ranges when students should answer</Text>
              <View style={styles.card}>
                <View style={{ gap: 12 }}>
                  <Pressable
                    style={[styles.button, (!videoUri || loading) && styles.buttonDisabled]}
                    onPress={addAnswerPeriodFromPlayer}
                    disabled={!videoUri || loading}
                  >
                    <View style={localStyles.answerPeriodAddButtonContent}>
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={localStyles.answerPeriodAddButtonText}>
                        {pendingStartMs === null ? "Start Answer Period" : "Stop Answer Period"}
                      </Text>
                    </View>
                  </Pressable>

                  <View style={localStyles.pendingBadge}>
                    <Text style={localStyles.pendingBadgeText}>
                      {pendingStartMs === null
                        ? "Move the player and tap Start Answer Period to mark the beginning."
                        : `Start marked at ${formatMs(pendingStartMs)}. Move ahead and tap Stop Answer Period.`}
                    </Text>
                  </View>

                  {answerPeriods.length === 0 ? (
                    <Text style={localStyles.answerPeriodEmpty}>No periods added yet.</Text>
                  ) : null}

                  {answerPeriods.length > 0 && (
                    <View style={{ gap: 8 }}>
                      {answerPeriods.map((period, i) => (
                        <Pressable
                          key={period.id}
                          style={[localStyles.answerPeriodCard, i === selectedPeriodIndex && localStyles.answerPeriodCardSelected]}
                          onPress={() => setSelectedPeriodIndex(i)}
                        >
                          <Text style={localStyles.answerPeriodTime}>
                            {i + 1}. {formatMs(period.startMs)} {">"} {formatMs(period.endMs)}
                          </Text>
                          <Pressable
                            onPress={() => removeAnswerPeriod(i)}
                            disabled={loading}
                            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                          >
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </Pressable>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {loading && uploadProgress !== null ? (
              <View style={localStyles.uploadProgressWrap}>
                <Text style={localStyles.uploadProgressLabel}>Uploading video: {uploadProgress}%</Text>
                <View style={localStyles.uploadProgressTrack}>
                  <View style={[localStyles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
                </View>
              </View>
            ) : null}

            <Pressable
              style={[styles.button, (!videoUri || loading) && styles.buttonDisabled]}
              onPress={() => submitChallenge("PUBLISHED")}
              disabled={!videoUri || loading}
            >
              <Text style={styles.buttonText}>
                {loading && submittingAs === "PUBLISHED" ? "Uploading and publishing..." : "Publish Challenge"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.buttonSecondary, (!videoUri || loading) && styles.buttonDisabled]}
              onPress={() => submitChallenge("DRAFT")}
              disabled={!videoUri || loading}
            >
              <Text style={styles.buttonSecondaryText}>
                {loading && submittingAs === "DRAFT" ? "Uploading and saving draft..." : "Save As Draft"}
              </Text>
            </Pressable>

            <Pressable style={[styles.buttonSecondary, loading && styles.buttonDisabled]} onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

