import Link from "next/link";
import { adminFetch, requireSession } from "../../actions";

export default async function StudentsPage() {
  const session = await requireSession();
  const data = await adminFetch("/api/admin/students", session).catch(() => ({ students: [] }));

  const students: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    studentProfile?: {
      displayName: string;
      gradeLevel?: string | null;
      school?: { name: string } | null;
    } | null;
    _count?: { studentSubmissions: number };
  }> = data.students ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Students</h1>
        <p className="page-sub">{students.length} total</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>School</th>
              <th>Grade</th>
              <th>Submissions</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/dashboard/students/${s.id}`} className="table-link">
                    {s.studentProfile?.displayName ?? s.name}
                  </Link>
                </td>
                <td className="muted">{s.email}</td>
                <td className="muted">{s.studentProfile?.school?.name ?? "—"}</td>
                <td className="muted">{s.studentProfile?.gradeLevel ?? "—"}</td>
                <td>{s._count?.studentSubmissions ?? 0}</td>
                <td className="muted">{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
