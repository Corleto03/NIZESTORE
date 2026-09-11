"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  ExternalLink,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Store
} from "lucide-react";

export type AdminTab = "resumen" | "pedidos" | "productos" | "categorias" | "carritos" | "clientes";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  adminName?: string;
  adminEmail?: string;
  badgeCounts?: {
    pedidosPendientes?: number;
    carritosAbandonados?: number;
  };
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  adminName = "Administrador",
  adminEmail = "admin@nizestore.com",
  badgeCounts = {}
}: AdminSidebarProps) {
  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: any;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: "resumen",
      label: "Resumen & Analítica",
      icon: LayoutDashboard,
    },
    {
      id: "pedidos",
      label: "Pedidos & Envíos",
      icon: ShoppingBag,
      badge: badgeCounts.pedidosPendientes,
      badgeColor: "bg-amber-500 text-white"
    },
    {
      id: "productos",
      label: "Catálogo de Productos",
      icon: Package,
    },
    {
      id: "categorias",
      label: "Categorías & Atributos",
      icon: FolderTree,
    },
    {
      id: "carritos",
      label: "Carritos Abandonados",
      icon: ShoppingCart,
      badge: badgeCounts.carritosAbandonados,
      badgeColor: "bg-rose-500 text-white"
    },
    {
      id: "clientes",
      label: "Clientes & Visitas",
      icon: Users,
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-screen fixed top-0 left-0 border-r border-slate-800 z-40 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-red-600/30">
              N
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-base leading-none block">
                NizeStore
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                Panel de Administración
              </span>
            </div>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-red-400 border border-slate-700">
            PROD
          </span>
        </div>

        {/* View public store button */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-between w-full px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-red-500 group-hover:text-red-400" />
            <span>Ver Tienda Online</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
          Gestión del Ecommerce
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? "bg-red-600 text-white shadow-sm shadow-red-600/20 font-semibold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    item.badgeColor || "bg-slate-800 text-slate-300"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs flex-shrink-0">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-white truncate block">
                {adminName}
              </span>
              <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            </div>
            <span className="text-[11px] text-slate-400 truncate block">
              {adminEmail}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Cerrar sesión"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
