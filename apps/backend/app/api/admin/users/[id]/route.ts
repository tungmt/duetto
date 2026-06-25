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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        teacherProfile: { include: { school: true } },
        studentProfile: { include: { school: true } }
      }
    });

    if (!target) return json({ error: "Not found" }, { status: 404 });
    const roles = normalizeRoles(target.roles);
    return json({ user: { ...target, roles, role: primaryRole(roles) } });
  } catch (error) {
    return handleError(error);
  }
}

const patchUserSchema = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "USER"]).optional(),
  accountStatus: z.enum(["ACTIVE", "DISABLED", "PENDING_EMAIL_VERIFICATION"]).optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const { id } = await params;
    const input = patchUserSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id }, select: { roles: true } });
    if (!existing) return json({ error: "Not found" }, { status: 404 });

    const currentRoles = normalizeRoles(existing.roles);
    const nextRoles =
      input.role === undefined
        ? currentRoles
        : input.role === "USER"
          ? (["USER"] as AppRole[])
          : Array.from(new Set(["USER", ...currentRoles, input.role])) as AppRole[];

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.accountStatus !== undefined ? { accountStatus: input.accountStatus } : {}),
        ...(input.role !== undefined ? { roles: nextRoles } : {})
      }
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
