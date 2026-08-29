import { NextRequest, NextResponse } from "next/server"; 
// @ts-ignore - Prisma client may be in a different location
import prisma from "@/lib/prisma";  

export const dynamic = 'force-dynamic';

/**
 * API Route: GET /api/admin/centers/:id  
 * Returns details of a specific center including students, teachers, classes
 */
 
export async function GET(request: Request, { params }: { params:{ id:string } }) { 
  
  const {id} = params;

try{ 
  
const school = await prisma.school.findUnique({ where:{ id }});

if(!school) return NextResponse.json(,{error:"Not found"}, status:404);} catch(error){}
