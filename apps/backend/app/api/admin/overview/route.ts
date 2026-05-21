import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    requireRole(user, ["ADMIN", "MODERATOR"]);
    await ensureRequestUser(user);

    const [users, schools, classes, challenges, submissions] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          teacherProfile: { include: { school: { select: { id: true, name: true } } } },
          studentProfile: { include: { school: { select: { id: true, name: true } } } }
        }
      }),
      prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.class.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          school: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } }
        }
      }),
      prisma.challenge.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { teacher: { select: { id: true, name: true } } }
      }),
      prisma.submission.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          challenge: { select: { id: true, title: true } },
          student: { select: { id: true, name: true } }
        }
      })
    ]);

    return json({
      counts: {
        users: users.length,
        schools: schools.length,
        classes: classes.length,
        challenges: challenges.length,
        submissions: submissions.length,
        pendingVerification: users.filter(
          (item) => item.accountStatus === "PENDING_EMAIL_VERIFICATION"
        ).length,
        teachers: users.filter((item) => item.teacherProfile).length,
        students: users.filter((item) => item.studentProfile).length
      },
      users,
      schools,
      classes,
      challenges,
      submissions
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
