-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "answerPeriods" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "answerSegments" JSONB NOT NULL DEFAULT '[]';
