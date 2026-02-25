import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── Company Info ────────────────────────────────────────────────────────────
const COMPANY = {
  name: "Geogis Geotécnologia",
  cnpj: "14.116.593/0001-60",
  address: "R. Das Acacias, 227 - São Francisco, Cuiabá - MT, 78043-228",
  slogan: "Transformar e Desenvolver Territórios",
  reportTitle: "Relatório de Tarefas",
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ExportTask {
  id: number;
  title: string;
  type: string;
  priority: string;
  deadline: string | null;
  status: string;
  responsible?: { name: string; sector?: { name: string } } | string | null;
  sector?: { name: string } | string | null;
  contract?: string;
  city?: string;
  nucleus?: string;
  quadra?: string;
  lote?: string;
  created?: string;
  assigned?: string;
  started?: string;
  paused?: string;
  completed?: string;
  completed_at?: string;
  created_at?: string;
  time?: number;
  subtasks?: ExportTask[];
  pauses?: { started_at: string; ended_at?: string }[];
  done?: boolean;
  description?: string;
}

export interface ExportKPIs {
  concludedCount: number;
  avgTime: number;
  highPriorityCount: number;
  midPriorityCount: number;
  lowPriorityCount: number;
  delayedCount: number;
  pieData: { name: string; value: number }[];
  sectorRank: { name: string; v: number }[];
  userRank: { name: string; v: number; sector?: string }[];
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  primary: [152, 175, 59] as [number, number, number],
  dark: [45, 55, 72] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  info: [59, 130, 246] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  chart: [
    [152, 175, 59],
    [59, 130, 246],
    [245, 158, 11],
    [239, 68, 68],
    [139, 92, 246],
    [16, 185, 129],
  ] as [number, number, number][],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number): string => {
  if (!n) return "0 min";
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
};

const parseDateStr = (s?: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const parts = s.split("/");
  if (parts.length === 3) {
    const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
};

export const getName = (obj: unknown): string => {
  if (!obj) return "—";
  if (typeof obj === "string") return obj || "—";
  if (typeof obj === "object" && obj !== null && "name" in obj)
    return (obj as { name: string }).name || "—";
  return "—";
};

export const getTaskState = (task: Partial<ExportTask>) => {
  if (!task.deadline) return null;
  const deadlineDate = parseDateStr(task.deadline);
  if (!deadlineDate) return null;
  deadlineDate.setHours(23, 59, 59, 999);
  const now = new Date();
  const isDone = task.status === "Concluído";
  if (!isDone) {
    if (now > deadlineDate) return { label: "Em Atraso", color: "#ef4444" };
    return { label: "Dentro do Prazo", color: "#10b981" };
  } else {
    const doneAt = task.completed_at ? new Date(task.completed_at) : now;
    if (doneAt > deadlineDate)
      return { label: "Atraso na Entrega", color: "#f59e0b" };
    return { label: "No Prazo", color: "#10b981" };
  }
};

export const getKpiData = (filtered: ExportTask[], users: unknown[]) => {
  const concluded = filtered.filter((t) => t.status === "Concluído");
  const high = filtered.filter((t) => t.priority === "Alta").length;
  const mid = filtered.filter((t) => t.priority === "Média").length;
  const low = filtered.filter((t) => t.priority === "Baixa").length;
  const delayed = filtered.filter(
    (t) => getTaskState(t)?.label === "Em Atraso",
  ).length;
  const concludedForAvg = concluded.filter(
    (t) => !t.subtasks || t.subtasks.length === 0,
  );
  const avgTime = concludedForAvg.length
    ? Math.round(
        concludedForAvg.reduce((a, t) => a + (t.time || 0), 0) /
          concludedForAvg.length,
      )
    : 0;

  const pieData = ["A Fazer", "Em Andamento", "Pausado", "Concluído"]
    .map((s) => ({
      name: s,
      value: filtered.filter((t) => t.status === s).length,
    }))
    .filter((d) => d.value > 0);

  const SECTORS = Array.from(
    new Set(filtered.map((t) => getName(t.sector)).filter((x) => x !== "—")),
  );
  const sectorRank = SECTORS.map((s) => ({
    name: String(s),
    v: filtered.filter(
      (t) => getName(t.sector) === s && t.status === "Concluído",
    ).length,
  }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);

  const userRank = (users as { name: string; sector?: unknown }[])
    .map((u) => ({
      name: u.name,
      v: filtered.filter(
        (t) => getName(t.responsible) === u.name && t.status === "Concluído",
      ).length,
      sector: getName(u.sector),
    }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);

  return {
    concludedCount: concluded.length,
    avgTime,
    highPriorityCount: high,
    midPriorityCount: mid,
    lowPriorityCount: low,
    delayedCount: delayed,
    pieData,
    sectorRank,
    userRank,
  };
};

// ─── Load logo as base64 ──────────────────────────────────────────────────────
const getLogoBase64 = async (): Promise<string | null> => {
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// PDF page dimensions (landscape A4)
const PW = 297;
const PH = 210;
const ML = 12;
const MR = 12;
const CW = PW - ML - MR; // usable width

// ─── Shared PDF header ────────────────────────────────────────────────────────
const drawHeader = (
  doc: jsPDF,
  logo: string | null,
  pageTitle: string,
  pageNum: number,
  footerMeta?: { generatedBy?: string; filters?: string },
) => {
  const HEADER_H = 28;
  const slate800: [number, number, number] = [30, 41, 59];
  const slate500: [number, number, number] = [100, 116, 139];

  // White header background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, HEADER_H, "F");

  // Logo — 30% wider: 42 → 55
  if (logo) {
    try {
      doc.addImage(logo, "PNG", ML, 4, 55, 14);
    } catch {
      doc.setFontSize(12);
      doc.setTextColor(...slate800);
      doc.setFont("helvetica", "bold");
      doc.text("GEOGIS", ML, 17);
    }
  }

  // Center: page title + report subtitle
  doc.setFontSize(12);
  doc.setTextColor(...slate800);
  doc.setFont("helvetica", "bold");
  doc.text(pageTitle, PW / 2, 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate500);
  doc.text(COMPANY.reportTitle, PW / 2, 18, { align: "center" });

  // Right: company info in slate-800
  doc.setFontSize(7);
  const infoX = PW - MR;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...slate800);
  doc.text(COMPANY.name, infoX, 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate500);
  doc.text(`CNPJ: ${COMPANY.cnpj}`, infoX, 13, { align: "right" });
  doc.text(COMPANY.address, infoX, 18, { align: "right" });
  doc.text(COMPANY.slogan, infoX, 23, { align: "right" });

  // Green accent bottom line
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.8);
  doc.line(0, HEADER_H, PW, HEADER_H);

  // Footer
  if (pageNum > 0) {
    const fy = PH - 4;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(ML, fy - 2.5, PW - MR, fy - 2.5);
    doc.setFontSize(6.5);
    doc.setTextColor(...slate500);
    const parts: string[] = [
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ];
    if (footerMeta?.generatedBy)
      parts.push(`Gerado por: ${footerMeta.generatedBy}`);
    if (footerMeta?.filters) parts.push(`Filtros: ${footerMeta.filters}`);
    doc.text(parts.join("   |   "), ML, fy);
    doc.text(`Pág. ${pageNum}`, PW - MR, fy, { align: "right" });
  }
};

// ─── Draw KPI card ────────────────────────────────────────────────────────────
const drawKpiCard = (
  doc: jsPDF,
  label: string,
  value: string,
  sub: string,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: [number, number, number],
) => {
  // Card background
  doc.setFillColor(...C.light);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  // Accent left bar
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 2, h, 1, 1, "F");

  // Value
  doc.setFontSize(20);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 6, y + h / 2 + 2);

  // Label
  doc.setFontSize(8);
  doc.setTextColor(...C.secondary);
  doc.setFont("helvetica", "normal");
  doc.text(label.toUpperCase(), x + 6, y + 7);

  // Sub
  doc.setFontSize(7);
  doc.text(sub, x + 6, y + h - 4);
};

// ─── Draw horizontal bar chart ────────────────────────────────────────────────
const drawBarChart = (
  doc: jsPDF,
  data: { name: string; value: number }[],
  colors: [number, number, number][],
  x: number,
  y: number,
  w: number,
  title: string,
) => {
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
  doc.setFont("helvetica", "normal");
  y += 4;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barH = 7;
  const gap = 3;
  const labelW = 40;
  const barAreaW = w - labelW - 15;

  data.forEach((d, i) => {
    const bw = (d.value / maxVal) * barAreaW;
    const col = colors[i % colors.length];
    doc.setFillColor(...col);
    doc.rect(x + labelW, y, bw, barH, "F");

    // Light background remainder
    doc.setFillColor(230, 230, 230);
    doc.rect(x + labelW + bw, y, barAreaW - bw, barH, "F");

    doc.setFontSize(7);
    doc.setTextColor(...C.secondary);
    doc.text(d.name, x, y + barH - 1);

    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold");
    doc.text(String(d.value), x + labelW + bw + 2, y + barH - 1);
    doc.setFont("helvetica", "normal");

    y += barH + gap;
  });
  return y;
};

// ─── Draw temporal line chart ─────────────────────────────────────────────────
const drawLineChart = (
  doc: jsPDF,
  tasks: ExportTask[],
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.text("EVOLUÇÃO TEMPORAL (CRIAÇÃO vs CONCLUSÃO)", x, y);
  doc.setFont("helvetica", "normal");
  y += 4;

  // Build monthly data
  const monthMap: Record<string, { created: number; done: number }> = {};

  tasks.forEach((t) => {
    const createdDate = parseDateStr(t.created_at || t.created);
    if (createdDate) {
      const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { created: 0, done: 0 };
      monthMap[key].created++;
    }
    if (t.status === "Concluído") {
      const doneDate = parseDateStr(t.completed_at || t.completed);
      if (doneDate) {
        const key = `${doneDate.getFullYear()}-${String(doneDate.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap[key]) monthMap[key] = { created: 0, done: 0 };
        monthMap[key].done++;
      }
    }
  });

  const months = Object.keys(monthMap).sort();
  if (months.length < 2) {
    doc.setFontSize(8);
    doc.setTextColor(...C.secondary);
    doc.text("Dados insuficientes para gráfico temporal.", x, y + 10);
    return y + 20;
  }

  const chartY = y;
  const chartH = h - 10;
  const chartW = w;
  const maxVal = Math.max(
    ...months.map((m) => Math.max(monthMap[m].created, monthMap[m].done)),
    1,
  );

  // Chart background
  doc.setFillColor(...C.light);
  doc.rect(x, chartY, chartW, chartH, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.rect(x, chartY, chartW, chartH);

  // Grid lines (horizontal)
  const gridLines = 4;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.15);
  for (let i = 1; i <= gridLines; i++) {
    const gy = chartY + chartH - (i / gridLines) * chartH;
    doc.line(x, gy, x + chartW, gy);
    doc.setFontSize(5);
    doc.setTextColor(...C.secondary);
    doc.text(String(Math.round((i / gridLines) * maxVal)), x - 4, gy + 1, {
      align: "right",
    });
  }

  // Data points
  const stepX = chartW / (months.length - 1);
  const toChartY = (v: number) => chartY + chartH - (v / maxVal) * chartH;

  const drawLine = (
    values: number[],
    color: [number, number, number],
    label: string,
  ) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.8);
    for (let i = 0; i < months.length - 1; i++) {
      const x1 = x + i * stepX;
      const y1 = toChartY(values[i]);
      const x2 = x + (i + 1) * stepX;
      const y2 = toChartY(values[i + 1]);
      doc.line(x1, y1, x2, y2);
    }
    // Dots
    doc.setFillColor(...color);
    months.forEach((_m, i) => {
      const px = x + i * stepX;
      const py = toChartY(values[i]);
      doc.circle(px, py, 1, "F");
    });
    return label;
  };

  const createdVals = months.map((m) => monthMap[m].created);
  const doneVals = months.map((m) => monthMap[m].done);
  drawLine(createdVals, C.info, "Criadas");
  drawLine(doneVals, C.success, "Concluídas");

  // X-axis labels
  const labelEvery = Math.max(1, Math.floor(months.length / 6));
  months.forEach((m, i) => {
    if (i % labelEvery === 0) {
      const px = x + i * stepX;
      doc.setFontSize(5);
      doc.setTextColor(...C.secondary);
      const [yr, mo] = m.split("-");
      const label = `${mo}/${yr.slice(2)}`;
      doc.text(label, px, chartY + chartH + 4, { align: "center" });
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.15);
      doc.line(px, chartY + chartH, px, chartY + chartH + 2);
    }
  });

  // Legend
  const legendY = chartY + chartH + 8;
  doc.setFillColor(...C.info);
  doc.rect(x, legendY, 6, 2, "F");
  doc.setFontSize(6);
  doc.setTextColor(...C.secondary);
  doc.text("Criadas", x + 8, legendY + 1.5);
  doc.setFillColor(...C.success);
  doc.rect(x + 28, legendY, 6, 2, "F");
  doc.text("Concluídas", x + 36, legendY + 1.5);

  return legendY + 8;
};

// ─── Draw Timeline (Cronograma) ──────────────────────────────────────────────
const drawTimeline = (
  doc: jsPDF,
  tasks: ExportTask[],
  x: number,
  y: number,
  w: number,
  logo: string | null,
  pageNum: () => number,
  footerMeta?: { generatedBy?: string; filters?: string },
): number => {
  const HEADER_H = 8;
  const ROW_H = 14;
  const LABEL_W = 65;

  const events = [
    { k: "created", l: "Criado", c: [99, 102, 241] }, // #6366f1
    { k: "assigned", l: "Atribuído", c: [139, 92, 246] }, // #8b5cf6
    { k: "started", l: "Iniciado", c: [245, 158, 11] }, // #f59e0b
    { k: "paused", l: "Pausado", c: [239, 68, 68] }, // #ef4444
    { k: "completed", l: "Concluído", c: [16, 185, 129] }, // #10b981
  ];

  doc.setFontSize(8);
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.text("TAREFA", x + 2, y + 5);
  doc.text("LINHA DO TEMPO (HISTÓRICO)", x + LABEL_W + 2, y + 5);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(x, y + HEADER_H, x + w, y + HEADER_H);

  let curY = y + HEADER_H;
  const maxRowsPerPage = Math.floor((PH - curY - 20) / ROW_H);
  let rowCount = 0;

  tasks.forEach((t, i) => {
    if (rowCount >= maxRowsPerPage) {
      doc.addPage();
      drawHeader(doc, logo, "CRONOGRAMA DE ENTREGA", pageNum(), footerMeta);
      curY = 32;
      rowCount = 0;

      doc.setFontSize(8);
      doc.setTextColor(...C.dark);
      doc.setFont("helvetica", "bold");
      doc.text("TAREFA", x + 2, curY - 3);
      doc.text("LINHA DO TEMPO", x + LABEL_W + 2, curY - 3);
      doc.line(x, curY, x + w, curY);
    }

    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 253);
      doc.rect(x, curY, w, ROW_H, "F");
    }

    doc.setFontSize(7);
    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold");
    const title = t.title.length > 38 ? t.title.slice(0, 38) + "..." : t.title;
    doc.text(title, x + 2, curY + 5);

    doc.setFontSize(6);
    doc.setTextColor(...C.secondary);
    doc.setFont("helvetica", "normal");
    const resp = getName(t.responsible);
    doc.text(resp, x + 2, curY + 10);

    let lastDotX = 0;
    const dotSpacing = 24;
    events.forEach((ev, ei) => {
      const val = t[ev.k as keyof ExportTask] as string | undefined;
      if (!val) return;

      const dotX = x + LABEL_W + 8 + ei * dotSpacing;

      if (lastDotX > 0) {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(
          lastDotX + 1.5,
          curY + ROW_H / 2,
          dotX - 1.5,
          curY + ROW_H / 2,
        );
      }

      doc.setFillColor(...(ev.c as [number, number, number]));
      doc.circle(dotX, curY + ROW_H / 2, 1.2, "F");

      doc.setFontSize(5);
      doc.setTextColor(...(ev.c as [number, number, number]));
      doc.setFont("helvetica", "bold");
      doc.text(val, dotX, curY + ROW_H / 2 + 3.5, { align: "center" });

      doc.setFontSize(4.5);
      doc.setTextColor(...C.secondary);
      doc.setFont("helvetica", "normal");
      doc.text(ev.l, dotX, curY + ROW_H / 2 + 5.5, { align: "center" });

      lastDotX = dotX;
    });

    curY += ROW_H;
    rowCount++;
  });

  return curY;
};

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
export const exportToExcel = (
  tasks: ExportTask[],
  kpi?: ExportKPIs,
  currentUser?: { name?: string } | null,
  filterLabel?: string,
) => {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Resumo ──
  if (kpi) {
    const resumoData = [
      ["GEOGIS GEOTÉCNOLOGIA — RELATÓRIO DE TAREFAS"],
      [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
      [`Gerado por: ${currentUser?.name || "Usuário não identificado"}`],
      [`Filtros aplicados: ${filterLabel || "Nenhum"}`],
      [],
      ["INDICADORES GERAIS"],
      ["Total de Tarefas", tasks.length],
      ["Tarefas Concluídas", kpi.concludedCount],
      [
        "Taxa de Conclusão",
        tasks.length
          ? `${Math.round((kpi.concludedCount / tasks.length) * 100)}%`
          : "0%",
      ],
      ["Em Atraso", kpi.delayedCount],
      ["Tempo Médio de Execução", fmt(kpi.avgTime)],
      [],
      ["DISTRIBUIÇÃO POR PRIORIDADE"],
      ["Alta", kpi.highPriorityCount],
      ["Média", kpi.midPriorityCount],
      ["Baixa", kpi.lowPriorityCount],
      [],
      ["DISTRIBUIÇÃO POR STATUS"],
      ...kpi.pieData.map((d) => [d.name, d.value]),
      [],
      ["TOP SETORES (por conclusões)"],
      ...kpi.sectorRank.map((s) => [s.name, s.v]),
      [],
      ["TOP COLABORADORES (por conclusões)"],
      ...kpi.userRank.map((u) => [u.name, u.sector || "", u.v]),
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
  }

  // ── Sheet 2: Tarefas ──
  const taskRows = tasks.map((t) => {
    const state = getTaskState(t);
    return {
      ID: t.id,
      Título: t.title,
      Descrição: t.description || "—",
      Tipo: t.type || "—",
      Prioridade: t.priority || "—",
      Status: t.status,
      "Estado Atual": state ? state.label : "Sem Prazo",
      Setor: getName(t.sector),
      Responsável: getName(t.responsible),
      Contrato: t.contract || "—",
      Cidade: t.city || "—",
      "Bairro/Núcleo": t.nucleus || "—",
      Quadra: t.quadra || "—",
      Lote: t.lote || "—",
      "Data Criação": t.created || "—",
      "Data Início": t.started || "—",
      Prazo: t.deadline || "—",
      "Data Conclusão": t.completed || "—",
      "Tempo Execução": fmt(t.time || 0),
      Pausas: t.pauses?.length || 0,
      Subtarefas: t.subtasks?.length || 0,
    };
  });
  const wsTasks = XLSX.utils.json_to_sheet(taskRows);
  wsTasks["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 30 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTasks, "Tarefas");

  // ── Sheet 3: Subtarefas ──
  const subtaskRows: Record<string, unknown>[] = [];
  tasks.forEach((t) => {
    (t.subtasks || []).forEach((s) => {
      const subState = getTaskState(s as Partial<ExportTask>);
      subtaskRows.push({
        ID: s.id,
        "Tarefa Pai (Título)": t.title,
        "Tarefa Pai (ID)": t.id,
        Título: s.title,
        Status: s.status || (s.done ? "Concluído" : "A Fazer"),
        "Estado Atual": subState ? subState.label : "Sem Prazo",
        Setor:
          getName(s.sector) !== "—" ? getName(s.sector) : getName(t.sector),
        Responsável: getName(s.responsible),
        Prazo: s.deadline || t.deadline || "—",
        Contrato: s.contract || t.contract || "—",
        Cidade: s.city || t.city || "—",
        "Bairro/Núcleo": s.nucleus || t.nucleus || "—",
        Quadra: s.quadra || t.quadra || "—",
        Lote: s.lote || t.lote || "—",
        "Tempo Execução": fmt(s.time || 0),
        Concluída: s.done ? "Sim" : "Não",
      });
    });
  });
  const wsSubtasks = XLSX.utils.json_to_sheet(subtaskRows);
  wsSubtasks["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 12 },
    { wch: 35 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSubtasks, "Subtarefas");

  // ── Sheet 4: Cronograma ──
  const scheduleRows = tasks
    .filter((t) => t.created || t.deadline)
    .sort((a, b) => {
      const da = parseDateStr(a.created_at || a.created);
      const db = parseDateStr(b.created_at || b.created);
      return (da?.getTime() || 0) - (db?.getTime() || 0);
    })
    .map((t) => ({
      ID: t.id,
      Título: t.title,
      Status: t.status,
      "Estado Prazo": getTaskState(t)?.label || "Sem Prazo",
      Setor: getName(t.sector),
      Responsável: getName(t.responsible),
      "Data Criação": t.created || "—",
      "Data Início": t.started || "—",
      Prazo: t.deadline || "—",
      "Data Conclusão": t.completed || "—",
      "Duração (dias)": (() => {
        const s = parseDateStr(t.created_at || t.created);
        const e = parseDateStr(t.deadline);
        if (s && e) return Math.ceil((e.getTime() - s.getTime()) / 86400000);
        return "—";
      })(),
    }));
  const wsSched = XLSX.utils.json_to_sheet(scheduleRows);
  wsSched["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSched, "Cronograma");

  XLSX.writeFile(
    wb,
    `geotask_relatorio_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
export const exportToPDF = async (
  tasks: ExportTask[],
  kpi: ExportKPIs,
  users: unknown[] = [],
  currentUser?: { name?: string } | null,
  filterLabel?: string,
) => {
  const footerMeta = {
    generatedBy: currentUser?.name || "",
    filters: filterLabel || "Nenhum",
  };
  const doc = new jsPDF("l", "mm", "a4");
  const logo = await getLogoBase64();
  let p = 1;
  const nextPage = () => {
    doc.addPage();
    p++;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1: KPIs + Charts
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader(doc, logo, "VISÃO GERAL E INDICADORES", p, footerMeta);

  let y = 30;

  // ── KPI Cards row ──
  const cardW = (CW - 9) / 4;
  const cardH = 24;
  const totalTasks = tasks.length;
  const concludedPct = totalTasks
    ? Math.round((kpi.concludedCount / totalTasks) * 100)
    : 0;

  drawKpiCard(
    doc,
    "Total de Tarefas",
    String(totalTasks),
    `${tasks.filter((t) => t.status === "Em Andamento").length} em andamento`,
    ML,
    y,
    cardW,
    cardH,
    C.info,
  );
  drawKpiCard(
    doc,
    "Concluídas",
    String(kpi.concludedCount),
    `${concludedPct}% de conclusão`,
    ML + cardW + 3,
    y,
    cardW,
    cardH,
    C.success,
  );
  drawKpiCard(
    doc,
    "Em Atraso",
    String(kpi.delayedCount),
    `${totalTasks ? Math.round((kpi.delayedCount / totalTasks) * 100) : 0}% do total`,
    ML + (cardW + 3) * 2,
    y,
    cardW,
    cardH,
    C.danger,
  );
  drawKpiCard(
    doc,
    "Tempo Médio",
    fmt(kpi.avgTime),
    "por tarefa concluída",
    ML + (cardW + 3) * 3,
    y,
    cardW,
    cardH,
    C.warning,
  );

  y += cardH + 6;

  // ── Two chart columns ──
  const col1W = (CW - 6) / 2;
  const col2X = ML + col1W + 6;

  // Left: Status distribution
  const statusColors: [number, number, number][] = [
    C.info,
    C.warning,
    C.danger,
    C.success,
  ];
  let leftY = drawBarChart(
    doc,
    kpi.pieData,
    statusColors,
    ML,
    y,
    col1W,
    "DISTRIBUIÇÃO POR STATUS",
  );

  // Priority under status (left col)
  leftY += 2;
  const prioData = [
    { name: "Alta Prioridade", value: kpi.highPriorityCount },
    { name: "Média Prioridade", value: kpi.midPriorityCount },
    { name: "Baixa Prioridade", value: kpi.lowPriorityCount },
  ].filter((d) => d.value > 0);
  drawBarChart(
    doc,
    prioData,
    [C.danger, C.warning, C.success],
    ML,
    leftY,
    col1W,
    "DISTRIBUIÇÃO POR PRIORIDADE",
  );

  // Right: Temporal line chart
  const lineH = PH - y - 20;
  drawLineChart(doc, tasks, col2X, y, col1W, lineH);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2+: Sector Reports
  // ══════════════════════════════════════════════════════════════════════════
  const sectorsList = Array.from(
    new Set(tasks.map((t) => getName(t.sector)).filter((s) => s !== "—")),
  );

  for (const sectorName of sectorsList) {
    nextPage();
    drawHeader(doc, logo, `SETOR: ${sectorName.toUpperCase()}`, p, footerMeta);

    const sectorTasks = tasks.filter((t) => getName(t.sector) === sectorName);
    const usersArr = users as { name: string; sector?: unknown }[];
    const sectorUsers = usersArr.filter(
      (u) => getName(u.sector) === sectorName,
    );
    const sectorDone = sectorTasks.filter(
      (t) => t.status === "Concluído",
    ).length;
    const sectorDelayed = sectorTasks.filter(
      (t) => getTaskState(t)?.label === "Em Atraso",
    ).length;
    const sectorInProgress = sectorTasks.filter(
      (t) => t.status === "Em Andamento",
    ).length;
    const pct = sectorTasks.length
      ? Math.round((sectorDone / sectorTasks.length) * 100)
      : 0;

    let sy = 30;

    // Sector KPI cards
    const sCardW = (CW - 9) / 4;
    const sCardH = 20;
    drawKpiCard(
      doc,
      "Total",
      String(sectorTasks.length),
      "tarefas no setor",
      ML,
      sy,
      sCardW,
      sCardH,
      C.info,
    );
    drawKpiCard(
      doc,
      "Concluídas",
      String(sectorDone),
      `${pct}% de conclusão`,
      ML + sCardW + 3,
      sy,
      sCardW,
      sCardH,
      C.success,
    );
    drawKpiCard(
      doc,
      "Em Andamento",
      String(sectorInProgress),
      "em execução",
      ML + (sCardW + 3) * 2,
      sy,
      sCardW,
      sCardH,
      C.warning,
    );
    drawKpiCard(
      doc,
      "Em Atraso",
      String(sectorDelayed),
      "tarefas atrasadas",
      ML + (sCardW + 3) * 3,
      sy,
      sCardW,
      sCardH,
      C.danger,
    );
    sy += sCardH + 6;

    // Two columns: ranking + status bar
    const sc1W = 80;
    const sc2X = ML + sc1W + 8;
    const sc2W = CW - sc1W - 8;

    // User ranking table (left)
    const sectorUserRank = sectorUsers
      .map((u) => ({
        name: u.name,
        done: sectorTasks.filter(
          (t) => getName(t.responsible) === u.name && t.status === "Concluído",
        ).length,
        total: sectorTasks.filter((t) => getName(t.responsible) === u.name)
          .length,
      }))
      .sort((a, b) => b.done - a.done);

    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold");
    doc.text("RANKING DE COLABORADORES", ML, sy);
    doc.setFont("helvetica", "normal");
    sy += 3;

    autoTable(doc, {
      startY: sy,
      head: [["Colaborador", "Total", "Concluídas", "%"]],
      body: sectorUserRank.map((r) => [
        r.name,
        r.total,
        r.done,
        r.total ? `${Math.round((r.done / r.total) * 100)}%` : "—",
      ]),
      theme: "grid",
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontSize: 7,
        fontStyle: "bold",
      },
      styles: { fontSize: 7 },
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
      },
      margin: { left: ML, right: PW - ML - sc1W },
      tableWidth: sc1W,
    });

    // Status bar chart (right)
    const sectorPieData = ["A Fazer", "Em Andamento", "Pausado", "Concluído"]
      .map((s) => ({
        name: s,
        value: sectorTasks.filter((t) => t.status === s).length,
      }))
      .filter((d) => d.value > 0);
    const chartEndY = drawBarChart(
      doc,
      sectorPieData,
      statusColors,
      sc2X,
      sy,
      sc2W,
      "STATUS DAS TAREFAS",
    );

    // @ts-expect-error: jspdf types or missing property in custom build
    const rankingEndY = doc.lastAutoTable?.finalY || sy + 30;
    const afterRank = Math.max(rankingEndY, chartEndY) + 6;

    // Sector task table
    const tableData: (string | number)[][] = [];
    sectorTasks.forEach((t) => {
      tableData.push([
        t.id,
        t.title.length > 40 ? t.title.slice(0, 40) + "…" : t.title,
        t.priority || "—",
        t.status,
        getTaskState(t)?.label || "Sem Prazo",
        getName(t.responsible),
        t.deadline || "—",
        t.contract || "—",
        `${t.subtasks?.length || 0}`,
        fmt(t.time || 0),
      ]);
      (t.subtasks || []).forEach((s) => {
        tableData.push([
          s.id,
          `  ↳ ${s.title.length > 37 ? s.title.slice(0, 37) + "…" : s.title}`,
          s.priority || t.priority || "—",
          s.status || (s.done ? "Concluído" : "A Fazer"),
          getTaskState(s as Partial<ExportTask>)?.label || "—",
          getName(s.responsible) !== "—" ? getName(s.responsible) : "—",
          s.deadline || "—",
          s.contract || t.contract || "—",
          "—",
          fmt(s.time || 0),
        ]);
      });
    });

    autoTable(doc, {
      startY: afterRank,
      head: [
        [
          "ID",
          "Título",
          "Prio.",
          "Status",
          "Estado",
          "Responsável",
          "Prazo",
          "Contrato",
          "Subs",
          "Tempo",
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: C.dark,
        textColor: C.white,
        fontSize: 6.5,
        fontStyle: "bold",
      },
      styles: { fontSize: 6.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 70 },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 30 },
        6: { cellWidth: 18, halign: "center" },
        7: { cellWidth: 24 },
        8: { cellWidth: 8, halign: "center" },
        9: { cellWidth: 16, halign: "center" },
      },
      margin: { left: ML, right: MR },
      didDrawPage: () => {
        drawHeader(
          doc,
          logo,
          `SETOR: ${sectorName.toUpperCase()}`,
          p,
          footerMeta,
        );
      },
    });
    // @ts-expect-error: jspdf types or missing property in custom build
    p = doc.internal.getCurrentPageInfo().pageNumber;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Page 3: Chronograma de Tarefas (Timeline)
  doc.addPage();
  drawHeader(doc, logo, "CRONOGRAMA DE TAREFAS", p, footerMeta);
  drawTimeline(doc, tasks, ML, 35, PW - ML - MR, logo, () => ++p, footerMeta);
  // @ts-expect-error: jspdf types or missing property in custom build
  p = doc.internal.getCurrentPageInfo().pageNumber;

  // ══════════════════════════════════════════════════════════════════════════
  // DETAIL PAGE: Full task details table
  // ══════════════════════════════════════════════════════════════════════════
  nextPage();
  drawHeader(doc, logo, "DETALHAMENTO COMPLETO", p, footerMeta);

  const detailData: (string | number)[][] = [];
  tasks.forEach((t) => {
    const state = getTaskState(t);
    detailData.push([
      t.id,
      t.title.length > 38 ? t.title.slice(0, 38) + "…" : t.title,
      t.type || "—",
      t.priority || "—",
      t.status,
      state?.label || "Sem Prazo",
      getName(t.sector),
      getName(t.responsible),
      t.contract || "—",
      t.city || "—",
      t.nucleus || "—",
      t.quadra || "—",
      t.lote || "—",
      t.created || "—",
      t.deadline || "—",
      t.completed || "—",
      fmt(t.time || 0),
    ]);
    (t.subtasks || []).forEach((s) => {
      const ss = getTaskState(s as Partial<ExportTask>);
      detailData.push([
        s.id,
        `  ↳ ${s.title.length > 35 ? s.title.slice(0, 35) + "…" : s.title}`,
        s.type || t.type || "—",
        s.priority || t.priority || "—",
        s.status || (s.done ? "Concluído" : "A Fazer"),
        ss?.label || "—",
        getName(s.sector) !== "—" ? getName(s.sector) : getName(t.sector),
        getName(s.responsible),
        t.contract || "—",
        t.city || "—",
        t.nucleus || "—",
        t.quadra || "—",
        t.lote || "—",
        "—",
        s.deadline || "—",
        "—",
        fmt(s.time || 0),
      ]);
    });
  });

  autoTable(doc, {
    startY: 30,
    head: [
      [
        "ID",
        "Título",
        "Tipo",
        "Prio.",
        "Status",
        "Estado",
        "Setor",
        "Responsável",
        "Contrato",
        "Cidade",
        "Bairro",
        "Quadra",
        "Lote",
        "Criação",
        "Prazo",
        "Conclusão",
        "Tempo",
      ],
    ],
    body: detailData,
    theme: "grid",
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontSize: 5.5,
      fontStyle: "bold",
    },
    styles: { fontSize: 5.5, cellPadding: 1.2 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 52 },
      2: { cellWidth: 16 },
      3: { cellWidth: 10, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 18 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18 },
      9: { cellWidth: 14 },
      10: { cellWidth: 14 },
      11: { cellWidth: 10, halign: "center" },
      12: { cellWidth: 8, halign: "center" },
      13: { cellWidth: 14, halign: "center" },
      14: { cellWidth: 14, halign: "center" },
      15: { cellWidth: 16, halign: "center" },
      16: { cellWidth: 14, halign: "center" },
    },
    margin: { left: ML, right: MR },
    didDrawPage: () => {
      drawHeader(doc, logo, "DETALHAMENTO COMPLETO", p++, footerMeta);
    },
    rowPageBreak: "avoid",
  });

  doc.save(`relatorio_geotask_${new Date().toISOString().split("T")[0]}.pdf`);
};
