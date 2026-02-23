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

const mapSector = (s: any): Sector => {
  const str = String(s || "");
  return (
    SECTOR_MAP[str] ||
    (Object.values(Sector).includes(str as Sector)
      ? (str as Sector)
      : "Administrativo")
  );
};

// Subtask can be a string (legacy) or { title, sector }
type SubtaskInput = string | { title: string; sector?: string };

function subtaskTitle(s: SubtaskInput): string {
  return typeof s === "string" ? s : s.title || "";
}

// GET /api/templates
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      include: {
        tasks: {
          orderBy: { order_index: "asc" },
          include: {
            subtasks: {
              orderBy: { order_index: "asc" },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const result = templates.map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      sector: { name: tpl.sector },
      created_by: tpl.created_by_id,
      created_at: tpl.created_at,
      tasks: tpl.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        sector: { name: tpl.sector },
        order_index: t.order_index,
        subtasks: t.subtasks.map((s) => ({
          title: s.title,
          sector: { name: tpl.sector },
        })),
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar templates:", error);
    return NextResponse.json(
      { error: "Erro ao buscar templates" },
      { status: 500 },
    );
  }
}

// POST /api/templates
export async function POST(req: Request) {
  try {
    const { name, sector, tasks, created_by } = await req.json();
    if (!name)
      return NextResponse.json(
        { error: "name é obrigatório" },
        { status: 400 },
      );

    const finalSector = mapSector(sector || tasks?.[0]?.sector);

    const template = await prisma.template.create({
      data: {
        name,
        sector: finalSector,
        created_by_id: created_by ? Number(created_by) : null,
        tasks: {
          create: tasks?.map((t: any, i: number) => ({
            title: t.title,
            order_index: i,
            subtasks: {
              create: t.subtasks
                ?.filter((s: any) => subtaskTitle(s).trim())
                .map((s: any, j: number) => ({
                  title: subtaskTitle(s),
                  order_index: j,
                })),
            },
          })),
        },
      },
    });

    return NextResponse.json(
      { message: "Template criado", id: template.id },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Erro ao criar template:", error);
    return NextResponse.json(
      { error: "Erro ao criar template: " + error.message },
      { status: 500 },
    );
  }
}

// PATCH /api/templates
export async function PATCH(req: Request) {
  try {
    const { id, name, sector, tasks } = await req.json();
    if (!id || !name)
      return NextResponse.json(
        { error: "id e name são obrigatórios" },
        { status: 400 },
      );

    const finalSector = mapSector(sector || tasks?.[0]?.sector);

    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.template.update({
        where: { id: Number(id) },
        data: {
          name,
          sector: finalSector,
        },
      });

      await tx.templateTask.deleteMany({ where: { template_id: Number(id) } });

      if (tasks && tasks.length > 0) {
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          await tx.templateTask.create({
            data: {
              template_id: updated.id,
              title: t.title,
              order_index: i,
              subtasks: {
                create: t.subtasks
                  ?.filter((s: any) => subtaskTitle(s).trim())
                  .map((s: any, j: number) => ({
                    title: subtaskTitle(s),
                    order_index: j,
                  })),
              },
            },
          });
        }
      }
      return updated;
    });

    return NextResponse.json({
      message: "Template atualizado",
      id: template.id,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar template:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar template: " + error.message },
      { status: 500 },
    );
  }
}

// DELETE /api/templates
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await prisma.template.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Template removido" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao remover template" },
      { status: 500 },
    );
  }
}
