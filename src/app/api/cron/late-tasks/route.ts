import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Simple security check
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find late tasks
    // Logic: Deadline < Now AND Status != Concluído
    const lateTasks = await prisma.task.findMany({
      where: {
        deadline: { lt: now },
        status: { not: "Concluído" },
      },
      include: {
        responsible: true,
        Sector: true,
      },
    });

    let notificationsSent = 0;

    for (const task of lateTasks) {
      // Check if we already sent a "late" notification for this task TODAY
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existingNotif = await prisma.notification.findFirst({
        where: {
          task_id: task.id,
          type: "task_late",
          created_at: { gte: todayStart },
        },
      });

      if (!existingNotif) {
        // Notify Responsible (Liderado)
        if (task.responsible_id) {
          await prisma.notification.create({
            data: {
              user_id: task.responsible_id,
              type: "task_late",
              title: "Tarefa Atrasada",
              message: `A tarefa "${task.title}" está atrasada e fora do prazo de entrega.`,
              task_id: task.id,
            },
          });
          notificationsSent++;
        }

        // Notify Sector Manager (Gestor do Setor)
        if (task.Sector) {
          const managers = await prisma.user.findMany({
            where: {
              sector_id: task.Sector.id,
              Role: { name: { in: ["Gestor", "Gerente"] } },
              NOT: { id: task.responsible_id || 0 },
            },
          });

          for (const m of managers) {
            await prisma.notification.create({
              data: {
                user_id: m.id,
                type: "task_late",
                title: `Tarefa Atrasada: ${task.Sector.name}`,
                message: `A tarefa "${task.title}", designada à "${task.responsible?.name || "Ninguém"}" do setor "${task.Sector.name}", está atrasada.`,
                task_id: task.id,
              },
            });
            notificationsSent++;
          }
        }
      }
    }

    return NextResponse.json({
      message: "Cron executed successfully",
      late_tasks_found: lateTasks.length,
      notifications_sent: notificationsSent,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
