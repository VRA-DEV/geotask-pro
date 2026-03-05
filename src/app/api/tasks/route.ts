import prisma from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

async function resolveSectorId(s: any): Promise<number | null> {
  if (!s) return null;

  // If it's already an ID
  if (typeof s === "number") return s;
  if (typeof s === "string" && !isNaN(Number(s)) && s.trim() !== "")
    return Number(s);

  // If it's an object { id, name }
  if (typeof s === "object") {
    if (s.id && !isNaN(Number(s.id))) return Number(s.id);
    if (s.name) s = s.name;
  }

  // Try to find by name (case-insensitive and trimmed)
  const sector = await prisma.sector.findFirst({
    where: {
      name: { equals: String(s).trim(), mode: "insensitive" },
    },
  });
  return sector?.id || null;
}

async function resolveResponsibleId(r: any): Promise<number | null> {
  if (!r) return null;

  // If already an ID
  if (typeof r === "number") return r;
  if (typeof r === "string" && !isNaN(Number(r)) && r.trim() !== "")
    return Number(r);

  // If it's an object { id, name }
  if (typeof r === "object") {
    if (r.id && !isNaN(Number(r.id))) return Number(r.id);
    if (r.name) r = r.name;
  }

  // Find by name (case-insensitive and trimmed)
  const u = await prisma.user.findFirst({
    where: {
      name: { equals: String(r).trim(), mode: "insensitive" },
    },
  });
  return u?.id || null;
}

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
      where: {
        Role: { name: { in: ["Gestor", "Gerente", "Coordenador", "Admin"] } },
      },
      select: { id: true },
    });
    for (const m of managers) {
      await notifyUser(m.id, type, title, message, taskId);
    }
  } catch (e) {
    console.error("Erro ao notificar gestores:", e);
  }
}

function parseBackendDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;

  const dStr = String(d).trim();
  if (!dStr || dStr.toLowerCase() === "null" || dStr === "undefined")
    return null;

  // Handles DD/MM/YYYY
  if (dStr.includes("/")) {
    const parts = dStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      const parsed = new Date(year, month - 1, day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  // Fallback to native (ISO, etc.)
  const fallback = new Date(dStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// GET /api/tasks?page=1&limit=50&status=A+Fazer&sector_id=3
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = url.searchParams.get("limit")
      ? Math.min(200, Math.max(1, Number(url.searchParams.get("limit"))))
      : 0;
    const status = url.searchParams.get("status");
    const sectorId = Number(url.searchParams.get("sector_id")) || undefined;
    const responsibleId =
      Number(url.searchParams.get("responsible_id")) || undefined;

    // Build optional where clause
    const where: Prisma.TaskWhereInput = {
      parent_id: null, // Only top-level tasks (children are included via relations)
      ...(status ? { status } : {}),
      ...(sectorId ? { sector_id: sectorId } : {}),
      ...(responsibleId ? { responsible_id: responsibleId } : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      ...(limit > 0 ? { take: limit, skip: (page - 1) * limit } : {}),
      include: {
        contract: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        Sector: { select: { id: true, name: true } },
        responsible: {
          select: {
            id: true,
            name: true,
            Role: { select: { name: true } },
            Sector: { select: { name: true } },
          },
        },
        created_by: { select: { id: true, name: true } },
        pauses: true,
        subtasks: true,
        children: {
          orderBy: { id: "asc" },
          include: {
            Sector: { select: { id: true, name: true } },
            created_by: { select: { id: true, name: true } },
            responsible: {
              select: {
                id: true,
                name: true,
                Role: { select: { name: true } },
                Sector: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const result = tasks.map((t) => ({
      ...t,
      contract: t.contract?.name ?? "",
      city: t.city?.name ?? "",
      // Return objects for role/sector
      sector: (t as any).Sector
        ? { name: (t as any).Sector.name, id: (t as any).Sector.id }
        : null,
      responsible: t.responsible
        ? {
            ...t.responsible,
            role: (t.responsible as any).Role
              ? { name: (t.responsible as any).Role.name }
              : null,
            sector: (t.responsible as any).Sector
              ? { name: (t.responsible as any).Sector.name }
              : null,
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
        ...(t.subtasks || []).map((s: any) => ({ ...s, isLegacy: true })),
        ...(t.children || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          sector: c.Sector ? { name: c.Sector.name, id: c.Sector.id } : null,
          responsible_id: c.responsible_id,
          done: c.status === "Concluído",
          status: c.status,
          priority: c.priority,
          isLegacy: false,
          responsible: c.responsible
            ? {
                ...c.responsible,
                role: c.responsible.Role
                  ? { name: c.responsible.Role.name }
                  : null,
                sector: c.responsible.Sector
                  ? { name: c.responsible.Sector.name }
                  : null,
              }
            : null,
        })),
      ],
      pauses: t.pauses || [],
    }));

    // If pagination was requested, return paginated response with metadata
    if (limit > 0) {
      const total = await prisma.task.count({ where });
      return NextResponse.json({
        data: result,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Default: return flat array (backward compatible)
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
      sector_id,
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

    let contractId: number | null = body.contract_id
      ? Number(body.contract_id)
      : null;
    if (!contractId && contract) {
      const c = await prisma.contract.findUnique({ where: { name: contract } });
      if (c) contractId = c.id;
    }

    let cityId: number | null = body.city_id ? Number(body.city_id) : null;
    if (!cityId && city) {
      const c = await prisma.city.findUnique({ where: { name: city } });
      if (c) cityId = c.id;
    }

    const resolvedResponsibleId = await resolveResponsibleId(
      responsible_id || body.responsible,
    );

    const resolvedSectorId = await resolveSectorId(sector_id || sector);

    const createdById =
      created_by && !isNaN(Number(created_by)) ? Number(created_by) : null;
    const parentId =
      parent_id && !isNaN(Number(parent_id)) ? Number(parent_id) : null;

    const taskData: any = {
      title,
      description: description || "",
      type,
      priority,
      status: status || "A Fazer",
      sector_id: resolvedSectorId,
      responsible_id: resolvedResponsibleId,
      contract_id: contractId,
      city_id: cityId,
      nucleus,
      quadra: quadra || "",
      lote: lote || "",
      deadline: parseBackendDate(deadline),
      link: link || "",
      created_by_id: createdById,
      parent_id: parentId,
    };

    if ((subtasks || children) && Array.isArray(subtasks || children)) {
      taskData.children = {
        create: await Promise.all(
          (subtasks || children).map(async (st: any) => {
            const sId =
              st.sector_id || st.sector
                ? await resolveSectorId(st.sector_id || st.sector)
                : resolvedSectorId;

            const sRid = await resolveResponsibleId(
              st.responsible_id || st.responsible,
            );

            return {
              title: st.title,
              status: st.status || "A Fazer",
              sector_id: sId,
              description: st.description || "",
              priority: st.priority || priority,
              type: st.type || type,
              created_by_id: createdById,
              contract_id: contractId,
              city_id: cityId,
              nucleus: nucleus,
              quadra: quadra || "",
              lote: lote || "",
              responsible_id: sRid,
            };
          }),
        ),
      };
    }

    const newTask = await prisma.task.create({
      data: taskData,
      include: { children: true },
    });

    let creatorName = "Alguém";
    if (created_by) {
      const u = await prisma.user.findUnique({
        where: { id: Number(created_by) },
      });
      if (u) creatorName = u.name;
    }
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString().slice(0, 5);

    // Notify responsible of the main task
    if (resolvedResponsibleId) {
      await notifyUser(
        resolvedResponsibleId,
        "task_assigned",
        "Nova Atribuição",
        `${creatorName} atribuiu uma tarefa a você em ${dateStr} às ${timeStr}h: "${title}"`,
        newTask.id,
      );
    }

    // Notify responsible of each subtask (if set),
    // OR notify the Gestor(es) of the subtask's sector (if only sector is set)
    for (const child of newTask.children || []) {
      if (child.responsible_id) {
        // Only notify if different from the main task responsible (avoid duplicate)
        if (child.responsible_id !== resolvedResponsibleId) {
          await notifyUser(
            child.responsible_id,
            "task_assigned",
            "Nova Atribuição (Subtarefa)",
            `${creatorName} atribuiu uma subtarefa a você em ${dateStr} às ${timeStr}h: "${child.title}"`,
            child.id,
          );
        }
      } else if (child.sector_id) {
        // No responsible — notify Gestores of that sector
        const sectorGestores = await prisma.user.findMany({
          where: {
            sector_id: child.sector_id,
            Role: {
              name: { in: ["Gestor", "Gerente", "Coordenador", "Admin"] },
            },
          },
          select: { id: true },
        });
        for (const g of sectorGestores) {
          await notifyUser(
            g.id,
            "subtask_sector",
            "Subtarefa sem responsável",
            `${creatorName} criou a subtarefa "${child.title}" sem responsável atribuído no seu setor.`,
            child.id,
          );
        }
      }
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
const FIELD_NAMES: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  priority: "Prioridade",
  type: "Tipo",
  nucleus: "Bairro",
  quadra: "Quadra",
  lote: "Lote",
  deadline: "Prazo",
  status: "Status",
  sector_id: "Setor",
  responsible_id: "Responsável",
  contract_id: "Contrato",
  city_id: "Cidade",
};

async function logHistory(
  taskId: number,
  userId: number | null,
  field: string,
  oldValue: any,
  newValue: any,
) {
  const maskedField = FIELD_NAMES[field] || field;

  const formatValue = (v: any) => {
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return "";
      return v.toLocaleDateString("pt-BR");
    }
    if (typeof v === "object" && v !== null) return JSON.stringify(v);
    const s = String(v || "");
    return s === "null" || s === "undefined" || s === "Invalid Date" ? "" : s;
  };

  const ov = formatValue(oldValue);
  const nv = formatValue(newValue);

  if (ov === nv) return;

  await prisma.taskHistory.create({
    data: {
      task_id: taskId,
      user_id: userId,
      field: maskedField,
      old_value: ov,
      new_value: nv,
    },
  });
}

// PATCH /api/tasks
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, user_id, ...data } = body;
    const userId = user_id ? Number(user_id) : null;

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

      await logHistory(task.id, userId, "status", task.status, status);
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
              (c: any) =>
                (c.id === task.id ? status : c.status) === "Concluído",
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
      const basicFields = [
        "title",
        "description",
        "priority",
        "type",
        "nucleus",
        "quadra",
        "lote",
      ];
      for (const f of basicFields) {
        if (data[f] !== undefined) {
          await logHistory(task.id, userId, f, (task as any)[f], data[f]);
          updateData[f] = data[f];
        }
      }

      // Handle retroactive date changes
      const updatedStarted =
        data.started_at !== undefined ? data.started_at : data.started;
      const updatedCompleted =
        data.completed_at !== undefined ? data.completed_at : data.completed;

      if (updatedStarted !== undefined || updatedCompleted !== undefined) {
        let newStarted = task.started_at;
        let newCompleted = task.completed_at;

        if (updatedStarted !== undefined) {
          const s = updatedStarted ? new Date(updatedStarted) : null;
          if (s?.getTime() !== task.started_at?.getTime()) {
            await logHistory(task.id, userId, "started_at", task.started_at, s);
            updateData.started_at = s;
            newStarted = s;
          }
        }

        if (updatedCompleted !== undefined) {
          const c = updatedCompleted ? new Date(updatedCompleted) : null;
          if (c?.getTime() !== task.completed_at?.getTime()) {
            await logHistory(
              task.id,
              userId,
              "completed_at",
              task.completed_at,
              c,
            );
            updateData.completed_at = c;
            newCompleted = c;
          }
        }

        // Recalculate time_spent if both are valid dates
        if (
          newStarted &&
          newCompleted &&
          !isNaN(newStarted.getTime()) &&
          !isNaN(newCompleted.getTime())
        ) {
          const diffMs = newCompleted.getTime() - newStarted.getTime();
          if (diffMs > 0) {
            const newTimeSpent = Math.floor(diffMs / 1000); // in seconds
            updateData.time_spent = newTimeSpent;
          }
        }
      }

      if (data.sector !== undefined) {
        const sId = await resolveSectorId(data.sector);
        if (sId !== task.sector_id) {
          await logHistory(task.id, userId, "sector_id", task.sector_id, sId);
          updateData.sector_id = sId;
        }
      }

      if (data.responsible_id !== undefined) {
        const rId =
          data.responsible_id && !isNaN(Number(data.responsible_id))
            ? Number(data.responsible_id)
            : null;

        if (rId !== task.responsible_id) {
          await logHistory(
            task.id,
            userId,
            "responsible_id",
            task.responsible_id,
            rId,
          );
          updateData.responsible_id = rId;

          // Notify the newly assigned responsible
          if (rId) {
            let changerName = "Alguém";
            if (userId) {
              const changer = await prisma.user.findUnique({
                where: { id: userId },
              });
              if (changer) changerName = changer.name;
            }
            const ds = new Date().toLocaleDateString();
            const ts = new Date().toLocaleTimeString().slice(0, 5);
            await notifyUser(
              rId,
              "task_assigned",
              "Nova Atribuição",
              `${changerName} atribuiu a tarefa "${task.title}" a você em ${ds} às ${ts}h.`,
              task.id,
            );
          }
        }
      }

      if (data.contract !== undefined) {
        const contractName = String(data.contract || "").trim();
        let cId: number | null = null;

        if (contractName && contractName !== "Selecione...") {
          const c = await prisma.contract.findFirst({
            where: { name: { equals: contractName, mode: "insensitive" } },
          });
          if (c) cId = c.id;
        }

        if (cId !== task.contract_id) {
          await logHistory(
            task.id,
            userId,
            "contract_id",
            task.contract_id,
            cId,
          );
          updateData.contract_id = cId;
        }
      }

      if (data.city !== undefined) {
        const cityName = String(data.city || "").trim();
        let cityId: number | null = null;

        if (cityName && cityName !== "Selecione...") {
          const c = await prisma.city.findFirst({
            where: { name: { equals: cityName, mode: "insensitive" } },
          });
          if (c) cityId = c.id;
        }

        if (cityId !== task.city_id) {
          await logHistory(task.id, userId, "city_id", task.city_id, cityId);
          updateData.city_id = cityId;
        }
      }

      if (data.deadline !== undefined) {
        const d = parseBackendDate(data.deadline);
        const oldD = task.deadline ? new Date(task.deadline) : null;

        // Compare timestamps to avoid unnecessary updates if same date
        if (d?.getTime() !== oldD?.getTime()) {
          await logHistory(task.id, userId, "deadline", task.deadline, d);
          updateData.deadline = d;
        }
      }

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
