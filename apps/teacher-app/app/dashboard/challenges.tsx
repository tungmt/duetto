import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type ChallengesScreenNavigationProp = NativeStackNavigationProp<any, "ChallengesTab">;

type Challenge = { id: string; title: string; status: string; _count?: { submissions: number } };

export default function TeacherChallengesScreen() {
  const navigation = useNavigation<ChallengesScreenNavigationProp>();
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={[styles.heroCard, { marginBottom: 2 }]}>
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
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.status}>{item.status} • {item._count?.submissions ?? 0} submissions</Text>
                        <Text style={styles.link}>Open details →</Text>
                      </Pressable>
                  )}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
