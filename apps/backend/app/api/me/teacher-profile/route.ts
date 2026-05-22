import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

const teacherProfileSchema = z.object({
  displayName: z.string().min(1),
  phoneNumber: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  schoolId: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  yearsExperience: z.number().int().min(0).nullable().optional()
});

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
    return json({ profile });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    const input = teacherProfileSchema.parse(await request.json());
    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: input,
      create: {
        userId: user.id,
        ...input
      }
    });

    return json({ profile });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
