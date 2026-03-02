"use client";

import { AlignLeft, Bell, Moon, Sun } from "lucide-react";

interface TopBarProps {
  dark: boolean;
  toggleDark: () => void;
  toggleSidebar: () => void;
  notifications: any[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  showNotifPopover: boolean;
  toggleNotifPopover: () => void;
  setShowNotifPopover: (v: boolean) => void;
  tasks: any[];
  setSelectedTask: (t: any) => void;
  setPage: (p: string) => void;
}

export function TopBar({
  dark, toggleDark, toggleSidebar, notifications, unreadCount,
  markRead, markAllRead, showNotifPopover, toggleNotifPopover,
  setShowNotifPopover, tasks, setSelectedTask, setPage,
}: TopBarProps) {
  return (
    <header className="flex h-[60px] flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 dark:border-gray-700 dark:bg-gray-900">
      <button
        onClick={toggleSidebar}
        className="flex cursor-pointer rounded-lg border-none bg-slate-100 p-1.5 dark:bg-gray-700"
      >
        <AlignLeft size={16} className="text-slate-500 dark:text-gray-400" />
      </button>
      <div className="flex-1" />
      <button
        onClick={toggleDark}
        className="flex cursor-pointer rounded-lg border-none bg-slate-100 p-1.5 dark:bg-gray-700"
      >
        {dark ? (
          <Sun size={16} className="text-slate-500 dark:text-gray-400" />
        ) : (
          <Moon size={16} className="text-slate-500 dark:text-gray-400" />
        )}
      </button>

      {/* Notification popover */}
      <div className="relative">
        <button
          onClick={toggleNotifPopover}
          className="relative flex cursor-pointer rounded-lg border-none bg-slate-100 p-1.5 dark:bg-gray-700"
        >
          <Bell size={16} className="text-slate-500 dark:text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {showNotifPopover && (
          <div className="absolute top-10 right-0 z-[1000] w-[340px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-3 dark:border-gray-700">
              <span className="text-[13px] font-bold text-slate-900 dark:text-gray-50">
                Notificações {unreadCount > 0 && `(${unreadCount} novas)`}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="cursor-pointer border-none bg-transparent text-[11px] font-semibold text-primary"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-slate-500 dark:text-gray-400">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.slice(0, 20).map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (n.task_id) {
                        const t = tasks.find((tk: any) => tk.id === n.task_id);
                        if (t) setSelectedTask(t);
                      }
                      setShowNotifPopover(false);
                    }}
                    className={`flex cursor-pointer items-start gap-2.5 border-b border-slate-200 px-3.5 py-2.5 dark:border-gray-700 ${
                      n.read ? "bg-transparent" : dark ? "bg-indigo-500/[0.08]" : "bg-violet-100"
                    }`}
                  >
                    <div
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        n.read ? "bg-slate-200 dark:bg-gray-700" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-gray-50">
                        {n.title}
                      </div>
                      {n.message && (
                        <div className="truncate text-[11px] text-slate-500 dark:text-gray-400">
                          {n.message}
                        </div>
                      )}
                      <div className="mt-0.5 text-[10px] text-slate-500 dark:text-gray-400">
                        {new Date(n.created_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={() => { setPage("notifications"); setShowNotifPopover(false); }}
                className="w-full cursor-pointer border-0 border-t border-solid border-slate-200 bg-slate-100 py-2.5 text-center text-xs font-semibold text-primary dark:border-gray-700 dark:bg-gray-700"
              >
                Ver todas
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;
