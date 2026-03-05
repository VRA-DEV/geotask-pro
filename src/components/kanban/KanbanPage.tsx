"use client";

import { DatePicker } from "@/app/components/DatePicker";
import { PRIO_COLOR, STATUS_COLOR } from "@/lib/constants";
import { exportToExcel, getKpiData } from "@/lib/exportUtils";
import { fmtTime, getTaskState, parseDate, sectorDisplay } from "@/lib/helpers";
import type {
  CitiesNeighborhoods,
  Sector,
  Subtask,
  Task,
  ThemeColors,
  User as UserType,
} from "@/types";
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  FileText,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { TaskFilters } from "../shared/TaskFilters";

// ── KanbanTask: extends shared Task with runtime alias ──
interface KanbanTask extends Task {
  /** Alias – API sometimes returns pre-computed time instead of time_spent */
  time?: number;
}

// ── Inline helper component props ──────────────────────────────────

interface FilterSelectProps {
  val: string;
  onChange: (v: string) => void;
  opts: FilterOption[];
  placeholder?: string;
  label?: string;
}

interface DateRangePickerProps {
  date: DateRange | undefined;
  setDate: (d: DateRange | undefined) => void;
  label: string;
  T: ThemeColors;
}

interface ExportButtonsProps {
  filtered: KanbanTask[];
  kpi: ReturnType<typeof getKpiData>;
  users: UserType[];
  user?: UserType | null;
  filterLabel?: string;
}

