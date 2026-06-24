import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireStudentProfile, requireTeacherProfile } from "@/lib/users";

const updateSubmissionSchema = z.object({
  answerMediaUrl: z.string().min(1).optional(),
  renderedVideoUrl: z.string().optional(),
  practiceDurationMs: z.number().int().min(0).optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required"
});

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const profileKind = request.headers.get("x-profile-kind");
    const { id } = await context.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            description: true,
            sourceVideoUrl: true,
            teacherId: true,
            teacher: { select: { id: true, name: true } }
          }
        },
        student: { select: { id: true, name: true, email: true } }
      }
    });

    if (!submission) {
      return json({ error: "Submission not found" }, { status: 404 });
    }

    if (profileKind === "STUDENT") {
      await requireStudentProfile(user.id);
      if (submission.studentId !== user.id) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (profileKind === "TEACHER") {
      await requireTeacherProfile(user.id);
      if (submission.challenge.teacherId !== user.id) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      requireRole(user, ["ADMIN", "MODERATOR"]);
    }

    return json({ submission });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    await requireStudentProfile(user.id);
    const { id } = await context.params;
    const input = updateSubmissionSchema.parse(await request.json());

    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      return json({ error: "Submission not found" }, { status: 404 });
    }

    if (existing.studentId !== user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.status === "REVIEWED") {
      return json({ error: "Reviewed submissions cannot be updated" }, { status: 400 });
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        ...(input.answerMediaUrl !== undefined ? { answerMediaUrl: input.answerMediaUrl } : {}),
        ...(input.renderedVideoUrl !== undefined ? { renderedVideoUrl: input.renderedVideoUrl } : {}),
        ...(input.practiceDurationMs !== undefined ? { practiceDurationMs: input.practiceDurationMs } : {})
      }
    });

    return json({ submission });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    await requireStudentProfile(user.id);
    const { id } = await context.params;

    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      return json({ error: "Submission not found" }, { status: 404 });
    }

    if (existing.studentId !== user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.status === "REVIEWED") {
      return json({ error: "Reviewed submissions cannot be deleted" }, { status: 400 });
    }

    await prisma.submission.delete({ where: { id } });
    return json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
