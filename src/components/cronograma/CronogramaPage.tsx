"use client";

import { TaskFilters } from "@/components/shared/TaskFilters";
import { exportToExcel, getKpiData, type ExportKPIs } from "@/lib/exportUtils";
import type {
  CitiesNeighborhoods,
  Sector,
  Task,
  ThemeColors,
  User,
} from "@/types";
import { FileText } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

// ── ExportButtons (inline) ───────────────────────────────────────
const ExportButtons = ({
  filtered,
  kpi,
  users,
  user,
  filterLabel,
}: {
  filtered: Task[];
  kpi: ExportKPIs;
  users: User[];
  user?: User;
  filterLabel?: string;
}) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() =>
        exportToExcel(filtered, kpi, user, filterLabel, "cronograma")
      }
      className="flex items-center gap-1 rounded-lg border-none bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-[filter] duration-100 cursor-pointer hover:brightness-90"
    >
      <FileText size={13} /> EXCEL
    </button>
  </div>
);

// Shared components used from TaskFilters.tsx

// ── CronogramaPage ───────────────────────────────────────────────
interface CronogramaPageProps {
  T: ThemeColors;
  tasks: Task[];
  onSelect: (t: Task) => void;
  users?: User[];
  contracts?: string[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  sectors?: (Sector | string)[];
}

export default function CronogramaPage({
  T,
  tasks,
  onSelect,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  sectors = [],
}: CronogramaPageProps) {
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
  const parseDate = (d: string | null | undefined) => {
    if (!d) return null;
    const [day, month, year] = d.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const cityNeighborhoods = fCity ? citiesNeighborhoods[fCity] || [] : [];

  const filtered = tasks.filter((t: Task) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    const sectorVal =
      t.sector && typeof t.sector === "object" ? t.sector.name : t.sector || "";
    if (fSector.length > 0 && !fSector.includes(sectorVal)) return false;
    const contractVal =
      t.contract && typeof t.contract === "object"
        ? t.contract.name
        : t.contract || "";
    if (fContract && contractVal !== fContract) return false;
    const cityVal =
      t.city && typeof t.city === "object" ? t.city.name : t.city || "";
    if (fCity && cityVal !== fCity) return false;
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
      const tc = new Date(t.created_at || "");
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
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50">
            Cronograma de Entrega
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
            Linha do tempo de {filtered.length} tarefa
            {filtered.length !== 1 && "s"} (Total: {tasks.length})
          </p>
        </div>
        <ExportButtons
          filtered={filtered}
          kpi={getKpiData(filtered, users)}
          users={users}
        />
      </div>

      <TaskFilters
        T={T}
        search={search}
        setSearch={setSearch}
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
        dateFrom={fDateFrom}
        setDateFrom={setFDateFrom}
        dateTo={fDateTo}
        setDateTo={setFDateTo}
        contracts={contracts}
        citiesNeighborhoods={citiesNeighborhoods}
        onClear={clearAll}
        totalTasks={tasks.length}
        filteredTasks={filtered.length}
      />

      <div className="mb-4 flex flex-wrap gap-4 rounded-[10px] px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
        {evts.map((e) => (
          <div key={e.k} className="flex items-center gap-[5px]">
            <div
              className="h-[9px] w-[9px] rounded-full"
              style={{ background: e.c }}
            />
            <span className="text-[11px] text-slate-500 dark:text-gray-400">
              {e.l}
            </span>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-[14px] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
        <div
          className="grid px-4 py-2.5 border-b border-slate-200 dark:border-gray-700"
          style={{ gridTemplateColumns: "200px 1fr" }}
        >
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
            TAREFA
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
            LINHA DO TEMPO
          </span>
        </div>
        {filtered.map((t: Task, i: number) => (
          <div
            key={t.id}
            onClick={() => onSelect(t)}
            className="grid cursor-pointer items-center px-4 py-3 border-b border-slate-200 dark:border-gray-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-gray-700/50"
            style={{ gridTemplateColumns: "200px 1fr" }}
          >
            <div className="pr-3">
              <div className="truncate text-[13px] font-medium text-slate-900 dark:text-gray-50">
                {t.title}
              </div>
              <div className="mt-px text-[11px] text-slate-500 dark:text-gray-400">
                {t.responsible && typeof t.responsible === "object"
                  ? t.responsible.name
                  : t.responsible || "Não atribuído"}
              </div>
            </div>
            <div className="flex items-center overflow-x-auto">
              {evts.map((ev, ei) => {
                const tRec = t as unknown as Record<string, string | undefined>;
                const val = tRec[ev.k];
                if (!val) return null;
                const prev = evts.slice(0, ei).find((pe) => tRec[pe.k]);
                return (
                  <div key={ev.k} className="flex shrink-0 items-center">
                    {prev && (
                      <div className="h-px w-7 bg-slate-200 dark:bg-gray-700" />
                    )}
                    <div className="flex flex-col items-center">
                      <div
                        className="h-[11px] w-[11px] rounded-full"
                        style={{ background: ev.c }}
                      />
                      <span
                        className="mt-0.5 whitespace-nowrap text-[9px] font-semibold"
                        style={{ color: ev.c }}
                      >
                        {val}
                      </span>
                      <span className="whitespace-nowrap text-[9px] text-slate-500 dark:text-gray-400">
                        {ev.l}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Histórico de Pausas */}
              {t.pauses && t.pauses.length > 0 && (
                <>
                  <div className="mx-3 h-6 w-px shrink-0 bg-slate-200 dark:bg-gray-700" />
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold uppercase text-red-500">
                      Histórico de Pausas
                    </div>
                    <div className="flex gap-2">
                      {t.pauses.map(
                        (
                          p: { started_at: string; ended_at?: string },
                          pi: number,
                        ) => (
                          <div
                            key={pi}
                            className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700"
                          >
                            {new Date(p.started_at).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}{" "}
                            {p.ended_at
                              ? new Date(p.ended_at).toLocaleDateString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "Agora"}
                          </div>
                        ),
                      )}
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
