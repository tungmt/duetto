import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, LayoutChangeEvent, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";

type ChallengeDetailNavigationProp = NativeStackNavigationProp<any, "ChallengeDetail">;
type ChallengeDetailRoute = { params?: { challengeId?: string } };
type DetailTab = "general" | "periods" | "answers";

type Submission = {
  id: string;
  status: string;
  score: number | null;
  answerMediaUrl: string;
  student?: { id: string; name: string; email: string };
  createdAt: string;
};

type AnswerPeriod = { startMs: number; endMs: number; label?: string };

type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sourceVideoUrl: string;
  answerPeriods: AnswerPeriod[];
  submissions: Submission[];
};

const MIN_PERIOD_MS = 500;

function getStatusChipColors(status: Challenge["status"]) {
  if (status === "PUBLISHED") {
    return { background: "#dcfce7", text: "#166534" };
  }
  if (status === "DRAFT") {
    return { background: "#fef9c3", text: "#854d0e" };
  }
  return { background: "#e2e8f0", text: "#334155" };
}

export default function ChallengeDetailScreen() {
  const navigation = useNavigation<ChallengeDetailNavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const challengeId = ((route as ChallengeDetailRoute).params?.challengeId ?? "").trim();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("general");

  const videoRef = useRef<Video | null>(null);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoDurationMs, setVideoDurationMs] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [periods, setPeriods] = useState<AnswerPeriod[]>([]);
  const [pendingStartMs, setPendingStartMs] = useState<number | null>(null);
  const [savingPeriods, setSavingPeriods] = useState(false);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  const leftDragStartMsRef = useRef(0);
  const rightDragStartMsRef = useRef(0);

  const sortedSubmissions = useMemo(() => {
    return [...(challenge?.submissions ?? [])].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [challenge?.submissions]);

  const selectedPeriod = selectedPeriodIndex !== null ? periods[selectedPeriodIndex] : null;
  const hasDuration = videoDurationMs > 0;

  const loadChallenge = useCallback(async () => {
    if (!challengeId) {
      Alert.alert("Missing challenge", "Challenge ID is missing.");
      return;
    }

    setLoading(true);
    try {
      const data = await api(`/api/videos/${challengeId}`);
      const nextChallenge = data.challenge as Challenge;
      const incomingPeriods = Array.isArray(nextChallenge.answerPeriods) ? nextChallenge.answerPeriods : [];
      setChallenge(nextChallenge);
      setTitle(nextChallenge.title ?? "");
      setDescription(nextChallenge.description ?? "");
      setPeriods(incomingPeriods);
      setPendingStartMs(null);
      setSelectedPeriodIndex(incomingPeriods.length > 0 ? 0 : null);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not load challenge");
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useFocusEffect(
    useCallback(() => {
      loadChallenge();
    }, [loadChallenge])
  );

  async function saveInfo() {
    if (!challengeId) {
      return;
    }
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter challenge title.");
      return;
    }

    setSaving(true);
    try {
      await api(`/api/videos/${challengeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim()
        })
      });
      Alert.alert("Saved", "Challenge information updated.");
      await loadChallenge();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not update challenge");
    } finally {
      setSaving(false);
    }
  }

  async function setPublishStatus(nextStatus: "DRAFT" | "PUBLISHED") {
    if (!challengeId) {
      return;
    }

    setSaving(true);
    try {
      await api(`/api/videos/${challengeId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      Alert.alert("Updated", nextStatus === "PUBLISHED" ? "Challenge published." : "Challenge moved to draft.");
      await loadChallenge();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not update challenge status");
    } finally {
      setSaving(false);
    }
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
    if (!videoRef.current || !hasDuration) {
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
    if (!hasDuration || timelineWidth <= 0) {
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

    setPeriods((prev) => {
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
      leftDragStartMsRef.current = periods[selectedPeriodIndex]?.startMs ?? 0;
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
      rightDragStartMsRef.current = periods[selectedPeriodIndex]?.endMs ?? 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (selectedPeriodIndex === null || timelineWidth <= 0 || !hasDuration) {
        return;
      }
      const deltaMs = (gestureState.dx / timelineWidth) * videoDurationMs;
      updatePeriodEdge(selectedPeriodIndex, "end", rightDragStartMsRef.current + deltaMs);
    }
  });

  function handleAnswerPeriodButton() {
    if (pendingStartMs === null) {
      setPendingStartMs(videoPositionMs);
      return;
    }

    if (videoPositionMs <= pendingStartMs) {
      Alert.alert("Invalid range", "Stop time must be after start time.");
      return;
    }

    const newPeriod: AnswerPeriod = {
      startMs: pendingStartMs,
      endMs: videoPositionMs
    };

    setPeriods((prev) => {
      const next = [...prev, newPeriod].sort((a, b) => a.startMs - b.startMs);
      setSelectedPeriodIndex(next.length - 1);
      return next;
    });
    setPendingStartMs(null);
  }

  function removePeriod(index: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== index));
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

  async function saveAnswerPeriods() {
    if (!challengeId) {
      return;
    }

    setSavingPeriods(true);
    try {
      await api(`/api/videos/${challengeId}`, {
        method: "PATCH",
        body: JSON.stringify({ answerPeriods: periods })
      });
      Alert.alert("Saved", "Answer periods saved.");
      await loadChallenge();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not save periods");
    } finally {
      setSavingPeriods(false);
    }
  }

  const progressPct = hasDuration ? Math.max(0, Math.min((videoPositionMs / videoDurationMs) * 100, 100)) : 0;
  const selectedStartPx = selectedPeriod && hasDuration && timelineWidth > 0
    ? Math.round((selectedPeriod.startMs / videoDurationMs) * timelineWidth)
    : 0;
  const selectedEndPx = selectedPeriod && hasDuration && timelineWidth > 0
    ? Math.round((selectedPeriod.endMs / videoDurationMs) * timelineWidth)
    : 0;

  return (
    <View style={localStyles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={localStyles.content} keyboardShouldPersistTaps="handled">
          <View
            style={[
              localStyles.heroCard,
              {
                marginHorizontal: -16,
                marginTop: -16,
                paddingTop: insets.top + 16,
                paddingHorizontal: 16,
                paddingBottom: 16,
                backgroundColor: "#0f2742"
              }
            ]}
          >
            <View style={localStyles.heroTopRow}>
              <Pressable style={localStyles.backButton} onPress={() => navigation.goBack()}>
                <Text style={localStyles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={localStyles.heroTitle}>Manage Challenge</Text>
            </View>
            <Text style={localStyles.heroEyebrow}>Challenge Workspace</Text>
            <Text style={localStyles.heroSubtitle}>Edit video details, answer periods, and submissions.</Text>
          </View>

          {loading ? (
            <View style={localStyles.centerState}>
              <Text style={localStyles.centerStateText}>Loading challenge...</Text>
            </View>
          ) : !challenge ? (
            <View style={localStyles.centerState}>
              <Text style={localStyles.centerStateText}>Challenge not found.</Text>
            </View>
          ) : (
            <>
              <View style={localStyles.summaryCard}>
                <View style={localStyles.summaryHead}>
                  <Text style={localStyles.summaryTitle}>{challenge.title}</Text>
                  <View style={[localStyles.statusChip, { backgroundColor: getStatusChipColors(challenge.status).background }]}>
                    <Text style={[localStyles.statusChipText, { color: getStatusChipColors(challenge.status).text }]}>{challenge.status}</Text>
                  </View>
                </View>
                <Text style={localStyles.summaryMeta}>Submissions: {challenge.submissions?.length ?? 0}</Text>
              </View>

              <View style={localStyles.tabsWrap}>
                <Pressable
                  style={[localStyles.tabButton, activeTab === "general" && localStyles.tabButtonActive]}
                  onPress={() => setActiveTab("general")}
                >
                  <Text style={[localStyles.tabButtonText, activeTab === "general" && localStyles.tabButtonTextActive]}>Video & Info</Text>
                </Pressable>
                <Pressable
                  style={[localStyles.tabButton, activeTab === "periods" && localStyles.tabButtonActive]}
                  onPress={() => setActiveTab("periods")}
                >
                  <Text style={[localStyles.tabButtonText, activeTab === "periods" && localStyles.tabButtonTextActive]}>Answer Periods</Text>
                </Pressable>
                <Pressable
                  style={[localStyles.tabButton, activeTab === "answers" && localStyles.tabButtonActive]}
                  onPress={() => setActiveTab("answers")}
                >
                  <Text style={[localStyles.tabButtonText, activeTab === "answers" && localStyles.tabButtonTextActive]}>Answer List</Text>
                </Pressable>
              </View>

              {activeTab === "general" ? (
                <View style={localStyles.panelCard}>
                  <Text style={localStyles.blockTitle}>Challenge Video</Text>

                  <View style={localStyles.videoFrame}>
                    <Video
                      ref={(r) => {
                        videoRef.current = r;
                      }}
                      source={{ uri: challenge.sourceVideoUrl }}
                      style={localStyles.video}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={false}
                      onPlaybackStatusUpdate={onVideoStatusUpdate}
                    />
                  </View>

                  <View style={localStyles.playerControlsRow}>
                    <Pressable style={localStyles.controlButton} onPress={() => seekBy(-10000)}>
                      <Text style={localStyles.controlButtonText}>-10s</Text>
                    </Pressable>
                    <Pressable style={[localStyles.controlButton, localStyles.playButton]} onPress={togglePlayback}>
                      <Text style={localStyles.controlButtonText}>{isVideoPlaying ? "Pause" : "Play"}</Text>
                    </Pressable>
                    <Pressable style={localStyles.controlButton} onPress={() => seekBy(10000)}>
                      <Text style={localStyles.controlButtonText}>+10s</Text>
                    </Pressable>
                  </View>

                  <View style={localStyles.timeRow}>
                    <Text style={localStyles.timeText}>{formatMs(videoPositionMs)}</Text>
                    <Text style={localStyles.timeText}>{formatMs(videoDurationMs)}</Text>
                  </View>

                  <Pressable style={localStyles.timelineTrack} onLayout={onTimelineLayout} onPress={onTimelinePress}>
                    <View style={[localStyles.timelineProgress, { width: `${progressPct}%` }]} />
                  </Pressable>

                  <View>
                    <Text style={localStyles.label}>Title</Text>
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      editable={!saving}
                      placeholder="Challenge title"
                      placeholderTextColor="#9ca3af"
                      style={localStyles.input}
                    />
                  </View>

                  <View>
                    <Text style={localStyles.label}>Description</Text>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      editable={!saving}
                      multiline
                      numberOfLines={3}
                      placeholder="Challenge description"
                      placeholderTextColor="#9ca3af"
                      style={[localStyles.input, localStyles.inputMultiline]}
                    />
                  </View>

                  <Pressable style={[localStyles.primaryButton, saving && localStyles.buttonDisabled]} onPress={saveInfo} disabled={saving}>
                    <Text style={localStyles.primaryButtonText}>{saving ? "Saving..." : "Save Challenge Info"}</Text>
                  </Pressable>

                  {challenge.status !== "PUBLISHED" ? (
                    <Pressable
                      style={[localStyles.secondaryButton, saving && localStyles.buttonDisabled]}
                      onPress={() => setPublishStatus("PUBLISHED")}
                      disabled={saving}
                    >
                      <Text style={localStyles.secondaryButtonText}>Publish Challenge</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[localStyles.secondaryButton, saving && localStyles.buttonDisabled]}
                      onPress={() => setPublishStatus("DRAFT")}
                      disabled={saving}
                    >
                      <Text style={localStyles.secondaryButtonText}>Move Back To Draft</Text>
                    </Pressable>
                  )}
                </View>
              ) : activeTab === "periods" ? (
                <View style={localStyles.panelCard}>
                  <Text style={localStyles.blockTitle}>Answer Period Editor</Text>
                  <Text style={localStyles.helpText}>
                    Use the custom player below. Press Start Answer Period, then Stop Answer Period to create one range. Select a range and drag its handles on the timeline to fine-tune.
                  </Text>

                  <View style={localStyles.videoFrame}>
                    <Video
                      ref={(r) => {
                        videoRef.current = r;
                      }}
                      source={{ uri: challenge.sourceVideoUrl }}
                      style={localStyles.video}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={false}
                      onPlaybackStatusUpdate={onVideoStatusUpdate}
                    />
                  </View>

                  <View style={localStyles.playerControlsRow}>
                    <Pressable style={localStyles.controlButton} onPress={() => seekBy(-10000)}>
                      <Text style={localStyles.controlButtonText}>-10s</Text>
                    </Pressable>
                    <Pressable style={[localStyles.controlButton, localStyles.playButton]} onPress={togglePlayback}>
                      <Text style={localStyles.controlButtonText}>{isVideoPlaying ? "Pause" : "Play"}</Text>
                    </Pressable>
                    <Pressable style={localStyles.controlButton} onPress={() => seekBy(10000)}>
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
                      ? periods.map((p, i) => {
                        const leftPct = (p.startMs / videoDurationMs) * 100;
                        const widthPct = Math.max(((p.endMs - p.startMs) / videoDurationMs) * 100, 0.75);
                        const selected = i === selectedPeriodIndex;
                        return (
                          <Pressable
                            key={`${p.startMs}-${p.endMs}-${i}`}
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

                  <View style={localStyles.periodActionsRow}>
                    <Pressable
                      style={[localStyles.primaryButton, { flex: 1, backgroundColor: pendingStartMs === null ? "#0369a1" : "#64748b" }]}
                      onPress={handleAnswerPeriodButton}
                    >
                      <Text style={localStyles.primaryButtonText}>
                        {pendingStartMs === null ? "Start Answer Period" : "Stop Answer Period"}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={localStyles.pendingBadge}>
                    <Text style={localStyles.pendingBadgeText}>
                      {pendingStartMs === null ? "Ready to mark a new period." : `Start marked at ${formatMs(pendingStartMs)}. Move video and press Stop Answer Period.`}
                    </Text>
                  </View>

                  {periods.length > 0 ? (
                    <View style={{ gap: 8 }}>
                      <Text style={[localStyles.label, { marginBottom: 0 }]}>Defined Periods</Text>
                      {periods.map((p, i) => (
                        <Pressable
                          key={`${p.startMs}-${p.endMs}-${i}`}
                          style={[
                            localStyles.periodRow,
                            i === selectedPeriodIndex && localStyles.periodRowSelected
                          ]}
                          onPress={() => setSelectedPeriodIndex(i)}
                        >
                          <Text style={localStyles.periodRowText}>
                            {i + 1}. {formatMs(p.startMs)} {">"} {formatMs(p.endMs)}
                          </Text>
                          <Pressable onPress={() => removePeriod(i)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: "#ef4444", fontWeight: "800", fontSize: 14 }}>X</Text>
                          </Pressable>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={localStyles.emptyPeriodsCard}>
                      <Text style={localStyles.emptyPeriodsText}>No periods defined yet.</Text>
                    </View>
                  )}

                  <Pressable
                    style={[localStyles.primaryButton, savingPeriods && localStyles.buttonDisabled]}
                    onPress={saveAnswerPeriods}
                    disabled={savingPeriods}
                  >
                    <Text style={localStyles.primaryButtonText}>{savingPeriods ? "Saving..." : "Save Answer Periods"}</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text style={localStyles.sectionTitle}>Answer Videos</Text>
                  {sortedSubmissions.length === 0 ? (
                    <View style={localStyles.answerRow}>
                      <Text style={localStyles.answerMeta}>No answers submitted yet.</Text>
                    </View>
                  ) : (
                    sortedSubmissions.map((submission) => (
                      <Pressable
                        key={submission.id}
                        style={localStyles.answerRow}
                        onPress={() =>
                          navigation.navigate("SubmissionReview", {
                            challengeId: challenge.id,
                            submissionId: submission.id
                          })
                        }
                      >
                        <Text style={localStyles.answerName}>{submission.student?.name ?? "Student"}</Text>
                        <Text style={localStyles.answerMeta}>Status: {submission.status}</Text>
                        <Text style={localStyles.answerMeta}>Score: {submission.score ?? "Not graded"}</Text>
                        <Text style={localStyles.answerLink}>Open answer review {">"}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef3f8"
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 36
  },
  heroCard: {
    backgroundColor: "#0f2742",
    borderRadius: 20,
    padding: 18,
    gap: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4
  },
  backButton: {
    backgroundColor: "rgba(147, 197, 253, 0.2)",
    borderColor: "rgba(147, 197, 253, 0.5)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  backButtonText: {
    color: "#dbeafe",
    fontSize: 13,
    fontWeight: "700"
  },
  heroEyebrow: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  heroTitle: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dbe4ef"
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  summaryTitle: {
    flex: 1,
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "800"
  },
  summaryMeta: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500"
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "800"
  },
  tabsWrap: {
    backgroundColor: "#dbe4ef",
    borderRadius: 14,
    padding: 4,
    flexDirection: "row",
    gap: 6
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  tabButtonActive: {
    backgroundColor: "#ffffff"
  },
  tabButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700"
  },
  tabButtonTextActive: {
    color: "#0f172a"
  },
  panelCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbe4ef"
  },
  blockTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800"
  },
  helpText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19
  },
  videoFrame: {
    backgroundColor: "#0b1220",
    borderRadius: 14,
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
  playerControlsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
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
    alignItems: "center"
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
    justifyContent: "center"
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
  periodActionsRow: {
    flexDirection: "row",
    gap: 10
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
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#dbe4ef"
  },
  periodRowSelected: {
    borderColor: "#0369a1",
    backgroundColor: "#eff6ff"
  },
  periodRowText: {
    flex: 1,
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 14
  },
  emptyPeriodsCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbe4ef"
  },
  emptyPeriodsText: {
    color: "#94a3b8",
    fontSize: 14
  },
  label: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ef",
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "500",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  inputMultiline: {
    minHeight: 98,
    textAlignVertical: "top"
  },
  primaryButton: {
    backgroundColor: "#0369a1",
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
    marginVertical: 6
  },
  answerRow: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderColor: "#dbe4ef",
    borderWidth: 1,
    marginTop: 10
  },
  answerName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800"
  },
  answerMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 3,
    fontWeight: "500"
  },
  answerLink: {
    color: "#0c4a6e",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10
  },
  centerState: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ef",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 26,
    alignItems: "center"
  },
  centerStateText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600"
  }
});
