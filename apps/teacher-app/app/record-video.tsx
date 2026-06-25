import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  startSeconds: number;
  endSeconds: number;
};

const localStyles = StyleSheet.create({
  previewCard: {
    backgroundColor: "#0b1220",
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: 16 / 9,
    marginBottom: 8
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
  answerPeriodInput: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ef",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: "#0f172a",
    width: "100%"
  },
  answerPeriodInputsRow: {
    flexDirection: "row",
    gap: 10
  },
  answerPeriodInputWrap: {
    flex: 1,
    gap: 6
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
  const [newPeriodStart, setNewPeriodStart] = useState("");
  const [newPeriodEnd, setNewPeriodEnd] = useState("");

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

  function addAnswerPeriod() {
    const start = parseInt(newPeriodStart) || 0;
    const end = parseInt(newPeriodEnd) || 0;
    
    if (start < 0 || end < 0) {
      Alert.alert("Invalid time", "Times must be positive numbers.");
      return;
    }
    if (start >= end) {
      Alert.alert("Invalid range", "Start time must be before end time.");
      return;
    }
    
    const newPeriod: AnswerPeriod = {
      id: Date.now().toString(),
      startSeconds: start,
      endSeconds: end
    };
    
    setAnswerPeriods([...answerPeriods, newPeriod]);
    setNewPeriodStart("");
    setNewPeriodEnd("");
  }

  function removeAnswerPeriod(id: string) {
    setAnswerPeriods(answerPeriods.filter(p => p.id !== id));
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
            startSeconds: p.startSeconds,
            endSeconds: p.endSeconds
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
                    source={{ uri: videoUri }}
                    style={localStyles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    progressUpdateIntervalMillis={500}
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

            <View>
              <Text style={styles.sectionTitle}>Answer Periods (Optional)</Text>
              <Text style={styles.subtitle}>Mark time ranges when students should answer</Text>
              <View style={styles.card}>
                <View style={{ gap: 12 }}>
                  <View style={localStyles.answerPeriodInputsRow}>
                    <View style={localStyles.answerPeriodInputWrap}>
                      <Text style={styles.title}>Start (sec)</Text>
                      <TextInput
                        value={newPeriodStart}
                        onChangeText={setNewPeriodStart}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        editable={!loading}
                        style={localStyles.answerPeriodInput}
                      />
                    </View>
                    <View style={localStyles.answerPeriodInputWrap}>
                      <Text style={styles.title}>End (sec)</Text>
                      <TextInput
                        value={newPeriodEnd}
                        onChangeText={setNewPeriodEnd}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        editable={!loading}
                        style={localStyles.answerPeriodInput}
                      />
                    </View>
                  </View>

                  <Pressable
                    style={[styles.button, (!newPeriodStart || !newPeriodEnd || loading) && styles.buttonDisabled]}
                    onPress={addAnswerPeriod}
                    disabled={!newPeriodStart || !newPeriodEnd || loading}
                  >
                    <View style={localStyles.answerPeriodAddButtonContent}>
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={localStyles.answerPeriodAddButtonText}>Add Answer Period</Text>
                    </View>
                  </Pressable>

                  {answerPeriods.length === 0 ? (
                    <Text style={localStyles.answerPeriodEmpty}>No periods added yet.</Text>
                  ) : null}

                  {answerPeriods.length > 0 && (
                    <View style={{ gap: 8 }}>
                      {answerPeriods.map((period) => (
                        <View key={period.id} style={localStyles.answerPeriodCard}>
                          <Text style={localStyles.answerPeriodTime}>
                            {period.startSeconds}s - {period.endSeconds}s
                          </Text>
                          <Pressable
                            onPress={() => removeAnswerPeriod(period.id)}
                            disabled={loading}
                            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                          >
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </Pressable>
                        </View>
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

