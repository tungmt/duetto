import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireStudentProfile, requireTeacherProfile } from "@/lib/users";

async function assertClassAccess(request: NextRequest, classId: string, userId: string, role: string) {
  if (role === "ADMIN" || role === "MODERATOR") {
    return;
  }

  const profileKind = request.headers.get("x-profile-kind");

  if (profileKind === "TEACHER") {
    await requireTeacherProfile(userId);
    const classRoom = await prisma.class.findFirst({ where: { id: classId, teacherId: userId } });
    if (!classRoom) {
      throw new Response("Forbidden", { status: 403 });
    }
    return;
  }

  if (profileKind === "STUDENT") {
    await requireStudentProfile(userId);
    const enrollment = await prisma.classEnrollment.findFirst({ where: { classId, studentId: userId } });
    if (!enrollment) {
      throw new Response("Forbidden", { status: 403 });
    }
    return;
  }

  requireRole({ id: userId, role: role as "ADMIN" | "MODERATOR" | "USER" }, ["ADMIN", "MODERATOR"]);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);

    const { id } = await context.params;
    await assertClassAccess(request, id, user.id, user.role);

    const classRoom = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: { select: { enrollments: true, challenges: true } },
        teacher: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        enrollments: {
          orderBy: { createdAt: "desc" },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                studentProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                    bio: true,
                    gradeLevel: true,
                    learningGoal: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!classRoom) {
      return json({ error: "Class not found" }, { status: 404 });
    }

    const students = classRoom.enrollments.map((item) => ({
      id: item.student.id,
      name: item.student.name,
      email: item.student.email,
      displayName: item.student.studentProfile?.displayName,
      avatarUrl: item.student.studentProfile?.avatarUrl,
      bio: item.student.studentProfile?.bio,
      gradeLevel: item.student.studentProfile?.gradeLevel,
      learningGoal: item.student.studentProfile?.learningGoal,
      enrolledAt: item.createdAt
    }));

    return json({
      class: {
        id: classRoom.id,
        name: classRoom.name,
        description: classRoom.description,
        teacher: classRoom.teacher,
        school: classRoom.school,
        _count: classRoom._count,
        students
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
