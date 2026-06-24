import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { toPublicUser } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/email";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  profileKind: z.enum(["TEACHER", "STUDENT"]).optional(),
  schoolId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const input = registerSchema.parse(await request.json());
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.upsert({
      where: { email: input.email.toLowerCase() },
      update: {
        name: input.name,
        passwordHash: passwordHash,
        accountStatus: "PENDING_EMAIL_VERIFICATION",
        emailVerifiedAt: null,
        emailVerificationCode: verificationCode
      },
      create: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: passwordHash,
        role: "USER",
        accountStatus: "PENDING_EMAIL_VERIFICATION",
        emailVerificationCode: verificationCode
      },
      include: {
        teacherProfile: true,
        studentProfile: true
      }
    });

    if (input.profileKind === "TEACHER") {
      await prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: {
          displayName: input.name,
          schoolId: input.schoolId
        },
        create: {
          userId: user.id,
          displayName: input.name,
          schoolId: input.schoolId
        }
      });
    }

    if (input.profileKind === "STUDENT") {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {
          displayName: input.name,
          schoolId: input.schoolId
        },
        create: {
          userId: user.id,
          displayName: input.name,
          schoolId: input.schoolId
        }
      });
    }

    const userWithProfiles = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        teacherProfile: true,
        studentProfile: true
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationCode);

    return json(
      {
        user: toPublicUser(userWithProfiles),
        verificationCode: userWithProfiles.emailVerificationCode ?? verificationCode
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
