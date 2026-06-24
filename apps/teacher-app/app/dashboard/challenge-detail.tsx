import { ResizeMode, Video } from "expo-av";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";

type ChallengeDetailNavigationProp = NativeStackNavigationProp<any, "ChallengeDetail">;
type ChallengeDetailRoute = { params?: { challengeId?: string } };
type DetailTab = "general" | "answers";

type Submission = {
  id: string;
  status: string;
  score: number | null;
  answerMediaUrl: string;
  student?: { id: string; name: string; email: string };
  createdAt: string;
};

type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sourceVideoUrl: string;
  submissions: Submission[];
};

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
  const route = useRoute();
  const challengeId = ((route as ChallengeDetailRoute).params?.challengeId ?? "").trim();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("general");

  const sortedSubmissions = useMemo(() => {
    return [...(challenge?.submissions ?? [])].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [challenge?.submissions]);

  const loadChallenge = useCallback(async () => {
    if (!challengeId) {
      Alert.alert("Missing challenge", "Challenge ID is missing.");
      return;
    }

    setLoading(true);
    try {
      const data = await api(`/api/videos/${challengeId}`);
      const nextChallenge = data.challenge as Challenge;
      setChallenge(nextChallenge);
      setTitle(nextChallenge.title ?? "");
      setDescription(nextChallenge.description ?? "");
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

  return (
    <SafeAreaView style={localStyles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={localStyles.content} keyboardShouldPersistTaps="handled">
          <View style={localStyles.heroCard}>
            <View style={localStyles.heroTopRow}>
              <Pressable style={localStyles.backButton} onPress={() => navigation.goBack()}>
                <Text style={localStyles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={localStyles.heroTitle}>Manage Challenge</Text>
            </View>
            <Text style={localStyles.heroEyebrow}>Challenge Workspace</Text>
            <Text style={localStyles.heroSubtitle}>Edit video details, control publish status, and review answers.</Text>
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
                      source={{ uri: challenge.sourceVideoUrl }}
                      style={localStyles.video}
                      resizeMode={ResizeMode.CONTAIN}
                      useNativeControls
                    />
                  </View>

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
                        <Text style={localStyles.answerLink}>Open answer review →</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  videoFrame: {
    backgroundColor: "#0b1220",
    borderRadius: 14,
    overflow: "hidden",
    minHeight: 220
  },
  video: {
    width: "100%",
    minHeight: 220
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
