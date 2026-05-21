export type Role = "ADMIN" | "MODERATOR" | "USER";

export type ProfileKind = "TEACHER" | "STUDENT";

export type AccountStatus = "PENDING_EMAIL_VERIFICATION" | "ACTIVE" | "DISABLED";

export type ChallengeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type SubmissionStatus = "SUBMITTED" | "REVIEWED";

export type AccountDto = {
  id: string;
  email: string;
  name: string;
  role: Role;
  accountStatus: AccountStatus;
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  bio: string | null;
  teacherProfile: TeacherProfileDto | null;
  studentProfile: StudentProfileDto | null;
  createdAt: string;
};

export type TeacherProfileDto = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  schoolId: string | null;
  headline: string | null;
  yearsExperience: number | null;
};

export type StudentProfileDto = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  schoolId: string | null;
  gradeLevel: string | null;
  learningGoal: string | null;
};

export type SchoolDto = {
  id: string;
  name: string;
  createdAt: string;
};

export type ClassDto = {
  id: string;
  schoolId: string | null;
  teacherId: string | null;
  name: string;
  description: string | null;
  createdAt: string;
};

export type TextOverlay = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  color: string;
};

export type ChallengeDto = {
  id: string;
  title: string;
  description: string | null;
  teacherId: string;
  sourceVideoUrl: string;
  textOverlays: TextOverlay[];
  status: ChallengeStatus;
  createdAt: string;
};

export type SubmissionDto = {
  id: string;
  challengeId: string;
  studentId: string;
  answerMediaUrl: string;
  renderedVideoUrl: string | null;
  status: SubmissionStatus;
  score: number | null;
  feedbackText: string | null;
  feedbackVoiceUrl: string | null;
  practiceDurationMs: number | null;
  createdAt: string;
};

export type LearningProgressDto = {
  totalChallenges: number;
  submittedAnswers: number;
  reviewedAnswers: number;
  averageScore: number | null;
};

export type RegisterInput = {
  email: string;
  name: string;
  profileKind?: ProfileKind;
  schoolId?: string;
};

export type UpdateProfileInput = {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  schoolId?: string | null;
};

export type CreateChallengeInput = {
  title: string;
  description?: string;
  sourceVideoUrl: string;
  textOverlays?: TextOverlay[];
  status?: ChallengeStatus;
};

export type CreateSubmissionInput = {
  challengeId: string;
  answerMediaUrl: string;
  renderedVideoUrl?: string;
  practiceDurationMs?: number;
};

export type ScoreSubmissionInput = {
  score: number;
  feedbackText?: string;
  feedbackVoiceUrl?: string;
};
