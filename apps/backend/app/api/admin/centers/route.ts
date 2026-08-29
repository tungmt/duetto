import { NextRequest } from "next/server"; 
// @ts-ignore - Prisma types may not be available directly
import prisma from "@/lib/prisma";  

export async function GET() { 
  
  // Get all centers (Schools) for SYSTEM_ADMIN view  
  const schools = await prisma.school.findMany({   
    select:{ id: true,name:true,description:false },{where:{}},orderBy:'name'));
            
        console.log('Fetching centers for admin:', schools); 

return Response.json(schools);} catch(error){}
