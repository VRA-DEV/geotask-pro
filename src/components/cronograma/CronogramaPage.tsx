"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { TASK_TYPES } from "@/lib/constants";
import { exportToExcel, exportToPDF, getKpiData } from "@/lib/exportUtils";
import { DatePicker } from "@/app/components/DatePicker";

// ── ExportButtons (inline) ───────────────────────────────────────
const ExportButtons = ({ filtered, kpi, users, user, filterLabel }: any) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => exportToExcel(filtered, kpi, user, filterLabel)}
      className="flex items-center gap-1 rounded-lg border-none bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-[filter] duration-100 cursor-pointer"
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      <FileText size={13} /> EXCEL
    </button>
    <button
      onClick={() => exportToPDF(filtered, kpi, users, user, filterLabel)}
      className="flex items-center gap-1 rounded-lg border-none bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-[filter] duration-100 cursor-pointer"
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      <FileText size={13} /> PDF
    </button>
  </div>
);

// ── MultiSelect (inline) ─────────────────────────────────────────
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
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="flex min-w-[140px] max-w-[200px] cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
        style={{
          border: `1px solid ${val.length > 0 ? "#98af3b" : T.border}`,
          background: T.card,
          color: val.length > 0 ? "#98af3b" : T.sub,
        }}
      >
        <span className="truncate">
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
          className="absolute top-full left-0 z-[9999] mt-1 min-w-[180px] max-h-[300px] overflow-y-auto rounded-lg p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
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
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs"
                style={{
                  color: T.text,
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
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-sm"
                  style={{
                    border: `1px solid ${selected ? "#98af3b" : T.sub}`,
                    background: selected ? "#98af3b" : "transparent",
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

// ── FilterSelect (inline) ────────────────────────────────────────
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
      className="max-w-[170px] cursor-pointer rounded-lg px-2.5 py-1.5 text-xs outline-none"
      style={{
        border: `1px solid ${val ? "#98af3b" : T.border}`,
        background: T.card,
        color: val ? "#98af3b" : T.sub,
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

// ── DateRangePicker (inline) ─────────────────────────────────────
function DateRangePicker({ date, setDate, label, T }: any) {
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
            setDate={(d) => setDate({ ...date, to: d })}
            label=""
          />
        </div>
      </div>
    </div>
  );
}

// ── CronogramaPage ───────────────────────────────────────────────
export default function CronogramaPage({
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

      {/* Filters */}
      <div className="mb-5">
        <div className="mb-2.5 flex gap-2.5">
          <div
            className="flex flex-1 items-center gap-2.5 rounded-lg px-3"
            style={{
              background: T.inp,
              border: `1px solid ${T.border}`,
            }}
          >
            <Search size={16} color={T.sub} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa..."
              className="w-full border-none bg-transparent py-2.5 text-[13px] outline-none"
              style={{ color: T.text }}
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold"
            style={{
              background: filtersOpen ? "#98af3b" : T.card,
              border: `1px solid ${filtersOpen ? "#98af3b" : T.border}`,
              color: filtersOpen ? "white" : T.text,
            }}
          >
            <Filter size={14} />
            Filtros
            {activeAdvancedFilters > 0 && (
              <span
                className="ml-0.5 rounded-[10px] px-[5px] py-px text-[10px]"
                style={{
                  background: filtersOpen ? "white" : "#98af3b",
                  color: filtersOpen ? "#98af3b" : "white",
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
            className="grid grid-cols-4 gap-3 rounded-xl p-4"
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
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
                    <label className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-gray-400">
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
                        className="w-full rounded-lg p-2 text-[13px]"
                        style={{
                          border: `1px solid ${T.border}`,
                          background: f.disabled ? T.col : T.inp,
                          color: f.disabled ? T.sub : T.text,
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
            <div className="col-span-full mt-2 flex justify-end">
              <button
                onClick={clearAll}
                className="cursor-pointer border-none bg-transparent px-4 py-2 text-[13px] font-semibold text-red-500"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className="mb-4 flex flex-wrap gap-4 rounded-[10px] px-3.5 py-2.5"
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
        }}
      >
        {evts.map((e) => (
          <div
            key={e.k}
            className="flex items-center gap-[5px]"
          >
            <div
              className="h-[9px] w-[9px] rounded-full"
              style={{ background: e.c }}
            />
            <span className="text-[11px] text-slate-500 dark:text-gray-400">{e.l}</span>
          </div>
        ))}
      </div>
      <div
        className="overflow-hidden rounded-[14px]"
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          className="grid px-4 py-2.5"
          style={{
            gridTemplateColumns: "200px 1fr",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
            TAREFA
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
            LINHA DO TEMPO
          </span>
        </div>
        {filtered.map((t: any, i: number) => (
          <div
            key={t.id}
            onClick={() => onSelect(t)}
            className="grid cursor-pointer items-center px-4 py-3"
            style={{
              gridTemplateColumns: "200px 1fr",
              borderBottom:
                i < tasks.length - 1 ? `1px solid ${T.border}` : "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div className="pr-3">
              <div className="truncate text-[13px] font-medium" style={{ color: T.text }}>
                {t.title}
              </div>
              <div className="mt-px text-[11px]" style={{ color: T.sub }}>
                {t.responsible && typeof t.responsible === "object"
                  ? t.responsible.name
                  : t.responsible || "Não atribuído"}
              </div>
            </div>
            <div className="flex items-center overflow-x-auto">
              {evts.map((ev, ei) => {
                const val = t[ev.k];
                if (!val) return null;
                const prev = evts.slice(0, ei).find((pe) => t[pe.k]);
                return (
                  <div
                    key={ev.k}
                    className="flex shrink-0 items-center"
                  >
                    {prev && (
                      <div
                        className="h-px w-7"
                        style={{ background: T.border }}
                      />
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
                      <span className="whitespace-nowrap text-[9px]" style={{ color: T.sub }}>
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
                    className="mx-3 h-6 w-px shrink-0"
                    style={{ background: T.border }}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold uppercase text-red-500">
                      Histórico de Pausas
                    </div>
                    <div className="flex gap-2">
                      {t.pauses.map((p: any, pi: number) => (
                        <div
                          key={pi}
                          className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px]"
                          style={{
                            color: T.sub,
                            background: T.inp,
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
