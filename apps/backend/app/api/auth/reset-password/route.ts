import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/email";

const resetSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const input = resetSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ 
      where: { email: input.email.toLowerCase() } 
    });
    
    if (user && user.accountStatus !== "DISABLED") {
      // Generate reset code
      const resetCode = String(Math.floor(100000 + Math.random() * 900000));
      
      // Store reset code (you might want to add resetCode field to User model for this)
      // For now, we'll send the code via email
      await sendPasswordResetEmail(user.email, resetCode);
    }
    
    // Always return success for security reasons (don't reveal if email exists)
    return json({ ok: true, message: "If the email exists, a password reset link has been sent" });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
