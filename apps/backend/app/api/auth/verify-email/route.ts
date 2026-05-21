import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { toPublicUser } from "@/lib/users";

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

    if (!user || user.emailVerificationCode !== input.code) {
      return json({ error: "Invalid verification code" }, { status: 400 });
    }

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date(),
        emailVerificationCode: null
      },
      include: {
        teacherProfile: true,
        studentProfile: true
      }
    });

    return json({ user: toPublicUser(verifiedUser) });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
