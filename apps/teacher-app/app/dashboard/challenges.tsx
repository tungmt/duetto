import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type ChallengesScreenNavigationProp = NativeStackNavigationProp<any, "ChallengesTab">;

type Challenge = {
  id: string;
  title: string;
  status: string;
  createdAt?: string;
  previewVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  _count?: { submissions: number };
};

function formatTimeAgo(dateText?: string) {
  if (!dateText) {
    return "Uploaded recently";
  }

  const created = new Date(dateText);
  const createdMs = created.getTime();
  if (Number.isNaN(createdMs)) {
    return "Uploaded recently";
  }

  const diffMs = Math.max(Date.now() - createdMs, 0);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    return "Uploaded just now";
  }

  if (diffMs < hourMs) {
    const minutes = Math.floor(diffMs / minuteMs);
    return `Uploaded ${minutes}m ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `Uploaded ${hours}h ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  return `Uploaded ${days}d ago`;
}

export default function TeacherChallengesScreen() {
  const navigation = useNavigation<ChallengesScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const videosData = await api("/api/videos");
      setChallenges(videosData.videos);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View
              style={[
                styles.heroCard,
                {
                  marginBottom: 2,
                  marginHorizontal: -20,
                  marginTop: -20,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 16
                }
              ]}
            >
              <View style={styles.heroTopRow}>
                <Text style={styles.heroTitle}>Challenges</Text>
              </View>
              <Text style={styles.heroEyebrow}>Challenge Workspace</Text>
              <Text style={styles.heroSubtitle}>Create and manage your challenges.</Text>
            </View>

            <Pressable style={styles.card} onPress={() => navigation.navigate("RecordVideo")}>
              <Text style={styles.title}>🎥 Create New Challenge</Text>
              <Text style={styles.status}>Record, edit, and publish a challenge</Text>
              <Text style={[styles.link, { marginTop: 12 }]}>Open Editor →</Text>
            </Pressable>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>Loading challenges...</Text>
              </View>
            ) : challenges.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>No challenges published yet</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Your Challenges</Text>
                <FlatList
                  scrollEnabled={false}
                  data={challenges}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.row}
                      onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.id })}
                    >
                      <View style={localStyles.rowContent}>
                        <View style={localStyles.previewWrap}>
                          {item.thumbnailUrl ? (
                            <Image source={{ uri: item.thumbnailUrl }} style={localStyles.previewImage} resizeMode="cover" />
                          ) : (
                            <View style={localStyles.previewFallback}>
                              <Text style={localStyles.previewFallbackText}>No preview</Text>
                            </View>
                          )}
                        </View>

                        <View style={localStyles.infoWrap}>
                          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                          <Text style={styles.status}>{item.status} • {item._count?.submissions ?? 0} submissions</Text>
                          <Text style={styles.hint}>{formatTimeAgo(item.createdAt)}</Text>
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  rowContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  previewWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#0b1220",
    width: 88,
    aspectRatio: 9 / 16
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  infoWrap: {
    flex: 1,
    gap: 2
  },
  previewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  previewFallbackText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700"
  }
});

