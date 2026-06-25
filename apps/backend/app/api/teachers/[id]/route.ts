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
    const profileKind = request.headers.get("x-profile-kind");

    const teacher = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        teacherProfile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
            headline: true,
            yearsExperience: true,
            school: { select: { id: true, name: true } }
          }
        },
        teacherChallenges: {
          where: profileKind === "STUDENT" ? { status: "PUBLISHED", sourceVideoUrl: { not: "" } } : { sourceVideoUrl: { not: "" } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            sourceVideoUrl: true,
            createdAt: true,
            _count: { select: { submissions: true } }
          }
        }
      }
    });

    if (!teacher || !teacher.teacherProfile) {
      return json({ error: "Teacher not found" }, { status: 404 });
    }

    return json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        displayName: teacher.teacherProfile.displayName || teacher.name,
        avatarUrl: teacher.teacherProfile.avatarUrl,
        bio: teacher.teacherProfile.bio,
        headline: teacher.teacherProfile.headline,
        yearsExperience: teacher.teacherProfile.yearsExperience,
        school: teacher.teacherProfile.school,
        challenges: teacher.teacherChallenges
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

export function OPTIONS() {
  return options();
}
