import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireTeacherProfile } from "@/lib/users";

const createChallengeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  sourceVideoUrl: z.string().min(1),
  previewVideoUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  textOverlays: z.array(z.unknown()).default([]),
  trim: z
    .object({
      startMs: z.number().int().min(0),
      endMs: z.number().int().min(0)
    })
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT")
});

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const profileKind = request.headers.get("x-profile-kind");
    const where =
      profileKind === "TEACHER"
        ? { teacherId: user.id }
        : profileKind === "STUDENT"
          ? { status: "PUBLISHED" as const }
          : {};

    const rawVideos = await prisma.challenge.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { submissions: true } }
      }
    });

    const videos = rawVideos.map((video) => {
      const overlay = (video.textOverlays ?? null) as
        | {
            items?: unknown[];
            trim?: { startMs: number; endMs: number } | null;
            media?: { previewVideoUrl?: string; thumbnailUrl?: string };
          }
        | null;

      return {
        ...video,
        previewVideoUrl: overlay?.media?.previewVideoUrl ?? null,
        thumbnailUrl: overlay?.media?.thumbnailUrl ?? null
      };
    });

    return json({ videos });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    if (user.role === "USER") {
      await requireTeacherProfile(user.id);
    } else {
      requireRole(user, ["ADMIN", "MODERATOR"]);
    }

    const input = createChallengeSchema.parse(await request.json());
    const challenge = await prisma.challenge.create({
      data: {
        title: input.title,
        description: input.description,
        schoolId: input.schoolId,
        classId: input.classId,
        sourceVideoUrl: input.sourceVideoUrl,
        status: input.status,
        textOverlays: {
          items: input.textOverlays,
          trim: input.trim ?? null,
          media: {
            previewVideoUrl: input.previewVideoUrl ?? null,
            thumbnailUrl: input.thumbnailUrl ?? null
          }
        } as Prisma.InputJsonValue,
        teacherId: user.id
      }
    });

    return json({ challenge }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
