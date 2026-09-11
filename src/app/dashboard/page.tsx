"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingDown,
  ShoppingBag,
  Smartphone,
  CreditCard,
  Users,
  Eye,
  Tag,
  DollarSign,
  AlertTriangle,
  Play,
  CheckCircle,
  RefreshCw,
  FolderTree,
  Building,
  Package,
  Truck,
  CheckCheck,
  Clock,
  XCircle,
  ChevronRight,
  FileText,
  MapPin,
  Store,
  Filter,
  X,
  ExternalLink,
  Plus,
  Search,
  ShoppingCart,
  Layers,
  Sparkles,
  ArrowRight,
  Edit3,
  Lock,
  Trash2
} from "lucide-react";
import { formatDateElSalvador } from "@/lib/date";
import ProductImage from "@/components/ui/ProductImage";
import AdminSidebar, { AdminTab } from "@/components/admin/AdminSidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";
import ProductWizardModal from "@/components/admin/ProductWizardModal";
import ProductEditModal from "@/components/admin/ProductEditModal";
import CategoryManager from "@/components/admin/CategoryManager";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("resumen");
  const [metrics, setMetrics] = useState<any>(null);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Products Catalog State
  const [productosList, setProductosList] = useState<any[]>([]);
  const [categoriasList, setCategoriasList] = useState<any[]>([]);
  const [franquiciasList, setFranquiciasList] = useState<any[]>([]);
  const [searchProd, setSearchProd] = useState("");
  const [filterCat, setFilterCat] = useState("todas");
  const [isProductWizardOpen, setIsProductWizardOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Orders Filter & Modal State
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Transfer Confirmation Modal State
  const [transferToConfirm, setTransferToConfirm] = useState<any | null>(null);
  const [confirmSuccessModal, setConfirmSuccessModal] = useState<any | null>(null);
  const [confirmErrorMsg, setConfirmErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMetrics, resPendientes, resPedidos, resProds] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/pedidos/pendientes"),
        fetch("/api/admin/pedidos"),
        fetch("/api/admin/productos")
      ]);

      if (resMetrics.ok) {
        const dataMetrics = await resMetrics.json();
        setMetrics(dataMetrics);
      }
      if (resPendientes.ok) {
        const dataPendientes = await resPendientes.json();
        setPendientes(dataPendientes);
      }
      if (resPedidos.ok) {
        const dataPedidos = await resPedidos.json();
        setPedidos(dataPedidos);
      }
      if (resProds.ok) {
        const dataProds = await resProds.json();
        setProductosList(dataProds.productos || []);
        setCategoriasList(dataProds.categorias || []);
        setFranquiciasList(dataProds.franquicias || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductStatus = async (idProducto: number, currentEstado: string) => {
    const nuevoEstado = currentEstado === "activo" ? "inactivo" : "activo";
    try {
      const res = await fetch(`/api/admin/productos/${idProducto}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam === "pedidos" ||
        tabParam === "productos" ||
        tabParam === "categorias" ||
        tabParam === "carritos" ||
        tabParam === "clientes" ||
        tabParam === "resumen"
      ) {
        setActiveTab(tabParam as AdminTab);
      }
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    } else if (status === "authenticated") {
      if (session.user.role !== "admin") {
        router.push("/");
      } else {
        fetchData();
      }
    }
  }, [status]);

  const handleSimulateAbandonment = async () => {
    setSimulating(true);
    setSimulationResult(null);

    try {
      const res = await fetch("/api/admin/abandonment/simulate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSimulationResult(data.message || "Simulación ejecutada correctamente.");
        await fetchData();
      } else {
        alert(data.message || "Error al simular abandono");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const handleConfirmTransfer = async (idPedido: number) => {
    setActionLoading(idPedido);
    setConfirmErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${idPedido}/confirmar-pago`, {
        method: "PATCH"
      });
      const data = await res.json();
      if (res.ok) {
        setTransferToConfirm(null);
        setConfirmSuccessModal({
          idPedido,
          message: data.message || "Pago confirmado correctamente"
        });
        await fetchData();
      } else {
        setConfirmErrorMsg(data.message || "Error al confirmar el pago");
      }
    } catch (e: any) {
      setConfirmErrorMsg(e.message || "Error de conexión al confirmar pago");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (idPedido: number, nuevoEstado: string) => {
    setStatusUpdating(idPedido);
    try {
      const res = await fetch(`/api/admin/pedidos/${idPedido}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado_pedido: nuevoEstado })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
        if (selectedPedido && selectedPedido.id_pedido === idPedido) {
          setSelectedPedido({ ...selectedPedido, estado_pedido: nuevoEstado });
        }
      } else {
        alert(data.message || "Error al actualizar estado");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatusUpdating(null);
    }
  };

  const resumen = metrics?.resumen || { total_carritos: 0, total_abandonados: 0, tasa_abandono_general: 0 };

  const filteredPedidos = pedidos.filter((p) => {
    if (estadoFilter === "todos") return true;
    if (estadoFilter === "pendientes_transferencia") {
      return p.estado_pedido === "pendiente" && p.metodo_pago?.tipo_metodo === "transferencia";
    }
    return p.estado_pedido === estadoFilter;
  });

  const getStatusBadge = (estado: string, isPickup: boolean = false) => {
    switch (estado) {
      case "pendiente":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pendiente
          </span>
        );
      case "confirmado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Confirmado
          </span>
        );
      case "pagado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Pagado
          </span>
        );
      case "preparando":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {isPickup ? "En Empaque" : "En Preparación"}
          </span>
        );
      case "enviado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {isPickup ? "Listo en Sucursal" : "En Camino"}
          </span>
        );
      case "entregado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            {isPickup ? "Retirado" : "Entregado"}
          </span>
        );
      case "cancelado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cancelado
          </span>
        );
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{estado}</span>;
    }
  };

  const renderNextStepButton = (ped: any) => {
    const isPickup = !!ped.id_sucursal_retiro;
    const currentState = ped.estado_pedido;
    const isUpdating = statusUpdating === ped.id_pedido;

    if (currentState === "pendiente") {
      if (ped.metodo_pago?.tipo_metodo === "transferencia") {
        return (
          <button
            type="button"
            onClick={() => setTransferToConfirm(ped)}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Aprobar Pago</span>
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={() => handleUpdateStatus(ped.id_pedido, "pagado")}
          disabled={isUpdating}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow-xs"
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Marcar Pagado</span>
        </button>
      );
    }

    if (currentState === "confirmado" || currentState === "pagado") {
      return (
        <button
          type="button"
          onClick={() => handleUpdateStatus(ped.id_pedido, "preparando")}
          disabled={isUpdating}
          className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow-xs"
        >
          <Package className="w-3.5 h-3.5" />
          <span>{isPickup ? "Preparar Paquete" : "Iniciar Preparación"}</span>
        </button>
      );
    }

    if (currentState === "preparando") {
      return (
        <button
          type="button"
          onClick={() => handleUpdateStatus(ped.id_pedido, "enviado")}
          disabled={isUpdating}
          className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow-xs"
        >
          {isPickup ? (
            <>
              <Store className="w-3.5 h-3.5" />
              <span>Listo para Retiro</span>
            </>
          ) : (
            <>
              <Truck className="w-3.5 h-3.5" />
              <span>Enviar a Domicilio</span>
            </>
          )}
        </button>
      );
    }

    if (currentState === "enviado") {
      return (
        <button
          type="button"
          onClick={() => handleUpdateStatus(ped.id_pedido, "entregado")}
          disabled={isUpdating}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow-xs"
          title={isPickup ? "Registrar entrega presencial al cliente en mostrador" : "Cierre administrativo de entrega (respaldo cuando el cliente no confirma en la web)"}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isPickup ? "Entregar en Tienda" : "Cierre de Entrega"}</span>
        </button>
      );
    }

    if (currentState === "entregado") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-100 rounded-md">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
          Completado
        </span>
      );
    }

    return null;
  };

  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case "resumen":
        return "Resumen Ejecutivo & Analítica";
      case "pedidos":
        return "Gestión de Pedidos & Envíos";
      case "productos":
        return "Catálogo de Productos";
      case "categorias":
        return "Categorías & Especificaciones";
      case "carritos":
        return "Carritos Abandonados";
      case "clientes":
        return "Clientes & Telemetría";
      default:
        return "Panel de Administración";
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-xs tracking-wider uppercase">
          Iniciando Panel de Administración NizeStore...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex">
      {/* WORDPRESS / SHOPIFY STYLE LEFT SIDEBAR */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminName={session?.user?.name || "Administrador"}
        adminEmail={session?.user?.email || "admin@nizestore.com"}
        badgeCounts={{
          pedidosPendientes: pendientes.length,
          carritosAbandonados: metrics?.carritosAbandonadosRecientes?.length || resumen?.total_abandonados || 0
        }}
      />

      {/* MAIN WORKSPACE WRAPPER (Offset by sidebar w-64) */}
      <div className="ml-64 flex-1 flex flex-col min-w-0">
        <AdminNavbar
          currentTabName={getTabTitle(activeTab)}
          onRefresh={fetchData}
          isRefreshing={loading}
        />

        {/* Content Container */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full">

          {/* ========================================================= */}
          {/* TAB 1: RESUMEN EJECUTIVO & ANALITICA */}
          {/* ========================================================= */}
          {activeTab === "resumen" && (
            <div className="space-y-6">
              {/* KPIs Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Carritos Totales
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">{resumen.total_carritos}</p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Sesiones con intención de compra</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tasa de Abandono
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-rose-600 mt-2">{resumen.tasa_abandono_general}%</p>
                  <span className="text-[11px] text-rose-600 mt-0.5 block">
                    {resumen.total_abandonados} carritos no convertidos
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Conversión a Ventas
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-emerald-700 mt-2">
                    {resumen.total_carritos ? (100 - resumen.tasa_abandono_general).toFixed(1) : 0}%
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Carritos finalizados en pedido</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Pedidos Registrados
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">{pedidos.length}</p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {pendientes.length} pendientes de aprobación
                  </span>
                </div>
              </div>

              {/* Business Analytics 2-column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Motivos de Abandono */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">01</span>
                      <h3 className="font-bold text-slate-900 text-sm">Factores Principales de Abandono</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Encuestas & Salidas</span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {metrics?.motivos?.length > 0 ? (
                      metrics.motivos.map((m: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{m.motivo}</span>
                            <span className="text-slate-900 font-bold">{m.cantidad} carritos</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-red-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (m.cantidad / (resumen.total_abandonados || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">Sin datos de carritos abandonados aún</p>
                    )}
                  </div>
                </div>

                {/* 2. Sensibilidad al Umbral de Envío Gratis ($35.00) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">02</span>
                      <h3 className="font-bold text-slate-900 text-sm">Sensibilidad al Umbral de Envío ($35.00)</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Fricción de Tarifa</span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {metrics?.rangoEnvio?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-900">{r.rango}</span>
                          <span className="text-rose-600">{r.tasa_abandono}% abandono</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, r.tasa_abandono)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{r.abandonados} carritos perdidos</span>
                          <span>{r.total} evaluados</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Abandono por Etapa del Embudo */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">03</span>
                      <h3 className="font-bold text-slate-900 text-sm">Abandono por Etapa de Checkout</h3>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {metrics?.etapas?.map((e: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {e.etapa.replace("_", " ")}
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-black text-rose-600">{e.cantidad} salidas</span>
                          <span className="text-[10px] text-slate-400 block">{e.porcentaje}% del total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Top Productos Más Vistos (vista_pagina) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">04</span>
                      <h3 className="font-bold text-slate-900 text-sm">Productos con Mayor Interés (Vistas)</h3>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                      En Vivo
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {metrics?.topVistas?.length > 0 ? (
                      metrics.topVistas.map((prod: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {prod.nombre}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded-md flex-shrink-0 ml-2">
                            {prod.vistas} vistas
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">Sin visitas registradas en catálogo</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Developer / Demo Simulation Card */}
              <div className="p-5 bg-slate-950 text-white rounded-2xl shadow-sm border border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Play className="w-4 h-4 text-red-400" />
                    <span>Simulador de Abandono de Carritos (Entorno de Demostración)</span>
                  </h4>
                  <p className="text-xs text-indigo-200/80">
                    Avanza artificialmente carritos inactivos y ejecuta el procedimiento almacenado para marcar motivos de salida.
                  </p>
                  {simulationResult && (
                    <p className="text-xs text-emerald-300 font-medium pt-1">✓ {simulationResult}</p>
                  )}
                </div>

                <button
                  onClick={handleSimulateAbandonment}
                  disabled={simulating}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
                >
                  {simulating ? "Ejecutando..." : "Ejecutar Simulación Ahora"}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PEDIDOS & ENVIOS (UNIFICADO) */}
          {/* ========================================================= */}
          {activeTab === "pedidos" && (
            <div className="space-y-6">
              {/* Filter Pills Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setEstadoFilter("todos")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      estadoFilter === "todos"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Todos ({pedidos.length})
                  </button>
                  <button
                    onClick={() => setEstadoFilter("pendientes_transferencia")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                      estadoFilter === "pendientes_transferencia"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-amber-800 hover:bg-amber-50"
                    }`}
                  >
                    <span>Pendientes de Transferencia</span>
                    {pendientes.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
                        {pendientes.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setEstadoFilter("pagado")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      estadoFilter === "pagado"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Pagados
                  </button>
                  <button
                    onClick={() => setEstadoFilter("preparando")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      estadoFilter === "preparando"
                        ? "bg-purple-700 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    En Preparación
                  </button>
                  <button
                    onClick={() => setEstadoFilter("enviado")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      estadoFilter === "enviado"
                        ? "bg-red-700 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    En Camino / Listo
                  </button>
                  <button
                    onClick={() => setEstadoFilter("entregado")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      estadoFilter === "entregado"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Entregados
                  </button>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                {filteredPedidos.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No hay pedidos en este estado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-4">Pedido</th>
                          <th className="p-4">Cliente</th>
                          <th className="p-4">Entrega</th>
                          <th className="p-4">Pago</th>
                          <th className="p-4">Total</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4">Factura</th>
                          <th className="p-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPedidos.map((ped) => {
                          const clienteNombre = ped.cliente?.cliente_natural
                            ? `${ped.cliente.cliente_natural.nombres} ${ped.cliente.cliente_natural.apellidos}`
                            : ped.cliente?.cliente_juridico?.nombre_comercial || ped.cliente?.correo;

                          const isPickup = !!ped.id_sucursal_retiro;
                          const metodoNombre = ped.metodo_pago?.nombre_metodo || "Transferencia / Tarjeta";
                          const facturaNum = ped.factura?.numero_documento;

                          return (
                            <tr key={ped.id_pedido} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-4">
                                <span className="font-mono font-bold text-slate-900 block">
                                  #{ped.id_pedido}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {formatDateElSalvador(ped.fecha_pedido).split(",")[0]}
                                </span>
                              </td>

                              <td className="p-4">
                                <p className="font-semibold text-slate-900">{clienteNombre}</p>
                                <span className="text-[11px] text-slate-400">{ped.cliente?.correo}</span>
                              </td>

                              <td className="p-4">
                                {isPickup ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                                    <Store className="w-3 h-3 text-slate-500" />
                                    {ped.sucursal?.nombre || "Retiro"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                                    <Truck className="w-3 h-3 text-slate-500" />
                                    A Domicilio
                                  </span>
                                )}
                              </td>

                              <td className="p-4">
                                <span className="font-medium text-slate-700">{metodoNombre}</span>
                              </td>

                              <td className="p-4 font-bold text-slate-900">
                                ${Number(ped.total).toFixed(2)}
                              </td>

                              <td className="p-4">
                                {getStatusBadge(ped.estado_pedido, isPickup)}
                              </td>

                              <td className="p-4 font-mono">
                                {facturaNum ? (
                                  <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                                    <FileText className="w-3 h-3 text-slate-500" />
                                    FAC-{facturaNum}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Pendiente</span>
                                )}
                              </td>

                              <td className="p-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {renderNextStepButton(ped)}
                                  <button
                                    onClick={() => setSelectedPedido(ped)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Ver detalle completo"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: CATALOGO DE PRODUCTOS */}
          {/* ========================================================= */}
          {activeTab === "productos" && (
            <div className="space-y-6">
              {/* Top Action Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o SKU..."
                      value={searchProd}
                      onChange={(e) => setSearchProd(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={filterCat}
                      onChange={(e) => setFilterCat(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-700"
                    >
                      <option value="todas">Todas las Categorías</option>
                      {categoriasList.map((cat) => (
                        <option key={cat.id_categoria} value={String(cat.id_categoria)}>
                          {cat.nombre_categoria}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setIsProductWizardOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Producto</span>
                </button>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                {productosList.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <Package className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm">No hay productos registrados en el catálogo.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-4">Producto</th>
                          <th className="p-4">Categoría</th>
                          <th className="p-4">SKU</th>
                          <th className="p-4">Precio Venta</th>
                          <th className="p-4">Stock Total</th>
                          <th className="p-4">Ventas</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productosList
                          .filter((prod) => {
                            const matchesCat = filterCat === "todas" || String(prod.id_categoria) === filterCat;
                            const matchesSearch =
                              !searchProd ||
                              prod.nombre_producto?.toLowerCase().includes(searchProd.toLowerCase()) ||
                              prod.producto_variante?.some((v: any) => v.sku?.toLowerCase().includes(searchProd.toLowerCase()));
                            return matchesCat && matchesSearch;
                          })
                          .map((prod) => {
                            const mainVar = prod.producto_variante?.[0];
                            const img = mainVar?.url_imagen || prod.url_imagen;
                            const stock = prod.producto_variante?.reduce((acc: number, v: any) => acc + (v.stock_disponible || 0), 0) ?? 0;
                            const precio = mainVar ? Number(mainVar.precio) : 0;
                            const costo = mainVar ? Number(mainVar.costo) : 0;
                            const isActivo = prod.estado === "activo";
                            const totalVentas = prod.producto_variante?.reduce((acc: number, v: any) => acc + (v._count?.detalle_pedido || 0), 0) ?? 0;

                            return (
                              <tr key={prod.id_producto} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <ProductImage
                                      src={img}
                                      alt={prod.nombre_producto}
                                      className="w-11 h-11 rounded-lg border border-slate-200 flex-shrink-0 object-cover"
                                    />
                                    <div>
                                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">{prod.nombre_producto}</p>
                                      {prod.franquicia && (
                                        <span className="inline-block text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded mt-0.5">
                                          {prod.franquicia.nombre}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="p-4 font-semibold text-slate-700">
                                  {prod.categoria?.nombre_categoria || "General"}
                                </td>

                                <td className="p-4 font-mono text-slate-600">
                                  {mainVar?.sku || "N/A"}
                                </td>

                                <td className="p-4">
                                  <span className="font-bold text-slate-900">${precio.toFixed(2)}</span>
                                  {costo > 0 && (
                                    <span className="block text-[10px] text-slate-400">Costo: ${costo.toFixed(2)}</span>
                                  )}
                                </td>

                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    stock > 5 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : stock > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      stock > 5 ? "bg-emerald-500" : stock > 0 ? "bg-amber-500" : "bg-rose-500"
                                    }`} />
                                    {stock} {stock === 1 ? "unidad" : "unidades"}
                                  </span>
                                </td>

                                <td className="p-4">
                                  {totalVentas > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" title={`${totalVentas} pedidos registrados en el historial`}>
                                      <Lock className="w-3 h-3 text-amber-600" />
                                      {totalVentas} {totalVentas === 1 ? "venta" : "ventas"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                                      0 ventas
                                    </span>
                                  )}
                                </td>

                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    isActivo ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? "bg-emerald-500" : "bg-slate-400"}`} />
                                    {isActivo ? "Activo" : "Pausado"}
                                  </span>
                                </td>

                                <td className="p-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingProductId(prod.id_producto);
                                        setIsEditModalOpen(true);
                                      }}
                                      className="text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1"
                                      title="Editar información, precios o eliminar si no tiene ventas"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Editar</span>
                                    </button>

                                    <button
                                      onClick={() => handleToggleProductStatus(prod.id_producto, prod.estado)}
                                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                                        isActivo
                                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                      }`}
                                      title={isActivo ? "Pausar para ocultar de la tienda pública" : "Activar para poner a la venta"}
                                    >
                                      {isActivo ? "Pausar" : "Activar"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: CATEGORIAS & ESPECIFICACIONES */}
          {/* ========================================================= */}
          {activeTab === "categorias" && (
            <CategoryManager
              categorias={categoriasList}
              onCategoryCreated={fetchData}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 5: CARRITOS ABANDONADOS */}
          {/* ========================================================= */}
          {activeTab === "carritos" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Monitoreo de Carritos Abandonados</h3>
                    <p className="text-xs text-slate-500">Sesiones inactivas detectadas con mercancía pendiente de pago</p>
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                    {resumen.total_abandonados} carritos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-semibold block mb-1">Tasa Global</span>
                    <span className="text-xl font-black text-rose-600">{resumen.tasa_abandono_general}%</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-semibold block mb-1">Total Analizados</span>
                    <span className="text-xl font-black text-slate-900">{resumen.total_carritos}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-semibold block mb-1">Recuperados por Cupón</span>
                    <span className="text-xl font-black text-emerald-700">3 carritos</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: CLIENTES & SESIONES */}
          {/* ========================================================= */}
          {activeTab === "clientes" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Base de Clientes & Compradores</h3>
                    <p className="text-xs text-slate-500">Aislamiento de sesiones: Clientes Registrados vs Invitados</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                      Sesiones Aisladas
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
                  <p className="font-semibold text-slate-900">Política de Privacidad de Métricas:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                    <li>Las cuentas de administradores están 100% excluidas de la telemetría de navegación (`vista_pagina`).</li>
                    <li>Las compras de usuarios invitados se asocian a identificadores únicos de dispositivo (`nizestore_device_id`) sin mezclar perfiles de clientes registrados.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* DYNAMIC PRODUCT WIZARD MODAL */}
      <ProductWizardModal
        isOpen={isProductWizardOpen}
        onClose={() => setIsProductWizardOpen(false)}
        onProductCreated={fetchData}
        categorias={categoriasList}
        franquicias={franquiciasList}
      />

      {/* PRODUCT EDIT & DELETE MODAL */}
      <ProductEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProductId(null);
        }}
        onUpdated={fetchData}
        productId={editingProductId}
        categorias={categoriasList}
        franquicias={franquiciasList}
      />

      {/* DETALLE DE PEDIDO MODAL */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Pedido #{selectedPedido.id_pedido}</h3>
                  {getStatusBadge(selectedPedido.estado_pedido)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registrado el {formatDateElSalvador(selectedPedido.fecha_pedido)}
                </p>
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">Datos del Cliente</span>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedPedido.cliente?.cliente_natural
                    ? `${selectedPedido.cliente.cliente_natural.nombres} ${selectedPedido.cliente.cliente_natural.apellidos}`
                    : selectedPedido.cliente?.cliente_juridico?.nombre_comercial || selectedPedido.cliente?.correo}
                </p>
                <p className="text-slate-600">{selectedPedido.cliente?.correo}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Tipo de Entrega</span>
                {selectedPedido.id_sucursal_retiro ? (
                  <div className="p-3 bg-white rounded-xl space-y-1 border border-slate-200">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                      <Store className="w-3.5 h-3.5 text-slate-600" /> Retiro en Sucursal
                    </span>
                    <p className="font-bold text-slate-900 text-xs mt-1">
                      {selectedPedido.sucursal?.nombre || "Sucursal"}
                    </p>
                    <p className="text-slate-600 text-xs">
                      {selectedPedido.sucursal?.direccion_detalle || "Local comercial"}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl space-y-1 border border-slate-200">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                      <Truck className="w-3.5 h-3.5 text-slate-600" /> Envío a Domicilio
                    </span>
                    <p className="text-slate-900 text-xs font-semibold mt-1">
                      {selectedPedido.direccion_pedido_id_direccion_envioTodireccion?.direccion_detalle || "Dirección no especificada"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Artículos */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Artículos del Pedido</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedPedido.detalle_pedido?.map((det: any) => {
                  const prod = det.producto_variante?.producto;
                  const img = det.producto_variante?.url_imagen || prod?.url_imagen;
                  const appearance = det.producto_variante?.variante_apariencia;

                  return (
                    <div key={det.id_detalle_pedido || det.id_variante} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <ProductImage src={img} alt={prod?.nombre_producto || "Producto"} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-semibold text-slate-900">{prod?.nombre_producto}</p>
                          <p className="text-slate-400">
                            SKU: {det.producto_variante?.sku} {appearance ? `(${appearance.color || ""} ${appearance.talla || ""})` : ""}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            Cant: {det.cantidad} × ${Number(det.precio_unitario).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">${Number(det.subtotal).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block">Facturación</span>
                {selectedPedido.factura ? (
                  <div className="p-2.5 bg-white rounded-lg text-slate-900 space-y-1 border border-slate-200">
                    <p className="font-semibold text-xs flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1 text-slate-600" /> Factura Electrónica
                    </p>
                    <p className="font-mono text-xs">N°: FAC-{selectedPedido.factura.numero_documento}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 bg-white p-2.5 rounded-lg text-xs border border-slate-200">
                    Facturación legal automática al confirmar el pago.
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>${Number(selectedPedido.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Envío:</span>
                  <span>${Number(selectedPedido.costo_envio || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total:</span>
                  <span className="text-red-600">${Number(selectedPedido.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>{renderNextStepButton(selectedPedido)}</div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR TRANSFERENCIA BANCARIA */}
      {transferToConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Aprobar Transferencia</h3>
                  <p className="text-xs text-slate-500">Orden de compra #{transferToConfirm.id_pedido}</p>
                </div>
              </div>
              <button
                onClick={() => setTransferToConfirm(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Comprador:</span>
                <span className="font-semibold text-slate-900">
                  {transferToConfirm.cliente?.cliente_natural
                    ? `${transferToConfirm.cliente.cliente_natural.nombres} ${transferToConfirm.cliente.cliente_natural.apellidos}`
                    : transferToConfirm.cliente?.correo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Monto del pedido:</span>
                <span className="font-bold text-slate-900 text-sm">
                  ${Number(transferToConfirm.total).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Comprobante / Referencia:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
                  {transferToConfirm.carrito?.intento_pago?.[0]?.proveedor_pasarela || "Transferencia"}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold flex items-center text-emerald-800">
                <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600 flex-shrink-0" />
                Acción del Sistema:
              </p>
              <ul className="list-disc pl-5 text-[11px] text-emerald-800 space-y-0.5">
                <li>El pedido avanzará al estado <strong>&quot;pagado&quot;</strong>.</li>
                <li>Se emitirá de forma automática la <strong>Factura Electrónica legal (FAC)</strong>.</li>
                <li>Se descontará del inventario oficial (Kardex).</li>
              </ul>
            </div>

            {confirmErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {confirmErrorMsg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTransferToConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading === transferToConfirm.id_pedido}
                onClick={() => handleConfirmTransfer(transferToConfirm.id_pedido)}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading === transferToConfirm.id_pedido ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Aprobando...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>Aprobar y Emitir Factura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXITO AL CONFIRMAR */}
      {confirmSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">¡Transferencia Aprobada!</h3>
              <p className="text-xs text-slate-500">
                El pedido <strong>#{confirmSuccessModal.idPedido}</strong> fue marcado como <strong>pagado</strong> exitosamente.
              </p>
              <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-medium mt-2">
                ✓ Factura electrónica legal emitida y asignada al cliente.
              </p>
            </div>
            <button
              onClick={() => setConfirmSuccessModal(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
