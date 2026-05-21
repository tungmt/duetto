import { NextRequest } from "next/server";
import { Role } from "@duetto/shared";

export type RequestUser = {
  id: string;
  role: Role;
};

export function getRequestUser(request: NextRequest): RequestUser {
  const id = request.headers.get("x-user-id");
  const role = (request.headers.get("x-role") as Role | null) ?? "USER";

  if (!id) {
    throw new Response("Missing x-user-id header", { status: 401 });
  }

  return { id, role };
}

export function requireRole(user: RequestUser, roles: Role[]) {
  if (!roles.includes(user.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export const staffRoles: Role[] = ["ADMIN", "MODERATOR"];
