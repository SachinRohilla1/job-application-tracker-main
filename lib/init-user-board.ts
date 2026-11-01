import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, sqlite } from "./db";
import { boards, columns } from "./db/schema";

const DEFAULT_COLUMNS = [
  { name: "Wish List", order: 0 },
  { name: "Applied", order: 1 },
  { name: "Interviewing", order: 2 },
  { name: "Offer", order: 3 },
  { name: "Rejected", order: 4 },
];

export async function initializeUserBoard(userId: string) {
  const existingBoard = db
    .select()
    .from(boards)
    .where(and(eq(boards.userId, userId), eq(boards.name, "Job Hunt")))
    .get();

  if (existingBoard) {
    return existingBoard;
  }

  const now = new Date();
  const boardId = randomUUID();
  const createBoard = sqlite.transaction(() => {
    db.insert(boards)
      .values({
        id: boardId,
        name: "Job Hunt",
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const newColumns = DEFAULT_COLUMNS.map((column) => ({
      id: randomUUID(),
      name: column.name,
      boardId,
      order: column.order,
      createdAt: now,
      updatedAt: now,
    }));

    db.insert(columns).values(newColumns).run();
    return newColumns;
  });

  const createdColumns = createBoard();
  return {
    id: boardId,
    name: "Job Hunt",
    userId,
    columns: createdColumns.sort((a, b) => a.order - b.order),
  };
}
