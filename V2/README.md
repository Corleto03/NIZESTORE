# NizeStore V2: SQL y prototipo funcional

Carpeta independiente del proyecto anterior. No utiliza su backend, Node, npm ni Prisma. Los archivos de la raíz permanecen intactos.

## 1. Requisitos e instalación

Instala PostgreSQL 18 (con pgcrypto), Python 3.12 con pip y, opcionalmente, Git. Power BI solo es necesario para analizar después el CSV.

Descarga la rama **nizestore-v2**. En PowerShell entra a V2:

```powershell
cd C:\ruta\NIZESTORE\V2
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r prototipo\requirements.txt
Copy-Item db\.env.example db\.env
notepad db\.env
```

Coloca TU contraseña de PostgreSQL en db/.env. Conserva DB_NAME=nizestore_v2. Si Python no tiene el comando py, usa `python -m venv .venv`. No necesitas activar el entorno: los comandos apuntan directamente a su ejecutable.

## 2. Base de datos nueva

En pgAdmin crea **nizestore_v2** y abre el editor de consultas de ESA base. Ejecuta uno por uno:

1. db/NiceStoreDB_V2.sql.
2. db/Poblacion_NizeStore_V2.sql.
3. db/Vista_Maestra_NizeStore_V2.sql.

**El primer SQL reemplaza el esquema public y sus datos de la base seleccionada: ejecutarlo solo en la V2 nueva, nunca sobre la anterior.** La población se carga una sola vez; rechaza una base ya poblada. El usuario necesita permisos para crear pgcrypto y el esquema.

La creación ya incorpora el reloj compartido. **Reloj_Prueba_Tienda.sql no es un cuarto paso:** se incluye como migración para una V2 anterior sin el reloj. No necesitas los otros SQL del proyecto anterior.

## 3. Preparar y arrancar

Desde V2:

```powershell
.\.venv\Scripts\python.exe prototipo\inicializar.py
.\.venv\Scripts\python.exe prototipo\app.py
```

El inicializador prepara ilustraciones y el acceso adicional del administrador. Consulta **CREDENCIALES_DEMO.md**. Mantén abierta la terminal del servidor.

- Tienda: http://localhost:5050
- Administrador: http://localhost:5050/admin
- Detener: Ctrl+C en la terminal.
- Reiniciar: ejecuta otra vez app.py; **no recrees ni repuebles la base**.

Después también puedes arrancar con:

```powershell
powershell -ExecutionPolicy Bypass -File .\prototipo\Iniciar_Prototipo.ps1
```

Cada equipo tiene su propia base y sus propios registros. El servidor escucha solo en localhost; no publica la tienda en Internet. runtime/ se genera automáticamente para sesión, bandeja y pagos de laboratorio; no se comparte entre equipos.

## 4. Probar y exportar

1. Entra al administrador y revisa productos, variantes, stock y envío.
2. En otra ventana registra un cliente nuevo. Agregar productos exige login.
3. Agrega productos, revisa carrito e inicia checkout. Selecciona domicilio o retiro y comprueba el resumen. Retiro cuesta cero, pero no equivale a alcanzar el mínimo gratuito.
4. Confirma contra entrega o usa el simulador local de pago. No solicita tarjetas reales ni cobra dinero externo.
5. Revisa pedidos, inventario y carritos del panel.
6. Descarga el CSV desde **Exportar a Power BI**. Incluye histórico y prototipo juntos, una fila por carrito.

El flujo guarda automáticamente carrito, etapas, resumen, pedido e inventario. No tienes que insertar compras manualmente. El panel permite imágenes por URL/archivo, editor de productos en tres pasos, categorías, franquicias, proveedores, atributos, envío, cupones y recordatorios.

## 5. Abandono actual: pendiente de rediseño

Se comparte la versión actual; **todavía no incluye la propuesta PROTOTIPO_SIMULADO**. El usuario rechazó el reloj adelantado y pidió revisar la alternativa después de esta publicación.

Hoy, **Simular paso del tiempo** adelanta un reloj compartido hasta cumplir el intervalo normal, actualmente 24h. El adelanto persiste al reiniciar y afecta operaciones posteriores, otros carritos, pagos y beneficios con vencimiento. Para demostrar fechas reales del día, **no uses ese botón**. La detección ordinaria sí funciona con el intervalo configurado. No atrasar el reloj después de generar registros.

Una instalación nueva empieza con adelanto cero: este paquete no copia la base ni el runtime del equipo original, por lo que no transporta su adelanto de pruebas.

## 6. Pruebas opcionales

```powershell
.\.venv\Scripts\python.exe prototipo\pruebas_integracion.py
```

Requiere CREATE DATABASE: crea una base temporal, carga los tres SQL, comprueba flujos y elimina solo esa base temporal. No recrea la base configurada ni inserta pruebas en ella. Validación original: 56 comprobaciones correctas.

## Límites y problemas frecuentes

Pago externo y SMTP no configurados: pasarela y bandeja son locales. PDF académico, no documento fiscal DTE. Imágenes editoriales son referencias; las específicas subidas al producto prevalecen. No se incluyen dependencias instaladas, respaldos, CSV, Power BI ni claves privadas.

- Conexión rechazada: inicia PostgreSQL y revisa DB_HOST/DB_PORT.
- Contraseña incorrecta: corrige db/.env.
- Tabla inexistente: revisa DB_NAME y orden de SQL.
- Puerto ocupado: cambia PORT y PUBLIC_URL en db/.env y abre ese puerto.
