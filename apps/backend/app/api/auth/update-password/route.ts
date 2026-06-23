import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";
import { verifyPassword, hashPassword } from "@/lib/password";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const input = updatePasswordSchema.parse(await request.json());

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id }
    });

    // Verify current password
    const passwordValid = await verifyPassword(input.currentPassword, dbUser.passwordHash);
    if (!passwordValid) {
      return json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(input.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });

    return json({ ok: true, message: "Password updated successfully" });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
