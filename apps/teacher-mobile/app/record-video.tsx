import { ResizeMode, Video } from "expo-av";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { api } from "../src/api";

type TextOverlay = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  color: string;
};

type AudioLayer = {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
};

type EditorTab = "trim" | "text" | "audio" | "publish";
type CaptureSource = "record" | "library";

const editorTabs: { key: EditorTab; label: string; hint: string }[] = [
  { key: "trim", label: "Cut", hint: "Timing" },
  { key: "text", label: "Text", hint: "Keyframes" },
  { key: "audio", label: "Audio", hint: "Tracks" },
  { key: "publish", label: "Post", hint: "Details" }
];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMs(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function RecordVideoScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [captureSource, setCaptureSource] = useState<CaptureSource>("record");
  const [selectedTab, setSelectedTab] = useState<EditorTab>("trim");
  const [isRecording, setIsRecording] = useState(false);
  const [sourceVideoUri, setSourceVideoUri] = useState("");
  const [timelineTrackWidth, setTimelineTrackWidth] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trimStartMs, setTrimStartMs] = useState("0");
  const [trimEndMs, setTrimEndMs] = useState("15000");
  const [overlayText, setOverlayText] = useState("");
  const [overlayStartMs, setOverlayStartMs] = useState("0");
  const [overlayEndMs, setOverlayEndMs] = useState("3000");
  const [overlayX, setOverlayX] = useState("14");
  const [overlayY, setOverlayY] = useState("68");
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [audioLabel, setAudioLabel] = useState("Original audio");
  const [audioStartMs, setAudioStartMs] = useState("0");
  const [audioEndMs, setAudioEndMs] = useState("15000");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);

  const hasPermissions = cameraPermission?.granted && microphonePermission?.granted;
  const trimStart = toNumber(trimStartMs, 0);
  const trimEnd = Math.max(toNumber(trimEndMs, 15000), trimStart + 1000);
  const timelineSpan = Math.max(trimEnd - trimStart, 1000);
  const timelineItems = useMemo(
    () =>
      [
        ...textOverlays.map((item) => ({
          id: item.id,
          label: item.text,
          startMs: item.startMs,
          endMs: item.endMs,
          color: item.color,
          kind: "TEXT" as const
        })),
        ...audioLayers.map((item) => ({
          id: item.id,
          label: item.label,
          startMs: item.startMs,
          endMs: item.endMs,
          color: "#ffb84d",
          kind: "AUDIO" as const
        }))
      ].sort((left, right) => left.startMs - right.startMs),
    [audioLayers, textOverlays]
  );

  async function requestPermissions() {
    await requestCameraPermission();
    await requestMicrophonePermission();
  }

  async function importFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Library access needed", "Allow photo library access to import a video clip.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCaptureSource("library");
      setSourceVideoUri(result.assets[0].uri);
    }
  }

  async function startRecording() {
    if (!cameraRef.current) {
      return;
    }

    setIsRecording(true);
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 120 });
      setCaptureSource("record");
      setSourceVideoUri(result?.uri ?? "");
    } catch (error) {
      Alert.alert("Recording failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsRecording(false);
    }
  }

  function stopRecording() {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
  }

  function addOverlay() {
    if (!overlayText.trim()) {
      Alert.alert("Missing text", "Add text before creating a keyframe.");
      return;
    }

    const startMs = toNumber(overlayStartMs, 0);
    const endMs = toNumber(overlayEndMs, startMs + 3000);
    if (endMs <= startMs) {
      Alert.alert("Invalid timing", "Text keyframe end time must be later than the start time.");
      return;
    }

    setTextOverlays((items) => [
      ...items,
      {
        id: `overlay-${Date.now()}`,
        text: overlayText,
        startMs,
        endMs,
        x: clamp(toNumber(overlayX, 14), 4, 82),
        y: clamp(toNumber(overlayY, 68), 10, 84),
        color: overlayColor
      }
    ]);
    setOverlayText("");
    setSelectedTab("text");
  }

  function addAudioLayer() {
    if (!audioLabel.trim()) {
      Alert.alert("Missing audio", "Add a track label before placing it on the timeline.");
      return;
    }

    const startMs = toNumber(audioStartMs, 0);
    const endMs = toNumber(audioEndMs, startMs + 15000);
    if (endMs <= startMs) {
      Alert.alert("Invalid timing", "Audio layer end time must be later than the start time.");
      return;
    }

    setAudioLayers((items) => [
      ...items,
      {
        id: `audio-${Date.now()}`,
        label: audioLabel,
        startMs,
        endMs
      }
    ]);
    setAudioLabel("");
    setSelectedTab("audio");
  }

  function removeTextOverlay(id: string) {
    setTextOverlays((items) => items.filter((item) => item.id !== id));
  }

  function removeAudioLayer(id: string) {
    setAudioLayers((items) => items.filter((item) => item.id !== id));
  }

  async function publishChallenge() {
    if (!title.trim() || !sourceVideoUri) {
      Alert.alert("Missing video", "Record a video and add a title before publishing.");
      return;
    }

    await api("/api/videos", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        sourceVideoUrl: sourceVideoUri,
        status: "PUBLISHED",
        textOverlays: [
          ...textOverlays.map((item) => ({ ...item, kind: "TEXT" })),
          ...audioLayers.map((item) => ({ ...item, kind: "AUDIO" }))
        ],
        trim: {
          startMs: trimStart,
          endMs: trimEnd
        }
      })
    });

    router.replace("/dashboard/challenges");
  }

  function renderTrimPanel() {
    return (
      <View style={localStyles.panelBody}>
        <Text style={localStyles.panelTitle}>Trim and pace</Text>
        <Text style={localStyles.panelCopy}>Choose where the challenge starts and ends so the timeline feels intentional.</Text>
        <View style={localStyles.inlineFields}>
          <TextInput value={trimStartMs} onChangeText={setTrimStartMs} placeholder="Start ms" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
          <TextInput value={trimEndMs} onChangeText={setTrimEndMs} placeholder="End ms" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
        </View>
        <View style={localStyles.statRow}>
          <View style={localStyles.statCard}>
            <Text style={localStyles.statLabel}>Clip in</Text>
            <Text style={localStyles.statValue}>{formatMs(trimStart)}</Text>
          </View>
          <View style={localStyles.statCard}>
            <Text style={localStyles.statLabel}>Clip out</Text>
            <Text style={localStyles.statValue}>{formatMs(trimEnd)}</Text>
          </View>
          <View style={localStyles.statCard}>
            <Text style={localStyles.statLabel}>Duration</Text>
            <Text style={localStyles.statValue}>{formatMs(trimEnd - trimStart)}</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderTextPanel() {
    return (
      <View style={localStyles.panelBody}>
        <Text style={localStyles.panelTitle}>Text keyframes</Text>
        <Text style={localStyles.panelCopy}>Place captions like a social editor: time range, position, and color.</Text>
        <TextInput value={overlayText} onChangeText={setOverlayText} placeholder="Add on-screen text" placeholderTextColor="#7d828f" style={localStyles.inputFull} />
        <View style={localStyles.inlineFields}>
          <TextInput value={overlayStartMs} onChangeText={setOverlayStartMs} placeholder="Start ms" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
          <TextInput value={overlayEndMs} onChangeText={setOverlayEndMs} placeholder="End ms" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
        </View>
        <View style={localStyles.inlineFields}>
          <TextInput value={overlayX} onChangeText={setOverlayX} placeholder="X %" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
          <TextInput value={overlayY} onChangeText={setOverlayY} placeholder="Y %" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
          <TextInput value={overlayColor} onChangeText={setOverlayColor} placeholder="#ffffff" autoCapitalize="none" placeholderTextColor="#7d828f" style={localStyles.input} />
        </View>
        <Pressable style={localStyles.primaryButton} onPress={addOverlay}>
          <Text style={localStyles.primaryButtonText}>Add text layer</Text>
        </Pressable>
        <View style={localStyles.layerList}>
          {textOverlays.length === 0 ? <Text style={localStyles.emptyCopy}>No text layers yet.</Text> : null}
          {textOverlays.map((item) => (
            <View key={item.id} style={localStyles.layerRow}>
              <View style={localStyles.layerTextBlock}>
                <Text style={localStyles.layerTitle}>{item.text}</Text>
                <Text style={localStyles.layerMeta}>{formatMs(item.startMs)} - {formatMs(item.endMs)} at {Math.round(item.x)}%, {Math.round(item.y)}%</Text>
              </View>
              <Pressable style={localStyles.ghostButton} onPress={() => removeTextOverlay(item.id)}>
                <Text style={localStyles.ghostButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderAudioPanel() {
    return (
      <View style={localStyles.panelBody}>
        <Text style={localStyles.panelTitle}>Audio layers</Text>
        <Text style={localStyles.panelCopy}>Stack cue names on the timeline now, then map them to actual tracks in the render pipeline later.</Text>
        <TextInput value={audioLabel} onChangeText={setAudioLabel} placeholder="Track label" placeholderTextColor="#7d828f" style={localStyles.inputFull} />
        <View style={localStyles.inlineFields}>
          <TextInput value={audioStartMs} onChangeText={setAudioStartMs} placeholder="Start ms" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
          <TextInput value={audioEndMs} onChangeText={setAudioEndMs} placeholder="End ms" keyboardType="number-pad" placeholderTextColor="#7d828f" style={localStyles.input} />
        </View>
        <Pressable style={localStyles.primaryButton} onPress={addAudioLayer}>
          <Text style={localStyles.primaryButtonText}>Add audio layer</Text>
        </Pressable>
        <View style={localStyles.layerList}>
          {audioLayers.length === 0 ? <Text style={localStyles.emptyCopy}>No audio layers yet.</Text> : null}
          {audioLayers.map((item) => (
            <View key={item.id} style={localStyles.layerRow}>
              <View style={localStyles.layerTextBlock}>
                <Text style={localStyles.layerTitle}>{item.label}</Text>
                <Text style={localStyles.layerMeta}>{formatMs(item.startMs)} - {formatMs(item.endMs)}</Text>
              </View>
              <Pressable style={localStyles.ghostButton} onPress={() => removeAudioLayer(item.id)}>
                <Text style={localStyles.ghostButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderPublishPanel() {
    return (
      <View style={localStyles.panelBody}>
        <Text style={localStyles.panelTitle}>Publish challenge</Text>
        <Text style={localStyles.panelCopy}>Package the edited clip with a clear title and a short prompt for students.</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Challenge title" placeholderTextColor="#7d828f" style={localStyles.inputFull} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Brief prompt or coaching note" placeholderTextColor="#7d828f" multiline style={[localStyles.inputFull, localStyles.textArea]} />
        <View style={localStyles.publishSummary}>
          <Text style={localStyles.summaryText}>Source: {captureSource === "record" ? "New recording" : "Imported clip"}</Text>
          <Text style={localStyles.summaryText}>Layers: {textOverlays.length} text, {audioLayers.length} audio</Text>
          <Text style={localStyles.summaryText}>Trim: {formatMs(trimStart)} - {formatMs(trimEnd)}</Text>
        </View>
        <Pressable style={[localStyles.primaryButton, !sourceVideoUri && localStyles.primaryButtonDisabled]} disabled={!sourceVideoUri} onPress={publishChallenge}>
          <Text style={localStyles.primaryButtonText}>Publish challenge</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <ScrollView contentContainerStyle={localStyles.screen}>
        <View style={localStyles.headerRow}>
          <View>
            <Text style={localStyles.eyebrow}>Teacher Studio</Text>
            <Text style={localStyles.heading}>Challenge editor</Text>
          </View>
          <Pressable style={localStyles.secondaryButton} onPress={() => router.back()}>
            <Text style={localStyles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>

        <View style={localStyles.previewCard}>
          <View style={localStyles.previewStage}>
            {sourceVideoUri ? (
              <Video source={{ uri: sourceVideoUri }} style={localStyles.video} resizeMode={ResizeMode.COVER} shouldPlay isLooping />
            ) : hasPermissions ? (
              <CameraView ref={cameraRef} mode="video" facing="front" style={localStyles.video} />
            ) : (
              <View style={localStyles.permissionState}>
                <Text style={localStyles.permissionTitle}>Camera and microphone access are required</Text>
                <Text style={localStyles.permissionCopy}>This editor keeps recording on the same screen, so both permissions need to be available here.</Text>
                <Pressable style={localStyles.primaryButton} onPress={requestPermissions}>
                  <Text style={localStyles.primaryButtonText}>Allow camera and microphone</Text>
                </Pressable>
              </View>
            )}

            <View style={localStyles.topBadges}>
              <View style={localStyles.modeBadge}>
                <Text style={localStyles.modeBadgeText}>{captureSource === "record" ? "Camera" : "Library"}</Text>
              </View>
              <View style={[localStyles.modeBadge, isRecording && localStyles.liveBadge]}>
                <Text style={localStyles.modeBadgeText}>{isRecording ? "REC" : "Draft"}</Text>
              </View>
            </View>

            <View style={localStyles.overlayStack} pointerEvents="none">
              {textOverlays.slice(0, 3).map((item) => (
                <Text
                  key={item.id}
                  style={[
                    localStyles.overlayPreviewText,
                    {
                      color: item.color,
                      left: `${item.x}%`,
                      top: `${item.y}%`
                    }
                  ]}
                >
                  {item.text}
                </Text>
              ))}
            </View>

            <View style={localStyles.toolRail}>
              {editorTabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[localStyles.toolButton, selectedTab === tab.key && localStyles.toolButtonActive]}
                  onPress={() => setSelectedTab(tab.key)}
                >
                  <Text style={[localStyles.toolButtonLabel, selectedTab === tab.key && localStyles.toolButtonLabelActive]}>{tab.label}</Text>
                  <Text style={[localStyles.toolButtonHint, selectedTab === tab.key && localStyles.toolButtonHintActive]}>{tab.hint}</Text>
                </Pressable>
              ))}
            </View>

            <View style={localStyles.captureBar}>
              <Pressable style={localStyles.captureAction} onPress={importFromLibrary}>
                <Text style={localStyles.captureActionLabel}>Library</Text>
                <Text style={localStyles.captureActionHint}>Import clip</Text>
              </Pressable>
              <Pressable
                style={[localStyles.recordButton, isRecording && localStyles.recordButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={!hasPermissions && !sourceVideoUri}
              >
                <View style={localStyles.recordButtonInner} />
              </Pressable>
              <Pressable style={localStyles.captureAction} onPress={() => setSourceVideoUri("")}>
                <Text style={localStyles.captureActionLabel}>{sourceVideoUri ? "Reset" : "Live"}</Text>
                <Text style={localStyles.captureActionHint}>{sourceVideoUri ? "Clear clip" : "Camera view"}</Text>
              </Pressable>
            </View>
          </View>

          <View style={localStyles.timelineCard}>
            <View style={localStyles.timelineHeader}>
              <View>
                <Text style={localStyles.timelineTitle}>Timeline</Text>
                <Text style={localStyles.timelineSubtitle}>{timelineItems.length} layers across the clip</Text>
              </View>
              <Text style={localStyles.timelineDuration}>{formatMs(trimEnd - trimStart)}</Text>
            </View>

            <View style={localStyles.timeScaleRow}>
              <Text style={localStyles.timeScaleLabel}>{formatMs(trimStart)}</Text>
              <Text style={localStyles.timeScaleLabel}>{formatMs(trimStart + timelineSpan / 2)}</Text>
              <Text style={localStyles.timeScaleLabel}>{formatMs(trimEnd)}</Text>
            </View>

            <View style={localStyles.timelineTrack} onLayout={(event) => setTimelineTrackWidth(event.nativeEvent.layout.width)}>
              <View style={[localStyles.trimWindow, { left: 0, width: "100%" }]} />
              {timelineItems.map((item) => {
                const left = clamp(((item.startMs - trimStart) / timelineSpan) * timelineTrackWidth, 0, Math.max(timelineTrackWidth - 24, 0));
                const width = clamp(((item.endMs - item.startMs) / timelineSpan) * timelineTrackWidth, 36, timelineTrackWidth || 36);
                return (
                  <View key={item.id} style={[localStyles.timelineMarker, { left, width, backgroundColor: item.color }]}>
                    <Text numberOfLines={1} style={localStyles.timelineMarkerText}>{item.label}</Text>
                  </View>
                );
              })}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.scrubberRow}>
              {Array.from({ length: 12 }).map((_, index) => (
                <View key={`frame-${index}`} style={localStyles.frameThumb}>
                  <Text style={localStyles.frameLabel}>{index + 1}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={localStyles.panelCard}>
          <View style={localStyles.panelTabs}>
            {editorTabs.map((tab) => (
              <Pressable
                key={tab.key}
                style={[localStyles.panelTab, selectedTab === tab.key && localStyles.panelTabActive]}
                onPress={() => setSelectedTab(tab.key)}
              >
                <Text style={[localStyles.panelTabText, selectedTab === tab.key && localStyles.panelTabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          {selectedTab === "trim" ? renderTrimPanel() : null}
          {selectedTab === "text" ? renderTextPanel() : null}
          {selectedTab === "audio" ? renderAudioPanel() : null}
          {selectedTab === "publish" ? renderPublishPanel() : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0c0d10"
  },
  screen: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 18
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  eyebrow: {
    color: "#ff8d5d",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  heading: {
    color: "#f4f5f7",
    fontSize: 30,
    fontWeight: "800"
  },
  previewCard: {
    backgroundColor: "#14161b",
    borderColor: "#262932",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden"
  },
  previewStage: {
    aspectRatio: 9 / 16,
    backgroundColor: "#090a0d",
    minHeight: 540,
    position: "relative"
  },
  video: {
    ...StyleSheet.absoluteFillObject
  },
  permissionState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28
  },
  permissionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center"
  },
  permissionCopy: {
    color: "#b7bdc8",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    marginTop: 10,
    textAlign: "center"
  },
  topBadges: {
    flexDirection: "row",
    gap: 8,
    left: 18,
    position: "absolute",
    top: 18
  },
  modeBadge: {
    backgroundColor: "rgba(12, 13, 16, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  liveBadge: {
    backgroundColor: "#d43a2f"
  },
  modeBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700"
  },
  overlayStack: {
    ...StyleSheet.absoluteFillObject
  },
  overlayPreviewText: {
    backgroundColor: "rgba(12, 13, 16, 0.45)",
    borderRadius: 16,
    fontSize: 18,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute"
  },
  toolRail: {
    gap: 10,
    position: "absolute",
    right: 14,
    top: 78
  },
  toolButton: {
    alignItems: "center",
    backgroundColor: "rgba(12, 13, 16, 0.66)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  toolButtonActive: {
    backgroundColor: "#f4f5f7"
  },
  toolButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  toolButtonLabelActive: {
    color: "#111317"
  },
  toolButtonHint: {
    color: "#aab0bc",
    fontSize: 11,
    marginTop: 2
  },
  toolButtonHintActive: {
    color: "#586070"
  },
  captureBar: {
    alignItems: "center",
    backgroundColor: "rgba(12, 13, 16, 0.88)",
    borderRadius: 24,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 18
  },
  captureAction: {
    width: 84
  },
  captureActionLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  captureActionHint: {
    color: "#8e96a5",
    fontSize: 12,
    marginTop: 2
  },
  recordButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    height: 82,
    justifyContent: "center",
    width: 82
  },
  recordButtonActive: {
    backgroundColor: "#ff6652"
  },
  recordButtonInner: {
    backgroundColor: "#111317",
    borderRadius: 999,
    height: 30,
    width: 30
  },
  timelineCard: {
    backgroundColor: "#171a20",
    gap: 14,
    padding: 16
  },
  timelineHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  timelineTitle: {
    color: "#f4f5f7",
    fontSize: 18,
    fontWeight: "700"
  },
  timelineSubtitle: {
    color: "#8e96a5",
    fontSize: 13,
    marginTop: 2
  },
  timelineDuration: {
    color: "#ffb84d",
    fontSize: 18,
    fontWeight: "800"
  },
  timeScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  timeScaleLabel: {
    color: "#7d8595",
    fontSize: 12
  },
  timelineTrack: {
    backgroundColor: "#0f1115",
    borderRadius: 18,
    height: 60,
    overflow: "hidden",
    position: "relative"
  },
  trimWindow: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    bottom: 0,
    position: "absolute",
    top: 0
  },
  timelineMarker: {
    borderRadius: 14,
    height: 26,
    justifyContent: "center",
    paddingHorizontal: 10,
    position: "absolute",
    top: 17
  },
  timelineMarkerText: {
    color: "#111317",
    fontSize: 11,
    fontWeight: "800"
  },
  scrubberRow: {
    gap: 8
  },
  frameThumb: {
    alignItems: "center",
    backgroundColor: "#262b35",
    borderRadius: 14,
    height: 72,
    justifyContent: "center",
    width: 56
  },
  frameLabel: {
    color: "#f4f5f7",
    fontSize: 13,
    fontWeight: "700"
  },
  panelCard: {
    backgroundColor: "#f5f1ea",
    borderRadius: 28,
    gap: 14,
    padding: 16
  },
  panelTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  panelTab: {
    backgroundColor: "#e4ddd1",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  panelTabActive: {
    backgroundColor: "#121417"
  },
  panelTabText: {
    color: "#434a56",
    fontSize: 14,
    fontWeight: "700"
  },
  panelTabTextActive: {
    color: "#ffffff"
  },
  panelBody: {
    gap: 14
  },
  panelTitle: {
    color: "#101216",
    fontSize: 24,
    fontWeight: "800"
  },
  panelCopy: {
    color: "#5d6470",
    fontSize: 15,
    lineHeight: 22
  },
  inlineFields: {
    flexDirection: "row",
    gap: 10
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#d8d0c2",
    borderRadius: 16,
    borderWidth: 1,
    color: "#111317",
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14
  },
  inputFull: {
    backgroundColor: "#ffffff",
    borderColor: "#d8d0c2",
    borderRadius: 16,
    borderWidth: 1,
    color: "#111317",
    minHeight: 54,
    paddingHorizontal: 14
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
    textAlignVertical: "top"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#111317",
    borderRadius: 18,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  primaryButtonDisabled: {
    opacity: 0.45
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: "#1a1d24",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryButtonText: {
    color: "#f4f5f7",
    fontSize: 14,
    fontWeight: "700"
  },
  ghostButton: {
    backgroundColor: "#ece5d8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  ghostButtonText: {
    color: "#3f4651",
    fontSize: 13,
    fontWeight: "700"
  },
  statRow: {
    flexDirection: "row",
    gap: 10
  },
  statCard: {
    backgroundColor: "#fffaf2",
    borderColor: "#e2d9cb",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14
  },
  statLabel: {
    color: "#737b87",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase"
  },
  statValue: {
    color: "#101216",
    fontSize: 19,
    fontWeight: "800"
  },
  layerList: {
    gap: 10
  },
  layerRow: {
    alignItems: "center",
    backgroundColor: "#fffaf2",
    borderColor: "#e2d9cb",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 14
  },
  layerTextBlock: {
    flex: 1,
    gap: 4
  },
  layerTitle: {
    color: "#111317",
    fontSize: 16,
    fontWeight: "700"
  },
  layerMeta: {
    color: "#666e7b",
    fontSize: 13
  },
  emptyCopy: {
    color: "#666e7b",
    fontSize: 14
  },
  publishSummary: {
    backgroundColor: "#fffaf2",
    borderColor: "#e2d9cb",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  summaryText: {
    color: "#414955",
    fontSize: 14
  }
});
