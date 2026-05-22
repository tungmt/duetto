import Link from "next/link";
import { adminFetch, requireSession } from "../../actions";

export default async function UsersPage() {
  const session = await requireSession();
  const data = await adminFetch("/api/admin/users", session).catch(() => ({ users: [] }));
  const users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    accountStatus: string;
    createdAt: string;
    teacherProfile?: { school?: { name: string } | null } | null;
    studentProfile?: { school?: { name: string } | null } | null;
  }> = data.users ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-sub">{users.length} total</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role / Profile</th>
              <th>Status</th>
              <th>School</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/dashboard/users/${u.id}`} className="table-link">
                    {u.name}
                  </Link>
                </td>
                <td className="muted">{u.email}</td>
                <td>
                  <span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span>
                  {u.teacherProfile && (
                    <Link href={`/dashboard/teachers/${u.id}`}>
                      <span className="badge badge-teacher ml-4">Teacher</span>
                    </Link>
                  )}
                  {u.studentProfile && (
                    <Link href={`/dashboard/students/${u.id}`}>
                      <span className="badge badge-student ml-4">Student</span>
                    </Link>
                  )}
                </td>
                <td>
                  <span className={`badge badge-status-${u.accountStatus.toLowerCase()}`}>
                    {u.accountStatus.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="muted">
                  {u.teacherProfile?.school?.name ?? u.studentProfile?.school?.name ?? "—"}
                </td>
                <td className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
