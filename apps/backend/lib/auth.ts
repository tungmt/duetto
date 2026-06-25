import { NextRequest } from "next/server";
import { Role } from "@duetto/shared";

export type RequestUser = {
  id: string;
  role: Role;
  roles: Role[];
};

const rolePriority: Role[] = ["ADMIN", "MODERATOR", "USER"];

function normalizeRoles(value: unknown): Role[] {
  const allowed = new Set<Role>(["ADMIN", "MODERATOR", "USER"]);
  const result: Role[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && allowed.has(item as Role)) {
        result.push(item as Role);
      }
    }
  }

  if (typeof value === "string") {
    for (const part of value.split(",")) {
      const role = part.trim();
      if (allowed.has(role as Role)) {
        result.push(role as Role);
      }
    }
  }

  const deduped = Array.from(new Set(result));
  return deduped.length ? deduped : ["USER"];
}

function derivePrimaryRole(roles: Role[]): Role {
  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }
  return "USER";
}

export function getRequestUser(request: NextRequest): RequestUser {
  const id = request.headers.get("x-user-id");
  const rolesHeader = request.headers.get("x-roles");
  const roleHeader = request.headers.get("x-role");

  let parsedRoles: Role[] = ["USER"];
  if (rolesHeader) {
    try {
      const parsed = JSON.parse(rolesHeader);
      parsedRoles = normalizeRoles(parsed);
    } catch {
      parsedRoles = normalizeRoles(rolesHeader);
    }
  } else if (roleHeader) {
    parsedRoles = normalizeRoles(roleHeader);
  }

  const role = derivePrimaryRole(parsedRoles);

  if (!id) {
    throw new Response("Missing x-user-id header", { status: 401 });
  }

  return { id, role, roles: parsedRoles };
}

export function requireRole(user: RequestUser, roles: Role[]) {
  if (!user.roles.some((role) => roles.includes(role))) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export function hasRole(user: RequestUser, role: Role) {
  return user.roles.includes(role);
}

export const staffRoles: Role[] = ["ADMIN", "MODERATOR"];
