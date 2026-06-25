import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import nav from "../../src/navigation";
import { styles } from "../../src/styles";

type TeacherChallenge = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  _count?: { submissions: number };
};

type Teacher = {
  id: string;
  name: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  headline?: string | null;
  yearsExperience?: number | null;
  school?: { id: string; name: string } | null;
  challenges: TeacherChallenge[];
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "T";
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "T";
}

function formatTimeAgo(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function TeacherDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const teacherId = route.params?.teacherId;
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeacher() {
      if (!teacherId) {
        Alert.alert("Missing teacher", "Teacher ID is missing.");
        return;
      }
      setLoading(true);
      try {
        const data = await api(`/api/teachers/${teacherId}`);
        setTeacher(data.teacher ?? null);
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "Could not load teacher profile");
      } finally {
        setLoading(false);
      }
    }

    loadTeacher();
  }, [teacherId]);

  if (loading) {
    return (
      <View style={styles.safe}>
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>Loading teacher...</Text>
        </View>
      </View>
    );
  }

  if (!teacher) {
    return (
      <View style={styles.safe}>
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.status}>Teacher not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View
            style={[
              styles.heroCard,
              {
                marginHorizontal: -20,
                marginTop: -20,
                paddingTop: insets.top + 16,
                paddingHorizontal: 16,
                paddingBottom: 16
              }
            ]}
          >
            <View style={styles.heroTopRow}>
              <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={styles.heroTitle}>Teacher Profile</Text>
            </View>
            <Text style={styles.heroEyebrow}>Instructor</Text>
            <Text style={styles.heroSubtitle}>See this teacher’s background and published challenge list.</Text>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              {teacher.avatarUrl ? (
                <Image
                  source={{ uri: teacher.avatarUrl }}
                  style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "#cbd5e1" }}
                />
              ) : (
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    backgroundColor: "#0369a1",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "800" }}>{getInitials(teacher.displayName)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{teacher.displayName}</Text>
                <Text style={styles.subtitle}>{teacher.headline || teacher.name}</Text>
                {teacher.school?.name ? <Text style={styles.status}>School: {teacher.school.name}</Text> : null}
                {typeof teacher.yearsExperience === "number" ? (
                  <Text style={styles.status}>{teacher.yearsExperience} years experience</Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.status}>{teacher.bio || "This teacher has not added a bio yet."}</Text>
          </View>

          <Text style={styles.sectionTitle}>Challenges by {teacher.displayName}</Text>
          {teacher.challenges.length === 0 ? (
            <View style={styles.cardDark}>
              <Text style={styles.status}>No published challenges available yet.</Text>
            </View>
          ) : (
            teacher.challenges.map((challenge) => (
              <Pressable
                key={challenge.id}
                style={styles.row}
                onPress={() => nav.navigate("ChallengeDetail", { id: challenge.id })}
              >
                <Text style={styles.title}>{challenge.title}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>{challenge.description || "Teacher challenge"}</Text>
                <Text style={styles.status}>
                  {formatTimeAgo(challenge.createdAt)} • {challenge._count?.submissions ?? 0} answers
                </Text>
                <Text style={styles.link}>Open challenge →</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

