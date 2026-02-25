"use client";

import {
  AlertCircle,
  AlignLeft,
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit,
  Eye,
  FileText,
  Filter,
  Layers,
  LayoutDashboard,
  Link,
  LogOut,
  Map,
  MapPin,
  MessageSquare,
  Moon,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AIReportModal from "../components/AIReportModal";
import { exportToExcel, exportToPDF, getKpiData } from "../lib/exportUtils";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { DatePicker } from "./components/DatePicker";
import { SettingsPage } from "./components/SettingsPage";

const ExportButtons = ({ T, filtered, kpi, users, user, filterLabel }: any) => (
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <button
      onClick={() => exportToExcel(filtered, kpi, user, filterLabel)}
      style={{
        background: "#10b981",
        color: "white",
        border: "none",
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: "filter 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      <FileText size={13} /> EXCEL
    </button>
    <button
      onClick={() => exportToPDF(filtered, kpi, users, user, filterLabel)}
      style={{
        background: "#ef4444",
        color: "white",
        border: "none",
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: "filter 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      <FileText size={13} /> PDF
    </button>
  </div>
);

// ── DADOS ─────────────────────────────────────────────────────

const SECTORS = [
  "Administrativo",
  "Atendimento ao Cliente",
  "Atendimento Social",
  "Cadastro",
  "Controladoria",
  "Coordenação",
  "Engenharia",
  "Financeiro",
  "Gerência",
  "Reurb",
  "RH",
  "TI",
];

// Map Prisma enum value → SECTORS display name
const SECTOR_ENUM_TO_DISPLAY: Record<string, string> = {
  AtendimentoAoCliente: "Atendimento ao Cliente",
  AtendimentoSocial: "Atendimento Social",
  Administrativo: "Administrativo",
  Cadastro: "Cadastro",
  Engenharia: "Engenharia",
  Financeiro: "Financeiro",
  Reurb: "Reurb",
  RH: "RH",
  TI: "TI",
  Coordenacao: "Coordenação",
  Gerencia: "Gerência",
  Controladoria: "Controladoria",
};

// Returns the sector display name (for dropdowns) from either a display name or enum value
const sectorDisplay = (s: any) => {
  if (!s) return "";
  if (typeof s === "object") return s.name || s.id || "";
  return SECTOR_ENUM_TO_DISPLAY[s] ?? String(s);
};

const TASK_TYPES = [
  "Atendimento",
  "Demanda Extra",
  "Informação Adicional",
  "Meta Engenharia",
  "Nota Devolutiva",
  "Nova Tarefa",
  "Retrabalho",
  "Solicitação Externa",
  "Viagem",
  "Visita Social",
  "Vistoria",
];
const PRIORITIES = ["Alta", "Média", "Baixa"];

// USERS_DB is populated from /api/users at runtime; fallback seed for initial render

const STATUS_COLOR = {
  "A Fazer": "#6366f1",
  "Em Andamento": "#f59e0b",
  Pausado: "#ef4444",
  Concluído: "#10b981",
};
const PRIO_COLOR = { Alta: "#ef4444", Média: "#f59e0b", Baixa: "#10b981" };
const fmtTime = (m) => (m > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : "—");

// parse dd/mm/yyyy → Date for comparison
const parseDate = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split("/");
  if (!d || !m || !y) return null;
  return new Date(`${y}-${m}-${d}`);
};

/* Helper to convert string dd/mm/yyyy <-> Date */
const parseDateStr = (s?: string) => {
  if (!s) return undefined;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // Fallback for dd/mm/yyyy
  return parseDate(s) || undefined;
};

const getTaskState = (task: any) => {
  if (!task.deadline) return null;
  const deadlineDate = parseDateStr(task.deadline);
  if (!deadlineDate) return null;
  // Compare by date only or EOD
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
    return null;
  }
};

const theme = (d) =>
  d
    ? {
        bg: "#030712",
        sb: "#111827",
        card: "#1f2937",
        header: "#111827",
        text: "#f9fafb",
        sub: "#9ca3af",
        border: "#374151",
        inp: "#374151",
        hover: "rgba(255,255,255,0.05)",
        col: "#111827",
        tag: "#374151",
        tagText: "#d1d5db",
        mmBg: "#0f172a",
        section: "#111827",
      }
    : {
        bg: "#f8fafc",
        sb: "#ffffff",
        card: "#ffffff",
        header: "#ffffff",
        text: "#0f172a",
        sub: "#64748b",
        border: "#e2e8f0",
        inp: "#f1f5f9",
        hover: "#f1f5f9",
        col: "#f1f5f9",
        tag: "#e2e8f0",
        tagText: "#374151",
        mmBg: "#f1f5f9",
        section: "#ffffff",
      };

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "kanban", label: "Kanban", icon: Layers },
  { id: "cronograma", label: "Cronograma", icon: Clock },
  { id: "map", label: "Mapa", icon: Map },
  { id: "mindmap", label: "Mind Map", icon: FileText },
  { id: "notifications", label: "Notificações", icon: Bell },
];
// ── FORM HELPERS — definidos FORA dos componentes para evitar remount ──────
function FormField({ label, req = false, err = "", children }: any) {
  return (
    <div>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: err ? "#ef4444" : "#9ca3af",
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
        {req && <span style={{ color: "#ef4444" }}>*</span>}
        {err && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#ef4444",
              marginLeft: 4,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <AlertCircle size={10} />
            {err}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function FormSelect({
  T,
  val,
  onChange,
  opts,
  placeholder = "",
  err = "",
}: any) {
  return (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "9px 12px",
        borderRadius: 8,
        border: `1px solid ${err ? "#ef4444" : T.border}`,
        background: T.inp,
        color: val ? T.text : T.sub,
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
      }}
    >
      <option value="">{placeholder || "Selecionar..."}</option>
      {opts.map((o: any, i: number) => {
        const label = typeof o === "object" ? o.name || o.label : o;
        const value = typeof o === "object" ? o.id || o.value : o;
        const key =
          typeof o === "object"
            ? o.id || o.name || `opt-${i}`
            : `opt-${o}-${i}`;
        return (
          <option key={key} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

function FormInput({
  T,
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
}: any) {
  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
          }}
        >
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: icon ? "9px 12px 9px 30px" : "9px 12px",
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.inp,
          color: T.text,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function FormTextarea({ T, value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "9px 12px",
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.inp,
        color: T.text,
        fontSize: 13,
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
        fontFamily: "system-ui",
      }}
    />
  );
}

// ── NEW TASK MODAL ─────────────────────────────────────────────
// ── MULTI SELECT ───────────────────────────────────────────────
function MultiSelect({
  T,
  val = [],
  onChange,
  opts,
  placeholder = "",
}: {
  T: any;
  val: string[];
  onChange: (v: string[]) => void;
  opts: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (opt: string) => {
    if (val.includes(opt)) {
      onChange(val.filter((x) => x !== opt));
    } else {
      onChange([...val, opt]);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: `1px solid ${val.length > 0 ? "#98af3b" : T.border}`,
          background: T.card,
          color: val.length > 0 ? "#98af3b" : T.sub,
          fontSize: 12,
          cursor: "pointer",
          minWidth: 140,
          maxWidth: 200,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {val.length === 0
            ? placeholder
            : val.length === 1
              ? val[0]
              : `${val.length} selecionados`}
        </span>
        <ChevronDown size={14} />
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            zIndex: 9999,
            padding: 5,
            minWidth: 180,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {opts.map((o: any, i: number) => {
            const label = typeof o === "object" ? o.name || o.label : o;
            const value = typeof o === "object" ? o.id || o.value : o;
            const selected = val.includes(value);
            const key =
              typeof o === "object"
                ? o.id || o.name || `mopt-${i}`
                : `mopt-${o}-${i}`;

            return (
              <div
                key={key}
                onClick={() => toggle(value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  color: T.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: selected ? "#98af3b11" : "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = selected
                    ? "#98af3b22"
                    : T.sb)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = selected
                    ? "#98af3b11"
                    : "transparent")
                }
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: `1px solid ${selected ? "#98af3b" : T.sub}`,
                    background: selected ? "#98af3b" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected && <Check size={10} color="white" />}
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  T,
  val,
  onChange,
  opts,
  placeholder = "",
  label = "",
}: any) {
  return (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: `1px solid ${val ? "#98af3b" : T.border}`,
        background: T.card,
        color: val ? "#98af3b" : T.sub,
        fontSize: 12,
        outline: "none",
        cursor: "pointer",
        maxWidth: 170,
      }}
    >
      <option value="">{placeholder || label}</option>
      {opts.map((o: any, i: number) => {
        const label = typeof o === "object" ? o.name || o.label : o;
        const value = typeof o === "object" ? o.id || o.value : o;
        const key =
          typeof o === "object"
            ? o.id || o.name || `fopt-${i}`
            : `fopt-${o}-${i}`;
        return (
          <option key={key} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

function DateRangePicker({ date, setDate, label, T }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <DatePicker
            T={T}
            date={date?.from}
            setDate={(d) => setDate({ ...date, from: d })}
            label=""
          />
        </div>
        <div style={{ flex: 1 }}>
          <DatePicker
            T={T}
            date={date?.to}
            setDate={(d) => setDate({ ...date, to: d })}
            label=""
          />
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({
  T,
  onClose,
  onSave,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  templates = [],
  sectors = [],
}: any) {
  const empty = {
    title: "",
    description: "",
    priority: "Alta",
    type: "Vistoria",
    deadline: "",
    link: "",
    contract: "",
    city: "",
    nucleus: "",
    quadra: "",
    lote: "",
    sector: "",
    responsible: "",
    subtasks: [] as any[],
  };
  const [form, setForm] = useState<typeof empty & { subtasks: any[] }>(empty);
  const [step, setStep] = useState(0);
  const [subForm, setSubForm] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const applyTemplate = (tplId: string) => {
    setSelectedTemplate(tplId);
    if (!tplId) {
      setForm(empty);
      return;
    }
    const tpl = templates.find((t: any) => String(t.id) === tplId);
    if (!tpl) return;

    // TemplateTask has no sector in schema — only tpl.sector (template-level) is stored.
    const templateSectorObj =
      typeof tpl.sector === "object" ? tpl.sector : null;
    const templateSectorName = templateSectorObj
      ? templateSectorObj.name
      : tpl.sector;
    const templateSectorId = templateSectorObj
      ? templateSectorObj.id
      : tpl.sector_id;

    // First task title becomes the main task title; rest become subtasks
    const firstTask = tpl.tasks?.[0];
    const mainTitle = firstTask?.title || tpl.name;

    // Pre-fill responsible from users matching template sector (robust check)
    // Find the actual sector object from dbSectors if possible
    const foundSector = sectors.find(
      (s: any) =>
        String(s.id) === String(templateSectorId) ||
        String(s.name).toLowerCase().trim() ===
          String(templateSectorName).toLowerCase().trim(),
    );

    const responsible = foundSector
      ? users.find((u: any) => {
          const uSid = String(u.sector_id || u.sector?.id || "");
          const fSid = String(foundSector.id);
          const uSName = String(u.sector?.name || u.sector || "")
            .toLowerCase()
            .trim();
          const fSName = String(foundSector.name).toLowerCase().trim();
          return uSid === fSid || uSName === fSName;
        })?.name || ""
      : "";

    setForm((f) => ({
      ...f,
      title: mainTitle,
      sector: foundSector ? String(foundSector.id) : templateSectorName || "",
      responsible,
      subtasks: [
        // Include subtasks defined WITHIN the first task
        ...(firstTask?.subtasks || []).map((s: any) => {
          // Priority: subtask's own sector -> main task's sector
          const sVal =
            s.sector?.id || s.sector?.name || s.sector || s.sector_id;
          const fs = sectors.find(
            (sec: any) =>
              String(sec.id) === String(sVal) ||
              String(sec.name).toLowerCase().trim() ===
                String(sVal || "")
                  .toLowerCase()
                  .trim(),
          );

          // Priority: subtask's own responsible -> main task's responsible
          const sResp = s.responsible?.name || s.responsible || responsible;

          return {
            id: Date.now() + Math.random(),
            title: s.title,
            sector: fs
              ? String(fs.id)
              : sVal
                ? String(sVal)
                : foundSector?.id
                  ? String(foundSector.id)
                  : "",
            responsible: sResp,
          };
        }),
        // Include subsequent tasks as subtasks (legacy behavior)
        ...(tpl.tasks || []).slice(1).map((t: any) => ({
          id: Date.now() + Math.random(),
          title: t.title,
          sector: foundSector ? String(foundSector.id) : "",
          responsible,
        })),
      ],
    }));
  };

  const [dateVal, setDateVal] = useState<Date | undefined>(
    form.deadline ? new Date(form.deadline) : undefined,
  );

  useEffect(() => {
    if (dateVal) {
      // set form.deadline as ISO string to match DB expectation
      setForm((f) => ({ ...f, deadline: dateVal.toISOString() }));
    } else {
      setForm((f) => ({ ...f, deadline: "" }));
    }
  }, [dateVal]);

  const neighborhoods = form.city ? citiesNeighborhoods[form.city] || [] : [];
  const sectorUsers = useMemo(() => {
    if (!form.sector) return [];
    return users.filter((u: any) => {
      const uSName = String(u.sector?.name || u.sector || "")
        .toLowerCase()
        .trim();
      const fSName = String(form.sector).toLowerCase().trim();
      const uSid = String(u.sector_id || u.sector?.id || "");
      const fSid = String(form.sector);
      return uSName === fSName || uSid === fSid;
    });
  }, [form.sector, users]);

  const subSectorUsers = useMemo(() => {
    if (!subForm?.sector) return [];
    return users.filter((u: any) => {
      const uSName = String(u.sector?.name || u.sector || "")
        .toLowerCase()
        .trim();
      const fSName = String(subForm.sector).toLowerCase().trim();
      const uSid = String(u.sector_id || u.sector?.id || "");
      const fSid = String(subForm.sector);
      return uSName === fSName || uSid === fSid;
    });
  }, [subForm, users]);

  const STEPS = [
    "📋 Dados",
    "📍 Localidade",
    "👤 Responsável",
    "🔧 Subtarefas",
  ];

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) e.title = "Obrigatório";
      if (!form.priority) e.priority = "Obrigatório";
      if (!form.type) e.type = "Obrigatório";
    }
    if (step === 1) {
      if (!form.contract) e.contract = "Obrigatório";
    }
    if (step === 2) {
      if (!form.sector) e.sector = "Obrigatório";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (validate()) setStep((s) => Math.min(s + 1, 3));
  };
  const prev = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const addSub = () => {
    if (!subForm?.title?.trim() || !subForm?.sector) return;
    setForm((f) => ({
      ...f,
      subtasks: [
        ...f.subtasks,
        {
          id: Date.now(),
          title: subForm.title,
          description: subForm.description || "",
          sector: subForm.sector,
          responsible: subForm.responsible || "",
          done: false,
          priority: f.priority,
          type: f.type,
          deadline: f.deadline,
          contract: f.contract,
          city: f.city,
          nucleus: f.nucleus,
          quadra: f.quadra,
          lote: f.lote,
        },
      ],
    }));
    setSubForm(null);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 580,
          background: T.card,
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: T.text,
              }}
            >
              Nova Tarefa
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.sub }}>
              Passo {step + 1} de 4 — {STEPS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.inp,
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={16} color={T.sub} />
          </button>
        </div>

        {/* Template selector */}
        <div
          style={{
            padding: "10px 22px",
            borderBottom: `1px solid ${T.border}`,
            background: selectedTemplate ? "#98af3b11" : T.section,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.sub,
              whiteSpace: "nowrap",
            }}
          >
            📋 Usar template:
          </span>
          <select
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={templates.length === 0}
            style={{
              flex: 1,
              padding: "5px 10px",
              borderRadius: 7,
              border: `1px solid ${selectedTemplate ? "#98af3b" : T.border}`,
              background: T.card,
              color: selectedTemplate ? "#98af3b" : T.sub,
              fontSize: 12,
              outline: "none",
              cursor: templates.length === 0 ? "not-allowed" : "pointer",
              opacity: templates.length === 0 ? 0.6 : 1,
            }}
          >
            <option value="">
              {templates.length === 0
                ? "Nenhum template cadastrado — crie em Templates"
                : "Nenhum (formulário em branco)"}
            </option>
            {templates.map((tpl: any) => (
              <option key={tpl.id} value={String(tpl.id)}>
                {tpl.name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <button
              onClick={() => {
                setSelectedTemplate("");
                setForm(empty);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: T.sub,
              }}
            >
              ✕ Limpar
            </button>
          )}
        </div>

        {/* Step tabs */}
        <div
          style={{
            display: "flex",
            padding: "0 22px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}
        >
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                if (i < step) setStep(i);
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 11,
                fontWeight: 700,
                background: "none",
                border: "none",
                cursor: i <= step ? "pointer" : "default",
                color: i === step ? "#98af3b" : i < step ? "#10b981" : T.sub,
                borderBottom: `2px solid ${i === step ? "#98af3b" : i < step ? "#10b981" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              {i < step ? "✓ " : ""}
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {step === 0 && (
            <>
              <FormField label="Título da Tarefa" req err={errors.title}>
                <FormInput
                  T={T}
                  value={form.title}
                  onChange={(v) => set("title", v)}
                  placeholder="Ex: Vistoria de regularização"
                />
              </FormField>
              <FormField label="Descrição">
                <FormTextarea
                  T={T}
                  value={form.description}
                  onChange={(v) => set("description", v)}
                  placeholder="Descreva os detalhes da tarefa..."
                />
              </FormField>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <FormField label="Prioridade" req err={errors.priority}>
                  <FormSelect
                    T={T}
                    val={form.priority}
                    onChange={(v) => set("priority", v)}
                    opts={PRIORITIES}
                    err={errors.priority}
                  />
                </FormField>
                <FormField label="Tipo de Tarefa" req err={errors.type}>
                  <FormSelect
                    T={T}
                    val={form.type}
                    onChange={(v) => set("type", v)}
                    opts={TASK_TYPES}
                    err={errors.type}
                  />
                </FormField>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <FormField label="Prazo Limite" req>
                  <DatePicker
                    T={T}
                    date={dateVal}
                    setDate={setDateVal}
                    label=""
                    openDirection="up"
                  />
                </FormField>
                <FormField label="Link Externo">
                  <FormInput
                    T={T}
                    value={form.link}
                    onChange={(v) => set("link", v)}
                    placeholder="https://..."
                    icon={<Link size={13} color={T.sub} />}
                  />
                </FormField>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <FormField label="Contrato" req err={errors.contract}>
                <FormSelect
                  T={T}
                  val={form.contract}
                  onChange={(v) => set("contract", v)}
                  opts={contracts}
                  placeholder="Selecione o contrato..."
                  err={errors.contract}
                />
              </FormField>
              <FormField label="Cidade">
                <FormSelect
                  T={T}
                  val={form.city}
                  onChange={(v) => {
                    set("city", v);
                    set("nucleus", "");
                  }}
                  opts={Object.keys(citiesNeighborhoods).sort()}
                  placeholder="Selecione a cidade..."
                />
              </FormField>
              <FormField label="Bairro / Núcleo">
                <FormSelect
                  T={T}
                  val={form.nucleus}
                  onChange={(v) => set("nucleus", v)}
                  opts={neighborhoods}
                  placeholder={
                    form.city
                      ? "Selecione o bairro..."
                      : "Selecione uma cidade primeiro..."
                  }
                />
              </FormField>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <FormField label="Quadra">
                  <FormInput
                    T={T}
                    value={form.quadra}
                    onChange={(v) => set("quadra", v)}
                    placeholder="Ex: Q3"
                  />
                </FormField>
                <FormField label="Lote">
                  <FormInput
                    T={T}
                    value={form.lote}
                    onChange={(v) => set("lote", v)}
                    placeholder="Ex: L12"
                  />
                </FormField>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <FormField label="Setor" req err={errors.sector}>
                <FormSelect
                  T={T}
                  val={form.sector}
                  onChange={(v) => {
                    set("sector", v);
                    set("responsible", "");
                  }}
                  opts={sectors}
                  err={errors.sector}
                />
              </FormField>
              <FormField label="Usuário Responsável">
                <FormSelect
                  T={T}
                  val={form.responsible}
                  onChange={(v) => set("responsible", v)}
                  opts={sectorUsers.map((u) => u.name)}
                  placeholder={
                    form.sector
                      ? sectorUsers.length
                        ? "Selecione o responsável..."
                        : "Nenhum usuário neste setor"
                      : "Selecione um setor primeiro..."
                  }
                />
              </FormField>
              {form.sector && sectorUsers.length > 0 && (
                <div
                  style={{
                    background: T.section,
                    borderRadius: 10,
                    padding: 12,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.sub,
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Usuários do setor
                  </div>
                  {sectorUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => set("responsible", u.name)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: `1px solid ${form.responsible === u.name ? "#98af3b" : T.border}`,
                        background:
                          form.responsible === u.name ? "#98af3b11" : T.card,
                        transition: "all 0.15s",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: "#98af3b",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {typeof u.avatar === "string"
                          ? u.avatar
                          : u.name
                            ? u.name.charAt(0)
                            : "?"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: T.text,
                          }}
                        >
                          {u.name}
                        </div>
                        <div style={{ fontSize: 11, color: T.sub }}>
                          {typeof u.role === "object" ? u.role.name : u.role}
                        </div>
                      </div>
                      {form.responsible === u.name && (
                        <Check size={14} color="#98af3b" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div
                style={{
                  background: "#98af3b11",
                  border: "1px solid #98af3b33",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#98af3b",
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  ℹ️ Herança automática
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    ["Prioridade", form.priority || "—"],
                    ["Tipo", form.type || "—"],
                    ["Prazo", form.deadline || "—"],
                    ["Contrato", form.contract || "—"],
                    ["Cidade", form.city || "—"],
                    ["Bairro", form.nucleus || "—"],
                  ].map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        background: T.card,
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                      }}
                    >
                      {k}:{" "}
                      <b style={{ color: T.text }}>
                        {typeof v === "object"
                          ? (v as any).name || JSON.stringify(v)
                          : v}
                      </b>
                    </span>
                  ))}
                </div>
              </div>
              {form.subtasks.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    background: T.section,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#98af3b11",
                      border: "1px solid #98af3b33",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#98af3b",
                      }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                    >
                      {s.title}
                    </div>
                    <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
                      {(() => {
                        const sVal = s.sector;
                        const found = sectors.find(
                          (sec: any) =>
                            String(sec.id) === String(sVal) ||
                            String(sec.name).toLowerCase().trim() ===
                              String(sVal).toLowerCase().trim(),
                        );
                        return found
                          ? found.name
                          : typeof sVal === "object"
                            ? sVal.name
                            : sVal;
                      })()}
                      {s.responsible
                        ? ` · ${(() => {
                            const rVal = s.responsible;
                            const found = users.find(
                              (u: any) =>
                                String(u.id) === String(rVal) ||
                                String(u.name).toLowerCase().trim() ===
                                  String(rVal).toLowerCase().trim(),
                            );
                            return found ? found.name : rVal;
                          })()}`
                        : ""}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        subtasks: f.subtasks.filter((x) => x.id !== s.id),
                      }))
                    }
                    style={{
                      background: "#fef2f2",
                      border: "none",
                      borderRadius: 6,
                      padding: 5,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={12} color="#ef4444" />
                  </button>
                </div>
              ))}
              {subForm !== null ? (
                <div
                  style={{
                    background: T.section,
                    border: "1.5px solid #98af3b",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{ fontSize: 12, fontWeight: 700, color: "#98af3b" }}
                  >
                    Nova Subtarefa
                  </div>
                  <FormField label="Título" req>
                    <FormInput
                      T={T}
                      value={subForm.title || ""}
                      onChange={(v) => setSubForm((f) => ({ ...f, title: v }))}
                      placeholder="Título da subtarefa"
                    />
                  </FormField>
                  <FormField label="Descrição">
                    <FormTextarea
                      T={T}
                      value={subForm.description || ""}
                      onChange={(v) =>
                        setSubForm((f) => ({ ...f, description: v }))
                      }
                      rows={2}
                      placeholder="Descrição (opcional)"
                    />
                  </FormField>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <FormField label="Setor" req>
                      <FormSelect
                        T={T}
                        val={subForm.sector || ""}
                        onChange={(v) =>
                          setSubForm((f) => ({
                            ...f,
                            sector: v,
                            responsible: "",
                          }))
                        }
                        opts={sectors}
                      />
                    </FormField>
                    <FormField label="Responsável">
                      <FormSelect
                        T={T}
                        val={subForm.responsible || ""}
                        onChange={(v) =>
                          setSubForm((f) => ({ ...f, responsible: v }))
                        }
                        opts={subSectorUsers.map((u) => u.name)}
                        placeholder={
                          subForm?.sector
                            ? "Responsável..."
                            : "Setor primeiro..."
                        }
                      />
                    </FormField>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setSubForm(null)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        background: T.inp,
                        color: T.sub,
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addSub}
                      style={{
                        flex: 2,
                        padding: "8px",
                        background: "#98af3b",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Salvar Subtarefa
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() =>
                    setSubForm({
                      title: "",
                      description: "",
                      sector: "",
                      responsible: "",
                    })
                  }
                  style={{
                    padding: "10px",
                    background: "transparent",
                    border: "1.5px dashed #98af3b",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#98af3b",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#98af3b08")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Plus size={15} />
                  Adicionar Subtarefa
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {step > 0 && (
            <button
              onClick={prev}
              style={{
                padding: "9px 18px",
                background: T.inp,
                color: T.sub,
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ← Voltar
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              onClick={next}
              style={{
                padding: "9px 22px",
                background: "#98af3b",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Próximo →
            </button>
          ) : (
            <button
              onClick={() => {
                // Resolve IDs
                const respUser = users.find(
                  (u: any) => u.name === form.responsible,
                );
                const resolvedSubtasks = (form.subtasks || []).map((s: any) => {
                  const subUser = users.find(
                    (u: any) => u.name === s.responsible,
                  );
                  // Handle sector_id or sector name
                  const sId = !isNaN(Number(s.sector))
                    ? Number(s.sector)
                    : null;
                  return {
                    ...s,
                    responsible_id: subUser?.id ?? null,
                    sector_id: sId,
                    sector: sId ? undefined : s.sector,
                  };
                });

                const sectorId = !isNaN(Number(form.sector))
                  ? Number(form.sector)
                  : null;

                // Deadline validation
                if (form.deadline) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const deadlineDate = parseDateStr(form.deadline);
                  if (deadlineDate && deadlineDate < today) {
                    alert("O prazo não pode ser menor que hoje.");
                    return;
                  }
                }

                onSave({
                  ...form,
                  responsible_id: respUser?.id ?? null,
                  sector_id: sectorId,
                  sector: sectorId ? undefined : form.sector,
                  subtasks: resolvedSubtasks,
                  status: "A Fazer",
                });
                onClose();
              }}
              style={{
                padding: "9px 22px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={14} />
              Criar Tarefa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TASK DETAIL MODAL ──────────────────────────────────────────
function TaskModal({
  T,
  task: t,
  user,
  onClose,
  onUpdate,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  sectors = [],
  tasks = [],
  setSelectedTask,
}: any) {
  const sc = STATUS_COLOR[t.status];

  const [tab, setTab] = useState("dados");
  const [form, setForm] = useState({
    ...t,
    sector: t.sector?.name || t.sector || "",
  });
  const [saving, setSaving] = useState(false);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);

  // Subtasks State
  const [newSubtask, setNewSubtask] = useState({
    title: "",
    sector: t.sector?.name || t.sector || "",
    responsible_id: "",
    description: "",
  });
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredUsers = useMemo(() => {
    if (!form.sector) return [];
    return users.filter((u: any) => {
      const uSName = String(u.sector?.name || u.sector || "")
        .toLowerCase()
        .trim();
      const fSName = String(form.sector).toLowerCase().trim();
      const uSid = String(u.sector_id || u.sector?.id || "");
      const fSid = String(form.sector);
      return uSName === fSName || uSid === fSid;
    });
  }, [form.sector, users]);

  const subFilteredUsers = useMemo(() => {
    if (!newSubtask.sector) return [];
    return users.filter((u: any) => {
      const uSName = String(u.sector?.name || u.sector || "")
        .toLowerCase()
        .trim();
      const fSName = String(newSubtask.sector).toLowerCase().trim();
      const uSid = String(u.sector_id || u.sector?.id || "");
      const fSid = String(newSubtask.sector);
      return uSName === fSName || uSid === fSid;
    });
  }, [newSubtask.sector, users]);

  useEffect(() => {
    setForm({
      ...t,
      sector: t.sector?.name || t.sector || "",
    });
  }, [t]);

  useEffect(() => {
    if (tab === "comentarios") {
      fetch(`/api/comments?task_id=${t.id}`)
        .then((r) => r.json())
        .then((data) => setComments(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    if (tab === "historico") {
      setLoadingHistory(true);
      fetch(`/api/tasks/history?task_id=${t.id}`)
        .then((r) => r.json())
        .then((data) => setHistory(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [tab, t.id]);

  const handleAddSubtask = async () => {
    if (!newSubtask.title.trim() || !newSubtask.sector) {
      alert("Preencha Título e Setor.");
      return;
    }
    setCreatingSubtask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtask.title,
          description: newSubtask.description,
          status: "A Fazer",
          priority: form.priority || "Média",
          type: form.type || "Vistoria",
          deadline: form.deadline,
          sector: newSubtask.sector,
          contract: form.contract,
          city: form.city,
          nucleus: form.nucleus,
          quadra: form.quadra,
          lote: form.lote,
          parent_id: t.id,
          created_by: user?.id,
          responsible_id: newSubtask.responsible_id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSubtask({
          title: "",
          sector: t.sector?.name || t.sector || "",
          responsible_id: "",
          description: "",
        });

        const newChild = {
          id: data.id,
          title: newSubtask.title,
          status: "A Fazer",
          priority: t.priority || "Média",
          type: t.type || "Vistoria",
          deadline: t.deadline,
          sector: newSubtask.sector,
          responsible: newSubtask.responsible_id
            ? users.find((u: any) => u.id === Number(newSubtask.responsible_id))
            : null,
        };
        setForm((prev: any) => ({
          ...prev,
          subtasks: [...(prev.subtasks || []), newChild],
        }));

        // Notifica o dashboard para re-sincronizar a lista de tarefas
        // sem isso a subtarefa some ao fechar o modal
        if (onUpdate) {
          await onUpdate(t.id, "refresh", {});
        }
      } else {
        alert("Erro ao criar subtarefa");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao criar subtarefa");
    } finally {
      setCreatingSubtask(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onUpdate) {
        await onUpdate(t.id, "update_fields", form);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Permission Logic
  const canEdit = (field: string) => {
    // Admin, Gestor, Coordenador, Gerente can edit everything
    if (["Admin", "Gestor", "Coordenador", "Gerente"].includes(user.role?.name))
      return true;

    // Liderado/Others restrictions
    if (user.role?.name === "Liderado") {
      if (field === "status") return true;
      if (field === "subtasks") return true; // Can check subtasks
      return false;
    }
    return false;
  };

  // Mapping existing comment logic
  const handleCommentChange = (val: string) => {
    setCommentText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0) {
      const query = val.slice(lastAt + 1).toLowerCase();
      if (query.startsWith("#")) {
        const sectorQ = query.slice(1);
        const activeSectors = sectors.length > 0 ? sectors : SECTORS;
        const matches = activeSectors
          .filter((s: any) => {
            const name = typeof s === "string" ? s : s.name || "";
            return name.toLowerCase().startsWith(sectorQ);
          })
          .slice(0, 5);
        setMentionSuggestions(
          matches.map((s: any) => `#${typeof s === "string" ? s : s.name}`),
        );
      } else {
        const matches = users
          .filter((u) => u.name.toLowerCase().startsWith(query))
          .slice(0, 5);
        setMentionSuggestions(matches.map((u) => u.name));
      }
    } else {
      setMentionSuggestions([]);
    }
  };

  const insertMention = (suggestion: string) => {
    const lastAt = commentText.lastIndexOf("@");
    const before = commentText.slice(0, lastAt);
    setCommentText(`${before}@${suggestion} `);
    setMentionSuggestions([]);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: t.id,
          user_id: user?.id || null,
          user_name: user?.name || "Anônimo",
          user_avatar: user?.avatar || "?",
          content: commentText.trim(),
        }),
      });
      setCommentText("");
      setMentionSuggestions([]);
      const res = await fetch(`/api/comments?task_id=${t.id}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 600,
          background: T.card,
          borderRadius: 20,
          padding: 24,
          border: `1px solid ${T.border}`,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: sc + "22",
                  color: sc,
                }}
              >
                {t.status}
              </span>
              <span style={{ fontSize: 11, color: T.sub }}>ID: #{t.id}</span>
              {getTaskState(t) && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: getTaskState(t)!.color + "22",
                    color: getTaskState(t)!.color,
                    marginLeft: 8,
                  }}
                >
                  {getTaskState(t)!.label}
                </span>
              )}
            </div>
            <input
              value={form.title}
              disabled={!canEdit("title")}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: T.text,
                background: "transparent",
                border: "none",
                width: "100%",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.inp,
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              height: "fit-content",
            }}
          >
            <X size={16} color={T.sub} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: `1px solid ${T.border}`,
            marginBottom: 20,
          }}
        >
          {["dados", "subtarefas", "comentarios", "historico"].map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom:
                  tab === tb ? "2px solid #98af3b" : "2px solid transparent",
                color: tab === tb ? "#98af3b" : T.sub,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tb === "comentarios"
                ? "Comentários"
                : tb === "historico"
                  ? "Histórico"
                  : tb === "subtarefas"
                    ? "Subtarefas"
                    : "Dados Padrão"}
            </button>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 8,
            marginRight: -4,
          }}
        >
          {tab === "dados" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.sub,
                    marginBottom: 4,
                  }}
                >
                  DESCRIÇÃO
                </div>
                <textarea
                  value={form.description || ""}
                  disabled={!canEdit("description")}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: canEdit("description") ? T.inp : T.col,
                    color: T.text,
                    fontSize: 13,
                    resize: "none",
                  }}
                />
              </div>

              {[
                {
                  l: "Prioridade",
                  f: "priority",
                  o: ["Alta", "Média", "Baixa"],
                },
                { l: "Tipo", f: "type", o: TASK_TYPES },
                {
                  l: "Setor",
                  f: "sector",
                  o: sectors.map((s: any) =>
                    typeof s === "object" ? s.name : s,
                  ),
                },
                {
                  l: "Responsável",
                  f: "responsible_id",
                  o: filteredUsers.map((u: any) => ({
                    value: u.id,
                    label: u.name,
                  })),
                },
                { l: "Contrato", f: "contract", o: contracts },
                { l: "Cidade", f: "city", o: Object.keys(citiesNeighborhoods) },
                { l: "Núcleo/Bairro", f: "nucleus" },
                { l: "Quadra", f: "quadra" },
                { l: "Lote", f: "lote" },
                { l: "Prazo", f: "deadline", type: "date-picker" },
              ].map(({ l, f, o, type }) => {
                const disabled = !canEdit(
                  f === "responsible_id" ? "responsible" : f,
                );
                return (
                  <div key={f} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.sub,
                        marginBottom: 4,
                      }}
                    >
                      {l.toUpperCase()}
                    </div>
                    {o ? (
                      <select
                        value={form[f] || ""}
                        disabled={disabled}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm({ ...form, [f]: v });
                          if (f === "sector") {
                            setForm((prev) => ({
                              ...prev,
                              responsible_id: "",
                            }));
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                          background: disabled ? T.col : T.inp,
                          color: disabled ? T.sub : T.text,
                          fontSize: 13,
                          appearance: "none",
                        }}
                      >
                        <option value="">Selecione...</option>
                        {o.map((opt: any) => {
                          const val =
                            typeof opt === "object" && opt !== null
                              ? opt.value
                              : opt;
                          const lab =
                            typeof opt === "object" && opt !== null
                              ? opt.label
                              : opt;
                          return (
                            <option key={val} value={val}>
                              {lab}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div style={{ width: "100%" }}>
                        {type === "date-picker" ? (
                          <DatePicker
                            T={T}
                            date={parseDateStr(form[f])}
                            setDate={(d) =>
                              setForm({
                                ...form,
                                [f]: d ? d.toISOString() : "",
                              })
                            }
                            label=""
                            openDirection="up"
                          />
                        ) : (
                          <input
                            type={type || "text"}
                            value={form[f] || ""}
                            disabled={disabled}
                            onChange={(e) =>
                              setForm({ ...form, [f]: e.target.value })
                            }
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: `1px solid ${T.border}`,
                              background: disabled ? T.col : T.inp,
                              color: disabled ? T.sub : T.text,
                              fontSize: 13,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ gridColumn: "1 / -1", paddingTop: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#98af3b",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          )}

          {tab === "subtarefas" && (
            <div style={{ paddingBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.sub,
                    marginBottom: 8,
                  }}
                >
                  SUBTAREFAS ({(form.subtasks || []).length})
                </div>
                {(form.subtasks || []).length === 0 && (
                  <div
                    style={{ fontSize: 13, color: T.sub, fontStyle: "italic" }}
                  >
                    Nenhuma subtarefa.
                  </div>
                )}
                {(form.subtasks || []).map((child: any) => (
                  <div
                    key={child.id}
                    style={{
                      padding: "10px",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      marginBottom: 8,
                      background: T.card,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: T.text,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {child.title}
                        {getTaskState(child) && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: getTaskState(child)!.color + "22",
                              color: getTaskState(child)!.color,
                            }}
                          >
                            {getTaskState(child)!.label}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.sub,
                          display: "flex",
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <span>{child.status}</span>
                        <span>•</span>
                        <span>{child.priority}</span>
                        {child.responsible && (
                          <>
                            <span>•</span>
                            <span>{child.responsible.name || "Resp."}</span>
                          </>
                        )}
                        {child.sector && (
                          <>
                            <span>•</span>
                            <span>
                              {child.sector && typeof child.sector === "object"
                                ? child.sector.name
                                : child.sector || ""}
                            </span>
                          </>
                        )}
                        {child.created_by && (
                          <>
                            <span>•</span>
                            <span title="Criado por">
                              {typeof child.created_by === "object"
                                ? child.created_by.name
                                : child.created_by}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      title="Visualizar Tarefa"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        // Switch selected task to subtask
                        const fullTask = tasks.find(
                          (tk: any) => tk.id === child.id,
                        );
                        if (fullTask) {
                          setSelectedTask(fullTask);
                        } else {
                          // If not in main list (unlikely), use child as is
                          setSelectedTask(child);
                        }
                      }}
                    >
                      <Eye size={18} color={T.sub} />
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: T.col,
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#98af3b",
                    marginBottom: 8,
                  }}
                >
                  Nova Subtarefa
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <input
                    value={newSubtask.title}
                    onChange={(e) =>
                      setNewSubtask({ ...newSubtask, title: e.target.value })
                    }
                    placeholder="Título *"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: T.inp,
                      color: T.text,
                      fontSize: 13,
                    }}
                  />
                  <textarea
                    value={newSubtask.description}
                    onChange={(e) =>
                      setNewSubtask({
                        ...newSubtask,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descrição (opcional)"
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: T.inp,
                      color: T.text,
                      fontSize: 13,
                      resize: "none",
                    }}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <select
                      value={newSubtask.sector}
                      onChange={(e) =>
                        setNewSubtask({
                          ...newSubtask,
                          sector: e.target.value,
                          responsible_id: "",
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.inp,
                        color: T.text,
                        fontSize: 13,
                      }}
                    >
                      <option value="">Setor *</option>
                      {sectors.map((s: any) => {
                        const name = typeof s === "object" ? s.name : s;
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={newSubtask.responsible_id}
                      onChange={(e) =>
                        setNewSubtask({
                          ...newSubtask,
                          responsible_id: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.inp,
                        color: T.text,
                        fontSize: 13,
                      }}
                    >
                      <option value="">Responsável...</option>
                      {subFilteredUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() =>
                        setNewSubtask({
                          title: "",
                          sector: "",
                          responsible_id: "",
                          description: "",
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "8px",
                        background: "transparent",
                        color: T.sub,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddSubtask}
                      disabled={
                        creatingSubtask ||
                        !newSubtask.title ||
                        !newSubtask.sector
                      }
                      style={{
                        flex: 2,
                        padding: "8px",
                        background: "#98af3b",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity:
                          creatingSubtask ||
                          !newSubtask.title ||
                          !newSubtask.sector
                            ? 0.6
                            : 1,
                      }}
                    >
                      {creatingSubtask ? "Salvando..." : "Salvar Subtarefa"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "comentarios" && (
            <div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {comments.map((c: any) => (
                  <div
                    key={c.id}
                    style={{ background: T.col, borderRadius: 10, padding: 12 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "#98af3b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      >
                        {c.user_avatar || "?"}
                      </div>
                      <span
                        style={{ fontSize: 12, fontWeight: 600, color: T.text }}
                      >
                        {c.user_name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: T.sub,
                          marginLeft: "auto",
                        }}
                      >
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}
                    >
                      {c.content}
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div
                    style={{ textAlign: "center", color: T.sub, fontSize: 13 }}
                  >
                    Nenhum comentário.
                  </div>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <textarea
                  value={commentText}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitComment();
                    }
                  }}
                  placeholder="Escreva um comentário..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.inp,
                    color: T.text,
                    fontSize: 13,
                    resize: "none",
                  }}
                />
                {mentionSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      right: 0,
                      background: T.card,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                      zIndex: 200,
                      overflow: "hidden",
                    }}
                  >
                    {mentionSuggestions.map((s) => (
                      <button
                        key={s}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(s);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 12px",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          fontSize: 13,
                          color: T.text,
                          cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "historico" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  marginBottom: 20,
                  padding: 16,
                  background: T.col,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 40,
                    right: 40,
                    top: 24,
                    height: 2,
                    background: T.border,
                    zIndex: 0,
                  }}
                />
                {[
                  { label: "Criação", date: t.created },
                  { label: "Início", date: t.started },
                  { label: "Prazo", date: t.deadline },
                  { label: "Conclusão", date: t.completed },
                ]
                  .filter((e) => e.date)
                  .map((evt: any, idx) => (
                    <div
                      key={idx}
                      style={{
                        zIndex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#98af3b",
                          boxShadow: `0 0 0 4px ${T.card}`,
                        }}
                      />
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.sub,
                            textTransform: "uppercase",
                          }}
                        >
                          {evt.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: T.text,
                          }}
                        >
                          {evt.date}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {loadingHistory && (
                <div
                  style={{ textAlign: "center", color: T.sub, fontSize: 12 }}
                >
                  Carregando...
                </div>
              )}
              {!loadingHistory && history.length === 0 && (
                <div
                  style={{ textAlign: "center", color: T.sub, fontSize: 13 }}
                >
                  Nenhum histórico registrado.
                </div>
              )}
              {history.map((h: any) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    paddingBottom: 12,
                    borderBottom: `1px dashed ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      marginTop: 2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#98af3b",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: T.text }}>
                      <span style={{ fontWeight: 600 }}>
                        {h.user?.name || "Sistema"}
                      </span>{" "}
                      alterou <b>{h.field}</b>
                    </div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>
                      <span
                        style={{ textDecoration: "line-through", opacity: 0.7 }}
                      >
                        {h.old_value || "(vazio)"}
                      </span>
                      {" ➝ "}
                      <span style={{ color: "#98af3b", fontWeight: 600 }}>
                        {h.new_value || "(vazio)"}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {["Admin", "Gestor", "Liderado", "Gerente", "Coordenador"].includes(
          user.role?.name,
        ) && (
          <div
            style={{
              marginTop: 20,
              borderTop: `1px solid ${T.border}`,
              paddingTop: 16,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {t.status === "A Fazer" &&
              ((form.subtasks || []).length === 0 ? (
                <button
                  onClick={() => {
                    onUpdate(t.id, "update_status", { status: "Em Andamento" });
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Play size={14} /> Iniciar
                </button>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: T.sub,
                    fontStyle: "italic",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Inicie pelas subtarefas
                </div>
              ))}
            {t.status === "Em Andamento" && (
              <button
                onClick={() => {
                  onUpdate(t.id, "update_status", { status: "Pausado" });
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  background: "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Pause size={14} /> Pausar
              </button>
            )}
            {t.status === "Pausado" && (
              <button
                onClick={() => {
                  onUpdate(t.id, "update_status", { status: "Em Andamento" });
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  background: "#98af3b",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Play size={14} /> Retomar
              </button>
            )}
            {["Em Andamento", "Pausado"].includes(t.status) &&
              ((form.subtasks || []).length === 0 ? (
                <button
                  onClick={() => {
                    onUpdate(t.id, "update_status", { status: "Concluído" });
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <CheckCircle size={14} /> Concluir
                </button>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: T.sub,
                    fontStyle: "italic",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Conclua todas as subtarefas
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────
export default function GeoTask() {
  const [dbSectors, setDbSectors] = useState<any[]>([]); // Array of {id, name}

  const mergedSectors = useMemo(() => {
    const combined = [...dbSectors];
    SECTORS.forEach((s) => {
      if (
        !combined.some(
          (ds) =>
            (ds.name || ds).toLowerCase().trim() === s.toLowerCase().trim(),
        )
      ) {
        combined.push({ id: s, name: s });
      }
    });
    return combined.sort((a, b) => {
      const nameA = String(a.name || a);
      const nameB = String(b.name || b);
      return nameA.localeCompare(nameB);
    });
  }, [dbSectors]);

  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState("dashboard");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [settingsTab, setSettingsTab] = useState("users");
  const [showMustChangePassword, setShowMustChangePassword] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  // Lookups state
  const [contracts, setContracts] = useState<string[]>([]);

  const [citiesNeighborhoods, setCitiesNeighborhoods] = useState<
    Record<string, string[]>
  >({});

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      const isEdit = !!templateData.id;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch("/api/templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...templateData,
          created_by: user?.id,
        }),
      });

      if (res.ok) {
        fetchTemplates();
        setShowTemplateModal(false);
        setEditingTemplate(null);
        if (isEdit && activeTemplate?.id === templateData.id) {
          // Refresh active template if needed, or fetchTemplates will handle it if we reset active
          // Ideally we update activeTemplate with new data or clear it
          setActiveTemplate(null);
        }
      } else {
        alert("Erro ao salvar template");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar template");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    try {
      await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      fetchTemplates();
      if (activeTemplate?.id === id) setActiveTemplate(null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const T = theme(dark);

  // Carregar tarefas da API
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar usuários da API
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setDbUsers(data);
      }
    } catch (e) {
      console.error("Erro ao buscar usuários:", e);
    }
  };

  // Carregar templates da API

  // Carregar notificações da API
  const fetchNotifications = async (userId: number) => {
    try {
      const res = await fetch(`/api/notifications?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      console.error("Erro ao buscar notificações:", e);
    }
  };

  // Carregar lookups
  const fetchLookups = async () => {
    try {
      const res = await fetch("/api/lookups");
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
        setDbSectors(data.sectors || []);
        setCitiesNeighborhoods(data.cities_neighborhoods || {});
      }
    } catch (error) {
      console.error("Erro ao buscar lookups:", error);
    }
  };

  const markNotifRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllNotifsRead = async () => {
    if (!user) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, mark_all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const router = useRouter();

  useEffect(() => {
    fetchUsers();
    fetchLookups();

    // Restore session with validation
    const restoreSession = async () => {
      const saved = localStorage.getItem("geotask_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.id) {
            // Verify against backend
            const res = await fetch("/api/auth/me", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: parsed.id }),
            });

            if (res.ok) {
              const refreshedUser = await res.json();
              setUser(refreshedUser);
              localStorage.setItem(
                "geotask_user",
                JSON.stringify(refreshedUser),
              );
              // Liderado doesn't have access to Dashboard — start on Kanban
              if (refreshedUser?.role?.name === "Liderado") {
                setPage("kanban");
              }
              setLoading(false);
            } else {
              // Invalid session (user deleted, inactive, or db reset)
              console.warn("Session invalid, clearing storage.");
              localStorage.removeItem("geotask_user");
              setUser(null);
              router.push("/login");
            }
          } else {
            localStorage.removeItem("geotask_user");
            setUser(null);
            router.push("/login");
          }
        } catch (e) {
          console.error("Error restoring session:", e);
          localStorage.removeItem("geotask_user");
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchTemplates();
      fetchNotifications(user.id);
      // Show mandatory password change if needed
      if (user.must_change_password) {
        setShowMustChangePassword(true);
      }
      // Poll notifications every 30s
      const interval = setInterval(() => fetchNotifications(user.id), 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Criar tarefa
  const handleCreateTask = async (newTask) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, created_by: user?.id }),
      });
      if (res.ok) {
        setShowNewTask(false);
        fetchTasks(); // Recarrega
      } else {
        alert("Erro ao criar tarefa");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao criar tarefa");
    }
  };

  // Atualizar tarefa (status, etc)
  const handleUpdateTask = async (id, action, data = {}) => {
    try {
      // Ação especial de refresh: só sincroniza o estado, sem chamar a API
      // Usada após criar subtarefas para que o dashboard atualize sem fechar o modal
      if (action === "refresh") {
        await fetchTasks();
        return;
      }

      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, user_id: user?.id, ...data }),
      });

      if (res.ok) {
        fetchTasks();
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const canAccess = (p) => {
    if (!user) return false;
    if (p === "templates" && user.role?.name === "Liderado") return false;
    // Settings access allowed for all (controlled inside component)
    return true;
  };
  const canCreate =
    user &&
    ["Admin", "Gerente", "Gestor", "Coordenador"].includes(user.role?.name);

  // Task visibility based on role:
  // - Liderado: only their assigned tasks
  // - Gestor: only tasks from their own sector
  // - Others (Admin, Gerente, Coordenador): all tasks
  const isLiderado = user?.role?.name === "Liderado";
  const isGestor = user?.role?.name === "Gestor";
  const userSectorId = user?.sector?.id || user?.sector_id;
  const userSectorName = user?.sector?.name || user?.sector;

  const visibleTasks = (() => {
    if (isLiderado) {
      return tasks.filter(
        (t: any) =>
          t.responsible_id === user.id ||
          t.responsible?.id === user.id ||
          (t.subtasks || []).some(
            (s: any) =>
              s.responsible_id === user.id || s.responsible?.id === user.id,
          ),
      );
    }
    if (isGestor) {
      return tasks.filter((t: any) => {
        const tSectorId = t.sector_id || t.sector?.id;
        const tSectorName =
          typeof t.sector === "string" ? t.sector : t.sector?.name;
        // Match by sector id or sector name
        if (userSectorId && tSectorId) return tSectorId === userSectorId;
        if (userSectorName && tSectorName)
          return tSectorName.toLowerCase() === userSectorName.toLowerCase();
        return false;
      });
    }
    return tasks;
  })();

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: dark ? "#030712" : "#f8fafc",
          color: dark ? "#f9fafb" : "#0f172a",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!user && !loading) {
    return null; // Should have redirected
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "kanban", label: "Quadro de Tarefas", icon: Layers },
    { id: "cronograma", label: "Cronograma", icon: Calendar },
    { id: "mindmap", label: "Mapa de Tarefas", icon: FileText },
    { id: "notifications", label: "Notificações", icon: Bell },
    ...(canAccess("templates")
      ? [{ id: "templates", label: "Templates", icon: FileText }]
      : []),
    ...(canAccess("settings")
      ? [{ id: "settings", label: "Configurações", icon: Settings }]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div
        style={{
          width: sidebarOpen ? 220 : 60,
          flexShrink: 0,
          background: T.sb,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s",
        }}
      >
        <div
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: sidebarOpen ? "0 16px" : "0",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {sidebarOpen ? (
            <img
              src="/logo.png"
              alt="GeoTask"
              style={{ maxHeight: 32, maxWidth: 160, objectFit: "contain" }}
            />
          ) : (
            <img
              src="/logoicone.png"
              alt="G"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
          )}
          <span style={{ display: "none" }}>GeoTask</span>
        </div>
        <nav
          style={{
            flex: 1,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {navItems
            .filter(({ id }) => {
              const roleName = user?.role?.name || "";
              const rolePerms: any = user?.role?.permissions || {};
              // Settings: visible to all logged-in users (SettingsPage shows only Minha Conta tab for non-Admins)
              if (id === "settings") return !!user;
              // Dashboard: hidden for Liderado (perm = none or role = Liderado)
              if (id === "dashboard") {
                if (roleName === "Liderado") return false;
                if (rolePerms["Dashboard"] === "none") return false;
              }
              // Templates: hidden for Liderado
              if (id === "templates") {
                if (roleName === "Liderado") return false;
                if (rolePerms["Templates"] === "none") return false;
              }
              return true;
            })
            .map(({ id, label, icon: Icon }) => {
              const active = page === id;
              return (
                <button
                  key={id}
                  onClick={() => setPage(id)}
                  title={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: sidebarOpen ? "10px 12px" : "10px",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    borderRadius: 10,
                    border: "none",
                    background: active ? "#98af3b" : "transparent",
                    color: active ? "white" : T.sub,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={17} />
                    {id === "notifications" && unreadCount > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          background: "#ef4444",
                          color: "white",
                          fontSize: 9,
                          fontWeight: 700,
                          minWidth: 15,
                          height: 15,
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 3px",
                          border: `2px solid ${active ? "#98af3b" : T.sb}`,
                        }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </div>
                    )}
                  </div>
                  {sidebarOpen && <span>{label}</span>}
                </button>
              );
            })}
        </nav>
        <div style={{ padding: 10, borderTop: `1px solid ${T.border}` }}>
          {sidebarOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#98af3b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {user.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name}
                </div>
                <div style={{ fontSize: 11, color: T.sub }}>
                  {user.role?.name || "Sem cargo"}
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("geotask_user");
                  router.push("/login");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                <LogOut size={14} color={T.sub} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#98af3b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {user.avatar}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: 60,
            background: T.header,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: T.inp,
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <AlignLeft size={16} color={T.sub} />
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: T.inp,
              borderRadius: 10,
              padding: "6px 12px",
              flex: "0 0 220px",
            }}
          >
            <Search size={13} color={T.sub} />
            <input
              placeholder="Buscar tarefas..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 13,
                color: T.text,
                width: "100%",
              }}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setDark(!dark)}
            style={{
              background: T.inp,
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              display: "flex",
            }}
          >
            {dark ? (
              <Sun size={16} color={T.sub} />
            ) : (
              <Moon size={16} color={T.sub} />
            )}
          </button>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              style={{
                background: T.inp,
                border: "none",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
                display: "flex",
                position: "relative",
              }}
            >
              <Bell size={16} color={T.sub} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    background: "#ef4444",
                    borderRadius: "50%",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 2px",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifPopover && (
              <div
                style={{
                  position: "absolute",
                  top: 40,
                  right: 0,
                  width: 340,
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: T.text }}
                  >
                    Notificações {unreadCount > 0 && `(${unreadCount} novas)`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotifsRead}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 11,
                        color: "#98af3b",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        fontSize: 13,
                        color: T.sub,
                      }}
                    >
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markNotifRead(n.id);
                          if (n.task_id) {
                            const t = tasks.find(
                              (tk: any) => tk.id === n.task_id,
                            );
                            if (t) setSelectedTask(t);
                          }
                          setShowNotifPopover(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          borderBottom: `1px solid ${T.border}`,
                          cursor: "pointer",
                          background: n.read
                            ? "transparent"
                            : dark
                              ? "rgba(79,70,229,0.08)"
                              : "#ede9fe",
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = T.hover)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = n.read
                            ? "transparent"
                            : dark
                              ? "rgba(79,70,229,0.08)"
                              : "#ede9fe")
                        }
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: n.read ? T.border : "#98af3b",
                            flexShrink: 0,
                            marginTop: 5,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: T.text,
                              marginBottom: 2,
                            }}
                          >
                            {n.title}
                          </div>
                          {n.message && (
                            <div
                              style={{
                                fontSize: 11,
                                color: T.sub,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {n.message}
                            </div>
                          )}
                          <div
                            style={{ fontSize: 10, color: T.sub, marginTop: 3 }}
                          >
                            {new Date(n.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      setPage("notifications");
                      setShowNotifPopover(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: T.inp,
                      border: "none",
                      borderTop: `1px solid ${T.border}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#98af3b",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    Ver todas
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {page === "dashboard" && (
            <DashboardPage
              T={T}
              tasks={visibleTasks}
              user={user}
              onSelect={setSelectedTask}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={mergedSectors}
            />
          )}
          {page === "kanban" && (
            <KanbanPage
              T={T}
              tasks={visibleTasks}
              user={user}
              onSelect={setSelectedTask}
              canCreate={canCreate}
              onNew={() => setShowNewTask(true)}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={mergedSectors}
            />
          )}
          {page === "map" && (
            <div style={{ flex: 1, height: "100%", background: T.bg }}>
              {/* 
                 The Map component seems to be missing in this monolithic file or not imported.
                 However, usually 'Map' id refers to the interactive map.
                 Searching for where Map was previously rendered or if it should be an iframe.
               */}
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.sub,
                }}
              >
                Interface do Mapa em desenvolvimento ou componente não
                encontrado.
              </div>
            </div>
          )}
          {page === "mindmap" && (
            <MindMapPage T={T} tasks={visibleTasks} users={dbUsers} />
          )}
          {page === "cronograma" && (
            <CronogramaPage
              T={T}
              tasks={visibleTasks}
              onSelect={setSelectedTask}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={mergedSectors}
            />
          )}
          {page === "templates" && canAccess("templates") && (
            <TemplatesPage
              T={T}
              active={activeTemplate}
              setActive={setActiveTemplate}
              templates={templates}
              onCreate={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              onEdit={(tpl: any) => {
                setEditingTemplate(tpl);
                setShowTemplateModal(true);
              }}
              onDelete={handleDeleteTemplate}
            />
          )}
          {page === "settings" && canAccess("settings") && (
            <SettingsPage
              T={T}
              tab={settingsTab}
              setTab={setSettingsTab}
              currentUser={user}
            />
          )}

          {page === "notifications" && (
            <div style={{ flex: 1, padding: 30, overflowY: "auto" }}>
              <div
                style={{
                  background: T.card,
                  borderRadius: 16,
                  border: `1px solid ${T.border}`,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: T.text,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Bell size={24} color="#98af3b" /> Central de Notificações
                  </h2>
                  <button
                    onClick={markAllNotifsRead}
                    style={{
                      fontSize: 13,
                      color: "#98af3b",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Marcar todas como lidas
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div
                    style={{ padding: 40, textAlign: "center", color: T.sub }}
                  >
                    Nenhuma notificação encontrada.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: "16px",
                          borderBottom: `1px solid ${T.border}`,
                          background: n.read
                            ? "transparent"
                            : dark
                              ? "rgba(79, 70, 229, 0.1)"
                              : "#eff6ff",
                          display: "flex",
                          gap: 16,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: T.inp,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {n.type === "mention" && (
                            <MessageSquare size={16} color="#3b82f6" />
                          )}
                          {n.type === "task_assigned" && (
                            <Briefcase size={16} color="#f59e0b" />
                          )}
                          {n.type === "task_completed" && (
                            <CheckCircle size={16} color="#10b981" />
                          )}
                          {n.type === "task_late" && (
                            <Clock size={16} color="#ef4444" />
                          )}
                          {![
                            "mention",
                            "task_assigned",
                            "task_completed",
                            "task_late",
                          ].includes(n.type) && (
                            <Bell size={16} color={T.sub} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: n.read ? 400 : 700,
                              color: T.text,
                              marginBottom: 4,
                            }}
                          >
                            {n.title}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: T.sub,
                              marginBottom: 6,
                            }}
                          >
                            {n.message}
                          </div>
                          <div
                            style={{ fontSize: 11, color: T.sub, opacity: 0.8 }}
                          >
                            {new Date(n.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        {n.task_id && (
                          <button
                            onClick={() => {
                              markNotifRead(n.id);
                              // Open task helper
                              const taskToOpen = tasks.find(
                                (t) => t.id === n.task_id,
                              );
                              if (taskToOpen) {
                                setSelectedTask(taskToOpen);
                                // Switch to relevant page? Dashboard usually fine
                              } else {
                                alert(
                                  "Tarefa não encontrada na listagem atual.",
                                );
                              }
                            }}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              background: T.inp,
                              color: T.text,
                              border: `1px solid ${T.border}`,
                              fontSize: 12,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Eye size={14} /> Ver
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          T={T}
          task={selectedTask}
          user={user}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          users={dbUsers}
          contracts={contracts}
          citiesNeighborhoods={citiesNeighborhoods}
          tasks={tasks}
          setSelectedTask={setSelectedTask}
          sectors={mergedSectors}
        />
      )}
      {showNewTask && (
        <NewTaskModal
          T={T}
          onClose={() => setShowNewTask(false)}
          onSave={handleCreateTask}
          users={dbUsers}
          contracts={contracts}
          citiesNeighborhoods={citiesNeighborhoods}
          templates={templates}
          sectors={mergedSectors}
        />
      )}

      {/* Mandatory password change modal for first login */}
      {showMustChangePassword && user && (
        <ChangePasswordModal
          isOpen={showMustChangePassword}
          onClose={() => {
            setShowMustChangePassword(false);
            // Clear must_change_password from local user state so it doesn't re-trigger
            setUser((prev: any) => ({ ...prev, must_change_password: false }));
            localStorage.setItem(
              "geotask_user",
              JSON.stringify({ ...user, must_change_password: false }),
            );
          }}
          userId={user.id}
          userName={user.name}
          T={T}
          isAdmin={false}
          isMandatory={true}
        />
      )}

      {showTemplateModal && (
        <TemplateModal
          T={T}
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
          sectors={mergedSectors.map((s) => s.name)}
        />
      )}
    </div>
  );
}

const TODAY = new Date();

function DashboardPage({
  T,
  tasks,
  user,
  onSelect,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  sectors = [],
}: any) {
  const [fSearch, setFSearch] = useState("");
  const [fContract, setFContract] = useState("");
  const [fCity, setFCity] = useState("");
  const [fNeighbor, setFNeighbor] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fType, setFType] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fSector, setFSector] = useState<string[]>([]);
  const [fUser, setFUser] = useState("");
  const [fDateFrom, setFDateFrom] = useState<DateRange | undefined>(undefined); // Prazo
  const [fDateTo, setFDateTo] = useState<DateRange | undefined>(undefined); // Criação
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cityNeighborhoods = fCity ? citiesNeighborhoods[fCity] || [] : [];

  const filtered = tasks.filter((t) => {
    const txt = (fSearch || "").toLowerCase();
    if (
      txt &&
      !t.title.toLowerCase().includes(txt) &&
      !(t.description || "").toLowerCase().includes(txt)
    )
      return false;
    if (fContract && t.contract !== fContract) return false;
    if (fCity && t.city !== fCity) return false;
    if (fNeighbor && t.nucleus !== fNeighbor) return false;
    if (fStatus && t.status !== fStatus) return false;
    if (fType && t.type !== fType) return false;
    if (fPriority && t.priority !== fPriority) return false;
    const sectorVal =
      t.sector && typeof t.sector === "object"
        ? t.sector?.name
        : t.sector || "";
    if (fSector.length > 0 && !fSector.includes(sectorVal)) return false;
    if (
      fUser &&
      (typeof t.responsible === "object"
        ? t.responsible?.name
        : t.responsible) !== fUser
    )
      return false;
    if (fDateFrom?.from || fDateFrom?.to) {
      const td = parseDate(t.deadline);
      if (!td) return false;
      if (fDateFrom.from && td < fDateFrom.from) return false;
      if (fDateFrom.to && td > fDateFrom.to) return false;
    }
    if (fDateTo?.from || fDateTo?.to) {
      const tc = new Date(t.created_at);
      if (fDateTo.from && tc < fDateTo.from) return false;
      if (fDateTo.to && tc > fDateTo.to) return false;
    }
    return true;
  });

  const totalActiveFilters = [
    fContract,
    fCity,
    fNeighbor,
    fStatus,
    fType,
    fPriority,
    fSector.length > 0,
    fUser,
    fDateFrom?.from || fDateFrom?.to,
    fDateTo?.from || fDateTo?.to,
  ].filter(Boolean).length;

  const activeAdvancedFilters = [
    fContract,
    fCity,
    fNeighbor,
    fType,
    fUser,
    fDateFrom?.from || fDateFrom?.to,
    fDateTo?.from || fDateTo?.to,
  ].filter(Boolean).length;

  const clearAll = () => {
    setFSearch("");
    setFContract("");
    setFCity("");
    setFNeighbor("");
    setFStatus("");
    setFType("");
    setFPriority("");
    setFSector([]);
    setFUser("");
    setFDateFrom(undefined);
    setFDateTo(undefined);
  };

  // KPIs
  const total = filtered.length;
  const concluded = filtered.filter((t) => t.status === "Concluído");
  const concludedForAvg = concluded.filter(
    (t) => !t.subtasks || t.subtasks.length === 0,
  );
  const avgTime = concludedForAvg.length
    ? Math.round(
        concludedForAvg.reduce((a, t) => a + t.time, 0) /
          concludedForAvg.length,
      )
    : 0;
  const byType = TASK_TYPES.map((tp) => ({
    name: tp,
    val: filtered.filter((t) => t.type === tp).length,
  })).filter((x) => x.val > 0);
  const byPriority = PRIORITIES.map((p) => ({
    name: p,
    val: filtered.filter((t) => t.priority === p).length,
    color: PRIO_COLOR[p],
  }));

  // Gráficos
  const pieData = ["A Fazer", "Em Andamento", "Pausado", "Concluído"]
    .map((s) => ({
      name: s,
      value: filtered.filter((t) => t.status === s).length,
    }))
    .filter((d) => d.value > 0);
  const sectorData = SECTORS.map((s) => ({
    name: s,
    v: filtered.filter(
      (t) =>
        (t.sector && typeof t.sector === "object"
          ? t.sector.name
          : t.sector || "") === s,
    ).length,
  }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const sectorRank = SECTORS.map((s) => ({
    name: s,
    v: filtered.filter(
      (t) =>
        (t.sector && typeof t.sector === "object"
          ? t.sector.name
          : t.sector || "") === s && t.status === "Concluído",
    ).length,
  }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const userRank = users
    .map((u) => ({
      name: u.name,
      v: filtered.filter(
        (t) =>
          (typeof t.responsible === "object"
            ? t.responsible?.name
            : t.responsible) === u.name && t.status === "Concluído",
      ).length,
      sector: u.sector?.name || u.sector || "—",
    }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);

  // Próximas tarefas
  const upcoming = [...filtered]
    .filter((t) => t.status !== "Concluído" && t.deadline)
    .sort((a, b) => {
      const da = parseDate(a.deadline),
        db = parseDate(b.deadline);
      return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
    })
    .slice(0, 10);

  const daysLeft = (deadlineStr) => {
    const d = parseDate(deadlineStr);
    if (!d) return null;
    const diff = Math.round(
      (d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0)
      return { label: `${Math.abs(diff)}d atrasada`, color: "#ef4444" };
    if (diff === 0) return { label: "Hoje", color: "#f59e0b" };
    if (diff < 2) return { label: `${diff * 24}h restantes`, color: "#f59e0b" };
    return { label: `${diff}d restantes`, color: "#10b981" };
  };

  // Compute weekly data from real tasks (last 13 weeks)
  const weeklyData = (() => {
    const weeks: {
      label: string;
      novas: number;
      entregar: number;
      atrasadas: number;
      concluidas: number;
    }[] = [];
    const now = TODAY;
    for (let i = 3; i >= -3; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7 - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekNum = 4 - i;
      const label = `${weekNum}ª sem: ${String(weekStart.getDate()).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}/${String(weekEnd.getMonth() + 1).padStart(2, "0")}`;

      const novas = filtered.filter((t) => {
        if (!t.created_at) return false;
        const d = new Date(t.created_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      const entregar = filtered.filter((t) => {
        const d = parseDate(t.deadline);
        return d ? d >= weekStart && d <= weekEnd : false;
      }).length;
      const atrasadas = filtered.filter((t) => {
        const d = parseDate(t.deadline);
        return d && d < weekStart && t.status !== "Concluído" ? true : false;
      }).length;
      const concluidas = filtered.filter((t) => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      weeks.push({ label, novas, entregar, atrasadas, concluidas });
    }
    return weeks;
  })();

  const TS = {
    contentStyle: {
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      color: T.text,
      fontSize: 11,
    },
  };

  const kpi = getKpiData(filtered, users);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <h1
            style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}
          >
            Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub }}>
            Olá, {user.name.split(" ")[0]}! Veja o resumo das atividades.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ExportButtons
            T={T}
            filtered={filtered}
            kpi={kpi}
            users={users}
            user={user}
            filterLabel={
              [
                fContract && `Contrato: ${fContract}`,
                fCity && `Cidade: ${fCity}`,
                fNeighbor && `Bairro: ${fNeighbor}`,
                fStatus && `Status: ${fStatus}`,
                fType && `Tipo: ${fType}`,
                fPriority && `Prioridade: ${fPriority}`,
                fSector.length > 0 && `Setores: ${fSector.join(", ")}`,
                fUser && `Responsável: ${fUser}`,
                (fDateFrom?.from || fDateFrom?.to) && "Filtro de Prazo",
                (fDateTo?.from || fDateTo?.to) && "Filtro de Criação",
              ]
                .filter(Boolean)
                .join(" | ") || "Nenhum"
            }
          />
          <AIReportModal T={T} />
          <span
            style={{
              fontSize: 12,
              color: T.sub,
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "5px 10px",
            }}
          >
            {new Date().toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* busca */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: T.inp,
              borderRadius: 8,
              padding: "6px 10px",
              flex: "1 1 180px",
              maxWidth: 240,
            }}
          >
            <Search size={12} color={T.sub} />
            <input
              value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
              placeholder="Buscar título ou descrição..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 12,
                color: T.text,
                width: "100%",
              }}
            />
          </div>
          <FilterSelect
            T={T}
            val={fStatus}
            onChange={setFStatus}
            opts={["A Fazer", "Em Andamento", "Pausado", "Concluído"]}
            placeholder="Todos status"
          />
          <MultiSelect
            T={T}
            val={fSector}
            onChange={setFSector}
            opts={SECTORS}
            placeholder="Setores"
          />
          <FilterSelect
            T={T}
            val={fPriority}
            onChange={setFPriority}
            opts={PRIORITIES}
            placeholder="Todas prioridades"
          />
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              background:
                filtersOpen || activeAdvancedFilters
                  ? "#98af3b11"
                  : "transparent",
              border: `1px solid ${filtersOpen || activeAdvancedFilters ? "#98af3b" : T.border}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: filtersOpen || activeAdvancedFilters ? "#98af3b" : T.sub,
              cursor: "pointer",
            }}
          >
            <Filter size={12} /> Mais filtros
            {activeAdvancedFilters > 0 && (
              <span
                style={{
                  background: "#98af3b",
                  color: "white",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activeAdvancedFilters}
              </span>
            )}
          </button>
          {(fSearch || totalActiveFilters > 0) && (
            <button
              onClick={clearAll}
              style={{
                padding: "6px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#ef4444",
                cursor: "pointer",
              }}
            >
              ✕ Limpar
            </button>
          )}
        </div>
        {filtersOpen && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "flex-end",
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            {[
              [
                "CONTRATO",
                fContract,
                setFContract,
                contracts,
                "Todos contratos",
              ],
              [
                "CIDADE",
                fCity,
                (v) => {
                  setFCity(v);
                  setFNeighbor("");
                },
                Object.keys(citiesNeighborhoods).sort(),
                "Todas cidades",
              ],
              [
                "BAIRRO",
                fNeighbor,
                setFNeighbor,
                cityNeighborhoods,
                fCity ? "Todos bairros" : "Cidade primeiro",
              ],
              ["TIPO", fType, setFType, TASK_TYPES, "Todos tipos"],
              [
                "RESPONSÁVEL",
                fUser,
                setFUser,
                users.map((u) => u.name),
                "Todos",
              ],
            ].map(([label, val, onChange, opts, ph]) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.sub,
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <FilterSelect
                  T={T}
                  val={val}
                  onChange={onChange}
                  opts={opts}
                  placeholder={ph}
                />
              </div>
            ))}
            <div>
              <DateRangePicker
                date={fDateFrom}
                setDate={setFDateFrom}
                label="Prazo de Entrega" // Or "Prazo de Entrega" to be consistent? user asked for specific fields. Logic uses fDateFrom for Deadline.
                T={T}
              />
            </div>
            <div>
              <DateRangePicker
                date={fDateTo}
                setDate={setFDateTo}
                label="Data de Criação" // Or "Data de Criação"? Logic uses fDateTo for Creation.
                T={T}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Total (Merged with Priority) - Spans 2 cols */}
        <div
          style={{
            gridColumn: "span 2",
            background: T.card,
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.sub,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                Total de Tarefas
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#98af3b",
                  lineHeight: 1,
                }}
              >
                {total}
              </div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 4 }}>
                {concluded.length} concluídas
              </div>
            </div>

            {/* Priority List (Compact) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minWidth: 140,
              }}
            >
              {byPriority.map((p) => (
                <div
                  key={p.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: T.sub,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: p.color,
                      }}
                    />
                    {p.name}
                  </div>
                  <span style={{ fontWeight: 700, color: T.text }}>
                    {p.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Por tipo - Spans 2 cols */}
        <div
          style={{
            gridColumn: "span 2",
            background: T.card,
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.sub,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Por Tipo
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "5px 15px",
              overflowY: "auto",
              maxHeight: 100,
            }}
          >
            {byType.length === 0 && (
              <div style={{ fontSize: 12, color: T.sub }}>—</div>
            )}
            {byType.map((tp) => (
              <div
                key={tp.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    color: T.sub,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {tp.name}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: T.text,
                    background: T.tag,
                    borderRadius: 20,
                    padding: "1px 8px",
                    fontSize: 10,
                  }}
                >
                  {tp.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tempo médio - Spans 1 col */}
        <div
          style={{
            gridColumn: "span 1",
            background: T.card,
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.sub,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Tempo Médio
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#10b981",
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {avgTime > 0
              ? `${Math.floor(avgTime / 60)}h ${avgTime % 60}m`
              : "—"}
          </div>
          <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>
            Em {concluded.length} concluidas
          </div>
        </div>
      </div>

      {/* ── GRÁFICOS LINHA 1 ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {/* Status */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.text,
              marginBottom: 12,
            }}
          >
            Tarefas por Status
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((d, i) => (
                  <Cell key={i} fill={STATUS_COLOR[d.name]} />
                ))}
              </Pie>
              <Tooltip {...TS} />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginTop: 4,
            }}
          >
            {pieData.map((d) => (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: STATUS_COLOR[d.name],
                    }}
                  />
                  <span style={{ color: T.sub }}>{d.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: T.text }}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Por setor */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.text,
              marginBottom: 12,
            }}
          >
            Tarefas por Setor
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={3}
                dataKey="v"
              >
                {sectorData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      [
                        "#98af3b",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444",
                        "#ec4899",
                        "#8b5cf6",
                        "#06b6d4",
                        "#14b8a6",
                      ][i % 8]
                    }
                  />
                ))}
              </Pie>
              <Tooltip {...TS} />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginTop: 4,
            }}
          >
            {sectorData.map((d, i) => (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: [
                        "#98af3b",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444",
                        "#ec4899",
                        "#8b5cf6",
                        "#06b6d4",
                        "#14b8a6",
                      ][i % 8],
                    }}
                  />
                  <span style={{ color: T.sub }}>{d.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: T.text }}>{d.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rankings */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.text,
              marginBottom: 10,
            }}
          >
            🏆 Rankings (Concluídas)
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.sub,
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Por Setor
          </div>
          {sectorRank.length === 0 && (
            <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>—</div>
          )}
          {sectorRank.slice(0, 3).map((r, i) => (
            <div
              key={r.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span style={{ fontSize: 13 }}>
                {["🥇", "🥈", "🥉"][i] || "·"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: T.sub,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </span>
              <div
                style={{
                  width: 80,
                  height: 6,
                  background: T.border,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "#98af3b",
                    borderRadius: 4,
                    width: `${sectorRank[0]?.v ? (r.v / sectorRank[0].v) * 100 : 0}%`,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text,
                  width: 16,
                  textAlign: "right",
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.sub,
              marginBottom: 6,
              marginTop: 12,
              textTransform: "uppercase",
            }}
          >
            Por Usuário
          </div>
          {userRank.length === 0 && (
            <div style={{ fontSize: 11, color: T.sub }}>—</div>
          )}
          {userRank.slice(0, 3).map((r, i) => (
            <div
              key={r.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span style={{ fontSize: 13 }}>
                {["🥇", "🥈", "🥉"][i] || "·"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: T.sub,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </span>
              <div
                style={{
                  width: 80,
                  height: 6,
                  background: T.border,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "#10b981",
                    borderRadius: 4,
                    width: `${userRank[0]?.v ? (r.v / userRank[0].v) * 100 : 0}%`,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text,
                  width: 16,
                  textAlign: "right",
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── GRÁFICO SEMANAL ── */}
      <div
        style={{
          background: T.card,
          borderRadius: 14,
          padding: 16,
          border: `1px solid ${T.border}`,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              Visão Semanal
            </div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
              Novas tarefas, a entregar e atrasadas por semana
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              ["Novas", "#3b43af"],
              ["A Entregar", "#f59e0b"],
              ["Atrasadas", "#ef4444"],
              ["Concluídas", "#10b981"],
            ].map(([l, c]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: T.sub,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: c,
                  }}
                />
                {l}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData} barGap={2} barCategoryGap="30%">
            <XAxis
              dataKey="label"
              tick={{ fill: T.sub, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.sub, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip {...TS} />
            <Bar
              dataKey="novas"
              name="Novas"
              fill="#3b43af"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="entregar"
              name="A Entregar"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="atrasadas"
              name="Atrasadas"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="concluidas"
              name="Concluídas"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── TABELA PRÓXIMAS TAREFAS ── */}
      <div
        style={{
          background: T.card,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              Próximas Tarefas a Entregar
            </div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
              {upcoming.length} tarefa(s) pendentes
            </div>
          </div>
        </div>
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 80px 100px 110px 140px 100px 120px 60px 60px 48px",
            padding: "8px 16px",
            borderBottom: `1px solid ${T.border}`,
            gap: 8,
          }}
        >
          {[
            "Título",
            "Prioridade",
            "Prazo",
            "Estado",
            "Contrato",
            "Cidade",
            "Bairro",
            "Quadra",
            "Lote",
            "",
          ].map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.sub,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {h}
            </span>
          ))}
        </div>
        {upcoming.length === 0 && (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              fontSize: 13,
              color: T.sub,
            }}
          >
            Nenhuma tarefa pendente com os filtros aplicados.
          </div>
        )}
        {upcoming.map((t, i) => {
          return (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 80px 100px 110px 140px 100px 120px 60px 60px 48px",
                padding: "10px 16px",
                borderBottom:
                  i < upcoming.length - 1 ? `1px solid ${T.border}` : "none",
                alignItems: "center",
                gap: 8,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.title}
                </div>
                <div style={{ fontSize: 10, color: T.sub, marginTop: 1 }}>
                  {t.type} ·{" "}
                  {t.sector && typeof t.sector === "object"
                    ? t.sector.name
                    : t.sector || ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 20,
                  background: PRIO_COLOR[t.priority] + "22",
                  color: PRIO_COLOR[t.priority],
                  fontWeight: 700,
                  textAlign: "center",
                  display: "inline-block",
                }}
              >
                {t.priority}
              </span>
              <div style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>
                {t.deadline}
              </div>
              <div>
                {getTaskState(t) && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: getTaskState(t)!.color + "22",
                      color: getTaskState(t)!.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getTaskState(t)!.label}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.sub,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {typeof t.contract === "object"
                  ? t.contract?.name
                  : t.contract || "—"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.sub,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {typeof t.city === "object" ? t.city?.name : t.city || "—"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.sub,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {typeof t.nucleus === "object"
                  ? t.nucleus?.name
                  : t.nucleus || "—"}
              </div>
              <div style={{ fontSize: 11, color: T.sub }}>
                {t.quadra || "—"}
              </div>
              <div style={{ fontSize: 11, color: T.sub }}>{t.lote || "—"}</div>
              <button
                onClick={() => onSelect(t)}
                style={{
                  background: "#98af3b11",
                  border: "1px solid #98af3b33",
                  borderRadius: 7,
                  padding: "5px 7px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Eye size={13} color="#98af3b" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── KANBAN ─────────────────────────────────────────────────────
function KanbanPage({
  T,
  tasks,
  user,
  onSelect,
  canCreate,
  onNew,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  sectors = [],
}: any) {
  const [search, setSearch] = useState("");
  const [fSector, setFSector] = useState<string[]>([]);
  const [fContract, setFContract] = useState("");
  const [fCity, setFCity] = useState("");
  const [fNeighbor, setFNeighbor] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fType, setFType] = useState("");
  const [fDateFrom, setFDateFrom] = useState<DateRange | undefined>(undefined);
  const [fDateTo, setFDateTo] = useState<DateRange | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cityNeighborhoods = fCity ? citiesNeighborhoods[fCity] || [] : [];

  const cols = ["A Fazer", "Em Andamento", "Pausado", "Concluído"];

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    const sectorVal =
      t.sector && typeof t.sector === "object"
        ? t.sector?.name
        : t.sector || "";
    if (fSector.length > 0 && !fSector.includes(sectorVal)) return false;
    if (fContract && t.contract !== fContract) return false;
    if (fCity && t.city !== fCity) return false;
    if (fNeighbor && t.nucleus !== fNeighbor) return false;
    if (fPriority && t.priority !== fPriority) return false;
    if (fType && t.type !== fType) return false;
    if (fDateFrom?.from || fDateFrom?.to) {
      const td = parseDate(t.deadline);
      if (!td) return false;
      if (fDateFrom.from && td < fDateFrom.from) return false;
      if (fDateFrom.to && td > fDateFrom.to) return false;
    }
    if (fDateTo?.from || fDateTo?.to) {
      const tc = new Date(t.created_at);
      if (fDateTo.from && tc < fDateTo.from) return false;
      if (fDateTo.to && tc > fDateTo.to) return false;
    }
    return true;
  });

  const totalActiveFilters = [
    fSector.length > 0,
    fContract,
    fCity,
    fNeighbor,
    fPriority,
    fType,
    fDateFrom?.from || fDateFrom?.to,
    fDateTo?.from || fDateTo?.to,
  ].filter(Boolean).length;

  const activeAdvancedFilters = [
    fPriority,
    fType,
    fNeighbor,
    fDateFrom?.from || fDateFrom?.to,
    fDateTo?.from || fDateTo?.to,
  ].filter(Boolean).length;

  const clearAll = () => {
    setSearch("");
    setFSector([]);
    setFContract("");
    setFCity("");
    setFNeighbor("");
    setFPriority("");
    setFType("");
    setFDateFrom(undefined);
    setFDateTo(undefined);
  };

  // mini select helper for filters bar

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div>
          <h1
            style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}
          >
            Quadro de Tarefas
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub }}>
            {filtered.length} de {tasks.length} tarefas
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButtons
            T={T}
            filtered={filtered}
            kpi={getKpiData(filtered, users)}
            users={users}
          />
          {canCreate && (
            <button
              onClick={onNew}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                background: "#98af3b",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={15} />
              Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* Barra de filtros */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
        }}
      >
        {/* Linha 1: busca + botão expandir */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: T.inp,
              borderRadius: 8,
              padding: "6px 10px",
              flex: "1 1 180px",
              maxWidth: 260,
            }}
          >
            <Search size={13} color={T.sub} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 12,
                color: T.text,
                width: "100%",
              }}
            />
          </div>
          <MultiSelect
            T={T}
            val={fSector}
            onChange={setFSector}
            opts={SECTORS}
            placeholder="Setores"
          />
          <FilterSelect
            T={T}
            val={fContract}
            onChange={(v) => {
              setFContract(v);
              setFCity("");
              setFNeighbor("");
            }}
            opts={contracts}
            placeholder="Todos contratos"
          />
          <FilterSelect
            T={T}
            val={fCity}
            onChange={(v) => {
              setFCity(v);
              setFNeighbor("");
            }}
            opts={Object.keys(citiesNeighborhoods).sort()}
            placeholder="Todas cidades"
          />
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              background:
                filtersOpen || activeAdvancedFilters
                  ? "#98af3b11"
                  : "transparent",
              border: `1px solid ${filtersOpen || activeAdvancedFilters ? "#98af3b" : T.border}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: filtersOpen || activeAdvancedFilters ? "#98af3b" : T.sub,
              cursor: "pointer",
            }}
          >
            <Filter size={12} /> Mais filtros{" "}
            {activeAdvancedFilters > 0 && (
              <span
                style={{
                  background: "#98af3b",
                  color: "white",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activeAdvancedFilters}
              </span>
            )}
          </button>
          {(search || totalActiveFilters > 0) && (
            <button
              onClick={clearAll}
              style={{
                padding: "6px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#ef4444",
                cursor: "pointer",
              }}
            >
              ✕ Limpar
            </button>
          )}
        </div>

        {/* Linha 2: filtros extras (expansível) */}
        {filtersOpen && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexWrap: "wrap",
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.sub,
                  marginBottom: 4,
                }}
              >
                BAIRRO / NÚCLEO
              </div>
              <select
                value={fNeighbor}
                onChange={(e) => setFNeighbor(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${fNeighbor ? "#98af3b" : T.border}`,
                  background: T.card,
                  color: fNeighbor ? "#98af3b" : T.sub,
                  fontSize: 12,
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: 200,
                }}
              >
                <option value="">
                  {fCity ? "Todos bairros" : "Selecione cidade primeiro"}
                </option>
                {cityNeighborhoods.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.sub,
                  marginBottom: 4,
                }}
              >
                PRIORIDADE
              </div>
              <FilterSelect
                T={T}
                val={fPriority}
                onChange={setFPriority}
                opts={PRIORITIES}
                placeholder="Todas"
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.sub,
                  marginBottom: 4,
                }}
              >
                TIPO DE TAREFA
              </div>
              <FilterSelect
                T={T}
                val={fType}
                onChange={setFType}
                opts={TASK_TYPES}
                placeholder="Todos"
              />
            </div>
            {/* DatePicker replaced directly below */}
            <div>
              <DateRangePicker
                date={fDateFrom}
                setDate={setFDateFrom}
                label="Prazo de Entrega"
                T={T}
              />
            </div>
            <div>
              <DateRangePicker
                date={fDateTo}
                setDate={setFDateTo}
                label="Data de Criação"
                T={T}
              />
            </div>
          </div>
        )}
      </div>

      {/* Colunas */}
      <div
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {cols.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col);
          return (
            <div key={col} style={{ flexShrink: 0, width: 272 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: STATUS_COLOR[col],
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  {col}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    padding: "1px 8px",
                    borderRadius: 20,
                    background: T.tag,
                    color: T.tagText,
                    fontWeight: 600,
                  }}
                >
                  {colTasks.length}
                </span>
              </div>
              <div
                style={{
                  background: T.col,
                  borderRadius: 12,
                  padding: 8,
                  minHeight: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {colTasks.map((t) => {
                  const prog = t.subtasks?.length
                    ? (t.subtasks.filter((s) => s.done).length /
                        t.subtasks.length) *
                      100
                    : 0;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelect(t)}
                      style={{
                        background: T.card,
                        borderRadius: 10,
                        padding: 12,
                        border: `1px solid ${T.border}`,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 4px 16px rgba(0,0,0,0.12)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      {t.parent_id && (
                        <div
                          style={{
                            fontSize: 10,
                            color: T.sub,
                            marginBottom: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 12 }}>↳</span>
                          <span>
                            de:{" "}
                            <b>
                              {tasks.find((p: any) => p.id === t.parent_id)
                                ?.title || "..."}
                            </b>
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 7,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: T.tag,
                            color: T.tagText,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {t.type}
                          {getTaskState(t) && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: getTaskState(t)!.color,
                              }}
                            />
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: PRIO_COLOR[t.priority] + "22",
                            color: PRIO_COLOR[t.priority],
                            fontWeight: 700,
                          }}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: T.text,
                          marginBottom: 7,
                          lineHeight: 1.3,
                        }}
                      >
                        {t.title}
                      </div>
                      {t.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: T.sub,
                            marginBottom: 7,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.description}
                        </div>
                      )}
                      {getTaskState(t) && (
                        <div style={{ marginBottom: 7 }}>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: getTaskState(t)!.color + "22",
                              color: getTaskState(t)!.color,
                            }}
                          >
                            {getTaskState(t)!.label}
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          marginBottom: 7,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: T.sub,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Building2 size={9} />
                          {sectorDisplay(t.sector)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: T.sub,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <User size={9} />
                          {t.responsible && typeof t.responsible === "object"
                            ? t.responsible.name
                            : t.responsible || "Não atribuído"}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: T.sub,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <MapPin size={9} />
                          {t.contract}
                        </span>
                        {t.city && (
                          <span
                            style={{
                              fontSize: 11,
                              color: T.sub,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              paddingLeft: 13,
                            }}
                          >
                            {t.city}
                            {t.nucleus ? ` · ${t.nucleus}` : ""}
                          </span>
                        )}
                        {(t.quadra || t.lote) && (
                          <span
                            style={{
                              fontSize: 10,
                              color: T.sub,
                              paddingLeft: 13,
                            }}
                          >
                            {t.quadra ? `Q: ${t.quadra} ` : ""}
                            {t.lote ? `L: ${t.lote}` : ""}
                          </span>
                        )}
                      </div>
                      {t.deadline && (
                        <div
                          style={{
                            fontSize: 10,
                            color: T.sub,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            marginBottom: 6,
                          }}
                        >
                          <Calendar size={9} />
                          Prazo: <b style={{ color: T.text }}>{t.deadline}</b>
                        </div>
                      )}
                      {t.subtasks?.length > 0 && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 10,
                              color: T.sub,
                              marginBottom: 3,
                            }}
                          >
                            <span>Subtarefas</span>
                            <span>
                              {t.subtasks.filter((s) => s.done).length}/
                              {t.subtasks.length}
                            </span>
                          </div>
                          <div
                            style={{
                              height: 3,
                              background: T.border,
                              borderRadius: 4,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                background: "#98af3b",
                                borderRadius: 4,
                                width: `${prog}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {t.time > 0 && (
                        <div
                          style={{
                            fontSize: 10,
                            color: T.sub,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            marginTop: 6,
                          }}
                        >
                          <Clock size={9} />
                          {fmtTime(t.time)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px 0",
                      fontSize: 12,
                      color: T.sub,
                    }}
                  >
                    Sem tarefas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAPA MENTAL ────────────────────────────────────────────────
function MindMapPage({ T, tasks = [], users = [] }: any) {
  const [sel, setSel] = useState<any>({
    contractId: null,
    cityId: null,
    neighborhoodId: null,
    taskId: null,
  });
  const [detail, setDetail] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLElement>>({});
  const [lines, setLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; active: boolean }[]
  >([]);
  const [svgDim, setSvgDim] = useState({ w: 800, h: 600 });

  // Build hierarchy from real tasks
  const CONTRACTS_MM = (() => {
    const contractMap: Record<string, any> = {};
    let cid = 0,
      cityId = 0,
      neighId = 0;
    tasks.forEach((t: any) => {
      if (!t.contract) return;
      if (t.parent_id) return; // skip subtasks — they show under their parent
      if (!contractMap[t.contract]) {
        contractMap[t.contract] = { id: ++cid, name: t.contract, cities: [] };
      }
      const cObj = contractMap[t.contract];
      let cityObj = cObj.cities.find(
        (c: any) => c.name === (t.city || "Sem cidade"),
      );
      if (!cityObj) {
        cityObj = {
          id: ++cityId,
          name: t.city || "Sem cidade",
          neighborhoods: [],
        };
        cObj.cities.push(cityObj);
      }
      const neighName = t.nucleus || "Sem bairro";
      let neighObj = cityObj.neighborhoods.find(
        (n: any) => n.name === neighName,
      );
      if (!neighObj) {
        neighObj = { id: ++neighId, name: neighName, tasks: [] };
        cityObj.neighborhoods.push(neighObj);
      }
      neighObj.tasks.push(t);
    });
    return Object.values(contractMap);
  })();

  const contract = CONTRACTS_MM.find((c) => c.id === sel.contractId);
  const cities = contract?.cities || [];
  const city = cities.find((c) => c.id === sel.cityId);
  const neighborhoods = city?.neighborhoods || [];
  const neighborhood = neighborhoods.find((n) => n.id === sel.neighborhoodId);
  const taskList = neighborhood?.tasks || [];
  const task = taskList.find((t) => t.id === sel.taskId);
  const subtasks = task?.subtasks || [];
  const setRef = (key, el) => {
    if (el) nodeRefs.current[key] = el;
  };

  const computeLines = () => {
    const cont = containerRef.current;
    if (!cont) return;
    const cRect = cont.getBoundingClientRect(),
      sl = cont.scrollLeft,
      st = cont.scrollTop;
    const nl: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      active: boolean;
    }[] = [];
    const ge = (key) => {
      const el = nodeRefs.current[key];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        rx: r.right - cRect.left + sl,
        lx: r.left - cRect.left + sl,
        my: r.top + r.height / 2 - cRect.top + st,
      };
    };
    const cn = (fk, tk, a) => {
      const f = ge(fk),
        t2 = ge(tk);
      if (f && t2)
        nl.push({ x1: f.rx, y1: f.my, x2: t2.lx, y2: t2.my, active: a });
    };
    if (sel.contractId != null)
      cities.forEach((c) =>
        cn(`contract-${sel.contractId}`, `city-${c.id}`, c.id === sel.cityId),
      );
    if (sel.cityId != null)
      neighborhoods.forEach((n) =>
        cn(`city-${sel.cityId}`, `neigh-${n.id}`, n.id === sel.neighborhoodId),
      );
    if (sel.neighborhoodId != null)
      taskList.forEach((t) =>
        cn(`neigh-${sel.neighborhoodId}`, `task-${t.id}`, t.id === sel.taskId),
      );
    if (sel.taskId != null)
      subtasks.forEach((s) => cn(`task-${sel.taskId}`, `sub-${s.id}`, true));
    setSvgDim({ w: cont.scrollWidth, h: cont.scrollHeight });
    setLines(nl);
  };
  useEffect(() => {
    const t = setTimeout(computeLines, 80);
    return () => clearTimeout(t);
  }, [sel]);

  const LC = ["#98af3b", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981"];
  const CW = 190,
    CG = 56;
  const Node = ({ id, label, sub, color, selected, onClick }) => (
    <div
      ref={(el) => setRef(id, el)}
      onClick={onClick}
      style={{
        background: selected ? color : T.card,
        border: `2px solid ${selected ? color : T.border}`,
        borderRadius: 12,
        padding: "10px 12px",
        cursor: "pointer",
        transition: "all 0.18s",
        boxShadow: selected ? `0 0 0 4px ${color}28` : "none",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${color}18`;
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = T.border;
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: selected ? "white" : T.text,
          lineHeight: 1.4,
          marginBottom: sub ? 3 : 0,
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 10,
            color: selected ? "rgba(255,255,255,0.7)" : T.sub,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div>
          <h1
            style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}
          >
            Mapa de Tarefas
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub }}>
            Clique nos nós para expandir a hierarquia
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ExportButtons
            T={T}
            filtered={tasks}
            kpi={getKpiData(tasks, users)}
            users={users}
          />
          {sel.contractId != null && (
            <button
              onClick={() =>
                setSel({
                  contractId: null,
                  cityId: null,
                  neighborhoodId: null,
                  taskId: null,
                })
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                fontSize: 12,
                color: T.sub,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={13} />
              Resetar
            </button>
          )}
        </div>
      </div>
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}
      >
        {[
          ["Contrato", LC[0]],
          ["Cidade", LC[1]],
          ["Bairro", LC[2]],
          ["Tarefa", LC[3]],
          ["Subtarefa", LC[4]],
        ].map(([l, c]) => (
          <div
            key={l}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: T.sub,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c,
              }}
            />
            {l}
          </div>
        ))}
      </div>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "calc(100vh - 260px)",
          minHeight: 300,
          background: T.mmBg,
          borderRadius: 16,
          border: `1px solid ${T.border}`,
          padding: "28px 20px",
        }}
      >
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: svgDim.w,
            height: svgDim.h,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {lines.map((l, i) => {
            const mx = (l.x1 + l.x2) / 2;
            return (
              <path
                key={i}
                d={`M${l.x1},${l.y1} C${mx},${l.y1} ${mx},${l.y2} ${l.x2},${l.y2}`}
                fill="none"
                stroke={l.active ? "#98af3b" : T.border}
                strokeWidth={l.active ? 2 : 1.5}
                strokeDasharray={l.active ? undefined : "5,4"}
                opacity={l.active ? 0.85 : 0.5}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "inline-flex",
            gap: CG,
            alignItems: "flex-start",
            minWidth: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: CW,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: LC[0],
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: LC[0],
                }}
              />
              Contratos
            </div>
            {CONTRACTS_MM.map((c) => (
              <Node
                key={c.id}
                id={`contract-${c.id}`}
                label={c.name}
                sub={`${c.cities.length} cidade(s)`}
                color={LC[0]}
                selected={sel.contractId === c.id}
                onClick={() =>
                  setSel({
                    contractId: c.id === sel.contractId ? null : c.id,
                    cityId: null,
                    neighborhoodId: null,
                    taskId: null,
                  })
                }
              />
            ))}
          </div>
          {sel.contractId != null && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: CW,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: LC[1],
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: LC[1],
                  }}
                />
                Cidades
              </div>
              {cities.map((c) => (
                <Node
                  key={c.id}
                  id={`city-${c.id}`}
                  label={c.name}
                  sub={`${c.neighborhoods.length} bairro(s)`}
                  color={LC[1]}
                  selected={sel.cityId === c.id}
                  onClick={() =>
                    setSel((s) => ({
                      ...s,
                      cityId: c.id === s.cityId ? null : c.id,
                      neighborhoodId: null,
                      taskId: null,
                    }))
                  }
                />
              ))}
            </div>
          )}
          {sel.cityId != null && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: CW,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: LC[2],
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: LC[2],
                  }}
                />
                Bairros
              </div>
              {neighborhoods.map((n) => (
                <Node
                  key={n.id}
                  id={`neigh-${n.id}`}
                  label={n.name}
                  sub={`${n.tasks.length} tarefa(s)`}
                  color={LC[2]}
                  selected={sel.neighborhoodId === n.id}
                  onClick={() =>
                    setSel((s) => ({
                      ...s,
                      neighborhoodId: n.id === s.neighborhoodId ? null : n.id,
                      taskId: null,
                    }))
                  }
                />
              ))}
            </div>
          )}
          {sel.neighborhoodId != null && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: CW + 20,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: LC[3],
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: LC[3],
                  }}
                />
                Tarefas
              </div>
              {taskList.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.sub,
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  Sem tarefas
                </div>
              )}
              {taskList.map((t) => {
                const sc = STATUS_COLOR[t.status],
                  isSel = sel.taskId === t.id;
                return (
                  <div
                    key={t.id}
                    ref={(el) => setRef(`task-${t.id}`, el)}
                    style={{
                      background: isSel ? LC[3] : T.card,
                      border: `2px solid ${isSel ? LC[3] : T.border}`,
                      borderRadius: 12,
                      padding: "10px 12px",
                      transition: "all 0.18s",
                    }}
                  >
                    <div
                      onClick={() =>
                        setSel((s) => ({
                          ...s,
                          taskId: t.id === s.taskId ? null : t.id,
                        }))
                      }
                      style={{ cursor: "pointer", marginBottom: 8 }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isSel ? "white" : T.text,
                          lineHeight: 1.4,
                          marginBottom: 5,
                        }}
                      >
                        {t.title}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: 20,
                          background: sc + "33",
                          color: isSel ? "white" : sc,
                          fontWeight: 600,
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetail(t);
                      }}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        background: isSel
                          ? "rgba(255,255,255,0.2)"
                          : "#98af3b11",
                        border: `1px solid ${isSel ? "rgba(255,255,255,0.3)" : "#98af3b33"}`,
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        color: isSel ? "white" : "#98af3b",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                      }}
                    >
                      <Eye size={11} />
                      Ver detalhes
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {sel.taskId != null && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: CW,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: LC[4],
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: LC[4],
                  }}
                />
                Subtarefas
              </div>
              {subtasks.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.sub,
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  Sem subtarefas
                </div>
              )}
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  ref={(el) => setRef(`sub-${s.id}`, el)}
                  style={{
                    background: s.done ? LC[4] : T.card,
                    border: `2px solid ${s.done ? LC[4] : T.border}`,
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: s.done
                          ? "rgba(255,255,255,0.3)"
                          : "transparent",
                        border: s.done ? "none" : `2px solid ${T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {s.done && <Check size={9} color="white" />}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: s.done ? "white" : T.text,
                        }}
                      >
                        {s.title}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: s.done ? "rgba(255,255,255,0.65)" : T.sub,
                          marginTop: 2,
                        }}
                      >
                        {s.done ? "✅ Concluída" : "⏳ Pendente"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetail(task)}
                    style={{
                      width: "100%",
                      padding: "4px 8px",
                      background: s.done
                        ? "rgba(255,255,255,0.18)"
                        : "#10b98111",
                      border: `1px solid ${s.done ? "rgba(255,255,255,0.3)" : "#10b98133"}`,
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 700,
                      color: s.done ? "white" : "#10b981",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <Eye size={10} />
                    Ver tarefa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {sel.contractId == null && (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            fontSize: 13,
            color: T.sub,
          }}
        >
          👆 Clique em um contrato para começar a expandir o mapa
        </div>
      )}
      {detail && (
        <div
          onClick={() => setDetail(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            fontFamily: "system-ui,sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 500,
              background: T.card,
              borderRadius: 20,
              padding: 24,
              border: `1px solid ${T.border}`,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: STATUS_COLOR[detail.status] + "22",
                    color: STATUS_COLOR[detail.status],
                  }}
                >
                  {detail.status}
                </span>
                <h2
                  style={{
                    margin: "6px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  {detail.title}
                </h2>
              </div>
              <button
                onClick={() => setDetail(null)}
                style={{
                  background: T.inp,
                  border: "none",
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                }}
              >
                <X size={16} color={T.sub} />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                ["Tipo", detail.type],
                ["Prioridade", detail.priority],
                ["Setor", detail.sector],
                ["Responsável", detail.responsible],
                ["Contrato", detail.contract],
                ["Prazo", detail.deadline || "—"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: T.inp,
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: T.sub,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {k.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
            {detail.subtasks?.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.sub,
                    marginBottom: 8,
                  }}
                >
                  SUBTAREFAS
                </div>
                {detail.subtasks.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      background: T.inp,
                      borderRadius: 8,
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: s.done ? "#10b981" : "transparent",
                        border: s.done ? "none" : `1px solid ${T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {s.done && <Check size={10} color="white" />}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        color: s.done ? T.sub : T.text,
                        textDecoration: s.done ? "line-through" : "none",
                      }}
                    >
                      {s.title}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        color: s.done ? "#10b981" : "#f59e0b",
                        fontWeight: 600,
                      }}
                    >
                      {s.done ? "✅" : "⏳"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CRONOGRAMA ─────────────────────────────────────────────────

function CronogramaPage({
  T,
  tasks,
  onSelect,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  sectors = [],
}: any) {
  const [search, setSearch] = useState("");
  const [fSector, setFSector] = useState<string[]>([]);
  const [fContract, setFContract] = useState("");
  const [fCity, setFCity] = useState("");
  const [fNeighbor, setFNeighbor] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fType, setFType] = useState("");
  const [fDateFrom, setFDateFrom] = useState<DateRange | undefined>(undefined);
  const [fDateTo, setFDateTo] = useState<DateRange | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Helper local para garantir funcionamento
  const parseDate = (d: string) => {
    if (!d) return null;
    const [day, month, year] = d.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const cityNeighborhoods = fCity ? citiesNeighborhoods[fCity] || [] : [];

  const filtered = tasks.filter((t: any) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    const sectorVal =
      t.sector && typeof t.sector === "object" ? t.sector.name : t.sector || "";
    if (fSector.length > 0 && !fSector.includes(sectorVal)) return false;
    if (fContract && t.contract !== fContract) return false;
    if (fCity && t.city !== fCity) return false;
    if (fNeighbor && t.nucleus !== fNeighbor) return false;
    if (fPriority && t.priority !== fPriority) return false;
    if (fType && t.type !== fType) return false;
    if (fDateFrom?.from || fDateFrom?.to) {
      const td = parseDate(t.deadline);
      if (!td) return false;
      if (fDateFrom.from && td < fDateFrom.from) return false;
      if (fDateFrom.to && td > fDateFrom.to) return false;
    }
    if (fDateTo?.from || fDateTo?.to) {
      const tc = new Date(t.created_at);
      if (fDateTo.from && tc < fDateTo.from) return false;
      if (fDateTo.to && tc > fDateTo.to) return false;
    }
    return true;
  });

  const totalActiveFilters = [
    fSector.length > 0,
    fContract,
    fCity,
    fNeighbor,
    fPriority,
    fType,
    fDateFrom?.from || fDateFrom?.to,
    fDateTo?.from || fDateTo?.to,
  ].filter(Boolean).length;

  // In CronogramaPage, all filters except search are in the drawer
  const activeAdvancedFilters = totalActiveFilters;

  const clearAll = () => {
    setSearch("");
    setFSector([]);
    setFContract("");
    setFCity("");
    setFNeighbor("");
    setFPriority("");
    setFType("");
    setFType("");
    setFDateFrom(undefined);
    setFDateTo(undefined);
  };

  const evts = [
    { k: "created", l: "Criado", c: "#6366f1" },
    { k: "assigned", l: "Atribuído", c: "#8b5cf6" },
    { k: "started", l: "Iniciado", c: "#f59e0b" },
    { k: "paused", l: "Pausado", c: "#ef4444" },
    { k: "completed", l: "Concluído", c: "#10b981" },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}
          >
            Cronograma de Entrega
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub }}>
            Linha do tempo de {filtered.length} tarefa
            {filtered.length !== 1 && "s"} (Total: {tasks.length})
          </p>
        </div>
        <ExportButtons
          T={T}
          filtered={filtered}
          kpi={getKpiData(filtered, users)}
          users={users}
        />
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              flex: 1,
              background: T.inp,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Search size={16} color={T.sub} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa..."
              style={{
                background: "transparent",
                border: "none",
                padding: "10px 0",
                fontSize: 13,
                color: T.text,
                width: "100%",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 16px",
              background: filtersOpen ? "#98af3b" : T.card,
              border: `1px solid ${filtersOpen ? "#98af3b" : T.border}`,
              borderRadius: 8,
              color: filtersOpen ? "white" : T.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Filter size={14} />
            Filtros
            {activeAdvancedFilters > 0 && (
              <span
                style={{
                  background: filtersOpen ? "white" : "#98af3b",
                  color: filtersOpen ? "#98af3b" : "white",
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 10,
                  marginLeft: 2,
                }}
              >
                {activeAdvancedFilters}
              </span>
            )}
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {filtersOpen && (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                l: "Setor",
                v: fSector,
                s: setFSector,
                o: sectors.map((s: any) =>
                  typeof s === "object" ? s.name : s,
                ),
                isMulti: true,
              },
              {
                l: "Prioridade",
                v: fPriority,
                s: setFPriority,
                o: ["Baixa", "Média", "Alta", "Urgente"].map((p) => ({
                  label: p,
                  value: p,
                })),
              },
              {
                l: "Tipo",
                v: fType,
                s: setFType,
                o: TASK_TYPES.map((t) => ({ label: t, value: t })),
              },
              {
                l: "Contrato",
                v: fContract,
                s: setFContract,
                o: contracts.map((c: any) => ({
                  label: c,
                  value: c,
                })),
              },
              {
                l: "Cidade",
                v: fCity,
                s: setFCity,
                o: Object.keys(citiesNeighborhoods).map((c) => ({
                  label: c,
                  value: c,
                })),
              },
              {
                l: "Bairro / Núcleo",
                v: fNeighbor,
                s: setFNeighbor,
                o: cityNeighborhoods.map((n: string) => ({
                  label: n,
                  value: n,
                })),
                disabled: !fCity,
              },
              {
                l: "Prazo de Entrega",
                v: fDateFrom,
                s: setFDateFrom,
                type: "date-range",
              },
              {
                l: "Data de Criação",
                v: fDateTo,
                s: setFDateTo,
                type: "date-range",
              },
            ].map((f: any, i) => (
              <div key={i}>
                {f.type === "date-range" ? (
                  <DateRangePicker date={f.v} setDate={f.s} label={f.l} T={T} />
                ) : (
                  <>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.sub,
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      {f.l}
                    </label>
                    {f.isMulti ? (
                      <MultiSelect
                        T={T}
                        val={f.v}
                        onChange={f.s}
                        opts={f.o}
                        placeholder={f.l}
                      />
                    ) : (
                      <select
                        value={f.v}
                        onChange={(e) => f.s(e.target.value)}
                        disabled={f.disabled}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                          background: f.disabled ? T.col : T.inp,
                          color: f.disabled ? T.sub : T.text,
                          fontSize: 13,
                        }}
                      >
                        <option value="">Todos</option>
                        {f.o?.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            ))}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <button
                onClick={clearAll}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "#ef4444",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 16,
        }}
      >
        {evts.map((e) => (
          <div
            key={e.k}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: e.c,
              }}
            />
            <span style={{ fontSize: 11, color: T.sub }}>{e.l}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            padding: "10px 16px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>
            TAREFA
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>
            LINHA DO TEMPO
          </span>
        </div>
        {filtered.map((t: any, i: number) => (
          <div
            key={t.id}
            onClick={() => onSelect(t)}
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              alignItems: "center",
              padding: "12px 16px",
              cursor: "pointer",
              borderBottom:
                i < tasks.length - 1 ? `1px solid ${T.border}` : "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div style={{ paddingRight: 12 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: T.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.title}
              </div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>
                {t.responsible && typeof t.responsible === "object"
                  ? t.responsible.name
                  : t.responsible || "Não atribuído"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                overflowX: "auto",
              }}
            >
              {evts.map((ev, ei) => {
                const val = t[ev.k];
                if (!val) return null;
                const prev = evts.slice(0, ei).find((pe) => t[pe.k]);
                return (
                  <div
                    key={ev.k}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {prev && (
                      <div
                        style={{ width: 28, height: 1, background: T.border }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: "50%",
                          background: ev.c,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          color: ev.c,
                          whiteSpace: "nowrap",
                          marginTop: 2,
                          fontWeight: 600,
                        }}
                      >
                        {val}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: T.sub,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ev.l}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Histórico de Pausas */}
              {t.pauses && t.pauses.length > 0 && (
                <>
                  <div
                    style={{
                      width: 1,
                      height: 24,
                      background: T.border,
                      margin: "0 12px",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#ef4444",
                        textTransform: "uppercase",
                      }}
                    >
                      Histórico de Pausas
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {t.pauses.map((p: any, pi: number) => (
                        <div
                          key={pi}
                          style={{
                            fontSize: 10,
                            color: T.sub,
                            background: T.inp,
                            padding: "2px 6px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(p.started_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          {p.ended_at
                            ? new Date(p.ended_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Agora"}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatesPage({
  T,
  active,
  setActive,
  templates = [],
  onCreate,
  onEdit,
  onDelete,
}: any) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}
          >
            Templates de Tarefas
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub }}>
            Modelos prontos para criação rápida
          </p>
        </div>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onCreate}
            style={{
              padding: "10px",
              background: "#98af3b",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <Plus size={16} /> Novo Template
          </button>
          {templates.map((tpl: any) => (
            <button
              key={tpl.id}
              onClick={() => setActive(active?.id === tpl.id ? null : tpl)}
              style={{
                background: T.card,
                border: `1px solid ${active?.id === tpl.id ? "#98af3b" : T.border}`,
                borderRadius: 12,
                padding: 14,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    {tpl.name}
                  </div>
                  <div style={{ fontSize: 11, color: T.sub }}>
                    {typeof tpl.sector === "object"
                      ? tpl.sector?.name
                      : tpl.sector}{" "}
                    · {tpl.tasks?.length || 0} tarefas
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  color={active?.id === tpl.id ? "#98af3b" : T.sub}
                />
              </div>
            </button>
          ))}
        </div>
        {active ? (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: T.text,
                }}
              >
                {active.name}
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onEdit(active)}
                  style={{
                    background: T.inp,
                    border: "none",
                    borderRadius: 6,
                    padding: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Edit size={14} color={T.sub} />
                </button>
                <button
                  onClick={() => onDelete(active.id)}
                  style={{
                    background: "#fef2f2",
                    border: "none",
                    borderRadius: 6,
                    padding: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: T.tag,
                  color: T.tagText,
                  fontWeight: 600,
                }}
              >
                {typeof active.sector === "object"
                  ? active.sector.name
                  : active.sector}
              </span>
            </div>
            {active.tasks.map((task: any, ti: number) => (
              <div
                key={task.id}
                style={{
                  background: T.col,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#98af3b",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {ti + 1}
                  </div>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                  >
                    {task.title}
                  </span>
                  {getTaskState(task) && (
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: getTaskState(task)!.color + "22",
                        color: getTaskState(task)!.color,
                        marginLeft: "auto",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getTaskState(task)!.label}
                    </div>
                  )}
                </div>
                {task.subtasks.map((st, si) => (
                  <div
                    key={si}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 12,
                      color: T.sub,
                      marginLeft: 32,
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: `1px solid ${T.border}`,
                        flexShrink: 0,
                      }}
                    />
                    {st.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
            }}
          >
            <FileText size={40} color={T.sub} style={{ marginBottom: 12 }} />
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 4,
              }}
            >
              Selecione um template
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TEMPLATE MODAL ───────────────────────────────────────────────
function TemplateModal({
  T,
  template,
  onClose,
  onSave,
  sectors,
}: {
  T: any;
  template?: any;
  onClose: () => void;
  onSave: (t: any) => void;
  sectors: string[];
}) {
  const [name, setName] = useState(template?.name || "");
  // tasks: [{ title, sector, subtasks: [{ title, sector }] }]
  const [tasks, setTasks] = useState<any[]>(
    template?.tasks?.length
      ? template.tasks.map((t: any) => ({
          title: t.title || "",
          sector: t.sector?.name || t.sector || "",
          subtasks: (t.subtasks || []).map((s: any) => ({
            title: typeof s === "string" ? s : s.title || "",
            sector: s.sector?.name || s.sector || "",
          })),
        }))
      : [{ title: "", sector: "", subtasks: [] }],
  );

  const handleAddTask = () =>
    setTasks([...tasks, { title: "", sector: "", subtasks: [] }]);

  const handleRemoveTask = (idx: number) =>
    setTasks(tasks.filter((_, i) => i !== idx));

  const handleTaskField = (idx: number, field: string, val: string) => {
    const next = [...tasks];
    next[idx] = { ...next[idx], [field]: val };
    setTasks(next);
  };

  const handleAddSubtask = (tIdx: number) => {
    const next = [...tasks];
    next[tIdx].subtasks = [
      ...(next[tIdx].subtasks || []),
      { title: "", sector: "" },
    ];
    setTasks(next);
  };

  const handleSubtaskField = (
    tIdx: number,
    sIdx: number,
    field: string,
    val: string,
  ) => {
    const next = [...tasks];
    const subs = [...next[tIdx].subtasks];
    subs[sIdx] = { ...subs[sIdx], [field]: val };
    next[tIdx].subtasks = subs;
    setTasks(next);
  };

  const handleRemoveSubtask = (tIdx: number, sIdx: number) => {
    const next = [...tasks];
    next[tIdx].subtasks = next[tIdx].subtasks.filter(
      (_: any, i: number) => i !== sIdx,
    );
    setTasks(next);
  };

  const handleSave = () => {
    if (!name.trim()) return alert("Nome do modelo é obrigatório");
    onSave({
      id: template?.id,
      name,
      sector:
        tasks[0]?.sector?.name ||
        tasks[0]?.sector ||
        (sectors && sectors.length > 0
          ? typeof (sectors[0] as any) === "object"
            ? (sectors[0] as any).name
            : sectors[0]
          : ""),
      tasks: tasks.filter((t) => t.title.trim()),
    });
  };

  const SectorSelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "4px 8px",
        borderRadius: 6,
        border: `1px solid ${T.border}`,
        background: T.inp,
        color: value ? T.text : T.sub,
        fontSize: 11,
        outline: "none",
        minWidth: 130,
        cursor: "pointer",
      }}
    >
      <option value="">Setor...</option>
      {sectors.map((s: any, i: number) => {
        const label = typeof s === "object" ? s.name || s.label : s;
        const value = typeof s === "object" ? s.id || s.value : s;
        const key =
          typeof s === "object"
            ? s.id || s.name || `sec-${i}`
            : `sec-${s}-${i}`;
        return (
          <option key={key} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          background: T.card,
          borderRadius: 20,
          padding: 24,
          border: `1px solid ${T.border}`,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}
          >
            {template ? "Editar Template" : "Novo Template"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={20} color={T.sub} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            paddingRight: 4,
          }}
        >
          {/* Nome */}
          <FormField label="NOME DO MODELO" req>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vistoria Padrão"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.inp,
                color: T.text,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </FormField>

          {/* Estrutura de Tarefas */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: T.sub,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              ESTRUTURA DE TAREFAS
              <button
                onClick={handleAddTask}
                style={{
                  fontSize: 11,
                  color: "#98af3b",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                + Adicionar Tarefa
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tasks.map((t: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: 14,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    background: T.col,
                  }}
                >
                  {/* Task row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        background: "#98af3b",
                        color: "white",
                        borderRadius: "50%",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <input
                      value={t.title}
                      onChange={(e) =>
                        handleTaskField(i, "title", e.target.value)
                      }
                      placeholder="Título da tarefa..."
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.text,
                        outline: "none",
                      }}
                    />
                    {getTaskState(t) && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: getTaskState(t)!.color + "22",
                          color: getTaskState(t)!.color,
                          marginLeft: 8,
                        }}
                      >
                        {getTaskState(t)!.label}
                      </span>
                    )}
                    <SectorSelect
                      value={t.sector}
                      onChange={(v) => handleTaskField(i, "sector", v)}
                    />
                    <button
                      onClick={() => handleRemoveTask(i)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>

                  {/* Subtasks */}
                  <div style={{ paddingLeft: 30 }}>
                    {t.subtasks?.map((st: any, k: number) => (
                      <div
                        key={k}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: T.border,
                            flexShrink: 0,
                          }}
                        />
                        <input
                          value={st.title}
                          onChange={(e) =>
                            handleSubtaskField(i, k, "title", e.target.value)
                          }
                          placeholder="Título da subtarefa..."
                          style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            borderBottom: `1px solid ${T.border}`,
                            fontSize: 12,
                            color: T.sub,
                            outline: "none",
                            padding: "2px 0",
                          }}
                        />
                        <SectorSelect
                          value={st.sector}
                          onChange={(v) =>
                            handleSubtaskField(i, k, "sector", v)
                          }
                        />
                        <button
                          onClick={() => handleRemoveSubtask(i, k)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            opacity: 0.5,
                            flexShrink: 0,
                          }}
                        >
                          <X size={12} color={T.sub} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddSubtask(i)}
                      style={{
                        fontSize: 11,
                        color: T.sub,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Plus size={10} /> Adicionar Subtarefa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            paddingTop: 16,
            marginTop: 16,
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              background: "transparent",
              color: T.sub,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              background: "#98af3b",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Salvar Template
          </button>
        </div>
      </div>
    </div>
  );
}
