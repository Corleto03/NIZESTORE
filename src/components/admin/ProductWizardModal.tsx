"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Package,
  BookOpen,
  Sparkles,
  Shirt,
  Tag,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  FolderOpen
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import VariantImagePicker from "./VariantImagePicker";

interface ProductWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
  categorias: any[];
  franquicias: any[];
}

export default function ProductWizardModal({
  isOpen,
  onClose,
  onProductCreated,
  categorias = [],
  franquicias = []
}: ProductWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(null);

  // Step 2: General Info
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [franquiciaId, setFranquiciaId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  // Step 3: Category-specific fields
  // Manga
  const [mangaSpecs, setMangaSpecs] = useState({
    volumen: "",
    editorial: "Panini Manga",
    paginas: "192",
    idioma: "Español",
    encuadernacion: "Rústica con sobrecubierta"
  });

  // Figuras
  const [figuraSpecs, setFiguraSpecs] = useState({
    escala: "1/7",
    altura: "22 cm",
    fabricante: "Bandai Spirits",
    material: "PVC & ABS",
    articulada: "No (Estática)"
  });

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [newTallaInput, setNewTallaInput] = useState("");
  // Ropa: dynamic size/color matrix
  const [ropaMaterial, setRopaMaterial] = useState("100% Algodón peinado");
  const [ropaCorte, setRopaCorte] = useState("Unisex Regular");
  const [selectedTallas, setSelectedTallas] = useState<string[]>(["M", "L"]);
  const [coloresRopa, setColoresRopa] = useState<string[]>(["Negro"]);
  const [newColorInput, setNewColorInput] = useState("");

  // Generic custom category specs
  const [customSpecs, setCustomSpecs] = useState<Array<{ atributo: string; valor: string }>>([]);

  // Base pricing & single stock (for non-clothing or default)
  const [basePrice, setBasePrice] = useState("24.99");
  const [baseCost, setBaseCost] = useState("14.00");
  const [baseStock, setBaseStock] = useState("15");
  const [sku, setSku] = useState("");

  // Clothing variant rows
  const [clothingVariants, setClothingVariants] = useState<Array<{
    talla: string;
    color: string;
    precio: string;
    costo: string;
    stock: string;
    sku: string;
    url_imagen?: string;
    descripcion_variante?: string;
  }>>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedCat = categorias.find((c) => c.id_categoria === selectedCategoriaId);

  // Initialize category
  useEffect(() => {
    if (categorias.length > 0 && selectedCategoriaId === null) {
      setSelectedCategoriaId(categorias[0].id_categoria);
    }
  }, [categorias, selectedCategoriaId]);

  // When category changes, setup custom template specs
  useEffect(() => {
    if (!selectedCat) return;
    const catNameLower = (selectedCat.nombre_categoria || "").toLowerCase();

    // If it's a custom category with atributos_plantilla
    if (
      !catNameLower.includes("manga") &&
      !catNameLower.includes("figura") &&
      !catNameLower.includes("ropa") &&
      Array.isArray(selectedCat.atributos_plantilla) &&
      selectedCat.atributos_plantilla.length > 0
    ) {
      setCustomSpecs(
        selectedCat.atributos_plantilla.map((attr: any) => ({
          atributo: attr.nombre,
          valor: attr.ejemplo || ""
        }))
      );
    } else {
      setCustomSpecs([]);
    }
  }, [selectedCat]);

  // Generate clothing variants whenever tallas or colores change
  useEffect(() => {
    if (!hasVariants) {
      setClothingVariants([]);
      return;
    }

    const rows: any[] = [];
    selectedTallas.forEach((talla) => {
      coloresRopa.forEach((color) => {
        const existing = clothingVariants.find((cv) => cv.talla === talla && cv.color === color);
        rows.push({
          talla,
          color,
          precio: existing?.precio || basePrice,
          costo: existing?.costo || baseCost,
          stock: existing?.stock || baseStock,
          sku: existing?.sku || `NZ-${(selectedCat?.nombre_categoria || "PROD").slice(0, 3).toUpperCase()}-${talla}-${color.slice(0, 3).toUpperCase()}`,
          url_imagen: existing?.url_imagen || "",
          descripcion_variante: existing?.descripcion_variante || ""
        });
      });
    });
    setClothingVariants(rows);
  }, [selectedTallas, coloresRopa, basePrice, baseCost, baseStock, selectedCat, hasVariants]);

  const addTalla = () => {
    if (!newTallaInput.trim()) return;
    if (!selectedTallas.includes(newTallaInput.trim())) {
      setSelectedTallas([...selectedTallas, newTallaInput.trim()]);
    }
    setNewTallaInput("");
  };

  const removeTalla = (talla: string) => {
    setSelectedTallas(selectedTallas.filter((t) => t !== talla));
  };

  const addColor = () => {
    if (!newColorInput.trim()) return;
    if (!coloresRopa.includes(newColorInput.trim())) {
      setColoresRopa([...coloresRopa, newColorInput.trim()]);
    }
    setNewColorInput("");
  };

  const removeColor = (color: string) => {
    setColoresRopa(coloresRopa.filter((c) => c !== color));
  };

  const updateClothingVariant = (index: number, field: string, value: string) => {
    const updated = [...clothingVariants];
    updated[index] = { ...updated[index], [field]: value };
    setClothingVariants(updated);
  };

  const addCustomSpec = () => {
    setCustomSpecs([...customSpecs, { atributo: "", valor: "" }]);
  };

  const updateCustomSpec = (index: number, field: "atributo" | "valor", val: string) => {
    const updated = [...customSpecs];
    updated[index][field] = val;
    setCustomSpecs(updated);
  };

  const removeCustomSpec = (index: number) => {
    setCustomSpecs(customSpecs.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setErrorMsg("El nombre del producto es obligatorio.");
      setStep(2);
      return;
    }

    if (!selectedCategoriaId) {
      setErrorMsg("Debes seleccionar una categoría.");
      setStep(1);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const catNameLower = (selectedCat?.nombre_categoria || "").toLowerCase();
    const especificaciones: Array<{ atributo: string; valor: string }> = [];

    // Compile specifications according to category
    if (catNameLower.includes("manga")) {
      if (mangaSpecs.volumen) especificaciones.push({ atributo: "Tomo / Volumen", valor: mangaSpecs.volumen });
      if (mangaSpecs.editorial) especificaciones.push({ atributo: "Editorial", valor: mangaSpecs.editorial });
      if (mangaSpecs.paginas) especificaciones.push({ atributo: "Páginas", valor: mangaSpecs.paginas });
      if (mangaSpecs.idioma) especificaciones.push({ atributo: "Idioma", valor: mangaSpecs.idioma });
      if (mangaSpecs.encuadernacion) especificaciones.push({ atributo: "Encuadernación", valor: mangaSpecs.encuadernacion });
    } else if (catNameLower.includes("figura")) {
      if (figuraSpecs.escala) especificaciones.push({ atributo: "Escala", valor: figuraSpecs.escala });
      if (figuraSpecs.altura) especificaciones.push({ atributo: "Altura", valor: figuraSpecs.altura });
      if (figuraSpecs.fabricante) especificaciones.push({ atributo: "Fabricante", valor: figuraSpecs.fabricante });
      if (figuraSpecs.material) especificaciones.push({ atributo: "Material", valor: figuraSpecs.material });
      if (figuraSpecs.articulada) especificaciones.push({ atributo: "Articulada", valor: figuraSpecs.articulada });
    } else if (catNameLower.includes("ropa")) {
      if (ropaMaterial) especificaciones.push({ atributo: "Material", valor: ropaMaterial });
      if (ropaCorte) especificaciones.push({ atributo: "Corte", valor: ropaCorte });
    } else {
      // Custom category specifications
      customSpecs.forEach((spec) => {
        if (spec.atributo.trim() && spec.valor.trim()) {
          especificaciones.push({ atributo: spec.atributo.trim(), valor: spec.valor.trim() });
        }
      });
    }

    // Compile variants
    let variantesPayload: any[] = [];
    if (hasVariants && clothingVariants.length > 0) {
      variantesPayload = clothingVariants.map((cv) => ({
        sku: cv.sku,
        precio: parseFloat(cv.precio) || parseFloat(basePrice) || 0,
        costo: parseFloat(cv.costo) || parseFloat(baseCost) || 0,
        stock_disponible: parseInt(cv.stock, 10) || 0,
        talla: cv.talla,
        color: cv.color,
        url_imagen: cv.url_imagen || imageUrl || "/images/products/one-piece-vol-100.jpeg",
        descripcion_variante: cv.descripcion_variante ? cv.descripcion_variante.trim() : null
      }));
    }

    const payload = {
      nombre_producto: nombre.trim(),
      descripcion: descripcion.trim(),
      id_categoria: selectedCategoriaId,
      id_franquicia: franquiciaId ? parseInt(franquiciaId, 10) : null,
      url_imagen: imageUrl || "/images/products/one-piece-vol-100.jpeg",
      precio: basePrice,
      costo: baseCost,
      stock_disponible: baseStock,
      sku: sku || undefined,
      especificaciones,
      ...(variantesPayload.length > 0 ? { variantes: variantesPayload } : {})
    };

    try {
      const res = await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al crear el producto.");
      }

      onProductCreated();
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error inesperado al guardar.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setNombre("");
    setDescripcion("");
    setImageUrl("");
    setErrorMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  const catNameLower = (selectedCat?.nombre_categoria || "").toLowerCase();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-sm">
              +
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Crear Nuevo Producto</h3>
              <p className="text-xs text-slate-400">
                Paso {step} de 3: {step === 1 ? "Seleccionar Categoría" : step === 2 ? "Información General e Imagen" : "Especificaciones Técnicas & Variantes"}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step === 1
                  ? "bg-red-600 text-white"
                  : step > 1
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </span>
            <span className={`font-semibold ${step === 1 ? "text-red-600" : "text-slate-600"}`}>
              Categoría
            </span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step === 2
                  ? "bg-red-600 text-white"
                  : step > 2
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
            </span>
            <span className={`font-semibold ${step === 2 ? "text-red-600" : "text-slate-600"}`}>
              Datos Generales & Imagen
            </span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step === 3 ? "bg-red-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              3
            </span>
            <span className={`font-semibold ${step === 3 ? "text-red-600" : "text-slate-600"}`}>
              Ficha Técnica & Inventario
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Select Category */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  ¿Qué tipo de producto deseas publicar?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  El formulario ajustará automáticamente las preguntas y opciones según lo que selecciones.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {categorias.map((cat) => {
                  const isSelected = selectedCategoriaId === cat.id_categoria;
                  const nameLower = (cat.nombre_categoria || "").toLowerCase();

                  let icon = Package;
                  let subtitle = "Artículo general";

                  if (nameLower.includes("manga")) {
                    icon = BookOpen;
                    subtitle = "Tomos, novelas ligeras y cómics";
                  } else if (nameLower.includes("figura")) {
                    icon = Sparkles;
                    subtitle = "Estatuas, figuras de escala y figuras articuladas";
                  } else if (nameLower.includes("ropa") || nameLower.includes("camisa")) {
                    icon = Shirt;
                    subtitle = "Camisetas, sudaderas, hoodies y prendas";
                  } else if (nameLower.includes("termo") || nameLower.includes("taza")) {
                    icon = Tag;
                    subtitle = "Botellas, termos de acero y tazas térmicas";
                  }

                  const IconComp = icon;

                  return (
                    <div
                      key={cat.id_categoria}
                      onClick={() => setSelectedCategoriaId(cat.id_categoria)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                        isSelected
                          ? "border-red-600 bg-red-50/40 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-red-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-bold text-slate-900 truncate">
                            {cat.nombre_categoria}
                          </h5>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: General Information & Local Image Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Datos Principales e Imagen</h4>
                  <p className="text-xs text-slate-500">
                    Categoría seleccionada:{" "}
                    <span className="font-semibold text-red-600">
                      {selectedCat?.nombre_categoria}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Cambiar categoría
                </button>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={
                    catNameLower.includes("manga")
                      ? "Ej: Jujutsu Kaisen - Tomo 18"
                      : catNameLower.includes("figura")
                      ? "Ej: Figura Megumi Fushiguro Pop Up Parade 18cm"
                      : "Ej: Camiseta Oversize Akatsuki Cloud"
                  }
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Franchise and SKU in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                    Franquicia / Serie
                  </label>
                  <select
                    value={franquiciaId}
                    onChange={(e) => setFranquiciaId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
                  >
                    <option value="">Sin franquicia específica</option>
                    {franquicias.map((f) => (
                      <option key={f.id_franquicia} value={f.id_franquicia}>
                        {f.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                    Código SKU (Opcional)
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Auto-generado si se deja vacío"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                  Descripción Corta
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  placeholder="Detalles sobre el producto, material o sinopsis..."
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Local File / Image Uploader */}
              <div className="pt-2">
                <ImageUploader
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  label="Fotografía del Producto (Desde tu equipo)"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Dynamic Category-specific Fields */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900">
                  Especificaciones Técnicas & Precios
                </h4>
                <p className="text-xs text-slate-500">
                  Campos adaptados para:{" "}
                  <span className="font-semibold text-red-600">
                    {selectedCat?.nombre_categoria}
                  </span>
                </p>
              </div>

              {/* 3A: MANGA SPECIFIC FIELDS */}
              {catNameLower.includes("manga") && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <BookOpen className="w-4 h-4 text-red-600" />
                    <span>Ficha Técnica de Manga / Cómic</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tomo / Volumen *
                      </label>
                      <input
                        type="text"
                        value={mangaSpecs.volumen}
                        onChange={(e) => setMangaSpecs({ ...mangaSpecs, volumen: e.target.value })}
                        placeholder="Ej: Vol. 100"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Editorial
                      </label>
                      <input
                        type="text"
                        value={mangaSpecs.editorial}
                        onChange={(e) => setMangaSpecs({ ...mangaSpecs, editorial: e.target.value })}
                        placeholder="Ej: Panini Manga"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Número de Páginas
                      </label>
                      <input
                        type="number"
                        value={mangaSpecs.paginas}
                        onChange={(e) => setMangaSpecs({ ...mangaSpecs, paginas: e.target.value })}
                        placeholder="192"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Idioma
                      </label>
                      <select
                        value={mangaSpecs.idioma}
                        onChange={(e) => setMangaSpecs({ ...mangaSpecs, idioma: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="Español">Español</option>
                        <option value="Japonés">Japonés (Original)</option>
                        <option value="Inglés">Inglés</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tipo de Encuadernación
                      </label>
                      <select
                        value={mangaSpecs.encuadernacion}
                        onChange={(e) => setMangaSpecs({ ...mangaSpecs, encuadernacion: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="Rústica con sobrecubierta">Rústica con sobrecubierta</option>
                        <option value="Tapa dura (Hardcover)">Tapa dura (Hardcover)</option>
                        <option value="Edición de Lujo / Kanzenban">Edición de Lujo / Kanzenban</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3B: FIGURAS SPECIFIC FIELDS */}
              {catNameLower.includes("figura") && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-red-600" />
                    <span>Ficha Técnica de Figura / Estatua</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Escala
                      </label>
                      <input
                        type="text"
                        value={figuraSpecs.escala}
                        onChange={(e) => setFiguraSpecs({ ...figuraSpecs, escala: e.target.value })}
                        placeholder="Ej: 1/7 o No scale"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Altura (cm) *
                      </label>
                      <input
                        type="text"
                        value={figuraSpecs.altura}
                        onChange={(e) => setFiguraSpecs({ ...figuraSpecs, altura: e.target.value })}
                        placeholder="Ej: 22 cm"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Fabricante / Marca
                      </label>
                      <input
                        type="text"
                        value={figuraSpecs.fabricante}
                        onChange={(e) => setFiguraSpecs({ ...figuraSpecs, fabricante: e.target.value })}
                        placeholder="Ej: Bandai / Good Smile"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Material
                      </label>
                      <input
                        type="text"
                        value={figuraSpecs.material}
                        onChange={(e) => setFiguraSpecs({ ...figuraSpecs, material: e.target.value })}
                        placeholder="Ej: PVC & ABS"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ¿Es Articulada?
                      </label>
                      <select
                        value={figuraSpecs.articulada}
                        onChange={(e) => setFiguraSpecs({ ...figuraSpecs, articulada: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="No (Estática)">No (Figura Estática de Vitrina)</option>
                        <option value="Sí (Articulada / Nendoroid / Figma)">Sí (Articulada / Nendoroid / Figma)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3C: ROPA & CAMISAS SPECIFIC FIELDS (Only Ropa material/corte) */}
              {catNameLower.includes("ropa") && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Shirt className="w-4 h-4 text-red-600" />
                    <span>Especificaciones de Ropa</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Material de la Prenda
                      </label>
                      <input
                        type="text"
                        value={ropaMaterial}
                        onChange={(e) => setRopaMaterial(e.target.value)}
                        placeholder="Ej: 100% Algodón peinado"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Corte / Ajuste
                      </label>
                      <select
                        value={ropaCorte}
                        onChange={(e) => setRopaCorte(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="Unisex Regular">Unisex Regular</option>
                        <option value="Oversize Streetwear">Oversize Streetwear</option>
                        <option value="Slim Fit">Slim Fit</option>
                        <option value="Hoodie / Abrigo">Hoodie con capucha</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3D: CUSTOM CATEGORY SPECIFICATIONS (e.g. Termos, Tazas, etc.) */}
              {!catNameLower.includes("manga") &&
                !catNameLower.includes("figura") &&
                !catNameLower.includes("ropa") && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                        <Layers className="w-4 h-4 text-red-600" />
                        <span>Especificaciones de {selectedCat?.nombre_categoria}</span>
                      </div>
                      <button
                        type="button"
                        onClick={addCustomSpec}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Atributo
                      </button>
                    </div>

                    {customSpecs.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">
                        No hay atributos predefinidos para esta categoría. Haz clic en &quot;Añadir Atributo&quot; para agregar especificaciones como Capacidad, Material, Dimensiones, etc.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customSpecs.map((spec, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={spec.atributo}
                              onChange={(e) => updateCustomSpec(i, "atributo", e.target.value)}
                              placeholder="Nombre (ej: Capacidad)"
                              className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={spec.valor}
                              onChange={(e) => updateCustomSpec(i, "valor", e.target.value)}
                              placeholder="Valor (ej: 750 ml)"
                              className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomSpec(i)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* General Pricing & Stock (Always shown or base for non-clothing) */}
              {!catNameLower.includes("ropa") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                      Precio de Venta ($ USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="24.99"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                      Costo Unitario ($ USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={baseCost}
                      onChange={(e) => setBaseCost(e.target.value)}
                      placeholder="14.00"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                      Stock Inicial en Tienda *
                    </label>
                    <input
                      type="number"
                      value={baseStock}
                      onChange={(e) => setBaseStock(e.target.value)}
                      placeholder="15"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                disabled={loading}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
            )}
          </div>

          <div>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !selectedCategoriaId) {
                    setErrorMsg("Selecciona una categoría para continuar.");
                    return;
                  }
                  if (step === 2 && !nombre.trim()) {
                    setErrorMsg("Ingresa el nombre del producto.");
                    return;
                  }
                  setErrorMsg(null);
                  setStep((step + 1) as any);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all"
              >
                <span>Continuar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg shadow-md transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publicando Producto...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Guardar y Publicar en Tienda</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
