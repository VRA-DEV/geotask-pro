"use client";

import { Check, Link, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "@/app/components/DatePicker";
import { FormField } from "@/components/ui/FormField";
import { FormInput, FormTextarea } from "@/components/ui/FormInput";
import { FormSelect } from "@/components/ui/FormSelect";
import { TASK_TYPES, PRIORITIES } from "@/lib/constants";
import { type ThemeColors, parseDateStr } from "@/lib/helpers";

export default function NewTaskModal({
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
    "\u{1F4CB} Dados",
    "\u{1F4CD} Localidade",
    "\u{1F464} Respons\u00E1vel",
    "\u{1F527} Subtarefas",
  ];

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) e.title = "Obrigat\u00F3rio";
      if (!form.priority) e.priority = "Obrigat\u00F3rio";
      if (!form.type) e.type = "Obrigat\u00F3rio";
    }
    if (step === 1) {
      if (!form.contract) e.contract = "Obrigat\u00F3rio";
    }
    if (step === 2) {
      if (!form.sector) e.sector = "Obrigat\u00F3rio";
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans bg-black/65"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[580px] rounded-[20px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 max-h-[92vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
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
            selectedTemplate
              ? "bg-primary/[0.07]"
              : "bg-white dark:bg-gray-900"
          }`}
        >
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {"\u{1F4CB}"} Usar template:
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
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer opacity-100"
            }`}
          >
            <option value="">
              {templates.length === 0
                ? "Nenhum template cadastrado — crie em Templates"
                : "Nenhum (formul\u00E1rio em branco)"}
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
              className="bg-transparent border-none cursor-pointer text-[11px] text-gray-500 dark:text-gray-400"
            >
              {"\u2715"} Limpar
            </button>
          )}
        </div>

        {/* Step tabs */}
        <div className="flex px-[22px] border-b border-gray-200 dark:border-gray-700 shrink-0">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                if (i < step) setStep(i);
              }}
              className={`flex-1 py-2.5 text-[11px] font-bold bg-none border-none border-b-2 transition-all duration-150 ${
                i <= step ? "cursor-pointer" : "cursor-default"
              } ${
                i === step
                  ? "text-primary border-b-primary"
                  : i < step
                    ? "text-emerald-500 border-b-emerald-500"
                    : "text-gray-500 dark:text-gray-400 border-b-transparent"
              }`}
            >
              {i < step ? "\u2713 " : ""}
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[22px] py-5 flex flex-col gap-3.5">
          {step === 0 && (
            <>
              <FormField label="T\u00EDtulo da Tarefa" req err={errors.title}>
                <FormInput
                  T={T}
                  value={form.title}
                  onChange={(v) => set("title", v)}
                  placeholder="Ex: Vistoria de regulariza\u00E7\u00E3o"
                />
              </FormField>
              <FormField label="Descri\u00E7\u00E3o">
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
                    opts={TASK_TYPES}
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
              <FormField label="Bairro / N\u00FAcleo">
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
              <FormField label="Usu\u00E1rio Respons\u00E1vel">
                <FormSelect
                  T={T}
                  val={form.responsible}
                  onChange={(v) => set("responsible", v)}
                  opts={sectorUsers.map((u: any) => u.name)}
                  placeholder={
                    form.sector
                      ? sectorUsers.length
                        ? "Selecione o respons\u00E1vel..."
                        : "Nenhum usu\u00E1rio neste setor"
                      : "Selecione um setor primeiro..."
                  }
                />
              </FormField>
              {form.sector && sectorUsers.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-[10px] p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2.5 uppercase">
                    Usu\u00E1rios do setor
                  </div>
                  {sectorUsers.map((u: any) => (
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
                          {typeof u.role === "object" ? u.role.name : u.role}
                        </div>
                      </div>
                      {form.responsible === u.name && (
                        <Check size={14} className="text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="bg-primary/[0.07] border border-primary/20 rounded-[10px] p-3">
                <div className="text-[11px] font-bold text-primary mb-1.5 uppercase">
                  {"\u2139\uFE0F"} Heran\u00E7a autom\u00E1tica
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["Prioridade", form.priority || "\u2014"],
                    ["Tipo", form.type || "\u2014"],
                    ["Prazo", form.deadline || "\u2014"],
                    ["Contrato", form.contract || "\u2014"],
                    ["Cidade", form.city || "\u2014"],
                    ["Bairro", form.nucleus || "\u2014"],
                  ].map(([k, v]) => (
                    <span
                      key={k}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-[3px] text-[11px]"
                    >
                      {k}:{" "}
                      <b className="text-gray-900 dark:text-gray-50">
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
                        ? ` \u00B7 ${(() => {
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
                  <FormField label="T\u00EDtulo" req>
                    <FormInput
                      T={T}
                      value={subForm.title || ""}
                      onChange={(v) => setSubForm((f: any) => ({ ...f, title: v }))}
                      placeholder="T\u00EDtulo da subtarefa"
                    />
                  </FormField>
                  <FormField label="Descri\u00E7\u00E3o">
                    <FormTextarea
                      T={T}
                      value={subForm.description || ""}
                      onChange={(v) =>
                        setSubForm((f: any) => ({ ...f, description: v }))
                      }
                      rows={2}
                      placeholder="Descri\u00E7\u00E3o (opcional)"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-2.5">
                    <FormField label="Setor" req>
                      <FormSelect
                        T={T}
                        val={subForm.sector || ""}
                        onChange={(v) =>
                          setSubForm((f: any) => ({
                            ...f,
                            sector: v,
                            responsible: "",
                          }))
                        }
                        opts={sectors}
                      />
                    </FormField>
                    <FormField label="Respons\u00E1vel">
                      <FormSelect
                        T={T}
                        val={subForm.responsible || ""}
                        onChange={(v) =>
                          setSubForm((f: any) => ({ ...f, responsible: v }))
                        }
                        opts={subSectorUsers.map((u: any) => u.name)}
                        placeholder={
                          subForm?.sector
                            ? "Respons\u00E1vel..."
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
              Pr\u00F3ximo {"\u2192"}
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
                    alert("O prazo n\u00E3o pode ser menor que hoje.");
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
    </div>
  );
}
