import prisma from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "A chave GEMINI_API_KEY não está configurada." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      analyses = ["weekly"], // tipos selecionados pelo usuário
      customMessage = "", // mensagem livre do usuário
      periodDays = 7, // janela de tempo
    }: {
      analyses: string[];
      customMessage: string;
      periodDays: number;
    } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // ─── Janela de tempo ───────────────────────────────────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // ─── Buscar dados ──────────────────────────────────────────────────────────
    const [tasks, contracts, sectors] = await Promise.all([
      prisma.task.findMany({
        where: {
          OR: [
            { created_at: { gte: since } },
            { completed_at: { gte: since } },
            { status: { not: "Concluído" } },
          ],
        },
        include: {
          Sector: true,
          responsible: true,
          contract: true,
          subtasks: true,
          history: { orderBy: { created_at: "desc" }, take: 5 },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.contract.findMany({ include: { tasks: true } }),
      prisma.sector.findMany(),
    ]);

    // ─── Estatísticas gerais ───────────────────────────────────────────────────
    const stats = {
      total: tasks.length,
      created: tasks.filter((t) => t.created_at >= since).length,
      completed: tasks.filter((t) => t.completed_at && t.completed_at >= since)
        .length,
      pending: tasks.filter((t) => t.status !== "Concluído").length,
      overdue: tasks.filter(
        (t) =>
          t.deadline &&
          new Date(t.deadline) < new Date() &&
          t.status !== "Concluído",
      ).length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      bySector: {} as Record<string, number>,
      byContract: {} as Record<string, number>,
    };

    tasks.forEach((t) => {
      stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
      if (t.priority)
        stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
      if (t.Sector?.name)
        stats.bySector[t.Sector.name] =
          (stats.bySector[t.Sector.name] || 0) + 1;
      if (t.contract?.name)
        stats.byContract[t.contract.name] =
          (stats.byContract[t.contract.name] || 0) + 1;
    });

    // ─── Montar seções do prompt ───────────────────────────────────────────────
    const sections: string[] = [];

    sections.push(`
## CONTEXTO DO SISTEMA
Você é o assistente inteligente do GeoTask Pro, sistema de gestão de tarefas geoespaciais.
Período analisado: últimos ${periodDays} dias (de ${since.toLocaleDateString("pt-BR")} até hoje).
Responda SEMPRE em português do Brasil, usando Markdown com seções bem formatadas.
`);

    // ANÁLISE SEMANAL / GERAL
    if (analyses.includes("weekly") || analyses.includes("general")) {
      sections.push(`
## DADOS GERAIS DO PERÍODO
- Total de tarefas no sistema: ${stats.total}
- Novas tarefas criadas: ${stats.created}
- Tarefas concluídas: ${stats.completed}
- Tarefas pendentes: ${stats.pending}
- Tarefas atrasadas (prazo vencido): ${stats.overdue}

**Por Status:** ${JSON.stringify(stats.byStatus)}
**Por Prioridade:** ${JSON.stringify(stats.byPriority)}
**Por Setor:** ${JSON.stringify(stats.bySector)}

Gere um **Relatório Semanal** com: resumo executivo, principais realizações, pontos de atenção e recomendações.
`);
    }

    // ANÁLISE POR SETOR
    if (analyses.includes("sector")) {
      const sectorDetail = sectors.map((s) => {
        const sectorTasks = tasks.filter((t) => t.sector_id === s.id);
        return {
          sector: s.name,
          total: sectorTasks.length,
          completed: sectorTasks.filter((t) => t.status === "Concluído").length,
          pending: sectorTasks.filter((t) => t.status !== "Concluído").length,
          overdue: sectorTasks.filter(
            (t) =>
              t.deadline &&
              new Date(t.deadline) < new Date() &&
              t.status !== "Concluído",
          ).length,
        };
      });
      sections.push(`
## ANÁLISE POR SETOR
${JSON.stringify(sectorDetail, null, 2)}

Gere uma **Análise por Setor**: identifique setores com melhor e pior desempenho, gargalos e sugestões específicas.
`);
    }

    // PRIORIZAÇÃO / ORGANIZAÇÃO DE TAREFAS
    if (analyses.includes("priorities")) {
      const urgentPending = tasks
        .filter((t) => t.status !== "Concluído")
        .sort((a, b) => {
          const pa =
            a.priority === "Urgente" ? 0 : a.priority === "Alta" ? 1 : 2;
          const pb =
            b.priority === "Urgente" ? 0 : b.priority === "Alta" ? 1 : 2;
          return pa - pb;
        })
        .slice(0, 15)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          sector: t.Sector?.name,
          responsible: t.responsible?.name,
          deadline: t.deadline?.toLocaleDateString("pt-BR"),
          contract: t.contract?.name,
        }));

      sections.push(`
## ANÁLISE DE PRIORIZAÇÃO
Tarefas pendentes mais críticas:
${JSON.stringify(urgentPending, null, 2)}

Gere uma **Análise e Sugestão de Priorização**: sugira a ordem de execução ideal, identifique dependências e riscos.
`);
    }

    // ANÁLISE DE CONTRATOS
    if (analyses.includes("contracts")) {
      const contractAnalysis = contracts.map((c) => {
        const ctTasks = c.tasks;
        return {
          contract: c.name,
          total: ctTasks.length,
          completed: ctTasks.filter((t) => t.status === "Concluído").length,
          pending: ctTasks.filter((t) => t.status !== "Concluído").length,
          completionRate:
            ctTasks.length > 0
              ? `${Math.round((ctTasks.filter((t) => t.status === "Concluído").length / ctTasks.length) * 100)}%`
              : "0%",
          overdue: ctTasks.filter(
            (t) =>
              t.deadline &&
              new Date(t.deadline) < new Date() &&
              t.status !== "Concluído",
          ).length,
        };
      });

      sections.push(`
## ANÁLISE DE CONTRATOS
${JSON.stringify(contractAnalysis, null, 2)}

Gere uma **Análise de Contratos**: destaque contratos com baixo índice de conclusão, riscos e recomendações de ação.
`);
    }

    // RESUMO DOS RESPONSÁVEIS
    if (analyses.includes("responsible")) {
      const byResponsible: Record<
        string,
        { total: number; completed: number; pending: number; overdue: number }
      > = {};
      tasks.forEach((t) => {
        const name = t.responsible?.name || "Sem responsável";
        if (!byResponsible[name])
          byResponsible[name] = {
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0,
          };
        byResponsible[name].total++;
        if (t.status === "Concluído") byResponsible[name].completed++;
        else byResponsible[name].pending++;
        if (
          t.deadline &&
          new Date(t.deadline) < new Date() &&
          t.status !== "Concluído"
        )
          byResponsible[name].overdue++;
      });

      sections.push(`
## ANÁLISE POR RESPONSÁVEL
${JSON.stringify(byResponsible, null, 2)}

Gere uma **Análise de Desempenho por Responsável**: identifique quem está sobrecarregado, quem tem melhor produtividade, e sugira redistribuição de carga se necessário.
`);
    }

    // MENSAGEM CUSTOMIZADA DO USUÁRIO
    if (customMessage?.trim()) {
      sections.push(`
## SOLICITAÇÃO ESPECIAL DO USUÁRIO
O usuário fez a seguinte solicitação específica. RESPONDA DIRETAMENTE a ela usando os dados já fornecidos acima:

"${customMessage.trim()}"
`);
    }

    // ─── Montar prompt final ───────────────────────────────────────────────────
    const prompt =
      sections.join("\n\n---\n\n") +
      `

---

## INSTRUÇÕES FINAIS
- Responda em Markdown bem estruturado com emojis para facilitar a leitura
- Use tabelas quando houver dados comparativos
- Seja objetivo mas completo
- Ao final, sempre inclua uma seção "✅ Próximos Passos Recomendados" com 3-5 ações concretas
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({
      report: text,
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Analyze Error:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar a análise com IA.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
