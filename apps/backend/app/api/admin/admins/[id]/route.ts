import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "USER"])
});

// Demote or change role
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const { id } = await params;
    const input = patchSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id },
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
