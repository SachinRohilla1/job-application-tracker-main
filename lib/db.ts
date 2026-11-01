import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./db/schema";

const configuredUrl = process.env.TURSO_DATABASE_URL;
if (!configuredUrl && process.env.VERCEL === "1") {
  throw new Error(
    "TURSO_DATABASE_URL is required on Vercel. Configure a persistent Turso database before deploying."
  );
}

const localDatabasePath = path.resolve(
  process.cwd(),
  process.env.SQLITE_DB_PATH || "data/job-application-tracker.sqlite"
);
const databaseUrl =
  configuredUrl || `file:${localDatabasePath.replace(/\\/g, "/")}`;
const isLocalDatabase = databaseUrl.startsWith("file:");
const authToken = process.env.TURSO_AUTH_TOKEN;

if (isLocalDatabase) {
  mkdirSync(path.dirname(localDatabasePath), { recursive: true });
} else if (!authToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL points to a remote database."
  );
}

export const client = createClient({
  url: databaseUrl,
  ...(authToken ? { authToken } : {}),
});

export const db = drizzle(client, { schema });

export const dbReady = client.executeMultiple(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON user(email);

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY NOT NULL,
    expiresAt INTEGER NOT NULL,
    token TEXT NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON session(token);

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY NOT NULL,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope TEXT,
    password TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_unique
    ON account(providerId, accountId);

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY NOT NULL,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    boardId TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobApplications (
    id TEXT PRIMARY KEY NOT NULL,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'applied',
    columnId TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    boardId TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    salary TEXT,
    jobUrl TEXT,
    appliedDate INTEGER,
    tags TEXT NOT NULL DEFAULT '[]',
    description TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS job_applications_column_order
    ON jobApplications(columnId, "order");
  CREATE INDEX IF NOT EXISTS job_applications_user
    ON jobApplications(userId);
`);
