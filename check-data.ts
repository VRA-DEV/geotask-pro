import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sectors = await prisma.sector.findMany();
  console.log("Sectors:", JSON.stringify(sectors, null, 2));

  const users = await prisma.user.findMany({
    include: { Sector: true },
  });
  console.log(
    "Users:",
    JSON.stringify(
      users.map((u: any) => ({ id: u.id, name: u.name, sector: u.Sector })),
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
