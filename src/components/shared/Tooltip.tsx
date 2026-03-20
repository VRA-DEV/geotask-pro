"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string | undefined | null;
  children: React.ReactNode;
}

/**
 * A themed tooltip component that follows GeoTask-Pro design principles.
 * Uses React Portals and fixed positioning to prevent clipping by overflow-hidden/auto parents.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, side: "top", align: "center" });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalNode(document.getElementById("tooltip-root"));
  }, []);

  /**
   * Calculates the exact coordinates for the fixed-position tooltip.
   */
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;

      // Vertical decision: Use 220px threshold to flip downwards if tight at the top
      let side = "top";
      if (spaceAbove < 220 && spaceBelow > spaceAbove) {
        side = "bottom";
      }

      // Horizontal decision: adjust if near sideways screen edges
      let align = "center";
      if (spaceLeft < 140) {
        align = "start";
      } else if (spaceRight < 140) {
        align = "end";
      }

      // Calculate base coordinates
      let top = side === "top" ? rect.top - 12 : rect.bottom + 12;
      let left = rect.left + rect.width / 2;
      
      if (align === "start") {
        left = rect.left;
      } else if (align === "end") {
        left = rect.right;
      }

      setCoords({ top, left, side, align });
    }
  };

  // Re-calculate positioning on interaction and window events
  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handle = () => updatePosition();
      window.addEventListener("resize", handle);
      window.addEventListener("scroll", handle, true);
      return () => {
        window.removeEventListener("resize", handle);
        window.removeEventListener("scroll", handle, true);
      };
    }
  }, [isVisible]);

  if (!content) return <>{children}</>;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible(!isVisible)}
    >
      {children}
      {isVisible && portalNode && createPortal(
        <div 
          className={`fixed z-[9999] w-64 p-3 bg-white dark:bg-(--t-card) border border-slate-200 dark:border-(--t-border) rounded-xl shadow-2xl animate-scale-in pointer-events-none transition-all duration-200
            ${coords.side === "top" ? "-translate-y-full" : ""}
            ${coords.align === "center" ? "-translate-x-1/2" : coords.align === "end" ? "-translate-x-full" : ""}
          `}
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px` 
          }}
        >
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 border-b border-slate-100 dark:border-white/5 pb-1">
            Descrição da Tarefa:
          </div>
          <div className="text-[11px] text-slate-600 dark:text-(--t-text) leading-relaxed">
            {content}
          </div>
          
          {/* Arrow */}
          <div className={`absolute border-[6px] border-transparent 
            ${coords.side === "top" ? "top-full border-t-white dark:border-t-(--t-card)" : "bottom-full border-b-white dark:border-b-(--t-card)"}
            ${coords.align === "center" ? "left-1/2 -translate-x-1/2" : coords.align === "start" ? "left-[14px]" : "right-[14px]"}
          `} />
          
          {/* Outer arrow border for contrast effect */}
          <div className={`absolute -z-10 border-[7px] border-transparent 
            ${coords.side === "top" ? "top-[calc(100%+1px)] border-t-slate-200 dark:border-t-(--t-border)" : "bottom-[calc(100%+1px)] border-b-slate-200 dark:border-b-(--t-border)"}
            ${coords.align === "center" ? "left-1/2 -translate-x-1/2" : coords.align === "start" ? "left-[13.5px]" : "right-[13.5px]"}
          `} />
        </div>,
        portalNode
      )}
    </div>
  );
}
