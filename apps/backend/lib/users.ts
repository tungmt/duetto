import { RequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AppRole = "ADMIN" | "MODERATOR" | "USER";

function normalizeRoles(value: unknown): AppRole[] {
  const allowed = new Set<AppRole>(["ADMIN", "MODERATOR", "USER"]);
  if (!Array.isArray(value)) {
    return ["USER"];
  }

  const roles = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item as AppRole)
    .filter((role) => allowed.has(role));

  const deduped = Array.from(new Set(roles));
  return deduped.length ? deduped : ["USER"];
}

function derivePrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("MODERATOR")) return "MODERATOR";
  return "USER";
}

export async function ensureRequestUser(user: RequestUser) {
  const existing = await prisma.user.findUnique({ where: { id: user.id } });

  if (!existing) {
    const nextRoles = Array.from(new Set(["USER", ...user.roles])) as AppRole[];
    return prisma.user.create({
      data: {
        id: user.id,
        email: `${user.id}@dev.duetto.local`,
        name: user.id
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        passwordHash: "__header_auth_only__",
        roles: nextRoles,
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date()
      }
    });
  }

  const existingRoles = normalizeRoles(existing.roles);
  const mergedRoles = Array.from(new Set([...existingRoles, ...user.roles])) as AppRole[];

  return prisma.user.update({
    where: { id: user.id },
    data: {
      roles: mergedRoles,
      accountStatus: existing.accountStatus === "DISABLED" ? existing.accountStatus : "ACTIVE",
      emailVerifiedAt: existing.emailVerifiedAt ?? new Date()
    }
  });
}

export function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  roles?: unknown;
  accountStatus: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  teacherProfile?: unknown;
  studentProfile?: unknown;
}) {
  const roles = normalizeRoles(user.roles);
  const role = derivePrimaryRole(roles);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    roles,
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
