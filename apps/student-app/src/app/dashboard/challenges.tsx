import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { setAudioModeAsync } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import { Dimensions, FlatList, Image, Pressable, Share, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../actions/api";
import nav from "../../actions/navigation";
import { styles } from "../../actions/styles";
import Text from "../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../../configs/colors";

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

type ChallengeFeedItemProps = {
  item: Challenge;
  isActive: boolean;
  isScreenFocused: boolean;
  isMuted: boolean;
  itemHeight: number;
  topInset: number;
  onToggleMute: () => void;
  onOpenChallenge: (challengeId: string) => void;
};

function ChallengeFeedItem({ item, isActive, isScreenFocused, isMuted, itemHeight, topInset, onToggleMute, onOpenChallenge }: ChallengeFeedItemProps) {
  const answerCount = item._count?.submissions ?? 0;
  const teacherName = item.teacher?.teacherProfile?.displayName || item.teacher?.name || "Teacher";

  const player = useVideoPlayer(item.sourceVideoUrl, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = isMuted;
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isScreenFocused && isActive) {
      player.play();
      return;
    }

    player.pause();
    player.currentTime = 0;
  }, [isActive, isScreenFocused, player]);

  function openChallengeDetail() {
    player.pause();
    player.currentTime = 0;
    onOpenChallenge(item.id);
  }

  async function shareChallenge() {
    await Share.share({
      message: `${item.title}\n${item.sourceVideoUrl}`
    });
  }

  function openTeacherProfile() {
    if (item.teacher?.id) {
      nav.navigate("TeacherDetail", { teacherId: item.teacher.id });
    }
  }

  return (
    <View style={[localStyles.itemWrap, { height: itemHeight }]}>
      <VideoView
        player={player}
        style={localStyles.video}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={[localStyles.topChrome, { paddingTop: topInset + 8 }]}>
        <Text style={localStyles.topTabMuted}>Following</Text>
        <View style={localStyles.topTabActiveWrap}>
          <Text style={localStyles.topTabActive}>For you</Text>
          <View style={localStyles.topTabUnderline} />
        </View>
        <Ionicons name="search" size={25} color="#FFFFFF" />
      </View>

      <View style={localStyles.bottomFade} />

      <View style={localStyles.actionRail}>
        <Pressable onPress={openTeacherProfile} disabled={!item.teacher?.id} style={localStyles.avatarAction}>
          {item.teacher?.teacherProfile?.avatarUrl ? (
            <Image source={{ uri: item.teacher.teacherProfile.avatarUrl }} style={localStyles.railAvatar} />
          ) : (
            <View style={localStyles.railAvatarFallback}>
              <Text style={localStyles.railAvatarText}>{getInitials(teacherName)}</Text>
            </View>
          )}
          <View style={localStyles.followBadge}>
            <Ionicons name="add" size={12} color="#FFFFFF" />
          </View>
        </Pressable>
        <View style={localStyles.actionItem}>
          <Ionicons name="heart-outline" size={30} color={colors.accent} />
          <Text style={localStyles.actionLabel}>Like</Text>
        </View>
        <View style={localStyles.actionItem}>
          <Ionicons name="chatbubble-outline" size={27} color="#FFFFFF" />
          <Text style={localStyles.actionCount}>{answerCount}</Text>
        </View>
        <Pressable onPress={shareChallenge} style={localStyles.actionItem}>
          <Ionicons name="share-social-outline" size={28} color="#FFFFFF" />
          <Text style={localStyles.actionLabel}>Share</Text>
        </Pressable>
        <Pressable onPress={onToggleMute} style={localStyles.musicButton}>
          <Ionicons name={isMuted ? "volume-mute" : "musical-notes"} size={23} color="#FFFFFF" />
        </Pressable>
      </View>

      <Pressable onPress={openChallengeDetail} style={localStyles.duetCard}>
        <Text style={localStyles.duetLabel}>Duet To</Text>
        <View style={localStyles.duetTiles}>
          <View style={localStyles.duetTile}>
            {item.teacher?.teacherProfile?.avatarUrl ? (
              <Image source={{ uri: item.teacher.teacherProfile.avatarUrl }} style={localStyles.duetImage} />
            ) : (
              <View style={[localStyles.duetImage, localStyles.duetFallback]}>
                <Ionicons name="person" size={22} color="#FFFFFF" />
              </View>
            )}
            <Text style={localStyles.duetTileLabel}>For You</Text>
          </View>
          <View style={localStyles.duetTile}>
            <View style={[localStyles.duetImage, localStyles.originalTile]}>
              <Ionicons name="play" size={22} color="#FFFFFF" />
            </View>
            <Text style={localStyles.duetTileLabel}>Original</Text>
          </View>
        </View>
      </Pressable>

      <Pressable onPress={openChallengeDetail} style={localStyles.infoOverlay}>
        <Text style={localStyles.teacherName} numberOfLines={1}>@{teacherName}</Text>
        <Text style={localStyles.description} numberOfLines={2}>
          {item.description || item.title}
        </Text>
        <Text style={localStyles.hashtags}>#duetto #challenge</Text>
        <View style={localStyles.musicMeta}>
          <Ionicons name="musical-note" size={13} color="#FFFFFF" />
          <Text style={localStyles.musicText} numberOfLines={1}>
            {item.title} · {teacherName} · {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function ChallengesScreen({ route }: any) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const insets = useSafeAreaInsets();
  const isScreenFocused = useIsFocused();

  const windowHeight = Dimensions.get("window").height;
  const tabBarHeight = useBottomTabBarHeight();
  const itemHeight = useMemo(() => Math.max(320, windowHeight - tabBarHeight), [tabBarHeight, windowHeight]);
  const listRef = useRef<FlatList<Challenge>>(null);
  const lastActiveIdRef = useRef<string | null>(null);
  const handledCreateActionRef = useRef<number | null>(null);

  const handleOpenChallenge = useCallback((challengeId: string) => {
    lastActiveIdRef.current = activeId || challengeId;
    setActiveId(null);
    nav.navigate("ChallengeDetail", { id: challengeId });
  }, [activeId]);

  useEffect(() => {
    const createActionAt = route.params?.openActiveChallengeAt;
    if (
      typeof createActionAt !== "number" ||
      createActionAt === handledCreateActionRef.current ||
      !activeId
    ) {
      return;
    }

    handledCreateActionRef.current = createActionAt;
    handleOpenChallenge(activeId);
  }, [activeId, handleOpenChallenge, route.params?.openActiveChallengeAt]);

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
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "duckOthers"
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeId && challenges.length > 0) {
      setActiveId(challenges[0].id);
    }
  }, [activeId, challenges]);

  useEffect(() => {
    if (activeId) {
      lastActiveIdRef.current = activeId;
    }
  }, [activeId]);

  useFocusEffect(
    useCallback(() => {
      const preferredId = lastActiveIdRef.current;
      const fallbackId = challenges[0]?.id ?? null;
      const nextActiveId = preferredId && challenges.some((item) => item.id === preferredId)
        ? preferredId
        : fallbackId;

      if (nextActiveId) {
        setActiveId(nextActiveId);
      }

      return () => {
        if (activeId) {
          lastActiveIdRef.current = activeId;
        }
        setActiveId(null);
      };
    }, [activeId, challenges])
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
            return (
              <ChallengeFeedItem
                item={item}
                isActive={activeId === item.id}
                isScreenFocused={isScreenFocused}
                isMuted={isMuted}
                itemHeight={itemHeight}
                topInset={insets.top}
                onToggleMute={() => setIsMuted((prev) => !prev)}
                onOpenChallenge={handleOpenChallenge}
              />
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
    backgroundColor: colors.darkBg
  },
  video: {
    width: "100%",
    height: "100%"
  },
  topChrome: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  topTabMuted: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "700"
  },
  topTabActiveWrap: {
    alignItems: "center",
    gap: 7
  },
  topTabActive: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800"
  },
  topTabUnderline: {
    width: 34,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: "rgba(29, 24, 40, 0.42)"
  },
  infoOverlay: {
    position: "absolute",
    left: 18,
    right: 82,
    bottom: 16,
    gap: 5
  },
  teacherName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  description: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  hashtags: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  musicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2
  },
  musicText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    flex: 1
  },
  actionRail: {
    position: "absolute",
    right: 12,
    bottom: 82,
    alignItems: "center",
    gap: 17
  },
  avatarAction: {
    width: 48,
    height: 52,
    alignItems: "center"
  },
  railAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  railAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.yellow,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  railAvatarText: {
    color: colors.darkBg,
    fontSize: 16,
    fontWeight: "900"
  },
  followBadge: {
    position: "absolute",
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.darkBg,
    alignItems: "center",
    justifyContent: "center"
  },
  actionItem: {
    alignItems: "center",
    gap: 3
  },
  actionCount: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800"
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700"
  },
  musicButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(29,24,40,0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  duetCard: {
    position: "absolute",
    right: 76,
    bottom: 92,
    width: 194,
    padding: 10,
    gap: 7,
    borderRadius: 18,
    backgroundColor: "rgba(29,24,40,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  duetLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center"
  },
  duetTiles: {
    flexDirection: "row",
    gap: 8
  },
  duetTile: {
    flex: 1,
    gap: 4,
    alignItems: "center"
  },
  duetImage: {
    width: "100%",
    height: 54,
    borderRadius: 10
  },
  duetFallback: {
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center"
  },
  originalTile: {
    backgroundColor: "rgba(118,87,255,0.58)",
    alignItems: "center",
    justifyContent: "center"
  },
  duetTileLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700"
  }
});
