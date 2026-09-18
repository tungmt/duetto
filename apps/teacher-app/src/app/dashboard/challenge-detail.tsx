import { useEventListener } from "expo";
import { setAudioModeAsync } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  GestureResponderEvent,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

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

function getChallengeTone(status: Challenge["status"]): "cyan" | "neutral" | "pink" | "yellow" {
  if (status === "PUBLISHED") {
    return "cyan";
  }

  if (status === "DRAFT") {
    return "yellow";
  }

  return "neutral";
}

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

function formatStatusLabel(status?: string) {
  if (!status) {
    return "Unknown";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  const challengeSource = challenge?.sourceVideoUrl ?? null;
  const videoPlayer = useVideoPlayer(challengeSource, (player) => {
    player.timeUpdateEventInterval = 0.1;
    player.audioMixingMode = "auto";
  });

  const selectedPeriod = selectedPeriodIndex !== null ? periods[selectedPeriodIndex] : null;
  const hasDuration = videoDurationMs > 0;

  useEffect(() => {
    if (challengeSource) {
      return;
    }
    setVideoPositionMs(0);
    setVideoDurationMs(0);
    setIsVideoPlaying(false);
  }, [challengeSource]);

  useEventListener(videoPlayer, "sourceLoad", ({ duration }) => {
    setVideoPositionMs(0);
    setVideoDurationMs(Math.round(duration * 1000));
  });

  useEventListener(videoPlayer, "timeUpdate", ({ currentTime }) => {
    setVideoPositionMs(Math.round(currentTime * 1000));
    setVideoDurationMs(Math.round(videoPlayer.duration * 1000));
  });

  useEventListener(videoPlayer, "playingChange", ({ isPlaying }) => {
    setIsVideoPlaying(isPlaying);
  });

  useEventListener(videoPlayer, "playToEnd", () => {
    const durationMs = Math.round(videoPlayer.duration * 1000);
    setVideoPositionMs(durationMs);
    setVideoDurationMs(durationMs);
    setIsVideoPlaying(false);
  });

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
      void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
      loadChallenge();
      return () => {
        videoPlayer.pause();
      };
    }, [loadChallenge, videoPlayer])
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

  function seekTo(targetMs: number) {
    if (!hasDuration) {
      return;
    }
    const next = Math.max(0, Math.min(targetMs, videoDurationMs));
    videoPlayer.currentTime = next / 1000;
  }

  function seekBy(deltaMs: number) {
    seekTo(videoPositionMs + deltaMs);
  }

  function togglePlayback() {
    if (isVideoPlaying) {
      videoPlayer.pause();
    } else {
      videoPlayer.play();
    }
  }

  function onTimelinePress(event: GestureResponderEvent) {
    if (!hasDuration || timelineWidth <= 0) {
      return;
    }

    const x = event.nativeEvent?.locationX ?? 0;
    const ratio = Math.max(0, Math.min(x / timelineWidth, 1));
    seekTo(ratio * videoDurationMs);
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

  const renderPlaybackControls = () => (
    <>
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
    </>
  );

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View
              style={[
                styles.heroCard,
                {
                  marginHorizontal: -20,
                  marginTop: -12,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                  marginBottom: 20
                }
              ]}
            >
              <View style={[styles.heroTopRow, { justifyContent: "space-between" }]}>
                <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
                <Badge label="Challenge Workspace" tone="neutral" />
              </View>
              <Text style={styles.heroTitle}>Manage Challenge</Text>
              <Text style={styles.heroSubtitle}>Edit video details, define answer periods, and review student submissions.</Text>
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading challenge...</Text>
              </View>
            ) : !challenge ? (
              <View style={[styles.card, styles.emptyContainer, { alignItems: "flex-start", gap: 12 }]}> 
                <Badge label="Unavailable" tone="neutral" />
                <Text style={styles.title}>Challenge not found.</Text>
                <Text style={[styles.subtitle, { marginTop: 0 }]}>Go back and reopen this challenge from the dashboard.</Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={[styles.card, { gap: 16 }]}> 
                  <View style={localStyles.summaryBadgeRow}>
                    <Badge label={formatStatusLabel(challenge.status)} tone={getChallengeTone(challenge.status)} />
                    <Badge
                      label={`${challenge.submissions?.length ?? 0} Submission${(challenge.submissions?.length ?? 0) === 1 ? "" : "s"}`}
                      tone="pink"
                    />
                    <Badge
                      label={`${periods.length} Period${periods.length === 1 ? "" : "s"}`}
                      tone="yellow"
                    />
                  </View>
                  <View>
                    <Text style={styles.title}>{challenge.title}</Text>
                    <Text style={styles.subtitle}>{challenge.description?.trim() || "Add a clear prompt and answer windows so students know exactly what to record."}</Text>
                  </View>
                </View>

                <View style={localStyles.tabsWrap}>
                  {([
                    { key: "general", label: "Video & Info" },
                    { key: "periods", label: "Answer Periods" },
                    { key: "answers", label: "Answer List" }
                  ] as { key: DetailTab; label: string }[]).map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        style={[localStyles.tabButton, isActive && localStyles.tabButtonActive]}
                        onPress={() => setActiveTab(tab.key)}
                      >
                        <Text style={[localStyles.tabButtonText, isActive && localStyles.tabButtonTextActive]}>{tab.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {activeTab === "general" ? (
                  <View style={[styles.card, { gap: 16 }]}> 
                    <View style={localStyles.sectionHeader}>
                      <Text style={styles.title}>Challenge Video</Text>
                      <Badge label="Source Video" tone="cyan" />
                    </View>

                    <View style={localStyles.videoWrap}>
                      <VideoView
                        player={videoPlayer}
                        style={localStyles.video}
                        contentFit="contain"
                        nativeControls={false}
                      />
                    </View>

                    {renderPlaybackControls()}

                    <Pressable style={localStyles.timelineTrack} onLayout={onTimelineLayout} onPress={onTimelinePress}>
                      <View style={[localStyles.timelineProgress, { width: `${progressPct}%` }]} />
                    </Pressable>

                    <View style={{ gap: 14 }}>
                      <FormInput
                        label="Title"
                        icon="create-outline"
                        value={title}
                        onChangeText={setTitle}
                        editable={!saving}
                        placeholder="Challenge title"
                      />

                      <FormInput
                        label="Description"
                        icon="document-text-outline"
                        value={description}
                        onChangeText={setDescription}
                        editable={!saving}
                        multiline
                        numberOfLines={4}
                        placeholder="Challenge description"
                        style={localStyles.descriptionInput}
                      />
                    </View>

                    <View style={localStyles.actionGroup}>
                      <Button
                        title={saving ? "Saving Challenge Info..." : "Save Challenge Info"}
                        icon="checkmark-circle-outline"
                        iconPosition="left"
                        onPress={saveInfo}
                        loading={saving}
                      />

                      {challenge.status !== "PUBLISHED" ? (
                        <Button
                          title="Publish Challenge"
                          variant="primary"
                          icon="megaphone-outline"
                          iconPosition="left"
                          onPress={() => setPublishStatus("PUBLISHED")}
                          disabled={saving}
                        />
                      ) : (
                        <Button
                          title="Move Back To Draft"
                          variant="outline"
                          icon="refresh-outline"
                          iconPosition="left"
                          onPress={() => setPublishStatus("DRAFT")}
                          disabled={saving}
                        />
                      )}
                    </View>
                  </View>
                ) : activeTab === "periods" ? (
                  <View style={[styles.card, { gap: 16 }]}> 
                    <View style={localStyles.sectionHeader}>
                      <Text style={styles.title}>Answer Period Editor</Text>
                      <Badge label={pendingStartMs === null ? "Ready" : "Marking"} tone={pendingStartMs === null ? "neutral" : "yellow"} />
                    </View>
                    <Text style={[styles.subtitle, { marginTop: -6 }]}>Use the player to mark answer windows, then drag the handles on the timeline to fine-tune each range.</Text>

                    <View style={localStyles.videoWrap}>
                      <VideoView
                        player={videoPlayer}
                        style={localStyles.video}
                        contentFit="contain"
                        nativeControls={false}
                      />
                    </View>

                    {renderPlaybackControls()}

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
                            style={[localStyles.dragHandle, { left: Math.max(0, Math.min(selectedStartPx - 7, timelineWidth - 14)) }]}
                            {...leftHandleResponder.panHandlers}
                          />
                          <View
                            style={[localStyles.dragHandle, { left: Math.max(0, Math.min(selectedEndPx - 7, timelineWidth - 14)) }]}
                            {...rightHandleResponder.panHandlers}
                          />
                        </>
                      ) : null}
                    </Pressable>

                    <Button
                      title={pendingStartMs === null ? "Start Answer Period" : "Stop Answer Period"}
                      variant={pendingStartMs === null ? "primary" : "secondary"}
                      icon={pendingStartMs === null ? "flag-outline" : "stop-circle-outline"}
                      iconPosition="left"
                      onPress={handleAnswerPeriodButton}
                    />

                    <View style={localStyles.pendingCard}>
                      <Text style={localStyles.pendingText}>
                        {pendingStartMs === null
                          ? "Ready to mark a new answer period. Start at the correct frame, then stop where the response should end."
                          : `Start marked at ${formatMs(pendingStartMs)}. Move the video and press Stop Answer Period to finish this range.`}
                      </Text>
                    </View>

                    {periods.length > 0 ? (
                      <View style={{ gap: 12 }}>
                        <View style={localStyles.sectionHeader}>
                          <Text style={styles.title}>Defined Periods</Text>
                          <Badge label={`${periods.length} Total`} tone="yellow" />
                        </View>
                        {periods.map((p, i) => {
                          const isSelected = i === selectedPeriodIndex;
                          return (
                            <Pressable
                              key={`${p.startMs}-${p.endMs}-${i}`}
                              style={[localStyles.periodRow, isSelected && localStyles.periodRowSelected]}
                              onPress={() => setSelectedPeriodIndex(i)}
                            >
                              <View style={{ flex: 1, gap: 6 }}>
                                <View style={localStyles.periodMetaRow}>
                                  <Text style={localStyles.periodTitle}>Period {i + 1}</Text>
                                  <Badge label={`${formatMs(p.endMs - p.startMs)}`} tone={isSelected ? "cyan" : "neutral"} />
                                </View>
                                <Text style={localStyles.periodRangeText}>{formatMs(p.startMs)} → {formatMs(p.endMs)}</Text>
                              </View>
                              <IconCircleButton
                                icon="close-outline"
                                size={34}
                                onPress={() => removePeriod(i)}
                                style={localStyles.removePeriodButton}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={[styles.card, localStyles.emptyNestedCard]}> 
                        <Badge label="No Periods Yet" tone="neutral" />
                        <Text style={[styles.subtitle, { marginTop: 2 }]}>Create at least one answer window before saving.</Text>
                      </View>
                    )}

                    <Button
                      title={savingPeriods ? "Saving Answer Periods..." : "Save Answer Periods"}
                      icon="save-outline"
                      iconPosition="left"
                      onPress={saveAnswerPeriods}
                      loading={savingPeriods}
                    />
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <View style={localStyles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Answer Videos</Text>
                      <Badge
                        label={`${sortedSubmissions.length} Submission${sortedSubmissions.length === 1 ? "" : "s"}`}
                        tone="pink"
                      />
                    </View>

                    {sortedSubmissions.length === 0 ? (
                      <View style={[styles.card, styles.emptyContainer, { alignItems: "flex-start", gap: 12 }]}> 
                        <Badge label="No Answers Yet" tone="neutral" />
                        <Text style={styles.title}>No answers submitted yet.</Text>
                        <Text style={[styles.subtitle, { marginTop: 0 }]}>Student recordings will appear here as soon as they submit their responses.</Text>
                      </View>
                    ) : (
                      sortedSubmissions.map((submission) => (
                        <Pressable
                          key={submission.id}
                          style={({ pressed }) => [
                            styles.row,
                            {
                              marginTop: 0,
                              gap: 12,
                              opacity: pressed ? 0.92 : 1,
                              transform: [{ scale: pressed ? 0.99 : 1 }]
                            }
                          ]}
                          onPress={() =>
                            navigation.navigate("SubmissionReview", {
                              challengeId: challenge.id,
                              submissionId: submission.id
                            })
                          }
                        >
                          <View style={localStyles.answerHeader}>
                            <View style={{ flex: 1, gap: 6 }}>
                              <Text style={styles.title}>{submission.student?.name ?? "Student"}</Text>
                              <Text style={[styles.subtitle, { marginTop: 0 }]}>{submission.student?.email ?? "No email available"}</Text>
                            </View>
                            <View style={localStyles.answerBadgeColumn}>
                              <Badge label={formatStatusLabel(submission.status)} tone={getSubmissionTone(submission.status)} />
                              <Badge
                                label={submission.score !== null ? `${submission.score}/100` : "Not graded"}
                                tone={submission.score !== null ? "cyan" : "neutral"}
                              />
                            </View>
                          </View>
                          <Text style={styles.status}>Submitted: {new Date(submission.createdAt).toLocaleString()}</Text>
                          <Text style={styles.link}>Open Answer Review</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  tabsWrap: {
    backgroundColor: colors.darkBg,
    borderRadius: 18,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.borderColor,
    flexDirection: "row",
    gap: 8
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  tabButtonActive: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderColor
  },
  tabButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  tabButtonTextActive: {
    color: colors.textPrimary
  },
  summaryBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  videoWrap: {
    borderRadius: 18,
    overflow: "hidden",
    width: "72%",
    minWidth: 220,
    maxWidth: 340,
    aspectRatio: 9 / 16,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.darkBg
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
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: "center",
    justifyContent: "center"
  },
  playButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  controlButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  timelineTrack: {
    position: "relative",
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.darkBg,
    overflow: "hidden",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderColor
  },
  timelineProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.secondary
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 16,
    textAlignVertical: "top"
  },
  actionGroup: {
    gap: 12
  },
  periodBar: {
    position: "absolute",
    top: 6,
    bottom: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 79, 134, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 79, 134, 0.55)"
  },
  periodBarSelected: {
    backgroundColor: "rgba(25, 215, 208, 0.28)",
    borderColor: colors.secondary
  },
  dragHandle: {
    position: "absolute",
    top: 2,
    width: 14,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.textPrimary,
    borderWidth: 2,
    borderColor: colors.secondary
  },
  pendingCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.darkBg,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  pendingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderColor
  },
  periodRowSelected: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2
  },
  periodMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  periodTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  periodRangeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  removePeriodButton: {
    backgroundColor: colors.darkBg
  },
  emptyNestedCard: {
    alignItems: "flex-start",
    padding: 14,
    gap: 10
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  answerBadgeColumn: {
    alignItems: "flex-end",
    gap: 8
  }
});
