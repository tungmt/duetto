import Link from "next/link";
import { adminFetch, requireSession } from "../../../actions";

interface CenterDetail {
  id: string;
  name: string;
  description?: string | null;
  studentCount?: number;
  teacherCount?: number;
  classes?: Array<{ id: string; name: string }> | null;
  students?: Array<{
    id: string;
    displayName: string;
    email: string;
    gradeLevel?: string;
  }>;
  teachers?: Array<{
    id: string;
    displayName: string;
    email: string;
    yearsExperience?: string;
  }>;
}

export default async function CenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  
  // Fetch center details and all associated data
  const centerData: CenterDetail | null = await adminFetch(`/api/admin/centers/${id}`, session).catch(() => null);
  
  if (!centerData) return <div className="card"><p>Center not found</p></div>;

  return (
    <>
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">{centerData.name}</h1>
            {centerData.description && <p className="page-sub">{centerData.description}</p>}
          </div>
          <Link href="/dashboard/centers" className="btn-secondary btn-sm">
            ← Back to Centers
          </Link>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-mini">
          <span className="stat-value">{centerData.studentCount || 0}</span>
          <span className="stat-label">Students</span>
        </div>
        <div className="stat-mini">
          <span className="stat-value">{centerData.teacherCount || 0}</span>
          <span className="stat-label">Teachers</span>
        </div>
        <div className="stat-mini">
          <span className="stat-value">{(centerData.classes?.length || 0).toLocaleString()}</span>
          <span className="stat-label">Classes</span>
        </div>
      </div>

      <div className="detail-section card mt-24">
        <h2 className="section-heading">Students</h2>
        {centerData.students?.length === 0 ? (
          <p className="empty-msg">No students in this center.</p>
        ) : (
          <ul className="students-list">
            {centerData.students?.map((student: any) => (
              <li key={student.id} className="detail-row">
                <span className="detail-value">
                  <strong>{student.displayName}</strong>
                  {student.email && <> · <small>{student.email}</small></>}
                  {student.gradeLevel && <span className="badge badge-student ml-4">{student.gradeLevel}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-section card mt-24">
        <h2 className="section-heading">Teachers</h2>
        {centerData.teachers?.length === 0 ? (
          <p className="empty-msg">No teachers in this center.</p>
        ) : (
          <ul className="teachers-list">
            {centerData.teachers?.map((teacher: any) => (
              <li key={teacher.id} className="detail-row">
                <span className="detail-value">
                  <strong>{teacher.displayName}</strong>
                  {teacher.email && <> · <small>{teacher.email}</small></>}
                  {teacher.yearsExperience && <span className="badge badge-teacher ml-4">{teacher.yearsExperience} years exp.</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-section card mt-24">
        <h2 className="section-heading">Classes</h2>
        {centerData.classes?.length === 0 ? (
          <p className="empty-msg">No classes in this center.</p>
        ) : (
          <ul className="classes-list">
            {centerData.classes?.map((classItem: any) => (
              <li key={classItem.id} className="detail-row">
                <span className="detail-value">{classItem.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
