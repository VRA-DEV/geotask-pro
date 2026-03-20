"use client";

import React, { useState } from "react";

interface TooltipProps {
  content: string | undefined | null;
  children: React.ReactNode;
}

/**
 * A themed tooltip component that follows GeoTask-Pro design principles.
 * Shows "Descrição da Tarefa:" followed by the content on hover.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return <>{children}</>;

  return (
    <div 
      className="relative w-full h-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-64 p-3 bg-white dark:bg-(--t-card) border border-slate-200 dark:border-(--t-border) rounded-xl shadow-2xl z-50 animate-scale-in pointer-events-none">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 border-b border-slate-100 dark:border-white/5 pb-1">
            Descrição da Tarefa:
          </div>
          <div className="text-[11px] text-slate-600 dark:text-(--t-text) leading-relaxed">
            {content}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white dark:border-t-(--t-card)" />
          {/* Subtle outer arrow border for dark mode/light contrast */}
          <div className="absolute top-[calc(100%+1px)] left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-slate-200 dark:border-t-(--t-border) -z-10" />
        </div>
      )}
    </div>
  );
}
