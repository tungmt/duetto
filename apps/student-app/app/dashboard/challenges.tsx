import { Audio, ResizeMode, Video } from "expo-av";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { styles } from "../../src/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  sourceVideoUrl: string;
  createdAt: string;
  teacher?: {
    id: string;
    name: string;
    teacherProfile?: { displayName?: string | null; avatarUrl?: string | null; headline?: string | null } | null;
  } | null;
  _count?: { submissions: number };
};
type ChallengeResponse = { videos: Challenge[]; paging?: { hasMore?: boolean; nextCursor?: string | null } };

function formatTimeAgo(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y ago`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "T";
}

export default function ChallengesScreen({ navigation }: any) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const insets = useSafeAreaInsets();

  const windowHeight = Dimensions.get("window").height;
  const tabBarHeight = useBottomTabBarHeight();
  const itemHeight = useMemo(() => Math.max(320, windowHeight - tabBarHeight), [tabBarHeight, windowHeight]);
  const listRef = useRef<FlatList<Challenge>>(null);

  async function fetchChallenges(loadMore = false) {
    if (loadMore) {
      if (loadingMore || !hasMore) {
        return;
      }
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({ limit: "5" });
      if (loadMore && nextCursor) {
        params.set("cursor", nextCursor);
      }

      const data = (await api(`/api/videos?${params.toString()}`)) as ChallengeResponse;
      const incoming = data.videos ?? [];

      if (loadMore) {
        setChallenges((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id)) {
              merged.push(item);
            }
          }
          return merged;
        });
      } else {
        setChallenges(incoming);
      }

      setHasMore(Boolean(data.paging?.hasMore));
      setNextCursor(data.paging?.nextCursor ?? null);
    } catch (error) {
      // Handle error silently
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchChallenges(false);
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeId && challenges.length > 0) {
      setActiveId(challenges[0].id);
    }
  }, [activeId, challenges]);

  useFocusEffect(
    useCallback(() => {
      // Resume auto-play when screen is focused
      return () => {
        // Pause video when screen loses focus (navigating away)
        setActiveId(null);
      };
    }, [])
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item: Challenge }> }) => {
    if (!viewableItems?.length) {
      return;
    }
    const centered = viewableItems[0]?.item;
    if (centered?.id) {
      setActiveId(centered.id);
    }
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80
  });

  return (
    <View style={styles.safe}>
      {loading ? (
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>Loading challenges...</Text>
        </View>
      ) : challenges.length === 0 ? (
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>No challenges with video available yet</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={challenges}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          pagingEnabled
          snapToInterval={itemHeight}
          decelerationRate="fast"
          contentContainerStyle={{ paddingBottom: 0 }}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          onEndReachedThreshold={0.7}
          onEndReached={() => {
            fetchChallenges(true);
          }}
          renderItem={({ item }) => {
            const isActive = activeId === item.id;
            const answerCount = item._count?.submissions ?? 0;
            const teacherName = item.teacher?.teacherProfile?.displayName || item.teacher?.name || "Teacher";
            return (
              <View style={[localStyles.itemWrap, { height: itemHeight }]}>
                <Video
                  source={{ uri: item.sourceVideoUrl }}
                  style={localStyles.video}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  shouldPlay={isActive}
                  isMuted={isMuted}
                />

                <View style={localStyles.topBadgeWrap}>
                  <Text style={localStyles.topBadgeText}>
                    Practice Zone
                  </Text>
                </View>

                <View style={[localStyles.bottomFade]} />

                <Pressable onPress={() => nav.navigate("ChallengeDetail", { id: item.id })} style={[localStyles.infoOverlay, { bottom: 0 }]}>
                  <Text style={localStyles.challengeTitle} numberOfLines={2}>{item.title}</Text>
                  {item.teacher?.id ? (
                    <Pressable
                      onPress={() => nav.navigate("TeacherDetail", { teacherId: item.teacher?.id })}
                      style={localStyles.compactMetaRow}
                    >
                      <Text style={localStyles.compactMetaText} numberOfLines={1}>
                        @{teacherName} • {formatTimeAgo(item.createdAt)} • {answerCount} answers
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={localStyles.compactMetaText} numberOfLines={1}>
                      @{teacherName} • {formatTimeAgo(item.createdAt)} • {answerCount} answers
                    </Text>
                  )}
                </Pressable>

                <View style={[localStyles.actionRail, { top: insets.top + 12 }]}>
                  <Pressable
                    onPress={() => setIsMuted((prev) => !prev)}
                    style={localStyles.railButton}
                  >
                    <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="#ffffff" />
                  </Pressable>

                </View>
              </View>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <Text style={styles.status}>Loading more videos...</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  itemWrap: {
    backgroundColor: "#0b1220"
  },
  video: {
    width: "100%",
    height: "100%"
  },
  topBadgeWrap: {
    position: "absolute",
    left: 12,
    top: 14,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  topBadgeText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: "rgba(15, 23, 42, 0.45)"
  },
  infoOverlay: {
    position: "absolute",
    left: 14,
    right: 80,
    gap: 2,
    height: 80, alignItems: "flex-start", justifyContent: 'center'
  },
  compactMetaRow: {
    alignSelf: "flex-start"
  },
  compactMetaText: {
    color: "#bae6fd",
    fontSize: 11,
    fontWeight: "700"
  },
  challengeTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800"
  },
  actionRail: {
    position: "absolute",
    right: 14,
    alignItems: "center",
    gap: 10
  },
  railButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.35)"
  }
});

