import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type ClassRoom = { id: string; name: string; _count?: { enrollments: number; challenges: number } };
type ClassesScreenNavigationProp = NativeStackNavigationProp<any, "ClassesTab">;

export default function ClassesScreen() {
  const navigation = useNavigation<ClassesScreenNavigationProp>();
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
                <Text style={styles.heroTitle}>Classes</Text>

                {classes.length > 0 ? (
                  <Pressable style={[styles.button, { minHeight: 44, paddingVertical: 10, paddingHorizontal: 14 }]} onPress={() => navigation.navigate("CreateClass")}>
                    <Text style={[styles.buttonText, { fontSize: 14 }]}>+ Add Class</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.heroEyebrow}>Class Workspace</Text>
              <Text style={styles.heroSubtitle}>Manage your student classes and open class details.</Text>
            </View>

            {loading && classes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>Loading classes...</Text>
              </View>
            ) : classes.length === 0 ? (
              <View style={[styles.emptyContainer, styles.card]}>
                <Text style={styles.title}>No classes yet</Text>
                <Text style={[styles.status, { textAlign: "center" }]}>Create your first class to start adding students and challenges.</Text>
                <Pressable style={[styles.button, { marginTop: 8, minWidth: 220 }]} onPress={() => navigation.navigate("CreateClass")}>
                  <Text style={styles.buttonText}>Create First Class</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Your Classes</Text>
                <Text style={[styles.status, { marginBottom: 8 }]}>Tap a class to view students and details.</Text>
                <FlatList
                  scrollEnabled={false}
                  data={classes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.row}
                      onPress={() => navigation.navigate("ClassDetail", { classId: item.id, className: item.name })}
                    >
                      <Text style={styles.title}>{item.name}</Text>
                      <Text style={styles.status}>
                        {item._count?.enrollments ?? 0} student{item._count?.enrollments !== 1 ? "s" : ""}
                      </Text>
                      <Text style={[styles.link, { marginTop: 8 }]}>Open Class</Text>
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
