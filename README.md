# Duetto Phase 1

Phase-1 scaffold for a challenge learning product:

- `apps/backend`: Next.js API backend with Prisma and PostgreSQL.
- `apps/admin`: Next.js admin site.
- `apps/teacher-mobile`: React Native/Expo teacher app.
- `apps/student-mobile`: React Native/Expo student app.
- `packages/shared`: shared TypeScript API/domain types.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start Postgres:

```bash
docker compose up -d postgres
```

3. Configure backend env:

```bash
cp apps/backend/.env.example apps/backend/.env
```

4. Run database migration:

```bash
npm run db:migrate
```

5. Run services:

```bash
npm run dev:backend
npm run dev:admin
npm run dev:teacher
npm run dev:student
```

## Phase-1 Scope

- Teachers create video challenges with text overlays.
- Students browse challenges and submit an answer video/audio artifact.
- Teachers score submissions and leave text or voice feedback.
- Admins and moderators can monitor users, schools, classes, challenges, and submissions.
- `User` is the single login identity. Teacher and student app-specific data lives in `TeacherProfile` and `StudentProfile`, so one email can use both apps.
- Accounts include email verification state.
- Schools are optional for teachers/students, and classes are modeled for the later course/exam phase.
- Teacher/student apps include starter account, profile, progress, history, scoring, and feedback screens.

Storage/video rendering is represented by URL fields for now. The next step is adding object storage presigned uploads and an FFmpeg worker queue.
