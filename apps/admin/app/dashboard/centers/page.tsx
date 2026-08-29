import Link from "next/link";
import { adminFetch, requireSession } from "../../actions";

interface School {
  id: string;
  name: string;
  description?: string | null;
}

export default async function CentersPage() {
  const session = await requireSession();
  
  // Fetch all centers (schools) for system admin view
  const centersData = await adminFetch("/api/admin/centers", session).catch(() => ({ schools: [] }));
  const schools: School[] = centersData.schools;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Centers</h1>
        <p className="page-sub">Overview of all learning centers managed in the platform</p>
      </div>

      {schools.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="empty-message">No centers found</p>
            <p className="empty-hint">Create a center by adding a School record to get started.</p>
          </div>
        </div>
      ) : (
        <div className="cards-grid">
          {schools.map((school) => (
            <Link key={school.id} href={`/dashboard/centers/${school.id}`} className="center-card card">
              <div className="card-header">
                <h3 className="card-title">{school.name}</h3>
                <span className="card-id mono">{school.id}</span>
              </div>
              
              {school.description && (
                <p className="card-description">{school.description}</p>
              )}
              
              <div className="card-footer">
                <Link href={`/dashboard/centers/${school.id}`} className="btn-primary btn-sm">
                  View Details
                </Link>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
