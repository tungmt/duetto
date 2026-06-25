import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { sendVerificationEmail } from "@/lib/email";

const sendVerificationSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const input = sendVerificationSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!user) {
      return json({ error: "User not found" }, { status: 404 });
    }

    if (user.accountStatus === "ACTIVE") {
      return json({ error: "Email already verified" }, { status: 400 });
    }

    if (user.accountStatus === "DISABLED") {
      return json({ error: "Account disabled" }, { status: 403 });
    }

    // Generate and store new verification code with expiry for auditability.
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        type: "EMAIL_VERIFICATION",
        expiresAt: verificationExpiresAt
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationCode);

    return json({ message: "Verification email sent" });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
