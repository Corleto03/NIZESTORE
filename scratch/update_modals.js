const fs = require('fs');
const path = require('path');

const wizardPath = path.join(__dirname, '../src/components/admin/ProductWizardModal.tsx');
let wizardContent = fs.readFileSync(wizardPath, 'utf8');

// Update States (hasVariants, newTallaInput)
wizardContent = wizardContent.replace(
  '  // Ropa: dynamic size/color matrix',
  `  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [newTallaInput, setNewTallaInput] = useState("");
  // Ropa: dynamic size/color matrix`
);

wizardContent = wizardContent.replace(
  'const isRopa = selectedCat?.nombre_categoria?.toLowerCase().includes("ropa");\n    if (!isRopa) return;',
  'if (!hasVariants) {\n      setClothingVariants([]);\n      return;\n    }'
);

wizardContent = wizardContent.replace(
  /const toggleTalla = \([\s\S]*?};\n/m,
  `const addTalla = () => {
    if (!newTallaInput.trim()) return;
    if (!selectedTallas.includes(newTallaInput.trim())) {
      setSelectedTallas([...selectedTallas, newTallaInput.trim()]);
    }
    setNewTallaInput("");
  };

  const removeTalla = (talla: string) => {
    setSelectedTallas(selectedTallas.filter((t) => t !== talla));
  };
`
);

wizardContent = wizardContent.replace(
  /const removeColor = \(color: string\) => {[\s\S]*?if \(coloresRopa\.length > 1\) {[\s\S]*?setColoresRopa\(coloresRopa\.filter\(\(c\) => c !== color\)\);[\s\S]*?}[\s\S]*?};/m,
  `const removeColor = (color: string) => {
    setColoresRopa(coloresRopa.filter((c) => c !== color));
  };`
);

wizardContent = wizardContent.replace(
  /if \(catNameLower\.includes\("ropa"\) && clothingVariants\.length > 0\) {/g,
  'if (hasVariants && clothingVariants.length > 0) {'
);

// We need to change the UI.
// Replace the entire 3C block and General Pricing block with a new UI that includes the toggle and dynamic variants.
const uiRegex = /\{\/\* 3C: ROPA & CAMISAS SPECIFIC FIELDS \(Tallas & Colores\) \*\/\}([\s\S]*?){\/\* 3D: CUSTOM CATEGORY SPECIFICATIONS \(e\.g\. Termos, Tazas, etc\.\) \*\/\}/m;

const newUI = `{/* 3C: ROPA & CAMISAS SPECIFIC FIELDS (Only Ropa material/corte) */}
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

              {/* 3D: CUSTOM CATEGORY SPECIFICATIONS (e.g. Termos, Tazas, etc.) */}`;

wizardContent = wizardContent.replace(uiRegex, newUI);


// Now replace the end pricing block with the new generic variants builder and pricing
const endUiRegex = /\{\/\* General Pricing & Stock \(Always shown or base for non-clothing\) \*\/\}([\s\S]*?)<\/div>\s*\}\s*<\/div>/m;

const newEndUI = `{/* VARIANTES GENERICAS (Opcional) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-red-600" />
                    <span>Opciones y Variantes</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasVariants}
                      onChange={(e) => {
                        setHasVariants(e.target.checked);
                        if (!e.target.checked) setClothingVariants([]);
                      }}
                      className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-600"
                    />
                    <span className="text-xs font-semibold text-slate-700">Este producto tiene múltiples opciones</span>
                  </label>
                </div>

                {hasVariants ? (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500">
                      Define los atributos del producto. Las combinaciones generarán un inventario individual.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Atributo 1 */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                          Atributo 1 (ej. Talla, Tamaño, Edición)
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input 
                            type="text"
                            value={newTallaInput}
                            onChange={(e) => setNewTallaInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTalla())}
                            placeholder="Ej: M, L o Estándar"
                            className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                          <button type="button" onClick={addTalla} className="px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 rounded-lg">Añadir</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTallas.map(t => (
                            <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded">
                              {t}
                              <button type="button" onClick={() => removeTalla(t)} className="hover:text-rose-400"><X className="w-3 h-3"/></button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Atributo 2 */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                          Atributo 2 (ej. Color, Material, Estilo)
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input 
                            type="text"
                            value={newColorInput}
                            onChange={(e) => setNewColorInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                            placeholder="Ej: Rojo, PVC, etc."
                            className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                          <button type="button" onClick={addColor} className="px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 rounded-lg">Añadir</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {coloresRopa.map(c => (
                            <span key={c} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded">
                              {c}
                              <button type="button" onClick={() => removeColor(c)} className="hover:text-rose-400"><X className="w-3 h-3"/></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Matriz de Variantes */}
                    {clothingVariants.length > 0 && (
                      <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 px-3 py-2 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <div className="col-span-3">Variante</div>
                          <div className="col-span-2 text-center">Precio</div>
                          <div className="col-span-2 text-center">Costo</div>
                          <div className="col-span-2 text-center">Stock</div>
                          <div className="col-span-3">SKU</div>
                        </div>
                        <div className="divide-y divide-slate-100 bg-white">
                          {clothingVariants.map((v, idx) => (
                            <div key={idx} className="px-3 py-2 grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-3 text-[11px] font-bold text-slate-800">
                                {v.talla} / {v.color}
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number" step="0.01" value={v.precio}
                                  onChange={(e) => updateClothingVariant(idx, "precio", e.target.value)}
                                  className="w-full text-xs text-center px-1 py-1 border border-slate-200 rounded"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number" step="0.01" value={v.costo}
                                  onChange={(e) => updateClothingVariant(idx, "costo", e.target.value)}
                                  className="w-full text-xs text-center px-1 py-1 border border-slate-200 rounded"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number" value={v.stock}
                                  onChange={(e) => updateClothingVariant(idx, "stock", e.target.value)}
                                  className="w-full text-xs text-center px-1 py-1 border border-slate-200 rounded"
                                />
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="text" value={v.sku}
                                  onChange={(e) => updateClothingVariant(idx, "sku", e.target.value)}
                                  className="w-full text-[10px] uppercase px-1 py-1 border border-slate-200 rounded"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                        Precio de Venta ($ USD) *
                      </label>
                      <input
                        type="number" step="0.01" value={basePrice}
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
                        type="number" step="0.01" value={baseCost}
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
                        type="number" value={baseStock}
                        onChange={(e) => setBaseStock(e.target.value)}
                        placeholder="15"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>`;

wizardContent = wizardContent.replace(endUiRegex, newEndUI);

fs.writeFileSync(wizardPath, wizardContent);
console.log("ProductWizardModal.tsx updated.");
