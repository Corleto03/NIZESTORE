const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('resena_producto')) {
  // Add relation to producto
  schema = schema.replace(
    '  vista_pagina            vista_pagina[]\n}',
    '  vista_pagina            vista_pagina[]\n  resena_producto         resena_producto[]\n}'
  );

  // Add model resena_producto at the end
  schema += `
model resena_producto {
  id_resena      Int      @id @default(autoincrement())
  id_producto    Int
  nombre_cliente String   @db.VarChar(100)
  calificacion   Int
  comentario     String
  fecha_creacion DateTime @default(now()) @db.Timestamp(6)
  verificado     Boolean  @default(true)
  producto       producto @relation(fields: [id_producto], references: [id_producto], onDelete: Cascade, onUpdate: NoAction)

  @@index([id_producto], map: "idx_resena_producto")
}
`;

  fs.writeFileSync(schemaPath, schema);
  console.log('schema.prisma updated with resena_producto');
} else {
  console.log('schema.prisma already has resena_producto');
}
