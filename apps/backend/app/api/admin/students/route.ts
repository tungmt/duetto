import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole, staffRoles } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const students = await prisma.user.findMany({
      where: { deletedAt: null, studentProfile: { isNot: null } },
      orderBy: { createdAt: "desc" },
      include: {
        studentProfile: { include: { school: { select: { id: true, name: true } } } },
        _count: { select: { studentSubmissions: true } }
      }
    });

    return json({ students });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