interface KanbanPageProps {
  T: ThemeColors;
  tasks: KanbanTask[];
  user: UserType | null;
  onSelect: (task: KanbanTask) => void;
  canCreate: boolean;
  onNew: () => void;
  users?: UserType[];
  contracts?: string[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  sectors?: Sector[];
  taskTypes?: any[];
}

// ── Inline helper components ────────────────────────────────────

type FilterOption =
  | string
  | {
      id?: string | number;
      name?: string;
      label?: string;
      value?: string | number;
    };

function MultiSelect({
  val = [],
  onChange,
  opts,
  placeholder = "",
}: {
  val: string[];
  onChange: (v: string[]) => void;
  opts: FilterOption[];
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

  const hasValue = val.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer min-w-[140px] max-w-[200px] flex justify-between items-center bg-white dark:bg-gray-800 ${
          hasValue
            ? "border-primary text-primary"
            : "border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400"
        }`}
      >
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
          {val.length === 0
            ? placeholder
            : val.length === 1
              ? val[0]
              : `${val.length} selecionados`}
        </span>
        <ChevronDown size={14} />
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-[9999] p-1.5 min-w-[180px] max-h-[300px] overflow-y-auto">
          {opts.map((o: FilterOption, i: number) => {
            const label = typeof o === "object" ? o.name || o.label : o;
            const value = String(
              typeof o === "object" ? o.id || o.value || "" : o,
            );
            const selected = val.includes(value);
            const key =
              typeof o === "object"
                ? String(o.id || o.name || `mopt-${i}`)
                : `mopt-${o}-${i}`;

            return (
              <div
                key={key}
                onClick={() => toggle(value)}
                className={`px-2.5 py-1.5 rounded-md text-xs text-slate-900 dark:text-gray-50 cursor-pointer flex items-center gap-2 ${
                  selected ? "bg-primary/[0.07]" : "bg-transparent"
                } hover:bg-white dark:hover:bg-gray-900`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-slate-500 dark:border-gray-400 bg-transparent"
                  }`}
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
  val,
  onChange,
  opts,
  placeholder = "",
  label = "",
}: FilterSelectProps) {
  return (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none cursor-pointer max-w-[170px] bg-white dark:bg-gray-800 ${
        val
          ? "border-primary text-primary"
          : "border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400"
      }`}
    >
      <option value="">{placeholder || label}</option>
      {opts.map((o: FilterOption, i: number) => {
        const label = typeof o === "object" ? o.name || o.label : o;
        const value = String(typeof o === "object" ? o.id || o.value || "" : o);
        const key =
          typeof o === "object"
            ? String(o.id || o.name || `fopt-${i}`)
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

function DateRangePicker({ date, setDate, label, T }: DateRangePickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <DatePicker
            T={T}
            date={date?.from}
            setDate={(d) => setDate({ ...date, from: d })}
            label=""
          />
        </div>
        <div className="flex-1">
          <DatePicker
            T={T}
            date={date?.to}
            setDate={(d) => setDate({ from: date?.from, to: d })}
            label=""
          />
        </div>
      </div>
    </div>
  );
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
      onClick={() => exportToExcel(filtered, kpi, user, filterLabel, "kanban")}
      className="bg-emerald-500 text-white border-none px-3 py-1.5 rounded-lg text-[11px] h-8 font-semibold cursor-pointer flex items-center gap-1 transition-[filter] duration-100 hover:brightness-90"
    >
      <FileText size={13} /> EXCEL
    </button>
  </div>
);

// ── KANBAN ─────────────────────────────────────────────────────
export default function KanbanPage({
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
  taskTypes = [],
}: KanbanPageProps) {
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

  const filtered = tasks.filter((t: KanbanTask) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    const sectorVal =
      t.sector && typeof t.sector === "object"
        ? t.sector?.name
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
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50">
            Quadro de Tarefas
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
            {filtered.length} de {tasks.length} tarefas
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <ExportButtons
            filtered={filtered}
            kpi={getKpiData(filtered, users)}
            users={users}
          />
          {canCreate && (
            <button
              onClick={onNew}
              className="flex items-center h-8 gap-1.5 px-4 py-2.5 bg-primary text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer"
            >
              <Plus size={15} />
              Nova Tarefa
            </button>
          )}
        </div>
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
        taskTypes={taskTypes}
        sectors={sectors}
        citiesNeighborhoods={citiesNeighborhoods}
        onClear={clearAll}
        totalTasks={tasks.length}
        filteredTasks={filtered.length}
      />

      {/* Colunas */}
      <div className="flex gap-3.5 overflow-x-auto pb-2">
        {cols.map((col) => {
          const colTasks = filtered.filter((t: KanbanTask) => t.status === col);
          return (
            <div key={col} className="shrink-0 w-[272px]">
              <div className="flex items-center gap-2 mb-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: STATUS_COLOR[col] }}
                />
                <span className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                  {col}
                </span>
                <span className="ml-auto text-[11px] px-2 py-px rounded-[20px] bg-slate-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                  {colTasks.length}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-gray-900 rounded-xl p-2 min-h-[200px] flex flex-col gap-2">
                {colTasks.map((t: KanbanTask) => {
                  const prog = t.subtasks?.length
                    ? (t.subtasks.filter((s: Subtask) => s.done).length /
                        t.subtasks.length) *
                      100
                    : 0;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelect(t)}
                      className={`bg-white dark:bg-gray-800 rounded-[10px] p-3 border transition-all duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-px cursor-pointer ${
                        t.parent_id
                          ? "border-primary/50 border-l-4 shadow-sm bg-primary/5 dark:bg-primary/5"
                          : "border-slate-200 dark:border-gray-700"
                      }`}
                    >
                      {t.parent_id && (
                        <div className="text-[10px] text-primary/80 dark:text-primary font-medium mb-1.5 flex items-center gap-1">
                          <span className="text-xs">↳</span>
                          <span>
                            de:{" "}
                            <b>
                              {t.parent?.title ||
                                tasks.find(
                                  (p: KanbanTask) => p.id === t.parent_id,
                                )?.title ||
                                "..."}
                            </b>
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between mb-[7px]">
                        <span className="text-[10px] px-[7px] py-0.5 rounded-md bg-slate-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-1">
                          {t.type}
                          {getTaskState(t) && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: getTaskState(t)!.color,
                              }}
                            />
                          )}
                        </span>
                        <span
                          className="text-[10px] px-[7px] py-0.5 rounded-md font-bold"
                          style={{
                            background: PRIO_COLOR[t.priority || ""] + "22",
                            color: PRIO_COLOR[t.priority || ""],
                          }}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 mb-[7px] leading-[1.3]">
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="text-[11px] text-slate-500 dark:text-gray-400 mb-[7px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {t.description}
                        </div>
                      )}
                      {getTaskState(t) && (
                        <div className="mb-[7px]">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background: getTaskState(t)!.color + "22",
                              color: getTaskState(t)!.color,
                            }}
                          >
                            {getTaskState(t)!.label}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-[3px] mb-[7px]">
                        <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1">
                          <Building2 size={9} />
                          {sectorDisplay(t.sector)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1">
                          <User size={9} />
                          {t.responsible && typeof t.responsible === "object"
                            ? t.responsible.name
                            : t.responsible || "Não atribuído"}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={9} />
                          {typeof t.contract === "object"
                            ? t.contract?.name
                            : t.contract}
                        </span>
                        {t.city && (
                          <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1 pl-[13px]">
                            {typeof t.city === "object" ? t.city?.name : t.city}
                            {t.nucleus ? ` · ${t.nucleus}` : ""}
                          </span>
                        )}
                        {(t.quadra || t.lote) && (
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 pl-[13px]">
                            {t.quadra ? `Q: ${t.quadra} ` : ""}
                            {t.lote ? `L: ${t.lote}` : ""}
                          </span>
                        )}
                      </div>
                      {t.deadline && (
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-[3px] mb-1.5">
                          <Calendar size={9} />
                          Prazo:{" "}
                          <b className="text-slate-900 dark:text-gray-50">
                            {t.deadline}
                          </b>
                        </div>
                      )}
                      {(t.subtasks?.length ?? 0) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-gray-400 mb-[3px]">
                            <span>Subtarefas</span>
                            <span>
                              {
                                t.subtasks!.filter((s: Subtask) => s.done)
                                  .length
                              }
                              /{t.subtasks!.length}
                            </span>
                          </div>
                          <div className="h-[3px] bg-slate-200 dark:bg-gray-700 rounded">
                            <div
                              className="h-full bg-primary rounded"
                              style={{ width: `${prog}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {(t.time ?? 0) > 0 && (
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-[3px] mt-1.5">
                          <Clock size={9} />
                          {fmtTime(t.time ?? 0)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-[30px] text-xs text-slate-500 dark:text-gray-400">
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
