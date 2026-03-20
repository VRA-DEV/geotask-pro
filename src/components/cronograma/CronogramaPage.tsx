"use client";

import { TaskFilters } from "@/components/shared/TaskFilters";
import { exportToExcel, getKpiData, type ExportKPIs } from "@/lib/exportUtils";
import { getTaskState } from "@/lib/helpers";
import type {
  CitiesNeighborhoods,
  Sector,
  Task,
  ThemeColors,
  User,
} from "@/types";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { PageHeader } from "../shared/PageHeader";

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
      className="bg-emerald-600 text-white border-none h-9 px-4 rounded-lg text-[13px] font-semibold cursor-pointer flex items-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-95 shadow-sm shadow-emerald-500/20"
    >
      <FileText size={15} /> EXCEL
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
  taskTypes?: any[];
  canViewAllSectors?: boolean;
  createdByMe?: boolean;
  setCreatedByMe?: (v: boolean) => void;
  team?: string;
  setTeam?: (v: string) => void;
  teams?: { id: number; name: string }[];
  currentState?: string;
  setCurrentState?: (v: string) => void;
  externalFilters?: boolean;
  externalQuery?: {
    search: string;
    sector: string[];
    contract: string;
    city: string;
    neighbor: string;
    priority: string;
    type: string;
    responsible: string;
    createdByMe: boolean;
    team: string;
    currentState: string;
    dateFrom: DateRange | undefined;
    dateTo: DateRange | undefined;
  };
  setSearch?: (v: string) => void;
  setSector?: (v: string[]) => void;
  setPriority?: (v: string) => void;
  setType?: (v: string) => void;
  setResponsible?: (v: string) => void;
  setContract?: (v: string) => void;
  setCity?: (v: string) => void;
  setNeighbor?: (v: string) => void;
  setDateFrom?: (v: DateRange | undefined) => void;
  setDateTo?: (v: DateRange | undefined) => void;
}

