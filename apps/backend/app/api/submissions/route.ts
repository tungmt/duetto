import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireStudentProfile } from "@/lib/users";

const createSubmissionSchema = z.object({
  challengeId: z.string().min(1),
  answerMediaUrl: z.string().min(1),
  renderedVideoUrl: z.string().optional(),
  practiceDurationMs: z.number().int().min(0).optional()
});

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const profileKind = request.headers.get("x-profile-kind");
    const where =
      profileKind === "TEACHER"
        ? { challenge: { teacherId: user.id } }
        : profileKind === "STUDENT"
          ? { studentId: user.id }
          : {};

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            teacherId: true,
            sourceVideoUrl: true
          }
        },
        student: { select: { id: true, name: true } }
      }
    });

    return json({ submissions });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    await requireStudentProfile(user.id);

    const input = createSubmissionSchema.parse(await request.json());
    const submission = await prisma.submission.create({
      data: {
        ...input,
        studentId: user.id
      }
    });

    return json({ submission }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
