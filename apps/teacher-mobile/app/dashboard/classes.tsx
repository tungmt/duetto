import { useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type ClassRoom = { id: string; name: string; _count?: { enrollments: number; challenges: number } };

export default function ClassesScreen() {
  const [name, setName] = useState("");
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api("/api/classes");
      setClasses(data.classes);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function createClass() {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter a class name.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/classes", { method: "POST", body: JSON.stringify({ name }) });
      Alert.alert("Success", "Class created.");
      setName("");
      await refresh();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not create class");
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.heading}>Classes</Text>
              <Text style={styles.subheading}>Manage your student classes</Text>
            </View>

            <View style={{ gap: 12, marginBottom: 24 }}>
              <View>
                <Text style={[styles.title, { marginBottom: 8 }]}>Class Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Period 1 English"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={createClass}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? "Creating..." : "Create Class"}</Text>
              </Pressable>
            </View>

            {loading && classes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>Loading classes...</Text>
              </View>
            ) : classes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>No classes yet. Create your first class above.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Your Classes</Text>
                <FlatList
                  scrollEnabled={false}
                  data={classes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.row}>
                      <Text style={styles.title}>{item.name}</Text>
                      <Text style={styles.status}>
                        {item._count?.enrollments ?? 0} student{item._count?.enrollments !== 1 ? "s" : ""}
                      </Text>
                    </View>
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
