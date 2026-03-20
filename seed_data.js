const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', permissions: {} }
  });

  const gestorRole = await prisma.role.upsert({
    where: { name: 'Gestor' },
    update: {},
    create: { name: 'Gestor', permissions: {} }
  });

  // 2. Create Sectors
  const controladoriaSector = await prisma.sector.upsert({
    where: { name: 'Controladoria' },
    update: {},
    create: { name: 'Controladoria' }
  });

  // 3. Create Users
  // User 1: Vinicios (Admin)
  await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {
      name: 'Vinicios',
      password_hash: '997578',
      role_id: adminRole.id,
      sector_id: controladoriaSector.id,
      active: true,
      must_change_password: false
    },
    create: {
      name: 'Vinicios',
      email: 'admin@admin.com',
      password_hash: '997578',
      role_id: adminRole.id,
      sector_id: controladoriaSector.id,
      active: true,
      must_change_password: false
    }
  });

  // User 2: Suporte (Admin)
  await prisma.user.upsert({
    where: { email: 'suporte@geogis.com.br' },
    update: {
      name: 'Suporte Geogis',
      password_hash: 'geogis2026',
      role_id: adminRole.id,
      sector_id: controladoriaSector.id,
      active: true,
      must_change_password: false
    },
    create: {
      name: 'Suporte Geogis',
      email: 'suporte@geogis.com.br',
      password_hash: 'geogis2026',
      role_id: adminRole.id,
      sector_id: controladoriaSector.id,
      active: true,
      must_change_password: false
    }
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
