# Job Application Tracker

A full-stack job search tracker for organizing applications on a drag-and-drop Kanban board. Create an account, record role details, and move applications through each stage of the hiring process.

## Features

- Email/password authentication with Better Auth
- Optional Google OAuth sign-in
- Personal board with default Wish List, Applied, Interviewing, Offer, and Rejected columns
- Create, edit, delete, and reorder job applications
- Move applications between columns with drag and drop
- Job details for company, position, location, salary, URL, notes, tags, and description
- Local SQLite storage for authentication and application data
- Responsive interface built with Next.js, React, Tailwind CSS, and Radix UI

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4, Radix UI |
| Authentication | Better Auth |
| Database | SQLite, better-sqlite3, Drizzle ORM |
| Drag and drop | dnd-kit |

## Run Locally

### Requirements

- Node.js 20.9 or newer
- npm

### Setup

```bash
git clone https://github.com/<your-github-username>/job-application-tracker.git
cd job-application-tracker
npm install
```

Copy `.env.example` to `.env.local` and set a unique local auth secret:

```env
SQLITE_DB_PATH=./data/job-application-tracker.sqlite
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

Start the application:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The SQLite database and its tables are created automatically on startup.

### Google Sign-In (Optional)

1. Create an OAuth 2.0 Client ID of type **Web application** in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
3. Add the client credentials to `.env.local`:

   ```env
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   ```

4. Restart the dev server. Email/password authentication works without Google credentials.

For a deployed site, configure the corresponding production origin and callback URI in Google Cloud and set the same environment variables on the host. The host must provide persistent storage for the SQLite file; ephemeral serverless filesystems will not preserve local data.

## Project Structure

```text
app/
  api/auth/[...all]/   Better Auth API handler
  dashboard/           Authenticated application board
  sign-in/             Sign-in page
  sign-up/             Account creation page
components/
  ui/                  Reusable Radix-based UI primitives
  kanban-board.tsx     Drag-and-drop board
  job-application-card.tsx
  create-job-dialog.tsx
lib/
  actions/             Authenticated server actions
  auth/                Better Auth server and browser clients
  db/schema.ts         SQLite and Drizzle schema
  db.ts                SQLite connection and table initialization
  hooks/               Client board state
scripts/
  seed.ts              Optional sample-data seeder
```

## Data Model

```text
User 1 ── * Board 1 ── * Column 1 ── * JobApplication
```

SQLite foreign keys enforce ownership and cascading deletion. Job application changes are performed by server actions that verify the current user and board/column ownership.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project |
| `npm run build` | Create the production build |
| `npm run start` | Serve the production build |
| `npm run seed:jobs` | Replace an existing user's applications with sample jobs |

To seed sample jobs, sign up first, set `SEED_USER_ID` to your account ID, then run `npm run seed:jobs`. Seeding deletes the selected user's current applications before inserting the samples.

## Security and Local Data

- Never commit `.env.local`, OAuth credentials, auth secrets, or the SQLite database.
- `.env.example` contains placeholders only.
- The default SQLite file is `data/job-application-tracker.sqlite`, which is ignored by Git.
- Use a unique, high-entropy `BETTER_AUTH_SECRET` outside local development.

## Continuous Integration

GitHub Actions runs dependency installation, ESLint, TypeScript checking, and a production build on pushes and pull requests to `main`.
