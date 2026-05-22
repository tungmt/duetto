import Link from "next/link";
import { adminFetch, requireSession } from "../../../actions";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const data = await adminFetch(`/api/admin/users/${id}`, session).catch(() => null);
  if (!data) {
    return <div className="page-content"><p className="muted">User not found.</p></div>;
  }

  const user = data.user;
  const isAdmin = session.role === "ADMIN";

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/dashboard/users" className="breadcrumb-link">Users</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{user.name}</span>
        </div>
        <h1 className="page-title">{user.name}</h1>
        <p className="page-sub">{user.email}</p>
      </div>

      <div className="two-col">
        <section>
          <h2 className="section-heading">Account</h2>
          <div className="card detail-list">
            <div className="detail-row">
              <span className="detail-label">ID</span>
              <span className="detail-value mono">{user.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Role</span>
              <span className="detail-value">
                <span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <span className={`badge badge-status-${user.accountStatus.toLowerCase()}`}>
                  {user.accountStatus.replace(/_/g, " ")}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Joined</span>
              <span className="detail-value">{new Date(user.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="card mt-16">
              <p className="section-heading" style={{ marginBottom: 12 }}>Quick actions (Admin only)</p>
              <div className="action-row">
                {user.role !== "ADMIN" && (
                  <form method="POST" action={`/api/admin/users/${id}`}>
                    <input type="hidden" name="role" value="ADMIN" />
                  </form>
                )}
                <Link href={`/dashboard/users/${id}/edit`} className="btn-secondary btn-sm">
                  Edit role / status
                </Link>
              </div>
            </div>
          )}
        </section>

        <section>
          {user.teacherProfile && (
            <>
              <h2 className="section-heading">Teacher profile</h2>
              <div className="card detail-list">
                <div className="detail-row">
                  <span className="detail-label">Display name</span>
                  <span className="detail-value">{user.teacherProfile.displayName}</span>
                </div>
                {user.teacherProfile.phoneNumber && (
                  <div className="detail-row">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{user.teacherProfile.phoneNumber}</span>
                  </div>
                )}
                {user.teacherProfile.school && (
                  <div className="detail-row">
                    <span className="detail-label">School</span>
                    <span className="detail-value">{user.teacherProfile.school.name}</span>
                  </div>
                )}
              </div>
              <div className="mt-8">
                <Link href={`/dashboard/teachers/${id}`} className="btn-secondary btn-sm">
                  View teacher detail →
                </Link>
              </div>
            </>
          )}

          {user.studentProfile && (
            <>
              <h2 className="section-heading" style={{ marginTop: 20 }}>Student profile</h2>
              <div className="card detail-list">
                <div className="detail-row">
                  <span className="detail-label">Display name</span>
                  <span className="detail-value">{user.studentProfile.displayName}</span>
                </div>
                {user.studentProfile.school && (
                  <div className="detail-row">
                    <span className="detail-label">School</span>
                    <span className="detail-value">{user.studentProfile.school.name}</span>
                  </div>
                )}
                {user.studentProfile.gradeLevel && (
                  <div className="detail-row">
                    <span className="detail-label">Grade</span>
                    <span className="detail-value">{user.studentProfile.gradeLevel}</span>
                  </div>
                )}
              </div>
              <div className="mt-8">
                <Link href={`/dashboard/students/${id}`} className="btn-secondary btn-sm">
                  View student detail →
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
