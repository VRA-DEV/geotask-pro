"use client";

import { Eye, FileText } from "lucide-react";
import { useState } from "react";
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

import AIReportModal from "@/components/AIReportModal";
import { TaskFilters } from "@/components/shared/TaskFilters";
import { PRIO_COLOR, PRIORITIES, SECTORS, STATUS_COLOR } from "@/lib/constants";
import { exportToExcel, getKpiData, type ExportKPIs } from "@/lib/exportUtils";
import { getTaskState, parseDate } from "@/lib/helpers";
import type {
  CitiesNeighborhoods,
  Sector,
  Task,
  ThemeColors,
  User,
} from "@/types";

// ── DashboardTask: extends the shared Task type with extra runtime aliases ──
interface DashboardTask extends Task {
  /** Alias – API sometimes returns pre-computed time instead of time_spent */
  time?: number;
}

// ── Filter option type (supports both strings and objects with name/id/label/value) ──
type FilterOption =
  | string
  | {
      id?: string | number;
      name?: string;
      label?: string;
      value?: string | number;
    };

// ── Sector/User rank entry types ──
interface SectorDataEntry {
  name: string;
  v: number;
}

interface UserRankEntry {
  name: string;
  v: number;
  sector: string | Sector | null | undefined;
}

// ── Inline helper components ─────────────────────────────────

interface ExportButtonsProps {
  filtered: DashboardTask[];
  kpi: ExportKPIs;
  users: User[];
  user: User;
  filterLabel: string;
}

const ExportButtons = ({
  filtered,
  kpi,
  users,
  user,
  filterLabel,
}: ExportButtonsProps) => (
  <div className="flex gap-2 items-center">
    <button
      onClick={() =>
        exportToExcel(filtered, kpi, user, filterLabel, "dashboard")
      }
      className="bg-emerald-500 text-white border-none px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-[filter] duration-100 hover:brightness-90"
    >
      <FileText size={13} /> EXCEL
    </button>
  </div>
);

// Shared components used from TaskFilters.tsx

// ── Main component ───────────────────────────────────────────

const TODAY = new Date();

