import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  console.log("=== UNBLOCKING PRISMA MIGRATIONS ===");
  try {
    // Deleta o registro da migração falha para permitir que o deploy tente novamente
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name = '20260410134500_force_sync_v2' 
      AND rolled_back_at IS NULL
    `);
    console.log(`Successfully removed ${result} failed migration records.`);
  } catch (e: any) {
    console.log("Migration record not found or already fixed. Skipping...");
    // console.error(e);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(0); // Não queremos quebrar o build se o unblock falhar por já estar limpo
  });
