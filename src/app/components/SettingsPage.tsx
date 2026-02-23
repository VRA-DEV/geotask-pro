"use client";

import {
  Briefcase,
  Building2,
  Edit,
  Lock,
  Plus,
  Settings,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { RoleModal } from "./RoleModal";
import { SectorModal } from "./SectorModal";
import { UserModal } from "./UserModal";

// Types
interface Role {
  id: number;
  name: string;
  permissions?: Record<string, boolean>;
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
}

interface SettingsPageProps {
  T: any;
  tab: string;
  setTab: (t: string) => void;
  currentUser?: User;
}

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

  // Modals
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

  // Check role safely
  const isAdmin = currentUser?.role?.name === "Admin";

  // Initial Data Fetch
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Force tab to 'account' if non-admin tries to access others
  useEffect(() => {
    if (!isAdmin && tab !== "account") {
      setTab("account");
    }
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

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Tem certeza que deseja desativar este usuário?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        alert("Erro ao desativar usuário");
      }
    } catch (_err) {
      alert("Erro ao desativar usuário");
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este cargo?")) return;
    try {
      const res = await fetch(`/api/roles?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir cargo");
      }
    } catch (_err) {
      alert("Erro ao excluir cargo");
    }
  };

  const handleDeleteSector = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este setor?")) return;
    try {
      const res = await fetch(`/api/sectors?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir setor");
      }
    } catch (_err) {
      alert("Erro ao excluir setor");
    }
  };

  // Permissions Logic
  const availableModules = [
    "Dashboard",
    "Kanban",
    "Mapa Mental",
    "Cronograma",
    "Templates",
    "Criar tarefa",
    "Configurações",
  ];

  const handleTogglePermission = async (roleId: number, module: string) => {
    // 1. Find role
    const roleIndex = roles.findIndex((r) => r.id === roleId);
    if (roleIndex === -1) return;
    const role = roles[roleIndex];

    // 2. Calculate new permissions
    const currentPerms: any = role.permissions || {};
    const hasAccess = !!currentPerms[module];
    const newPerms = { ...currentPerms, [module]: !hasAccess };

    // 3. Optimistic Update
    const updatedRoles = [...roles];
    updatedRoles[roleIndex] = { ...role, permissions: newPerms };
    setRoles(updatedRoles);

    // 4. API Call
    try {
      const res = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roleId, permissions: newPerms }),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar permissões");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar permissão");
      // Revert on error
      setRoles(roles);
    }
  };

  const allTabs = [
    { id: "account", l: "Minha Conta", icon: UserIcon },
    { id: "users", l: "Usuários", icon: Users },
    { id: "roles", l: "Cargos", icon: Briefcase },
    { id: "sectors", l: "Setores", icon: Building2 },
    { id: "permissions", l: "Permissões", icon: Settings },
  ];

  // Filter tabs
  const tabs = isAdmin ? allTabs : allTabs.filter((t) => t.id === "account");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}>
          Configurações
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub }}>
          Gerencie suas preferências{isAdmin ? " e o sistema" : ""}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          background: T.col,
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
          marginBottom: 20,
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
          {/* ACCOUNT TAB (ALL USERS) */}
          {tab === "account" && (
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 24,
                maxWidth: 500,
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px",
                  fontSize: 16,
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
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
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
          )}

          {/* USERS TAB */}
          {tab === "users" && isAdmin && (
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
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
                  style={{
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
                  }}
                >
                  <Plus size={12} />
                  Novo usuário
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 120px",
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
              {users.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 120px",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom:
                      i < users.length - 1 ? `1px solid ${T.border}` : "none",
                    opacity: u.active ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = T.hover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#98af3b",
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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
                        <span style={{ fontSize: 10, color: "red" }}>
                          Desativado
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: T.sub }}>{u.email}</span>
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
                  <span style={{ fontSize: 12, color: T.sub }}>
                    {u.sector?.name || "Sem setor"}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      title="Alterar Senha"
                      onClick={() => {
                        setPasswordUserId(u.id);
                        setPasswordUserName(u.name);
                        setIsAdminPasswordReset(true);
                        setShowPasswordModal(true);
                      }}
                      style={{
                        background: T.inp,
                        border: "none",
                        borderRadius: 6,
                        padding: 5,
                        cursor: "pointer",
                      }}
                    >
                      <Lock size={12} color={T.sub} />
                    </button>
                    <button
                      title="Editar"
                      onClick={() => {
                        setEditingUser(u);
                        setShowUserModal(true);
                      }}
                      style={{
                        background: T.inp,
                        border: "none",
                        borderRadius: 6,
                        padding: 5,
                        cursor: "pointer",
                      }}
                    >
                      <Edit size={12} color={T.sub} />
                    </button>
                    {u.active && (
                      <button
                        title="Desativar"
                        onClick={() => handleDeleteUser(u.id)}
                        style={{
                          background: "#fef2f2",
                          border: "none",
                          borderRadius: 6,
                          padding: 5,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ROLES TAB */}
          {tab === "roles" && isAdmin && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
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
                    height: "100%",
                    minHeight: 100,
                  }}
                >
                  <Plus size={20} />
                  Novo Cargo
                </button>
              </div>

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
                        style={{
                          background: T.inp,
                          border: "none",
                          borderRadius: 6,
                          padding: 4,
                          cursor: "pointer",
                        }}
                      >
                        <Edit size={12} color={T.sub} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(r.id)}
                        style={{
                          background: "#fef2f2",
                          border: "none",
                          borderRadius: 6,
                          padding: 4,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>
                    {users.filter((u) => u.role_id === r.id).length} usuário(s)
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTORS TAB */}
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
                      style={{
                        background: T.inp,
                        border: "none",
                        borderRadius: 6,
                        padding: 5,
                        cursor: "pointer",
                      }}
                    >
                      <Edit size={13} color={T.sub} />
                    </button>
                    <button
                      onClick={() => handleDeleteSector(s.id)}
                      style={{
                        background: "#fef2f2",
                        border: "none",
                        borderRadius: 6,
                        padding: 5,
                        cursor: "pointer",
                      }}
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

          {/* PERMISSIONS TAB */}
          {tab === "permissions" && isAdmin && (
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                overflow: "hidden",
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
                  Marque as caixas para conceder acesso. As alterações são
                  salvas automaticamente.
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.sub,
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
                        }}
                      >
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availableModules.map((mod, i) => (
                    <tr
                      key={mod}
                      style={{
                        borderBottom:
                          i < availableModules.length - 1
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
                        }}
                      >
                        {mod}
                      </td>
                      {roles.map((r) => {
                        const perms: any = r.permissions || {};
                        const hasAccess = !!perms[mod];

                        return (
                          <td
                            key={r.id}
                            style={{
                              padding: "10px 14px",
                              textAlign: "center",
                              fontSize: 14,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={hasAccess}
                              onChange={() => handleTogglePermission(r.id, mod)}
                              style={{
                                cursor: "pointer",
                                accentColor: "#98af3b",
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userId={passwordUserId!}
        userName={passwordUserName}
        T={T}
        isAdmin={isAdminPasswordReset}
      />

      {/* User Modal */}
      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSuccess={fetchData}
        user={editingUser}
        roles={roles}
        sectors={sectors}
        T={T}
      />

      {/* Role Modal */}
      <RoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSuccess={fetchData}
        role={editingRole}
        T={T}
      />

      {/* Sector Modal */}
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
