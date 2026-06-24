import { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser, requireRole } from "@/lib/auth";
import { handleError, json, options } from "@/lib/http";
import { ensureRequestUser, requireTeacherProfile } from "@/lib/users";
import { buildVideoObjectKey, createPresignedUpload } from "@/lib/storage";

const uploadRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileType: z.enum(["source", "preview", "thumbnail"])
});

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    await ensureRequestUser(user);

    if (user.role === "USER") {
      await requireTeacherProfile(user.id);
    } else {
      requireRole(user, ["ADMIN", "MODERATOR"]);
    }

    const input = uploadRequestSchema.parse(await request.json());
    const key = buildVideoObjectKey({
      userId: user.id,
      fileType: input.fileType,
      fileName: input.fileName
    });

    const upload = await createPresignedUpload({
      key,
      contentType: input.contentType,
      expiresInSeconds: 900
    });

    return json({
      uploadUrl: upload.uploadUrl,
      key: upload.key,
      publicUrl: upload.publicUrl
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
