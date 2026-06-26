import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireTeacherProfile } from "@/lib/users";

const answerPeriodSchema = z
  .object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(1),
    label: z.string().optional()
  })
  .refine((period) => period.endMs > period.startMs, {
    message: "endMs must be greater than startMs"
  });

const answerPeriodInputSchema = z.preprocess((value) => {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  const period = value as {
    startMs?: unknown;
    endMs?: unknown;
    startSeconds?: unknown;
    endSeconds?: unknown;
    label?: unknown;
  };

  if (typeof period.startMs === "number" && typeof period.endMs === "number") {
    return {
      startMs: Math.floor(period.startMs),
      endMs: Math.ceil(period.endMs),
      label: typeof period.label === "string" ? period.label : undefined
    };
  }

  if (typeof period.startSeconds === "number" && typeof period.endSeconds === "number") {
    return {
      startMs: Math.floor(period.startSeconds * 1000),
      endMs: Math.ceil(period.endSeconds * 1000),
      label: typeof period.label === "string" ? period.label : undefined
    };
  }

  return value;
}, answerPeriodSchema);

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
  answerPeriods: z.array(answerPeriodInputSchema).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT")
});

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const searchParams = request.nextUrl.searchParams;
    const limitParam = Number(searchParams.get("limit") ?? "5");
    const limit = Number.isFinite(limitParam)
      ? Math.max(5, Math.min(10, Math.floor(limitParam)))
      : 5;
    const cursor = searchParams.get("cursor");
    const cursorDate = cursor ? new Date(cursor) : null;

    const profileKind = request.headers.get("x-profile-kind");
    const baseWhere = {
      sourceVideoUrl: { not: "" }
    };

    const whereBase =
      profileKind === "TEACHER"
        ? { ...baseWhere, teacherId: user.id }
        : profileKind === "STUDENT"
          ? { ...baseWhere, status: "PUBLISHED" as const }
          : baseWhere;

    const where =
      cursorDate && !Number.isNaN(cursorDate.getTime())
        ? { ...whereBase, createdAt: { lt: cursorDate } }
        : whereBase;

    const rawVideos = await prisma.challenge.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            teacherProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
                headline: true
              }
            }
          }
        },
        school: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { submissions: true } }
      }
    });

    const hasMore = rawVideos.length > limit;
    const pagedVideos = hasMore ? rawVideos.slice(0, limit) : rawVideos;

    const videos = pagedVideos.map((video) => {
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

    const nextCursor = hasMore
      ? pagedVideos[pagedVideos.length - 1]?.createdAt?.toISOString() ?? null
      : null;

    return json({ videos, paging: { hasMore, nextCursor } });
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
        answerPeriods: input.answerPeriods as Prisma.InputJsonValue,
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
