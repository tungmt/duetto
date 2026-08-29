'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminFetch, requireSession } from './actions';

interface DashboardLayoutProps {  
  children: React.ReactNode; 
  
} 

export default async function DashboardLayout({ children }:DashboardLayoutProps) { 
  
const session = await requireSession(); 

// Get current user's role to determine navigation items
let isSystemAdmin = false;

if (session?.role === 'SYSTEM_ADMIN') {
isSystemAdmin = true;} else if(session?.adminType ==='CENTER_ADMIN'){

} else{


console.log('Using legacy admin access'); 
}

return (
  <div className="min-h-screen">  
    {/* Top Navigation Bar */}
    <header className="border-b py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900">Duetto Admin</h1>
      <nav className="flex space-x-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
          Dashboard
        </Link>
        <Link href="/dashboard/centers" className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
          Centers 
          {session?.adminType === 'SYSTEM_ADMIN' && <span>(All)</span>}
        </Link>
        <Link href="/dashboard/users" className="text-gray-600 hover:text-gray-700">Users</Link>
        <a href="#" className="text-gray-600 hover:text-gray-700">Settings</a>
      </nav>
    </header>

    {/* Main Content Area */}
    <div>{children}</div>

    {/* Sidebar Navigation for System Admin */}
    {isSystemAdmin && (
      <aside className="ml-6 p-4 mt-6 border rounded-lg">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">System Navigation</h2>
        <nav className="space-y-1">
          <Link href="/dashboard/centers" className="block px-3 py-2 text-sm text-blue-600 hover:text-blue-700 rounded-md bg-gray-50">All Centers</Link>
          <Link href="/dashboard/users" className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md">All Users</Link>
          <a href="#" className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md">Platform Settings</a>
        </nav>
      </aside>
    )}
  </div>
);
