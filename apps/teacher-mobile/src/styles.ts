import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  container: { gap: 16, padding: 20, paddingBottom: 40 },
  scrollContent: { paddingBottom: 40 },
  
  // Typography
  heading: { color: "#1a1a1e", fontSize: 32, fontWeight: "800", marginBottom: 4 },
  subheading: { color: "#6b7280", fontSize: 16, fontWeight: "500", marginBottom: 20 },
  sectionTitle: { color: "#1a1a1e", fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 12 },
  title: { color: "#1a1a1e", fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#6b7280", fontSize: 14, fontWeight: "500", marginTop: 6 },
  status: { color: "#9ca3af", fontSize: 13, marginTop: 4, fontWeight: "400" },
  hint: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  link: { color: "#2563eb", fontSize: 15, fontWeight: "600" },
  
  // Cards and containers
  card: {
    backgroundColor: "white",
    borderColor: "#e5e7eb",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2
  },
  row: { 
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 12,
    padding: 16,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2
  },
  
  // Inputs
  input: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a1a1e",
    fontWeight: "500"
  },
  inputFocused: {
    borderColor: "#3b82f6",
    backgroundColor: "white"
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  
  // Buttons
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonSecondary: {
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  buttonSecondaryText: {
    color: "#1a1a1e",
    fontSize: 15,
    fontWeight: "600"
  },
  buttonDanger: {
    backgroundColor: "#ef4444"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  
  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 16,
    fontWeight: "500"
  },
  
  // Actions and layout
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  inline: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  
  // Camera
  camera: {
    aspectRatio: 9 / 16,
    borderRadius: 16,
    minHeight: 420,
    overflow: "hidden"
  },
  preview: {
    backgroundColor: "#1a1a1e",
    borderRadius: 16,
    minHeight: 220,
    padding: 16,
    justifyContent: "center"
  },
  previewText: { color: "white" }
});
