"use client";

import { RefreshCw, Clock, Bell, ChevronRight, Shield } from "lucide-react";
import { formatDateElSalvador } from "@/lib/date";

interface AdminNavbarProps {
  currentTabName: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function AdminNavbar({
  currentTabName,
  onRefresh,
  isRefreshing = false
}: AdminNavbarProps) {
  const now = new Date();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-medium text-slate-400">Administración</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-slate-800">{currentTabName}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Local time badge (El Salvador) */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Hora Local (SV): {formatDateElSalvador(now).split(",")[1] || "En vivo"}</span>
        </div>

        {/* Manual Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Sincronizando..." : "Actualizar"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
