const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/admin/ProductEditModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure Plus and Trash2 are imported from lucide-react
if (!content.includes('Plus,')) {
  content = content.replace(
    'import { X, Save, Trash2, AlertCircle, Loader2, Layers } from "lucide-react";',
    'import { X, Save, Trash2, AlertCircle, Loader2, Layers, Plus } from "lucide-react";'
  );
}

// Add state isVariableMode if needed or helper to add new variant
const oldPricingSectionRegex = /\{\/\* Pricing & Stock \(or Variants\) \*\/\}[\s\S]*?\{\/\* Image Uploader \*\/\}/m;

const newPricingSection = `{/* Pricing & Stock (or Variants) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-red-600" />
                      <span>Opciones y Variantes del Producto</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {variantes.length > 1 || (variantes[0] && (variantes[0].talla || variantes[0].color))
                        ? \`Este producto tiene \${variantes.length} variante(s) con foto, precio y stock individual.\`
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
                              sku: main.sku || \`NZ-\${productId}-M-BLK\`,
                              url_imagen: imageUrl || "",
                              descripcion_variante: ""
                            },
                            {
                              talla: "L",
                              color: "Blanco",
                              precio: precio || String(main.precio || "24.99"),
                              costo: costo || String(main.costo || "14.00"),
                              stock: "10",
                              sku: \`NZ-\${productId}-L-WHT\`,
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
                              sku: \`NZ-\${productId}-\${Date.now().toString().slice(-4)}\`,
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

              {/* Image Uploader */}`;

content = content.replace(oldPricingSectionRegex, newPricingSection);

fs.writeFileSync(filePath, content);
console.log("ProductEditModal completely updated with WooCommerce variable product converter and controls.");
