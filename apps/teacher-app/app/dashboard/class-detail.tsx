import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/styles";

type ClassDetailRoute = RouteProp<{ ClassDetail: { classId: string; className?: string } }, "ClassDetail">;
type ClassDetailNavigationProp = NativeStackNavigationProp<any, "ClassDetail">;

type ClassStudent = {
  id: string;
  name: string;
  email: string;
  displayName?: string;
  avatarUrl?: string | null;
  gradeLevel?: string | null;
};

type ClassDetailResponse = {
  class: {
    id: string;
    name: string;
    description?: string | null;
    _count?: { enrollments: number; challenges: number };
    students: ClassStudent[];
  };
};

export default function ClassDetailScreen() {
  const navigation = useNavigation<ClassDetailNavigationProp>();
  const route = useRoute<ClassDetailRoute>();
  const { classId, className } = route.params;

  const [classDetail, setClassDetail] = useState<ClassDetailResponse["class"] | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api(`/api/classes/${classId}`);
      setClassDetail(data.class);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not load class detail");
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [classId])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={[styles.heroCard, { marginBottom: 2 }]}>
              <View style={styles.heroTopRow}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.heroTitle} numberOfLines={1}>{classDetail?.name ?? className ?? "Class Detail"}</Text>
              </View>
              <Text style={styles.heroEyebrow}>Class Detail</Text>
              <Text style={styles.heroSubtitle}>{classDetail?.description || "View students in this class"}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Class Overview</Text>
              <Text style={styles.status}>Students: {classDetail?._count?.enrollments ?? 0}</Text>
              <Text style={styles.status}>Challenges: {classDetail?._count?.challenges ?? 0}</Text>
              <Pressable
                style={[styles.button, { marginTop: 12 }]}
                onPress={() => navigation.navigate("CreateStudent", { classId, className: classDetail?.name ?? className })}
              >
                <Text style={styles.buttonText}>Add New Student</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>Loading students...</Text>
              </View>
            ) : (classDetail?.students.length ?? 0) === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.status}>No students enrolled in this class yet.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Students</Text>
                <FlatList
                  scrollEnabled={false}
                  data={classDetail?.students ?? []}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.row}
                      onPress={() =>
                        navigation.navigate("StudentDetail", {
                          classId,
                          studentId: item.id,
                          studentName: item.displayName || item.name
                        })
                      }
                    >
                      <Text style={styles.title}>{item.displayName || item.name}</Text>
                      <Text style={styles.status}>{item.email}</Text>
                      <Text style={styles.status}>{item.gradeLevel || "No grade level set"}</Text>
                      <Text style={[styles.link, { marginTop: 8 }]}>Open Student</Text>
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