interface DashboardPageProps {
  T: ThemeColors;
  tasks: DashboardTask[];
  user: User;
  onSelect: (task: DashboardTask) => void;
  users?: User[];
  contracts?: string[];
  taskTypes?: { id: number; name: string }[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  sectors?: Sector[];
}

export default function DashboardPage({
  T,
  tasks,
  user,
  onSelect,
  users = [],
  contracts = [],
  taskTypes = [],
  citiesNeighborhoods = {},
  sectors = [],
}: DashboardPageProps) {
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
  const [fDateTo, setFDateTo] = useState<DateRange | undefined>(undefined); // Criacao
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cityNeighborhoods = fCity ? citiesNeighborhoods[fCity] || [] : [];

  const filtered = tasks.filter((t: DashboardTask) => {
    const txt = (fSearch || "").toLowerCase();
    if (
      txt &&
      !t.title.toLowerCase().includes(txt) &&
      !(t.description || "").toLowerCase().includes(txt)
    )
      return false;
    const contractVal =
      t.contract && typeof t.contract === "object"
        ? t.contract.name
        : t.contract || "";
    if (fContract && contractVal !== fContract) return false;
    const cityVal =
      t.city && typeof t.city === "object" ? t.city.name : t.city || "";
    if (fCity && cityVal !== fCity) return false;
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
      const tc = new Date(t.created_at as string);
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
  const concluded = filtered.filter(
    (t: DashboardTask) => t.status === "Concluído",
  );
  const concludedForAvg = concluded.filter(
    (t: DashboardTask) => !t.subtasks || t.subtasks.length === 0,
  );
  const avgTime = concludedForAvg.length
    ? Math.round(
        concludedForAvg.reduce(
          (a: number, t: DashboardTask) => a + (t.time || 0),
          0,
        ) / concludedForAvg.length,
      )
    : 0;
  const byType = taskTypes
    .map((tp) => ({
      name: tp.name,
      val: filtered.filter((t: DashboardTask) => t.type === tp.name).length,
    }))
    .filter((x) => x.val > 0);
  const byPriority = PRIORITIES.map((p) => ({
    name: p,
    val: filtered.filter((t: DashboardTask) => t.priority === p).length,
    color: PRIO_COLOR[p],
  }));

  // Graficos
  const pieData = ["A Fazer", "Em Andamento", "Pausado", "Concluído"]
    .map((s) => ({
      name: s,
      value: filtered.filter((t: DashboardTask) => t.status === s).length,
    }))
    .filter((d) => d.value > 0);
  const sectorData = SECTORS.map((s) => ({
    name: s,
    v: filtered.filter(
      (t: DashboardTask) =>
        (t.sector && typeof t.sector === "object"
          ? t.sector.name
          : t.sector || "") === s,
    ).length,
  }))
    .filter((x: SectorDataEntry) => x.v > 0)
    .sort((a: SectorDataEntry, b: SectorDataEntry) => b.v - a.v);
  const sectorRank = SECTORS.map((s) => ({
    name: s,
    v: filtered.filter(
      (t: DashboardTask) =>
        (t.sector && typeof t.sector === "object"
          ? t.sector.name
          : t.sector || "") === s && t.status === "Concluído",
    ).length,
  }))
    .filter((x: SectorDataEntry) => x.v > 0)
    .sort((a: SectorDataEntry, b: SectorDataEntry) => b.v - a.v);
  const userRank = users
    .map((u: User) => ({
      name: u.name,
      v: filtered.filter(
        (t: DashboardTask) =>
          (typeof t.responsible === "object"
            ? t.responsible?.name
            : t.responsible) === u.name && t.status === "Concluído",
      ).length,
      sector: u.sector?.name || u.sector || "\u2014",
    }))
    .filter((x: UserRankEntry) => x.v > 0)
    .sort((a: UserRankEntry, b: UserRankEntry) => b.v - a.v);

  // Proximas tarefas
  const upcoming = [...filtered]
    .filter((t) => t.status !== "Concluído" && t.deadline)
    .sort((a, b) => {
      const da = parseDate(a.deadline),
        db = parseDate(b.deadline);
      return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
    })
    .slice(0, 10);

  const daysLeft = (deadlineStr: string | null | undefined) => {
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

      const novas = filtered.filter((t: DashboardTask) => {
        if (!t.created_at) return false;
        const d = new Date(t.created_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      const entregar = filtered.filter((t: DashboardTask) => {
        const d = parseDate(t.deadline);
        return d ? d >= weekStart && d <= weekEnd : false;
      }).length;
      const atrasadas = filtered.filter((t: DashboardTask) => {
        const d = parseDate(t.deadline);
        return d && d < weekStart && t.status !== "Concluído" ? true : false;
      }).length;
      const concluidas = filtered.filter((t: DashboardTask) => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      weeks.push({ label, novas, entregar, atrasadas, concluidas });
    }
    return weeks;
  })();

  const kpi = getKpiData(filtered, users);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50">
            Dashboard
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
            Olá, {user.name.split(" ")[0]}! Veja o resumo das atividades.
          </p>
        </div>
        <div className="flex gap-2.5 items-center">
          <ExportButtons
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
          <AIReportModal user={user} />
          <span className="text-xs text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5">
            {new Date().toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <TaskFilters
        T={T}
        search={fSearch}
        setSearch={setFSearch}
        status={fStatus}
        setStatus={setFStatus}
        sector={fSector}
        setSector={setFSector}
        priority={fPriority}
        setPriority={setFPriority}
        type={fType}
        setType={setFType}
        contract={fContract}
        setContract={setFContract}
        city={fCity}
        setCity={setFCity}
        neighbor={fNeighbor}
        setNeighbor={setFNeighbor}
        responsible={fUser}
        setResponsible={setFUser}
        dateFrom={fDateFrom}
        setDateFrom={setFDateFrom}
        dateTo={fDateTo}
        setDateTo={setFDateTo}
        users={users}
        contracts={contracts}
        taskTypes={taskTypes}
        sectors={sectors}
        citiesNeighborhoods={citiesNeighborhoods}
        onClear={clearAll}
        totalTasks={tasks.length}
        filteredTasks={filtered.length}
      />

      {/* -- KPIs -- */}
      <div className="grid grid-cols-5 gap-3.5 mb-5">
        {/* Total (Merged with Priority) - Spans 2 cols */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-[14px] p-4 border border-slate-200 dark:border-gray-700 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Total de Tarefas
              </div>
              <div className="text-[34px] font-extrabold text-primary leading-none">
                {total}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                {concluded.length} conclu&iacute;das
              </div>
            </div>

            {/* Priority List (Compact) */}
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              {byPriority.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-gray-400">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-gray-50">
                    {p.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Por tipo - Spans 2 cols */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-[14px] p-4 border border-slate-200 dark:border-gray-700">
          <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
            Por Tipo
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto max-h-[100px]">
            {byType.length === 0 && (
              <div className="text-xs text-slate-500 dark:text-gray-400">
                &mdash;
              </div>
            )}
            {byType.map((tp) => (
              <div
                key={tp.name}
                className="flex justify-between items-center text-[11px]"
              >
                <span className="text-slate-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                  {tp.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-gray-50 bg-slate-200 dark:bg-gray-700 rounded-full px-2 py-px text-[10px]">
                  {tp.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tempo medio - Spans 1 col */}
        <div className="col-span-1 bg-white dark:bg-gray-800 rounded-[14px] p-4 border border-slate-200 dark:border-gray-700 flex flex-col gap-1.5">
          <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide">
            Tempo M&eacute;dio
          </div>
          <div className="text-2xl font-extrabold text-emerald-500 leading-none mt-1">
            {avgTime > 0
              ? `${Math.floor(avgTime / 60)}h ${avgTime % 60}m`
              : "\u2014"}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
            Em {concluded.length} concluidas
          </div>
        </div>
      </div>

      {/* -- GRAFICOS LINHA 1 -- */}
      <div className="grid grid-cols-3 gap-3.5 mb-3.5">
        {/* Status */}
        <div className="bg-white dark:bg-gray-800 rounded-[14px] p-4 border border-slate-200 dark:border-gray-700">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 mb-3">
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
              <Tooltip
                contentStyle={{
                  background: "var(--color-white, #fff)",
                  border: "1px solid var(--color-slate-200, #e2e8f0)",
                  borderRadius: 8,
                  color: "var(--color-slate-900, #0f172a)",
                  fontSize: 11,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-1">
            {pieData.map((d) => (
              <div key={d.name} className="flex justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: STATUS_COLOR[d.name] }}
                  />
                  <span className="text-slate-500 dark:text-gray-400">
                    {d.name}
                  </span>
                </div>
                <span className="font-bold text-slate-900 dark:text-gray-50">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Por setor */}
        <div className="bg-white dark:bg-gray-800 rounded-[14px] p-4 border border-slate-200 dark:border-gray-700">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 mb-3">
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
              <Tooltip
                contentStyle={{
                  background: "var(--color-white, #fff)",
                  border: "1px solid var(--color-slate-200, #e2e8f0)",
                  borderRadius: 8,
                  color: "var(--color-slate-900, #0f172a)",
                  fontSize: 11,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-1">
            {sectorData.map((d, i) => (
              <div key={d.name} className="flex justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
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
                  <span className="text-slate-500 dark:text-gray-400">
                    {d.name}
                  </span>
                </div>
                <span className="font-bold text-slate-900 dark:text-gray-50">
                  {d.v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rankings */}
        <div className="bg-white dark:bg-gray-800 rounded-[14px] p-4 border border-slate-200 dark:border-gray-700">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 mb-2.5">
            {"\uD83C\uDFC6"} Rankings (Conclu&iacute;das)
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase">
            Por Setor
          </div>
          {sectorRank.length === 0 && (
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mb-2">
              &mdash;
            </div>
          )}
          {sectorRank.slice(0, 3).map((r, i) => (
            <div key={r.name} className="flex items-center gap-2 mb-1.5">
              <span className="text-[13px]">
                {["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"][i] || "·"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-gray-400 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {r.name}
              </span>
              <div className="w-20 h-1.5 bg-slate-200 dark:bg-gray-700 rounded">
                <div
                  className="h-full bg-primary rounded"
                  style={{
                    width: `${sectorRank[0]?.v ? (r.v / sectorRank[0].v) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-gray-50 w-4 text-right">
                {r.v}
              </span>
            </div>
          ))}
          <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1.5 mt-3 uppercase">
            Por Usu&aacute;rio
          </div>
          {userRank.length === 0 && (
            <div className="text-[11px] text-slate-500 dark:text-gray-400">
              &mdash;
            </div>
          )}
          {userRank.slice(0, 3).map((r: UserRankEntry, i: number) => (
            <div key={r.name} className="flex items-center gap-2 mb-1.5">
              <span className="text-[13px]">
                {["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"][i] || "·"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-gray-400 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {r.name}
              </span>
              <div className="w-20 h-1.5 bg-slate-200 dark:bg-gray-700 rounded">
                <div
                  className="h-full bg-emerald-500 rounded"
                  style={{
                    width: `${userRank[0]?.v ? (r.v / userRank[0].v) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-gray-50 w-4 text-right">
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* -- GRAFICO SEMANAL -- */}
      <div className="bg-white dark:bg-gray-800 rounded-[14px] p-4 border border-slate-200 dark:border-gray-700 mb-5">
        <div className="flex justify-between items-center mb-3.5">
          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
              Vis&atilde;o Semanal
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
              Novas tarefas, a entregar e atrasadas por semana
            </div>
          </div>
          <div className="flex gap-3">
            {[
              ["Novas", "#3b43af"],
              ["A Entregar", "#f59e0b"],
              ["Atrasadas", "#ef4444"],
              ["Concluídas", "#10b981"],
            ].map(([l, c]) => (
              <div
                key={l}
                className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-gray-400"
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: c }}
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
              tick={{ fill: "var(--color-slate-500, #64748b)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-slate-500, #64748b)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-white, #fff)",
                border: "1px solid var(--color-slate-200, #e2e8f0)",
                borderRadius: 8,
                color: "var(--color-slate-900, #0f172a)",
                fontSize: 11,
              }}
            />
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

      {/* -- TABELA PROXIMAS TAREFAS -- */}
      <div className="bg-white dark:bg-gray-800 rounded-[14px] border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <div className="text-[13px] font-bold text-slate-900 dark:text-gray-50">
              Pr&oacute;ximas Tarefas a Entregar
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
              {upcoming.length} tarefa(s) pendentes
            </div>
          </div>
        </div>
        {/* Header */}
        <div
          className="grid px-4 py-2 border-b border-slate-200 dark:border-gray-700 gap-2"
          style={{
            gridTemplateColumns:
              "2fr 80px 100px 110px 140px 100px 120px 60px 60px 48px",
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
              className="text-[10px] font-bold text-slate-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {h}
            </span>
          ))}
        </div>
        {upcoming.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-slate-500 dark:text-gray-400">
            Nenhuma tarefa pendente com os filtros aplicados.
          </div>
        )}
        {upcoming.map((t, i) => {
          return (
            <div
              key={t.id}
              className="grid px-4 py-2.5 items-center gap-2 transition-colors duration-100 hover:bg-slate-100 dark:hover:bg-gray-700"
              style={{
                gridTemplateColumns:
                  "2fr 80px 100px 110px 140px 100px 120px 60px 60px 48px",
                borderBottom:
                  i < upcoming.length - 1
                    ? "1px solid var(--color-slate-200, #e2e8f0)"
                    : "none",
              }}
            >
              <div className="min-w-0">
                {t.parent_id && (
                  <div className="text-[9px] text-primary font-bold flex items-center gap-1 mb-0.5">
                    <span className="text-xs">↳</span>
                    <span>
                      de:{" "}
                      {t.parent?.title ||
                        tasks.find((p) => p.id === t.parent_id)?.title ||
                        "..."}
                    </span>
                  </div>
                )}
                <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 overflow-hidden text-ellipsis whitespace-nowrap">
                  {t.title}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-px">
                  {t.type} &middot;{" "}
                  {t.sector && typeof t.sector === "object"
                    ? t.sector.name
                    : t.sector || ""}
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold text-center inline-block"
                style={{
                  background: PRIO_COLOR[t.priority as string] + "22",
                  color: PRIO_COLOR[t.priority as string],
                }}
              >
                {t.priority}
              </span>
              <div className="text-[11px] text-slate-900 dark:text-gray-50 font-semibold">
                {t.deadline}
              </div>
              <div>
                {getTaskState(t) && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                    style={{
                      background: getTaskState(t)!.color + "22",
                      color: getTaskState(t)!.color,
                    }}
                  >
                    {getTaskState(t)!.label}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                {typeof t.contract === "object"
                  ? (t.contract as { name?: string })?.name
                  : t.contract || "\u2014"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                {typeof t.city === "object"
                  ? (t.city as { name?: string })?.name
                  : t.city || "\u2014"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                {typeof t.nucleus === "object" && t.nucleus !== null
                  ? (t.nucleus as unknown as { name?: string })?.name
                  : t.nucleus || "\u2014"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400">
                {t.quadra || "\u2014"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400">
                {t.lote || "\u2014"}
              </div>
              <button
                onClick={() => onSelect(t)}
                className="bg-primary/5 border border-primary/20 rounded-[7px] px-2 py-1.5 cursor-pointer flex items-center justify-center"
              >
                <Eye size={13} className="text-primary" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
