import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireTeacherProfile } from "@/lib/users";

const updateChallengeSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    classId: z.string().optional().nullable(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required"
  });

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const { id } = await context.params;
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        submissions: {
          include: {
            student: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!challenge) {
      return json({ error: "Challenge not found" }, { status: 404 });
    }

    if (user.role === "USER") {
      const profileKind = request.headers.get("x-profile-kind");
      if (profileKind === "TEACHER" && challenge.teacherId !== user.id) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
      if (profileKind === "STUDENT" && challenge.status !== "PUBLISHED") {
        return json({ error: "Challenge not found" }, { status: 404 });
      }
    }

    const overlay = (challenge.textOverlays ?? null) as
      | {
          items?: unknown[];
          trim?: { startMs: number; endMs: number } | null;
          media?: { previewVideoUrl?: string; thumbnailUrl?: string };
        }
      | null;

    return json({
      challenge: {
        ...challenge,
        previewVideoUrl: overlay?.media?.previewVideoUrl ?? null,
        thumbnailUrl: overlay?.media?.thumbnailUrl ?? null
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

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
    const input = updateChallengeSchema.parse(await request.json());

    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) {
      return json({ error: "Challenge not found" }, { status: 404 });
    }

    if (user.role === "USER" && existing.teacherId !== user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.classId !== undefined ? { classId: input.classId } : {})
      }
    });

    return json({ challenge });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
