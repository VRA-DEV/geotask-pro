"use client";

import { ArrowLeft, Check, Eye, FileText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { exportToExcel, exportToPDF, getKpiData } from "@/lib/exportUtils";

const STATUS_COLOR: Record<string, string> = {
  "A Fazer": "#6366f1",
  "Em Andamento": "#f59e0b",
  Pausado: "#ef4444",
  "Concluído": "#10b981",
};

const ExportButtons = ({ filtered, kpi, users, user, filterLabel }: any) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => exportToExcel(filtered, kpi, user, filterLabel)}
      className="flex items-center gap-1 border-none bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg cursor-pointer transition-[filter] duration-100 hover:brightness-90"
    >
      <FileText size={13} /> EXCEL
    </button>
    <button
      onClick={() => exportToPDF(filtered, kpi, users, user, filterLabel)}
      className="flex items-center gap-1 border-none bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg cursor-pointer transition-[filter] duration-100 hover:brightness-90"
    >
      <FileText size={13} /> PDF
    </button>
  </div>
);

export default function MindMapPage({ T, tasks = [], users = [] }: any) {
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

  const contract = CONTRACTS_MM.find((c: any) => c.id === sel.contractId);
  const cities = contract?.cities || [];
  const city = cities.find((c: any) => c.id === sel.cityId);
  const neighborhoods = city?.neighborhoods || [];
  const neighborhood = neighborhoods.find((n: any) => n.id === sel.neighborhoodId);
  const taskList = neighborhood?.tasks || [];
  const task = taskList.find((t: any) => t.id === sel.taskId);
  const subtasks = task?.subtasks || [];
  const setRef = (key: any, el: any) => {
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
    const ge = (key: any) => {
      const el = nodeRefs.current[key];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        rx: r.right - cRect.left + sl,
        lx: r.left - cRect.left + sl,
        my: r.top + r.height / 2 - cRect.top + st,
      };
    };
    const cn = (fk: any, tk: any, a: any) => {
      const f = ge(fk),
        t2 = ge(tk);
      if (f && t2)
        nl.push({ x1: f.rx, y1: f.my, x2: t2.lx, y2: t2.my, active: a });
    };
    if (sel.contractId != null)
      cities.forEach((c: any) =>
        cn(`contract-${sel.contractId}`, `city-${c.id}`, c.id === sel.cityId),
      );
    if (sel.cityId != null)
      neighborhoods.forEach((n: any) =>
        cn(`city-${sel.cityId}`, `neigh-${n.id}`, n.id === sel.neighborhoodId),
      );
    if (sel.neighborhoodId != null)
      taskList.forEach((t: any) =>
        cn(`neigh-${sel.neighborhoodId}`, `task-${t.id}`, t.id === sel.taskId),
      );
    if (sel.taskId != null)
      subtasks.forEach((s: any) => cn(`task-${sel.taskId}`, `sub-${s.id}`, true));
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
  const Node = ({ id, label, sub, color, selected, onClick }: any) => (
    <div
      ref={(el) => setRef(id, el)}
      onClick={onClick}
      className="rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-[180ms] select-none"
      style={{
        background: selected ? color : T.card,
        border: `2px solid ${selected ? color : T.border}`,
        boxShadow: selected ? `0 0 0 4px ${color}28` : "none",
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
        className="text-xs font-bold leading-[1.4]"
        style={{
          color: selected ? "white" : T.text,
          marginBottom: sub ? 3 : 0,
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="text-[10px]"
          style={{
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
      <div className="flex justify-between items-start mb-3">
        <div>
          <h1
            className="m-0 text-[22px] font-bold"
            style={{ color: T.text }}
          >
            Mapa de Tarefas
          </h1>
          <p
            className="mt-1 mb-0 text-[13px]"
            style={{ color: T.sub }}
          >
            Clique nos nos para expandir a hierarquia
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ExportButtons
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
              className="flex items-center gap-[5px] px-3 py-[7px] rounded-lg text-xs cursor-pointer"
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                color: T.sub,
              }}
            >
              <ArrowLeft size={13} />
              Resetar
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-3">
        {[
          ["Contrato", LC[0]],
          ["Cidade", LC[1]],
          ["Bairro", LC[2]],
          ["Tarefa", LC[3]],
          ["Subtarefa", LC[4]],
        ].map(([l, c]) => (
          <div
            key={l}
            className="flex items-center gap-[5px] text-[11px]"
            style={{ color: T.sub }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: c }}
            />
            {l}
          </div>
        ))}
      </div>
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] min-h-[300px] rounded-2xl p-7 px-5"
        style={{
          background: T.mmBg,
          border: `1px solid ${T.border}`,
        }}
      >
        <svg
          className="absolute top-0 left-0 pointer-events-none z-0"
          style={{
            width: svgDim.w,
            height: svgDim.h,
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
          className="relative z-[1] inline-flex items-start min-w-full"
          style={{ gap: CG }}
        >
          <div
            className="flex flex-col gap-2 shrink-0"
            style={{ width: CW }}
          >
            <div
              className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
              style={{ color: LC[0] }}
            >
              <div
                className="w-[7px] h-[7px] rounded-full"
                style={{ background: LC[0] }}
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
              className="flex flex-col gap-2 shrink-0"
              style={{ width: CW }}
            >
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[1] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[1] }}
                />
                Cidades
              </div>
              {cities.map((c: any) => (
                <Node
                  key={c.id}
                  id={`city-${c.id}`}
                  label={c.name}
                  sub={`${c.neighborhoods.length} bairro(s)`}
                  color={LC[1]}
                  selected={sel.cityId === c.id}
                  onClick={() =>
                    setSel((s: any) => ({
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
              className="flex flex-col gap-2 shrink-0"
              style={{ width: CW }}
            >
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[2] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[2] }}
                />
                Bairros
              </div>
              {neighborhoods.map((n: any) => (
                <Node
                  key={n.id}
                  id={`neigh-${n.id}`}
                  label={n.name}
                  sub={`${n.tasks.length} tarefa(s)`}
                  color={LC[2]}
                  selected={sel.neighborhoodId === n.id}
                  onClick={() =>
                    setSel((s: any) => ({
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
              className="flex flex-col gap-2 shrink-0"
              style={{ width: CW + 20 }}
            >
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[3] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[3] }}
                />
                Tarefas
              </div>
              {taskList.length === 0 && (
                <div
                  className="text-xs text-center p-5"
                  style={{ color: T.sub }}
                >
                  Sem tarefas
                </div>
              )}
              {taskList.map((t: any) => {
                const sc = STATUS_COLOR[t.status],
                  isSel = sel.taskId === t.id;
                return (
                  <div
                    key={t.id}
                    ref={(el) => setRef(`task-${t.id}`, el)}
                    className="rounded-xl px-3 py-2.5 transition-all duration-[180ms]"
                    style={{
                      background: isSel ? LC[3] : T.card,
                      border: `2px solid ${isSel ? LC[3] : T.border}`,
                    }}
                  >
                    <div
                      onClick={() =>
                        setSel((s: any) => ({
                          ...s,
                          taskId: t.id === s.taskId ? null : t.id,
                        }))
                      }
                      className="cursor-pointer mb-2"
                    >
                      <div
                        className="text-xs font-bold leading-[1.4] mb-[5px]"
                        style={{
                          color: isSel ? "white" : T.text,
                        }}
                      >
                        {t.title}
                      </div>
                      <span
                        className="text-[10px] px-[7px] py-[2px] rounded-full font-semibold"
                        style={{
                          background: sc + "33",
                          color: isSel ? "white" : sc,
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
                      className="w-full px-2 py-[5px] rounded-[7px] text-[11px] font-bold cursor-pointer flex items-center justify-center gap-[5px]"
                      style={{
                        background: isSel
                          ? "rgba(255,255,255,0.2)"
                          : "#98af3b11",
                        border: `1px solid ${isSel ? "rgba(255,255,255,0.3)" : "#98af3b33"}`,
                        color: isSel ? "white" : "#98af3b",
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
              className="flex flex-col gap-2 shrink-0"
              style={{ width: CW }}
            >
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[4] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[4] }}
                />
                Subtarefas
              </div>
              {subtasks.length === 0 && (
                <div
                  className="text-xs text-center p-5"
                  style={{ color: T.sub }}
                >
                  Sem subtarefas
                </div>
              )}
              {subtasks.map((s: any) => (
                <div
                  key={s.id}
                  ref={(el) => setRef(`sub-${s.id}`, el)}
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    background: s.done ? LC[4] : T.card,
                    border: `2px solid ${s.done ? LC[4] : T.border}`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-px"
                      style={{
                        background: s.done
                          ? "rgba(255,255,255,0.3)"
                          : "transparent",
                        border: s.done ? "none" : `2px solid ${T.border}`,
                      }}
                    >
                      {s.done && <Check size={9} color="white" />}
                    </div>
                    <div>
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color: s.done ? "white" : T.text,
                        }}
                      >
                        {s.title}
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{
                          color: s.done ? "rgba(255,255,255,0.65)" : T.sub,
                        }}
                      >
                        {s.done ? "Concluida" : "Pendente"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetail(task)}
                    className="w-full px-2 py-1 rounded-[7px] text-[11px] font-bold cursor-pointer flex items-center justify-center gap-[5px]"
                    style={{
                      background: s.done
                        ? "rgba(255,255,255,0.18)"
                        : "#10b98111",
                      border: `1px solid ${s.done ? "rgba(255,255,255,0.3)" : "#10b98133"}`,
                      color: s.done ? "white" : "#10b981",
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
          className="text-center p-5 text-[13px]"
          style={{ color: T.sub }}
        >
          Clique em um contrato para comecar a expandir o mapa
        </div>
      )}
      {detail && (
        <div
          onClick={() => setDetail(null)}
          className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 font-[system-ui,sans-serif]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[500px] rounded-[20px] p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span
                  className="text-[11px] font-semibold px-2.5 py-[3px] rounded-full"
                  style={{
                    background: STATUS_COLOR[detail.status] + "22",
                    color: STATUS_COLOR[detail.status],
                  }}
                >
                  {detail.status}
                </span>
                <h2
                  className="mt-1.5 mb-0 text-lg font-bold"
                  style={{ color: T.text }}
                >
                  {detail.title}
                </h2>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="border-none rounded-lg p-1.5 cursor-pointer"
                style={{ background: T.inp }}
              >
                <X size={16} color={T.sub} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                ["Tipo", detail.type],
                ["Prioridade", detail.priority],
                ["Setor", detail.sector],
                ["Responsavel", detail.responsible],
                ["Contrato", detail.contract],
                ["Prazo", detail.deadline || "\u2014"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-lg px-3 py-2"
                  style={{ background: T.inp }}
                >
                  <div
                    className="text-[10px] font-semibold mb-0.5"
                    style={{ color: T.sub }}
                  >
                    {k.toUpperCase()}
                  </div>
                  <div
                    className="text-[13px] font-semibold"
                    style={{ color: T.text }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            {detail.subtasks?.length > 0 && (
              <div>
                <div
                  className="text-[11px] font-bold mb-2"
                  style={{ color: T.sub }}
                >
                  SUBTAREFAS
                </div>
                {detail.subtasks.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-2.5 py-[7px] rounded-lg mb-[5px]"
                    style={{ background: T.inp }}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{
                        background: s.done ? "#10b981" : "transparent",
                        border: s.done ? "none" : `1px solid ${T.border}`,
                      }}
                    >
                      {s.done && <Check size={10} color="white" />}
                    </div>
                    <span
                      className="text-[13px]"
                      style={{
                        color: s.done ? T.sub : T.text,
                        textDecoration: s.done ? "line-through" : "none",
                      }}
                    >
                      {s.title}
                    </span>
                    <span
                      className="ml-auto text-[10px] font-semibold"
                      style={{
                        color: s.done ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {s.done ? "Concluida" : "Pendente"}
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
