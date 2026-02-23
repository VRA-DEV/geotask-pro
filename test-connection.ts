import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("Testing database connection...");
  console.log(
    "Database URL:",
    process.env.DATABASE_URL ? "Found (Hidden)" : "Missing",
  );

  try {
    const userCount = await prisma.user.count();
    console.log(`Connection successful! Found ${userCount} users.`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { email: true, role: true },
      });
      console.log("Users in DB:", users);
    } else {
      console.log("Table is empty.");
    }
  } catch (e) {
    console.error("Connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
