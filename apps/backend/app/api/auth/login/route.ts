import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { toPublicUser } from "@/lib/users";
import { verifyPassword } from "@/lib/password";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
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
      return json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      return json({ error: "Invalid credentials" }, { status: 401 });
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
