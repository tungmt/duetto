import { NextRequest } from "next/server"; 
import prisma from "@/lib/prisma";  

export async function GET() {  
  try{ 
  
const users = await db.user.findMany({where:{}})); 

return Response.json(users);} catch(error){}
