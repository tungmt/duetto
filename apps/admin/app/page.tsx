const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchJson(path: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "x-user-id": "admin-dev-user",
      "x-role": "ADMIN"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function AdminHome() {
  const overview = await fetchJson("/api/admin/overview");
  const counts = overview?.counts ?? {};
  const users = overview?.users ?? [];
  const schools = overview?.schools ?? [];
  const classes = overview?.classes ?? [];
  const challenges = overview?.challenges ?? [];
  const submissions = overview?.submissions ?? [];

  return (
    <main>
      <div className="shell">
        <div className="topbar">
          <div>
            <h1 className="title">Duetto Admin</h1>
            <p className="muted">Phase-1 learning challenge operations</p>
          </div>
          <span className="badge">MVP</span>
        </div>

        <div className="grid">
          <div className="panel">
            <div className="muted">Users</div>
            <p className="metric">{counts.users ?? 0}</p>
          </div>
          <div className="panel">
            <div className="muted">Pending verification</div>
            <p className="metric">{counts.pendingVerification ?? 0}</p>
          </div>
          <div className="panel">
            <div className="muted">Schools / classes</div>
            <p className="metric">
              {counts.schools ?? 0} / {counts.classes ?? 0}
            </p>
          </div>
        </div>

        <section className="section">
          <h2>Recent Users</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Account</th>
                <th>School</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map(
                (user: {
                  id: string;
                  name: string;
                  role: string;
                  accountStatus: string;
                  createdAt: string;
                  teacherProfile?: { school?: { name: string } | null } | null;
                  studentProfile?: { school?: { name: string } | null } | null;
                }) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>
                      {user.role}
                      {user.teacherProfile ? " / TEACHER" : ""}
                      {user.studentProfile ? " / STUDENT" : ""}
                    </td>
                    <td>{user.accountStatus}</td>
                    <td>
                      {user.teacherProfile?.school?.name ??
                        user.studentProfile?.school?.name ??
                        "Independent"}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </section>

        <section className="section columns">
          <div>
            <h2>Schools</h2>
            <table className="table">
              <tbody>
                {schools.map((school: { id: string; name: string }) => (
                  <tr key={school.id}>
                    <td>{school.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2>Classes</h2>
            <table className="table">
              <tbody>
                {classes.map(
                  (classRoom: {
                    id: string;
                    name: string;
                    school?: { name: string };
                    teacher?: { name: string };
                  }) => (
                    <tr key={classRoom.id}>
                      <td>
                        <strong>{classRoom.name}</strong>
                        <div className="muted">
                          {classRoom.school?.name ?? "No school"} -{" "}
                          {classRoom.teacher?.name ?? "No teacher"}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>Recent Submissions</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Challenge</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(
                (submission: {
                  id: string;
                  status: string;
                  score?: number | null;
                  challenge?: { title: string };
                  student?: { name: string };
                }) => (
                  <tr key={submission.id}>
                    <td>{submission.student?.name ?? "Unknown"}</td>
                    <td>{submission.challenge?.title ?? "Unknown"}</td>
                    <td>{submission.status}</td>
                    <td>{submission.score ?? "-"}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
