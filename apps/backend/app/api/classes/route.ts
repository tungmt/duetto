import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireTeacherProfile } from "@/lib/users";

const classSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  schoolId: z.string().optional(),
  teacherId: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const profileKind = request.headers.get("x-profile-kind");
    const where =
      profileKind === "TEACHER"
        ? { teacherId: user.id }
        : profileKind === "STUDENT"
          ? { enrollments: { some: { studentId: user.id } } }
          : {};

    const classes = await prisma.class.findMany({
      where,
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

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    if (user.role === "USER") {
      await requireTeacherProfile(user.id);
    } else {
      requireRole(user, ["ADMIN", "MODERATOR"]);
    }
    const input = classSchema.parse(await request.json());
    const classRoom = await prisma.class.create({
      data: {
        ...input,
        teacherId: input.teacherId ?? (user.role === "USER" ? user.id : undefined)
      }
    });

    return json({ class: classRoom }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
