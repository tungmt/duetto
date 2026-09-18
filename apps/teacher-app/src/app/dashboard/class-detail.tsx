import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import AppLogo from "../../components/AppLogo";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

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
  const insets = useSafeAreaInsets();
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
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              <Badge label="Class Detail" tone="neutral" />
            </View>

            <AppLogo color={colors.secondary} icon="library-outline" />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]} numberOfLines={2}>
              {classDetail?.name ?? className ?? "Class Detail"}
            </Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>
              {classDetail?.description || "View students in this class and manage enrollment."}
            </Text>

            <View style={[styles.card, { gap: 16 }]}> 
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Badge
                  label={`${classDetail?._count?.enrollments ?? 0} Student${(classDetail?._count?.enrollments ?? 0) === 1 ? "" : "s"}`}
                  tone="cyan"
                />
                <Badge
                  label={`${classDetail?._count?.challenges ?? 0} Challenge${(classDetail?._count?.challenges ?? 0) === 1 ? "" : "s"}`}
                  tone="yellow"
                />
              </View>

              <View>
                <Text style={styles.title}>Class Overview</Text>
                <Text style={[styles.subtitle, { marginTop: 6 }]}>Keep this roster up to date and add new students when they join your class.</Text>
              </View>

              <Button
                title="Add New Student"
                icon="person-add-outline"
                iconPosition="left"
                onPress={() => navigation.navigate("CreateStudent", { classId, className: classDetail?.name ?? className })}
              />
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading students...</Text>
              </View>
            ) : (classDetail?.students.length ?? 0) === 0 ? (
              <View style={[styles.card, styles.emptyContainer, { alignItems: "flex-start", gap: 12 }]}>
                <Badge label="Roster Empty" tone="neutral" />
                <Text style={styles.title}>No students enrolled yet</Text>
                <Text style={[styles.subtitle, { marginTop: 0 }]}>Add a student account to start assigning challenges in this class.</Text>
                <Button
                  title="Create Student"
                  icon="add-circle-outline"
                  iconPosition="left"
                  onPress={() => navigation.navigate("CreateStudent", { classId, className: classDetail?.name ?? className })}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Students</Text>
                <FlatList
                  scrollEnabled={false}
                  data={classDetail?.students ?? []}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.row,
                        {
                          marginTop: 0,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.99 : 1 }]
                        }
                      ]}
                      onPress={() =>
                        navigation.navigate("StudentDetail", {
                          classId,
                          studentId: item.id,
                          studentName: item.displayName || item.name
                        })
                      }
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.title}>{item.displayName || item.name}</Text>
                          <Text style={[styles.subtitle, { marginTop: 6 }]}>{item.email}</Text>
                        </View>
                        <Badge label={item.gradeLevel || "No grade"} tone={item.gradeLevel ? "pink" : "neutral"} />
                      </View>
                      <Text style={[styles.link, { marginTop: 14 }]}>Open Student</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
