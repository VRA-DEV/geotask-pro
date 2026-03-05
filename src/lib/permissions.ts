import { User } from "@/types";

export interface AppPermissions {
  pages: {
    dashboard: boolean;
    kanban: boolean;
    cronograma: boolean;
    mindmap: boolean;
    templates: boolean;
    settings: boolean;
  };
  tasks: {
    create: boolean;
    edit_all: boolean; // Can edit any field of any task
    edit_retroactive_dates: boolean; // Can edit started_at and completed_at
    view_all_sectors: boolean; // Can view/filter tasks from all sectors
  };
  settings: {
    manage_users: boolean;
    manage_roles: boolean;
    manage_locations: boolean;
    manage_task_types: boolean;
  };
}

// Fallback logic for when the db `role.permissions` is legacy or empty
export const getPermissions = (user?: User | null): AppPermissions => {
  const defaultPerms: AppPermissions = {
    pages: {
      dashboard: false,
      kanban: false,
      cronograma: false,
      mindmap: false,
      templates: false,
      settings: false,
    },
    tasks: {
      create: false,
      edit_all: false,
      edit_retroactive_dates: false,
      view_all_sectors: false,
    },
    settings: {
      manage_users: false,
      manage_roles: false,
      manage_locations: false,
      manage_task_types: false,
    },
  };

  if (!user || !user.role) return defaultPerms;

  const roleName = user.role.name;
  const rawPerms: any = user.role.permissions || {};

  // If the rawPerms has the new structure `pages`, we use it.
  if (rawPerms && typeof rawPerms === "object" && "pages" in rawPerms) {
    return {
      pages: { ...defaultPerms.pages, ...(rawPerms.pages || {}) },
      tasks: { ...defaultPerms.tasks, ...(rawPerms.tasks || {}) },
      settings: { ...defaultPerms.settings, ...(rawPerms.settings || {}) },
    };
  }

  // Otherwise, fallback to hardcoded name-based logic (Migration mode)
  const isLiderado = roleName === "Liderado";
  const isGestor = roleName === "Gestor";
  const isCoord = roleName === "Coordenador";
  const isGerente = roleName === "Gerente";
  const isAdmin = roleName === "Admin";

  const legacyPerms = { ...defaultPerms };

  // Pages
  legacyPerms.pages.kanban = true;
  legacyPerms.pages.cronograma = true;
  legacyPerms.pages.mindmap = true;

  if (rawPerms["Dashboard"] && rawPerms["Dashboard"] !== "none") {
    legacyPerms.pages.dashboard = true;
  } else if (!isLiderado) {
    legacyPerms.pages.dashboard = true;
  }

  if (rawPerms["Templates"] && rawPerms["Templates"] !== "none") {
    legacyPerms.pages.templates = true;
  } else if (!isLiderado) {
    legacyPerms.pages.templates = true;
  }

  legacyPerms.pages.settings = isAdmin || isGerente || isCoord || isGestor;

  // Tasks
  legacyPerms.tasks.create = isAdmin || isGerente || isCoord || isGestor;
  legacyPerms.tasks.edit_all = isAdmin || isGerente || isCoord || isGestor;
  legacyPerms.tasks.edit_retroactive_dates = isAdmin || isGerente;
  legacyPerms.tasks.view_all_sectors = isAdmin || isGerente || isCoord;

  // Settings
  legacyPerms.settings.manage_locations = isAdmin || isGerente || isCoord;
  legacyPerms.settings.manage_task_types = isAdmin || isGerente;
  legacyPerms.settings.manage_users = isAdmin || isGerente;
  legacyPerms.settings.manage_roles = isAdmin;

  return legacyPerms;
};

export const canAccessResource = (
  user: User | null | undefined,
  resource: (perms: AppPermissions) => boolean,
) => {
  const perms = getPermissions(user);
  return resource(perms);
};
