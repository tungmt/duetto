import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole, staffRoles } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
        ...(role ? { role: role as "ADMIN" | "MODERATOR" | "USER" } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        teacherProfile: { select: { id: true, displayName: true, school: { select: { id: true, name: true } } } },
        studentProfile: { select: { id: true, displayName: true, school: { select: { id: true, name: true } } } }
      }
    });

    return json({ users });
  } catch (error) {
    return handleError(error);
  }
}

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "USER"]).optional(),
  accountStatus: z.enum(["ACTIVE", "DISABLED", "PENDING_EMAIL_VERIFICATION"]).optional()
});

export async function OPTIONS() {
  return options();
}
