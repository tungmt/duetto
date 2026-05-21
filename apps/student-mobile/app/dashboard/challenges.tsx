import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type Challenge = { id: string; title: string; description?: string | null };

export default function StudentChallengesScreen() {
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
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.heading}>Challenges</Text>
            <Text style={styles.subheading}>Practice and submit your answers</Text>
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
                <Link href={{ pathname: "/dashboard/challenge-detail", params: { id: item.id } }} asChild>
                  <View style={styles.row}>
                    <View>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.status}>{item.description ?? "Teacher challenge"}</Text>
                    </View>
                    <Text style={[styles.link, { marginTop: 12 }]}>View & Answer →</Text>
                  </View>
                </Link>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
