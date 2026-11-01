"use server";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "../auth/auth";
import { db } from "../db";
import { boards, columns, jobApplications } from "../db/schema";

interface JobApplicationData {
  company: string;
  position: string;
  location?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  columnId: string;
  boardId: string;
  tags?: string[];
  description?: string;
}

function serializeJob<T extends { id: string; tags: string }>(job: T) {
  const { id, tags, ...fields } = job;
  return { ...fields, _id: id, tags: JSON.parse(tags) as string[] };
}

export async function createJobApplication(data: JobApplicationData) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const {
    company,
    position,
    location,
    notes,
    salary,
    jobUrl,
    columnId,
    boardId,
    tags,
    description,
  } = data;

  if (!company?.trim() || !position?.trim() || !columnId || !boardId) {
    return { error: "Missing required fields" };
  }

  const board = await db
    .select()
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.userId, session.user.id)))
    .get();

  if (!board) {
    return { error: "Board not found" };
  }

  const column = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)))
    .get();

  if (!column) {
    return { error: "Column not found" };
  }

  const lastJob = await db
    .select({ order: jobApplications.order })
    .from(jobApplications)
    .where(eq(jobApplications.columnId, columnId))
    .orderBy(desc(jobApplications.order))
    .limit(1)
    .get();
  const now = new Date();
  const job = await db
    .insert(jobApplications)
    .values({
      id: randomUUID(),
      company: company.trim(),
      position: position.trim(),
      location,
      notes,
      salary,
      jobUrl,
      columnId,
      boardId,
      userId: session.user.id,
      tags: JSON.stringify(tags ?? []),
      description,
      status: "applied",
      order: lastJob ? lastJob.order + 100 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  revalidatePath("/dashboard");
  return { data: serializeJob(job) };
}

export async function updateJobApplication(
  id: string,
  updates: {
    company?: string;
    position?: string;
    location?: string;
    notes?: string;
    salary?: string;
    jobUrl?: string;
    columnId?: string;
    order?: number;
    tags?: string[];
    description?: string;
  }
) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const job = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.id, id))
    .get();

  if (!job) {
    return { error: "Job application not found" };
  }

  if (job.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  const { columnId, order, tags, ...fields } = updates;
  const targetColumnId = columnId ?? job.columnId;
  const targetColumn = await db
    .select()
    .from(columns)
    .where(
      and(
        eq(columns.id, targetColumnId),
        eq(columns.boardId, job.boardId)
      )
    )
    .get();

  if (!targetColumn) {
    return { error: "Column not found" };
  }

  const now = new Date();
  const jobChanges = {
    ...fields,
    ...(tags === undefined ? {} : { tags: JSON.stringify(tags) }),
    updatedAt: now,
  };
  const isMoving = targetColumnId !== job.columnId;
  const shouldReorder = isMoving || order !== undefined;

  if (shouldReorder) {
    await db.transaction(async (tx) => {
      const targetJobs = await tx
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.columnId, targetColumnId),
            ne(jobApplications.id, id)
          )
        )
        .orderBy(asc(jobApplications.order))
        .all();

      const insertAt =
        order === undefined
          ? targetJobs.length
          : Math.max(0, Math.min(order, targetJobs.length));
      targetJobs.splice(insertAt, 0, { id });

      for (const [index, item] of targetJobs.entries()) {
        await tx.update(jobApplications)
          .set(
            item.id === id
              ? {
                  ...jobChanges,
                  columnId: targetColumnId,
                  order: index * 100,
                }
              : { order: index * 100, updatedAt: now }
          )
          .where(eq(jobApplications.id, item.id))
          .run();
      }
    });
  } else if (Object.keys(jobChanges).length > 1) {
    await db.update(jobApplications)
      .set(jobChanges)
      .where(eq(jobApplications.id, id))
      .run();
  }

  const updated = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.id, id))
    .get();

  if (!updated) {
    return { error: "Unable to update job application" };
  }

  revalidatePath("/dashboard");
  return { data: serializeJob(updated) };
}

export async function deleteJobApplication(id: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const job = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.id, id))
    .get();

  if (!job) {
    return { error: "Job application not found" };
  }

  if (job.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  await db.delete(jobApplications).where(eq(jobApplications.id, id)).run();
  revalidatePath("/dashboard");

  return { success: true };
}
