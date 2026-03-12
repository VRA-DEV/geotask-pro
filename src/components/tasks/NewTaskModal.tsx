"use client";

import { DatePicker } from "@/app/components/DatePicker";
import { FormField } from "@/components/ui/FormField";
import { FormInput, FormTextarea } from "@/components/ui/FormInput";
import { FormSelect } from "@/components/ui/FormSelect";
import { PRIORITIES } from "@/lib/constants";
import { type ThemeColors, parseDateStr } from "@/lib/helpers";
import { getPermissions } from "@/lib/permissions";
import type {
  CitiesNeighborhoods,
  Sector,
  Template,
  TemplateTask,
  User,
} from "@/types";
import { Check, Link, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import TeamSelectionModal from "./TeamSelectionModal";

// ── Local types for form state ───────────────────────────────────────

/** A subtask draft as held in local form state (before persisting). */
interface SubtaskDraft {
  id: number;
  title: string;
  description?: string;
  sector: string;
  responsible: string;
  done?: boolean;
  priority?: string;
  type?: string;
  deadline?: string;
  contract?: string;
  city?: string;
  nucleus?: string;
  quadra?: string;
  lote?: string;
  responsible_id?: number | null;
  sector_id?: number | null;
}

/** State for the inline "new subtask" mini-form. */
interface SubForm {
  title: string;
  description: string;
  sector: string;
  responsible: string;
}

/** Shape of the main task form. */
interface FormState {
  title: string;
  description: string;
  priority: string;
  type: string;
  deadline: string;
  link: string;
  contract: string;
  city: string;
  nucleus: string;
  quadra: string;
  lote: string;
  sector: string;
  responsible: string;
  coworkers: number[];
  subtasks: SubtaskDraft[];
}

/**
 * Enriched template subtask — the API may include resolved `sector` /
 * `responsible` relations that are not on the base TemplateSubtask type.
 */
interface EnrichedTemplateSubtask {
  id: number;
  title: string;
  order_index: number;
  template_task_id: number;
  sector_id?: number | null;
  responsible_id?: number | null;
  sector?: Sector | string | null;
  responsible?: User | string | null;
}

/** Enriched template — may carry a resolved `sector` relation. */
interface EnrichedTemplate extends Omit<Template, "tasks"> {
  sector?: Sector | string | null;
  tasks?: (Omit<TemplateTask, "subtasks"> & {
    subtasks?: EnrichedTemplateSubtask[];
  })[];
}

// ── Component props ──────────────────────────────────────────────────

interface NewTaskModalProps {
  T: ThemeColors;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  users?: User[];
  user?: User | null;
  contracts?: string[];
  taskTypes?: { id: number; name: string }[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  templates?: EnrichedTemplate[];
  sectors?: Sector[];
}

export default function NewTaskModal({
  T,
  onClose,
  onSave,
  user,
  users = [],
  contracts = [],
  taskTypes = [],
  citiesNeighborhoods = {},
  templates = [],
  sectors = [],
}: NewTaskModalProps) {
  const empty: FormState = {
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
    coworkers: [] as number[],
    subtasks: [] as SubtaskDraft[],
  };
  const [form, setForm] = useState<FormState>(empty);
  const [step, setStep] = useState(0);
  const [subForm, setSubForm] = useState<SubForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const set = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const applyTemplate = (tplId: string) => {
    setSelectedTemplate(tplId);
    if (!tplId) {
      setForm(empty);
      return;
    }
    const tpl = templates.find((t: EnrichedTemplate) => String(t.id) === tplId);
    if (!tpl) return;

    // TemplateTask has no sector in schema — only tpl.sector (template-level) is stored.
    const templateSectorObj =
      typeof tpl.sector === "object" ? tpl.sector : null;
    const templateSectorName: string | undefined = templateSectorObj
      ? templateSectorObj.name
      : typeof tpl.sector === "string"
        ? tpl.sector
        : undefined;
    const templateSectorId = templateSectorObj
      ? templateSectorObj.id
      : tpl.sector_id;

    // First task title becomes the main task title; rest become subtasks
    const firstTask = tpl.tasks?.[0];
    const mainTitle = firstTask?.title || tpl.name;

    // Pre-fill responsible from users matching template sector (robust check)
    // Find the actual sector object from dbSectors if possible
    const foundSector = sectors.find(
      (s: Sector) =>
        String(s.id) === String(templateSectorId) ||
        String(s.name).toLowerCase().trim() ===
          String(templateSectorName).toLowerCase().trim(),
    );

    const responsible = foundSector
      ? users.find((u: User) => {
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
        ...(firstTask?.subtasks || []).map((s: EnrichedTemplateSubtask) => {
          // Priority: subtask's own sector -> main task's sector
          const sVal =
            (typeof s.sector === "object"
              ? s.sector?.id || s.sector?.name
              : s.sector) || s.sector_id;
          const fs = sectors.find(
            (sec: Sector) =>
              String(sec.id) === String(sVal) ||
              String(sec.name).toLowerCase().trim() ===
                String(sVal || "")
                  .toLowerCase()
                  .trim(),
          );

          // Priority: subtask's own responsible -> main task's responsible
          const sResp =
            (typeof s.responsible === "object"
              ? s.responsible?.name
              : s.responsible) || responsible;

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
          } as SubtaskDraft;
        }),
        // Include subsequent tasks as subtasks (legacy behavior)
        ...(tpl.tasks || []).slice(1).map(
          (t: TemplateTask) =>
            ({
              id: Date.now() + Math.random(),
              title: t.title,
              sector: foundSector ? String(foundSector.id) : "",
              responsible,
            }) as SubtaskDraft,
        ),
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
    return users.filter((u: User) => {
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
    return users.filter((u: User) => {
      const uSName = String(u.sector?.name || u.sector || "")
        .toLowerCase()
        .trim();
      const fSName = String(subForm.sector).toLowerCase().trim();
      const uSid = String(u.sector_id || u.sector?.id || "");
      const fSid = String(subForm.sector);
      return uSName === fSName || uSid === fSid;
    });
  }, [subForm, users]);

  const filteredTaskTypes = useMemo(() => {
    const appPerms = getPermissions(user);

    // Helper para gerar os grupos
    const buildGroups = (types: any[]) => {
      const groups: Record<string, string[]> = { Geral: [] };
      types.forEach((t) => {
        if (!t.sector_id) {
          groups.Geral.push(t.name);
        } else {
          const sec = sectors.find((s: any) => s.id === t.sector_id);
          const secName = sec ? sec.name : "Outros";
          if (!groups[secName]) groups[secName] = [];
          groups[secName].push(t.name);
        }
      });
      return Object.entries(groups)
        .filter(([_, opts]) => opts.length > 0)
        .map(([label, options]) => ({ label, options }));
    };

    if (appPerms.tasks.view_all_sectors) return buildGroups(taskTypes);

    if (!form.sector) return buildGroups(taskTypes);

    const sec = sectors.find(
      (s: any) =>
        String(s.id) === String(form.sector) ||
        String(s.name).toLowerCase() === String(form.sector).toLowerCase(),
    );
    if (!sec) return buildGroups(taskTypes);

    const allowed = taskTypes.filter(
      (t: any) => !t.sector_id || t.sector_id === sec.id,
    );
    return buildGroups(allowed);
  }, [form.sector, taskTypes, sectors, user]);

  const STEPS = [
    "📋 Dados",
    "📍 Localidade",
    "👤 Responsável",
    "🛠️ Subtarefas",
  ];

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) e.title = "Obrigatório";
      if (!form.priority) e.priority = "Obrigatório";
      if (!form.type) e.type = "Obrigatório";
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
    <>
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 font-sans bg-black/65"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full md:max-w-[580px] md:h-auto md:max-h-[92vh] md:rounded-[20px] rounded-none border-0 md:border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
      >
        {/* Header */}
        <div className="px-[22px] py-[18px] border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          <div>
            <h2 className="m-0 text-[17px] font-bold text-gray-900 dark:text-gray-50">
              Nova Tarefa
            </h2>
            <p className="mt-[3px] mb-0 text-xs text-gray-500 dark:text-gray-400">
              Passo {step + 1} de 4 — {STEPS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-100 dark:bg-gray-700 border-none rounded-lg p-1.5 cursor-pointer flex"
          >
            <X size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Template selector */}
        <div
          className={`px-[22px] py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2.5 shrink-0 ${
            selectedTemplate ? "bg-primary/[0.07]" : "bg-white dark:bg-gray-900"
          }`}
        >
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {"📋"} Usar template:
          </span>
          <select
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={templates.length === 0}
            className={`flex-1 px-2.5 py-[5px] rounded-[7px] bg-white dark:bg-gray-800 text-xs outline-none ${
              selectedTemplate
                ? "border border-primary text-primary"
                : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
            } ${
              templates.length === 0
                ? "Nenhum template cadastrado — crie em Templates"
                : "Nenhum (formulário em branco)"
            }`}
          >
            <option value="">
              {templates.length === 0
                ? "Nenhum template cadastrado — crie em Templates"
                : "Nenhum (formulário em branco)"}
            </option>
            {templates.map((tpl: EnrichedTemplate) => (
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
              className="bg-transparent border-none cursor-pointer text-[11px] text-gray-500 dark:text-gray-400"
            >
              {"✕"} Limpar
            </button>
          )}
        </div>

        {/* Step tabs */}
        <div className="flex px-2 md:px-[22px] border-b border-gray-200 dark:border-gray-700 shrink-0 overflow-x-auto no-scrollbar">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                if (i < step) setStep(i);
              }}
              className={`flex-none md:flex-1 whitespace-nowrap px-4 md:px-0 py-2.5 text-[11px] font-bold bg-none border-none border-b-2 transition-all duration-150 ${
                i <= step ? "cursor-pointer" : "cursor-default"
              } ${
                i === step
                  ? "text-primary border-b-primary"
                  : i < step
                    ? "text-emerald-500 border-b-emerald-500"
                    : "text-gray-500 dark:text-gray-400 border-b-transparent"
              }`}
            >
              {i < step ? "✓ " : ""}
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[22px] py-5 flex flex-col gap-3.5">
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
              <div className="grid grid-cols-2 gap-3">
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
                    opts={[]}
                    groups={filteredTaskTypes}
                    err={errors.type}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <FormField label="Contrato">
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
              <div className="grid grid-cols-2 gap-3">
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
                  opts={sectorUsers.map((u: User) => u.name)}
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
                <div className="bg-white dark:bg-gray-900 rounded-[10px] p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2.5 uppercase">
                    Usuários do setor
                  </div>
                  {sectorUsers.map((u: User) => (
                    <div
                      key={u.id}
                      onClick={() => set("responsible", u.name)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 mb-1.5 ${
                        form.responsible === u.name
                          ? "border border-primary bg-primary/[0.07]"
                          : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="w-[30px] h-[30px] rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                        {typeof u.avatar === "string"
                          ? u.avatar
                          : u.name
                            ? u.name.charAt(0)
                            : "?"}
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-50">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {typeof u.role === "object" ? u.role?.name : u.role}
                        </div>
                      </div>
                      {form.responsible === u.name && (
                        <Check size={14} className="text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white dark:bg-gray-900 rounded-[10px] p-3 border border-gray-200 dark:border-gray-700 mt-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Equipe da Tarefa ({(form.coworkers || []).length})
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTeamModalOpen(true)}
                      className="text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-md border-none cursor-pointer transition-colors"
                    >
                      Gerenciar Equipe
                    </button>
                  </div>
                  
                  {(form.coworkers || []).length === 0 ? (
                    <div className="text-[11px] text-gray-400 py-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                      Nenhum outro membro selecionado.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(form.coworkers || []).map((id) => {
                        const u = users.find((user) => user.id === id);
                        if (!u) return null;
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1">
                            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center overflow-hidden">
                              {typeof u.avatar === "string" && u.avatar.startsWith("http") ? (
                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                              ) : u.name ? u.name.charAt(0) : "?"}
                            </div>
                            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 pr-1">{u.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="bg-primary/[0.07] border border-primary/20 rounded-[10px] p-3">
                <div className="text-[11px] font-bold text-primary mb-1.5 uppercase">
                  {"ℹ️"} Herança automática
                </div>
                <div className="flex flex-wrap gap-1.5">
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
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-[3px] text-[11px]"
                    >
                      {k}:{" "}
                      <b className="text-gray-900 dark:text-gray-50">
                        {typeof v === "object"
                          ? (v as Record<string, string>).name ||
                            JSON.stringify(v)
                          : v}
                      </b>
                    </span>
                  ))}
                </div>
              </div>
              {form.subtasks.map((s, i) => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[10px] p-3 flex items-start gap-2.5"
                >
                  <div className="w-[22px] h-[22px] rounded-full bg-primary/[0.07] border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-50">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {(() => {
                        const sVal = s.sector;
                        const found = sectors.find(
                          (sec: Sector) =>
                            String(sec.id) === String(sVal) ||
                            String(sec.name).toLowerCase().trim() ===
                              String(sVal).toLowerCase().trim(),
                        );
                        return found ? found.name : sVal || "—";
                      })()}
                      {s.responsible
                        ? ` · ${(() => {
                            const rVal = s.responsible;
                            const found = users.find(
                              (u: User) =>
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
                    className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer shrink-0"
                  >
                    <Trash2 size={12} className="text-red-500" />
                  </button>
                </div>
              ))}
              {subForm !== null ? (
                <div className="bg-white dark:bg-gray-900 border-[1.5px] border-primary rounded-xl p-3.5 flex flex-col gap-2.5">
                  <div className="text-xs font-bold text-primary">
                    Nova Subtarefa
                  </div>
                  <FormField label="Título" req>
                    <FormInput
                      T={T}
                      value={subForm.title || ""}
                      onChange={(v) =>
                        setSubForm((f: SubForm | null) =>
                          f ? { ...f, title: v } : f,
                        )
                      }
                      placeholder="Título da subtarefa"
                    />
                  </FormField>
                  <FormField label="Descrição">
                    <FormTextarea
                      T={T}
                      value={subForm.description || ""}
                      onChange={(v) =>
                        setSubForm((f: SubForm | null) =>
                          f ? { ...f, description: v } : f,
                        )
                      }
                      rows={2}
                      placeholder="Descrição (opcional)"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-2.5">
                    <FormField label="Setor" req>
                      <FormSelect
                        T={T}
                        val={subForm.sector || ""}
                        onChange={(v) =>
                          setSubForm((f: SubForm | null) =>
                            f
                              ? {
                                  ...f,
                                  sector: v,
                                  responsible: "",
                                }
                              : f,
                          )
                        }
                        opts={sectors}
                      />
                    </FormField>
                    <FormField label="Responsável">
                      <FormSelect
                        T={T}
                        val={subForm.responsible || ""}
                        onChange={(v) =>
                          setSubForm((f: SubForm | null) =>
                            f ? { ...f, responsible: v } : f,
                          )
                        }
                        opts={subSectorUsers.map((u: User) => u.name)}
                        placeholder={
                          subForm.sector
                            ? subSectorUsers.length
                              ? "Responsável..."
                              : "Nenhum usuário neste setor"
                            : "Setor primeiro..."
                        }
                      />
                    </FormField>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSubForm(null)}
                      className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-none rounded-lg text-[13px] font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addSub}
                      className="flex-[2] p-2 bg-primary text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer"
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
                  className="p-2.5 bg-transparent border-[1.5px] border-dashed border-primary rounded-[10px] text-[13px] font-semibold text-primary cursor-pointer flex items-center justify-center gap-1.5 hover:bg-primary/[0.03]"
                >
                  <Plus size={15} />
                  Adicionar Subtarefa
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-[22px] py-3.5 border-t border-gray-200 dark:border-gray-700 flex gap-2 shrink-0">
          {step > 0 && (
            <button
              onClick={prev}
              className="px-[18px] py-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-none rounded-lg text-[13px] font-semibold cursor-pointer"
            >
              {"\u2190"} Voltar
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={next}
              className="px-[22px] py-[9px] bg-primary text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer"
            >
              Próximo {"\u2192"}
            </button>
          ) : (
            <button
              onClick={() => {
                // Resolve IDs
                const respUser = users.find(
                  (u: User) => u.name === form.responsible,
                );
                const resolvedSubtasks = (form.subtasks || []).map(
                  (s: SubtaskDraft) => {
                    const subUser = users.find(
                      (u: User) => u.name === s.responsible,
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
                  },
                );

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
              className="px-[22px] py-[9px] bg-emerald-500 text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} />
              Criar Tarefa
            </button>
          )}
        </div>
      </div>
      {isTeamModalOpen && (
        <TeamSelectionModal
          T={T}
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          onSave={(selectedIds) => setForm(prev => ({ ...prev, coworkers: selectedIds }))}
          users={users}
          sectors={sectors}
          initialSelectedIds={form.coworkers}
          mainResponsibleId={users.find(u => u.name === form.responsible)?.id}
        />
      )}
    </div>
    </>
  );
}
