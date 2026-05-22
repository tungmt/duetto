import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole, staffRoles } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const classes = await prisma.class.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        school: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { enrollments: true, challenges: true } }
      }
    });

    return json({ classes });
  } catch (error) {
    return handleError(error);
  }
}

const createClassSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  schoolId: z.string().optional(),
  teacherId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const input = createClassSchema.parse(await request.json());
    const newClass = await prisma.class.create({ data: input });
    return json({ class: newClass }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
