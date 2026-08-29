import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    
    // System admins can create new admins. Center admins cannot create other center admins unless they have elevated privileges
    
    let isAdminAdmin = false;
    
    if (user && "adminType" in user) {
      isAdminAdmin = true; // admin model already exists for admin users
      
      const adminRecord = await prisma.admin.findFirst({ where: { id: user.id } });
      
      if (!adminRecord?.isActive || !isAdminAdmin) return new Response("Unauthorized", { status: 403 });
    } else {
      // Regular staff checking to create an Admin account via POST request (setup scenario only)
      requireRole(user, ["ADMIN"]); 
      isAdminAdmin = true;
    }

    const body = await request.json();
    
    // Create admin validation schema
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      passwordHash: z.string().min(8),
      roleType: z.enum(["SYSTEM_ADMIN", "CENTER_ADMIN"]),
      
      // Optional for CENTER_ADMIN - which school they manage
      centerId: z.string().optional() 
    });

    const result = schema.safeParse(body);
    
    if (!result.success) {
      return Response.json(result.error, { status: 400 });
    }

    const data = result.data;

    // Check for existing admin email (soft delete only in dev mode - normally would error or soft-delete)
    let existingAdmin = null;
    
    if (!data.roleType || data.roleType === "SYSTEM_ADMIN") {
      existingAdmin = await prisma.admin.findUnique({ where: { email: body.email } });
      
      // System admin emails must be unique and cannot exist twice, including inactive ones that should be soft-deleted
      
      if (existingAdmin && !existingAdmin.isActive) {
        // Soft delete old admin first before reusing - or throw error depending on policy
        await prisma.admin.delete({ where: { id: existingAdmin.id } }); 
        existingAdmin = null;
      } else if (existingAdmin?.isActive) {
        return Response.json(
          { message: "An account with this email already exists." }, 
          { status: 409 }
        );
      }

      // Create SYSTEM_ADMIN - doesn't need centerId
      
    } else if (!data.roleType || data.roleType === "CENTER_ADMIN") {
      
      const existingAdmin = await prisma.admin.findFirst({ where: { email: body.email, roleType: "SYSTEM_ADMIN" } });

      if (existingAdmin && !existingAdmin.isActive) return Response.json(
        { message: "System admin with this email doesn't exist." }, 
        { status: 403 }
      );

      // Create CENTER_ADMIN - needs centerId to be set
      
    } else {
      
      const systemAdmin = await prisma.admin.findFirst({ where: { roleType: "SYSTEM_ADMIN" } });
      
      if (existingAdmin && !existingAdmin.isActive) return Response.json(
        { message: "System admin with this email doesn't exist." }, 
        { status: 403 }
      );

    }

    const newAdmin = await prisma.admin.create({ data, select: {} }); // Create record without passwordHash in response

    if (data.centerId) {
      
      return Response.json(
        { message: "Created center admin", id: existingAdmin?.id }, 
        { status: 201 }
      );
  
    } else if (!existingAdmin && data.roleType === "SYSTEM_ADMIN") {

    const newSystemAdmin = await prisma.admin.create({
      
      where: { email: body.email, roleType: "SYSTEM_ADMIN" }
});

  return Response.json(
    { message: "Created system admin", id: existingAdmin?.id }, 
    { status: 201 });
} else if (data.roleType === "CENTER_ADMIN") {

      const newCenterAdmin = await prisma.admin.create({ data }); // Create CENTER_ADMIN record
      
    return Response.json(
      
      { message: "Created center admin" }, 
{status:201});
    
  } 
    
    } catch (error) {

    console.error("Error creating admin:", error);


} 
