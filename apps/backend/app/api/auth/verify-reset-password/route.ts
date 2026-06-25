import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { hashPassword } from "@/lib/password";

const verifyResetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  newPassword: z.string().min(6)
});

export async function POST(request: NextRequest) {
  try {
    const input = verifyResetSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!user) {
      return json({ error: "Invalid reset code" }, { status: 400 });
    }

    const now = new Date();
    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: input.code,
        type: "PASSWORD_RESET",
        isUsed: false,
        expiresAt: {
          gt: now
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!verificationRecord) {
      return json({ error: "Invalid or expired reset code" }, { status: 400 });
    }

    const passwordHash = await hashPassword(input.newPassword);

    // Update password and mark code as used in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.verificationCode.update({
        where: { id: verificationRecord.id },
        data: {
          isUsed: true,
          usedAt: now
        }
      });

      return tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: passwordHash
        },
        include: {
          teacherProfile: true,
          studentProfile: true
        }
      });
    });

    return json({ 
      message: "Password reset successful",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
