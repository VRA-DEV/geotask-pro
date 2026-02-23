import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sectors = await prisma.user.groupBy({
    by: ["sector"],
    _count: {
      id: true,
    },
  });
  console.log("Sectors:", JSON.stringify(sectors, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
