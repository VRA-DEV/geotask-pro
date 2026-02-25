"use client";

import {
  AlertCircle,
  BarChart2,
  BookOpen,
  Check,
  ChevronUp,
  Copy,
  FileDown,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AnalysisOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface Stats {
  total: number;
  created: number;
  completed: number;
  pending: number;
  overdue: number;
  byStatus: Record<string, number>;
  bySector: Record<string, number>;
}

interface AIReportModalProps {
  T: {
    card: string;
    border: string;
    text: string;
    sub: string;
    bgBody: string;
    [key: string]: string;
  };
}

// ─── Opções de análise disponíveis ───────────────────────────────────────────

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    id: "weekly",
    label: "Relatório Semanal",
    description: "Resumo geral do período: criadas, concluídas, pendentes",
    icon: <BarChart2 size={16} />,
  },
  {
    id: "sector",
    label: "Análise por Setor",
    description: "Desempenho e gargalos por setor da organização",
    icon: <BookOpen size={16} />,
  },
  {
    id: "priorities",
    label: "Priorização de Tarefas",
    description: "Sugestão de ordem ideal de execução das pendências",
    icon: <TrendingUp size={16} />,
  },
  {
    id: "contracts",
    label: "Análise de Contratos",
    description: "Taxa de conclusão e riscos por contrato",
    icon: <FileText size={16} />,
  },
  {
    id: "responsible",
    label: "Desempenho por Responsável",
    description: "Carga de trabalho e produtividade por colaborador",
    icon: <Users size={16} />,
  },
];

// ─── Renderizador de Markdown simples ────────────────────────────────────────

