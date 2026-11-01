import { getSession } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { boards, columns, jobApplications } from "@/lib/db/schema";
import { initializeUserBoard } from "@/lib/init-user-board";
import { redirect } from "next/navigation";
import KanbanBoard from "@/components/kanban-board";
import { Suspense } from "react";
import { and, asc, eq } from "drizzle-orm";

async function getBoard(userId: string) {
  const board = await db
    .select()
    .from(boards)
    .where(and(eq(boards.userId, userId), eq(boards.name, "Job Hunt")))
    .get();

  if (!board) return null;

  const boardColumns = await db
    .select()
    .from(columns)
    .where(eq(columns.boardId, board.id))
    .orderBy(asc(columns.order))
    .all();

  const hydratedColumns = await Promise.all(
    boardColumns.map(async (column) => {
      const jobs = await db
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.columnId, column.id))
        .orderBy(asc(jobApplications.order))
        .all();

      return {
        _id: column.id,
        name: column.name,
        order: column.order,
        jobApplications: jobs.map((job) => ({
          _id: job.id,
          company: job.company,
          position: job.position,
          location: job.location ?? undefined,
          status: job.status,
          notes: job.notes ?? undefined,
          salary: job.salary ?? undefined,
          jobUrl: job.jobUrl ?? undefined,
          order: job.order,
          columnId: job.columnId,
          tags: JSON.parse(job.tags) as string[],
          description: job.description ?? undefined,
        })),
      };
    })
  );

  return {
    _id: board.id,
    name: board.name,
    columns: hydratedColumns,
  };
}

async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  await initializeUserBoard(session.user.id);
  const board = await getBoard(session.user.id);

  if (!board) {
    throw new Error("Unable to load the job application board.");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">Job Hunt</h1>
          <p className="text-gray-600">Track your job applications</p>
        </div>
        <KanbanBoard board={board} />
      </div>
    </div>
  );
}

export default async function Dashboard() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <DashboardPage />
    </Suspense>
  );
}
