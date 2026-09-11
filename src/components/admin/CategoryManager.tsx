"use client";

import { useState } from "react";
import {
  FolderTree,
  Plus,
  Trash2,
  Check,
  X,
  Layers,
  Package,
  AlertCircle,
  Loader2,
  HelpCircle,
  Tag
} from "lucide-react";

interface CategoryManagerProps {
  categorias: any[];
  onCategoryCreated: () => void;
}

export default function CategoryManager({
  categorias = [],
  onCategoryCreated
}: CategoryManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [atributos, setAtributos] = useState<Array<{ nombre: string; tipo: string; ejemplo: string }>>([
    { nombre: "Capacidad", tipo: "texto", ejemplo: "500 ml / 750 ml" },
    { nombre: "Material", tipo: "texto", ejemplo: "Acero inoxidable 304" },
    { nombre: "Aislamiento Térmico", tipo: "texto", ejemplo: "12 hrs frío / 8 hrs calor" }
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const addAtributo = () => {
    setAtributos([...atributos, { nombre: "", tipo: "texto", ejemplo: "" }]);
  };

  const updateAtributo = (index: number, field: "nombre" | "tipo" | "ejemplo", val: string) => {
    const updated = [...atributos];
    updated[index][field] = val;
    setAtributos(updated);
  };

  const removeAtributo = (index: number) => {
    setAtributos(atributos.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre de la categoría es obligatorio.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Filter valid attributes
    const cleanAtributos = atributos.filter((a) => a.nombre.trim().length > 0);

    try {
      const res = await fetch("/api/admin/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_categoria: nombre.trim(),
          descripcion: descripcion.trim(),
          atributos_plantilla: cleanAtributos
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al crear la categoría.");
      }

      setSuccessMsg(`Categoría "${nombre.trim()}" creada con éxito.`);
      setNombre("");
      setDescripcion("");
      setAtributos([
        { nombre: "Material", tipo: "texto", ejemplo: "" },
        { nombre: "Dimensiones", tipo: "texto", ejemplo: "" }
      ]);
      setIsCreating(false);
      onCategoryCreated();
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo guardar la categoría.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-red-600" />
            <span>Gestión de Categorías y Atributos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Crea nuevas categorías (ej. Termos, Accesorios, Tazas) y define la plantilla de especificaciones técnicas que se solicitará a cada producto.
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Categoría</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CREATE NEW CATEGORY ACCORDION FORM */}
      {isCreating && (
        <form onSubmit={handleSave} className="bg-white border-2 border-red-600 rounded-2xl p-6 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                +
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Crear Nueva Categoría con Especificaciones
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setErrorMsg(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Nombre de la Categoría *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Termos y Botellas Térmicas"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Termos inoxidables para anime, gaming y manga"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* DYNAMIC ATTRIBUTES TEMPLATE BUILDER */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-600" />
                  <span>Plantilla de Especificaciones para esta Categoría</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Los productos que pertenezcan a esta categoría solicitarán estos atributos técnicos de forma automática.
                </p>
              </div>

              <button
                type="button"
                onClick={addAtributo}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Atributo</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {atributos.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={attr.nombre}
                      onChange={(e) => updateAtributo(idx, "nombre", e.target.value)}
                      placeholder="Nombre del atributo (ej: Capacidad)"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                    />
                  </div>

                  <div className="w-32">
                    <select
                      value={attr.tipo}
                      onChange={(e) => updateAtributo(idx, "tipo", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="texto">Texto</option>
                      <option value="numero">Numérico</option>
                      <option value="seleccion">Selección</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      value={attr.ejemplo}
                      onChange={(e) => updateAtributo(idx, "ejemplo", e.target.value)}
                      placeholder="Valor sugerido / ejemplo (ej: 500 ml)"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAtributo(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Eliminar atributo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Categoría</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* CATEGORIES LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Categorías Activas en el Sistema ({categorias.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {categorias.map((cat) => {
            const templateAttrs = Array.isArray(cat.atributos_plantilla)
              ? cat.atributos_plantilla
              : [];

            return (
              <div key={cat.id_categoria} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        #{cat.id_categoria}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {cat.nombre_categoria}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cat.estado || "activa"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 pl-10.5">
                      {cat.descripcion || "Sin descripción proporcionada."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto pl-10.5 sm:pl-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                      <Package className="w-3.5 h-3.5 text-slate-500" />
                      <span>{cat._count?.producto !== undefined ? `${cat._count.producto} productos` : "Productos"}</span>
                    </span>
                  </div>
                </div>

                {/* Atributos badges */}
                <div className="mt-3 pl-10.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                      Ficha Técnica:
                    </span>
                    {templateAttrs.length > 0 ? (
                      templateAttrs.map((attr: any, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <Tag className="w-2.5 h-2.5 text-red-500" />
                          <span className="font-semibold">{attr.nombre}</span>
                          {attr.ejemplo && (
                            <span className="text-slate-400">({attr.ejemplo})</span>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Sin plantilla de especificaciones asignada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
