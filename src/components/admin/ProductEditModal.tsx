"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  Lock,
  Loader2,
  Save,
  Package,
  Layers,
  Plus
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import VariantImagePicker from "./VariantImagePicker";

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  productId: number | null;
  categorias: any[];
  franquicias: any[];
}

export default function ProductEditModal({
  isOpen,
  onClose,
  onUpdated,
  productId,
  categorias = [],
  franquicias = []
}: ProductEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [hasSales, setHasSales] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState<number>(1);
  const [franquiciaId, setFranquiciaId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [estado, setEstado] = useState<string>("activo");
  const [precio, setPrecio] = useState<string>("");
  const [costo, setCosto] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [variantes, setVariantes] = useState<any[]>([]);
  const [especificaciones, setEspecificaciones] = useState<Array<{ atributo: string; valor: string }>>([]);

  useEffect(() => {
    if (!isOpen || !productId) return;

    const loadProduct = async () => {
      setLoading(true);
      setErrorMsg(null);
      setShowDeleteConfirm(false);
      try {
        const res = await fetch(`/api/admin/productos/${productId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Error al cargar producto");
        }

        const p = data.producto;
        setHasSales(data.tiene_ventas);
        setTotalSales(data.total_pedidos || 0);

        setNombre(p.nombre_producto || "");
        setDescripcion(p.descripcion || "");
        setCategoriaId(p.id_categoria);
        setFranquiciaId(p.id_franquicia ? String(p.id_franquicia) : "");
        setImageUrl(p.url_imagen || "");
        setEstado(p.estado || "activo");

        const mainVar = p.producto_variante?.[0];
        setPrecio(mainVar ? String(mainVar.precio) : "");
        setCosto(mainVar ? String(mainVar.costo) : "");
        setStock(mainVar ? String(mainVar.stock_disponible) : "0");
        
        if (p.producto_variante && p.producto_variante.length > 0) {
          setVariantes(p.producto_variante.map((v: any) => ({
            id_variante: v.id_variante,
            talla: v.variante_apariencia?.talla || "",
            color: v.variante_apariencia?.color || "",
            precio: String(v.precio),
            costo: String(v.costo),
            stock: String(v.stock_disponible),
            sku: v.sku || "",
            url_imagen: v.url_imagen || "",
            descripcion_variante: v.descripcion_variante || ""
          })));
        } else {
          setVariantes([]);
        }

        setEspecificaciones(
          p.especificacion_producto?.map((sp: any) => ({
            atributo: sp.atributo,
            valor: sp.valor
          })) || []
        );
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cargar datos del producto");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [isOpen, productId]);

  const addSpec = () => {
    setEspecificaciones([...especificaciones, { atributo: "", valor: "" }]);
  };

  const updateSpec = (idx: number, field: "atributo" | "valor", val: string) => {
    const updated = [...especificaciones];
    updated[idx][field] = val;
    setEspecificaciones(updated);
  };

  const removeSpec = (idx: number) => {
    setEspecificaciones(especificaciones.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/productos/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_producto: nombre,
          descripcion,
          id_categoria: categoriaId,
          id_franquicia: franquiciaId ? parseInt(franquiciaId, 10) : null,
          url_imagen: imageUrl,
          estado,
          precio,
          costo,
          stock_disponible: stock,
          variantes,
          especificaciones: especificaciones.filter((s) => s.atributo.trim() && s.valor.trim())
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al actualizar producto");
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;

    setDeleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/productos/${productId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo eliminar el producto");
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar producto");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-sm">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Editar Producto #{productId}</h3>
              <p className="text-xs text-slate-400">
                Ajusta inventario, precios, especificaciones o estado en la tienda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Cargando información del producto...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} id="edit-prod-form" className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Data Integrity Notice */}
              {hasSales ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Producto con {totalSales} ventas registradas</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Para preservar la coherencia de las facturas y pedidos históricos, la categoría está bloqueada. Puedes ajustar precios, stock, estado (pausar/activar) y fotos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-medium text-[11px]">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Este producto no tiene compras asociadas. Puedes modificar todos sus datos o eliminarlo de forma segura.</span>
                </div>
              )}

              {/* Status and Active Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="font-bold text-slate-900 block">Disponibilidad en Tienda</span>
                  <p className="text-[11px] text-slate-500">
                    {estado === "activo"
                      ? "Visible y disponible para comprar por los clientes"
                      : "Pausado: Oculto de la tienda y no permite compras"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEstado(estado === "activo" ? "inactivo" : "activo")}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
                      estado === "activo"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-300 text-slate-700"
                    }`}
                  >
                    {estado === "activo" ? "Activo en Tienda" : "Pausado / Oculto"}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={hasSales}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Category and Franchise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Categoría {hasSales && "(Protegida)"}
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(parseInt(e.target.value, 10))}
                    disabled={hasSales}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nombre_categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Franquicia
                  </label>
                  <select
                    value={franquiciaId}
                    onChange={(e) => setFranquiciaId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
                  >
                    <option value="">Sin franquicia específica</option>
                    {franquicias.map((f) => (
                      <option key={f.id_franquicia} value={f.id_franquicia}>
                        {f.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Stock (or Variants) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-red-600" />
                      <span>Opciones y Variantes del Producto</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {variantes.length > 1 || (variantes[0] && (variantes[0].talla || variantes[0].color))
                        ? `Este producto tiene ${variantes.length} variante(s) con foto, precio y stock individual.`
                        : "Actualmente es un producto simple con inventario y precio único."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {variantes.length <= 1 && !(variantes[0] && (variantes[0].talla || variantes[0].color)) ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Convert simple to variable with 2 initial options
                          const main = variantes[0] || {};
                          setVariantes([
                            {
                              id_variante: main.id_variante,
                              talla: "M",
                              color: "Negro",
                              precio: precio || String(main.precio || "24.99"),
                              costo: costo || String(main.costo || "14.00"),
                              stock: stock || String(main.stock || "10"),
                              sku: main.sku || `NZ-${productId}-M-BLK`,
                              url_imagen: imageUrl || "",
                              descripcion_variante: ""
                            },
                            {
                              talla: "L",
                              color: "Blanco",
                              precio: precio || String(main.precio || "24.99"),
                              costo: costo || String(main.costo || "14.00"),
                              stock: "10",
                              sku: `NZ-${productId}-L-WHT`,
                              url_imagen: "",
                              descripcion_variante: ""
                            }
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Habilitar Opciones / Variantes</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const last = variantes[variantes.length - 1] || {};
                          setVariantes([
                            ...variantes,
                            {
                              talla: "XL",
                              color: last.color || "Personalizado",
                              precio: last.precio || precio || "24.99",
                              costo: last.costo || costo || "14.00",
                              stock: "10",
                              sku: `NZ-${productId}-${Date.now().toString().slice(-4)}`,
                              url_imagen: "",
                              descripcion_variante: ""
                            }
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir otra variante</span>
                      </button>
                    )}
                  </div>
                </div>

                {variantes.length > 1 || (variantes[0] && (variantes[0].talla || variantes[0].color)) ? (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-100 px-3 py-2.5 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <div className="col-span-4">Foto / Atributos (Talla y Color)</div>
                        <div className="col-span-2 text-center">Precio ($)</div>
                        <div className="col-span-2 text-center">Costo ($)</div>
                        <div className="col-span-2 text-center">Stock</div>
                        <div className="col-span-2">SKU / Acciones</div>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white">
                        {variantes.map((v, idx) => (
                          <div key={v.id_variante || idx} className="p-3 space-y-2">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              {/* Photo + Talla + Color inputs */}
                              <div className="col-span-4">
                                <div className="flex items-center gap-2">
                                  <VariantImagePicker
                                    value={v.url_imagen || ""}
                                    onChange={(url) => {
                                      const newV = [...variantes];
                                      newV[idx].url_imagen = url;
                                      setVariantes(newV);
                                    }}
                                    fallbackImage={imageUrl}
                                  />
                                  <div className="flex-1 flex gap-1">
                                    <input
                                      type="text"
                                      value={v.talla || ""}
                                      onChange={(e) => {
                                        const newV = [...variantes];
                                        newV[idx].talla = e.target.value;
                                        setVariantes(newV);
                                      }}
                                      placeholder="Talla"
                                      className="w-1/2 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold"
                                    />
                                    <input
                                      type="text"
                                      value={v.color || ""}
                                      onChange={(e) => {
                                        const newV = [...variantes];
                                        newV[idx].color = e.target.value;
                                        setVariantes(newV);
                                      }}
                                      placeholder="Color"
                                      className="w-1/2 text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={v.precio}
                                  onChange={(e) => {
                                    const newV = [...variantes];
                                    newV[idx].precio = e.target.value;
                                    setVariantes(newV);
                                  }}
                                  className="w-full text-xs text-center px-1.5 py-1.5 border border-slate-300 rounded font-bold"
                                />
                              </div>

                              {/* Cost */}
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={v.costo}
                                  onChange={(e) => {
                                    const newV = [...variantes];
                                    newV[idx].costo = e.target.value;
                                    setVariantes(newV);
                                  }}
                                  className="w-full text-xs text-center px-1.5 py-1.5 border border-slate-300 rounded text-slate-600"
                                />
                              </div>

                              {/* Stock */}
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => {
                                    const newV = [...variantes];
                                    newV[idx].stock = e.target.value;
                                    setVariantes(newV);
                                  }}
                                  className="w-full text-xs text-center px-1.5 py-1.5 border border-slate-300 rounded font-bold"
                                />
                              </div>

                              {/* SKU and Remove button */}
                              <div className="col-span-2 flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={v.sku}
                                  onChange={(e) => {
                                    const newV = [...variantes];
                                    newV[idx].sku = e.target.value;
                                    setVariantes(newV);
                                  }}
                                  className="flex-1 text-[11px] uppercase px-1.5 py-1.5 border border-slate-300 rounded"
                                />
                                {variantes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVariantes(variantes.filter((_, i) => i !== idx));
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Quitar variante"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Individual description input */}
                            <div>
                              <input
                                type="text"
                                value={v.descripcion_variante || ""}
                                onChange={(e) => {
                                  const newV = [...variantes];
                                  newV[idx].descripcion_variante = e.target.value;
                                  setVariantes(newV);
                                }}
                                placeholder="Nota o descripción particular de esta variante (ej: Edición con detalles dorados, algodón blanco)"
                                className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:bg-white focus:border-red-500 outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Precio Venta ($ USD) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Costo ($ USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={costo}
                        onChange={(e) => setCosto(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Stock Disponible *
                      </label>
                      <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Image Uploader */}
              <ImageUploader
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
                label="Fotografía del Producto"
              />

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Dynamic Specifications */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-red-600" />
                    <span>Especificaciones Técnicas</span>
                  </span>
                  <button
                    type="button"
                    onClick={addSpec}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700"
                  >
                    <Plus className="w-3 h-3" />
                    Añadir Atributo
                  </button>
                </div>

                {especificaciones.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Sin especificaciones registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {especificaciones.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={spec.atributo}
                          onChange={(e) => updateSpec(i, "atributo", e.target.value)}
                          placeholder="Atributo (ej: Material)"
                          className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={spec.valor}
                          onChange={(e) => updateSpec(i, "valor", e.target.value)}
                          placeholder="Valor (ej: PVC & ABS)"
                          className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpec(i)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Delete Confirmation Card */}
          {showDeleteConfirm && (
            <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>¿Estás seguro de eliminar este producto definitivamente?</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Esta acción borrará el producto de la base de datos de manera irreversible. Solo es posible porque el producto no cuenta con ventas registradas.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sí, Eliminar de la Base de Datos</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {!hasSales && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Eliminar Producto</span>
              </button>
            )}
            {hasSales && (
              <span className="text-[11px] text-slate-400 italic">
                Eliminación restringida por ventas históricas
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cerrar
            </button>
            <button
              type="submit"
              form="edit-prod-form"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
