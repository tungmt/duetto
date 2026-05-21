import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireTeacherProfile } from "@/lib/users";

const scoreSubmissionSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedbackText: z.string().optional(),
  feedbackVoiceUrl: z.string().url().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    if (user.role === "USER") {
      await requireTeacherProfile(user.id);
    } else {
      requireRole(user, ["ADMIN", "MODERATOR"]);
    }

    const { id } = await context.params;
    const input = scoreSubmissionSchema.parse(await request.json());

    const existing = await prisma.submission.findUnique({
      where: { id },
      include: { challenge: true }
    });

    if (!existing) {
      return json({ error: "Submission not found" }, { status: 404 });
    }

    if (user.role === "USER" && existing.challenge.teacherId !== user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        ...input,
        status: "REVIEWED"
      }
    });

    return json({ submission });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
