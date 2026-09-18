import { StyleSheet } from "react-native";
import colors from "../configs/colors";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgColor },
  container: { gap: 18, padding: 20, paddingBottom: 32 },
  scrollContent: { backgroundColor: colors.bgColor, paddingBottom: 32 },

  // Hero header
  heroCard: {
    backgroundColor: colors.bgColor,
    gap: 8
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 54,
    gap: 12
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700"
  },
  heroEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  heroTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20
  },
  
  // Typography
  heading: { color: colors.textPrimary, fontSize: 28, fontWeight: "800", marginBottom: 4 },
  subheading: { color: colors.textSecondary, fontSize: 16, fontWeight: "500", marginBottom: 18 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 18, marginBottom: 10 },
  sectionLabel: { color: colors.secondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, fontSize: 14, fontWeight: "500", marginTop: 6 },
  status: { color: colors.textTertiary, fontSize: 13, marginTop: 4, fontWeight: "500" },
  hint: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
  link: { color: colors.secondary, fontSize: 15, fontWeight: "700" },
  
  // Cards and containers
  card: {
    backgroundColor: colors.cardBg,
    borderColor: colors.borderColor,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: "#342B43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  row: { 
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
    borderColor: colors.borderColor,
    borderWidth: 1,
    shadowColor: "#342B43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  
  // Inputs
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.borderColor,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "500"
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.inputBg
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  
  // Buttons
  button: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.cardBg,
    borderColor: colors.borderColor,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
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
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600"
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
    backgroundColor: colors.darkBg,
    borderRadius: 16,
    minHeight: 220,
    padding: 16,
    justifyContent: "center"
  },
  previewText: { color: colors.textPrimary }
});
