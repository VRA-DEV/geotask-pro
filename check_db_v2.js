const { PrismaClient } = require('@prisma/client');

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Please provide a DATABASE_URL as argument");
    process.exit(1);
  }
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });

  try {
    const userCount = await prisma.user.count();
    const taskCount = await prisma.task.count();
    console.log(`Users: ${userCount}`);
    console.log(`Tasks: ${taskCount}`);
  } catch (e) {
    console.error("Error connecting to database:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
