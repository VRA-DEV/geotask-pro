import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.role.findFirst({ where: { name: 'GM' } });
  if (!existing) {
    const role = await prisma.role.create({ data: { name: 'GM' } });
    console.log("GM role created with id: " + role.id);
  } else {
    console.log("GM role already exists.");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
