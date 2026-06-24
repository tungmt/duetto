import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireTeacherProfile } from "@/lib/users";
import { hashPassword } from "@/lib/password";

const createStudentSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).optional()
});

function buildDefaultDisplayName(email: string) {
  const localPart = email.split("@")[0] ?? "student";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Student";
}

function generateDefaultPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let randomPart = "";
  for (let i = 0; i < 8; i += 1) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Dt-${randomPart}`;
}

async function assertTeacherCanManageClass(userId: string, classId: string, role: string) {
  if (role === "ADMIN" || role === "MODERATOR") {
    return;
  }

  await requireTeacherProfile(userId);
  const classRoom = await prisma.class.findFirst({ where: { id: classId, teacherId: userId } });
  if (!classRoom) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);

    const { id: classId } = await context.params;
    await assertTeacherCanManageClass(user.id, classId, user.role);

    const input = createStudentSchema.parse(await request.json());
    const email = input.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const defaultPassword = generateDefaultPassword();
    const passwordHash = await hashPassword(defaultPassword);
    const displayName = input.displayName?.trim() || buildDefaultDisplayName(email);

    const created = await prisma.$transaction(async (tx) => {
      const studentUser = await tx.user.create({
        data: {
          email,
          name: displayName,
          passwordHash,
          role: "USER",
          accountStatus: "ACTIVE",
          emailVerifiedAt: new Date()
        }
      });

      await tx.studentProfile.create({
        data: {
          userId: studentUser.id,
          displayName
        }
      });

      await tx.classEnrollment.create({
        data: {
          classId,
          studentId: studentUser.id
        }
      });

      return studentUser;
    });

    return json(
      {
        student: {
          id: created.id,
          email: created.email,
          name: created.name
        },
        defaultPassword
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