export default function CronogramaPage({
  T,
  tasks,
  onSelect,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  sectors = [],
  taskTypes = [],
  canViewAllSectors,
  createdByMe,
  setCreatedByMe,
  team,
  setTeam,
  teams,
  currentState,
  setCurrentState,
  setSearch: setSearchProp,
  setSector: setSectorProp,
  setPriority: setPriorityProp,
  setType: setTypeProp,
  setResponsible: setResponsibleProp,
  setContract: setContractProp,
  setCity: setCityProp,
  setNeighbor: setNeighborProp,
  setDateFrom: setDateFromProp,
  setDateTo: setDateToProp,
  externalFilters = false,
  externalQuery,
}: CronogramaPageProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const [internalSector, setInternalSector] = useState<string[]>([]);
  const [internalContract, setInternalContract] = useState("");
  const [internalCity, setInternalCity] = useState("");
  const [internalNeighbor, setInternalNeighbor] = useState("");
  const [internalPriority, setInternalPriority] = useState("");
  const [internalType, setInternalType] = useState("");
  const [internalResponsible, setInternalResponsible] = useState("");
  const [internalDateFrom, setInternalDateFrom] = useState<
    DateRange | undefined
  >(undefined);
  const [internalDateTo, setInternalDateTo] = useState<DateRange | undefined>(
    undefined,
  );
  const [internalCurrentState, setInternalCurrentState] = useState(
    currentState || "",
  );

  const search = externalFilters ? externalQuery?.search || "" : internalSearch;
  const fSector = externalFilters
    ? externalQuery?.sector || []
    : internalSector;
  const fContract = externalFilters
    ? externalQuery?.contract || ""
    : internalContract;
  const fCity = externalFilters ? externalQuery?.city || "" : internalCity;
  const fNeighbor = externalFilters
    ? externalQuery?.neighbor || ""
    : internalNeighbor;
  const fPriority = externalFilters
    ? externalQuery?.priority || ""
    : internalPriority;
  const fType = externalFilters ? externalQuery?.type || "" : internalType;
  const fResponsible = externalFilters
    ? externalQuery?.responsible || ""
    : internalResponsible;
  const fDateFrom = externalFilters
    ? externalQuery?.dateFrom
    : internalDateFrom;
  const fDateTo = externalFilters ? externalQuery?.dateTo : internalDateTo;
  const fCurrentState = externalFilters
    ? externalQuery?.currentState || ""
    : internalCurrentState || "";

  const handleSetSearch = (v: string) => {
    if (externalFilters && setSearchProp) setSearchProp(v);
    else setInternalSearch(v);
  };
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (currentState !== undefined && !externalFilters)
      setInternalCurrentState(currentState);
  }, [currentState, externalFilters]);

  useEffect(() => {
    if (setCurrentState && !externalFilters)
      setCurrentState(internalCurrentState);
  }, [internalCurrentState, setCurrentState, externalFilters]);

  // Helper local para garantir funcionamento
  const parseDate = (d: string | null | undefined) => {
    if (!d) return null;
    const [day, month, year] = d.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const cityNeighborhoods = fCity ? citiesNeighborhoods[fCity] || [] : [];

  const filtered = tasks
    .filter((t: Task) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      const sectorVal =
        t.sector && typeof t.sector === "object"
          ? t.sector.name
          : t.sector || "";
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
      if (fResponsible) {
        const respName =
          t.responsible && typeof t.responsible === "object"
            ? t.responsible.name
            : t.responsible || "";
        const isCoworker = (t.coworkers || []).some(
          (cw: any) => cw.name === fResponsible,
        );
        if (respName !== fResponsible && !isCoworker) return false;
      }
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
      if (fCurrentState) {
        if (getTaskState(t)?.label !== fCurrentState) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const aVal =
        sortField === "deadline"
          ? a.deadline
            ? new Date(a.deadline).getTime()
            : sortOrder === "desc"
              ? -Infinity
              : Infinity
          : a.title.toLowerCase();
      const bVal =
        sortField === "deadline"
          ? b.deadline
            ? new Date(b.deadline).getTime()
            : sortOrder === "desc"
              ? -Infinity
              : Infinity
          : b.title.toLowerCase();
      if (aVal < bVal) return sortOrder === "desc" ? 1 : -1;
      if (aVal > bVal) return sortOrder === "desc" ? -1 : 1;
      return 0;
    });

  const totalActiveFilters = [
    fSector.length > 0,
    fContract,
    fCity,
    fNeighbor,
    fPriority,
    fType,
    fResponsible,
    fDateFrom?.from || fDateFrom?.to,
    fDateTo?.from || fDateTo?.to,
    fCurrentState,
  ].filter(Boolean).length;

  const clearAll = () => {
    if (externalFilters) return;
    setInternalSearch("");
    setInternalSector([]);
    setInternalContract("");
    setInternalCity("");
    setInternalNeighbor("");
    setInternalPriority("");
    setInternalType("");
    setInternalResponsible("");
    setInternalDateFrom(undefined);
    setInternalDateTo(undefined);
    setInternalCurrentState("");
    setSortField("");
    setSortOrder("asc");
  };

  const activeAdvancedFilters = totalActiveFilters;

  const evts = [
    { k: "created", l: "Criado", c: "#6366f1" },
    { k: "assigned", l: "Atribuído", c: "#8b5cf6" },
    { k: "started", l: "Iniciado", c: "#f59e0b" },
    { k: "paused", l: "Pausado", c: "#ef4444" },
    { k: "completed", l: "Concluído", c: "#10b981" },
  ];

  return (
    <div>
      <PageHeader
        title="Cronograma de Entrega"
        subtitle={`Linha do tempo de ${filtered.length} tarefa${filtered.length !== 1 ? "s" : ""} (Total: ${tasks.length})`}
        actionButtons={
          <ExportButtons
            filtered={filtered}
            kpi={getKpiData(filtered, users)}
            users={users}
          />
        }
      />

      {!externalFilters && (
        <TaskFilters
          T={T}
          search={search}
          setSearch={handleSetSearch}
          sector={fSector}
          setSector={
            externalFilters && setSectorProp ? setSectorProp : setInternalSector
          }
          priority={fPriority}
          setPriority={
            externalFilters && setPriorityProp
              ? setPriorityProp
              : setInternalPriority
          }
          type={fType}
          setType={
            externalFilters && setTypeProp ? setTypeProp : setInternalType
          }
          responsible={fResponsible}
          setResponsible={
            externalFilters && setResponsibleProp
              ? setResponsibleProp
              : setInternalResponsible
          }
          contract={fContract}
          setContract={
            externalFilters && setContractProp
              ? setContractProp
              : setInternalContract
          }
          city={fCity}
          setCity={
            externalFilters && setCityProp ? setCityProp : setInternalCity
          }
          neighbor={fNeighbor}
          setNeighbor={
            externalFilters && setNeighborProp
              ? setNeighborProp
              : setInternalNeighbor
          }
          dateFrom={fDateFrom}
          setDateFrom={
            externalFilters && setDateFromProp
              ? setDateFromProp
              : setInternalDateFrom
          }
          dateTo={fDateTo}
          setDateTo={
            externalFilters && setDateToProp ? setDateToProp : setInternalDateTo
          }
          contracts={contracts}
          taskTypes={taskTypes}
          sectors={sectors as any}
          citiesNeighborhoods={citiesNeighborhoods}
          onClear={clearAll}
          totalTasks={tasks.length}
          filteredTasks={filtered.length}
          canViewAllSectors={canViewAllSectors}
          createdByMe={createdByMe}
          setCreatedByMe={setCreatedByMe}
          team={team}
          setTeam={setTeam}
          teams={teams}
          currentState={fCurrentState}
          setCurrentState={
            externalFilters && setCurrentState
              ? setCurrentState
              : setInternalCurrentState
          }
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          users={users}
          displayedTasks={filtered}
        />
      )}

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
      {/* Mobile View (Cards) */}
      <div className="lg:hidden flex flex-col gap-3">
        {filtered.map((t: Task) => (
          <div
            key={t.id}
            onClick={() => onSelect(t)}
            className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-3.5 flex flex-col gap-3 cursor-pointer shadow-sm"
          >
            <div>
              <div className="text-[14px] font-bold text-slate-900 dark:text-gray-50 leading-snug">
                {t.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                <span className="font-semibold">Res:</span>{" "}
                {t.responsible && typeof t.responsible === "object"
                  ? t.responsible.name
                  : t.responsible || "Não atribuído"}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                Criado por:{" "}
                {typeof t.created_by === "object"
                  ? (t.created_by as any).name
                  : t.created_by || "Desconhecido"}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-gray-700/50 pt-3 border-dashed">
              {evts.map((ev) => {
                const tRec = t as unknown as Record<string, string | undefined>;
                const val = tRec[ev.k];
                if (!val) return null;
                return (
                  <div
                    key={ev.k}
                    className="flex justify-between items-center text-[11px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: ev.c }}
                      />
                      <span className="text-slate-600 dark:text-gray-300">
                        {ev.l}
                      </span>
                    </div>
                    <span className="font-semibold" style={{ color: ev.c }}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View (Timeline) */}
      <div className="hidden lg:block overflow-hidden rounded-[14px] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
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
                <span className="font-semibold">Res:</span>{" "}
                {t.responsible && typeof t.responsible === "object"
                  ? t.responsible.name
                  : t.responsible || "Não atribuído"}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                Criado por:{" "}
                {typeof t.created_by === "object"
                  ? (t.created_by as any).name
                  : t.created_by || "Desconhecido"}
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
