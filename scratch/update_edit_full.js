const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/admin/ProductEditModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import VariantImagePicker
if (!content.includes('import VariantImagePicker')) {
  content = content.replace(
    'import ImageUploader from "./ImageUploader";',
    'import ImageUploader from "./ImageUploader";\nimport VariantImagePicker from "./VariantImagePicker";'
  );
}

// 2. Ensure loadProduct sets url_imagen and descripcion_variante
content = content.replace(
  `          setVariantes(p.producto_variante.map((v: any) => ({
            id_variante: v.id_variante,
            talla: v.variante_apariencia?.talla || "",
            color: v.variante_apariencia?.color || "",
            precio: String(v.precio),
            costo: String(v.costo),
            stock: String(v.stock_disponible),
            sku: v.sku || ""
          })));`,
  `          setVariantes(p.producto_variante.map((v: any) => ({
            id_variante: v.id_variante,
            talla: v.variante_apariencia?.talla || "",
            color: v.variante_apariencia?.color || "",
            precio: String(v.precio),
            costo: String(v.costo),
            stock: String(v.stock_disponible),
            sku: v.sku || "",
            url_imagen: v.url_imagen || "",
            descripcion_variante: v.descripcion_variante || ""
          })));`
);

// 3. Replace the variants table in ProductEditModal with the enhanced photo + description table
const oldTableRegex = /\{\/\* Pricing & Stock \(or Variants\) \*\/\}[\s\S]*?\{\/\* Image Uploader \*\/\}/m;

const newTable = `{/* Pricing & Stock (or Variants) */}
              {variantes.length > 1 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-red-600" />
                      <span>Variantes del Producto ({variantes.length})</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Foto individual, stock y precio por combinación
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100 px-3 py-2.5 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <div className="col-span-4">Foto / Variante</div>
                      <div className="col-span-2 text-center">Precio ($)</div>
                      <div className="col-span-2 text-center">Costo ($)</div>
                      <div className="col-span-2 text-center">Stock</div>
                      <div className="col-span-2">SKU</div>
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                      {variantes.map((v, idx) => (
                        <div key={v.id_variante || idx} className="p-3 space-y-2">
                          <div className="grid grid-cols-12 gap-2 items-center">
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
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block">
                                    {v.talla || "Talla"} / {v.color || "Color"}
                                  </span>
                                  <span className="text-[10px] text-slate-400">ID #{v.id_variante}</span>
                                </div>
                              </div>
                            </div>
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
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => {
                                  const newV = [...variantes];
                                  newV[idx].sku = e.target.value;
                                  setVariantes(newV);
                                }}
                                className="w-full text-[11px] uppercase px-1.5 py-1.5 border border-slate-300 rounded"
                              />
                            </div>
                          </div>

                          {/* Individual description */}
                          <div>
                            <input
                              type="text"
                              value={v.descripcion_variante || ""}
                              onChange={(e) => {
                                const newV = [...variantes];
                                newV[idx].descripcion_variante = e.target.value;
                                setVariantes(newV);
                              }}
                              placeholder="Nota o descripción particular de esta variante (ej: Edición especial con acabados dorados)"
                              className="w-full text-[11px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:bg-white focus:border-red-500 outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
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

              {/* Image Uploader */}`;

content = content.replace(oldTableRegex, newTable);

fs.writeFileSync(filePath, content);
console.log("ProductEditModal.tsx successfully updated with WooCommerce variable products support.");
