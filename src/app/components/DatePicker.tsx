import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function DatePicker({
  date,
  setDate,
  label,
  T,
}: {
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  label: string;
  T: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: Date | undefined) => {
    setDate(val);
    setIsOpen(false);
  };

  let displayValue = "Selecione...";
  if (date) {
    displayValue = format(date, "dd/MM/yyyy", { locale: ptBR });
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: T.sub,
          marginBottom: 4,
          display: "block",
        }}
      >
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
          color: date ? T.text : T.sub,
          minWidth: 160,
        }}
      >
        <CalendarIcon size={14} color={T.sub} />
        <span style={{ flex: 1 }}>{displayValue}</span>
        {date && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setDate(undefined);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
              borderRadius: 4,
            }}
          >
            <X size={12} color={T.sub} />
          </div>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            zIndex: 9999,
            padding: 10,
          }}
        >
          <style>{`
            .rdp { --rdp-cell-size: 32px; margin: 0; }
            .rdp-day_selected { background-color: #98af3b !important; color: white !important; }
            .rdp-day_today { font-weight: bold; color: #98af3b; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: ${T.inp}; }
             /* Darken week day labels */
            .rdp-head_cell { color: #64748b !important; font-weight: 600; }
          `}</style>
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleSelect}
            locale={ptBR}
          />
        </div>
      )}
    </div>
  );
}
