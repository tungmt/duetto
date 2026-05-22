import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole, staffRoles } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const { id } = await params;

    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        school: true,
        teacher: { select: { id: true, name: true } },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentProfile: { select: { displayName: true, avatarUrl: true } }
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        challenges: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { submissions: true } } }
        }
      }
    });

    if (!cls) return json({ error: "Not found" }, { status: 404 });
    return json({ class: cls });
  } catch (error) {
    return handleError(error);
  }
}

const patchClassSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  schoolId: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, staffRoles);
    await ensureRequestUser(user);

    const { id } = await params;
    const input = patchClassSchema.parse(await request.json());
    const updated = await prisma.class.update({ where: { id }, data: input });
    return json({ class: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN"]);
    await ensureRequestUser(user);

    const { id } = await params;
    await prisma.class.delete({ where: { id } });
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
