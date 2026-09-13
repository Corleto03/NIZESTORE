const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/admin/productos/[id]/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldVariantsBlock = `      // Update variants
      if (Array.isArray(variantes) && variantes.length > 0) {
        for (const v of variantes) {
          if (v.id_variante) {
            const vUpdate: any = {};
            if (v.precio !== undefined && v.precio !== "") vUpdate.precio = parseFloat(v.precio);
            if (v.costo !== undefined && v.costo !== "") vUpdate.costo = parseFloat(v.costo);
            if (v.stock !== undefined && v.stock !== "") vUpdate.stock_disponible = parseInt(v.stock, 10);
            if (v.sku !== undefined) vUpdate.sku = v.sku;
            if (v.url_imagen !== undefined) vUpdate.url_imagen = v.url_imagen;
            if (v.descripcion_variante !== undefined) vUpdate.descripcion_variante = v.descripcion_variante ? String(v.descripcion_variante).trim() : null;
            
            await tx.producto_variante.update({
              where: { id_variante: v.id_variante },
              data: vUpdate
            });
          }
        }
      } else {`;

const newVariantsBlock = `      // Update variants (WooCommerce style: update existing, create newly added, and update appearance)
      if (Array.isArray(variantes) && variantes.length > 0) {
        for (const v of variantes) {
          if (v.id_variante) {
            const vUpdate: any = {};
            if (v.precio !== undefined && v.precio !== "") vUpdate.precio = parseFloat(v.precio);
            if (v.costo !== undefined && v.costo !== "") vUpdate.costo = parseFloat(v.costo);
            if (v.stock !== undefined && v.stock !== "") vUpdate.stock_disponible = parseInt(v.stock, 10);
            if (v.sku !== undefined) vUpdate.sku = v.sku;
            if (v.url_imagen !== undefined) vUpdate.url_imagen = v.url_imagen;
            if (v.descripcion_variante !== undefined) vUpdate.descripcion_variante = v.descripcion_variante ? String(v.descripcion_variante).trim() : null;
            
            await tx.producto_variante.update({
              where: { id_variante: v.id_variante },
              data: vUpdate
            });

            // Update or create appearance (talla / color)
            if (v.talla !== undefined || v.color !== undefined) {
              const existingApp = await tx.variante_apariencia.findUnique({
                where: { id_variante: v.id_variante }
              });
              if (existingApp) {
                await tx.variante_apariencia.update({
                  where: { id_variante: v.id_variante },
                  data: {
                    talla: v.talla !== undefined ? v.talla : existingApp.talla,
                    color: v.color !== undefined ? v.color : existingApp.color
                  }
                });
              } else {
                await tx.variante_apariencia.create({
                  data: {
                    id_variante: v.id_variante,
                    talla: v.talla || null,
                    color: v.color || null
                  }
                });
              }
            }
          } else {
            // Newly added variant to existing product
            const newVar = await tx.producto_variante.create({
              data: {
                id_producto: idProducto,
                sku: (v.sku || \`NZ-\${idProducto}-\${Date.now().toString().slice(-4)}\`).toUpperCase(),
                precio: parseFloat(v.precio || precio || 0),
                costo: parseFloat(v.costo || costo || 0),
                stock_disponible: parseInt(v.stock || stock_disponible || 0, 10),
                url_imagen: v.url_imagen || url_imagen || prod.url_imagen,
                descripcion_variante: v.descripcion_variante ? String(v.descripcion_variante).trim() : null,
                estado: "activo"
              }
            });

            if (v.talla || v.color) {
              await tx.variante_apariencia.create({
                data: {
                  id_variante: newVar.id_variante,
                  talla: v.talla || null,
                  color: v.color || null
                }
              });
            }
          }
        }
      } else {`;

content = content.replace(oldVariantsBlock, newVariantsBlock);
fs.writeFileSync(filePath, content);
console.log("PATCH route updated with support for adding new variants and updating appearance.");
