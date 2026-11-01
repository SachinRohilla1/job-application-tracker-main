import { auth } from "@/lib/auth/auth";
import { ensureDbReady } from "@/lib/db";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  await ensureDbReady();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  await ensureDbReady();
  return handlers.POST(request);
}
