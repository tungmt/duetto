import Link from "next/link";
import { adminFetch, requireSession } from "../../actions";

export default async function ClassesPage() {
  const session = await requireSession();
  const data = await adminFetch("/api/admin/classes", session).catch(() => ({ classes: [] }));

  const classes: Array<{
    id: string;
    name: string;
    description?: string | null;
    createdAt: string;
    school?: { id: string; name: string } | null;
    teacher?: { id: string; name: string } | null;
    _count?: { enrollments: number; challenges: number };
  }> = data.classes ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Classes</h1>
        <p className="page-sub">{classes.length} total</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>School</th>
              <th>Teacher</th>
              <th>Students</th>
              <th>Challenges</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls.id}>
                <td>
                  <Link href={`/dashboard/classes/${cls.id}`} className="table-link">
                    {cls.name}
                  </Link>
                </td>
                <td className="muted">{cls.school?.name ?? "—"}</td>
                <td className="muted">
                  {cls.teacher ? (
                    <Link href={`/dashboard/teachers/${cls.teacher.id}`} className="table-link">
                      {cls.teacher.name}
                    </Link>
                  ) : "—"}
                </td>
                <td>{cls._count?.enrollments ?? 0}</td>
                <td>{cls._count?.challenges ?? 0}</td>
                <td className="muted">{new Date(cls.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
