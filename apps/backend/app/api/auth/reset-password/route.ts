import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, json, options } from "@/lib/http";

const resetSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const input = resetSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    return json({
      ok: true,
      message: user ? "Password reset request accepted" : "Password reset request accepted"
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
