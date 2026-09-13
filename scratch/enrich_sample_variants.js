const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Enriching variants for Camiseta Gojo Satoru (ID 2)...");
  const prod2 = await prisma.producto.findUnique({
    where: { id_producto: 2 },
    include: { producto_variante: { include: { variante_apariencia: true } } }
  });

  if (prod2) {
    // If it only has 1 variant, create the black and white variants
    console.log(`Product 2 has ${prod2.producto_variante.length} variants.`);
    
    // Ensure we have Blanca and Negra
    for (const v of prod2.producto_variante) {
      const color = v.variante_apariencia?.color?.toLowerCase() || "";
      if (color.includes("blanc")) {
        await prisma.producto_variante.update({
          where: { id_variante: v.id_variante },
          data: {
            url_imagen: "/images/products/camiseta-gojo-blanca.jpeg",
            descripcion_variante: "Edición Blanco Puro: 100% algodón peinado 220 GSM con estampado digital HD frontal de Gojo Satoru."
          }
        });
        console.log(`Updated variant #${v.id_variante} (Blanco) with white shirt photo.`);
      } else {
        await prisma.producto_variante.update({
          where: { id_variante: v.id_variante },
          data: {
            url_imagen: "/images/products/camiseta-gojo-negra.jpeg",
            descripcion_variante: "Edición Negro Noche: 100% algodón peinado con detalles del dominio Unlimited Void en tinta reflectiva."
          }
        });
        console.log(`Updated variant #${v.id_variante} (Negro) with black shirt photo.`);
      }
    }

    // If it only had 1 variant, let's add the opposite color variant so the user can immediately test clicking between both!
    if (prod2.producto_variante.length === 1) {
      const existing = prod2.producto_variante[0];
      const newVar = await prisma.producto_variante.create({
        data: {
          id_producto: 2,
          sku: "NZ-GOJO-WHT-L",
          precio: 26.99,
          costo: 13.50,
          stock_disponible: 8,
          estado: "activo",
          url_imagen: "/images/products/camiseta-gojo-blanca.jpeg",
          descripcion_variante: "Edición Blanco Puro: 100% algodón peinado 220 GSM con estampado digital HD frontal de Gojo Satoru."
        }
      });
      await prisma.variante_apariencia.create({
        data: {
          id_variante: newVar.id_variante,
          talla: "L",
          color: "Blanco"
        }
      });
      console.log("Added second variant (Blanco L) with white photo to product 2!");
    }
  }

  console.log("Done updating sample products with variable images and descriptions.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
