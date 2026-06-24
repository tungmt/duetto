import { ResizeMode, Video } from "expo-av";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, SafeAreaView, Text, View } from "react-native";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { styles } from "../../src/styles";

type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  sourceVideoUrl: string;
  createdAt: string;
  teacher?: { id: string; name: string } | null;
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

export default function ChallengesScreen({ navigation }: any) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

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
    if (!activeId && challenges.length > 0) {
      setActiveId(challenges[0].id);
    }
  }, [activeId, challenges]);

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
    <SafeAreaView style={styles.safe}>
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
            const viewCount = item._count?.submissions ?? 0;
            return (
              <View style={{ height: itemHeight, backgroundColor: "#0b1220" }}>
                <Video
                  source={{ uri: item.sourceVideoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  shouldPlay={isActive}
                  isMuted
                />

                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    paddingHorizontal: 16,
                    paddingTop: 14,
                    paddingBottom: 8,
                    backgroundColor: "rgba(15, 23, 42, 0.35)"
                  }}
                >
                  <Text style={{ color: "#f8fafc", fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" }}>
                    Practice Zone
                  </Text>
                </View>

                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingHorizontal: 16,
                    paddingTop: 20,
                    paddingBottom: tabBarHeight + 18,
                    backgroundColor: "rgba(15, 23, 42, 0.55)"
                  }}
                >
                  <Text style={{ color: "#f8fafc", fontSize: 20, fontWeight: "800" }}>{item.title}</Text>
                  <Text style={{ color: "#cbd5e1", fontSize: 14, marginTop: 6 }} numberOfLines={2}>
                    {item.description ?? "Teacher challenge"}
                  </Text>
                  <Text style={{ color: "#e2e8f0", fontSize: 13, marginTop: 8, fontWeight: "600" }}>
                    By {item.teacher?.name ?? "Teacher"} • {formatTimeAgo(item.createdAt)}
                  </Text>
                  <Text style={{ color: "#bae6fd", fontSize: 13, marginTop: 4, fontWeight: "700" }}>
                    {viewCount} views • {answerCount} answers
                  </Text>

                  <Pressable
                    onPress={() => nav.navigate("ChallengeDetail", { id: item.id })}
                    style={{
                      marginTop: 14,
                      alignSelf: "flex-start",
                      backgroundColor: "#0369a1",
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      paddingVertical: 10
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>Answer This Challenge</Text>
                  </Pressable>

                  <Text style={{ color: "#93c5fd", fontSize: 12, marginTop: 10, fontWeight: "700" }}>
                    {isActive ? "Playing" : "Paused"} • Swipe up/down for next video
                  </Text>
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
    </SafeAreaView>
  );
}
