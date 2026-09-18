import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

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

function getStatusTone(status?: string): "cyan" | "neutral" | "pink" | "yellow" {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "published" || normalized === "active") {
    return "cyan";
  }

  if (normalized === "draft") {
    return "yellow";
  }

  if (normalized === "archived") {
    return "neutral";
  }

  return "pink";
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
                  marginBottom: 6,
                  marginHorizontal: -20,
                  marginTop: -20,
                  paddingTop: insets.top + 16,
                  paddingHorizontal: 16,
                  paddingBottom: 16
                }
              ]}
            >
              <View style={[styles.heroTopRow, { justifyContent: "space-between" }]}> 
                {navigation.canGoBack() ? (
                  <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
                ) : (
                  <View />
                )}
                <Badge label="Challenge Workspace" tone="neutral" />
              </View>

              <Text style={styles.heroTitle}>Challenges</Text>
              <Text style={styles.heroSubtitle}>
                Publish new prompts, track submissions, and keep every classroom challenge organized.
              </Text>
            </View>

            <View style={[styles.card, localStyles.createCard]}>
              <View style={localStyles.createCopy}>
                <Badge label="New" tone="pink" />
                <Text style={styles.title}>Create a new video challenge</Text>
                <Text style={styles.subtitle}>
                  Record, edit, and publish a fresh challenge for your students.
                </Text>
              </View>

              <Button
                title="Open Editor"
                icon="videocam-outline"
                iconPosition="left"
                onPress={() => navigation.navigate("RecordVideo")}
              />
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>Loading challenges...</Text>
              </View>
            ) : challenges.length === 0 ? (
              <View style={[styles.card, styles.emptyContainer, { alignItems: "flex-start" }]}> 
                <Badge label="No challenges yet" tone="neutral" />
                <Text style={[styles.title, { marginTop: 6 }]}>Your published challenges will appear here.</Text>
                <Text style={styles.subtitle}>Create your first challenge to start receiving submissions.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Your Challenges</Text>
                <FlatList
                  scrollEnabled={false}
                  data={challenges}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ gap: 12 }}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [localStyles.challengeCard, pressed && localStyles.challengeCardPressed]}
                      onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.id })}
                    >
                      <View style={localStyles.rowContent}>
                        <View style={localStyles.previewWrap}>
                          {item.thumbnailUrl ? (
                            <Image source={{ uri: item.thumbnailUrl }} style={localStyles.previewImage} resizeMode="cover" />
                          ) : (
                            <View style={localStyles.previewFallback}>
                              <Text style={localStyles.previewFallbackIcon}>▶</Text>
                              <Text style={localStyles.previewFallbackText}>Preview unavailable</Text>
                            </View>
                          )}
                        </View>

                        <View style={localStyles.infoWrap}>
                          <View style={localStyles.cardTopRow}>
                            <Badge label={item.status || "Unknown"} tone={getStatusTone(item.status)} />
                            <Badge label={`${item._count?.submissions ?? 0} submissions`} tone="cyan" />
                          </View>

                          <Text style={styles.title} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={styles.status}>{formatTimeAgo(item.createdAt)}</Text>
                          <Text style={styles.hint}>Tap to review details and student submissions.</Text>
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
  createCard: {
    gap: 18
  },
  createCopy: {
    gap: 8
  },
  challengeCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    padding: 14
  },
  challengeCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }]
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14
  },
  previewWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.darkBg,
    width: 96,
    aspectRatio: 9 / 16
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  previewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 6
  },
  previewFallbackIcon: {
    color: colors.secondary,
    fontSize: 20,
    fontWeight: "800"
  },
  previewFallbackText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center"
  },
  infoWrap: {
    flex: 1,
    gap: 8
  },
  cardTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  }
});
