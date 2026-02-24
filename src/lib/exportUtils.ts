import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ExportTask {
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
  started?: string;
  completed?: string;
  completed_at?: string;
  time?: number;
  subtasks?: ExportTask[];
  pauses?: { reason: string; start: string; end?: string }[];
  done?: boolean;
}

interface ExportKPIs {
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

const COLORS = {
  primary: [152, 175, 59],
  secondary: [80, 80, 80],
  danger: [239, 68, 68],
  success: [16, 185, 129],
  warning: [245, 158, 11],
  info: [59, 130, 246],
  light: [245, 245, 245],
  border: [220, 220, 220],
  chart: [
    [152, 175, 59],
    [59, 130, 246],
    [245, 158, 11],
    [239, 68, 68],
    [139, 92, 246],
    [236, 72, 153],
  ],
};

const formatExecutionTime = (minutes: number) => {
  if (!minutes) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
};

const parseDateStr = (s?: string) => {
  if (!s) return undefined;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const parts = s.split("/");
  if (parts.length === 3) {
    const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return undefined;
};

const getName = (obj: any): string => {
  if (!obj) return "—";
  if (typeof obj === "string") return obj;
  if (obj.name) return obj.name;
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
    return { label: "Dentro do Prazo", color: "#10b981" };
  }
};

export const getKpiData = (filtered: ExportTask[], users: any[]) => {
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

  const userRank = (users || [])
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

export const exportToExcel = (tasks: ExportTask[]) => {
  const taskRows = tasks.map((t) => {
    const state = getTaskState(t);
    return {
      ID: t.id,
      Título: t.title,
      Tipo: t.type,
      Prioridade: t.priority,
      Prazo: t.deadline || "—",
      Status: t.status,
      "Estado Atual": state ? state.label : "Sem Prazo",
      Setor: getName(t.sector),
      Responsável: getName(t.responsible),
      Contrato: t.contract || "—",
      Cidade: t.city || "—",
      Bairro: t.nucleus || "—",
      Quadra: t.quadra || "—",
      Lote: t.lote || "—",
      "Data Criação": t.created || "—",
      "Data Início": t.started || "—",
      "Data Conclusão": t.completed || "—",
      "Tempo Execução": formatExecutionTime(t.time || 0),
      Pausas: t.pauses?.length || 0,
    };
  });

  const subtaskRows: any[] = [];
  tasks.forEach((t) => {
    (t.subtasks || []).forEach((s) => {
      const subState = getTaskState(s as Partial<ExportTask>);
      subtaskRows.push({
        ID: s.id,
        "Tarefa Pai": t.title,
        Título: s.title,
        Tipo: s.type || t.type,
        Prioridade: s.priority || t.priority,
        Status: s.status || (s.done ? "Concluído" : "A Fazer"),
        "Estado Atual": subState ? subState.label : "Sem Prazo",
        Setor:
          getName(s.sector) !== "—" ? getName(s.sector) : getName(t.sector),
        Responsável: getName(s.responsible),
        Contrato: s.contract || t.contract || "—",
        Cidade: s.city || t.city || "—",
        Bairro: s.nucleus || t.nucleus || "—",
        Quadra: s.quadra || t.quadra || "—",
        Lote: s.lote || t.lote || "—",
        "Tempo Execução": formatExecutionTime(s.time || 0),
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const wsTasks = XLSX.utils.json_to_sheet(taskRows);
  const wsSubtasks = XLSX.utils.json_to_sheet(subtaskRows);
  XLSX.utils.book_append_sheet(wb, wsTasks, "Tarefas");
  XLSX.utils.book_append_sheet(wb, wsSubtasks, "Subtarefas");
  XLSX.writeFile(
    wb,
    `geotask_tasks_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

export const exportToPDF = async (
  tasks: ExportTask[],
  kpi: ExportKPIs,
  users: any[] = [],
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  // Helpers de Estilo
  const setPrimary = () =>
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  const setSecondary = () =>
    doc.setTextColor(
      COLORS.secondary[0],
      COLORS.secondary[1],
      COLORS.secondary[2],
    );
  const resetColor = () => doc.setTextColor(0, 0, 0);

  // 1. HEADER
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("GEOTASK PRO - RELATÓRIO EXECUTIVO", 14, 25);
  doc.setFontSize(10);
  doc.text(`GERADO EM: ${new Date().toLocaleString("pt-BR")}`, 14, 33);

  let y = 50;

  // 2. SUMÁRIO GLOBAL
  const drawKpi = (
    label: string,
    value: string | number,
    x: number,
    y: number,
  ) => {
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    // @ts-ignore
    doc.roundedRect(x, y, 45, 22, 2, 2);
    doc.setFontSize(8);
    setSecondary();
    doc.text(label.toUpperCase(), x + 4, y + 7);
    doc.setFontSize(14);
    resetColor();
    doc.text(String(value), x + 4, y + 16);
  };

  drawKpi("Total Tarefas", tasks.length, 14, y);
  drawKpi("Concluídas", kpi.concludedCount, 62, y);
  drawKpi("Tempo Médio", formatExecutionTime(kpi.avgTime), 110, y);
  drawKpi("Em Atraso", kpi.delayedCount, 158, y);

  y += 35;

  // 3. GRÁFICOS (Implementação manual de barras)
  setPrimary();
  doc.setFontSize(14);
  doc.text("DISTRIBUIÇÃO POR STATUS", 14, y);
  y += 10;

  const barWidth = 120;
  const barHeight = 8;
  const maxVal = Math.max(...kpi.pieData.map((d) => d.value), 1);

  kpi.pieData.forEach((d, i) => {
    const valWidth = (d.value / maxVal) * barWidth;
    doc.setFillColor(
      COLORS.chart[i % COLORS.chart.length][0],
      COLORS.chart[i % COLORS.chart.length][1],
      COLORS.chart[i % COLORS.chart.length][2],
    );
    doc.rect(40, y - 5, valWidth, barHeight, "F");
    doc.setFontSize(9);
    resetColor();
    doc.text(d.name, 14, y);
    doc.text(String(d.value), 40 + valWidth + 3, y);
    y += 12;
  });

  y += 10;

  // 4. SEÇÕES POR SETOR
  const sectorsList = Array.from(
    new Set(tasks.map((t) => getName(t.sector)).filter((s) => s !== "—")),
  );

  for (const sectorName of sectorsList) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    const sectorTasks = tasks.filter((t) => getName(t.sector) === sectorName);
    const sectorUsers = users.filter((u) => getName(u.sector) === sectorName);
    const sectorConcluded = sectorTasks.filter(
      (t) => t.status === "Concluído",
    ).length;
    const sectorDelayed = sectorTasks.filter(
      (t) => getTaskState(t)?.label === "Em Atraso",
    ).length;

    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.rect(14, y, pageWidth - 28, 10, "F");
    setPrimary();
    doc.setFontSize(13);
    doc.text(`SETOR: ${sectorName.toUpperCase()}`, 18, y + 7);
    y += 15;

    // Mini KPIs do Setor
    doc.setFontSize(9);
    resetColor();
    doc.text(
      `Tarefas: ${sectorTasks.length} | Concluídas: ${sectorConcluded} | Atrasos: ${sectorDelayed}`,
      18,
      y,
    );
    y += 10;

    // Ranking do Setor
    doc.setFontSize(11);
    setSecondary();
    doc.text(`Ranking do Setor - ${sectorName}`, 14, y);
    y += 5;

    const sectorUserRank = sectorUsers
      .map((u) => ({
        name: u.name,
        v: sectorTasks.filter(
          (t) => getName(t.responsible) === u.name && t.status === "Concluído",
        ).length,
      }))
      .filter((r) => r.v >= 0)
      .sort((a, b) => b.v - a.v);

    autoTable(doc, {
      startY: y,
      head: [["Colaborador", "Tarefas Concluídas"]],
      body: sectorUserRank.map((r) => [r.name, r.v]),
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10;

    // Lista Simplificada de Tarefas do Setor
    const tableData: any[] = [];
    sectorTasks.forEach((t) => {
      tableData.push([
        t.id,
        t.title,
        t.status,
        getName(t.responsible),
        getTaskState(t)?.label || "—",
        t.contract || "—",
        formatExecutionTime(t.time || 0),
      ]);
      (t.subtasks || []).forEach((s) => {
        tableData.push([
          s.id,
          `  ↳ ${s.title}`,
          s.status || (s.done ? "Concluído" : "A Fazer"),
          getName(s.responsible),
          getTaskState(s as Partial<ExportTask>)?.label || "—",
          s.contract || t.contract || "—",
          formatExecutionTime(s.time || 0),
        ]);
      });
    });

    autoTable(doc, {
      startY: y,
      head: [
        [
          "ID",
          "Título",
          "Status",
          "Responsável",
          "Estado",
          "Contrato",
          "Tempo",
        ],
      ],
      body: tableData,
      theme: "striped",
      styles: { fontSize: 7 },
      columnStyles: { 1: { cellWidth: 70 } },
      margin: { left: 14, right: 14 },
    });

    //@ts-ignore
    y = doc.lastAutoTable.finalY + 20;
  }

  // 5. DETALHAMENTO FINAL (Opcional, se o usuário quiser a folha de detalhes que já tínhamos)
  doc.addPage();
  setPrimary();
  doc.setFontSize(16);
  doc.text("ANEXO: DETALHAMENTO COMPLETO", 14, 20);

  let currentY = 30;
  tasks.forEach((t, i) => {
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFillColor(245, 245, 245);
    doc.rect(14, currentY - 5, 182, 7, "F");
    doc.setFontSize(10);
    resetColor();
    doc.text(`${i + 1}. ${t.title} [${t.status}]`, 16, currentY);
    currentY += 8;

    doc.setFontSize(8);
    setSecondary();
    const resp = getName(t.responsible);
    doc.text(
      `Tipo: ${t.type} | Prio: ${t.priority} | Resp: ${resp} | Prazo: ${t.deadline || "—"}`,
      16,
      currentY,
    );
    currentY += 5;

    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach((s) => {
        if (currentY > 280) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(`  ↳ ${s.title} [${s.status || "—"}]`, 20, currentY);
        currentY += 4;
      });
    }
    currentY += 6;
  });

  doc.save(`relatorio_geotask_${new Date().toISOString().split("T")[0]}.pdf`);
};
