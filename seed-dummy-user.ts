import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Creating Dummy User for Notification Testing ---");

  const existingUser = await prisma.user.findUnique({
    where: { email: "joao.teste@example.com" },
  });

  if (existingUser) {
    console.log("Dummy user 'João Teste' already exists.");
    return;
  }

  // Ensure Role/Sector exist
  const lideradoRole = await prisma.role.upsert({
    where: { name: "Liderado" },
    update: {},
    create: { name: "Liderado" },
  });
  const sector = await prisma.sector.upsert({
    where: { name: "Controladoria" },
    update: {},
    create: { name: "Controladoria" },
  });

  const newUser = await prisma.user.create({
    data: {
      name: "João Teste",
      email: "joao.teste@example.com",
      password_hash: "mock_password",
      role: { connect: { id: lideradoRole.id } },
      sector: { connect: { id: sector.id } },
      active: true,
      must_change_password: false,
    },
    include: {
      role: true,
      sector: true,
    },
  });

  console.log(
    `Created user: ${newUser.name} (ID: ${newUser.id}) in Sector: ${newUser.sector.name}`,
  );
  console.log(
    "You can now mention @João or @#Controladoria and this user should receive a notification (visible in DB/Logs).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    // Fallback if role mismatch
    if (e.message.includes("Role")) {
      console.log("Retrying with role 'Liderado'...");
    }
  })
  .finally(async () => await prisma.$disconnect());
