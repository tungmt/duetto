import "./styles.css";

export const metadata = {
  title: "Duetto Admin",
  description: "Admin console for Duetto phase 1"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
