const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/admin/ProductWizardModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import VariantImagePicker
if (!content.includes('import VariantImagePicker')) {
  content = content.replace(
    'import ImageUploader from "./ImageUploader";',
    'import ImageUploader from "./ImageUploader";\nimport VariantImagePicker from "./VariantImagePicker";'
  );
}

// 2. Update clothingVariants state definition to include url_imagen and descripcion_variante
content = content.replace(
  `  const [clothingVariants, setClothingVariants] = useState<Array<{
    talla: string;
    color: string;
    precio: string;
    costo: string;
    stock: string;
    sku: string;
  }>>([]);`,
  `  const [clothingVariants, setClothingVariants] = useState<Array<{
    talla: string;
    color: string;
    precio: string;
    costo: string;
    stock: string;
    sku: string;
    url_imagen?: string;
    descripcion_variante?: string;
  }>>([]);`
);

// 3. Update useEffect generating combinations to preserve url_imagen and descripcion_variante
const oldGenEffect = `  // Generate clothing variants whenever tallas or colores change
  useEffect(() => {
    if (!hasVariants) {
      setClothingVariants([]);
      return;
    }

    const rows: any[] = [];
    selectedTallas.forEach((talla) => {
      coloresRopa.forEach((color) => {
        rows.push({
          talla,
          color,
          precio: basePrice,
          costo: baseCost,
          stock: baseStock,
          sku: \`NZ-ROP-\${talla}-\${color.slice(0, 3).toUpperCase()}\`
        });
      });
    });
    setClothingVariants(rows);
  }, [selectedTallas, coloresRopa, basePrice, baseCost, baseStock, selectedCat]);`;

const newGenEffect = `  // Generate clothing variants whenever tallas or colores change
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
          sku: existing?.sku || \`NZ-\${(selectedCat?.nombre_categoria || "PROD").slice(0, 3).toUpperCase()}-\${talla}-\${color.slice(0, 3).toUpperCase()}\`,
          url_imagen: existing?.url_imagen || "",
          descripcion_variante: existing?.descripcion_variante || ""
        });
      });
    });
    setClothingVariants(rows);
  }, [selectedTallas, coloresRopa, basePrice, baseCost, baseStock, selectedCat, hasVariants]);`;

content = content.replace(oldGenEffect, newGenEffect);

// 4. Update payload in handleSubmit
content = content.replace(
  `        talla: cv.talla,
        color: cv.color,
        url_imagen: imageUrl || "/images/products/one-piece-vol-100.jpeg"
      }));`,
  `        talla: cv.talla,
        color: cv.color,
        url_imagen: cv.url_imagen || imageUrl || "/images/products/one-piece-vol-100.jpeg",
        descripcion_variante: cv.descripcion_variante ? cv.descripcion_variante.trim() : null
      }));`
);

// 5. Replace step 3 pricing block with full WooCommerce-style variable product manager
const oldPricingBlockRegex = /\{\/\* General Pricing & Stock \(Always shown or base for non-clothing\) \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*\{\/\* Modal Footer Controls \*\/\}/m;

const newPricingBlock = `{/* VARIABLE PRODUCTS MANAGER (WooCommerce Style) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-red-600" />
                      <span>Tipo de Producto e Inventario</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Define si se vende en versión única o si tiene múltiples variantes (fotos, tallas, colores y stock independiente).
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setHasVariants(false)}
                      className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${
                        !hasVariants ? "bg-red-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }\`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasVariants(true)}
                      className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${
                        hasVariants ? "bg-red-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }\`}
                    >
                      Variable (Opciones)
                    </button>
                  </div>
                </div>

                {!hasVariants ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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
                ) : (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500">
                      Define los atributos. Las combinaciones generarán una matriz con foto, descripción y stock independiente para cada opción.
                    </p>

                    {/* Atributos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Atributo 1 */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Atributo 1 (ej. Talla, Tamaño, Volumen)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTallaInput}
                            onChange={(e) => setNewTallaInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTalla())}
                            placeholder="Ej: S, M, L o 500ml"
                            className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={addTalla}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg"
                          >
                            Añadir
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                          {selectedTallas.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white text-[11px] font-bold rounded-md"
                            >
                              {t}
                              <button
                                type="button"
                                onClick={() => removeTalla(t)}
                                className="hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Atributo 2 */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Atributo 2 (ej. Color, Edición, Material)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newColorInput}
                            onChange={(e) => setNewColorInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                            placeholder="Ej: Negro, Blanco, Deluxe"
                            className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={addColor}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg"
                          >
                            Añadir
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                          {coloresRopa.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white text-[11px] font-bold rounded-md"
                            >
                              {c}
                              <button
                                type="button"
                                onClick={() => removeColor(c)}
                                className="hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Matriz de Variaciones generadas */}
                    {clothingVariants.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <div className="bg-slate-100 px-3 py-2.5 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          <div className="col-span-4">Foto / Variante</div>
                          <div className="col-span-2 text-center">Precio ($)</div>
                          <div className="col-span-2 text-center">Costo ($)</div>
                          <div className="col-span-2 text-center">Stock</div>
                          <div className="col-span-2">SKU</div>
                        </div>
                        <div className="divide-y divide-slate-100 bg-white">
                          {clothingVariants.map((v, idx) => (
                            <div key={idx} className="p-3 space-y-2">
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4">
                                  <div className="flex items-center gap-2">
                                    <VariantImagePicker
                                      value={v.url_imagen || ""}
                                      onChange={(url) => updateClothingVariant(idx, "url_imagen", url)}
                                      fallbackImage={imageUrl}
                                    />
                                    <span className="text-xs font-bold text-slate-800 truncate">
                                      {v.talla} / {v.color}
                                    </span>
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.precio}
                                    onChange={(e) => updateClothingVariant(idx, "precio", e.target.value)}
                                    className="w-full text-xs text-center px-1.5 py-1.5 border border-slate-300 rounded font-bold"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.costo}
                                    onChange={(e) => updateClothingVariant(idx, "costo", e.target.value)}
                                    className="w-full text-xs text-center px-1.5 py-1.5 border border-slate-300 rounded text-slate-600"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    value={v.stock}
                                    onChange={(e) => updateClothingVariant(idx, "stock", e.target.value)}
                                    className="w-full text-xs text-center px-1.5 py-1.5 border border-slate-300 rounded font-bold"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="text"
                                    value={v.sku}
                                    onChange={(e) => updateClothingVariant(idx, "sku", e.target.value)}
                                    className="w-full text-[11px] uppercase px-1.5 py-1.5 border border-slate-300 rounded"
                                  />
                                </div>
                              </div>

                              {/* Individual Variant Description */}
                              <div>
                                <input
                                  type="text"
                                  value={v.descripcion_variante || ""}
                                  onChange={(e) => updateClothingVariant(idx, "descripcion_variante", e.target.value)}
                                  placeholder="Nota o descripción particular de esta variante (ej: Con capa desmontable, serigrafía reflectiva)"
                                  className="w-full text-[11px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}`;

content = content.replace(oldPricingBlockRegex, newPricingBlock);

fs.writeFileSync(filePath, content);
console.log("ProductWizardModal.tsx successfully updated with WooCommerce variable products support.");
