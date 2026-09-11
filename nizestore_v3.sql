-- =====================================================================
-- NizeStore — Modelo de base de datos PostgreSQL (v3 — corregido según
-- retroalimentación del docente + rediseño de talla/color como variante)
--
-- CAMBIOS RESPECTO A v2:
--   1. GEOGRAFÍA: se reestructura a la jerarquía real vigente desde 2024
--      departamento (14) -> municipio (44, nuevo) -> distrito (262, lo
--      que antes se llamaba "municipio"). direccion y sucursal ahora
--      apuntan a distrito, que es el nivel más fino.
--   2. cliente_natural gana nrc y giro (nullable): una persona natural
--      con actividad económica puede tramitar crédito fiscal sin ser
--      jurídica.
--   3. proveedor gana "origen" (nacional/internacional).
--   4. inventario_movimiento -> kardex_inventario con columnas reales
--      de Kardex por costo promedio ponderado.
--   5. TALLA/COLOR YA NO VIVEN EN detalle_carrito NI detalle_pedido.
--      Se crea producto_variante: la unidad realmente vendible (con su
--      propio sku, precio, costo y stock). producto pasa a ser el
--      "producto base" (info compartida). especificacion_producto
--      (EAV) se mantiene solo para atributos puramente informativos
--      (tomo, edición, escala, material...) que NO generan una
--      variante nueva.
--   6. correlativo_documento / factura: se elimina la duplicación de
--      tipo_dte/serie/anio en factura (se obtienen por el FK a
--      correlativo_documento). factura solo guarda su propio
--      numero_documento congelado.
--   7. factura: impuestos -> iva, se agrega descuento y condicion_pago.
--   8. sesion: se agrega id_dispositivo (huella de navegador/cookie)
--      para poder agrupar visitas del mismo dispositivo aunque el
--      cliente no haya iniciado sesión.
--   9. Nueva tabla catalogo_error_pago + FK desde intento_pago.
--  10. Todos los triggers/funciones que dependían de producto.stock o
--      id_producto en carrito/pedido se actualizan para trabajar sobre
--      producto_variante.
--  11. NULLS por diseño: 4 tablas satélite 1:1 nuevas (solo tienen fila
--      cuando el atributo SÍ aplica, en vez de columnas nullable en la
--      mayoría de filas): contribuyente_natural, variante_apariencia,
--      carrito_abandono, intento_pago_error.
--  12. Nuevas tablas de analítica 100% autorellenable: vista_pagina
--      (qué página/producto ve cada sesión, para saber la más vista
--      como Google Site Kit) y etapa_checkout (en qué paso del
--      checkout llega/abandona cada carrito).
-- =====================================================================

-- =====================================================================
-- CLASIFICACION DE TABLAS POR TIPO DE LLENADO
-- (pedido explícito del docente: separar configuración de información)
--
-- A) CATALOGO / CONFIGURACION — se llenan MANUALMENTE desde un panel
--    de administración; cambian poco, las mantiene el equipo de la
--    tienda:
--    pais, departamento, municipio, distrito, tipo_documento,
--    categoria, proveedor, franquicia, producto, producto_variante,
--    variante_apariencia, especificacion_producto, sucursal,
--    politica_envio, promocion, metodo_pago, metodo_envio,
--    catalogo_error_pago.
--
-- B) MAESTRAS DE CLIENTE — las llena el cliente una sola vez (registro/
--    perfil), no son eventos recurrentes:
--    cliente, cliente_natural, cliente_juridico, contribuyente_natural,
--    direccion.
--
-- C) TRANSACCIONAL / 100% AUTORELLENABLE — el sistema las escribe solas
--    en cada interacción del cliente, nunca se editan a mano:
--    sesion, vista_pagina, carrito, detalle_carrito, carrito_abandono,
--    etapa_checkout, intento_pago, intento_pago_error,
--    notificacion_carrito, pedido, detalle_pedido, kardex_inventario,
--    envio, factura, detalle_factura, ticket_soporte (este último lo
--    origina el cliente/soporte, pero sigue siendo un evento, no una
--    fila de catálogo).
-- =====================================================================

-- =====================================================================
-- 1. CATALOGOS GEOGRAFICOS (El Salvador, extensible a otros países)
--    Jerarquía real: departamento -> municipio (nuevo, 44) -> distrito
--    (antiguo municipio, 262). El catálogo completo de 44/262 se carga
--    aparte; aquí solo van los registros mínimos para las sucursales.
-- =====================================================================

CREATE TABLE pais (
    id_pais         SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    codigo_iso      VARCHAR(3)   NOT NULL UNIQUE
);

CREATE TABLE departamento (
    id_departamento SERIAL PRIMARY KEY,
    id_pais         INT NOT NULL REFERENCES pais(id_pais),
    nombre          VARCHAR(100) NOT NULL,
    UNIQUE (id_pais, nombre)
);

CREATE TABLE municipio (
    id_municipio    SERIAL PRIMARY KEY,
    id_departamento INT NOT NULL REFERENCES departamento(id_departamento),
    nombre          VARCHAR(100) NOT NULL,   -- ej. "San Salvador Norte"
    UNIQUE (id_departamento, nombre)
);

CREATE TABLE distrito (
    id_distrito     SERIAL PRIMARY KEY,
    id_municipio    INT NOT NULL REFERENCES municipio(id_municipio),
    nombre          VARCHAR(100) NOT NULL,   -- lo que antes era "municipio"
    UNIQUE (id_municipio, nombre)
);

INSERT INTO pais (nombre, codigo_iso) VALUES ('El Salvador', 'SLV');

INSERT INTO departamento (id_pais, nombre)
SELECT (SELECT id_pais FROM pais WHERE codigo_iso = 'SLV'), d
FROM (VALUES
    ('Ahuachapán'),('Santa Ana'),('Sonsonate'),('Chalatenango'),('La Libertad'),
    ('San Salvador'),('Cuscatlán'),('La Paz'),('Cabañas'),('San Vicente'),
    ('Usulután'),('San Miguel'),('Morazán'),('La Unión')
) AS t(d);

