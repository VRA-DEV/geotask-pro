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

  // ── Shared styles ─────────────────────────────────────────────────────────

  const actionBtn = (danger = false): React.CSSProperties => ({
    background: danger ? "#fef2f2" : T.inp,
    border: "none",
    borderRadius: 6,
    padding: 5,
    cursor: "pointer",
  });

  const addBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    background: "#98af3b",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}>
          Configurações
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub }}>
          {isAdmin
            ? "Gerencie suas preferências e o sistema"
            : "Gerencie suas preferências"}
        </p>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: T.col,
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {tabs.map(({ id, l, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 7,
              border: "none",
              background: tab === id ? "#98af3b" : "transparent",
              color: tab === id ? "white" : T.sub,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icon size={13} />
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 20, color: T.sub }}>Carregando...</div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              ACCOUNT TAB — all users
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "account" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxWidth: 520,
              }}
            >
              {/* User info card */}
              <div
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: 24,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: T.text,
                  }}
                >
                  Informações da Conta
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#98af3b",
                      color: "white",
                      fontSize: 16,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {currentUser?.avatar || currentUser?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 15, fontWeight: 600, color: T.text }}
                    >
                      {currentUser?.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.sub }}>
                      {currentUser?.email}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      background: T.inp,
                      borderRadius: 8,
                      padding: "10px 14px",
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{ fontSize: 10, color: T.sub, marginBottom: 2 }}
                    >
                      CARGO
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                    >
                      {currentUser?.role?.name || "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      background: T.inp,
                      borderRadius: 8,
                      padding: "10px 14px",
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{ fontSize: 10, color: T.sub, marginBottom: 2 }}
                    >
                      SETOR
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                    >
                      {currentUser?.sector?.name || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security card */}
              <div
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: 24,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: T.text,
                  }}
                >
                  Segurança
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 14, fontWeight: 500, color: T.text }}
                    >
                      Senha
                    </div>
                    <div style={{ fontSize: 12, color: T.sub }}>
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      background: T.inp,
                      color: T.text,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
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
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  Usuários ({users.length})
                </span>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowUserModal(true);
                  }}
                  style={addBtn}
                >
                  <Plus size={12} />
                  Novo usuário
                </button>
              </div>

              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 130px",
                  padding: "8px 16px",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                {["Nome", "E-mail", "Cargo", "Setor", "Ações"].map((h) => (
                  <span
                    key={h}
                    style={{ fontSize: 10, fontWeight: 700, color: T.sub }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {users.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 130px",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom:
                      i < users.length - 1 ? `1px solid ${T.border}` : "none",
                    opacity: u.active ? 1 : 0.5,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = T.hover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Name & avatar */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: u.active ? "#98af3b" : "#9ca3af",
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {u.avatar || u.name.charAt(0)}
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: T.text,
                          display: "block",
                        }}
                      >
                        {u.name}
                      </span>
                      {!u.active && (
                        <span style={{ fontSize: 10, color: "#ef4444" }}>
                          Desativado
                        </span>
                      )}
                      {u.must_change_password && u.active && (
                        <span style={{ fontSize: 10, color: "#f59e0b" }}>
                          ⚠ Deve trocar senha
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <span style={{ fontSize: 12, color: T.sub }}>{u.email}</span>

                  {/* Role badge */}
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: T.tag,
                      color: T.tagText,
                      width: "fit-content",
                      fontWeight: 600,
                    }}
                  >
                    {u.role?.name || "Sem cargo"}
                  </span>

                  {/* Sector */}
                  <span style={{ fontSize: 12, color: T.sub }}>
                    {u.sector?.name || "Sem setor"}
                  </span>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {/* Reset password */}
                    <button
                      title="Resetar Senha"
                      onClick={() => {
                        setPasswordUserId(u.id);
                        setPasswordUserName(u.name);
                        setIsAdminPasswordReset(true);
                        setShowPasswordModal(true);
                      }}
                      style={actionBtn()}
                    >
                      <Lock size={12} color={T.sub} />
                    </button>

                    {/* Edit */}
                    <button
                      title="Editar"
                      onClick={() => {
                        setEditingUser(u);
                        setShowUserModal(true);
                      }}
                      style={actionBtn()}
                    >
                      <Edit size={12} color={T.sub} />
                    </button>

                    {/* Deactivate / Reactivate */}
                    {u.active ? (
                      <button
                        title="Desativar usuário"
                        onClick={() => handleDeleteUser(u.id)}
                        style={actionBtn(true)}
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    ) : (
                      <button
                        title="Reativar usuário"
                        onClick={() => handleReactivateUser(u.id)}
                        style={actionBtn()}
                      >
                        <UserCheck size={12} color="#10b981" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: T.sub,
                    fontSize: 13,
                  }}
                >
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ROLES TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "roles" && isAdmin && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                gap: 12,
              }}
            >
              {/* Add new role card */}
              <button
                onClick={() => {
                  setEditingRole(null);
                  setShowRoleModal(true);
                }}
                style={{
                  background: "transparent",
                  border: `1.5px dashed ${T.border}`,
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 13,
                  color: T.sub,
                  cursor: "pointer",
                  minHeight: 100,
                }}
              >
                <Plus size={20} />
                Novo Cargo
              </button>

              {roles.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{ fontSize: 14, fontWeight: 600, color: T.text }}
                    >
                      {r.name}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => {
                          setEditingRole(r);
                          setShowRoleModal(true);
                        }}
                        style={actionBtn()}
                      >
                        <Edit size={12} color={T.sub} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(r.id)}
                        style={actionBtn(true)}
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.sub }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sectors.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        background: "#ede9fe",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Building2 size={16} color="#98af3b" />
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                      >
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.sub }}>
                        {users.filter((u) => u.sector_id === s.id).length}{" "}
                        colaborador(es)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingSector(s);
                        setShowSectorModal(true);
                      }}
                      style={actionBtn()}
                    >
                      <Edit size={13} color={T.sub} />
                    </button>
                    <button
                      onClick={() => handleDeleteSector(s.id)}
                      style={actionBtn(true)}
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
                style={{
                  background: "transparent",
                  border: `1.5px dashed ${T.border}`,
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 13,
                  color: T.sub,
                  cursor: "pointer",
                }}
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "10px 16px",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.sub,
                    marginRight: 4,
                  }}
                >
                  Legenda:
                </span>
                {PERMISSION_LEVELS.map((pl) => (
                  <span
                    key={pl.value}
                    style={{
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: pl.color,
                      }}
                    />
                    <span style={{ color: T.text }}>{pl.label}</span>
                  </span>
                ))}
              </div>

              {/* Permissions table */}
              <div
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    Permissões por Cargo
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                    As alterações são salvas automaticamente.
                  </div>
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 500,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.sub,
                          position: "sticky",
                          left: 0,
                          background: T.card,
                        }}
                      >
                        Módulo
                      </th>
                      {roles.map((r) => (
                        <th
                          key={r.id}
                          style={{
                            padding: "10px 14px",
                            textAlign: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.sub,
                            whiteSpace: "nowrap",
                          }}
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
                        style={{
                          borderBottom:
                            i < PERMISSION_MODULES.length - 1
                              ? `1px solid ${T.border}`
                              : "none",
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 16px",
                            fontSize: 13,
                            fontWeight: 500,
                            color: T.text,
                            position: "sticky",
                            left: 0,
                            background: T.card,
                          }}
                        >
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
                              style={{
                                padding: "8px 14px",
                                textAlign: "center",
                              }}
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
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: `1.5px solid ${levelInfo?.color || T.border}`,
                                  background: T.inp,
                                  color: levelInfo?.color || T.text,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  outline: "none",
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
              <div
                style={{
                  background: T.inp,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 12,
                  color: T.sub,
                  lineHeight: 1.6,
                }}
              >
                <strong
                  style={{ color: T.text, display: "block", marginBottom: 6 }}
                >
                  📋 Regras de negócio:
                </strong>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>
                    <strong style={{ color: T.text }}>
                      Controle de tarefas
                    </strong>{" "}
                    (iniciar/pausar/concluir): restrito ao responsável da tarefa
                    OU ao Gestor do setor atribuído.
                  </li>
                  <li>
                    <strong style={{ color: T.text }}>
                      Criação de tarefas
                    </strong>
                    : Admin, Gerente e Coordenador → qualquer setor. Gestor →
                    apenas seu setor. Liderado → sem acesso.
                  </li>
                  <li>
                    <strong style={{ color: T.text }}>Atribuição</strong>:
                    Admin/Gerente/Coordenador → qualquer usuário. Gestor →
                    apenas usuários do seu setor.
                  </li>
                  <li>
                    <strong style={{ color: T.text }}>Menções</strong>: qualquer
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
