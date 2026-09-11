const fs = require('fs');
const path = require('path');

const editPath = path.join(__dirname, '../src/components/admin/ProductEditModal.tsx');
let content = fs.readFileSync(editPath, 'utf8');

// 1. Add variantes state
content = content.replace(
  'const [stock, setStock] = useState<string>("");',
  `const [stock, setStock] = useState<string>("");
  const [variantes, setVariantes] = useState<any[]>([]);`
);

// 2. Load variantes
content = content.replace(
  /const mainVar = p\.producto_variante\?\.\[0\];[\s\S]*?setStock\(mainVar \? String\(mainVar\.stock_disponible\) : "0"\);/m,
  `const mainVar = p.producto_variante?.[0];
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
            sku: v.sku || ""
          })));
        } else {
          setVariantes([]);
        }`
);

// 3. handleSave needs to send variantes
content = content.replace(
  'stock_disponible: stock,',
  `stock_disponible: stock,
          variantes,`
);

// 4. UI for variants
const pricingBlockRegex = /\{\/\* Pricing & Stock \*\/\}([\s\S]*?)\{\/\* Image Uploader \*\/\}/m;

const newPricingBlock = `{/* Pricing & Stock (or Variants) */}
              {variantes.length > 1 ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-red-600" />
                    <span>Variantes del Producto</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-2 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-3">Variante</div>
                      <div className="col-span-3 text-center">Precio</div>
                      <div className="col-span-2 text-center">Costo</div>
                      <div className="col-span-2 text-center">Stock</div>
                      <div className="col-span-2">SKU</div>
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                      {variantes.map((v, idx) => (
                        <div key={v.id_variante} className="px-3 py-2 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3 text-[11px] font-bold text-slate-800">
                            {v.talla} / {v.color}
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number" step="0.01" value={v.precio}
                              onChange={(e) => {
                                const newV = [...variantes];
                                newV[idx].precio = e.target.value;
                                setVariantes(newV);
                              }}
                              className="w-full text-xs text-center px-1 py-1 border border-slate-200 rounded"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number" step="0.01" value={v.costo}
                              onChange={(e) => {
                                const newV = [...variantes];
                                newV[idx].costo = e.target.value;
                                setVariantes(newV);
                              }}
                              className="w-full text-xs text-center px-1 py-1 border border-slate-200 rounded"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number" value={v.stock}
                              onChange={(e) => {
                                const newV = [...variantes];
                                newV[idx].stock = e.target.value;
                                setVariantes(newV);
                              }}
                              className="w-full text-xs text-center px-1 py-1 border border-slate-200 rounded"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text" value={v.sku}
                              onChange={(e) => {
                                const newV = [...variantes];
                                newV[idx].sku = e.target.value;
                                setVariantes(newV);
                              }}
                              className="w-full text-[10px] uppercase px-1 py-1 border border-slate-200 rounded"
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

content = content.replace(pricingBlockRegex, newPricingBlock);

fs.writeFileSync(editPath, content);
console.log("ProductEditModal updated.");
