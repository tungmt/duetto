import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { toPublicUser } from "@/lib/users";
import { sendWelcomeEmail } from "@/lib/email";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4)
});

export async function POST(request: NextRequest) {
  try {
    const input = verifySchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!user) {
      return json({ error: "Invalid verification code" }, { status: 400 });
    }

    const now = new Date();
    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: input.code,
        type: "EMAIL_VERIFICATION",
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
      return json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    const verifiedUser = await prisma.$transaction(async (tx) => {
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
          accountStatus: "ACTIVE",
          emailVerifiedAt: now
        },
        include: {
          teacherProfile: true,
          studentProfile: true
        }
      });
    });

    await sendWelcomeEmail(verifiedUser.email, verifiedUser.name);

    return json({ user: toPublicUser(verifiedUser) });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
