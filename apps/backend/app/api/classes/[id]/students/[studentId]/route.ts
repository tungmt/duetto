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

  requireRole({ id: userId, role: role as "ADMIN" | "MODERATOR" | "USER", roles: [role as "ADMIN" | "MODERATOR" | "USER"] }, ["ADMIN", "MODERATOR"]);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);

    const { id: classId, studentId } = await context.params;
    await assertClassAccess(request, classId, user.id, user.role);

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
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
    });

    if (!enrollment) {
      return json({ error: "Student is not enrolled in this class" }, { status: 404 });
    }

    const [submissions, scoreAggregate] = await Promise.all([
      prisma.submission.findMany({
        where: {
          studentId,
          challenge: { classId }
        },
        orderBy: { createdAt: "desc" },
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      }),
      prisma.submission.aggregate({
        where: {
          studentId,
          challenge: { classId },
          score: { not: null }
        },
        _avg: { score: true }
      })
    ]);

    const reviewedSubmissions = submissions.filter((item) => item.status === "REVIEWED").length;

    return json({
      student: {
        id: enrollment.student.id,
        name: enrollment.student.name,
        email: enrollment.student.email,
        displayName: enrollment.student.studentProfile?.displayName,
        avatarUrl: enrollment.student.studentProfile?.avatarUrl,
        bio: enrollment.student.studentProfile?.bio,
        gradeLevel: enrollment.student.studentProfile?.gradeLevel,
        learningGoal: enrollment.student.studentProfile?.learningGoal,
        enrolledAt: enrollment.createdAt
      },
      stats: {
        totalSubmissions: submissions.length,
        reviewedSubmissions,
        averageScore: scoreAggregate._avg.score
      },
      submissions
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
