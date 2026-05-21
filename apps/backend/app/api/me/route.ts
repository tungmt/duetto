import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, toPublicUser } from "@/lib/users";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional()
});

export async function GET(request: NextRequest) {
  try {
    const requestUser = getRequestUser(request);
    await ensureRequestUser(requestUser);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: requestUser.id },
      include: {
        teacherProfile: true,
        studentProfile: true
      }
    });
    return json({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const requestUser = getRequestUser(request);
    await ensureRequestUser(requestUser);
    const input = updateProfileSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: requestUser.id },
      data: input,
      include: {
        teacherProfile: true,
        studentProfile: true
      }
    });

    return json({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const requestUser = getRequestUser(request);
    await ensureRequestUser(requestUser);
    const user = await prisma.user.update({
      where: { id: requestUser.id },
      data: {
        accountStatus: "DISABLED",
        deletedAt: new Date()
      }
    });

    return json({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
