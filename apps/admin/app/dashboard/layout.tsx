import Link from "next/link";
import { logoutAction, requireSession } from "../actions";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "⊞" },
  { href: "/dashboard/users", label: "Users", icon: "👥" },
  { href: "/dashboard/teachers", label: "Teachers", icon: "🎓" },
  { href: "/dashboard/students", label: "Students", icon: "📚" },
  { href: "/dashboard/classes", label: "Classes", icon: "🏫" }
];

const adminOnlyItems = [
  { href: "/dashboard/admins", label: "Admin & Moderators", icon: "🔐" }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo-mark">D</span>
          <span className="sidebar-title">Duetto Admin</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-item">
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {isAdmin &&
            adminOnlyItems.map((item) => (
              <Link key={item.href} href={item.href} className="nav-item">
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="sidebar-footer">
          <div className="session-info">
            <div className="session-name">{session.name}</div>
            <div className="session-role">{session.role}</div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn-logout">Sign out</button>
          </form>
        </div>
      </aside>

      <main className="page-content">{children}</main>
    </div>
  );
}
