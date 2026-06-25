import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole, staffRoles } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

type AppRole = "ADMIN" | "MODERATOR" | "USER";

function normalizeRoles(value: unknown): AppRole[] {
  if (!Array.isArray(value)) return ["USER"];
  const allowed = new Set<AppRole>(["ADMIN", "MODERATOR", "USER"]);
  const roles = value.filter((item): item is string => typeof item === "string").filter((item) => allowed.has(item as AppRole)) as AppRole[];
  const deduped = Array.from(new Set(roles));
  return deduped.length ? deduped : ["USER"];
}

function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("MODERATOR")) return "MODERATOR";
  return "USER";
}

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
        ...(role ? { roles: { array_contains: role as AppRole } } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        teacherProfile: { select: { id: true, displayName: true, school: { select: { id: true, name: true } } } },
        studentProfile: { select: { id: true, displayName: true, school: { select: { id: true, name: true } } } }
      }
    });

    return json({
      users: users.map((item) => {
        const roles = normalizeRoles(item.roles);
        return { ...item, roles, role: primaryRole(roles) };
      })
    });
  } catch (error) {
    return handleError(error);
  }
}

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "USER"]).optional(),
  accountStatus: z.enum(["ACTIVE", "DISABLED", "PENDING_EMAIL_VERIFICATION"]).optional()
});

export async function OPTIONS() {
  return options();
}
