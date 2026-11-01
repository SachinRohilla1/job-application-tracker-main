import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./db/schema";

const databasePath = path.resolve(
  process.cwd(),
  process.env.SQLITE_DB_PATH || "data/job-application-tracker.sqlite"
);

mkdirSync(path.dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
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

export const db = drizzle(sqlite, { schema });
