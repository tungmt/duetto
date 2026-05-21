import { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser } from "@/lib/users";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);
    updatePasswordSchema.parse(await request.json());
    return json({ ok: true, message: "Password updated" });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
