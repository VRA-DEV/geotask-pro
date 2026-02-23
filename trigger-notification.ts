import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Triggering Notification from Dummy User ---");

  // 1. Find Dummy User (Sender)
  const sender = await prisma.user.findFirst({
    where: { name: "João Teste" },
  });

  if (!sender) {
    console.error(
      "Dummy user 'João Teste' not found. Run seed-dummy-user.ts first.",
    );
    return;
  }

  // 2. Find Real User (Recipient) - Vinicios
  const recipient = await prisma.user.findFirst({
    where: { name: { contains: "Vinic", mode: "insensitive" } },
  });

  if (!recipient) {
    console.error("Recipient 'Vinicios' not found.");
    return;
  }

  // 3. Find a Task
  const task = await prisma.task.findFirst({
    orderBy: { created_at: "desc" },
  });

  if (!task) {
    console.error("No tasks found to comment on.");
    return;
  }

  console.log(
    `Sending mention from ${sender.name} to ${recipient.name} on Task #${task.id} ("${task.title}")...`,
  );

  // 4. Create Comment via API Logic (Simulation)
  // We'll insert directly to DB to skip API overhead, but ensuring records match what API does.

  const commentText = `Olá @${recipient.name.split(" ")[0]}, isto é um teste de notificação!`;

  const comment = await prisma.comment.create({
    data: {
      task_id: task.id,
      user_id: sender.id,
      content: commentText,
    },
  });

  // 5. Create Mention Record
  await prisma.mention.create({
    data: {
      comment_id: comment.id,
      task_id: task.id,
      mention_type: "user",
      mentioned_user_id: recipient.id,
      mentioned_by_id: sender.id,
    },
  });

  // 6. Create Notification Record
  await prisma.notification.create({
    data: {
      user_id: recipient.id,
      type: "mention",
      title: "Você foi mencionado",
      message: `${sender.name} mencionou você na tarefa "${task.title}": "${commentText}"`,
      task_id: task.id,
      comment_id: comment.id,
    },
  });

  console.log("Notification created! Check your dashboard.");
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
