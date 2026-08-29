import { NextRequest } from "next/server"; 
import { prisma } from "@/lib/prisma";  
import { getRequestUser, requireRole } from "@/lib/auth"; 

export async function GET(request: Request) { 
  
const user = await getCurrentAdmin();
  
if (user?.adminType === 'SYSTEM_ADMIN') return json({});

return handleError(error);} 

// System admin can see all centers. Center admin sees only their assigned center
  