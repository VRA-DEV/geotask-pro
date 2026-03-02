"use client";

import {
  Briefcase,
  Building2,
  Edit,
  Lock,
  Plus,
  Settings,
  Trash2,
  UserCheck,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { RoleModal } from "./RoleModal";
import { SectorModal } from "./SectorModal";
import { UserModal } from "./UserModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type PermissionLevel = "full" | "sector" | "view" | "none";

interface RolePermissions {
  [module: string]: PermissionLevel;
}

interface Role {
  id: number;
  name: string;
  permissions?: RolePermissions;
}

interface Sector {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  sector_id: number;
  role?: Role;
  sector?: Sector;
  active: boolean;
  avatar?: string;
  must_change_password?: boolean;
}

interface SettingsPageProps {
  T: any;
  tab: string;
  setTab: (t: string) => void;
  currentUser?: User;
}

// ─── Permission labels ────────────────────────────────────────────────────────

const PERMISSION_LEVELS: {
  value: PermissionLevel;
  label: string;
  color: string;
}[] = [
  { value: "full", label: "Acesso completo", color: "#22c55e" },
  { value: "sector", label: "Vis. por Setor", color: "#f59e0b" },
  { value: "view", label: "Vis. geral", color: "#3b82f6" },
  { value: "none", label: "Sem acesso", color: "#ef4444" },
];

// These modules use granular access levels
const PERMISSION_MODULES = ["Kanban", "Dashboard", "Templates", "Criar tarefa"];

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage({
  T,
  tab,
  setTab,
  currentUser,
}: SettingsPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [passwordUserName, setPasswordUserName] = useState("");
  const [isAdminPasswordReset, setIsAdminPasswordReset] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  const [showSectorModal, setShowSectorModal] = useState(false);
  const [editingSector, setEditingSector] = useState<any | null>(null);

  const isAdmin = currentUser?.role?.name === "Admin";

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && tab !== "account") setTab("account");
  }, [isAdmin, tab, setTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, sRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles"),
        fetch("/api/sectors"),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (rRes.ok) setRoles(await rRes.json());
      if (sRes.ok) setSectors(await sRes.json());
    } catch (error) {
      console.error("Failed to fetch settings data", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReactivateUser = async (id: number) => {
    if (!confirm("Reativar este usuário? Ele voltará a acessar o sistema."))
      return;
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: true }),
      });
      if (res.ok) fetchData();
      else alert("Erro ao reativar usuário");
    } catch {
      alert("Erro ao reativar usuário");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (
      !confirm(
        "Tem certeza que deseja desativar este usuário? Ele não conseguirá mais acessar o sistema.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Erro ao desativar usuário");
    } catch {
      alert("Erro ao desativar usuário");
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este cargo?")) return;
    try {
      const res = await fetch(`/api/roles?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir cargo");
      }
    } catch {
      alert("Erro ao excluir cargo");
    }
  };

  const handleDeleteSector = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este setor?")) return;
    try {
      const res = await fetch(`/api/sectors?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir setor");
      }
    } catch {
      alert("Erro ao excluir setor");
    }
  };

  const handleSetPermission = async (
    roleId: number,
    module: string,
    level: PermissionLevel,
  ) => {
    const roleIndex = roles.findIndex((r) => r.id === roleId);
    if (roleIndex === -1) return;
    const role = roles[roleIndex];

    const newPerms: RolePermissions = {
      ...(role.permissions || {}),
      [module]: level,
    };

    // Optimistic update
    const updated = [...roles];
    updated[roleIndex] = { ...role, permissions: newPerms };
    setRoles(updated);

    try {
      const res = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roleId, permissions: newPerms }),
      });
      if (!res.ok) throw new Error("Falha ao salvar permissão");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar permissão");
      setRoles(roles); // revert
    }
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const allTabs = [
    { id: "account", l: "Minha Conta", icon: UserIcon },
    { id: "users", l: "Usuários", icon: Users },
    { id: "roles", l: "Cargos", icon: Briefcase },
    { id: "sectors", l: "Setores", icon: Building2 },
    { id: "permissions", l: "Permissões", icon: Settings },
  ];

  const tabs = isAdmin ? allTabs : allTabs.filter((t) => t.id === "account");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50">
          Configurações
        </h1>
        <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
          {isAdmin
            ? "Gerencie suas preferências e o sistema"
            : "Gerencie suas preferências"}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-900 rounded-[10px] p-1 w-fit mb-5 flex-wrap">
        {tabs.map(({ id, l, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 py-[7px] px-3.5 rounded-[7px] border-none text-xs font-semibold cursor-pointer ${
              tab === id
                ? "bg-primary text-white"
                : "bg-transparent text-slate-500 dark:text-gray-400"
            }`}
          >
            <Icon size={13} />
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-5 text-slate-500 dark:text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              ACCOUNT TAB — all users
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "account" && (
            <div className="flex flex-col gap-4 max-w-[520px]">
              {/* User info card */}
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] p-6">
                <h3 className="mb-4 mt-0 text-[15px] font-semibold text-slate-900 dark:text-gray-50">
                  Informações da Conta
                </h3>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-white text-base font-bold flex items-center justify-center">
                    {currentUser?.avatar || currentUser?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-slate-900 dark:text-gray-50">
                      {currentUser?.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      {currentUser?.email}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-100 dark:bg-gray-700 rounded-lg py-2.5 px-3.5 border border-slate-200 dark:border-gray-700">
                    <div className="text-[10px] text-slate-500 dark:text-gray-400 mb-0.5">
                      CARGO
                    </div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                      {currentUser?.role?.name || "—"}
                    </div>
                  </div>
                  <div className="bg-slate-100 dark:bg-gray-700 rounded-lg py-2.5 px-3.5 border border-slate-200 dark:border-gray-700">
                    <div className="text-[10px] text-slate-500 dark:text-gray-400 mb-0.5">
                      SETOR
                    </div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                      {currentUser?.sector?.name || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security card */}
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] p-6">
                <h3 className="mb-4 mt-0 text-[15px] font-semibold text-slate-900 dark:text-gray-50">
                  Segurança
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-gray-50">
                      Senha
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      Recomendamos alterar sua senha periodicamente.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setPasswordUserId(currentUser.id);
                        setPasswordUserName(currentUser.name);
                        setIsAdminPasswordReset(false);
                        setShowPasswordModal(true);
                      }
                    }}
                    className="flex items-center gap-2 py-2 px-4 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 border border-slate-200 dark:border-gray-700 rounded-lg text-[13px] font-semibold cursor-pointer"
                  >
                    <Lock size={14} />
                    Alterar senha
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              USERS TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "users" && isAdmin && (
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center py-3.5 px-4 border-b border-slate-200 dark:border-gray-700">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                  Usuários ({users.length})
                </span>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-[5px] py-1.5 px-3 bg-primary text-white border-none rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus size={12} />
                  Novo usuário
                </button>
              </div>

              {/* Table header */}
              <div
                className="grid py-2 px-4 border-b border-slate-200 dark:border-gray-700"
                style={{ gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 130px" }}
              >
                {["Nome", "E-mail", "Cargo", "Setor", "Ações"].map((h) => (
                  <span
                    key={h}
                    className="text-[10px] font-bold text-slate-500 dark:text-gray-400"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {users.map((u, i) => (
                <div
                  key={u.id}
                  className={`grid items-center py-2.5 px-4 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-white/5 ${
                    i < users.length - 1
                      ? "border-b border-slate-200 dark:border-gray-700"
                      : ""
                  } ${!u.active ? "opacity-50" : ""}`}
                  style={{ gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 130px" }}
                >
                  {/* Name & avatar */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[30px] h-[30px] rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 ${
                        u.active ? "bg-primary" : "bg-gray-400"
                      }`}
                    >
                      {u.avatar || u.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-[13px] font-medium text-slate-900 dark:text-gray-50 block">
                        {u.name}
                      </span>
                      {!u.active && (
                        <span className="text-[10px] text-red-500">
                          Desativado
                        </span>
                      )}
                      {u.must_change_password && u.active && (
                        <span className="text-[10px] text-amber-500">
                          ⚠ Deve trocar senha
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <span className="text-xs text-slate-500 dark:text-gray-400">{u.email}</span>

                  {/* Role badge */}
                  <span className="text-[11px] py-0.5 px-2 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-fit font-semibold">
                    {u.role?.name || "Sem cargo"}
                  </span>

                  {/* Sector */}
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    {u.sector?.name || "Sem setor"}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {/* Reset password */}
                    <button
                      title="Resetar Senha"
                      onClick={() => {
                        setPasswordUserId(u.id);
                        setPasswordUserName(u.name);
                        setIsAdminPasswordReset(true);
                        setShowPasswordModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Lock size={12} />
                    </button>

                    {/* Edit */}
                    <button
                      title="Editar"
                      onClick={() => {
                        setEditingUser(u);
                        setShowUserModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Edit size={12} />
                    </button>

                    {/* Deactivate / Reactivate */}
                    {u.active ? (
                      <button
                        title="Desativar usuário"
                        onClick={() => handleDeleteUser(u.id)}
                        className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    ) : (
                      <button
                        title="Reativar usuário"
                        onClick={() => handleReactivateUser(u.id)}
                        className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer"
                      >
                        <UserCheck size={12} color="#10b981" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="py-6 px-4 text-center text-slate-500 dark:text-gray-400 text-[13px]">
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ROLES TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "roles" && isAdmin && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {/* Add new role card */}
              <button
                onClick={() => {
                  setEditingRole(null);
                  setShowRoleModal(true);
                }}
                className="bg-transparent border-[1.5px] border-dashed border-slate-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-[13px] text-slate-500 dark:text-gray-400 cursor-pointer min-h-[100px]"
              >
                <Plus size={20} />
                Novo Cargo
              </button>

              {roles.map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-gray-50">
                      {r.name}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingRole(r);
                          setShowRoleModal(true);
                        }}
                        className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(r.id)}
                        className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-400">
                    {users.filter((u) => u.role_id === r.id).length} usuário(s)
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTORS TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "sectors" && isAdmin && (
            <div className="flex flex-col gap-2">
              {sectors.map((s) => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl py-3 px-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] bg-violet-100 rounded-lg flex items-center justify-center">
                      <Building2 size={16} color="#98af3b" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400">
                        {users.filter((u) => u.sector_id === s.id).length}{" "}
                        colaborador(es)
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setEditingSector(s);
                        setShowSectorModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSector(s.id)}
                      className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  setEditingSector(null);
                  setShowSectorModal(true);
                }}
                className="bg-transparent border-[1.5px] border-dashed border-slate-200 dark:border-gray-700 rounded-xl p-3.5 flex items-center justify-center gap-1.5 text-[13px] text-slate-500 dark:text-gray-400 cursor-pointer"
              >
                <Plus size={14} />
                Novo setor
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              PERMISSIONS TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "permissions" && isAdmin && (
            <div className="flex flex-col gap-4">
              {/* Legend */}
              <div className="flex gap-3 flex-wrap bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[10px] py-2.5 px-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 mr-1">
                  Legenda:
                </span>
                {PERMISSION_LEVELS.map((pl) => (
                  <span
                    key={pl.value}
                    className="text-xs flex items-center gap-[5px]"
                  >
                    <span
                      className="inline-block w-[9px] h-[9px] rounded-full"
                      style={{ background: pl.color }}
                    />
                    <span className="text-slate-900 dark:text-gray-50">{pl.label}</span>
                  </span>
                ))}
              </div>

              {/* Permissions table */}
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] overflow-auto">
                <div className="py-3.5 px-4 border-b border-slate-200 dark:border-gray-700">
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                    Permissões por Cargo
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                    As alterações são salvas automaticamente.
                  </div>
                </div>

                <table className="w-full border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-gray-700">
                      <th className="py-2.5 px-4 text-left text-[11px] font-bold text-slate-500 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-800">
                        Módulo
                      </th>
                      {roles.map((r) => (
                        <th
                          key={r.id}
                          className="py-2.5 px-3.5 text-center text-[11px] font-bold text-slate-500 dark:text-gray-400 whitespace-nowrap"
                        >
                          {r.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MODULES.map((mod, i) => (
                      <tr
                        key={mod}
                        className={
                          i < PERMISSION_MODULES.length - 1
                            ? "border-b border-slate-200 dark:border-gray-700"
                            : ""
                        }
                      >
                        <td className="py-2.5 px-4 text-[13px] font-medium text-slate-900 dark:text-gray-50 sticky left-0 bg-white dark:bg-gray-800">
                          {mod}
                        </td>
                        {roles.map((r) => {
                          const perms: RolePermissions =
                            (r.permissions as RolePermissions) || {};
                          const currentLevel: PermissionLevel =
                            (perms[mod] as PermissionLevel) || "none";
                          const levelInfo = PERMISSION_LEVELS.find(
                            (pl) => pl.value === currentLevel,
                          );

                          return (
                            <td
                              key={r.id}
                              className="py-2 px-3.5 text-center"
                            >
                              <select
                                value={currentLevel}
                                onChange={(e) =>
                                  handleSetPermission(
                                    r.id,
                                    mod,
                                    e.target.value as PermissionLevel,
                                  )
                                }
                                className="py-1 px-2 rounded-md bg-slate-100 dark:bg-gray-700 text-[11px] font-semibold cursor-pointer outline-none"
                                style={{
                                  border: `1.5px solid ${levelInfo?.color || "#e2e8f0"}`,
                                  color: levelInfo?.color || "#0f172a",
                                }}
                              >
                                {PERMISSION_LEVELS.map((pl) => (
                                  <option key={pl.value} value={pl.value}>
                                    {pl.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Business rules note */}
              <div className="bg-slate-100 dark:bg-gray-700 border border-slate-200 dark:border-gray-700 rounded-[10px] py-3 px-4 text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                <strong className="text-slate-900 dark:text-gray-50 block mb-1.5">
                  📋 Regras de negócio:
                </strong>
                <ul className="m-0 pl-[18px]">
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">
                      Controle de tarefas
                    </strong>{" "}
                    (iniciar/pausar/concluir): restrito ao responsável da tarefa
                    OU ao Gestor do setor atribuído.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">
                      Criação de tarefas
                    </strong>
                    : Admin, Gerente e Coordenador → qualquer setor. Gestor →
                    apenas seu setor. Liderado → sem acesso.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">Atribuição</strong>:
                    Admin/Gerente/Coordenador → qualquer usuário. Gestor →
                    apenas usuários do seu setor.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">Menções</strong>: qualquer
                    cargo pode mencionar qualquer usuário ou setor. O mencionado
                    recebe notificação e pode visualizar a tarefa.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {showPasswordModal && passwordUserId !== null && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          userId={passwordUserId}
          userName={passwordUserName}
          T={T}
          isAdmin={isAdminPasswordReset}
        />
      )}

      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSuccess={fetchData}
        user={editingUser}
        roles={roles}
        sectors={sectors}
        T={T}
      />

      <RoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSuccess={fetchData}
        role={editingRole}
        T={T}
      />

      <SectorModal
        isOpen={showSectorModal}
        onClose={() => setShowSectorModal(false)}
        onSuccess={fetchData}
        sector={editingSector}
        T={T}
      />
    </div>
  );
}
