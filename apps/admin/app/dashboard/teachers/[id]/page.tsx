import Link from "next/link";
import { adminFetch, requireSession } from "../../../actions";

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const data = await adminFetch(`/api/admin/teachers/${id}`, session).catch(() => null);
  if (!data) return <p className="muted">Teacher not found.</p>;

  const { teacher, challenges, classes, students } = data as {
    teacher: {
      id: string;
      name: string;
      email: string;
      createdAt: string;
      teacherProfile: {
        displayName: string;
        phoneNumber?: string | null;
        bio?: string | null;
        headline?: string | null;
        yearsExperience?: number | null;
        school?: { name: string } | null;
      };
    };
    challenges: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
      class?: { name: string } | null;
      school?: { name: string } | null;
      _count: { submissions: number };
    }>;
    classes: Array<{
      id: string;
      name: string;
      description?: string | null;
      school?: { name: string } | null;
      _count: { enrollments: number; challenges: number };
    }>;
    students: Array<{ id: string; name: string; displayName: string | null }>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/dashboard/teachers" className="breadcrumb-link">Teachers</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{teacher.teacherProfile.displayName}</span>
        </div>
        <h1 className="page-title">{teacher.teacherProfile.displayName}</h1>
        <p className="page-sub">{teacher.email}</p>
      </div>

      <div className="two-col">
        <section>
          <h2 className="section-heading">Profile</h2>
          <div className="card detail-list">
            {teacher.teacherProfile.headline && (
              <div className="detail-row">
                <span className="detail-label">Headline</span>
                <span className="detail-value">{teacher.teacherProfile.headline}</span>
              </div>
            )}
            {teacher.teacherProfile.phoneNumber && (
              <div className="detail-row">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{teacher.teacherProfile.phoneNumber}</span>
              </div>
            )}
            {teacher.teacherProfile.school && (
              <div className="detail-row">
                <span className="detail-label">School</span>
                <span className="detail-value">{teacher.teacherProfile.school.name}</span>
              </div>
            )}
            {teacher.teacherProfile.yearsExperience != null && (
              <div className="detail-row">
                <span className="detail-label">Experience</span>
                <span className="detail-value">{teacher.teacherProfile.yearsExperience} yrs</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Joined</span>
              <span className="detail-value">{new Date(teacher.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-heading">Students ({students.length})</h2>
          <div className="card">
            {students.length === 0 ? (
              <p className="muted empty-msg">No students enrolled in this teacher&apos;s classes.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Display name</th></tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/dashboard/students/${s.id}`} className="table-link">{s.name}</Link>
                      </td>
                      <td className="muted">{s.displayName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <section className="mt-24">
        <h2 className="section-heading">Challenges ({challenges.length})</h2>
        <div className="card">
          {challenges.length === 0 ? (
            <p className="muted empty-msg">No challenges yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Class</th>
                  <th>Submissions</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>
                      <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td className="muted">{c.class?.name ?? "—"}</td>
                    <td>{c._count.submissions}</td>
                    <td className="muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-24">
        <h2 className="section-heading">Classes ({classes.length})</h2>
        <div className="card">
          {classes.length === 0 ? (
            <p className="muted empty-msg">No classes yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>School</th>
                  <th>Students</th>
                  <th>Challenges</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td>
                      <Link href={`/dashboard/classes/${cls.id}`} className="table-link">{cls.name}</Link>
                    </td>
                    <td className="muted">{cls.school?.name ?? "—"}</td>
                    <td>{cls._count.enrollments}</td>
                    <td>{cls._count.challenges}</td>
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
