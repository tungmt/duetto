import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#eef3f8" },
  container: { gap: 16, padding: 20, paddingBottom: 40 },
  scrollContent: { paddingBottom: 40 },

  // Hero header
  heroCard: {
    backgroundColor: "#0f2742",
    borderRadius: 20,
    padding: 18,
    gap: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4
  },
  backButton: {
    backgroundColor: "rgba(147, 197, 253, 0.2)",
    borderColor: "rgba(147, 197, 253, 0.5)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  backButtonText: {
    color: "#dbeafe",
    fontSize: 13,
    fontWeight: "700"
  },
  heroEyebrow: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  heroTitle: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20
  },
  
  // Typography
  heading: { color: "#0f172a", fontSize: 32, fontWeight: "800", marginBottom: 4 },
  subheading: { color: "#475569", fontSize: 16, fontWeight: "500", marginBottom: 20 },
  sectionTitle: { color: "#0f172a", fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 12 },
  title: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#64748b", fontSize: 14, fontWeight: "500", marginTop: 6 },
  status: { color: "#64748b", fontSize: 13, marginTop: 4, fontWeight: "500" },
  hint: { color: "#64748b", fontSize: 12, marginTop: 2 },
  
  // Cards and containers
  card: {
    backgroundColor: "white",
    borderColor: "#dbe4ef",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  cardDark: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ef",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  row: { 
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 12,
    padding: 16,
    borderColor: "#dbe4ef",
    borderWidth: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  
  // Inputs
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4ef",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
    fontWeight: "500"
  },
  inputFocused: {
    borderColor: "#3b82f6",
    backgroundColor: "white"
  },
  inputMultiline: {
    textAlignVertical: "top",
    minHeight: 120
  },
  
  // Buttons
  button: {
    backgroundColor: "#0369a1",
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
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonSecondaryText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700"
  },
  buttonDanger: {
    backgroundColor: "#ef4444"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  
  // Actions and layout
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  inline: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  
  // Links
  link: { color: "#0c4a6e", fontSize: 15, fontWeight: "700", marginTop: 12 },
  
  // Video container
  videoContainer: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 16,
    backgroundColor: "#000",
    overflow: "hidden",
    marginTop: 16
  },
  
  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    marginTop: 12
  }
});
