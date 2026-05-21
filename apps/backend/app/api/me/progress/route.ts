import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireStudentProfile, requireTeacherProfile } from "@/lib/users";

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const profileKind = request.headers.get("x-profile-kind");

    if (profileKind === "STUDENT") {
      await requireStudentProfile(user.id);
      const [totalChallenges, submissions, scoreAggregate] = await Promise.all([
        prisma.challenge.count({ where: { status: "PUBLISHED" } }),
        prisma.submission.findMany({
          where: { studentId: user.id },
          orderBy: { createdAt: "desc" },
          include: {
            challenge: { select: { id: true, title: true, teacherId: true } }
          }
        }),
        prisma.submission.aggregate({
          where: { studentId: user.id, score: { not: null } },
          _avg: { score: true }
        })
      ]);

      return json({
        progress: {
          totalChallenges,
          submittedAnswers: submissions.length,
          reviewedAnswers: submissions.filter((item) => item.status === "REVIEWED").length,
          averageScore: scoreAggregate._avg.score
        },
        answerHistory: submissions
      });
    }

    if (profileKind === "TEACHER") {
      await requireTeacherProfile(user.id);
      const [uploadedVideos, submissions, scoreAggregate] = await Promise.all([
        prisma.challenge.count({ where: { teacherId: user.id } }),
        prisma.submission.findMany({
          where: { challenge: { teacherId: user.id } },
          orderBy: { createdAt: "desc" },
          include: {
            challenge: { select: { id: true, title: true } },
            student: { select: { id: true, name: true, email: true } }
          }
        }),
        prisma.submission.aggregate({
          where: { challenge: { teacherId: user.id }, score: { not: null } },
          _avg: { score: true }
        })
      ]);

      return json({
        progress: {
          uploadedVideos,
          studentAnswers: submissions.length,
          reviewedAnswers: submissions.filter((item) => item.status === "REVIEWED").length,
          averageScore: scoreAggregate._avg.score
        },
        studentAnswers: submissions
      });
    }

    return json({ progress: {}, answerHistory: [] });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
