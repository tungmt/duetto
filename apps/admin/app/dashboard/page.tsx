import Link from "next/link";
import { adminFetch, requireSession } from "../actions";

export default async function DashboardOverview() {
  const session = await requireSession();
  
  // Fetch overview data and centers for system admin view
  const overview = await adminFetch("/api/admin/overview", session).catch(() => null);
  const centersData = await adminFetch("/api/admin/centers", session).catch(() => ({ schools: [] }));
  const schools = centersData.schools;

  const counts = overview?.counts ?? {};
  const recentUsers = (overview?.users ?? []).slice(0, 8);
  const recentSubmissions = (overview?.submissions ?? []).slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Platform at a glance</p>
        
        {/* System Admin Badge - removed as adminType is not available in session */}
      </div>

      {/* Center Statistics Card */}
      <div className="card mb-6">
        <h2 className="section-heading mb-3">Center Overview</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Center Name</th>
              <th>ID</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school: any) => (
              <tr key={school.id}>
                <td>
                  <Link href={`/dashboard/centers/${school.id}`} className="table-link">
                    <span className="text-blue-600 hover:text-blue-800">{school.name}</span>
                  </Link>
                </td>
                <td><code>{school.id}</code></td>
                <td className="muted text-sm">{school.description || "—"}</td>
                <td>
                  <button onClick={() => alert(`Manage center: ${school.id}`)}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Statistics Grid */}
      <div className="stat-grid">
        {[
          { label: "Total users", value: counts.users ?? 0, href: "/dashboard/users" },
          { label: "Teachers", value: counts.teachers ?? 0, href: "/dashboard/teachers" },
          { label: "Students", value: counts.students ?? 0, href: "/dashboard/students" },
          { label: "Classes", value: counts.classes ?? 0, href: "/dashboard/classes" },
          { label: "Challenges", value: counts.challenges ?? 0 },
          { label: "Submissions", value: counts.submissions ?? 0 },
          { label: "Centers", value: schools.length }
        ].map((s) =>
          s.href ? (
            <Link key={s.label} href={s.href} className="stat-card stat-card-link">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </Link>
          ) : (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          )
        )}
      </div>

      {/* Recent Activity Tables */}
      <div className="two-col">
        <section>
          <h2 className="section-heading">Recent users</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/dashboard/users/${u.id}`} className="table-link">
                        {u.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge badge-${u.role?.toLowerCase() || "user"}`}>{u.role || "User"}</span>
                      {u.teacherProfile && <span className="badge badge-teacher ml-4">T</span>}
                      {u.studentProfile && <span className="badge badge-student ml-4">S</span>}
                    </td>
                    <td>
                      <span className={`badge badge-status-${u.accountStatus?.toLowerCase() || "active"}`}>
                        {u.accountStatus?.replace("_", " ") || "Active"}
                      </span>
                    </td>
                    <td className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="section-heading">Recent submissions</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Challenge</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((s: any) => (
                  <tr key={s.id}>
                    <td>
                      {s.student ? (
                        <Link href={`/dashboard/students/${s.student.id}`} className="table-link">
                          {s.student.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{s.challenge?.title ?? "—"}</td>
                    <td>{s.score != null ? s.score : "—"}</td>
                    <td>
                      <span className={`badge badge-${s.status?.toLowerCase() || "submitted"}`}>{s.status || "Submitted"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
