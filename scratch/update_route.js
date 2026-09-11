const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '../src/app/api/admin/productos/[id]/route.ts');
let content = fs.readFileSync(routePath, 'utf8');

// Inside PATCH, extract variantes
content = content.replace(
  '      especificaciones\n    } = body;',
  `      especificaciones,\n      variantes\n    } = body;`
);

// We need to update multiple variants.
const oldVariantUpdate = `      // Update primary variant
      const mainVariant = prod.producto_variante[0];
      if (mainVariant && (precio !== undefined || costo !== undefined || stock_disponible !== undefined || url_imagen !== undefined)) {
        const variantUpdate: any = {};
        if (precio !== undefined && precio !== "") variantUpdate.precio = parseFloat(precio);
        if (costo !== undefined && costo !== "") variantUpdate.costo = parseFloat(costo);
        if (stock_disponible !== undefined && stock_disponible !== "") variantUpdate.stock_disponible = parseInt(stock_disponible, 10);
        if (url_imagen !== undefined) variantUpdate.url_imagen = url_imagen;

        await tx.producto_variante.update({
          where: { id_variante: mainVariant.id_variante },
          data: variantUpdate
        });
      }`;

const newVariantUpdate = `      // Update variants
      if (Array.isArray(variantes) && variantes.length > 0) {
        for (const v of variantes) {
          if (v.id_variante) {
            const vUpdate: any = {};
            if (v.precio !== undefined && v.precio !== "") vUpdate.precio = parseFloat(v.precio);
            if (v.costo !== undefined && v.costo !== "") vUpdate.costo = parseFloat(v.costo);
            if (v.stock !== undefined && v.stock !== "") vUpdate.stock_disponible = parseInt(v.stock, 10);
            if (v.sku !== undefined) vUpdate.sku = v.sku;
            
            await tx.producto_variante.update({
              where: { id_variante: v.id_variante },
              data: vUpdate
            });
          }
        }
      } else {
        const mainVariant = prod.producto_variante[0];
        if (mainVariant && (precio !== undefined || costo !== undefined || stock_disponible !== undefined || url_imagen !== undefined)) {
          const variantUpdate: any = {};
          if (precio !== undefined && precio !== "") variantUpdate.precio = parseFloat(precio);
          if (costo !== undefined && costo !== "") variantUpdate.costo = parseFloat(costo);
          if (stock_disponible !== undefined && stock_disponible !== "") variantUpdate.stock_disponible = parseInt(stock_disponible, 10);
          if (url_imagen !== undefined) variantUpdate.url_imagen = url_imagen;

          await tx.producto_variante.update({
            where: { id_variante: mainVariant.id_variante },
            data: variantUpdate
          });
        }
      }`;

content = content.replace(oldVariantUpdate, newVariantUpdate);

fs.writeFileSync(routePath, content);
console.log("Route updated.");
