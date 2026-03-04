"use client";

import { PRIORITIES, SECTORS, TASK_TYPES } from "@/lib/constants";
import type { CitiesNeighborhoods, ThemeColors, User } from "@/types";
import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { DateRangePicker, FilterSelect, MultiSelect } from "./FilterInputs";

interface TaskFiltersProps {
  T: ThemeColors;
  search: string;
  setSearch: (v: string) => void;
  status?: string;
  setStatus?: (v: string) => void;
  sector: string[];
  setSector: (v: string[]) => void;
  priority: string;
  setPriority: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  contract: string;
  setContract: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  neighbor: string;
  setNeighbor: (v: string) => void;
  responsible?: string;
  setResponsible?: (v: string) => void;
  dateFrom: DateRange | undefined;
  setDateFrom: (v: DateRange | undefined) => void;
  dateTo: DateRange | undefined;
  setDateTo: (v: DateRange | undefined) => void;
  users?: User[];
  contracts?: string[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  onClear: () => void;
  totalTasks: number;
  filteredTasks: number;
}

export function TaskFilters({
  T,
  search,
  setSearch,
  status,
  setStatus,
  sector,
  setSector,
  priority,
  setPriority,
  type,
  setType,
  contract,
  setContract,
  city,
  setCity,
  neighbor,
  setNeighbor,
  responsible,
  setResponsible,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  onClear,
  totalTasks,
  filteredTasks,
}: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const cityNeighborhoods = city ? citiesNeighborhoods[city] || [] : [];

  const activeCount = [
    status,
    sector.length > 0,
    priority,
    type,
    contract,
    city,
    neighbor,
    responsible,
    dateFrom?.from || dateFrom?.to,
    dateTo?.from || dateTo?.to,
  ].filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm mb-6 transition-all">
      {/* Top Bar: Search and Quick Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        {/* Search */}
        <div className="flex flex-col gap-1.5 flex-1 w-full">
          <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
            Buscar
          </label>
          <div className="relative group w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o título, descrição ou código..."
              className="h-10 w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl pl-10 pr-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-slate-900 dark:text-gray-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap sm:flex-nowrap gap-3 items-end w-full lg:w-auto">
          {setStatus && (
            <div className="w-[160px]">
              <FilterSelect
                label="Status"
                val={status || ""}
                onChange={setStatus}
                opts={["A Fazer", "Em Andamento", "Pausado", "Concluído"]}
                placeholder="Todos"
              />
            </div>
          )}
          <div className="w-[160px]">
            <MultiSelect
              label="Setores"
              val={sector}
              onChange={setSector}
              opts={SECTORS}
              placeholder="Todos"
            />
          </div>
          <div className="w-[150px]">
            <FilterSelect
              label="Prioridade"
              val={priority}
              onChange={setPriority}
              opts={PRIORITIES}
              placeholder="Todas"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                isOpen || activeCount > 3
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-600"
              }`}
            >
              <Filter size={15} />
              <span>Mais Filtros</span>
              {activeCount > 0 && (
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${isOpen ? "bg-white text-primary" : "bg-primary text-white"}`}
                >
                  {activeCount}
                </span>
              )}
            </button>
            {(search || activeCount > 0) && (
              <button
                onClick={onClear}
                className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
              >
                <X size={15} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Filters Overlay */}
      {isOpen && (
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-gray-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5 animate-in slide-in-from-top-2 duration-200">
          <FilterSelect
            label="Contrato"
            val={contract}
            onChange={setContract}
            opts={contracts}
            placeholder="Todos"
          />
          <FilterSelect
            label="Cidade"
            val={city}
            onChange={(v) => {
              setCity(v);
              setNeighbor("");
            }}
            opts={Object.keys(citiesNeighborhoods).sort()}
            placeholder="Todas"
          />
          <FilterSelect
            label="Bairro"
            val={neighbor}
            onChange={setNeighbor}
            opts={cityNeighborhoods}
            placeholder={city ? "Todos" : "Selecione cidade"}
            disabled={!city}
          />
          <FilterSelect
            label="Tipo"
            val={type}
            onChange={setType}
            opts={TASK_TYPES}
            placeholder="Todos"
          />
          {setResponsible && (
            <FilterSelect
              label="Responsável"
              val={responsible || ""}
              onChange={setResponsible}
              opts={users.map((u) => u.name)}
              placeholder="Todos"
            />
          )}
          <div className="lg:col-span-1">
            <DateRangePicker
              label="Prazo"
              date={dateFrom}
              setDate={setDateFrom}
              T={T}
            />
          </div>
          <div className="lg:col-span-1">
            <DateRangePicker
              label="Criação"
              date={dateTo}
              setDate={setDateTo}
              T={T}
            />
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-gray-500">
        <span className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600" />
          Exibindo {filteredTasks} de {totalTasks} tarefas
        </span>
        {search && (
          <span className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-primary" />
            Busca: "{search}"
          </span>
        )}
      </div>
    </div>
  );
}
