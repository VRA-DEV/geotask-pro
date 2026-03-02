"use client";

import { LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  user: any;
  sidebarOpen: boolean;
  page: string;
  navItems: NavItem[];
  unreadCount: number;
  setPage: (page: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  user, sidebarOpen, page, navItems, unreadCount, setPage, onLogout,
}: SidebarProps) {
  return (
    <aside
      className={`flex flex-col flex-shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-gray-700 dark:bg-gray-900 ${sidebarOpen ? "w-[220px]" : "w-[60px]"}`}
    >
      {/* Logo */}
      <div className={`flex h-[60px] items-center justify-center border-b border-slate-200 dark:border-gray-700 ${sidebarOpen ? "px-4" : "px-0"}`}>
        {sidebarOpen ? (
          <img src="/logo.png" alt="GeoTask" className="max-h-8 max-w-[160px] object-contain" />
        ) : (
          <img src="/logoicone.png" alt="G" className="h-8 w-8 object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              title={label}
              className={`flex w-full items-center gap-2.5 rounded-[10px] border-none text-[13px] transition-all duration-150 cursor-pointer ${
                sidebarOpen ? "justify-start px-3 py-2.5" : "justify-center p-2.5"
              } ${
                active
                  ? "bg-primary font-semibold text-white"
                  : "bg-transparent font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon size={17} />
                {id === "notifications" && unreadCount > 0 && (
                  <div
                    className={`absolute -top-2 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold text-white ${
                      active ? "border-2 border-primary" : "border-2 border-white dark:border-gray-900"
                    }`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </div>
                )}
              </div>
              {sidebarOpen && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 p-2.5 dark:border-gray-700">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {user.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-gray-50">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400">
                {user.role?.name || "Sem cargo"}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="cursor-pointer border-none bg-transparent p-0.5"
            >
              <LogOut size={14} className="text-slate-500 dark:text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
              {user.avatar}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
