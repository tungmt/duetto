import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../actions/api";
import { styles } from "../../actions/styles";
import AppLogo from "../../components/AppLogo";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import IconCircleButton from "../../components/IconCircleButton";
import Text from "../../components/Text";
import colors from "../../configs/colors";

type ClassRoom = { id: string; name: string; _count?: { enrollments: number; challenges: number } };
type ClassesScreenNavigationProp = NativeStackNavigationProp<any, "ClassesTab">;

export default function ClassesScreen() {
  const navigation = useNavigation<ClassesScreenNavigationProp>();
  const insets = useSafeAreaInsets();
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
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: navigation.canGoBack() ? "space-between" : "flex-end",
                marginBottom: 20
              }}
            >
              {navigation.canGoBack() ? (
                <IconCircleButton icon="arrow-back" onPress={() => navigation.goBack()} />
              ) : null}
              <Badge label="Class Workspace" tone="neutral" />
            </View>

            <AppLogo color={colors.primary} icon="school-outline" />

            <Text style={[styles.heading, { marginTop: 20, marginBottom: 6 }]}>Classes</Text>
            <Text style={[styles.subheading, { marginBottom: 28 }]}>Manage your student classes and open detailed rosters.</Text>

            {loading && classes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading classes...</Text>
              </View>
            ) : classes.length === 0 ? (
              <View style={[styles.card, styles.emptyContainer, { alignItems: "flex-start", gap: 12 }]}>
                <Badge label="Ready to Start" tone="neutral" />
                <Text style={styles.title}>No classes yet</Text>
                <Text style={[styles.subtitle, { marginTop: 0 }]}>Create your first class to start adding students and challenges.</Text>
                <Button
                  title="Create First Class"
                  icon="add-circle-outline"
                  iconPosition="left"
                  onPress={() => navigation.navigate("CreateClass")}
                  style={{ minWidth: 220, marginTop: 4 }}
                />
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={[styles.card, { gap: 16 }]}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Badge label={`${classes.length} Active Class${classes.length === 1 ? "" : "es"}`} tone="pink" />
                      <Text style={[styles.title, { marginTop: 12 }]}>Your Classes</Text>
                      <Text style={[styles.subtitle, { marginTop: 6 }]}>Tap a class card to view students, challenges, and roster details.</Text>
                    </View>
                    <Button
                      title="Add Class"
                      icon="add"
                      iconPosition="left"
                      onPress={() => navigation.navigate("CreateClass")}
                      style={{ paddingHorizontal: 18 }}
                    />
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Your Classes</Text>
                <FlatList
                  scrollEnabled={false}
                  data={classes}
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
                      onPress={() => navigation.navigate("ClassDetail", { classId: item.id, className: item.name })}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.title}>{item.name}</Text>
                          <Text style={[styles.subtitle, { marginTop: 6 }]}>Open class details, student roster, and progress.</Text>
                        </View>
                        <Badge
                          label={`${item._count?.enrollments ?? 0} Student${(item._count?.enrollments ?? 0) === 1 ? "" : "s"}`}
                          tone={(item._count?.enrollments ?? 0) > 0 ? "cyan" : "neutral"}
                        />
                      </View>

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                        <Badge
                          label={`${item._count?.enrollments ?? 0} Enrolled`}
                          tone={(item._count?.enrollments ?? 0) > 0 ? "cyan" : "neutral"}
                        />
                        <Badge
                          label={`${item._count?.challenges ?? 0} Challenge${(item._count?.challenges ?? 0) === 1 ? "" : "s"}`}
                          tone="yellow"
                        />
                      </View>

                      <Text style={[styles.link, { marginTop: 14 }]}>Open Class</Text>
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
