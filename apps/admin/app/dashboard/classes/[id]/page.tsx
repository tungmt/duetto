import Link from "next/link";
import { adminFetch, requireSession } from "../../../actions";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const data = await adminFetch(`/api/admin/classes/${id}`, session).catch(() => null);
  if (!data) return <p className="muted">Class not found.</p>;

  const cls = data.class as {
    id: string;
    name: string;
    description?: string | null;
    createdAt: string;
    school?: { id: string; name: string } | null;
    teacher?: { id: string; name: string } | null;
    enrollments: Array<{
      id: string;
      createdAt: string;
      student: {
        id: string;
        name: string;
        studentProfile?: { displayName: string; avatarUrl?: string | null } | null;
      };
    }>;
    challenges: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
      _count: { submissions: number };
    }>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/dashboard/classes" className="breadcrumb-link">Classes</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{cls.name}</span>
        </div>
        <h1 className="page-title">{cls.name}</h1>
        {cls.description && <p className="page-sub">{cls.description}</p>}
      </div>

      <div className="two-col">
        <section>
          <h2 className="section-heading">Details</h2>
          <div className="card detail-list">
            {cls.school && (
              <div className="detail-row">
                <span className="detail-label">School</span>
                <span className="detail-value">{cls.school.name}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Teacher</span>
              <span className="detail-value">
                {cls.teacher ? (
                  <Link href={`/dashboard/teachers/${cls.teacher.id}`} className="table-link">
                    {cls.teacher.name}
                  </Link>
                ) : "—"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created</span>
              <span className="detail-value">{new Date(cls.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-heading">Students ({cls.enrollments.length})</h2>
          <div className="card">
            {cls.enrollments.length === 0 ? (
              <p className="muted empty-msg">No students enrolled.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Display name</th><th>Enrolled</th></tr>
                </thead>
                <tbody>
                  {cls.enrollments.map((enr) => (
                    <tr key={enr.id}>
                      <td>
                        <Link href={`/dashboard/students/${enr.student.id}`} className="table-link">
                          {enr.student.name}
                        </Link>
                      </td>
                      <td className="muted">{enr.student.studentProfile?.displayName ?? "—"}</td>
                      <td className="muted">{new Date(enr.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <section className="mt-24">
        <h2 className="section-heading">Challenges ({cls.challenges.length})</h2>
        <div className="card">
          {cls.challenges.length === 0 ? (
            <p className="muted empty-msg">No challenges in this class yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Submissions</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {cls.challenges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>
                      <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td>{c._count.submissions}</td>
                    <td className="muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
