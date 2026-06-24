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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { api } from "../src/api";

type RecordVideoScreenNavigationProp = NativeStackNavigationProp<any, "RecordVideo">;
type ChallengeStatus = "DRAFT" | "PUBLISHED";

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef3f8"
  },
  header: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe4ef"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a"
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4
  },
  content: {
    padding: 16,
    gap: 16
  },
  previewCard: {
    backgroundColor: "#0b1220",
    borderRadius: 12,
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
  selectButton: {
    backgroundColor: "#0369a1",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16
  },
  selectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  formSection: {
    gap: 12
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    color: "#0f172a"
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  submitButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc"
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  backButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#e2e8f0"
  },
  backButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700"
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
  }
});

export default function RecordVideoScreen() {
  const navigation = useNavigation<RecordVideoScreenNavigationProp>();
  const [videoUri, setVideoUri] = useState("");
  const [videoFileName, setVideoFileName] = useState("challenge-video.mp4");
  const [videoContentType, setVideoContentType] = useState("video/mp4");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submittingAs, setSubmittingAs] = useState<ChallengeStatus | null>(null);

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
          status
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
    <SafeAreaView style={localStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={localStyles.content} keyboardShouldPersistTaps="handled">
          <View style={localStyles.header}>
            <Text style={localStyles.headerTitle}>Create Challenge</Text>
            <Text style={localStyles.headerSubtitle}>Select and preview your video</Text>
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

          <Pressable style={localStyles.selectButton} onPress={selectVideo} disabled={loading}>
            <Text style={localStyles.selectButtonText}>{videoUri ? "Change Video" : "Select Video from Library"}</Text>
          </Pressable>

          {loading && uploadProgress !== null ? (
            <View style={localStyles.uploadProgressWrap}>
              <Text style={localStyles.uploadProgressLabel}>Uploading video: {uploadProgress}%</Text>
              <View style={localStyles.uploadProgressTrack}>
                <View style={[localStyles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          ) : null}

          <View style={localStyles.formSection}>
            <View>
              <Text style={localStyles.label}>Challenge Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Scales Practice"
                placeholderTextColor="#999"
                editable={!loading}
                style={localStyles.input}
              />
            </View>

            <View>
              <Text style={localStyles.label}>Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add instructions or coaching notes for students"
                placeholderTextColor="#999"
                multiline
                editable={!loading}
                style={[localStyles.input, localStyles.textArea]}
              />
            </View>
          </View>

          <Pressable
            style={[localStyles.submitButton, !videoUri || loading ? localStyles.submitButtonDisabled : null]}
            onPress={() => submitChallenge("PUBLISHED")}
            disabled={!videoUri || loading}
          >
            <Text style={localStyles.submitButtonText}>
              {loading && submittingAs === "PUBLISHED" ? "Uploading and publishing..." : "Publish Challenge"}
            </Text>
          </Pressable>

          <Pressable
            style={[localStyles.backButton, !videoUri || loading ? localStyles.submitButtonDisabled : null]}
            onPress={() => submitChallenge("DRAFT")}
            disabled={!videoUri || loading}
          >
            <Text style={localStyles.backButtonText}>
              {loading && submittingAs === "DRAFT" ? "Uploading and saving draft..." : "Save As Draft"}
            </Text>
          </Pressable>

          <Pressable style={localStyles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={localStyles.backButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