-- Municipios (nuevos, 44) y distritos mínimos necesarios para las
-- sucursales reales. El resto del catálogo oficial (44 municipios /
-- 262 distritos) se carga en la fase de datos con el listado oficial
-- de la reforma territorial 2023 (vigente desde mayo 2024).
INSERT INTO municipio (id_departamento, nombre)
SELECT id_departamento, 'San Salvador Centro' FROM departamento WHERE nombre = 'San Salvador'
UNION ALL
SELECT id_departamento, 'San Salvador Norte' FROM departamento WHERE nombre = 'San Salvador';

INSERT INTO distrito (id_municipio, nombre)
SELECT id_municipio, 'San Salvador' FROM municipio WHERE nombre = 'San Salvador Centro'
UNION ALL
SELECT id_municipio, 'Apopa' FROM municipio WHERE nombre = 'San Salvador Norte';

-- =====================================================================
-- 2. CATALOGO DE DOCUMENTOS DE IDENTIDAD / FISCALES
-- =====================================================================

CREATE TABLE tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    nombre            VARCHAR(50) NOT NULL UNIQUE,   -- DUI, NIT, Pasaporte, Carnet de Residente
    aplica_a          VARCHAR(20) NOT NULL CHECK (aplica_a IN ('natural','juridica','ambos'))
);

INSERT INTO tipo_documento (nombre, aplica_a) VALUES
    ('DUI', 'natural'),
    ('NIT', 'ambos'),
    ('Pasaporte', 'natural'),
    ('Carnet de Residente', 'natural');

-- =====================================================================
-- 3. CLIENTES (supertipo / subtipo: natural vs jurídico)
-- =====================================================================

CREATE TABLE cliente (
    id_cliente       SERIAL PRIMARY KEY,
    correo           VARCHAR(150) NOT NULL UNIQUE
                      CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash    VARCHAR(255) NOT NULL,   -- SIEMPRE hash (bcrypt/argon2), nunca texto plano
    telefono         VARCHAR(20),
    tipo_persona     VARCHAR(10) NOT NULL CHECK (tipo_persona IN ('natural','juridica')),
    fecha_registro   TIMESTAMP NOT NULL DEFAULT now(),
    estado           VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo'))
);

CREATE TABLE cliente_natural (
    id_cliente        INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    nombres           VARCHAR(100) NOT NULL,
    apellidos         VARCHAR(100) NOT NULL,
    id_tipo_documento INT NOT NULL REFERENCES tipo_documento(id_tipo_documento),
    numero_documento  VARCHAR(30) NOT NULL,
    fecha_nacimiento  DATE,
    UNIQUE (id_tipo_documento, numero_documento)
);

-- Satélite 1:1 — solo tiene fila cuando la persona natural SÍ tramitó
-- NRC (la mayoría no lo hace). Evita que nrc/giro estén NULL en casi
-- todas las filas de cliente_natural.
CREATE TABLE contribuyente_natural (
    id_cliente INT PRIMARY KEY REFERENCES cliente_natural(id_cliente) ON DELETE CASCADE,
    nrc        VARCHAR(20) NOT NULL,
    giro       VARCHAR(150) NOT NULL
);

CREATE TABLE cliente_juridico (
    id_cliente        INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    razon_social      VARCHAR(200) NOT NULL,
    nombre_comercial  VARCHAR(200),
    nit               VARCHAR(20) NOT NULL UNIQUE,
    nrc               VARCHAR(20),
    giro              VARCHAR(150),
    nombre_contacto   VARCHAR(150)
);

-- =====================================================================
-- 4. DIRECCIONES (ahora a nivel de distrito, el más fino)
-- =====================================================================

CREATE TABLE direccion (
    id_direccion       SERIAL PRIMARY KEY,
    id_cliente         INT NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    id_distrito        INT NOT NULL REFERENCES distrito(id_distrito),
    tipo_direccion     VARCHAR(20) NOT NULL CHECK (tipo_direccion IN ('envio','facturacion','ambas')),
    direccion_detalle  TEXT NOT NULL,
    es_principal       BOOLEAN NOT NULL DEFAULT FALSE
);

-- =====================================================================
-- 5. SESIONES
--    id_dispositivo permite agrupar visitas del mismo dispositivo
--    aunque el cliente no haya iniciado sesión (huella de cookie /
--    localStorage generada en el navegador, no depende del login).
-- =====================================================================

CREATE TABLE sesion (
    id_sesion          SERIAL PRIMARY KEY,
    id_cliente         INT REFERENCES cliente(id_cliente),   -- NULL = no autenticado en esta sesión
    id_dispositivo     VARCHAR(100),                          -- huella persistente del dispositivo/navegador
    fecha_inicio       TIMESTAMP NOT NULL DEFAULT now(),
    fecha_fin          TIMESTAMP,
    dispositivo        VARCHAR(20) CHECK (dispositivo IN ('computadora','tablet','movil')),
    sistema_operativo  VARCHAR(50),
    navegador          VARCHAR(50),
    fuente_acceso      VARCHAR(50),   -- ej. Instagram, Google, directo, organico
    medio_acceso       VARCHAR(50)
);

-- =====================================================================
-- 6. CATALOGO DE PRODUCTOS
--    producto      = producto base (info compartida por sus variantes)
--    producto_variante = unidad realmente vendible (talla/color/sku/
--                    precio/costo/stock viven AQUÍ, no en el carrito)
--    especificacion_producto = atributos informativos que NO generan
--                    una variante nueva (tomo, edición, escala, etc.
--                    porque cada tomo ya es su propia fila de producto)
-- =====================================================================

