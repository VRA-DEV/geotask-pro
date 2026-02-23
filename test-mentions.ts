import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Testing Mention Logic ---");

  // 1. List Users
  const users = await prisma.user.findMany({ include: { sector: true } });
  console.log(`Found ${users.length} users:`);
  users.forEach((u) =>
    console.log(` - ID: ${u.id}, Name: "${u.name}", Sector: ${u.sector?.name}`),
  );

  // 2. Simulate Content
  const content =
    "Teste de menção para @Vinicios e setor @#Engenharia e @#Financeiro";
  console.log(`\nSimulating content: "${content}"`);

  // 3. Test User Regex
  console.log("\n--- Testing User Mentions ---");
  const userMentionRegex = /@([A-ZÀ-Úa-zà-ú]+)/g;
  let match;

  while ((match = userMentionRegex.exec(content)) !== null) {
    const namePart = match[1];
    if (content[match.index + 1] === "#") continue;

    console.log(`Match found: "${namePart}"`);

    const mentionedUser = await prisma.user.findFirst({
      where: {
        name: { contains: namePart, mode: "insensitive" },
      },
    });

    if (mentionedUser) {
      console.log(
        `  -> Resolved to User: ${mentionedUser.name} (ID: ${mentionedUser.id})`,
      );
    } else {
      console.log(`  -> No user matched for "${namePart}"`);
    }
  }

  // 4. Test Sector Regex
  console.log("\n--- Testing Sector Mentions ---");
  const sectorMentionRegex = /@#([A-ZÀ-Úa-zà-ú]+)/g;

  // Fetch all sectors for lookup
  const allSectors = await prisma.sector.findMany();

  while ((match = sectorMentionRegex.exec(content)) !== null) {
    const sectorName = match[1];
    console.log(`Match found: "${sectorName}"`);

    const targetSector = allSectors.find(
      (s) =>
        s.name.toLowerCase() === sectorName.toLowerCase() ||
        s.name.toLowerCase().includes(sectorName.toLowerCase()),
    );

    if (targetSector) {
      console.log(`  -> Resolved to Sector: ${targetSector.name}`);

      // Check if there are users in this sector
      const sectorUsers = await prisma.user.count({
        where: { sector_id: targetSector.id },
      });
      console.log(`  -> Users in this sector: ${sectorUsers}`);
    } else {
      console.log(`  -> No sector matched for "${sectorName}"`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
