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

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f7"
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000"
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4
  },
  content: {
    padding: 16,
    gap: 16
  },
  previewCard: {
    backgroundColor: "#000",
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
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
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
    fontWeight: "600",
    color: "#000",
    marginBottom: 8
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e5ea"
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  submitButton: {
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#f5f5f7"
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500"
  }
});

export default function RecordVideoScreen() {
  const navigation = useNavigation<RecordVideoScreenNavigationProp>();
  const [videoUri, setVideoUri] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

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
        setVideoUri(result.assets[0].uri);
        setVideoLoading(true);
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not select video");
    }
  }

  async function submitChallenge() {
    if (!videoUri) {
      Alert.alert("Missing video", "Please select a video first.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a challenge title.");
      return;
    }

    setLoading(true);
    try {
      await api("/api/videos", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          sourceVideoUrl: videoUri,
          status: "PUBLISHED"
        })
      });

      Alert.alert("Success", "Challenge published!");
      navigation.navigate("Dashboard");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not publish challenge");
    } finally {
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
            onPress={submitChallenge}
            disabled={!videoUri || loading}
          >
            <Text style={localStyles.submitButtonText}>{loading ? "Publishing..." : "Publish Challenge"}</Text>
          </Pressable>

          <Pressable style={localStyles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={localStyles.backButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