function MarkdownRenderer({ text, color }: { text: string; color: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color,
            margin: "20px 0 8px",
            borderBottom: "1px solid rgba(99,102,241,0.2)",
            paddingBottom: 4,
          }}
        >
          {line.replace("### ", "")}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: 16,
            fontWeight: 700,
            color,
            margin: "24px 0 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {line.replace("## ", "")}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          style={{
            fontSize: 18,
            fontWeight: 800,
            color,
            margin: "0 0 16px",
          }}
        >
          {line.replace("# ", "")}
        </h1>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li
          key={i}
          style={{
            fontSize: 13,
            color,
            lineHeight: 1.6,
            marginLeft: 16,
            marginBottom: 2,
          }}
        >
          {renderInline(line.replace(/^[-*] /, ""))}
        </li>,
      );
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li
          key={i}
          style={{
            fontSize: 13,
            color,
            lineHeight: 1.6,
            marginLeft: 16,
            marginBottom: 2,
            listStyleType: "decimal",
          }}
        >
          {renderInline(line.replace(/^\d+\. /, ""))}
        </li>,
      );
    } else if (line.startsWith("|") && line.endsWith("|")) {
      // Coleta todas as linhas da tabela
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].match(/^\|[-| :]+\|$/)) {
          tableLines.push(lines[i]);
        }
        i++;
      }
      const [headerRow, ...bodyRows] = tableLines;

      elements.push(
        <div key={`table-${i}`} style={{ overflowX: "auto", margin: "12px 0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "rgba(99,102,241,0.1)",
                  borderBottom: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                {headerRow
                  .split("|")
                  .filter((c) => c.trim() !== "")
                  .map((cell, ci) => (
                    <th
                      key={ci}
                      style={{
                        padding: "6px 10px",
                        color,
                        fontWeight: 700,
                        textAlign: "left",
                      }}
                    >
                      {renderInline(cell.trim())}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((tl, ti) => {
                const cells = tl.split("|").filter((c) => c.trim() !== "");
                return (
                  <tr
                    key={ti}
                    style={{
                      borderBottom: "1px solid rgba(99,102,241,0.1)",
                    }}
                  >
                    {cells.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "6px 10px",
                          color,
                          fontWeight: 400,
                        }}
                      >
                        {renderInline(cell.trim())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>,
      );
      continue;
    } else if (line.startsWith("---")) {
      elements.push(
        <hr
          key={i}
          style={{
            border: "none",
            borderTop: "1px solid rgba(99,102,241,0.2)",
            margin: "16px 0",
          }}
        />,
      );
    } else if (line.trim() !== "") {
      elements.push(
        <p
          key={i}
          style={{ fontSize: 13, color, lineHeight: 1.7, margin: "6px 0" }}
        >
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }

  return <div>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    } else if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          style={{
            background: "rgba(99,102,241,0.15)",
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flex: 1,
        minWidth: 80,
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 800, color }}>{value}</span>
      <span
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.7)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AIReportModal({ T }: AIReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  // Configurações
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([
    "weekly",
  ]);
  const [customMessage, setCustomMessage] = useState("");
  const [periodDays, setPeriodDays] = useState(7);
  const [showConfig, setShowConfig] = useState(true);

  const toggleAnalysis = (id: string) => {
    setSelectedAnalyses((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const generateReport = async () => {
    if (selectedAnalyses.length === 0 && !customMessage.trim()) {
      setError(
        "Selecione ao menos um tipo de análise ou escreva uma mensagem.",
      );
      return;
    }
    setLoading(true);
    setReport(null);
    setStats(null);
    setError(null);
    setShowConfig(false);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyses: selectedAnalyses,
          customMessage,
          periodDays,
        }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setStats(data.stats ?? null);
        setGeneratedAt(new Date());
      } else {
        setError(data.error || "Erro ao gerar análise.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro na conexão com a API.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Exportar PDF ────────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!report || !stats) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = 0;

      // ── Função utilitária: nova página se necessário ─────────────────────
      const checkPage = (needed: number) => {
        if (y + needed > pageH - 20) {
          doc.addPage();
          y = 20;
        }
      };

      // ── 1. CAPA ──────────────────────────────────────────────────────────
      // Fundo gradiente simulado com retângulos
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, pageW, 60, "F");
      doc.setFillColor(49, 46, 129);
      doc.rect(0, 45, pageW, 15, "F");

      // Título
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text("GeoTask IA", margin, 26);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(165, 180, 252);
      doc.text("Análise Inteligente de Tarefas", margin, 34);

      // Linha decorativa
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.8);
      doc.line(margin, 40, pageW - margin, 40);

      // Metadados na capa
      const now = generatedAt || new Date();
      const dateStr = now.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.setFontSize(9);
      doc.setTextColor(199, 210, 254);
      doc.text(`Gerado em: ${dateStr} às ${timeStr}`, margin, 50);

      const analysisLabels = selectedAnalyses
        .map((a) => ANALYSIS_OPTIONS.find((o) => o.id === a)?.label || a)
        .join(", ");
      doc.text(`Período: últimos ${periodDays} dias`, margin, 55);

      y = 68;

      // Filtros aplicados
      if (analysisLabels) {
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(margin, y, contentW, 14, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text("ANÁLISES INCLUÍDAS:", margin + 4, y + 5.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        const wrappedLabel = doc.splitTextToSize(analysisLabels, contentW - 50);
        doc.text(wrappedLabel[0], margin + 42, y + 5.5);
        y += 18;
      }

      if (customMessage.trim()) {
        doc.setFillColor(254, 249, 195);
        doc.roundedRect(margin, y, contentW, 14, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(146, 64, 14);
        doc.text("SOLICITAÇÃO ESPECIAL:", margin + 4, y + 5.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        const wrapped = doc.splitTextToSize(
          customMessage.trim(),
          contentW - 52,
        );
        doc.text(wrapped[0], margin + 50, y + 5.5);
        y += 18;
      }

      y += 4;

      // ── 2. KPI CARDS ──────────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 27, 75);
      doc.text("📊 Indicadores do Período", margin, y);
      y += 6;

      const kpis = [
        { label: "Total", value: stats.total, r: 59, g: 130, b: 246 },
        { label: "Criadas", value: stats.created, r: 6, g: 182, b: 212 },
        { label: "Concluídas", value: stats.completed, r: 34, g: 197, b: 94 },
        { label: "Pendentes", value: stats.pending, r: 234, g: 179, b: 8 },
        { label: "Atrasadas", value: stats.overdue, r: 239, g: 68, b: 68 },
      ];

      const cardW = (contentW - 4 * 3) / 5;
      kpis.forEach((kpi, i) => {
        const cx = margin + i * (cardW + 3);
        // Card bg (light tint)
        doc.setFillColor(kpi.r, kpi.g, kpi.b);
        doc.roundedRect(cx, y, cardW, 22, 3, 3, "F");
        // Valor
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(String(kpi.value), cx + cardW / 2, y + 12, {
          align: "center",
        });
        // Label
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(255, 255, 255);
        doc.text(kpi.label, cx + cardW / 2, y + 19, { align: "center" });
      });
      y += 28;

      // ── 3. GRÁFICOS VIA CANVAS ────────────────────────────────────────────
      const drawCharts = async (): Promise<string[]> => {
        const images: string[] = [];

        // Gráfico de Barras — Por Status
        const statusEntries = Object.entries(stats.byStatus).sort(
          (a, b) => b[1] - a[1],
        );
        if (statusEntries.length > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = 520;
          canvas.height = 220;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const BAR_COLORS = [
            "#6366f1",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#ec4899",
            "#8b5cf6",
            "#06b6d4",
          ];
          const bMargin = { top: 30, right: 20, bottom: 50, left: 50 };
          const bW = canvas.width - bMargin.left - bMargin.right;
          const bH = canvas.height - bMargin.top - bMargin.bottom;
          const maxVal = Math.max(...statusEntries.map((e) => e[1]));
          const barW = Math.min(60, bW / statusEntries.length - 12);

          // Título
          ctx.fillStyle = "#1e1b4b";
          ctx.font = "bold 14px Arial";
          ctx.fillText("Tarefas por Status", bMargin.left, 20);

          // Eixo Y (grid lines)
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          for (let i = 0; i <= 4; i++) {
            const gy = bMargin.top + (bH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(bMargin.left, gy);
            ctx.lineTo(bMargin.left + bW, gy);
            ctx.stroke();
            const val = Math.round(maxVal * (1 - i / 4));
            ctx.fillStyle = "#94a3b8";
            ctx.font = "10px Arial";
            ctx.textAlign = "right";
            ctx.fillText(String(val), bMargin.left - 4, gy + 3);
          }

          // Barras
          const spacing = bW / statusEntries.length;
          statusEntries.forEach(([label, val], idx) => {
            const barH = maxVal > 0 ? (val / maxVal) * bH : 0;
            const bx = bMargin.left + idx * spacing + (spacing - barW) / 2;
            const by = bMargin.top + bH - barH;
            ctx.fillStyle = BAR_COLORS[idx % BAR_COLORS.length];
            const radius = 4;
            ctx.beginPath();
            ctx.moveTo(bx + radius, by);
            ctx.lineTo(bx + barW - radius, by);
            ctx.quadraticCurveTo(bx + barW, by, bx + barW, by + radius);
            ctx.lineTo(bx + barW, by + barH);
            ctx.lineTo(bx, by + barH);
            ctx.lineTo(bx, by + radius);
            ctx.quadraticCurveTo(bx, by, bx + radius, by);
            ctx.closePath();
            ctx.fill();
            // Valor no topo
            ctx.fillStyle = "#1e1b4b";
            ctx.font = "bold 11px Arial";
            ctx.textAlign = "center";
            ctx.fillText(String(val), bx + barW / 2, by - 4);
            // Label embaixo (rotacionado)
            ctx.save();
            ctx.translate(bx + barW / 2, bMargin.top + bH + 8);
            ctx.rotate(-Math.PI / 6);
            ctx.fillStyle = "#475569";
            ctx.font = "10px Arial";
            ctx.textAlign = "right";
            ctx.fillText(
              label.length > 12 ? label.slice(0, 12) + "…" : label,
              0,
              0,
            );
            ctx.restore();
          });

          images.push(canvas.toDataURL("image/png"));
        }

        // Gráfico de Pizza — Por Setor
        const sectorEntries = Object.entries(stats.bySector)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6);
        if (sectorEntries.length > 0) {
          const canvas2 = document.createElement("canvas");
          canvas2.width = 520;
          canvas2.height = 220;
          const ctx2 = canvas2.getContext("2d")!;
          ctx2.fillStyle = "#f8fafc";
          ctx2.fillRect(0, 0, canvas2.width, canvas2.height);

          const PIE_COLORS = [
            "#6366f1",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#ec4899",
            "#8b5cf6",
          ];
          const total = sectorEntries.reduce((s, [, v]) => s + v, 0);
          const cx2 = 110,
            cy2 = 120,
            radius2 = 85;

          ctx2.fillStyle = "#1e1b4b";
          ctx2.font = "bold 14px Arial";
          ctx2.fillText("Tarefas por Setor", 10, 20);

          let startAngle = -Math.PI / 2;
          sectorEntries.forEach(([, val], i) => {
            const slice = (val / total) * Math.PI * 2;
            ctx2.beginPath();
            ctx2.moveTo(cx2, cy2);
            ctx2.arc(cx2, cy2, radius2, startAngle, startAngle + slice);
            ctx2.closePath();
            ctx2.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
            ctx2.fill();
            ctx2.strokeStyle = "#fff";
            ctx2.lineWidth = 2;
            ctx2.stroke();
            startAngle += slice;
          });

          // Legenda
          let ly = 35;
          sectorEntries.forEach(([label, val], i) => {
            const pct = Math.round((val / total) * 100);
            ctx2.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
            ctx2.fillRect(230, ly - 9, 12, 12);
            ctx2.fillStyle = "#1e293b";
            ctx2.font = "11px Arial";
            const short = label.length > 18 ? label.slice(0, 18) + "…" : label;
            ctx2.fillText(`${short} — ${val} (${pct}%)`, 248, ly);
            ly += 20;
          });

          images.push(canvas2.toDataURL("image/png"));
        }

        return images;
      };

      const chartImages = await drawCharts();

      // Adicionar gráficos ao PDF (lado a lado se couber)
      if (chartImages.length > 0) {
        checkPage(75);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 27, 75);
        doc.text("📈 Gráficos", margin, y);
        y += 5;

        const chartH = 55;
        const chartW = chartImages.length === 2 ? (contentW - 4) / 2 : contentW;
        chartImages.forEach((img, i) => {
          const cx = margin + i * (chartW + 4);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(cx, y, chartW, chartH, 2, 2, "F");
          doc.addImage(img, "PNG", cx + 1, y + 1, chartW - 2, chartH - 2);
        });
        y += chartH + 8;
      }

      // ── 4. RELATÓRIO DA IA ────────────────────────────────────────────────
      checkPage(20);
      doc.setFillColor(30, 27, 75);
      doc.rect(margin, y, contentW, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("✨  Análise da GeoTask IA", margin + 4, y + 5.5);
      y += 12;

      // Renderizar o markdown como texto formatado
      const lines = report.split("\n");
      for (const line of lines) {
        if (line.trim() === "" || line.startsWith("---")) {
          y += 2;
          continue;
        }

        if (line.startsWith("# ")) {
          checkPage(12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(30, 27, 75);
          const txt = line.replace(/^#+\s/, "").replace(/\*\*|\*|`/g, "");
          const wrapped = doc.splitTextToSize(txt, contentW);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 6 + 3;
        } else if (line.startsWith("## ")) {
          checkPage(11);
          doc.setFillColor(237, 233, 254);
          doc.roundedRect(margin, y - 4, contentW, 9, 2, 2, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(79, 70, 229);
          const txt = line.replace(/^#+\s/, "").replace(/\*\*|\*|`/g, "");
          const wrapped = doc.splitTextToSize(txt, contentW - 4);
          doc.text(wrapped, margin + 3, y + 1);
          y += wrapped.length * 5.5 + 4;
        } else if (line.startsWith("### ")) {
          checkPage(9);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 27, 75);
          const txt = line.replace(/^#+\s/, "").replace(/\*\*|\*|`/g, "");
          const wrapped = doc.splitTextToSize(txt, contentW);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 5 + 2;
        } else if (line.match(/^[-*] /) || line.match(/^\d+\. /)) {
          checkPage(6);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          const txt = line
            .replace(/^[-*]\s/, "• ")
            .replace(/^\d+\.\s/, (m) => m)
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*|`/g, "");
          const wrapped = doc.splitTextToSize(txt, contentW - 6);
          doc.text(wrapped, margin + 4, y);
          y += wrapped.length * 4.8 + 1;
        } else if (line.startsWith("|")) {
          // Tabela — usar autoTable na próxima iteração (acumula linhas)
          // Simplificado: renderizar como texto
          const cells = line.split("|").filter((c) => c.trim());
          if (cells.length > 0 && !line.match(/^\|[-| :]+\|$/)) {
            checkPage(7);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            const cellW = contentW / cells.length;
            cells.forEach((cell, ci) => {
              const txt = cell.trim().replace(/\*\*|\*/g, "");
              doc.text(
                doc.splitTextToSize(txt, cellW - 2)[0],
                margin + ci * cellW,
                y,
              );
            });
            y += 5.5;
          }
        } else {
          checkPage(6);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          // Bold inline: **text** → negrito simulado
          const cleanLine = line
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*|`/g, "");
          const wrapped = doc.splitTextToSize(cleanLine, contentW);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 4.8 + 1;
        }
      }

      // ── 5. RODAPÉ EM TODAS AS PÁGINAS ─────────────────────────────────────
      const totalPages = (
        doc as unknown as { internal: { getNumberOfPages: () => number } }
      ).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(30, 27, 75);
        doc.rect(0, pageH - 10, pageW, 10, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(165, 180, 252);
        doc.text(
          `GeoTask IA  •  Gerado em ${dateStr} às ${timeStr}  •  Período: ${periodDays} dias`,
          margin,
          pageH - 3.5,
        );
        doc.text(`Página ${p}/${totalPages}`, pageW - margin, pageH - 3.5, {
          align: "right",
        });
      }

      // Salvar
      const filename = `GeoTask_IA_${now.toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  };

  const reset = () => {
    setReport(null);
    setStats(null);
    setError(null);
    setShowConfig(true);
    setCustomMessage("");
  };

  const copyToClipboard = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Botão trigger ──────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        id="ai-report-btn"
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background:
            "linear-gradient(135deg, #3b43af 0%, #6366f1 50%, #8b5cf6 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(-1px)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(0)")
        }
      >
        <Sparkles size={14} />
        Análise IA
      </button>
    );
  }

  // ─── Modal ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        id="ai-report-modal"
        style={{
          background: T.card,
          width: "100%",
          maxWidth: 760,
          maxHeight: "92vh",
          borderRadius: 20,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${T.border}`,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "16px 20px",
            background:
              "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                background: "rgba(99,102,241,0.3)",
                padding: 8,
                borderRadius: 10,
                border: "1px solid rgba(99,102,241,0.4)",
              }}
            >
              <Sparkles size={18} color="#a5b4fc" />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                GeoTask IA
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: "#a5b4fc" }}>
                • Análise e Relatório com IA •
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {report && (
              <button
                onClick={reset}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#c7d2fe",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Nova análise
              </button>
            )}
            <button
              id="ai-modal-close"
              onClick={() => {
                setIsOpen(false);
                reset();
              }}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                cursor: "pointer",
                color: "#a5b4fc",
                borderRadius: 8,
                padding: 6,
                display: "flex",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {/* === CONFIGURAÇÃO === */}
          {showConfig && !loading && (
            <div style={{ padding: "20px 24px" }}>
              {/* Período */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.sub,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Período de análise
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPeriodDays(d)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: `1.5px solid ${periodDays === d ? "#6366f1" : T.border}`,
                        background:
                          periodDays === d
                            ? "rgba(99,102,241,0.15)"
                            : "transparent",
                        color: periodDays === d ? "#6366f1" : T.sub,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {d} dias
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipos de análise */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.sub,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Tipos de análise
                </label>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {ANALYSIS_OPTIONS.map((opt) => {
                    const selected = selectedAnalyses.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        id={`analysis-opt-${opt.id}`}
                        onClick={() => toggleAnalysis(opt.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `1.5px solid ${selected ? "#6366f1" : T.border}`,
                          background: selected
                            ? "rgba(99,102,241,0.1)"
                            : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: selected
                              ? "rgba(99,102,241,0.2)"
                              : "rgba(0,0,0,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: selected ? "#6366f1" : T.sub,
                            flexShrink: 0,
                          }}
                        >
                          {opt.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: selected ? "#6366f1" : T.text,
                            }}
                          >
                            {opt.label}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11,
                              color: T.sub,
                              marginTop: 1,
                            }}
                          >
                            {opt.description}
                          </p>
                        </div>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            border: `2px solid ${selected ? "#6366f1" : T.border}`,
                            background: selected ? "#6366f1" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selected && <Check size={11} color="#fff" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mensagem customizada */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.sub,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <MessageSquare size={12} />
                  Solicitação especial (opcional)
                </label>
                <textarea
                  id="ai-custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Ex: "Quero uma análise especial sobre a não conclusão do contrato X" ou "Por que o setor Y está atrasado?"`}
                  rows={3}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: `1.5px solid ${customMessage ? "#6366f1" : T.border}`,
                    background: "transparent",
                    color: T.text,
                    fontSize: 13,
                    padding: "10px 14px",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={14} color="#ef4444" />
                  <span style={{ fontSize: 12, color: "#ef4444" }}>
                    {error}
                  </span>
                </div>
              )}

              <button
                id="ai-generate-btn"
                onClick={generateReport}
                disabled={
                  selectedAnalyses.length === 0 && !customMessage.trim()
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    selectedAnalyses.length === 0 && !customMessage.trim()
                      ? "rgba(99,102,241,0.3)"
                      : "linear-gradient(135deg, #3b43af 0%, #6366f1 50%, #8b5cf6 100%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor:
                    selectedAnalyses.length === 0 && !customMessage.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    selectedAnalyses.length === 0 && !customMessage.trim()
                      ? "none"
                      : "0 4px 15px rgba(99,102,241,0.4)",
                  transition: "all 0.2s",
                }}
              >
                <Send size={16} />
                Gerar Análise com IA
              </button>
            </div>
          )}

          {/* === CARREGANDO === */}
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 24px",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
              >
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: "#6366f1" }}
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: T.text,
                    margin: "0 0 6px",
                  }}
                >
                  GeoTask IA está analisando seus dados...
                </p>
                <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                  {selectedAnalyses.length} tipo(s) de análise selecionado(s)
                  {customMessage ? " + solicitação especial" : ""}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#6366f1",
                      opacity: 0.4,
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* === RESULTADO === */}
          {report && !loading && (
            <div>
              {/* Stats rápidos */}
              {stats && (
                <div
                  style={{
                    padding: "16px 24px",
                    background: "linear-gradient(135deg, #1e1b4b, #312e81)",
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <StatCard
                    label="Total"
                    value={stats.total}
                    color="#fff"
                    bg="rgba(255,255,255,0.1)"
                  />
                  <StatCard
                    label="Criadas"
                    value={stats.created}
                    color="#a5f3fc"
                    bg="rgba(6,182,212,0.2)"
                  />
                  <StatCard
                    label="Concluídas"
                    value={stats.completed}
                    color="#86efac"
                    bg="rgba(34,197,94,0.2)"
                  />
                  <StatCard
                    label="Pendentes"
                    value={stats.pending}
                    color="#fde68a"
                    bg="rgba(234,179,8,0.2)"
                  />
                  <StatCard
                    label="Atrasadas"
                    value={stats.overdue}
                    color="#fca5a5"
                    bg="rgba(239,68,68,0.2)"
                  />
                </div>
              )}

              {/* Relatório em markdown */}
              <div style={{ padding: "20px 24px" }}>
                <MarkdownRenderer text={report} color={T.text} />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer quando há relatório ── */}
        {report && !loading && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: T.bgBody,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, color: T.sub }}>
              Gerado por GeoTask IA
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                id="ai-nova-analise-footer"
                onClick={reset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  color: T.sub,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <ChevronUp size={13} />
                Configurar
              </button>
              <button
                id="ai-pdf-btn"
                onClick={exportToPDF}
                disabled={exportingPdf}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: exportingPdf
                    ? "rgba(239,68,68,0.05)"
                    : "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: exportingPdf ? "not-allowed" : "pointer",
                  opacity: exportingPdf ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {exportingPdf ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileDown size={13} />
                )}
                {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
              </button>
              <button
                id="ai-copy-btn"
                onClick={copyToClipboard}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: copied
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(99,102,241,0.1)",
                  color: copied ? "#10b981" : "#6366f1",
                  border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`,
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado!" : "Copiar relatório"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
