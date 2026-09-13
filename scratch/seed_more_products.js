const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO SIEMBRA DE PRODUCTOS DIVERSOS ===");

  const newProducts = [
    // --- MANGA ---
    {
      nombre_producto: "One Piece - Tomo 101",
      descripcion: "El clímax de la batalla en Onigashima continúa. Edición oficial en español con sobrecubierta metalizada.",
      id_categoria: 1, // Manga
      id_franquicia: 3, // One Piece
      url_imagen: "/images/products/prod_1788573517396_one-piece-volume-100-manga-202609041355.jpeg",
      especificaciones: [
        { atributo: "Tomo / Volumen", valor: "Vol. 101" },
        { atributo: "Editorial", valor: "Panini Manga" },
        { atributo: "Páginas", valor: "208" },
        { atributo: "Idioma", valor: "Español" },
        { atributo: "Encuadernación", valor: "Rústica con sobrecubierta" }
      ],
      variantes: [
        { sku: "NZ-OP-101-STD", precio: 11.50, costo: 6.50, stock: 24, talla: "Estándar", color: "Original" }
      ],
      resenas: [
        { nombre: "Rodrigo P.", calificacion: 5, comentario: "¡El mejor arco de One Piece! La sobrecubierta vino en perfecto estado sin golpes." }
      ]
    },
    {
      nombre_producto: "Naruto Shippuden - Tomo 72 (Final Legendario)",
      descripcion: "El desenlace histórico de la Cuarta Gran Guerra Ninja y el duelo final entre Naruto y Sasuke en el Valle del Fin.",
      id_categoria: 1, // Manga
      id_franquicia: 2, // Naruto
      url_imagen: "/images/products/prod_1788573517396_one-piece-volume-100-manga-202609041355.jpeg",
      especificaciones: [
        { atributo: "Tomo / Volumen", valor: "Vol. 72 (Final)" },
        { atributo: "Editorial", valor: "Panini Manga" },
        { atributo: "Páginas", valor: "216" },
        { atributo: "Idioma", valor: "Español" }
      ],
      variantes: [
        { sku: "NZ-NAR-72-STD", precio: 11.99, costo: 6.80, stock: 18, talla: "Estándar", color: "Original" }
      ],
      resenas: [
        { nombre: "Guillermo M.", calificacion: 5, comentario: "Nostalgia pura. Edición de colección imperdible para cualquier fan de Naruto." },
        { nombre: "Kevin B.", calificacion: 5, comentario: "Llegó en 24h a Santa Tecla. Todo de 10." }
      ]
    },
    {
      nombre_producto: "Dragon Ball Super - Tomo 20",
      descripcion: "Arco del Granola el superviviente. Con ilustraciones inéditas de Toyotaro y Akira Toriyama.",
      id_categoria: 1, // Manga
      id_franquicia: 1, // Dragon Ball Z
      url_imagen: "/images/products/prod_1788573517396_one-piece-volume-100-manga-202609041355.jpeg",
      especificaciones: [
        { atributo: "Tomo / Volumen", valor: "Vol. 20" },
        { atributo: "Editorial", valor: "Ivrea / Shueisha" },
        { atributo: "Páginas", valor: "192" },
        { atributo: "Idioma", valor: "Español" }
      ],
      variantes: [
        { sku: "NZ-DBS-20-STD", precio: 10.50, costo: 5.90, stock: 15, talla: "Estándar", color: "Original" }
      ],
      resenas: [
        { nombre: "Daniel O.", calificacion: 4, comentario: "Muy buena batalla. Papel de gran calidad." }
      ]
    },

    // --- FIGURAS ---
    {
      nombre_producto: "Figura Sasuke Uchiha Susano'o Flame Effect 20cm",
      descripcion: "Estatua con base traslúcida y efectos de chakra purpúreo del Susano'o. Esculpido de alta fidelidad importado de Japón.",
      id_categoria: 2, // Figuras
      id_franquicia: 2, // Naruto
      url_imagen: "/images/products/prod_1788571577674_sasuke-uchiha-figure-manifesting--202609041910.jpeg",
      especificaciones: [
        { atributo: "Escala", valor: "1/8" },
        { atributo: "Altura", valor: "20 cm" },
        { atributo: "Fabricante", valor: "Megahouse / GEM" },
        { atributo: "Material", valor: "PVC & ABS" },
        { atributo: "Articulada", valor: "No (Estatua Estática con base)" }
      ],
      variantes: [
        { sku: "NZ-FIG-SAS-SUSANO", precio: 58.00, costo: 34.00, stock: 7, talla: "20 cm", color: "Efecto Púrpura" }
      ],
      resenas: [
        { nombre: "Mario C.", calificacion: 5, comentario: "La mejor figura que he comprado en El Salvador. Los efectos de luz morada son brutales." },
        { nombre: "Eduardo R.", calificacion: 5, comentario: "Viene en su caja sellada con sticker Toei dorado original." }
      ]
    },
    {
      nombre_producto: "Figura Son Goku Super Saiyan Blood of Saiyans 19cm",
      descripcion: "Figura Banpresto de colección con acabado metalizado en el cabello dorado y textura realista en el dogi rasgado.",
      id_categoria: 2, // Figuras
      id_franquicia: 1, // Dragon Ball Z
      url_imagen: "/images/products/figura-megumi-fushiguro.jpeg",
      especificaciones: [
        { atributo: "Escala", valor: "Non-scale" },
        { atributo: "Altura", valor: "19 cm" },
        { atributo: "Fabricante", valor: "Bandai Spirits / Banpresto" },
        { atributo: "Material", valor: "PVC" }
      ],
      variantes: [
        { sku: "NZ-FIG-GOKU-SSJ", precio: 42.50, costo: 24.00, stock: 9, talla: "19 cm", color: "Metalizado" }
      ],
      resenas: [
        { nombre: "Alonso T.", calificacion: 5, comentario: "Impresionante los detalles de los músculos y la pintura metálica del pelo." }
      ]
    },
    {
      nombre_producto: "Figura Pikachu Detective con Lupa Edición Especial 15cm",
      descripcion: "Tierna figura coleccionable de Pikachu con su sombrero de detective de paño y lupa con soporte acrílico.",
      id_categoria: 2, // Figuras
      id_franquicia: 5, // Pokémon
      url_imagen: "/images/products/figura-megumi-fushiguro.jpeg",
      especificaciones: [
        { atributo: "Escala", valor: "1/1 Life Size mini" },
        { atributo: "Altura", valor: "15 cm" },
        { atributo: "Fabricante", valor: "The Pokémon Company / Kotobukiya" },
        { atributo: "Material", valor: "PVC suave" }
      ],
      variantes: [
        { sku: "NZ-FIG-PIKA-DET", precio: 32.00, costo: 18.00, stock: 12, talla: "15 cm", color: "Clásico" }
      ],
      resenas: [
        { nombre: "Andrea V.", calificacion: 5, comentario: "¡Súper lindo! Se lo regalé a mi hermano y le fascinó." }
      ]
    },

    // --- ROPA (CON VARIANTES REALES) ---
    {
      nombre_producto: "Sudadera Hoodie Akatsuki Cloud Bordada Premium",
      descripcion: "Sudadera con capucha y cordones gruesos. Nubes rojas de Akatsuki bordadas con hilo de alta densidad. Interior afelpado suave.",
      id_categoria: 3, // Ropa
      id_franquicia: 2, // Naruto
      url_imagen: "/images/products/camiseta-gojo-negra.jpeg",
      especificaciones: [
        { atributo: "Material", valor: "80% Algodón Peinado / 20% Poliéster" },
        { atributo: "Corte", valor: "Oversize Streetwear" },
        { atributo: "Detalle", valor: "Nubes bordadas en relieve 3D" }
      ],
      variantes: [
        { sku: "NZ-HD-AKA-S-BLK", precio: 39.99, costo: 21.00, stock: 6, talla: "S", color: "Negro Obsidiana" },
        { sku: "NZ-HD-AKA-M-BLK", precio: 39.99, costo: 21.00, stock: 14, talla: "M", color: "Negro Obsidiana" },
        { sku: "NZ-HD-AKA-L-BLK", precio: 39.99, costo: 21.00, stock: 12, talla: "L", color: "Negro Obsidiana" },
        { sku: "NZ-HD-AKA-XL-BLK", precio: 42.99, costo: 22.50, stock: 5, talla: "XL", color: "Negro Obsidiana" }
      ],
      resenas: [
        { nombre: "Manuel C.", calificacion: 5, comentario: "La tela es súper abrigadora y el bordado no se deshace tras lavarlo. Muy recomendada." }
      ]
    },
    {
      nombre_producto: "Camiseta Dragon Ball Z Shenron Vintage Acid Wash",
      descripcion: "Camiseta streetwear con lavado ácido estilo vintage y serigrafía del dragón Shenron en la espalda y esfera de 4 estrellas en el pecho.",
      id_categoria: 3, // Ropa
      id_franquicia: 1, // Dragon Ball Z
      url_imagen: "/images/products/camiseta-gojo-blanca.jpeg",
      especificaciones: [
        { atributo: "Material", valor: "100% Algodón pesado 240 GSM" },
        { atributo: "Corte", valor: "Drop Shoulder / Boxy Fit" },
        { atributo: "Acabado", valor: "Lavado ácido oscuro" }
      ],
      variantes: [
        { sku: "NZ-TS-SHEN-M", precio: 24.99, costo: 12.50, stock: 10, talla: "M", color: "Gris Ácido" },
        { sku: "NZ-TS-SHEN-L", precio: 24.99, costo: 12.50, stock: 15, talla: "L", color: "Gris Ácido" },
        { sku: "NZ-TS-SHEN-XL", precio: 24.99, costo: 12.50, stock: 8, talla: "XL", color: "Gris Ácido" }
      ],
      resenas: [
        { nombre: "Esteban Z.", calificacion: 5, comentario: "El estilo vintage está a otro nivel. El corte oversize queda perfecto." }
      ]
    },

    // --- TERMOS & BOTELLAS ---
    {
      nombre_producto: "Termo de Acero Inoxidable Capsule Corp 750ml",
      descripcion: "Botella térmica doble pared aislada al vacío. Mantiene bebidas frías por 24 horas y calientes por 12 horas. Tapa hermética antiderrame.",
      id_categoria: 4, // Termos & Botellas
      id_franquicia: 1, // Dragon Ball Z
      url_imagen: "/images/products/camiseta-gojo-blanca.jpeg",
      especificaciones: [
        { atributo: "Capacidad", valor: "750 ml" },
        { atributo: "Material", valor: "Acero Inoxidable 304 Grado Alimenticio" },
        { atributo: "Aislamiento", valor: "Doble pared al vacío (BPA Free)" },
        { atributo: "Rendimiento", valor: "24h Frío / 12h Caliente" }
      ],
      variantes: [
        { sku: "NZ-TRM-CAP-750-CYN", precio: 18.50, costo: 9.20, stock: 20, talla: "750 ml", color: "Azul Cyan Cápsula" },
        { sku: "NZ-TRM-CAP-750-WHT", precio: 18.50, costo: 9.20, stock: 15, talla: "750 ml", color: "Blanco Glaciar" }
      ],
      resenas: [
        { nombre: "Nelson B.", calificacion: 5, comentario: "No bota ni una gota en la mochila y el agua se mantiene helada todo el día en la universidad." },
        { nombre: "Patricia H.", calificacion: 5, comentario: "El grabado de Capsule Corp no se borra. Hermoso producto." }
      ]
    },
    {
      nombre_producto: "Termo Botella Metálica Pokéball 500ml",
      descripcion: "Diseño ergonómico con botón de apertura rápida y bloqueo de seguridad. Acabado esmaltado brillante con la icónica Pokéball roja y blanca.",
      id_categoria: 4, // Termos & Botellas
      id_franquicia: 5, // Pokémon
      url_imagen: "/images/products/camiseta-gojo-blanca.jpeg",
      especificaciones: [
        { atributo: "Capacidad", valor: "500 ml" },
        { atributo: "Material", valor: "Acero Inoxidable" },
        { atributo: "Boquilla", valor: "Pajilla interna de silicona médica" }
      ],
      variantes: [
        { sku: "NZ-TRM-POKE-500", precio: 16.99, costo: 8.50, stock: 18, talla: "500 ml", color: "Rojo / Blanco" }
      ],
      resenas: [
        { nombre: "Fátima M.", calificacion: 5, comentario: "Práctico, liviano y con un diseño muy lindo." }
      ]
    },

    // --- ANILLOS & JOYERÍA ---
    {
      nombre_producto: "Anillo Akatsuki Itachi Uchiha (Shu / Escarlata)",
      descripcion: "Anillo oficial de metal pulido con kanji grabado sobre fondo rojo esmaltado. Réplica exacta del anillo que porta Itachi en el dedo anular derecho.",
      id_categoria: 5, // Anillos
      id_franquicia: 2, // Naruto
      url_imagen: "/images/products/prod_1788573722699_silver-ring-with-amethyst-stone-202609042000.jpeg",
      especificaciones: [
        { atributo: "Material", valor: "Aleación de Titanio y Acero Inoxidable" },
        { atributo: "Símbolo", valor: "Kanji 朱 (Shu - Bermellón / Fénix)" },
        { atributo: "Resistencia", valor: "Inoxidable / Hipoalergénico" }
      ],
      variantes: [
        { sku: "NZ-RN-ITA-T8", precio: 12.99, costo: 5.00, stock: 15, talla: "Talla 8 (18.2 mm)", color: "Plata / Rojo" },
        { sku: "NZ-RN-ITA-T9", precio: 12.99, costo: 5.00, stock: 20, talla: "Talla 9 (19.0 mm)", color: "Plata / Rojo" },
        { sku: "NZ-RN-ITA-T10", precio: 12.99, costo: 5.00, stock: 10, talla: "Talla 10 (19.8 mm)", color: "Plata / Rojo" }
      ],
      resenas: [
        { nombre: "Jorge D.", calificacion: 5, comentario: "No mancha el dedo de verde como los anillos baratos. Es pesado y resistente." }
      ]
    },
    {
      nombre_producto: "Anillo Master Ball Pokémon Acero Quirúrgico",
      descripcion: "Anillo grabado con láser en bajo relieve con el diseño y gemas sintéticas de la legendaria Master Ball de Pokémon.",
      id_categoria: 5, // Anillos
      id_franquicia: 5, // Pokémon
      url_imagen: "/images/products/prod_1788573722699_silver-ring-with-amethyst-stone-202609042000.jpeg",
      especificaciones: [
        { atributo: "Material", valor: "Acero Quirúrgico 316L" },
        { atributo: "Acabado", valor: "Pulido espejo con incrustación amatista sintética" }
      ],
      variantes: [
        { sku: "NZ-RN-MST-T8", precio: 13.50, costo: 5.50, stock: 12, talla: "Talla 8 (18.2 mm)", color: "Plata y Morado" },
        { sku: "NZ-RN-MST-T9", precio: 13.50, costo: 5.50, stock: 14, talla: "Talla 9 (19.0 mm)", color: "Plata y Morado" }
      ],
      resenas: [
        { nombre: "Gabriela S.", calificacion: 5, comentario: "Hermoso detalle, viene con una bolsita de terciopelo muy elegante." }
      ]
    }
  ];

  let createdCount = 0;
  for (const item of newProducts) {
    // Check if product already exists by name
    const existing = await prisma.producto.findFirst({
      where: { nombre_producto: item.nombre_producto }
    });

    if (existing) {
      console.log(`- El producto "${item.nombre_producto}" ya existe, omitiendo.`);
      continue;
    }

    const prod = await prisma.producto.create({
      data: {
        nombre_producto: item.nombre_producto,
        descripcion: item.descripcion,
        id_categoria: item.id_categoria,
        id_franquicia: item.id_franquicia,
        url_imagen: item.url_imagen,
        estado: "activo"
      }
    });

    // Create specs
    for (const s of item.especificaciones) {
      await prisma.especificacion_producto.create({
        data: {
          id_producto: prod.id_producto,
          atributo: s.atributo,
          valor: s.valor
        }
      });
    }

    // Create variants
    for (const v of item.variantes) {
      const createdVar = await prisma.producto_variante.create({
        data: {
          id_producto: prod.id_producto,
          sku: v.sku,
          precio: v.precio,
          costo: v.costo,
          stock_disponible: v.stock,
          estado: "activo",
          url_imagen: item.url_imagen
        }
      });

      if (v.talla || v.color) {
        await prisma.variante_apariencia.create({
          data: {
            id_variante: createdVar.id_variante,
            talla: v.talla,
            color: v.color
          }
        });
      }
    }

    // Create reviews
    for (const r of item.resenas) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO resena_producto (id_producto, nombre_cliente, calificacion, comentario, verificado)
         VALUES ($1, $2, $3, $4, true)`,
        prod.id_producto, r.nombre, r.calificacion, r.comentario
      );
    }

    createdCount++;
    console.log(`+ Creado con éxito: #${prod.id_producto} "${item.nombre_producto}" con ${item.variantes.length} variante(s) y ${item.resenas.length} reseña(s).`);
  }

  console.log(`\n✅ Proceso finalizado. Se crearon ${createdCount} productos nuevos.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
