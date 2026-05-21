-- Create profile tables before changing existing User.role values so old
-- TEACHER/STUDENT users are backfilled into the correct app profile.
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "schoolId" TEXT,
    "headline" TEXT,
    "yearsExperience" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "schoolId" TEXT,
    "gradeLevel" TEXT,
    "learningGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TeacherProfile" (
    "id", "userId", "displayName", "avatarUrl", "bio", "schoolId", "createdAt", "updatedAt"
)
SELECT
    'teacher_profile_' || "id",
    "id",
    "name",
    "avatarUrl",
    "bio",
    "schoolId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "role"::text = 'TEACHER'
ON CONFLICT DO NOTHING;

INSERT INTO "StudentProfile" (
    "id", "userId", "displayName", "avatarUrl", "bio", "schoolId", "createdAt", "updatedAt"
)
SELECT
    'student_profile_' || "id",
    "id",
    "name",
    "avatarUrl",
    "bio",
    "schoolId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "role"::text = 'STUDENT'
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");
CREATE INDEX "TeacherProfile_schoolId_idx" ON "TeacherProfile"("schoolId");
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE INDEX "StudentProfile_schoolId_idx" ON "StudentProfile"("schoolId");

ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "User_schoolId_idx";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_schoolId_fkey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "avatarUrl";
ALTER TABLE "User" DROP COLUMN IF EXISTS "bio";
ALTER TABLE "User" DROP COLUMN IF EXISTS "schoolId";

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MODERATOR', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
    CASE
        WHEN "role"::text = 'ADMIN' THEN 'ADMIN'
        WHEN "role"::text = 'MODERATOR' THEN 'MODERATOR'
        ELSE 'USER'
    END
)::"Role_new";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
