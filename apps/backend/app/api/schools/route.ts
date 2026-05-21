import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

const schoolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export async function GET() {
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  return json({ schools });
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN", "MODERATOR"]);
    await ensureRequestUser(user);
    const input = schoolSchema.parse(await request.json());
    const school = await prisma.school.create({ data: input });
    return json({ school }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