CREATE TABLE categoria (
    id_categoria     SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL UNIQUE,
    descripcion      TEXT,
    estado           VARCHAR(20) NOT NULL DEFAULT 'activa'
);

CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre       VARCHAR(150) NOT NULL,
    contacto     VARCHAR(100),
    telefono     VARCHAR(20),
    correo       VARCHAR(150),
    origen       VARCHAR(20) NOT NULL DEFAULT 'nacional'
                 CHECK (origen IN ('nacional','internacional')),
    estado       VARCHAR(20) NOT NULL DEFAULT 'activo'
);

CREATE TABLE franquicia (
    id_franquicia SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL UNIQUE,
    tipo          VARCHAR(30) CHECK (tipo IN ('anime','comic','pelicula','serie','videojuego','otro')),
    estado        VARCHAR(20) NOT NULL DEFAULT 'activa'
);

INSERT INTO franquicia (nombre, tipo) VALUES
    ('Dragon Ball Z', 'anime'), ('Naruto', 'anime'), ('One Piece', 'anime'),
    ('Jujutsu Kaisen', 'anime'), ('Pokémon', 'anime'), ('Marvel', 'comic'),
    ('DC', 'comic'), ('Harry Potter', 'pelicula'), ('Star Wars', 'pelicula'),
    ('Bob Esponja', 'serie');

-- Producto base: SOLO información compartida entre variantes.
-- Ya no tiene precio/costo/stock (eso vive en producto_variante).
CREATE TABLE producto (
    id_producto     SERIAL PRIMARY KEY,
    id_categoria    INT NOT NULL REFERENCES categoria(id_categoria),
    id_proveedor    INT REFERENCES proveedor(id_proveedor),
    id_franquicia   INT REFERENCES franquicia(id_franquicia),
    nombre_producto VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    estado          VARCHAR(20) NOT NULL DEFAULT 'activo',
    fecha_registro  TIMESTAMP NOT NULL DEFAULT now()
);

-- Cada fila = una combinación realmente vendible (lo que antes era
-- "talla/color sueltos en el carrito"). Un producto que no tiene
-- variación real (ej. una figura única, un tomo de manga) igual tiene
-- UNA fila aquí — es su variante única/default.
CREATE TABLE producto_variante (
    id_variante      SERIAL PRIMARY KEY,
    id_producto      INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    sku              VARCHAR(50) UNIQUE,
    precio           NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    costo            NUMERIC(10,2) NOT NULL CHECK (costo >= 0),
    stock_disponible INT NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
    estado           VARCHAR(20) NOT NULL DEFAULT 'activo'
);

-- Satélite 1:1 — solo tiene fila cuando la variante SÍ es de una
-- categoría con talla/color (ropa). El resto del catálogo (manga,
-- figuras, llaveros...) nunca toca esta tabla, así que ni
-- producto_variante ni esta quedan llenas de NULL.
-- Nota: como talla/color ahora viven en otra tabla, la unicidad
-- "no repetir la misma talla+color para el mismo producto" ya no se
-- puede expresar como CHECK/UNIQUE de una sola tabla; se valida por
-- aplicación o con un índice único parcial si se requiere en producción.
CREATE TABLE variante_apariencia (
    id_variante INT PRIMARY KEY REFERENCES producto_variante(id_variante) ON DELETE CASCADE,
    talla       VARCHAR(20),
    color       VARCHAR(30)
);

-- Atributos puramente informativos y NO seleccionables como opción de
-- compra (tomo, edición, escala, material, páginas, dimensiones...).
-- Formato clave-valor porque cada categoría de producto tiene atributos
-- distintos y no todos aplican a todos los productos.
CREATE TABLE especificacion_producto (
    id_especificacion SERIAL PRIMARY KEY,
    id_producto       INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    atributo          VARCHAR(50) NOT NULL,   -- ej. 'tomo', 'editorial', 'escala', 'material'
    valor             VARCHAR(200) NOT NULL,
    UNIQUE (id_producto, atributo)
);

-- =====================================================================
-- 7. SUCURSALES (ahora a nivel de distrito)
-- =====================================================================

CREATE TABLE sucursal (
    id_sucursal       SERIAL PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    id_distrito       INT NOT NULL REFERENCES distrito(id_distrito),
    direccion_detalle TEXT,
    permite_retiro    BOOLEAN NOT NULL DEFAULT TRUE,
    estado            VARCHAR(20) NOT NULL DEFAULT 'activa'
);

INSERT INTO sucursal (nombre, id_distrito, direccion_detalle, permite_retiro)
SELECT 'Nize Store San Benito', id_distrito, 'Calle La Reforma #205B, Col. San Benito, San Salvador', TRUE
FROM distrito WHERE nombre = 'San Salvador'
UNION ALL
SELECT 'Nize Store Metrocentro SS', id_distrito, 'Metrocentro San Salvador', TRUE
FROM distrito WHERE nombre = 'San Salvador'
UNION ALL
SELECT 'Nize Store Plaza Mundo Apopa', id_distrito, 'Plaza Mundo, Apopa', TRUE
FROM distrito WHERE nombre = 'Apopa';

-- =====================================================================
-- 8. POLITICAS COMERCIALES
-- =====================================================================

CREATE TABLE politica_envio (
    id_politica_envio SERIAL PRIMARY KEY,
    monto_minimo      NUMERIC(10,2) NOT NULL,
    costo_envio       NUMERIC(10,2) NOT NULL DEFAULT 0,
    fecha_inicio      DATE NOT NULL,
    fecha_fin         DATE,
    estado            VARCHAR(20) NOT NULL DEFAULT 'activa'
);

