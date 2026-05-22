import Link from "next/link";
import { adminFetch, requireSession } from "../../../actions";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const data = await adminFetch(`/api/admin/students/${id}`, session).catch(() => null);
  if (!data) return <p className="muted">Student not found.</p>;

  const { student, submissions, classes } = data as {
    student: {
      id: string;
      name: string;
      email: string;
      createdAt: string;
      studentProfile: {
        displayName: string;
        bio?: string | null;
        gradeLevel?: string | null;
        learningGoal?: string | null;
        school?: { name: string } | null;
      };
    };
    submissions: Array<{
      id: string;
      status: string;
      score?: number | null;
      feedbackText?: string | null;
      practiceDurationMs?: number | null;
      createdAt: string;
      challenge: {
        id: string;
        title: string;
        description?: string | null;
        teacher: { id: string; name: string };
      };
    }>;
    classes: Array<{
      id: string;
      name: string;
      description?: string | null;
      school?: { name: string } | null;
      teacher?: { id: string; name: string } | null;
    }>;
  };

  const avgScore =
    submissions.filter((s) => s.score != null).length > 0
      ? Math.round(
          submissions.filter((s) => s.score != null).reduce((a, s) => a + (s.score ?? 0), 0) /
            submissions.filter((s) => s.score != null).length
        )
      : null;

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/dashboard/students" className="breadcrumb-link">Students</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{student.studentProfile.displayName}</span>
        </div>
        <h1 className="page-title">{student.studentProfile.displayName}</h1>
        <p className="page-sub">{student.email}</p>
      </div>

      <div className="stat-grid stat-grid-sm">
        <div className="stat-card">
          <div className="stat-label">Submissions</div>
          <div className="stat-value">{submissions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. score</div>
          <div className="stat-value">{avgScore != null ? avgScore : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Classes enrolled</div>
          <div className="stat-value">{classes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reviewed</div>
          <div className="stat-value">{submissions.filter((s) => s.status === "REVIEWED").length}</div>
        </div>
      </div>

      <div className="two-col mt-24">
        <section>
          <h2 className="section-heading">Profile</h2>
          <div className="card detail-list">
            {student.studentProfile.school && (
              <div className="detail-row">
                <span className="detail-label">School</span>
                <span className="detail-value">{student.studentProfile.school.name}</span>
              </div>
            )}
            {student.studentProfile.gradeLevel && (
              <div className="detail-row">
                <span className="detail-label">Grade</span>
                <span className="detail-value">{student.studentProfile.gradeLevel}</span>
              </div>
            )}
            {student.studentProfile.learningGoal && (
              <div className="detail-row">
                <span className="detail-label">Goal</span>
                <span className="detail-value">{student.studentProfile.learningGoal}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Joined</span>
              <span className="detail-value">{new Date(student.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-heading">Classes ({classes.length})</h2>
          <div className="card">
            {classes.length === 0 ? (
              <p className="muted empty-msg">Not enrolled in any classes.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Class</th><th>Teacher</th><th>School</th></tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td>
                        <Link href={`/dashboard/classes/${cls.id}`} className="table-link">{cls.name}</Link>
                      </td>
                      <td className="muted">
                        {cls.teacher ? (
                          <Link href={`/dashboard/teachers/${cls.teacher.id}`} className="table-link">
                            {cls.teacher.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="muted">{cls.school?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <section className="mt-24">
        <h2 className="section-heading">Submissions ({submissions.length})</h2>
        <div className="card">
          {submissions.length === 0 ? (
            <p className="muted empty-msg">No submissions yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Challenge</th>
                  <th>Teacher</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Feedback</th>
                  <th>Practice</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.challenge.title}</td>
                    <td className="muted">
                      <Link href={`/dashboard/teachers/${s.challenge.teacher.id}`} className="table-link">
                        {s.challenge.teacher.name}
                      </Link>
                    </td>
                    <td>
                      {s.score != null ? (
                        <span className={`score-pill ${s.score >= 80 ? "score-high" : s.score >= 50 ? "score-mid" : "score-low"}`}>
                          {s.score}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
                    </td>
                    <td className="muted">{s.feedbackText ? s.feedbackText.slice(0, 60) + (s.feedbackText.length > 60 ? "…" : "") : "—"}</td>
                    <td className="muted">
                      {s.practiceDurationMs ? `${Math.round(s.practiceDurationMs / 1000)}s` : "—"}
                    </td>
                    <td className="muted">{new Date(s.createdAt).toLocaleDateString()}</td>
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
