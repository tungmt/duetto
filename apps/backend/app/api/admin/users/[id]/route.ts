import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole, staffRoles } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        teacherProfile: { include: { school: true } },
        studentProfile: { include: { school: true } }
      }
    });

    if (!target) return json({ error: "Not found" }, { status: 404 });
    return json({ user: target });
  } catch (error) {
    return handleError(error);
  }
}

const patchUserSchema = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "USER"]).optional(),
  accountStatus: z.enum(["ACTIVE", "DISABLED", "PENDING_EMAIL_VERIFICATION"]).optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const { id } = await params;
    const input = patchUserSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id },
      data: input
    });

    return json({ user: updated });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