CREATE TABLE promocion (
    id_promocion    SERIAL PRIMARY KEY,
    codigo          VARCHAR(50) NOT NULL UNIQUE,
    nombre          VARCHAR(150),
    tipo_descuento  VARCHAR(20) CHECK (tipo_descuento IN ('porcentaje','monto_fijo')),
    valor_descuento NUMERIC(10,2) NOT NULL,
    monto_minimo    NUMERIC(10,2) DEFAULT 0,
    fecha_inicio    DATE,
    fecha_fin       DATE,
    estado          VARCHAR(20) NOT NULL DEFAULT 'activa'
);

CREATE TABLE metodo_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre_metodo  VARCHAR(50) NOT NULL,
    tipo_metodo    VARCHAR(50),
    estado         VARCHAR(20) NOT NULL DEFAULT 'activo'
);

CREATE TABLE metodo_envio (
    id_metodo_envio SERIAL PRIMARY KEY,
    nombre_metodo   VARCHAR(50) NOT NULL,
    tipo_envio      VARCHAR(50),
    costo_base      NUMERIC(10,2) NOT NULL DEFAULT 0,
    tiempo_estimado VARCHAR(50),
    estado          VARCHAR(20) NOT NULL DEFAULT 'activo'
);

-- =====================================================================
-- 9. CATALOGO DE ERRORES DE PAGO
-- =====================================================================

CREATE TABLE catalogo_error_pago (
    id_catalogo_error SERIAL PRIMARY KEY,
    codigo            VARCHAR(20) NOT NULL UNIQUE,     -- ej. '404', 'CARD_DECLINED'
    mensaje_tecnico   VARCHAR(200) NOT NULL,            -- lo que realmente devolvió la pasarela
    mensaje_cliente   VARCHAR(300) NOT NULL             -- lo que se le muestra al cliente
);

INSERT INTO catalogo_error_pago (codigo, mensaje_tecnico, mensaje_cliente) VALUES
    ('CARD_DECLINED', 'Card declined by issuing bank', 'Tu tarjeta fue rechazada por el banco emisor. Verifica tus datos o intenta con otro método de pago.'),
    ('INSUFFICIENT_FUNDS', 'Insufficient funds', 'No se pudo procesar el pago por fondos insuficientes.'),
    ('GATEWAY_TIMEOUT', 'Gateway timeout / 504', 'Estimado cliente, la página se encuentra temporalmente caída. Por favor intenta nuevamente en unos minutos.'),
    ('NOT_FOUND', 'HTTP 404', 'Estimado cliente, ocurrió un error inesperado. Por favor intenta nuevamente.');

-- =====================================================================
-- 9.1 NAVEGACION Y VISTAS DE PAGINA/PRODUCTO (100% AUTORELLENABLE)
--     Responde directamente: "¿qué página/producto es la más vista?"
--     (lo que hace Google Site Kit), y es la base para saber en dónde
--     del sitio se concentra el tráfico antes del abandono.
-- =====================================================================

CREATE TABLE vista_pagina (
    id_vista               BIGSERIAL PRIMARY KEY,
    id_sesion               INT NOT NULL REFERENCES sesion(id_sesion),
    tipo_pagina              VARCHAR(30) NOT NULL
                              CHECK (tipo_pagina IN ('home','categoria','producto','carrito','checkout','otro')),
    id_producto              INT REFERENCES producto(id_producto),   -- solo si tipo_pagina = 'producto'
    url                      VARCHAR(300) NOT NULL,
    fecha_vista              TIMESTAMP NOT NULL DEFAULT now(),
    tiempo_permanencia_seg   INT   -- se actualiza al detectar la siguiente vista/salida
);

CREATE INDEX idx_vista_pagina_producto ON vista_pagina(id_producto);
CREATE INDEX idx_vista_pagina_sesion   ON vista_pagina(id_sesion);
CREATE INDEX idx_vista_pagina_tipo     ON vista_pagina(tipo_pagina);

-- Vista (no tabla: es 100% derivada) para responder "producto más
-- visto" sin duplicar datos, igual al reporte de Site Kit.
CREATE VIEW vista_producto_mas_visto AS
SELECT p.id_producto, p.nombre_producto, COUNT(*) AS total_vistas
FROM vista_pagina vp
JOIN producto p ON p.id_producto = vp.id_producto
WHERE vp.tipo_pagina = 'producto'
GROUP BY p.id_producto, p.nombre_producto
ORDER BY total_vistas DESC;

-- =====================================================================
-- 10. CARRITO (eje central del problema de negocio)
-- =====================================================================

CREATE TABLE carrito (
    id_carrito                  BIGSERIAL PRIMARY KEY,
    id_cliente                  INT REFERENCES cliente(id_cliente),
    id_sesion                   INT REFERENCES sesion(id_sesion),
    id_politica_envio           INT REFERENCES politica_envio(id_politica_envio),
    id_promocion                INT REFERENCES promocion(id_promocion),
    fecha_creacion               TIMESTAMP NOT NULL DEFAULT now(),
    fecha_ultima_actualizacion   TIMESTAMP NOT NULL DEFAULT now(),
    subtotal                    NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento                   NUMERIC(10,2) NOT NULL DEFAULT 0,
    costo_envio                 NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(10,2) NOT NULL DEFAULT 0,
    estado_carrito               VARCHAR(20) NOT NULL DEFAULT 'activo'
                                  CHECK (estado_carrito IN ('activo','abandonado','convertido','expirado'))
);

-- =====================================================================
-- 10.1 ETAPAS DEL CHECKOUT (100% AUTORELLENABLE)
--      Responde directamente la subpregunta: "¿en qué etapa del
--      proceso de compra se concentra el abandono?". Va DESPUÉS de
--      carrito porque depende de su PK.
-- =====================================================================

