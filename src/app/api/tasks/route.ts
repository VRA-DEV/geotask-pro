import prisma from "@/lib/prisma";
import { Sector } from "@prisma/client";
import { NextResponse } from "next/server";

const SECTOR_MAP: Record<string, Sector> = {
  Administrativo: "Administrativo",
  "Atendimento ao Cliente": "AtendimentoAoCliente",
  "Atendimento Social": "AtendimentoSocial",
  Cadastro: "Cadastro",
  Controladoria: "Controladoria",
  Coordenação: "Coordenacao",
  Engenharia: "Engenharia",
  Financeiro: "Financeiro",
  Gerência: "Gerencia",
  Reurb: "Reurb",
  RH: "RH",
  TI: "TI",
  AtendimentoAoCliente: "AtendimentoAoCliente",
  AtendimentoSocial: "AtendimentoSocial",
  Coordenacao: "Coordenacao",
  Gerencia: "Gerencia",
};

const mapSector = (s: any): Sector | undefined => {
  if (!s) return undefined;
  const str = String(s);
  return (
    SECTOR_MAP[str] ||
    (Object.values(Sector).includes(str as Sector)
      ? (str as Sector)
      : undefined)
  );
};

async function notifyUser(
  userId: number,
  type: string,
  title: string,
  message: string,
  taskId: number,
) {
  try {
    await prisma.notification.create({
      data: { user_id: userId, type, title, message, task_id: taskId },
    });
  } catch (e) {
    console.error("Erro ao criar notificação:", e);
  }
}

async function notifyManagers(
  type: string,
  title: string,
  message: string,
  taskId: number,
) {
  try {
    const managers = await prisma.user.findMany({
      where: { role: { in: ["Gestor", "Gerente", "Coordenador", "Admin"] } },
      select: { id: true },
    });
    for (const m of managers) {
      await notifyUser(m.id, type, title, message, taskId);
    }
  } catch (e) {
    console.error("Erro ao notificar gestores:", e);
  }
}

