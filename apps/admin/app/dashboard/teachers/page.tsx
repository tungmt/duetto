import Link from "next/link";
import { adminFetch, requireSession } from "../../actions";

export default async function TeachersPage() {
  const session = await requireSession();
  const data = await adminFetch("/api/admin/teachers", session).catch(() => ({ teachers: [] }));

  const teachers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    teacherProfile?: {
      displayName: string;
      phoneNumber?: string | null;
      school?: { name: string } | null;
    } | null;
    _count?: { teacherChallenges: number; classesTeaching: number };
  }> = data.teachers ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Teachers</h1>
        <p className="page-sub">{teachers.length} total</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>School</th>
              <th>Challenges</th>
              <th>Classes</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/dashboard/teachers/${t.id}`} className="table-link">
                    {t.teacherProfile?.displayName ?? t.name}
                  </Link>
                </td>
                <td className="muted">{t.email}</td>
                <td className="muted">{t.teacherProfile?.school?.name ?? "—"}</td>
                <td>{t._count?.teacherChallenges ?? 0}</td>
                <td>{t._count?.classesTeaching ?? 0}</td>
                <td className="muted">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
