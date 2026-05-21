import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

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

    return json({ challenge });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
