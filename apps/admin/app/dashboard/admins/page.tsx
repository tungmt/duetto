import Link from "next/link";
import { adminFetch, requireSession } from "../../actions";
import { redirect } from "next/navigation";

export default async function AdminsPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/dashboard");

  const data = await adminFetch("/api/admin/admins", session).catch(() => ({ admins: [] }));
  const usersData = await adminFetch("/api/admin/users", session).catch(() => ({ users: [] }));

  const admins: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    accountStatus: string;
    createdAt: string;
  }> = data.admins ?? [];

  const regularUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }> = (usersData.users ?? []).filter(
    (u: { role: string }) => u.role === "USER"
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admins &amp; Moderators</h1>
        <p className="page-sub">Manage staff access</p>
      </div>

      <div className="two-col">
        <section>
          <h2 className="section-heading">Current staff ({admins.length})</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/dashboard/users/${a.id}`} className="table-link">{a.name}</Link>
                    </td>
                    <td className="muted">{a.email}</td>
                    <td>
                      <span className={`badge badge-${a.role.toLowerCase()}`}>{a.role}</span>
                    </td>
                    <td>
                      <span className={`badge badge-status-${a.accountStatus.toLowerCase()}`}>
                        {a.accountStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="muted">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="section-heading">Promote a user</h2>
          <div className="card">
            <p className="muted" style={{ marginBottom: 16 }}>
              Select a regular user and assign them a staff role.
            </p>
            <PromoteForm users={regularUsers} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PromoteForm({
  users
}: {
  users: Array<{ id: string; name: string; email: string }>;
}) {
  return (
    <form method="POST" action="/api/admin/admins" className="promote-form">
      <label className="field-label" htmlFor="userId">User</label>
      <select id="userId" name="userId" className="field-input">
        <option value="">— select user —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="role">New role</label>
      <select id="role" name="role" className="field-input">
        <option value="MODERATOR">MODERATOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>

      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Note: Submit via the backend API directly — or implement a server action here to wire up.
      </p>
    </form>
  );
}
