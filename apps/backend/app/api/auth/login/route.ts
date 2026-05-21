import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { toPublicUser } from "@/lib/users";

const loginSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        teacherProfile: true,
        studentProfile: true
      }
    });

    if (!user || user.accountStatus === "DISABLED") {
      return json({ error: "Invalid account" }, { status: 401 });
    }

    if (user.accountStatus !== "ACTIVE") {
      return json({ error: "Email verification required", user: toPublicUser(user) }, { status: 403 });
    }

    return json({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