// GET /api/tasks
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        subtasks: { orderBy: { id: "asc" } },
        children: {
          orderBy: { id: "asc" },
          include: { responsible: true },
        },
        contract: { select: { name: true } },
        city: { select: { name: true } },
        responsible: {
          select: { id: true, name: true, role: true, sector: true },
        },
        created_by: { select: { id: true, name: true } },
        pauses: true,
      },
      orderBy: { created_at: "desc" },
    });

    const result = tasks.map((t) => ({
      ...t,
      contract: t.contract?.name ?? "",
      city: t.city?.name ?? "",
      // Return objects for role/sector
      sector: t.sector ? { name: t.sector } : null,
      responsible: t.responsible
        ? {
            ...t.responsible,
            role: { name: t.responsible.role },
            sector: { name: t.responsible.sector },
          }
        : null,
      responsible_id: t.responsible_id,
      created_by: t.created_by?.name ?? "",
      created: t.created_at
        ? new Date(t.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      started: t.started_at
        ? new Date(t.started_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      paused: t.paused_at
        ? new Date(t.paused_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      completed: t.completed_at
        ? new Date(t.completed_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      assigned: t.responsible_id
        ? new Date(t.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      deadline: t.deadline
        ? new Date(t.deadline).toLocaleDateString("pt-BR")
        : null,
      time: t.time_spent ? Math.round(t.time_spent / 60) : 0,
      subtasks: [
        ...(t.subtasks || []).map((s) => ({ ...s, isLegacy: true })),
        ...(t.children || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          sector: c.sector ? { name: c.sector } : null,
          responsible_id: c.responsible_id,
          done: c.status === "Concluído",
          status: c.status,
          priority: c.priority,
          isLegacy: false,
          responsible: c.responsible
            ? {
                ...c.responsible,
                role: { name: c.responsible.role },
                sector: { name: c.responsible.sector },
              }
            : null,
        })),
      ],
      pauses: t.pauses || [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tarefas" },
      { status: 500 },
    );
  }
}

// POST /api/tasks
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      type,
      priority,
      status,
      sector,
      responsible_id,
      contract,
      city,
      nucleus,
      quadra,
      lote,
      deadline,
      link,
      subtasks,
      children,
      created_by,
      parent_id,
    } = body;

    let contractId: number | null = null;
    if (contract) {
      const c = await prisma.contract.findUnique({ where: { name: contract } });
      if (c) contractId = c.id;
    }

    let cityId: number | null = null;
    if (city) {
      const c = await prisma.city.findUnique({ where: { name: city } });
      if (c) cityId = c.id;
    }

    let resolvedResponsibleId: number | null = responsible_id
      ? Number(responsible_id)
      : null;
    if (!resolvedResponsibleId && body.responsible) {
      const u = await prisma.user.findFirst({
        where: { name: body.responsible },
      });
      if (u) resolvedResponsibleId = u.id;
    }

    const taskData: any = {
      title,
      description: description || "",
      type,
      priority,
      status: status || "A Fazer",
      sector: mapSector(sector),
      responsible_id: resolvedResponsibleId,
      contract_id: contractId,
      city_id: cityId,
      nucleus,
      quadra: quadra || "",
      lote: lote || "",
      deadline: deadline
        ? (() => {
            if (typeof deadline === "string" && deadline.includes("/")) {
              const [d, m, y] = deadline.split("/");
              const parsed = new Date(`${y}-${m}-${d}`);
              return isNaN(parsed.getTime()) ? null : parsed;
            }
            const parsed = new Date(deadline);
            return isNaN(parsed.getTime()) ? null : parsed;
          })()
        : null,
      link: link || "",
      created_by_id: created_by ? Number(created_by) : null,
      parent_id: parent_id ? Number(parent_id) : null,
    };

    if ((subtasks || children) && Array.isArray(subtasks || children)) {
      taskData.children = {
        create: (subtasks || children).map((st: any) => ({
          title: st.title,
          status: st.status || "A Fazer",
          sector: mapSector(st.sector) || mapSector(sector),
          description: st.description || "",
          priority: st.priority || priority,
          type: st.type || type,
          created_by_id: created_by ? Number(created_by) : null,
          responsible_id: st.responsible_id ? Number(st.responsible_id) : null,
        })),
      };
    }

    const newTask = await prisma.task.create({ data: taskData });

    let creatorName = "Alguém";
    if (created_by) {
      const u = await prisma.user.findUnique({
        where: { id: Number(created_by) },
      });
      if (u) creatorName = u.name;
    }
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString().slice(0, 5);

    if (resolvedResponsibleId) {
      await notifyUser(
        resolvedResponsibleId,
        "task_assigned",
        "Nova Atribuição",
        `${creatorName}, atribuiu uma tarefa a você na data ${dateStr} às ${timeStr}h: "${title}"`,
        newTask.id,
      );
    }

    return NextResponse.json({
      message: "Tarefa criada com sucesso",
      id: newTask.id,
    });
  } catch (error: any) {
    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json(
      { error: "Erro ao criar tarefa: " + error.message },
      { status: 500 },
    );
  }
}

// PATCH /api/tasks
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, ...data } = body;
    if (!id)
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

    const task = await prisma.task.findUnique({ where: { id: Number(id) } });
    if (!task)
      return NextResponse.json(
        { error: "Tarefa não encontrada" },
        { status: 404 },
      );

    const updateData: any = { updated_at: new Date() };

    if (action === "update_status") {
      const { status } = data;
      updateData.status = status;
      if (status === "Em Andamento") {
        updateData.started_at = new Date();
        updateData.paused_at = null;
      } else {
        if (task.status === "Em Andamento" && task.started_at) {
          const elapsed = Math.floor(
            (new Date().getTime() - new Date(task.started_at).getTime()) / 1000,
          );
          updateData.time_spent = (task.time_spent || 0) + elapsed;
        }
        if (status === "Pausado") updateData.paused_at = new Date();
        else if (status === "Concluído") updateData.completed_at = new Date();
      }

      await prisma.task.update({ where: { id: Number(id) }, data: updateData });

      if (status === "Pausado") {
        await prisma.taskPause.create({
          data: { task_id: Number(id), started_at: new Date() },
        });
      } else if (task.status === "Pausado") {
        const lastPause = await prisma.taskPause.findFirst({
          where: { task_id: Number(id), ended_at: null },
          orderBy: { started_at: "desc" },
        });
        if (lastPause)
          await prisma.taskPause.update({
            where: { id: lastPause.id },
            data: { ended_at: new Date() },
          });
      }

      if (task.parent_id) {
        const parent = await prisma.task.findUnique({
          where: { id: task.parent_id },
          include: { children: true },
        });
        if (parent) {
          if (status === "Em Andamento" && parent.status === "A Fazer") {
            await prisma.task.update({
              where: { id: parent.id },
              data: { status: "Em Andamento", started_at: new Date() },
            });
          }
          if (status === "Concluído") {
            const allDone = parent.children.every(
              (c) => (c.id === task.id ? status : c.status) === "Concluído",
            );
            if (allDone && parent.status !== "Concluído") {
              await prisma.task.update({
                where: { id: parent.id },
                data: { status: "Concluído", completed_at: new Date() },
              });
            }
          }
        }
      }

      if (status === "Concluído")
        await notifyManagers(
          "task_completed",
          `Tarefa Concluída: "${task.title}"`,
          `Tarefa concluída na data ${new Date().toLocaleDateString()}`,
          Number(id),
        );
    } else if (action === "update_fields") {
      const fields = [
        "title",
        "description",
        "priority",
        "type",
        "nucleus",
        "quadra",
        "lote",
      ];
      fields.forEach((f) => {
        if (data[f] !== undefined) updateData[f] = data[f];
      });
      if (data.sector) updateData.sector = mapSector(data.sector);
      if (data.responsible_id !== undefined)
        updateData.responsible_id = data.responsible_id
          ? Number(data.responsible_id)
          : null;
      if (data.deadline !== undefined)
        updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      await prisma.task.update({ where: { id: Number(id) }, data: updateData });
    } else if (action === "toggle_subtask") {
      const { subtask_id, done } = data;
      await prisma.subtask.update({
        where: { id: Number(subtask_id) },
        data: { done, done_at: done ? new Date() : null },
      });
      if (done) {
        const remaining = await prisma.subtask.count({
          where: {
            task_id: task.id,
            done: false,
            NOT: { id: Number(subtask_id) },
          },
        });
        if (remaining === 0 && task.status !== "Concluído") {
          await prisma.task.update({
            where: { id: task.id },
            data: { status: "Concluído", completed_at: new Date() },
          });
        }
      }
      return NextResponse.json({ message: "Subtarefa atualizada" });
    }
    return NextResponse.json({ message: "Atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar tarefa" },
      { status: 500 },
    );
  }
}

// DELETE /api/tasks
export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await prisma.task.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Tarefa removida" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao remover tarefa" },
      { status: 500 },
    );
  }
}
