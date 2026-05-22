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

    const teacher = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        teacherProfile: { include: { school: true } }
      }
    });

    if (!teacher || !teacher.teacherProfile) {
      return json({ error: "Teacher not found" }, { status: 404 });
    }

    const [challenges, classes] = await Promise.all([
      prisma.challenge.findMany({
        where: { teacherId: id },
        orderBy: { createdAt: "desc" },
        include: {
          class: { select: { id: true, name: true } },
          school: { select: { id: true, name: true } },
          _count: { select: { submissions: true } }
        }
      }),
      prisma.class.findMany({
        where: { teacherId: id },
        orderBy: { createdAt: "desc" },
        include: {
          school: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, challenges: true } },
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  studentProfile: { select: { displayName: true } }
                }
              }
            }
          }
        }
      })
    ]);

    // Collect all unique students enrolled in teacher's classes
    const studentMap = new Map<string, { id: string; name: string; displayName: string | null }>();
    for (const cls of classes) {
      for (const enr of cls.enrollments) {
        studentMap.set(enr.student.id, {
          id: enr.student.id,
          name: enr.student.name,
          displayName: enr.student.studentProfile?.displayName ?? null
        });
      }
    }

    return json({
      teacher,
      challenges,
      classes,
      students: Array.from(studentMap.values())
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
