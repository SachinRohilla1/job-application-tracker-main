import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db, dbReady } from "../lib/db";
import { boards, columns, jobApplications, user } from "../lib/db/schema";
import { initializeUserBoard } from "../lib/init-user-board";

const USER_ID = process.env.SEED_USER_ID;

const SAMPLE_JOBS = [
  // Wish List
  {
    company: "MU Company",
    position: "Software Developer",
    location: "San Francisco, CA",
    tags: ["React", "Tailwind", "High Pay"],
    description: "Build modern web applications using React and Tailwind CSS",
    jobUrl: "https://example.com/jobs/1",
    salary: "$120k - $150k",
  },
  {
    company: "Stripe",
    position: "Front End Developer",
    location: "Remote",
    tags: ["TypeScript", "React", "Next.js"],
    description: "Work on payment infrastructure frontend",
    jobUrl: "https://example.com/jobs/2",
    salary: "$130k - $160k",
  },
  {
    company: "Nutrishe",
    position: "QA Engineer",
    location: "New York, NY",
    tags: ["CIT", "Appium", "CI/CD"],
    description: "Ensure quality of mobile and web applications",
    jobUrl: "https://example.com/jobs/3",
    salary: "$90k - $110k",
  },
  // Applied
  {
    company: "LeaFood",
    position: "DevOps Engineer",
    location: "Austin, TX",
    tags: ["promQL", "Full-stack", "Docker"],
    description: "Manage infrastructure and deployment pipelines",
    jobUrl: "https://example.com/jobs/4",
    salary: "$110k - $140k",
  },
  {
    company: "Nomura",
    position: "Mobile Developer",
    location: "Tokyo, Japan",
    tags: ["React Native", "iOS", "Android"],
    description: "Develop mobile applications for financial services",
    jobUrl: "https://example.com/jobs/5",
    salary: "$100k - $130k",
  },
  {
    company: "Wise",
    position: "UI/UX Designer",
    location: "London, UK",
    tags: ["Figma", "Design Systems", "User Research"],
    description: "Design beautiful and intuitive user experiences",
    jobUrl: "https://example.com/jobs/6",
    salary: "$80k - $100k",
  },
  {
    company: "Danone",
    position: "DevOps Engineer",
    location: "Paris, France",
    tags: ["promQL", "Full-stack", "Docker"],
    description: "Support cloud infrastructure and CI/CD",
    jobUrl: "https://example.com/jobs/7",
    salary: "$95k - $120k",
  },
  // Interviewing
  {
    company: "Retomotion",
    position: "Web Designer",
    location: "Berlin, Germany",
    tags: ["Figma", "React", "Bootstrap"],
    description: "Create responsive web designs and implement them",
    jobUrl: "https://example.com/jobs/8",
    salary: "$85k - $105k",
  },
  {
    company: "WorkLab",
    position: "Product Manager",
    location: "Seattle, WA",
    tags: ["Product Strategy", "Agile", "Analytics"],
    description:
      "Help drive the product and business planning for our platform",
    jobUrl: "https://example.com/jobs/9",
    salary: "$140k - $170k",
  },
  {
    company: "I Networks",
    position: "Mobile Developer",
    location: "Remote",
    tags: ["Flutter", "Dart", "Firebase"],
    description: "Build cross-platform mobile applications",
    jobUrl: "https://example.com/jobs/10",
    salary: "$115k - $145k",
  },
  // Offer
  {
    company: "Profan",
    position: "Software Developer",
    location: "Stockholm, Sweden",
    tags: ["Node.js", "PostgreSQL", "AWS"],
    description: "Develop backend services and APIs",
    jobUrl: "https://example.com/jobs/11",
    salary: "$100k - $125k",
  },
  {
    company: "MUS Logistics",
    position: "UI Designer",
    location: "Amsterdam, Netherlands",
    tags: ["Figma", "Illustrator"],
    description:
      "Lead the UX process and workflow, and work closely with development team",
    jobUrl: "https://example.com/jobs/12",
    salary: "$90k - $110k",
  },
  // Rejected
  {
    company: "Ultra Vouche",
    position: "Associate",
    location: "Chicago, IL",
    tags: ["Scrum", "Agile"],
    description: "Support product development and project management",
    jobUrl: "https://example.com/jobs/13",
    salary: "$70k - $85k",
  },
  {
    company: "NRI",
    position: "Web Test",
    location: "Boston, MA",
    tags: ["Testing", "Automation"],
    description: "Manage product testing and quality assurance",
    jobUrl: "https://example.com/jobs/14",
    salary: "$75k - $90k",
  },
  {
    company: "TOG London",
    position: "Data Ana",
    location: "London, UK",
    tags: ["JavaScript", "Python", "SQL"],
    description: "Analyze user data and provide insights for product decisions",
    jobUrl: "https://example.com/jobs/15",
    salary: "$85k - $100k",
  },
];