CREATE TABLE etapa_checkout (
    id_etapa_checkout BIGSERIAL PRIMARY KEY,
    id_carrito          BIGINT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    etapa                VARCHAR(30) NOT NULL
                          CHECK (etapa IN ('carrito','direccion_envio','metodo_envio','metodo_pago','confirmacion')),
    fecha_llegada         TIMESTAMP NOT NULL DEFAULT now(),
    completada            BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_etapa_checkout_carrito ON etapa_checkout(id_carrito);
CREATE INDEX idx_etapa_checkout_etapa   ON etapa_checkout(etapa);

-- Satélite 1:1 y AUTORELLENABLE — solo tiene fila cuando el carrito
-- realmente se abandonó (la mayoría se convierte o sigue activo).
-- Además es, literalmente, la tabla del corazón de tu proyecto de BI:
-- de aquí sale directo el análisis de la tasa de abandono.
CREATE TABLE carrito_abandono (
    id_carrito       BIGINT PRIMARY KEY REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    fecha_abandono   TIMESTAMP NOT NULL DEFAULT now(),
    motivo_abandono  VARCHAR(200)   -- inferido: 'costo_envio', 'tecnico', 'pago_fallido', 'desconocido'...
);

-- Ya NO tiene talla/color: apunta directo a la variante exacta elegida.
CREATE TABLE detalle_carrito (
    id_detalle_carrito BIGSERIAL PRIMARY KEY,
    id_carrito       BIGINT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    id_variante      INT NOT NULL REFERENCES producto_variante(id_variante),
    cantidad         INT NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(10,2) NOT NULL,
    descuento        NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE intento_pago (
    id_intento_pago BIGSERIAL PRIMARY KEY,
    id_carrito          BIGINT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    id_metodo_pago      INT NOT NULL REFERENCES metodo_pago(id_metodo_pago),
    fecha_intento       TIMESTAMP NOT NULL DEFAULT now(),
    monto               NUMERIC(10,2) NOT NULL,
    estado              VARCHAR(20) NOT NULL CHECK (estado IN ('exitoso','fallido','rechazado','cancelado')),
    proveedor_pasarela  VARCHAR(50)
);

-- Satélite 1:1 y AUTORELLENABLE — solo tiene fila cuando el intento
-- de pago SÍ falló (la mayoría de pagos, con suerte, son exitosos).
CREATE TABLE intento_pago_error (
    id_intento_pago    BIGINT PRIMARY KEY REFERENCES intento_pago(id_intento_pago) ON DELETE CASCADE,
    id_catalogo_error  INT NOT NULL REFERENCES catalogo_error_pago(id_catalogo_error),
    codigo_respuesta   VARCHAR(20)
);

CREATE TABLE notificacion_carrito (
    id_notificacion BIGSERIAL PRIMARY KEY,
    id_carrito        BIGINT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    tipo_notificacion VARCHAR(50) CHECK (tipo_notificacion IN ('recordatorio','descuento','ultima_oportunidad')),
    fecha_envio       TIMESTAMP NOT NULL DEFAULT now(),
    resultado         VARCHAR(20) CHECK (resultado IN ('enviado','abierto','clic','recuperado','sin_respuesta'))
);

-- =====================================================================
-- 11. PEDIDOS
-- =====================================================================

CREATE TABLE pedido (
    id_pedido                 BIGSERIAL PRIMARY KEY,
    id_cliente                INT NOT NULL REFERENCES cliente(id_cliente),
    id_carrito                BIGINT UNIQUE REFERENCES carrito(id_carrito),
    id_metodo_pago             INT REFERENCES metodo_pago(id_metodo_pago),
    id_metodo_envio            INT REFERENCES metodo_envio(id_metodo_envio),
    id_direccion_envio         INT REFERENCES direccion(id_direccion),
    id_direccion_facturacion   INT REFERENCES direccion(id_direccion),
    id_sucursal_retiro         INT REFERENCES sucursal(id_sucursal),
    fecha_pedido               TIMESTAMP NOT NULL DEFAULT now(),
    subtotal                  NUMERIC(10,2) NOT NULL,
    descuento                 NUMERIC(10,2) NOT NULL DEFAULT 0,
    costo_envio                NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                     NUMERIC(10,2) NOT NULL,
    estado_pedido               VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_pedido IN
                                ('pendiente','confirmado','pagado','preparando','enviado','entregado','cancelado'))
);

-- Igual que detalle_carrito: apunta a id_variante, sin talla/color sueltos.
CREATE TABLE detalle_pedido (
    id_detalle_pedido BIGSERIAL PRIMARY KEY,
    id_pedido        BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    id_variante      INT NOT NULL REFERENCES producto_variante(id_variante),
    cantidad         INT NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(10,2) NOT NULL,
    descuento        NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal         NUMERIC(10,2) NOT NULL
);

-- =====================================================================
-- 12. INVENTARIO Y LOGISTICA
--     kardex_inventario reemplaza a inventario_movimiento con el
--     formato real de Kardex por costo promedio ponderado que se usa
--     en El Salvador. Se lleva por VARIANTE (unidad real de stock).
-- =====================================================================

CREATE TABLE kardex_inventario (
    id_kardex              BIGSERIAL PRIMARY KEY,
    id_variante            INT NOT NULL REFERENCES producto_variante(id_variante),
    id_pedido               BIGINT REFERENCES pedido(id_pedido),
    id_sucursal              INT REFERENCES sucursal(id_sucursal),
    tipo_movimiento          VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada','salida','ajuste')),
    cantidad_entrada         INT NOT NULL DEFAULT 0 CHECK (cantidad_entrada >= 0),
    costo_unitario_entrada   NUMERIC(10,2),
    cantidad_salida          INT NOT NULL DEFAULT 0 CHECK (cantidad_salida >= 0),
    costo_unitario_salida    NUMERIC(10,2),
    saldo_cantidad           INT NOT NULL,
    saldo_costo_unitario     NUMERIC(10,2) NOT NULL,
    saldo_costo_total        NUMERIC(10,2) NOT NULL,
    fecha_movimiento         TIMESTAMP NOT NULL DEFAULT now(),
    motivo                   VARCHAR(200)
);

CREATE TABLE envio (
    id_envio BIGSERIAL PRIMARY KEY,
    id_pedido               BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    id_metodo_envio          INT REFERENCES metodo_envio(id_metodo_envio),
    id_sucursal_origen       INT REFERENCES sucursal(id_sucursal),
    numero_guia              VARCHAR(50),
    estado_envio             VARCHAR(20) NOT NULL DEFAULT 'preparando'
                              CHECK (estado_envio IN ('preparando','en_transito','entregado','devuelto')),
    fecha_envio              TIMESTAMP,
    fecha_entrega_estimada   DATE,
    fecha_entrega_real       TIMESTAMP
);

-- =====================================================================
-- 13. FACTURACION FISCAL
--     correlativo_documento es el CONTADOR VIVO (tipo_dte/serie/anio
--     viven aquí y se reinician cada año). factura ya NO duplica esos
--     campos: solo guarda numero_documento, que es su propio dato
--     congelado (aunque el contador siga subiendo después).
-- =====================================================================

CREATE TABLE correlativo_documento (
    id_correlativo SERIAL PRIMARY KEY,
    tipo_dte      VARCHAR(30) NOT NULL CHECK (tipo_dte IN ('factura','credito_fiscal','ticket')),
    serie         VARCHAR(10) NOT NULL,
    anio          INT NOT NULL,
    id_sucursal   INT NOT NULL REFERENCES sucursal(id_sucursal),
    ultimo_numero BIGINT NOT NULL DEFAULT 0,
    numero_maximo BIGINT NOT NULL DEFAULT 99999999 CHECK (numero_maximo > 0),
    estado        VARCHAR(20) NOT NULL DEFAULT 'activo',
    UNIQUE (tipo_dte, serie, id_sucursal, anio)
);

CREATE TABLE factura (
    id_factura BIGSERIAL PRIMARY KEY,
    id_pedido        BIGINT NOT NULL UNIQUE REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    id_correlativo   INT NOT NULL REFERENCES correlativo_documento(id_correlativo),
    numero_documento BIGINT NOT NULL,          -- único dato propio de la factura (congelado)
    fecha_emision    TIMESTAMP NOT NULL DEFAULT now(),
    condicion_pago   VARCHAR(20) NOT NULL DEFAULT 'contado' CHECK (condicion_pago IN ('contado','credito')),
    subtotal         NUMERIC(10,2) NOT NULL,
    descuento        NUMERIC(10,2) NOT NULL DEFAULT 0,
    iva              NUMERIC(10,2) NOT NULL DEFAULT 0,
    total            NUMERIC(10,2) NOT NULL,
    UNIQUE (id_correlativo, numero_documento)   -- tipo_dte/serie/anio se obtienen vía FK
);

-- Snapshot de la variante en el momento de facturar (id_variante, no
-- id_producto: la factura debe reflejar exactamente talla/color vendidos).
CREATE TABLE detalle_factura (
    id_detalle_factura BIGSERIAL PRIMARY KEY,
    id_factura            BIGINT NOT NULL REFERENCES factura(id_factura) ON DELETE CASCADE,
    id_variante           INT NOT NULL REFERENCES producto_variante(id_variante),
    descripcion_producto  VARCHAR(200) NOT NULL,   -- texto congelado (incluye talla/color si aplica)
    cantidad              INT NOT NULL CHECK (cantidad > 0),
    precio_unitario       NUMERIC(10,2) NOT NULL,
    descuento             NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal              NUMERIC(10,2) NOT NULL
);

-- =====================================================================
-- 14. TICKET DE SOPORTE
-- =====================================================================

CREATE TABLE ticket_soporte (
    id_ticket BIGSERIAL PRIMARY KEY,
    id_cliente      INT NOT NULL REFERENCES cliente(id_cliente),
    id_pedido       BIGINT REFERENCES pedido(id_pedido),
    id_carrito      BIGINT REFERENCES carrito(id_carrito),
    asunto          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    categoria       VARCHAR(50) CHECK (categoria IN ('pago','envio','tecnico','producto','otro')),
    estado          VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','en_proceso','cerrado')),
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT now(),
    fecha_cierre    TIMESTAMP
);

-- =====================================================================
-- 15. INDICES DE APOYO A CONSULTAS FRECUENTES
-- =====================================================================

CREATE INDEX idx_carrito_estado          ON carrito(estado_carrito);
CREATE INDEX idx_carrito_fecha_creacion  ON carrito(fecha_creacion);
CREATE INDEX idx_carrito_cliente         ON carrito(id_cliente);
CREATE INDEX idx_detalle_carrito_carrito ON detalle_carrito(id_carrito);
CREATE INDEX idx_detalle_carrito_variante ON detalle_carrito(id_variante);
CREATE INDEX idx_intento_pago_carrito     ON intento_pago(id_carrito);
CREATE INDEX idx_sesion_dispositivo       ON sesion(id_dispositivo);
CREATE INDEX idx_pedido_fecha             ON pedido(fecha_pedido);
CREATE INDEX idx_pedido_cliente           ON pedido(id_cliente);
CREATE INDEX idx_variante_producto        ON producto_variante(id_producto);
CREATE INDEX idx_kardex_variante          ON kardex_inventario(id_variante);
CREATE INDEX idx_cliente_correo           ON cliente(correo);

-- =====================================================================
-- 16. FUNCIONES Y TRIGGERS DE INTEGRIDAD / AUTOMATIZACION
-- =====================================================================

-- 16.1 Un cliente natural o jurídico solo puede tener fila de subtipo
--      que corresponda a su tipo_persona en CLIENTE.
CREATE OR REPLACE FUNCTION fn_validar_subtipo_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo VARCHAR(10);
BEGIN
    SELECT tipo_persona INTO v_tipo FROM cliente WHERE id_cliente = NEW.id_cliente;
    IF TG_TABLE_NAME = 'cliente_natural' AND v_tipo <> 'natural' THEN
        RAISE EXCEPTION 'El cliente % no está marcado como persona natural', NEW.id_cliente;
    ELSIF TG_TABLE_NAME = 'cliente_juridico' AND v_tipo <> 'juridica' THEN
        RAISE EXCEPTION 'El cliente % no está marcado como persona jurídica', NEW.id_cliente;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_cliente_natural
    BEFORE INSERT OR UPDATE ON cliente_natural
    FOR EACH ROW EXECUTE FUNCTION fn_validar_subtipo_cliente();

CREATE TRIGGER trg_validar_cliente_juridico
    BEFORE INSERT OR UPDATE ON cliente_juridico
    FOR EACH ROW EXECUTE FUNCTION fn_validar_subtipo_cliente();

-- 16.2 Solo una dirección "principal" por cliente.
CREATE OR REPLACE FUNCTION fn_unica_direccion_principal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.es_principal THEN
        UPDATE direccion SET es_principal = FALSE
        WHERE id_cliente = NEW.id_cliente AND id_direccion <> NEW.id_direccion;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_direccion_principal
    AFTER INSERT OR UPDATE OF es_principal ON direccion
    FOR EACH ROW WHEN (NEW.es_principal) EXECUTE FUNCTION fn_unica_direccion_principal();

-- 16.3 Calcular subtotal automáticamente en líneas de detalle.
CREATE OR REPLACE FUNCTION fn_calcular_subtotal_linea()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := (NEW.precio_unitario * NEW.cantidad) - COALESCE(NEW.descuento, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subtotal_detalle_carrito
    BEFORE INSERT OR UPDATE ON detalle_carrito
    FOR EACH ROW EXECUTE FUNCTION fn_calcular_subtotal_linea();

CREATE TRIGGER trg_subtotal_detalle_pedido
    BEFORE INSERT OR UPDATE ON detalle_pedido
    FOR EACH ROW EXECUTE FUNCTION fn_calcular_subtotal_linea();

CREATE TRIGGER trg_subtotal_detalle_factura
    BEFORE INSERT OR UPDATE ON detalle_factura
    FOR EACH ROW EXECUTE FUNCTION fn_calcular_subtotal_linea();

-- 16.4 Solo se puede agregar una variante a un carrito activo.
CREATE OR REPLACE FUNCTION fn_validar_carrito_activo()
RETURNS TRIGGER AS $$
DECLARE
    v_estado VARCHAR(20);
BEGIN
    SELECT estado_carrito INTO v_estado FROM carrito WHERE id_carrito = NEW.id_carrito;
    IF v_estado <> 'activo' THEN
        RAISE EXCEPTION 'No se pueden agregar productos a un carrito en estado %', v_estado;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_carrito_activo
    BEFORE INSERT ON detalle_carrito
    FOR EACH ROW EXECUTE FUNCTION fn_validar_carrito_activo();

-- 16.5 Recalcular subtotal/total del carrito cuando cambian sus líneas.
CREATE OR REPLACE FUNCTION fn_actualizar_totales_carrito()
RETURNS TRIGGER AS $$
DECLARE
    v_id_carrito BIGINT;
    v_subtotal NUMERIC(10,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_carrito := OLD.id_carrito;
    ELSE
        v_id_carrito := NEW.id_carrito;
    END IF;
    SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
    FROM detalle_carrito WHERE id_carrito = v_id_carrito;

    UPDATE carrito
    SET subtotal = v_subtotal,
        total = v_subtotal - descuento + costo_envio,
        fecha_ultima_actualizacion = now()
    WHERE id_carrito = v_id_carrito;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_totales_carrito
    AFTER INSERT OR UPDATE OR DELETE ON detalle_carrito
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_totales_carrito();

-- 16.6 Al crear un pedido desde un carrito, marcarlo como convertido.
CREATE OR REPLACE FUNCTION fn_marcar_carrito_convertido()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_carrito IS NOT NULL THEN
        UPDATE carrito SET estado_carrito = 'convertido'
        WHERE id_carrito = NEW.id_carrito;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marcar_carrito_convertido
    AFTER INSERT ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_carrito_convertido();

-- 16.7 Validar stock y descontar inventario POR VARIANTE al confirmar
--      un detalle de pedido, generando su línea de Kardex (costo
--      promedio ponderado: el costo de salida es el costo actual de
--      la variante, y el saldo se recalcula tras el movimiento).
CREATE OR REPLACE FUNCTION fn_descontar_stock_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_stock INT;
    v_costo NUMERIC(10,2);
    v_nuevo_stock INT;
BEGIN
    SELECT stock_disponible, costo INTO v_stock, v_costo
    FROM producto_variante WHERE id_variante = NEW.id_variante FOR UPDATE;

    IF v_stock < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para la variante %: disponible %, solicitado %',
            NEW.id_variante, v_stock, NEW.cantidad;
    END IF;

    v_nuevo_stock := v_stock - NEW.cantidad;

    UPDATE producto_variante SET stock_disponible = v_nuevo_stock
    WHERE id_variante = NEW.id_variante;

    INSERT INTO kardex_inventario (
        id_variante, id_pedido, tipo_movimiento,
        cantidad_salida, costo_unitario_salida,
        saldo_cantidad, saldo_costo_unitario, saldo_costo_total, motivo
    ) VALUES (
        NEW.id_variante, NEW.id_pedido, 'salida',
        NEW.cantidad, v_costo,
        v_nuevo_stock, v_costo, v_nuevo_stock * v_costo,
        'Venta - pedido ' || NEW.id_pedido
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_descontar_stock_pedido
    AFTER INSERT ON detalle_pedido
    FOR EACH ROW EXECUTE FUNCTION fn_descontar_stock_pedido();

-- 16.8 Determinar si un cliente es "nuevo" o "recurrente" (dato derivado).
CREATE OR REPLACE FUNCTION fn_tipo_cliente(p_id_cliente INT)
RETURNS VARCHAR AS $$
DECLARE
    v_pedidos_previos INT;
BEGIN
    SELECT COUNT(*) INTO v_pedidos_previos
    FROM pedido
    WHERE id_cliente = p_id_cliente AND estado_pedido NOT IN ('cancelado');

    IF v_pedidos_previos > 1 THEN
        RETURN 'recurrente';
    ELSE
        RETURN 'nuevo';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 16.9 Marcar como abandonados los carritos activos sin actividad
--      reciente. Ahora inserta en carrito_abandono (satélite) en vez
--      de escribir columnas que solo aplican a la minoría de carritos.
CREATE OR REPLACE PROCEDURE sp_marcar_carritos_abandonados(p_horas_inactividad INT DEFAULT 2)
LANGUAGE plpgsql AS $$
BEGIN
    WITH candidatos AS (
        UPDATE carrito
        SET estado_carrito = 'abandonado'
        WHERE estado_carrito = 'activo'
          AND fecha_ultima_actualizacion < now() - (p_horas_inactividad || ' hours')::INTERVAL
        RETURNING id_carrito
    )
    INSERT INTO carrito_abandono (id_carrito, motivo_abandono)
    SELECT id_carrito, 'desconocido' FROM candidatos;
END;
$$;

-- 16.10 Generar el siguiente correlativo fiscal, con reset ANUAL y
--       límite de serie. Aprovisiona automáticamente la fila del año
--       si no existe.
CREATE OR REPLACE FUNCTION fn_siguiente_correlativo(
    p_tipo_dte VARCHAR, p_serie VARCHAR, p_id_sucursal INT, p_anio INT
) RETURNS BIGINT AS $$
DECLARE
    v_numero BIGINT;
    v_max BIGINT;
BEGIN
    INSERT INTO correlativo_documento (tipo_dte, serie, anio, id_sucursal)
    VALUES (p_tipo_dte, p_serie, p_anio, p_id_sucursal)
    ON CONFLICT (tipo_dte, serie, id_sucursal, anio) DO NOTHING;

    SELECT numero_maximo INTO v_max
    FROM correlativo_documento
    WHERE tipo_dte = p_tipo_dte AND serie = p_serie
      AND id_sucursal = p_id_sucursal AND anio = p_anio;

    UPDATE correlativo_documento
    SET ultimo_numero = ultimo_numero + 1
    WHERE tipo_dte = p_tipo_dte AND serie = p_serie
      AND id_sucursal = p_id_sucursal AND anio = p_anio
    RETURNING ultimo_numero INTO v_numero;

    IF v_numero > v_max THEN
        RAISE EXCEPTION 'Serie % agotada para % / sucursal % / año %: se alcanzó el máximo de % documentos. Debe habilitarse una nueva serie.',
            p_serie, p_tipo_dte, p_id_sucursal, p_anio, v_max;
    END IF;

    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- 16.11 Generar la factura (y su detalle congelado) a partir de un
--       pedido. tipo_dte/serie/anio ya NO se guardan en factura: se
--       obtienen del correlativo asociado. El detalle_factura ahora
--       congela id_variante en lugar de id_producto.
CREATE OR REPLACE PROCEDURE sp_generar_factura(
    p_id_pedido BIGINT, p_tipo_dte VARCHAR, p_serie VARCHAR, p_id_sucursal INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_id_correlativo INT;
    v_numero BIGINT;
    v_id_factura BIGINT;
    v_anio INT;
    v_fecha_pedido TIMESTAMP;
    r RECORD;
BEGIN
    SELECT fecha_pedido INTO v_fecha_pedido FROM pedido WHERE id_pedido = p_id_pedido;
    IF v_fecha_pedido IS NULL THEN
        RAISE EXCEPTION 'El pedido % no existe', p_id_pedido;
    END IF;
    v_anio := EXTRACT(YEAR FROM v_fecha_pedido)::int;

    v_numero := fn_siguiente_correlativo(p_tipo_dte, p_serie, p_id_sucursal, v_anio);

    SELECT id_correlativo INTO v_id_correlativo
    FROM correlativo_documento
    WHERE tipo_dte = p_tipo_dte AND serie = p_serie
      AND id_sucursal = p_id_sucursal AND anio = v_anio;

    INSERT INTO factura (id_pedido, id_correlativo, numero_documento,
                          subtotal, descuento, iva, total)
    SELECT p_id_pedido, v_id_correlativo, v_numero,
           subtotal, descuento, ROUND((subtotal - descuento) * 0.13, 2), total
    FROM pedido WHERE id_pedido = p_id_pedido
    RETURNING id_factura INTO v_id_factura;

    FOR r IN SELECT dp.id_variante, pr.nombre_producto,
                    dp.cantidad, dp.precio_unitario, dp.descuento, dp.subtotal,
                    va.talla, va.color
             FROM detalle_pedido dp
             JOIN producto_variante v ON v.id_variante = dp.id_variante
             JOIN producto pr ON pr.id_producto = v.id_producto
             LEFT JOIN variante_apariencia va ON va.id_variante = v.id_variante
             WHERE dp.id_pedido = p_id_pedido
    LOOP
        INSERT INTO detalle_factura (id_factura, id_variante, descripcion_producto,
                                      cantidad, precio_unitario, descuento, subtotal)
        VALUES (
            v_id_factura, r.id_variante,
            r.nombre_producto ||
                CASE WHEN r.talla IS NOT NULL THEN ' - Talla ' || r.talla ELSE '' END ||
                CASE WHEN r.color IS NOT NULL THEN ' - Color ' || r.color ELSE '' END,
            r.cantidad, r.precio_unitario, r.descuento, r.subtotal
        );
    END LOOP;
END;
$$;
