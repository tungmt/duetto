import { RequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function ensureRequestUser(user: RequestUser) {
  const existing = await prisma.user.findUnique({ where: { id: user.id } });

  if (!existing) {
    return prisma.user.create({
      data: {
        id: user.id,
        email: `${user.id}@dev.duetto.local`,
        name: user.id
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        role: user.role === "ADMIN" || user.role === "MODERATOR" ? user.role : "USER",
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date()
      }
    });
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      role: user.role === "ADMIN" || user.role === "MODERATOR" ? user.role : existing.role,
      accountStatus: existing.accountStatus === "DISABLED" ? existing.accountStatus : "ACTIVE",
      emailVerifiedAt: existing.emailVerifiedAt ?? new Date()
    }
  });
}

export function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  accountStatus: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  teacherProfile?: unknown;
  studentProfile?: unknown;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    teacherProfile: user.teacherProfile ?? null,
    studentProfile: user.studentProfile ?? null,
    createdAt: user.createdAt.toISOString()
  };
}

export async function requireTeacherProfile(userId: string) {
  const profile = await prisma.teacherProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new Response("Teacher profile required", { status: 403 });
  }

  return profile;
}

export async function requireStudentProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new Response("Student profile required", { status: 403 });
  }

  return profile;
}