async function seed() {
  if (!USER_ID) {
    console.error("❌ Error: SEED_USER_ID environment variable is required");
    console.log("Usage: set SEED_USER_ID to an existing account ID before seeding");
    process.exit(1);
  }

  try {
    await dbReady;
    console.log("🌱 Starting seed process...");
    console.log(`📋 Seeding data for user ID: ${USER_ID}`);

    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, USER_ID))
      .get();
    if (!existingUser) {
      throw new Error("User not found. Create an account before seeding sample jobs.");
    }

    await initializeUserBoard(USER_ID);
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.userId, USER_ID), eq(boards.name, "Job Hunt")))
      .get();

    if (!board) {
      throw new Error("Could not initialize the user's board.");
    }

    const boardColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.boardId, board.id))
      .orderBy(asc(columns.order))
      .all();
    console.log(`✅ Found ${boardColumns.length} columns`);

    if (boardColumns.length === 0) {
      console.error(
        "❌ No columns found. Please ensure the board has default columns."
      );
      process.exit(1);
    }

    const columnMap: Record<string, string> = {};
    boardColumns.forEach((column) => {
      columnMap[column.name] = column.id;
    });

    const deleteResult = await db
      .delete(jobApplications)
      .where(eq(jobApplications.userId, USER_ID))
      .run();
    console.log(`🗑️  Deleted ${deleteResult.rowsAffected} existing job applications`);

    // Distribute jobs across columns
    const jobsByColumn: Record<string, typeof SAMPLE_JOBS> = {
      "Wish List": SAMPLE_JOBS.slice(0, 3),
      Applied: SAMPLE_JOBS.slice(3, 7),
      Interviewing: SAMPLE_JOBS.slice(7, 10),
      Offer: SAMPLE_JOBS.slice(10, 12),
      Rejected: SAMPLE_JOBS.slice(12, 15),
    };

    let totalCreated = 0;
    const now = new Date();
    await db.transaction(async (tx) => {
      for (const [columnName, jobs] of Object.entries(jobsByColumn)) {
        const columnId = columnMap[columnName];
        if (!columnId) {
          console.warn(`⚠️  Column "${columnName}" not found, skipping...`);
          continue;
        }

        for (const [index, jobData] of jobs.entries()) {
          await tx.insert(jobApplications)
            .values({
              id: randomUUID(),
              company: jobData.company,
              position: jobData.position,
              location: jobData.location,
              tags: JSON.stringify(jobData.tags),
              description: jobData.description,
              jobUrl: jobData.jobUrl,
              salary: jobData.salary,
              columnId,
              boardId: board.id,
              userId: USER_ID,
              status: columnName.toLowerCase().replace(" ", "-"),
              order: index * 100,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          totalCreated++;
        }
      }
    });

    console.log(`\n🎉 Seed completed successfully!`);
    console.log(`📊 Created ${totalCreated} job applications`);
    console.log(`📋 Board: ${board.name}`);
    console.log(`👤 User ID: ${USER_ID}`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
