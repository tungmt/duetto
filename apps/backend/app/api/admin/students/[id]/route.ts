import { NextRequest } from "next/server";
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

    const student = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        studentProfile: { include: { school: true } }
      }
    });

    if (!student || !student.studentProfile) {
      return json({ error: "Student not found" }, { status: 404 });
    }

    const [submissions, enrollments] = await Promise.all([
      prisma.submission.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              description: true,
              teacher: { select: { id: true, name: true } }
            }
          }
        }
      }),
      prisma.classEnrollment.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        include: {
          class: {
            include: {
              school: { select: { id: true, name: true } },
              teacher: { select: { id: true, name: true } }
            }
          }
        }
      })
    ]);

    return json({
      student,
      submissions,
      classes: enrollments.map((e) => e.class)
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
