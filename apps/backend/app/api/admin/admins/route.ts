import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

// List admins & moderators
export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const admins = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { in: ["ADMIN", "MODERATOR"] }
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, accountStatus: true, createdAt: true }
    });

    return json({ admins });
  } catch (error) {
    return handleError(error);
  }
}

const promoteSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MODERATOR"])
});

// Promote a user to admin/moderator
export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const input = promoteSchema.parse(await request.json());
    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: { role: input.role },
      select: { id: true, name: true, email: true, role: true }
    });

    return json({ user: updated });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
