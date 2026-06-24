import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, ScrollView, Text, View, Pressable } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type Challenge = { id: string; title: string; description?: string | null };

export default function ChallengesScreen({ navigation }: any) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api("/api/videos");
      setChallenges(data.videos);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={[styles.heroCard, { marginBottom: 2 }]}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>Challenges</Text>
            </View>
            <Text style={styles.heroEyebrow}>Practice Zone</Text>
            <Text style={styles.heroSubtitle}>Practice and submit your answers.</Text>
          </View>

          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.status}>Loading challenges...</Text>
            </View>
          ) : challenges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.status}>No challenges available yet</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={challenges}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  onPress={() => navigation.navigate("ChallengeDetail", { id: item.id })}
                  style={styles.row}
                >
                  <View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.status}>{item.description ?? "Teacher challenge"}</Text>
                  </View>
                  <Text style={[styles.link, { marginTop: 12 }]}>View & Answer →</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
