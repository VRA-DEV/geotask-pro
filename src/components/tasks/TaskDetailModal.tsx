"use client";

import { getPermissions } from "@/lib/permissions";
import { CheckCircle, Eye, Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DatePicker } from "@/app/components/DatePicker";
import { SECTORS, STATUS_COLOR } from "@/lib/constants";
import { getTaskState, parseDateStr } from "@/lib/helpers";
import type {
  CitiesNeighborhoods,
  Sector,
  Subtask,
  Task,
  ThemeColors,
  User,
} from "@/types";

interface TaskDetailModalProps {
  T: ThemeColors;
  task: Task;
  user: User;
  onClose: () => void;
  onUpdate: (
    id: number,
    action: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  users?: User[];
  contracts?: string[];
  taskTypes?: { id: number; name: string; sector_id?: number | null }[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  sectors?: (Sector | string)[];
  tasks?: Task[];
  setSelectedTask: (t: Task) => void;
}

interface HistoryEntry {
  id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user?: { name: string } | null;
}

interface CommentEntry {
  id: number;
  content: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

export default function TaskDetailModal({
  T,
  task: t,
  user,
  onClose,
  onUpdate,
  users = [],
  contracts = [],
  taskTypes = [],
  citiesNeighborhoods = {},
  sectors = [],
  tasks = [],
  setSelectedTask,
}: TaskDetailModalProps) {
  const sc = STATUS_COLOR[t.status];

  const [tab, setTab] = useState("dados");
  const [form, setForm] = useState({
    ...t,
    sector: (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
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
    sector: (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
    responsible_id: "",
    description: "",
  });
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredUsers = useMemo(() => {
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

  const filteredTaskTypes = useMemo(() => {
    // Helper para gerar os grupos
    const buildGroups = (types: any[]) => {
      const groups: Record<string, string[]> = { Geral: [] };
      types.forEach((t) => {
        if (!t.sector_id) {
          groups.Geral.push(t.name);
        } else {
          const sec = sectors.find((s: any) => s.id === t.sector_id);
          const secName =
            sec && typeof sec === "object" && "name" in sec
              ? sec.name
              : "Outros";
          if (!groups[secName]) groups[secName] = [];
          groups[secName].push(t.name);
        }
      });
      return Object.entries(groups)
        .filter(([_, opts]) => opts.length > 0)
        .map(([label, options]) => ({ label, options }));
    };

    if (!form.sector) return buildGroups(taskTypes);

    const sec = sectors.find(
      (s: any) =>
        String(s.id) === String(form.sector) ||
        (typeof s === "object" &&
          s !== null &&
          s.name &&
          String(s.name).toLowerCase() === String(form.sector).toLowerCase()) ||
        (typeof s === "string" &&
          s.toLowerCase() === String(form.sector).toLowerCase()),
    );

    if (!sec) return buildGroups(taskTypes);

    const secId = typeof sec === "object" ? sec.id : null;
    if (!secId) return buildGroups(taskTypes);

    const allowed = taskTypes.filter(
      (t: any) => !t.sector_id || t.sector_id === secId,
    );
    return buildGroups(allowed);
  }, [form.sector, taskTypes, sectors]);

  const subFilteredUsers = useMemo(() => {
    if (!newSubtask.sector) return [];
    return users.filter((u: User) => {
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
      sector: (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
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

  const formatDatetimeLocal = (isoStr?: string | null) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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
          sector:
            (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
          responsible_id: "",
          description: "",
        });

        const newChild: Subtask = {
          id: data.id,
          title: newSubtask.title,
          done: false,
          task_id: t.id,
          sector_id: Number(newSubtask.sector) || null,
          responsible_id: Number(newSubtask.responsible_id) || null,
          responsible: newSubtask.responsible_id
            ? (users.find(
                (u: User) => u.id === Number(newSubtask.responsible_id),
              ) ?? null)
            : null,
        };
        setForm((prev) => ({
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
    if (
      ["Admin", "Gestor", "Coordenador", "Gerente"].includes(
        user.role?.name || "",
      )
    )
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
          .filter((s: Sector | string) => {
            const name = typeof s === "string" ? s : s.name || "";
            return name.toLowerCase().startsWith(sectorQ);
          })
          .slice(0, 5);
        setMentionSuggestions(
          matches.map(
            (s: Sector | string) => `#${typeof s === "string" ? s : s.name}`,
          ),
        );
      } else {
        const matches = users
          .filter((u: any) => u.name.toLowerCase().startsWith(query))
          .slice(0, 5);
        setMentionSuggestions(matches.map((u: User) => u.name));
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
      className="fixed inset-0 z-100 flex items-center justify-center p-4 font-sans bg-black/60"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[600px] rounded-[20px] p-6 flex flex-col max-h-[90vh] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[11px] font-semibold px-2.5 py-[3px] rounded-full"
                style={{
                  background: sc + "22",
                  color: sc,
                }}
              >
                {t.status}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-gray-400">
                ID: #{t.id}
              </span>
              {getTaskState(t) && (
                <span
                  className="text-[10px] font-semibold px-2 py-[2px] rounded ml-2"
                  style={{
                    background: getTaskState(t)!.color + "22",
                    color: getTaskState(t)!.color,
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
              className="text-lg font-bold bg-transparent border-none w-full outline-none text-slate-900 dark:text-gray-50"
            />
          </div>
          <button
            onClick={onClose}
            className="bg-slate-100 dark:bg-gray-700 border-none rounded-lg p-1.5 cursor-pointer h-fit"
          >
            <X size={16} className="text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-gray-700 mb-5">
          {["dados", "subtarefas", "comentarios", "historico"].map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`px-4 py-2.5 bg-transparent border-none text-[13px] font-semibold cursor-pointer capitalize ${
                tab === tb
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-slate-500 dark:text-gray-400"
              }`}
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-1">
          {tab === "dados" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                  DESCRIÇÃO
                </div>
                <textarea
                  value={form.description || ""}
                  disabled={!canEdit("description")}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className={`w-full p-2.5 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] resize-none text-slate-900 dark:text-gray-50 ${
                    canEdit("description")
                      ? "bg-slate-100 dark:bg-gray-700"
                      : "bg-slate-100 dark:bg-gray-900"
                  }`}
                />
              </div>

              {[
                {
                  l: "Prioridade",
                  f: "priority",
                  o: ["Alta", "Média", "Baixa"],
                },
                { l: "Tipo", f: "type", o: [], groups: filteredTaskTypes },
                {
                  l: "Setor",
                  f: "sector",
                  o: sectors.map((s: Sector | string) =>
                    typeof s === "object" && s !== null ? s.name : String(s),
                  ),
                },
                {
                  l: "Responsável",
                  f: "responsible_id",
                  o: filteredUsers.map((u: User) => ({
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
                { l: "Início real", f: "started_at", type: "datetime-local" },
                {
                  l: "Conclusão real",
                  f: "completed_at",
                  type: "datetime-local",
                },
              ].map(({ l, f, o, type, groups }) => {
                const formRec = form as unknown as Record<
                  string,
                  string | null | undefined
                >;
                let disabled = !canEdit(
                  f === "responsible_id" ? "responsible" : f,
                );

                // Only users with "edit_retroactive_dates" capability can view/edit 'started_at' and 'completed_at'
                if (f === "started_at" || f === "completed_at") {
                  const appPerms = getPermissions(user);
                  if (!appPerms.tasks.edit_retroactive_dates) return null;
                  disabled = false;
                }

                return (
                  <div key={f} className="mb-3">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                      {l.toUpperCase()}
                    </div>
                    {o && !groups ? (
                      <select
                        value={
                          ((form as Record<string, unknown>)[f] as string) || ""
                        }
                        disabled={disabled}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((prev) => ({ ...prev, [f]: v }));
                          if (f === "sector") {
                            setForm((prev) => ({
                              ...prev,
                              responsible_id: null,
                            }));
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] appearance-none ${
                          disabled
                            ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                            : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                        }`}
                      >
                        <option value="">Selecione...</option>
                        {o.map(
                          (
                            opt:
                              | string
                              | { value: string | number; label: string },
                          ) => {
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
                          },
                        )}
                      </select>
                    ) : groups ? (
                      <select
                        value={
                          ((form as Record<string, unknown>)[f] as string) || ""
                        }
                        disabled={disabled}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((prev) => ({ ...prev, [f]: v }));
                        }}
                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] appearance-none ${
                          disabled
                            ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                            : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                        }`}
                      >
                        <option value="">Selecione...</option>
                        {groups.map((g: any, i: number) => (
                          <optgroup key={`group-${i}`} label={g.label}>
                            {g.options.map((optLabel: string) => (
                              <option key={optLabel} value={optLabel}>
                                {optLabel}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full">
                        {type === "date-picker" ? (
                          <DatePicker
                            T={T}
                            date={parseDateStr(formRec[f] ?? undefined)}
                            setDate={(d) =>
                              setForm({
                                ...form,
                                [f]: d ? d.toISOString() : "",
                              })
                            }
                            label=""
                            openDirection="up"
                          />
                        ) : type === "datetime-local" ? (
                          <input
                            type="datetime-local"
                            value={formatDatetimeLocal(formRec[f])}
                            disabled={disabled}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm({
                                ...form,
                                [f]: v ? new Date(v).toISOString() : null,
                              });
                            }}
                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] ${
                              disabled
                                ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                                : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                            }`}
                          />
                        ) : (
                          <input
                            type={type || "text"}
                            value={formRec[f] || ""}
                            disabled={disabled}
                            onChange={(e) =>
                              setForm({ ...form, [f]: e.target.value })
                            }
                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] ${
                              disabled
                                ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                                : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="col-span-full pt-2.5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full p-3 bg-primary text-white border-none rounded-[10px] text-[13px] font-semibold cursor-pointer disabled:opacity-70"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          )}

          {tab === "subtarefas" && (
            <div className="pb-5">
              <div className="mb-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-2">
                  SUBTAREFAS ({(form.subtasks || []).length})
                </div>
                {(form.subtasks || []).length === 0 && (
                  <div className="text-[13px] text-slate-500 dark:text-gray-400 italic">
                    Nenhuma subtarefa.
                  </div>
                )}
                {(form.subtasks || []).map((child: Subtask & Partial<Task>) => (
                  <div
                    key={child.id}
                    className="p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg mb-2 bg-white dark:bg-gray-800 flex justify-between items-center"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 flex items-center gap-2">
                        {child.title}
                        {getTaskState(child) && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-[1px] rounded"
                            style={{
                              background: getTaskState(child)!.color + "22",
                              color: getTaskState(child)!.color,
                            }}
                          >
                            {getTaskState(child)!.label}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400 flex gap-1.5 mt-0.5">
                        <span>{child.status}</span>
                        <span>&bull;</span>
                        <span>{child.priority}</span>
                        {child.responsible && (
                          <>
                            <span>&bull;</span>
                            <span>{child.responsible.name || "Resp."}</span>
                          </>
                        )}
                        {child.sector && (
                          <>
                            <span>&bull;</span>
                            <span>
                              {child.sector && typeof child.sector === "object"
                                ? child.sector.name
                                : child.sector || ""}
                            </span>
                          </>
                        )}
                        {child.created_by && (
                          <>
                            <span>&bull;</span>
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
                      className="bg-transparent border-none cursor-pointer"
                      onClick={() => {
                        // Switch selected task to subtask
                        const fullTask = tasks.find(
                          (tk: Task) => tk.id === child.id,
                        );
                        if (fullTask) {
                          setSelectedTask(fullTask);
                        } else {
                          // If not in main list (unlikely), use child as is
                          setSelectedTask(child as unknown as Task);
                        }
                      }}
                    >
                      <Eye
                        size={18}
                        className="text-slate-500 dark:text-gray-400"
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-slate-100 dark:bg-gray-900 p-3 rounded-[10px] border border-slate-200 dark:border-gray-700">
                <div className="text-xs font-bold text-primary mb-2">
                  Nova Subtarefa
                </div>
                <div className="flex flex-col gap-2.5">
                  <input
                    value={newSubtask.title}
                    onChange={(e) =>
                      setNewSubtask({ ...newSubtask, title: e.target.value })
                    }
                    placeholder="Título *"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px]"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px] resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={newSubtask.sector}
                      onChange={(e) =>
                        setNewSubtask({
                          ...newSubtask,
                          sector: e.target.value,
                          responsible_id: "",
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px]"
                    >
                      <option value="">Setor *</option>
                      {sectors.map((s: Sector | string) => {
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
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px]"
                    >
                      <option value="">Responsável...</option>
                      {subFilteredUsers.map((u: User) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() =>
                        setNewSubtask({
                          title: "",
                          sector: "",
                          responsible_id: "",
                          description: "",
                        })
                      }
                      className="flex-1 p-2 bg-transparent text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-lg text-[13px] font-semibold cursor-pointer"
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
                      className="flex-[2] p-2 bg-primary text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-60"
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
              <div className="flex flex-col gap-3 mb-5">
                {comments.map((c: CommentEntry) => (
                  <div
                    key={c.id}
                    className="bg-slate-100 dark:bg-gray-900 rounded-[10px] p-3"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[9px] font-bold">
                        {c.user_avatar || "?"}
                      </div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-gray-50">
                        {c.user_name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 ml-auto">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-[13px] text-slate-900 dark:text-gray-50 leading-normal">
                      {c.content}
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center text-slate-500 dark:text-gray-400 text-[13px]">
                    Nenhum comentário.
                  </div>
                )}
              </div>

              <div className="relative">
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
                  className="w-full p-3 rounded-[10px] border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px] resize-none"
                />
                {mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[10px] shadow-lg z-200 overflow-hidden">
                    {mentionSuggestions.map((s) => (
                      <button
                        key={s}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(s);
                        }}
                        className="block w-full px-3 py-2 text-left bg-transparent border-none text-[13px] text-slate-900 dark:text-gray-50 cursor-pointer"
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
            <div className="flex flex-col gap-3">
              <div className="mb-5 p-4 bg-slate-100 dark:bg-gray-900 rounded-xl flex items-center justify-between relative">
                <div className="absolute left-10 right-10 top-6 h-0.5 z-0 bg-slate-200 dark:bg-gray-700" />
                {[
                  { label: "Criação", date: t.created },
                  { label: "Início", date: t.started },
                  { label: "Prazo", date: t.deadline },
                  { label: "Conclusão", date: t.completed },
                ]
                  .filter((e) => e.date)
                  .map(
                    (
                      evt: { label: string; date: string | null | undefined },
                      idx: number,
                    ) => (
                      <div
                        key={idx}
                        className="z-[1] flex flex-col items-center gap-1.5"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-gray-800" />
                        <div className="text-center">
                          <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                            {evt.label}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-900 dark:text-gray-50">
                            {evt.date}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
              </div>
              {loadingHistory && (
                <div className="text-center text-slate-500 dark:text-gray-400 text-xs">
                  Carregando...
                </div>
              )}
              {!loadingHistory && history.length === 0 && (
                <div className="text-center text-slate-500 dark:text-gray-400 text-[13px]">
                  Nenhum histórico registrado.
                </div>
              )}
              {history.map((h: HistoryEntry) => (
                <div
                  key={h.id}
                  className="flex gap-2.5 pb-3 border-b border-dashed border-slate-200 dark:border-gray-700"
                >
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1">
                    <div className="text-[13px] text-slate-900 dark:text-gray-50">
                      <span className="font-semibold">
                        {h.user?.name || "Sistema"}
                      </span>{" "}
                      alterou <b>{h.field}</b>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                      <span className="line-through opacity-70">
                        {h.old_value || "(vazio)"}
                      </span>
                      {" ➝ "}
                      <span className="text-primary font-semibold">
                        {h.new_value || "(vazio)"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {["Admin", "Gestor", "Liderado", "Gerente", "Coordenador"].includes(
          user.role?.name || "",
        ) && (
          <div className="mt-5 border-t border-slate-200 dark:border-gray-700 pt-4 flex gap-2.5 justify-end flex-wrap">
            {t.status === "A Fazer" &&
              ((form.subtasks || []).length === 0 ? (
                <button
                  onClick={() => {
                    onUpdate(t.id, "update_status", { status: "Em Andamento" });
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer"
                >
                  <Play size={14} /> Iniciar
                </button>
              ) : (
                <div className="text-xs text-slate-500 dark:text-gray-400 italic flex items-center">
                  Inicie pelas subtarefas
                </div>
              ))}
            {t.status === "Em Andamento" && (
              <button
                onClick={() => {
                  onUpdate(t.id, "update_status", { status: "Pausado" });
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer"
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer"
                >
                  <CheckCircle size={14} /> Concluir
                </button>
              ) : (
                <div className="text-xs text-slate-500 dark:text-gray-400 italic flex items-center">
                  Conclua todas as subtarefas
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
