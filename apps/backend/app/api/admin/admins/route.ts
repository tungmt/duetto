import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
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

// List admins & moderators
export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const admins = await prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [{ roles: { array_contains: "ADMIN" } }, { roles: { array_contains: "MODERATOR" } }]
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, roles: true, accountStatus: true, createdAt: true }
    });

    return json({
      admins: admins.map((item) => {
        const roles = normalizeRoles(item.roles);
        return { ...item, roles, role: primaryRole(roles) };
      })
    });
  } catch (error) {
    return handleError(error);
  }
}

const promoteSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MODERATOR"])
});

// Promote a user to admin/moderator
export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const input = promoteSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id: input.userId }, select: { roles: true } });
    if (!existing) {
      return json({ error: "User not found" }, { status: 404 });
    }
    const mergedRoles = Array.from(new Set(["USER", ...normalizeRoles(existing.roles), input.role])) as AppRole[];

    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: { roles: mergedRoles },
      select: { id: true, name: true, email: true, roles: true }
    });

    const roles = normalizeRoles(updated.roles);
    return json({ user: { ...updated, roles, role: primaryRole(roles) } });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
