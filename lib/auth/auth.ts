import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { initializeUserBoard } from "../init-user-board";
import { db, ensureDbReady } from "../db";
import * as schema from "../db/schema";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await initializeUserBoard(user.id);
        },
      },
    },
  },
});

export async function getSession() {
  const requestHeaders = await headers();
  await ensureDbReady();

  return auth.api.getSession({
    headers: requestHeaders,
  });
}

export async function signOut() {
  const requestHeaders = await headers();
  await ensureDbReady();

  const result = await auth.api.signOut({
    headers: requestHeaders,
  });

  if (result.success) {
    redirect("/sign-in");
  }
}
