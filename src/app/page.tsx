"use client";

import { AppPermissions, getPermissions } from "@/lib/permissions";
import {
  Bell,
  Calendar,
  FileText,
  Layers,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import {
  DashboardSkeleton,
  KanbanSkeleton,
  PageLoader,
  TableSkeleton,
} from "@/components/skeletons";
import { useLookups } from "@/hooks/useLookups";
import { useNotifications } from "@/hooks/useNotifications";
import { useTasks } from "@/hooks/useTasks";
import { useTemplates } from "@/hooks/useTemplates";
import { useUsers } from "@/hooks/useUsers";
import { SECTORS } from "@/lib/constants";
import { getTheme } from "@/lib/helpers";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { SettingsPage } from "./components/SettingsPage";

// ── Dynamic imports with contextual skeletons ────────────────────────
const DashboardPage = dynamic(
  () => import("@/components/dashboard/DashboardPage"),
  { loading: () => <DashboardSkeleton /> },
);
const KanbanPage = dynamic(() => import("@/components/kanban/KanbanPage"), {
  loading: () => <KanbanSkeleton />,
});
const MindMapPage = dynamic(() => import("@/components/mindmap/MindMapPage"), {
  loading: () => <PageLoader />,
});
const CronogramaPage = dynamic(
  () => import("@/components/cronograma/CronogramaPage"),
  { loading: () => <TableSkeleton /> },
);
const TemplatesPage = dynamic(
  () => import("@/components/templates/TemplatesPage"),
  { loading: () => <TableSkeleton rows={4} cols={3} /> },
);
const NotificationsPage = dynamic(
  () => import("@/components/notifications/NotificationsPage"),
  { loading: () => <PageLoader /> },
);
const TemplateModal = dynamic(
  () => import("@/components/templates/TemplateModal"),
);
const TaskDetailModal = dynamic(
  () => import("@/components/tasks/TaskDetailModal"),
);
const NewTaskModal = dynamic(() => import("@/components/tasks/NewTaskModal"));

// ── MAIN APP ──────────────────────────────────────────────────────────
export default function GeoTask() {
  const router = useRouter();

  // ── Zustand stores ──────────────────────────────────────────────────
  const {
    user,
    loading: authLoading,
    setUser,
    setLoading,
    logout,
    clearMustChangePassword,
  } = useAuthStore();
  const {
    dark,
    page,
    sidebarOpen,
    settingsTab,
    showNewTask,
    showMustChangePassword,
    showNotifPopover,
    showTemplateModal,
    toggleDark,
    setPage,
    toggleSidebar,
    setSettingsTab,
    setShowNewTask,
    setShowMustChangePassword,
    setShowNotifPopover,
    toggleNotifPopover,
    setShowTemplateModal,
  } = useUIStore();

  // ── SWR hooks (cached data fetching) ────────────────────────────────
  const { tasks, mutate: mutateTasks } = useTasks();
  const { users: dbUsers } = useUsers();
  const {
    contracts,
    sectors: dbSectors,
    citiesNeighborhoods,
    taskTypes,
  } = useLookups();
  const { templates, saveTemplate, deleteTemplate } = useTemplates();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications(user?.id ?? null);

  // ── Local state ─────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // T is still needed by legacy components (Dashboard, Kanban, etc.)
  const T = getTheme(dark);

  // ── Derived: merged sectors ─────────────────────────────────────────
  const mergedSectors = useMemo(() => {
    const combined = [...dbSectors];
    SECTORS.forEach((s) => {
      if (
        !combined.some(
          (ds: any) =>
            (ds.name || ds).toLowerCase().trim() === s.toLowerCase().trim(),
        )
      ) {
        combined.push({ id: s, name: s });
      }
    });
    return combined.sort((a: any, b: any) =>
      String(a.name || a).localeCompare(String(b.name || b)),
    );
  }, [dbSectors]);

  // ── Sync dark class on <html> for Tailwind dark: variants ──────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // ── Session restore ─────────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const saved = localStorage.getItem("geotask_user");
      if (!saved) {
        setLoading(false);
        router.push("/login");
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        if (!parsed?.id) throw new Error("invalid");
        const res = await fetch("/api/auth/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: parsed.id }),
        });
        if (!res.ok) throw new Error("unauthorized");
        const refreshedUser = await res.json();
        setUser(refreshedUser);
        localStorage.setItem("geotask_user", JSON.stringify(refreshedUser));
        if (refreshedUser?.role?.name === "Liderado") setPage("kanban");
        setLoading(false);
      } catch {
        localStorage.removeItem("geotask_user");
        setUser(null);
        router.push("/login");
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user?.must_change_password) setShowMustChangePassword(true);
  }, [user]);

  // ── Task actions ────────────────────────────────────────────────────
  const handleCreateTask = async (newTask: any) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, created_by: user?.id }),
      });
      if (res.ok) {
        await mutateTasks();
        setShowNewTask(false);
      } else alert("Erro ao criar tarefa");
    } catch (err) {
      console.error(err);
      alert("Erro ao criar tarefa");
    }
  };

  const handleUpdateTask = async (
    id: number,
    action: string,
    data: any = {},
  ) => {
    try {
      if (action === "refresh") {
        await mutateTasks();
        return;
      }
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, user_id: user?.id, ...data }),
      });
      if (res.ok) {
        await mutateTasks();
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTemplate = async (templateData: any) => {
    const success = await saveTemplate(templateData, user?.id);
    if (success) {
      setShowTemplateModal(false);
      setEditingTemplate(null);
      if (templateData.id && activeTemplate?.id === templateData.id)
        setActiveTemplate(null);
    } else alert("Erro ao salvar template");
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    await deleteTemplate(id);
    if (activeTemplate?.id === id) setActiveTemplate(null);
  };

  // ── Permissions ─────────────────────────────────────────────────────
  const appPerms = getPermissions(user);

  const canAccess = (p: keyof AppPermissions["pages"] | "notifications") => {
    if (!user) return false;
    if (p === "notifications") return true;
    return appPerms.pages[p as keyof AppPermissions["pages"]];
  };

  const canCreate = appPerms.tasks.create;

  // ── Task visibility (role-based filtering) ──────────────────────────
  const isLiderado = user?.role?.name === "Liderado";
  const isGestor = user?.role?.name === "Gestor";
  const userSectorId = user?.sector?.id || user?.sector_id;
  const userSectorName = user?.sector?.name;

  const visibleTasks = useMemo(() => {
    if (isLiderado && user) {
      return tasks.filter(
        (t: any) =>
          t.responsible_id === user.id ||
          t.responsible?.id === user.id ||
          (t.subtasks || []).some(
            (s: any) =>
              s.responsible_id === user.id || s.responsible?.id === user.id,
          ),
      );
    }
    if (isGestor) {
      return tasks.filter((t: any) => {
        const tSectorId = t.sector_id || t.sector?.id;
        const tSectorName =
          typeof t.sector === "string" ? t.sector : t.sector?.name;
        if (userSectorId && tSectorId) return tSectorId === userSectorId;
        if (userSectorName && tSectorName)
          return tSectorName.toLowerCase() === userSectorName.toLowerCase();
        return false;
      });
    }
    return tasks;
  }, [tasks, isLiderado, isGestor, user, userSectorId, userSectorName]);

  // ── Auth guard ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-gray-50">
        Carregando...
      </div>
    );
  }
  if (!user) return null;

  // ── Nav items (role-filtered) ───────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "kanban", label: "Quadro de Tarefas", icon: Layers },
    { id: "cronograma", label: "Cronograma", icon: Calendar },
    { id: "mindmap", label: "Mapa de Tarefas", icon: FileText },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "settings", label: "Configurações", icon: Settings },
  ].filter(({ id }) => canAccess(id as any));

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans dark:bg-gray-950">
      <Sidebar
        user={user}
        sidebarOpen={sidebarOpen}
        page={page}
        navItems={navItems}
        unreadCount={unreadCount}
        setPage={setPage}
        onLogout={() => {
          logout();
          router.push("/login");
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          dark={dark}
          toggleDark={toggleDark}
          toggleSidebar={toggleSidebar}
          notifications={notifications}
          unreadCount={unreadCount}
          markRead={markRead}
          markAllRead={markAllRead}
          showNotifPopover={showNotifPopover}
          toggleNotifPopover={toggleNotifPopover}
          setShowNotifPopover={setShowNotifPopover}
          tasks={tasks}
          setSelectedTask={setSelectedTask}
          setPage={setPage}
        />

        {/* ── PAGE CONTENT ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-6">
          {page === "dashboard" && (
            <DashboardPage
              T={T}
              tasks={visibleTasks}
              user={user}
              onSelect={setSelectedTask}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={mergedSectors}
              taskTypes={taskTypes}
            />
          )}
          {page === "kanban" && (
            <KanbanPage
              T={T}
              tasks={visibleTasks}
              user={user}
              onSelect={setSelectedTask}
              canCreate={canCreate}
              onNew={() => setShowNewTask(true)}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={mergedSectors}
              taskTypes={taskTypes}
            />
          )}
          {page === "map" && (
            <div className="flex h-full items-center justify-center text-slate-500 dark:text-gray-400">
              Interface do Mapa em desenvolvimento.
            </div>
          )}
          {page === "mindmap" && (
            <MindMapPage
              T={T}
              tasks={visibleTasks}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
            />
          )}
          {page === "cronograma" && (
            <CronogramaPage
              T={T}
              tasks={visibleTasks}
              onSelect={setSelectedTask}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={mergedSectors}
            />
          )}
          {page === "templates" && canAccess("templates") && (
            <TemplatesPage
              active={activeTemplate}
              setActive={setActiveTemplate}
              templates={templates}
              onCreate={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              onEdit={(tpl: any) => {
                setEditingTemplate(tpl);
                setShowTemplateModal(true);
              }}
              onDelete={handleDeleteTemplate}
            />
          )}
          {page === "settings" && canAccess("settings") && (
            <SettingsPage
              T={T}
              tab={settingsTab}
              setTab={setSettingsTab}
              currentUser={user as any}
            />
          )}
          {page === "notifications" && (
            <NotificationsPage
              dark={dark}
              notifications={notifications}
              tasks={tasks}
              unreadCount={unreadCount}
              markRead={markRead}
              markAllRead={markAllRead}
              setSelectedTask={setSelectedTask}
            />
          )}
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          T={T}
          task={selectedTask}
          user={user}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          users={dbUsers}
          contracts={contracts}
          citiesNeighborhoods={citiesNeighborhoods}
          tasks={tasks}
          setSelectedTask={setSelectedTask}
          sectors={mergedSectors}
          taskTypes={taskTypes}
        />
      )}
      {showNewTask && (
        <NewTaskModal
          T={T}
          onClose={() => setShowNewTask(false)}
          onSave={handleCreateTask}
          user={user}
          users={dbUsers}
          contracts={contracts}
          citiesNeighborhoods={citiesNeighborhoods}
          templates={templates}
          sectors={mergedSectors}
          taskTypes={taskTypes}
        />
      )}
      {showMustChangePassword && user && (
        <ChangePasswordModal
          isOpen={showMustChangePassword}
          onClose={() => {
            setShowMustChangePassword(false);
            clearMustChangePassword();
          }}
          userId={user.id}
          userName={user.name}
          T={T}
          isAdmin={false}
          isMandatory={true}
        />
      )}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
          sectors={mergedSectors.map((s: any) => s.name)}
        />
      )}
    </div>
  );
}
