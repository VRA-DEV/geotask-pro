import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/admin/recalculate-time
 *
 * Temporary endpoint to recalculate time_spent for all tasks
 * based on started_at, completed_at, and TaskPause records.
 *
 * Access: requires ?secret=RECALC2026 query param as simple protection.
 * Remove this file after running.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== "RECALC2026") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        started_at: true,
        completed_at: true,
        time_spent: true,
        status: true,
      },
      orderBy: { id: "asc" },
    });

    const allPauses = await prisma.taskPause.findMany({
      orderBy: { started_at: "asc" },
    });

    // Index pauses by task_id
    const pausesByTask = new Map<number, typeof allPauses>();
    for (const p of allPauses) {
      const list = pausesByTask.get(p.task_id) || [];
      list.push(p);
      pausesByTask.set(p.task_id, list);
    }

    const now = new Date();
    const results: {
      id: number;
      title: string;
      oldTime: number;
      newTime: number;
      pauseCount: number;
      changed: boolean;
    }[] = [];
    let updatedCount = 0;

    for (const task of tasks) {
      if (!task.started_at) {
        if ((task.time_spent || 0) !== 0) {
          await prisma.task.update({
            where: { id: task.id },
            data: { time_spent: 0 },
          });
          results.push({
            id: task.id,
            title: task.title,
            oldTime: task.time_spent || 0,
            newTime: 0,
            pauseCount: 0,
            changed: true,
          });
          updatedCount++;
        }
        continue;
      }

      const startMs = new Date(task.started_at).getTime();
      const endMs = task.completed_at
        ? new Date(task.completed_at).getTime()
        : now.getTime();

      const pauses = pausesByTask.get(task.id) || [];
      let totalPauseMs = 0;
      for (const p of pauses) {
        const pStart = new Date(p.started_at).getTime();
        const pEnd = p.ended_at
          ? new Date(p.ended_at).getTime()
          : now.getTime();
        const clampedStart = Math.max(pStart, startMs);
        const clampedEnd = Math.min(pEnd, endMs);
        if (clampedEnd > clampedStart) {
          totalPauseMs += clampedEnd - clampedStart;
        }
      }

      const effectiveMs = Math.max(0, endMs - startMs - totalPauseMs);
      const newTimeSpent = Math.floor(effectiveMs / 1000);
      const oldTimeSpent = task.time_spent || 0;

      if (newTimeSpent !== oldTimeSpent) {
        await prisma.task.update({
          where: { id: task.id },
          data: { time_spent: newTimeSpent },
        });
        updatedCount++;
      }

      results.push({
        id: task.id,
        title: task.title,
        oldTime: oldTimeSpent,
        newTime: newTimeSpent,
        pauseCount: pauses.length,
        changed: newTimeSpent !== oldTimeSpent,
      });
    }

    const changed = results.filter((r) => r.changed);

    return NextResponse.json({
      message: `Recálculo concluído. ${updatedCount} tarefas atualizadas de ${tasks.length} total.`,
      totalTasks: tasks.length,
      totalPauses: allPauses.length,
      updated: updatedCount,
      unchanged: tasks.length - updatedCount,
      changes: changed.map((r) => ({
        id: r.id,
        title: r.title,
        oldSeconds: r.oldTime,
        newSeconds: r.newTime,
        oldFormatted: fmtSec(r.oldTime),
        newFormatted: fmtSec(r.newTime),
        diffFormatted: fmtSec(Math.abs(r.oldTime - r.newTime)),
        pauseCount: r.pauseCount,
      })),
    });
  } catch (error: any) {
    console.error("Erro no recálculo:", error);
    return NextResponse.json(
      { error: "Erro: " + error.message },
      { status: 500 }
    );
  }
}

function fmtSec(s: number): string {
  if (s <= 0) return "0s";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
