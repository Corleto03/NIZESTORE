-- NizeStore V2 / PostgreSQL 18
-- ATENCION: reemplaza el esquema public de LA BASE seleccionada y sus datos.
-- Respaldar antes. Orden: este archivo -> Poblacion_NizeStore_V2.sql -> vista V2.
-- Los originales V1 no se modifican. Las funciones son para el BACKEND:
-- nunca exponer acceso SQL directo al navegador ni confiar en un id_cliente
-- enviado por el navegador sin verificar la cuenta autenticada.
-- Pregunta: que mejoras priorizar para reducir el abandono, segun etapa,
-- subtotal de productos, envio y resultados de clientes nuevos/recurrentes.
-- Sin sesiones analiticas, dispositivos, fuentes, visitas ni errores de pago.
-- Etapas: PRODUCTOS_AGREGADOS -> CARRITO_REVISADO -> CHECKOUT_INICIADO -> PAGO.
-- Checkout incluye el resumen de envio; no hay una etapa adicional.
-- Fechas TIMESTAMP locales America/El_Salvador. El backend debe usar esa zona.
-- Precios finales al consumidor. Factura basica de laboratorio, no DTE.
-- HISTORICO_SIMULADO separado de PROTOTIPO; nunca enviar correos al historico.
-- Envio gratuito por SUBTOTAL de productos >= umbral, sin descuentos de producto.
-- Stock se reserva al iniciar pago; solo se descuenta al confirmar compra.
-- El resultado pendiente de pago no se etiqueta como fallo ni abandono previo.

BEGIN;
SET LOCAL TIME ZONE 'America/El_Salvador';
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET LOCAL search_path = public, pg_temp;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1. CONFIGURACION INTERNA: se carga una vez con el script de poblacion.
-- Geografia completa: pais -> departamento -> municipio -> distrito.
-- Las tarifas siguen por departamento; la direccion conserva el distrito.
CREATE TABLE pais (
    id_pais integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL UNIQUE,
    codigo_iso char(3) NOT NULL UNIQUE
);
CREATE TABLE departamento (
    id_departamento integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pais integer NOT NULL REFERENCES pais,
    nombre varchar(100) NOT NULL,
    UNIQUE(id_pais, nombre)
);
CREATE TABLE municipio (
    id_municipio integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_departamento integer NOT NULL REFERENCES departamento,
    nombre varchar(100) NOT NULL,
    UNIQUE(id_departamento,nombre)
);
CREATE TABLE distrito (
    id_distrito integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_municipio integer NOT NULL REFERENCES municipio,
    nombre varchar(100) NOT NULL,
    UNIQUE(id_municipio,nombre)
);
CREATE TABLE tarifa_envio (
    id_tarifa_envio integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_departamento integer NOT NULL REFERENCES departamento,
    nombre varchar(100) NOT NULL,
    monto numeric(12,2) NOT NULL CHECK(monto >= 0),
    activa boolean NOT NULL DEFAULT true
);
-- Sustituye politica_envio. Plantillas de ENVIO, no cupones de productos.
-- Normal / gratis desde umbral / gratis total / descuento fijo del envio.
CREATE UNIQUE INDEX uq_tarifa_activa_departamento ON tarifa_envio(id_departamento) WHERE activa;
CREATE TABLE condiciones_envio (
    id_condicion integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(120) NOT NULL,
    tipo varchar(25) NOT NULL CHECK(tipo IN
        ('NORMAL','GRATIS_DESDE_MINIMO','GRATIS_TOTAL','DESCUENTO_ENVIO')),
    compra_minima_gratis numeric(12,2),
    descuento_envio numeric(12,2) NOT NULL DEFAULT 0 CHECK(descuento_envio >= 0),
    activa boolean NOT NULL DEFAULT true,
    CHECK((tipo = 'GRATIS_DESDE_MINIMO' AND compra_minima_gratis IS NOT NULL AND compra_minima_gratis > 0)
       OR (tipo <> 'GRATIS_DESDE_MINIMO' AND compra_minima_gratis IS NULL)),
    CHECK(tipo = 'DESCUENTO_ENVIO' OR descuento_envio = 0),
    CHECK(tipo <> 'DESCUENTO_ENVIO' OR descuento_envio > 0)
);
CREATE TABLE ajustes_tienda (
    id_configuracion integer PRIMARY KEY CHECK(id_configuracion = 1),
    id_condicion integer NOT NULL REFERENCES condiciones_envio,
    tiempo_inactividad_para_abandono interval NOT NULL DEFAULT interval '24 hours'
        CHECK(tiempo_inactividad_para_abandono > interval '0'),
    nombre_tienda varchar(100) NOT NULL DEFAULT 'NizeStore',
    adelanto_reloj interval NOT NULL DEFAULT interval '0' CHECK(adelanto_reloj>=interval '0')
);

-- Hora de negocio compartida; el botón de laboratorio solo la adelanta.
CREATE FUNCTION fn_ahora_tienda() RETURNS timestamp LANGUAGE sql STABLE AS $$
 SELECT localtimestamp+coalesce((SELECT adelanto_reloj FROM ajustes_tienda WHERE id_configuracion=1),interval '0')
$$;

-- 2. CUENTAS Y DIRECCIONES: formulario real de registro/perfil.
CREATE TABLE administrador (
    id_administrador integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL,
    correo varchar(150) NOT NULL,
    password_hash text NOT NULL,
    activo boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX uq_admin_correo ON administrador(lower(correo));
CREATE TABLE cliente (
    id_cliente bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL,
    tipo_persona varchar(10) NOT NULL DEFAULT 'NATURAL' CHECK(tipo_persona IN ('NATURAL','JURIDICA')),
    origen_datos varchar(25) NOT NULL DEFAULT 'PROTOTIPO'
        CHECK(origen_datos IN ('PROTOTIPO','HISTORICO_SIMULADO')),
    permite_recordatorios boolean NOT NULL DEFAULT false,
    correo_verificado boolean NOT NULL DEFAULT false,
    correo varchar(150) NOT NULL,
    password_hash text NOT NULL,
    telefono varchar(25),
    activo boolean NOT NULL DEFAULT true,
    fecha_registro timestamp NOT NULL DEFAULT fn_ahora_tienda()
);
CREATE UNIQUE INDEX uq_cliente_correo ON cliente(lower(correo));
-- Documentos identifican al cliente; no son tipos de factura ni numeradores.
CREATE TABLE tipo_documento (
    id_tipo_documento integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(50) NOT NULL UNIQUE,
    aplica_a varchar(10) NOT NULL CHECK(aplica_a IN ('NATURAL','JURIDICA','AMBOS'))
);
CREATE TABLE cliente_natural (
    id_cliente bigint PRIMARY KEY REFERENCES cliente ON DELETE CASCADE,
    nombres varchar(100) NOT NULL,
    apellidos varchar(100) NOT NULL,
    id_tipo_documento integer REFERENCES tipo_documento,
    numero_documento varchar(40),
    fecha_nacimiento date,
    CHECK((id_tipo_documento IS NULL)=(numero_documento IS NULL)),
    UNIQUE(id_tipo_documento,numero_documento)
);
-- Una persona natural contribuyente sigue siendo NATURAL, no JURIDICA.
CREATE TABLE contribuyente_natural (
    id_cliente bigint PRIMARY KEY REFERENCES cliente_natural ON DELETE CASCADE,
    nrc varchar(30) NOT NULL UNIQUE,
    nit varchar(30) NOT NULL UNIQUE,
    giro varchar(150) NOT NULL
);
CREATE TABLE cliente_juridico (
    id_cliente bigint PRIMARY KEY REFERENCES cliente ON DELETE CASCADE,
    razon_social varchar(200) NOT NULL,
    nombre_comercial varchar(150),
    nit varchar(30) NOT NULL UNIQUE,
    nrc varchar(30),
    giro varchar(150) NOT NULL,
    nombre_contacto varchar(100) NOT NULL
);
CREATE TABLE direccion (
    id_direccion bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente bigint NOT NULL REFERENCES cliente,
    id_distrito integer NOT NULL REFERENCES distrito,
    direccion_texto varchar(300) NOT NULL,
    referencia varchar(200),
    UNIQUE(id_direccion, id_cliente)
);

-- 3. CATALOGO: el administrador mantiene productos desde la aplicacion.
CREATE TABLE categoria (
    id_categoria integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL UNIQUE,
    activa boolean NOT NULL DEFAULT true
);
CREATE TABLE proveedor (
    id_proveedor integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(150) NOT NULL UNIQUE,
    contacto varchar(100), telefono varchar(25), correo varchar(150),
    origen varchar(15) NOT NULL CHECK(origen IN ('NACIONAL','INTERNACIONAL')),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE franquicia (
    id_franquicia integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL UNIQUE,
    activa boolean NOT NULL DEFAULT true
);
CREATE TABLE producto (
    id_producto integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_categoria integer NOT NULL REFERENCES categoria,
    id_proveedor integer REFERENCES proveedor,
    id_franquicia integer REFERENCES franquicia,
    nombre varchar(150) NOT NULL,
    descripcion text,
    url_imagen text,
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE producto_variante (
    id_variante integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto integer NOT NULL REFERENCES producto,
    sku varchar(60) NOT NULL UNIQUE,
    precio numeric(12,2) NOT NULL CHECK(precio > 0),
    costo_promedio numeric(12,2) NOT NULL DEFAULT 0 CHECK(costo_promedio >= 0),
    stock_actual integer NOT NULL DEFAULT 0 CHECK(stock_actual >= 0),
    stock_reservado integer NOT NULL DEFAULT 0
        CHECK(stock_reservado BETWEEN 0 AND stock_actual),
    activa boolean NOT NULL DEFAULT true
);
-- Caracteristicas informativas: no cambian la unidad vendible.
CREATE TABLE especificacion_producto (
    id_especificacion integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto integer NOT NULL REFERENCES producto ON DELETE CASCADE,
    atributo varchar(60) NOT NULL CHECK(length(trim(atributo))>0),
    valor varchar(200) NOT NULL CHECK(length(trim(valor))>0),
    UNIQUE(id_producto,atributo)
);
-- Opciones seleccionables: solo se guardan los atributos que SI aplican.
CREATE TABLE atributo_variante (
    id_atributo integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(60) NOT NULL UNIQUE
);
CREATE TABLE variante_atributo (
    id_variante integer NOT NULL REFERENCES producto_variante ON DELETE CASCADE,
    id_atributo integer NOT NULL REFERENCES atributo_variante,
    valor varchar(100) NOT NULL CHECK(length(trim(valor))>0),
    PRIMARY KEY(id_variante,id_atributo)
);
CREATE TABLE resena_producto (
    id_resena bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto integer NOT NULL REFERENCES producto,
    id_cliente bigint NOT NULL REFERENCES cliente,
    calificacion integer NOT NULL CHECK(calificacion BETWEEN 1 AND 5),
    comentario text NOT NULL CHECK(length(trim(comentario))>0),
    fecha_creacion timestamp NOT NULL DEFAULT fn_ahora_tienda(),
    compra_verificada boolean NOT NULL DEFAULT false,
    UNIQUE(id_producto,id_cliente)
);
CREATE TABLE metodo_pago (
    id_metodo_pago integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(25) NOT NULL UNIQUE CHECK(codigo IN ('TARJETA','TRANSFERENCIA','CONTRA_ENTREGA')),
    nombre varchar(100) NOT NULL,
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE metodo_envio (
    id_metodo_envio integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(25) NOT NULL UNIQUE CHECK(codigo IN ('DOMICILIO','RETIRO_SUCURSAL')),
    nombre varchar(100) NOT NULL,
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE cupon (
    id_cupon integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(50) NOT NULL UNIQUE,
    tipo varchar(15) NOT NULL CHECK(tipo IN ('PORCENTAJE','MONTO_FIJO')),
    valor numeric(12,2) NOT NULL CHECK(valor>0),
    subtotal_minimo numeric(12,2) NOT NULL DEFAULT 0 CHECK(subtotal_minimo>=0),
    fecha_inicio timestamp NOT NULL,
    fecha_fin timestamp NOT NULL CHECK(fecha_fin>=fecha_inicio),
    activa boolean NOT NULL DEFAULT true,
    CHECK(tipo<>'PORCENTAJE' OR valor<=100)
);
CREATE TABLE sucursal (
    id_sucursal integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(120) NOT NULL UNIQUE,
    id_distrito integer NOT NULL REFERENCES distrito,
    direccion_texto varchar(300) NOT NULL
);

-- 4. CARRITO: una fila por carrito, login obligatorio antes de crearlo.
-- segmento_cliente se determina al crearlo, no cambia tras su primera compra.
CREATE TABLE carrito (
    id_carrito bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente bigint NOT NULL REFERENCES cliente,
    id_condicion integer NOT NULL REFERENCES condiciones_envio,
    origen_datos varchar(25) NOT NULL DEFAULT 'PROTOTIPO'
        CHECK(origen_datos IN ('PROTOTIPO','HISTORICO_SIMULADO')),
    id_cupon integer REFERENCES cupon,
    segmento_cliente varchar(15) NOT NULL CHECK(segmento_cliente IN ('NUEVO','RECURRENTE')),
    fecha_creacion timestamp NOT NULL DEFAULT fn_ahora_tienda(),
    ultima_actividad timestamp NOT NULL DEFAULT fn_ahora_tienda(),
    subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
    estado varchar(15) NOT NULL DEFAULT 'ACTIVO'
        CHECK(estado IN ('ACTIVO','ABANDONADO','EN_PAGO','CONVERTIDO','VACIADO')),
    etapa_proceso varchar(25) NOT NULL DEFAULT 'PRODUCTOS_AGREGADOS'
        CHECK(etapa_proceso IN
          ('PRODUCTOS_AGREGADOS','CARRITO_REVISADO','CHECKOUT_INICIADO','PAGO')),
    fecha_abandono timestamp,
    etapa_abandono varchar(25) CHECK(etapa_abandono IN
          ('PRODUCTOS_AGREGADOS','CARRITO_REVISADO','CHECKOUT_INICIADO')),
    fecha_recuperacion timestamp,
    CHECK(ultima_actividad >= fecha_creacion),
    CHECK((fecha_abandono IS NULL) = (etapa_abandono IS NULL)),
    CHECK(fecha_abandono IS NULL OR fecha_abandono >= fecha_creacion),
    CHECK(fecha_recuperacion IS NULL OR
          (fecha_abandono IS NOT NULL AND fecha_recuperacion >= fecha_abandono))
);
CREATE INDEX ix_carrito_cliente ON carrito(id_cliente);
CREATE INDEX ix_carrito_fecha ON carrito(fecha_creacion);
CREATE UNIQUE INDEX uq_carrito_abierto_cliente ON carrito(id_cliente)
    WHERE estado IN ('ACTIVO','EN_PAGO');
CREATE TABLE detalle_carrito (
    id_detalle bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_carrito bigint NOT NULL REFERENCES carrito,
    id_variante integer NOT NULL REFERENCES producto_variante,
    cantidad integer NOT NULL CHECK(cantidad > 0),
    precio_unitario numeric(12,2) NOT NULL CHECK(precio_unitario > 0),
    subtotal_linea numeric(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    UNIQUE(id_carrito, id_variante)
);
-- Registro 1:1, se crea junto al carrito y se actualiza al navegar/cotizar.
-- Se guarda lo mostrado, no se reconstruye despues con tarifas actuales.
CREATE TABLE seguimiento_carrito (
    id_carrito bigint PRIMARY KEY REFERENCES carrito,
    fecha_vista_carrito timestamp,
    fecha_inicio_checkout timestamp,
    fecha_inicio_pago timestamp,
    id_direccion bigint REFERENCES direccion,
    id_distrito_cotizado integer REFERENCES distrito,
    id_metodo_pago integer REFERENCES metodo_pago,
    id_metodo_envio integer REFERENCES metodo_envio,
    id_sucursal_retiro integer REFERENCES sucursal,
    descuento_productos_mostrado numeric(12,2) NOT NULL DEFAULT 0 CHECK(descuento_productos_mostrado>=0),
    codigo_cupon_mostrado varchar(50),
    id_tarifa_envio integer REFERENCES tarifa_envio,
    subtotal_mostrado numeric(12,2) CHECK(subtotal_mostrado >= 0),
    aplica_envio_gratis boolean,
    tarifa_base_mostrada numeric(12,2) CHECK(tarifa_base_mostrada >= 0),
    descuento_envio_mostrado numeric(12,2) CHECK(descuento_envio_mostrado >= 0),
    costo_envio_mostrado numeric(12,2) CHECK(costo_envio_mostrado >= 0),
    total_mostrado numeric(12,2),
    fecha_actualizacion_resumen timestamp,
    nombre_destinatario varchar(100),
    telefono_destinatario varchar(25),
    direccion_mostrada varchar(300),
    CHECK(fecha_inicio_checkout IS NULL OR fecha_vista_carrito IS NOT NULL),
    CHECK(fecha_inicio_pago IS NULL OR fecha_actualizacion_resumen IS NOT NULL),
    CHECK(total_mostrado IS NULL OR total_mostrado = subtotal_mostrado - descuento_productos_mostrado + costo_envio_mostrado)
);

-- 5. COMPRA CONFIRMADA: no se crea por simplemente pulsar 'pagar'.
CREATE TABLE pedido (
    id_pedido bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_carrito bigint NOT NULL UNIQUE REFERENCES carrito,
    id_cliente bigint NOT NULL REFERENCES cliente,
    fecha_confirmacion timestamp NOT NULL,
    subtotal numeric(12,2) NOT NULL CHECK(subtotal > 0),
    costo_envio numeric(12,2) NOT NULL CHECK(costo_envio >= 0),
    descuento_productos numeric(12,2) NOT NULL DEFAULT 0 CHECK(descuento_productos>=0 AND descuento_productos<=subtotal),
    codigo_cupon varchar(50),
    id_metodo_pago integer NOT NULL REFERENCES metodo_pago,
    id_metodo_envio integer NOT NULL REFERENCES metodo_envio,
    estado_pago varchar(15) NOT NULL DEFAULT 'PAGADO' CHECK(estado_pago IN ('PENDIENTE','PAGADO')),
    total numeric(12,2) GENERATED ALWAYS AS (subtotal - descuento_productos + costo_envio) STORED,
    estado varchar(15) NOT NULL DEFAULT 'CONFIRMADO' CHECK(estado = 'CONFIRMADO'),
    nombre_destinatario varchar(100) NOT NULL,
    telefono_destinatario varchar(25) NOT NULL,
    direccion_entrega varchar(300) NOT NULL,
    id_departamento integer NOT NULL REFERENCES departamento,
    id_distrito integer NOT NULL REFERENCES distrito,
    id_sucursal_retiro integer REFERENCES sucursal
);
CREATE TABLE detalle_pedido (
    id_detalle bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido bigint NOT NULL REFERENCES pedido,
    id_variante integer NOT NULL REFERENCES producto_variante,
    cantidad integer NOT NULL CHECK(cantidad > 0),
    precio_unitario numeric(12,2) NOT NULL CHECK(precio_unitario > 0),
    costo_unitario numeric(12,2) NOT NULL CHECK(costo_unitario >= 0),
    descripcion_producto text NOT NULL,
    subtotal_linea numeric(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    UNIQUE(id_pedido, id_variante)
);
-- Solo confirmacion final, no catalogo de errores ni historial de intentos.
-- Referencia UNIQUE evita duplicar pedidos por notificaciones repetidas.
CREATE TABLE confirmacion_pago (
    id_pedido bigint PRIMARY KEY REFERENCES pedido,
    proveedor varchar(60) NOT NULL,
    referencia_externa varchar(150) NOT NULL,
    monto numeric(12,2) NOT NULL CHECK(monto >= 0),
    fecha_confirmacion timestamp NOT NULL,
    UNIQUE(proveedor, referencia_externa)
);
CREATE TABLE reserva_inventario (
    id_carrito bigint NOT NULL REFERENCES carrito,
    id_variante integer NOT NULL REFERENCES producto_variante,
    cantidad integer NOT NULL CHECK(cantidad > 0),
    estado varchar(15) NOT NULL DEFAULT 'ACTIVA'
        CHECK(estado IN ('ACTIVA','LIBERADA','CONSUMIDA')),
    PRIMARY KEY(id_carrito, id_variante)
);
-- Kardex conserva entradas/salidas y saldo/costo historico por variante.
CREATE TABLE kardex_inventario (
    id_kardex bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_variante integer NOT NULL REFERENCES producto_variante,
    id_sucursal integer NOT NULL REFERENCES sucursal,
    id_pedido bigint REFERENCES pedido,
    tipo_movimiento varchar(10) NOT NULL CHECK(tipo_movimiento IN ('ENTRADA','SALIDA')),
    cantidad_entrada integer NOT NULL DEFAULT 0 CHECK(cantidad_entrada >= 0),
    cantidad_salida integer NOT NULL DEFAULT 0 CHECK(cantidad_salida >= 0),
    costo_unitario numeric(12,2) NOT NULL CHECK(costo_unitario >= 0),
    saldo_cantidad integer NOT NULL CHECK(saldo_cantidad >= 0),
    saldo_costo_unitario numeric(12,2) NOT NULL CHECK(saldo_costo_unitario >= 0),
    saldo_costo_total numeric(14,2) GENERATED ALWAYS AS
        (saldo_cantidad * saldo_costo_unitario) STORED,
    fecha_movimiento timestamp NOT NULL,
    motivo varchar(200) NOT NULL,
    CHECK((tipo_movimiento='ENTRADA' AND cantidad_entrada>0 AND cantidad_salida=0 AND id_pedido IS NULL)
       OR (tipo_movimiento='SALIDA' AND cantidad_salida>0 AND cantidad_entrada=0 AND id_pedido IS NOT NULL))
);
CREATE INDEX ix_kardex_variante ON kardex_inventario(id_variante, id_kardex);
-- Logs utiles de transiciones reales; no guarda cada recarga ni cada pagina.
CREATE TABLE registro_evento (
    id_evento bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_carrito bigint NOT NULL REFERENCES carrito,
    tipo varchar(30) NOT NULL CHECK(tipo IN ('CREADO','CARRITO_REVISADO',
       'CHECKOUT_INICIADO','ENVIO_COTIZADO','PAGO_INICIADO','PAGO_RETORNADO',
       'ABANDONO_DETECTADO','COMPRA_CONFIRMADA','CARRITO_REACTIVADO')),
    fecha timestamp NOT NULL,
    descripcion varchar(200) NOT NULL
);
CREATE INDEX ix_evento_carrito ON registro_evento(id_carrito, fecha);

-- 7. MODULOS DE LA TIENDA. No se unen sus detalles a la vista de carritos.
CREATE TABLE envio (
    id_envio bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido bigint NOT NULL UNIQUE REFERENCES pedido,
    id_metodo_envio integer NOT NULL REFERENCES metodo_envio,
    id_sucursal integer NOT NULL REFERENCES sucursal,
    estado varchar(20) NOT NULL DEFAULT 'PREPARANDO'
        CHECK(estado IN ('PREPARANDO','EN_TRANSITO','LISTO_RETIRO','ENTREGADO','RETIRADO')),
    numero_guia varchar(100),
    fecha_preparacion timestamp NOT NULL,
    fecha_despacho timestamp,
    fecha_entrega timestamp,
    CHECK(fecha_despacho IS NULL OR fecha_despacho>=fecha_preparacion),
    CHECK(fecha_entrega IS NULL OR fecha_entrega>=coalesce(fecha_despacho,fecha_preparacion))
);
-- Numeracion del comprobante interno; no confundir con DUI/NIT del cliente.
CREATE TABLE correlativo_documento (
    id_correlativo integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_comprobante varchar(40) NOT NULL DEFAULT 'COMPROBANTE_LABORATORIO'
        CHECK(tipo_comprobante='COMPROBANTE_LABORATORIO'),
    serie varchar(15) NOT NULL DEFAULT 'DEMO',
    anio integer NOT NULL,
    id_sucursal integer NOT NULL REFERENCES sucursal,
    ultimo_numero bigint NOT NULL DEFAULT 0 CHECK(ultimo_numero>=0),
    UNIQUE(tipo_comprobante,serie,anio,id_sucursal)
);
CREATE TABLE factura (
    id_factura bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido bigint NOT NULL UNIQUE REFERENCES pedido,
    id_correlativo integer NOT NULL REFERENCES correlativo_documento,
    numero_documento bigint NOT NULL,
    fecha_emision timestamp NOT NULL,
    datos_cliente jsonb NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    descuento_productos numeric(12,2) NOT NULL,
    costo_envio numeric(12,2) NOT NULL,
    total numeric(12,2) GENERATED ALWAYS AS (subtotal-descuento_productos+costo_envio) STORED,
    url_pdf text,
    UNIQUE(id_correlativo,numero_documento)
);
CREATE TABLE detalle_factura (
    id_detalle bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_factura bigint NOT NULL REFERENCES factura,
    id_variante integer NOT NULL REFERENCES producto_variante,
    descripcion_producto text NOT NULL,
    cantidad integer NOT NULL CHECK(cantidad>0),
    precio_unitario numeric(12,2) NOT NULL CHECK(precio_unitario>0),
    subtotal_linea numeric(12,2) GENERATED ALWAYS AS (cantidad*precio_unitario) STORED,
    UNIQUE(id_factura,id_variante)
);
-- Solo cola/registro: no afirma haber enviado correo hasta respuesta del proveedor.
CREATE TABLE notificacion_carrito (
    id_notificacion bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_carrito bigint NOT NULL REFERENCES carrito,
    fecha_abandono timestamp NOT NULL,
    correo_destino varchar(150) NOT NULL,
    token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    fecha_creacion timestamp NOT NULL,
    fecha_expiracion timestamp NOT NULL,
    estado varchar(12) NOT NULL DEFAULT 'PENDIENTE'
        CHECK(estado IN ('PENDIENTE','ENVIADO','FALLIDO')),
    referencia_correo varchar(150),
    fecha_envio timestamp,
    fecha_clic timestamp,
    id_pedido_recuperado bigint REFERENCES pedido,
    UNIQUE(id_carrito,fecha_abandono),
    CHECK(fecha_expiracion>fecha_creacion),
    CHECK(estado<>'ENVIADO' OR (fecha_envio IS NOT NULL AND referencia_correo IS NOT NULL)),
    CHECK(fecha_envio IS NULL OR fecha_envio>=fecha_creacion),
    CHECK(fecha_clic IS NULL OR (fecha_envio IS NOT NULL AND fecha_clic>=fecha_envio))
);


-- Episodios, sin duplicar carritos ni inventar motivos.
CREATE TABLE historial_abandono (
 id_abandono bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_carrito bigint NOT NULL REFERENCES carrito,
 fecha_abandono timestamp NOT NULL,
 etapa_abandono varchar(25) NOT NULL,
 subtotal_productos numeric(12,2),
 id_metodo_envio integer REFERENCES metodo_envio,
 id_tarifa_envio integer REFERENCES tarifa_envio,
 costo_envio_mostrado numeric(12,2),
 total_mostrado numeric(12,2),
 fecha_reactivacion timestamp,
 UNIQUE(id_carrito,fecha_abandono),
 CHECK(etapa_abandono IN ('PRODUCTOS_AGREGADOS','CARRITO_REVISADO','CHECKOUT_INICIADO')),
 CHECK(fecha_reactivacion IS NULL OR fecha_reactivacion>=fecha_abandono)
);
CREATE INDEX ix_historial_carrito ON historial_abandono(id_carrito,fecha_abandono);

-- 6. AUTOMATIZACION OPERATIVA (la vista NO tiene esta complejidad).
-- Valores usados quedan inmutables: crear otra regla/tarifa para conservar el pasado.
CREATE FUNCTION fn_catalogo_envio_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    -- El panel puede activar/desactivar; no puede reescribir los valores historicos.
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'activa')=(to_jsonb(OLD)-'activa') THEN
      IF TG_TABLE_NAME='condiciones_envio' THEN
        IF NOT NEW.activa AND EXISTS(SELECT 1 FROM ajustes_tienda WHERE id_condicion=OLD.id_condicion) THEN
          RAISE EXCEPTION 'Seleccionar otra regla antes de desactivar la vigente';
        END IF;
      END IF;
      RETURN NEW;
    END IF;
    IF TG_TABLE_NAME='condiciones_envio' THEN
      IF EXISTS(SELECT 1 FROM carrito WHERE id_condicion=OLD.id_condicion) THEN
        RAISE EXCEPTION 'Condicion utilizada: crear otra regla, no cambiar el pasado';
      END IF;
    ELSE
      IF EXISTS(SELECT 1 FROM seguimiento_carrito WHERE id_tarifa_envio=OLD.id_tarifa_envio) THEN
        RAISE EXCEPTION 'Tarifa utilizada: crear otra tarifa';
      END IF;
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_condicion_inmutable BEFORE UPDATE OR DELETE ON condiciones_envio
FOR EACH ROW EXECUTE FUNCTION fn_catalogo_envio_inmutable();
CREATE TRIGGER trg_tarifa_inmutable BEFORE UPDATE OR DELETE ON tarifa_envio
FOR EACH ROW EXECUTE FUNCTION fn_catalogo_envio_inmutable();

CREATE FUNCTION fn_inicializar_carrito() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cliente_fecha timestamp;
BEGIN
    SELECT fecha_registro INTO cliente_fecha FROM cliente WHERE id_cliente=NEW.id_cliente AND activo;
    IF cliente_fecha IS NULL OR cliente_fecha > NEW.fecha_creacion THEN
        RAISE EXCEPTION 'Cliente inexistente/inactivo o carrito anterior a su registro';
    END IF;
    IF NEW.id_condicion IS NULL THEN
        SELECT id_condicion INTO NEW.id_condicion FROM ajustes_tienda WHERE id_configuracion=1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM condiciones_envio WHERE id_condicion=NEW.id_condicion AND activa) THEN
        RAISE EXCEPTION 'Seleccionar una regla de envio activa para crear carrito';
    END IF;
    NEW.segmento_cliente := CASE WHEN EXISTS(SELECT 1 FROM pedido
        WHERE id_cliente=NEW.id_cliente AND fecha_confirmacion < NEW.fecha_creacion)
        THEN 'RECURRENTE' ELSE 'NUEVO' END;
    SELECT origen_datos INTO NEW.origen_datos FROM cliente WHERE id_cliente=NEW.id_cliente;
    NEW.ultima_actividad := NEW.fecha_creacion;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_inicializar_carrito BEFORE INSERT ON carrito
FOR EACH ROW EXECUTE FUNCTION fn_inicializar_carrito();
CREATE FUNCTION fn_crear_seguimiento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    -- Domicilio es modalidad base; pago permanece NULL hasta seleccion real.
    INSERT INTO seguimiento_carrito(id_carrito,id_metodo_envio)
    SELECT NEW.id_carrito,id_metodo_envio FROM metodo_envio WHERE codigo='DOMICILIO';
    INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
      VALUES(NEW.id_carrito,'CREADO',NEW.fecha_creacion,'Carrito de cuenta identificada');
    RETURN NEW;
END $$;
CREATE TRIGGER trg_crear_seguimiento AFTER INSERT ON carrito
FOR EACH ROW EXECUTE FUNCTION fn_crear_seguimiento();

-- API: crea el carrito vacio y agrega el primer producto en la MISMA transaccion.
CREATE FUNCTION fn_crear_carrito(p_cliente bigint, p_fecha timestamp DEFAULT fn_ahora_tienda(),
    p_condicion integer DEFAULT NULL) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE resultado bigint;
BEGIN
    INSERT INTO carrito(id_cliente,id_condicion,fecha_creacion)
      VALUES(p_cliente,p_condicion,p_fecha) RETURNING id_carrito INTO resultado;
    RETURN resultado;
END $$;

-- Agregar/modificar linea desde backend; el precio no lo decide el navegador.
CREATE FUNCTION fn_validar_linea_carrito() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; v producto_variante%ROWTYPE; cart_id bigint;
BEGIN
    cart_id := CASE WHEN TG_OP='DELETE' THEN OLD.id_carrito ELSE NEW.id_carrito END;
    SELECT * INTO STRICT c FROM carrito WHERE id_carrito=cart_id FOR UPDATE;
    IF c.estado IN ('EN_PAGO','CONVERTIDO') THEN RAISE EXCEPTION 'Carrito cerrado para edicion'; END IF;
    IF TG_OP='UPDATE' AND (NEW.id_carrito<>OLD.id_carrito OR NEW.id_variante<>OLD.id_variante) THEN
        RAISE EXCEPTION 'No trasladar una linea: eliminar/agregar';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    SELECT * INTO STRICT v FROM producto_variante WHERE id_variante=NEW.id_variante;
    IF NOT v.activa OR NOT EXISTS(SELECT 1 FROM producto WHERE id_producto=v.id_producto AND activo) THEN
        RAISE EXCEPTION 'Producto inactivo';
    END IF;
    IF NEW.cantidad > v.stock_actual-v.stock_reservado THEN RAISE EXCEPTION 'Stock insuficiente'; END IF;
    IF TG_OP='INSERT' THEN NEW.precio_unitario:=v.precio;
    ELSE NEW.precio_unitario:=OLD.precio_unitario; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_linea BEFORE INSERT OR UPDATE OR DELETE ON detalle_carrito
FOR EACH ROW EXECUTE FUNCTION fn_validar_linea_carrito();
CREATE FUNCTION fn_totales_carrito() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cart_id bigint; nuevo_subtotal numeric(12,2);
BEGIN
    cart_id:=CASE WHEN TG_OP='DELETE' THEN OLD.id_carrito ELSE NEW.id_carrito END;
    SELECT coalesce(sum(subtotal_linea),0) INTO nuevo_subtotal FROM detalle_carrito WHERE id_carrito=cart_id;
    UPDATE carrito SET subtotal=nuevo_subtotal WHERE id_carrito=cart_id;
    PERFORM fn_cotizar_envio(cart_id);
    RETURN NULL;
END $$;
CREATE TRIGGER trg_totales_linea AFTER INSERT OR UPDATE OR DELETE ON detalle_carrito
FOR EACH ROW EXECUTE FUNCTION fn_totales_carrito();
CREATE FUNCTION fn_agregar_producto(p_carrito bigint,p_variante integer,p_cantidad integer,
    p_fecha timestamp DEFAULT fn_ahora_tienda()) RETURNS void LANGUAGE plpgsql AS $$
DECLARE previo_estado text;
BEGIN
    SELECT estado INTO STRICT previo_estado FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
    IF p_fecha < (SELECT ultima_actividad FROM carrito WHERE id_carrito=p_carrito) THEN
        RAISE EXCEPTION 'Fecha anterior';
    END IF;
    IF p_cantidad<=0 THEN RAISE EXCEPTION 'Cantidad debe ser positiva'; END IF;
    INSERT INTO detalle_carrito(id_carrito,id_variante,cantidad,precio_unitario)
      VALUES(p_carrito,p_variante,p_cantidad,1)
      ON CONFLICT(id_carrito,id_variante) DO UPDATE SET cantidad=detalle_carrito.cantidad+EXCLUDED.cantidad;
    UPDATE carrito SET estado='ACTIVO',ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
    PERFORM fn_cotizar_envio(p_carrito,p_fecha);
    IF previo_estado='ABANDONADO' THEN
      INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
      VALUES(p_carrito,'CARRITO_REACTIVADO',p_fecha,'Cliente retoma su carrito');
    END IF;
END $$;
CREATE FUNCTION fn_cambiar_cantidad(p_carrito bigint,p_variante integer,p_cantidad integer,
    p_fecha timestamp DEFAULT fn_ahora_tienda()) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
    IF EXISTS(SELECT 1 FROM carrito WHERE id_carrito=p_carrito AND
        (estado IN ('EN_PAGO','CONVERTIDO') OR ultima_actividad>p_fecha)) THEN
        RAISE EXCEPTION 'Carrito no editable o fecha anterior';
    END IF;
    IF p_cantidad<0 THEN RAISE EXCEPTION 'Cantidad negativa'; END IF;
    IF p_cantidad=0 THEN DELETE FROM detalle_carrito WHERE id_carrito=p_carrito AND id_variante=p_variante;
    ELSE UPDATE detalle_carrito SET cantidad=p_cantidad WHERE id_carrito=p_carrito AND id_variante=p_variante; END IF;
    UPDATE carrito SET ultima_actividad=p_fecha,estado=CASE WHEN subtotal=0 THEN 'VACIADO' ELSE 'ACTIVO' END
      WHERE id_carrito=p_carrito;
    PERFORM fn_cotizar_envio(p_carrito,p_fecha);
END $$;

-- Pantalla real: la aplicacion llama esta funcion al entrar, no cada recarga.
CREATE FUNCTION fn_avanzar_carrito(p_carrito bigint,p_etapa text,
    p_fecha timestamp DEFAULT fn_ahora_tienda()) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; ch seguimiento_carrito%ROWTYPE;
BEGIN
    SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
    SELECT * INTO STRICT ch FROM seguimiento_carrito WHERE id_carrito=p_carrito;
    IF c.estado IN ('EN_PAGO','CONVERTIDO') OR c.subtotal<=0 THEN RAISE EXCEPTION 'Carrito no editable o vacio'; END IF;
    IF p_etapa NOT IN ('CARRITO_REVISADO','CHECKOUT_INICIADO') THEN RAISE EXCEPTION 'Etapa no permitida'; END IF;
    IF p_etapa='CHECKOUT_INICIADO' AND ch.fecha_vista_carrito IS NULL THEN
        RAISE EXCEPTION 'Primero revisar el carrito';
    END IF;
    IF p_fecha<c.ultima_actividad THEN RAISE EXCEPTION 'Fecha anterior al avance previo'; END IF;
    UPDATE seguimiento_carrito SET
      fecha_vista_carrito=CASE WHEN p_etapa='CARRITO_REVISADO' THEN coalesce(fecha_vista_carrito,p_fecha) ELSE fecha_vista_carrito END,
      fecha_inicio_checkout=CASE WHEN p_etapa='CHECKOUT_INICIADO' THEN coalesce(fecha_inicio_checkout,p_fecha) ELSE fecha_inicio_checkout END
      WHERE id_carrito=p_carrito;
    IF (p_etapa='CARRITO_REVISADO' AND ch.fecha_vista_carrito IS NULL) OR
       (p_etapa='CHECKOUT_INICIADO' AND ch.fecha_inicio_checkout IS NULL) THEN
      INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
      VALUES(p_carrito,p_etapa,p_fecha,'Pantalla presentada por la aplicacion');
      UPDATE carrito SET ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
    END IF;
    IF c.estado='ABANDONADO' THEN
      INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
      VALUES(p_carrito,'CARRITO_REACTIVADO',p_fecha,'Cliente retoma compra');
      UPDATE carrito SET ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
    END IF;
    UPDATE carrito SET estado='ACTIVO',etapa_proceso=CASE
      WHEN p_etapa='CHECKOUT_INICIADO' THEN p_etapa
      WHEN etapa_proceso='PRODUCTOS_AGREGADOS' THEN p_etapa ELSE etapa_proceso END
      WHERE id_carrito=p_carrito;
    PERFORM fn_cotizar_envio(p_carrito,p_fecha);
END $$;
CREATE FUNCTION fn_guardar_checkout(p_carrito bigint,p_direccion bigint,p_nombre text,p_telefono text,
    p_fecha timestamp DEFAULT fn_ahora_tienda()) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; texto text;
BEGIN
    SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
    IF c.estado<>'ACTIVO' OR c.etapa_proceso<>'CHECKOUT_INICIADO' THEN RAISE EXCEPTION 'Checkout no activo'; END IF;
    IF p_fecha<c.ultima_actividad THEN RAISE EXCEPTION 'Fecha anterior'; END IF;
    IF length(trim(p_nombre))=0 OR length(trim(p_telefono))=0 THEN RAISE EXCEPTION 'Datos de destinatario requeridos'; END IF;
    SELECT direccion_texto INTO STRICT texto FROM direccion WHERE id_direccion=p_direccion AND id_cliente=c.id_cliente;
    UPDATE seguimiento_carrito SET id_direccion=p_direccion,nombre_destinatario=p_nombre,
      telefono_destinatario=p_telefono,direccion_mostrada=texto WHERE id_carrito=p_carrito;
    UPDATE carrito SET ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
    PERFORM fn_cotizar_envio(p_carrito,p_fecha);
    INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
      VALUES(p_carrito,'ENVIO_COTIZADO',p_fecha,'Zona seleccionada y resumen actualizado');
END $$;

-- Stock: entradas mediante panel, costo promedio ponderado automatico.
CREATE FUNCTION fn_entrada_inventario(p_variante integer,p_sucursal integer,p_cantidad integer,
    p_costo numeric,p_fecha timestamp DEFAULT fn_ahora_tienda(),p_motivo text DEFAULT 'Reposicion')
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v producto_variante%ROWTYPE; promedio numeric(12,2);
BEGIN
    IF p_cantidad<=0 OR p_costo<0 THEN RAISE EXCEPTION 'Entrada invalida'; END IF;
    SELECT * INTO STRICT v FROM producto_variante WHERE id_variante=p_variante FOR UPDATE;
    promedio:=round((v.stock_actual*v.costo_promedio+p_cantidad*p_costo)/(v.stock_actual+p_cantidad),2);
    UPDATE producto_variante SET stock_actual=stock_actual+p_cantidad,costo_promedio=promedio WHERE id_variante=p_variante;
    INSERT INTO kardex_inventario(id_variante,id_sucursal,tipo_movimiento,cantidad_entrada,
      costo_unitario,saldo_cantidad,saldo_costo_unitario,fecha_movimiento,motivo)
      VALUES(p_variante,p_sucursal,'ENTRADA',p_cantidad,p_costo,v.stock_actual+p_cantidad,promedio,p_fecha,p_motivo);
END $$;
CREATE FUNCTION fn_iniciar_pago(p_carrito bigint,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; ch seguimiento_carrito%ROWTYPE; d record; v producto_variante%ROWTYPE;
BEGIN
    SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
    IF c.estado='EN_PAGO' THEN RETURN; END IF; -- solicitud repetida, no duplica reserva
    IF c.estado<>'ACTIVO' OR c.subtotal<=0 THEN RAISE EXCEPTION 'Carrito no listo'; END IF;
    PERFORM fn_cotizar_envio(p_carrito,p_fecha);
    SELECT * INTO STRICT ch FROM seguimiento_carrito WHERE id_carrito=p_carrito;
    IF ch.total_mostrado IS NULL OR ch.nombre_destinatario IS NULL THEN RAISE EXCEPTION 'Completar direccion y cotizacion'; END IF;
    IF NOT EXISTS(SELECT 1 FROM metodo_pago WHERE id_metodo_pago=ch.id_metodo_pago AND activo) THEN
      RAISE EXCEPTION 'Seleccionar un metodo de pago activo'; END IF;
    IF p_fecha<c.ultima_actividad THEN RAISE EXCEPTION 'Fecha anterior'; END IF;
    FOR d IN SELECT * FROM detalle_carrito WHERE id_carrito=p_carrito ORDER BY id_variante LOOP
      SELECT * INTO STRICT v FROM producto_variante WHERE id_variante=d.id_variante FOR UPDATE;
      IF NOT v.activa OR NOT EXISTS(SELECT 1 FROM producto WHERE id_producto=v.id_producto AND activo) THEN
        RAISE EXCEPTION 'Producto ya no disponible';
      END IF;
      IF d.cantidad>v.stock_actual-v.stock_reservado THEN RAISE EXCEPTION 'Stock insuficiente al pagar'; END IF;
      UPDATE producto_variante SET stock_reservado=stock_reservado+d.cantidad WHERE id_variante=d.id_variante;
      INSERT INTO reserva_inventario VALUES(p_carrito,d.id_variante,d.cantidad,'ACTIVA')
      ON CONFLICT(id_carrito,id_variante) DO UPDATE SET cantidad=EXCLUDED.cantidad,estado='ACTIVA';
    END LOOP;
    UPDATE seguimiento_carrito SET fecha_inicio_pago=coalesce(fecha_inicio_pago,p_fecha) WHERE id_carrito=p_carrito;
    UPDATE carrito SET estado='EN_PAGO',etapa_proceso='PAGO',ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
    INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
      VALUES(p_carrito,'PAGO_INICIADO',p_fecha,'Reserva y derivacion al pago; aun no es compra');
END $$;
-- BACKEND: ejecutar solo tras comprobar con proveedor que no hay cobro pendiente.
CREATE FUNCTION fn_retornar_del_pago(p_carrito bigint,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; r record;
BEGIN
    SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
    IF c.estado<>'EN_PAGO' THEN RAISE EXCEPTION 'No esta en pago'; END IF;
    IF p_fecha<c.ultima_actividad THEN RAISE EXCEPTION 'Fecha anterior'; END IF;
    FOR r IN SELECT * FROM reserva_inventario WHERE id_carrito=p_carrito AND estado='ACTIVA' ORDER BY id_variante LOOP
      UPDATE producto_variante SET stock_reservado=stock_reservado-r.cantidad WHERE id_variante=r.id_variante;
    END LOOP;
    UPDATE reserva_inventario SET estado='LIBERADA' WHERE id_carrito=p_carrito AND estado='ACTIVA';
    UPDATE carrito SET estado='ACTIVO',etapa_proceso='CHECKOUT_INICIADO',ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
    INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
      VALUES(p_carrito,'PAGO_RETORNADO',p_fecha,'Retorno verificado sin cobro; no diagnostica error');
END $$;
-- Ejecutar periodicamente desde tarea del backend. No clasifica EN_PAGO como error.
-- Fecha de abandono = ultima actividad + plazo, no el momento de ejecutar tarea.
CREATE FUNCTION fn_detectar_abandonos(p_ahora timestamp DEFAULT fn_ahora_tienda(),
    p_plazo interval DEFAULT NULL) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE plazo interval; c record; cantidad integer:=0;
BEGIN
    SELECT coalesce(p_plazo,tiempo_inactividad_para_abandono) INTO plazo FROM ajustes_tienda WHERE id_configuracion=1;
    IF plazo IS NULL OR plazo<=interval '0' THEN RAISE EXCEPTION 'Plazo invalido'; END IF;
    FOR c IN SELECT * FROM carrito WHERE estado='ACTIVO' AND subtotal>0
      AND ultima_actividad+plazo<=p_ahora FOR UPDATE SKIP LOCKED LOOP
      UPDATE carrito SET estado='ABANDONADO',fecha_abandono=ultima_actividad+plazo,
        etapa_abandono=CASE WHEN etapa_proceso='PAGO' THEN 'CHECKOUT_INICIADO' ELSE etapa_proceso END
        WHERE id_carrito=c.id_carrito;
      INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
        VALUES(c.id_carrito,'ABANDONO_DETECTADO',c.ultima_actividad+plazo,'Sin compra ni actividad durante el plazo');
      INSERT INTO historial_abandono(id_carrito,fecha_abandono,etapa_abandono,subtotal_productos,
        id_metodo_envio,id_tarifa_envio,costo_envio_mostrado,total_mostrado)
      SELECT c.id_carrito,c.ultima_actividad+plazo,
        CASE WHEN c.etapa_proceso='PAGO' THEN 'CHECKOUT_INICIADO' ELSE c.etapa_proceso END,
        c.subtotal,ch.id_metodo_envio,ch.id_tarifa_envio,ch.costo_envio_mostrado,ch.total_mostrado
      FROM seguimiento_carrito ch WHERE ch.id_carrito=c.id_carrito ON CONFLICT DO NOTHING;
      cantidad:=cantidad+1;
    END LOOP;
    RETURN cantidad;
END $$;

-- Verificacion de credenciales desde backend. No es una sesion analitica;
-- emitir cookie de sesion y verificar autorizacion sigue siendo tarea del app.
CREATE FUNCTION fn_autenticar_cliente(p_correo text,p_clave text)
RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT id_cliente FROM cliente WHERE activo AND lower(correo)=lower(trim(p_correo))
   AND password_hash=crypt(p_clave,password_hash)
$$;
CREATE FUNCTION fn_autenticar_administrador(p_correo text,p_clave text)
RETURNS integer LANGUAGE sql STABLE AS $$
 SELECT id_administrador FROM administrador WHERE activo AND lower(correo)=lower(trim(p_correo))
   AND password_hash=crypt(p_clave,password_hash)
$$;

CREATE FUNCTION fn_validar_tipo_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tipo text;
BEGIN
    SELECT tipo_persona INTO STRICT tipo FROM cliente WHERE id_cliente=NEW.id_cliente;
    IF (TG_TABLE_NAME='cliente_natural' AND tipo<>'NATURAL') OR
       (TG_TABLE_NAME='cliente_juridico' AND tipo<>'JURIDICA') THEN
        RAISE EXCEPTION 'El perfil no coincide con el tipo de cliente';
    END IF;
    IF TG_TABLE_NAME='cliente_natural' THEN
      IF NEW.id_tipo_documento IS NOT NULL AND NOT EXISTS
        (SELECT 1 FROM tipo_documento WHERE id_tipo_documento=NEW.id_tipo_documento AND aplica_a IN ('NATURAL','AMBOS')) THEN
          RAISE EXCEPTION 'Documento no aplicable a persona natural';
      END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_cliente_natural BEFORE INSERT OR UPDATE ON cliente_natural
FOR EACH ROW EXECUTE FUNCTION fn_validar_tipo_cliente();
CREATE TRIGGER trg_cliente_juridico BEFORE INSERT OR UPDATE ON cliente_juridico
FOR EACH ROW EXECUTE FUNCTION fn_validar_tipo_cliente();
CREATE FUNCTION fn_no_cambiar_tipo_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.tipo_persona<>OLD.tipo_persona AND
    (EXISTS(SELECT 1 FROM cliente_natural WHERE id_cliente=OLD.id_cliente) OR
     EXISTS(SELECT 1 FROM cliente_juridico WHERE id_cliente=OLD.id_cliente)) THEN
   RAISE EXCEPTION 'No cambiar tipo de cuenta con perfil existente';
 END IF;
 IF NEW.origen_datos<>OLD.origen_datos THEN RAISE EXCEPTION 'Origen de datos no editable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_tipo_cuenta BEFORE UPDATE ON cliente
FOR EACH ROW EXECUTE FUNCTION fn_no_cambiar_tipo_cliente();

-- El panel guarda solo pares que aplican: {"Talla":"M","Color":"Negro"}.
CREATE FUNCTION fn_guardar_atributos_variante(p_variante integer,p_atributos jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE prod integer; r record; atributo_id integer; firma text;
BEGIN
 IF p_atributos IS NULL OR jsonb_typeof(p_atributos)<>'object' THEN RAISE EXCEPTION 'Se requiere objeto de atributos'; END IF;
 SELECT id_producto INTO STRICT prod FROM producto_variante WHERE id_variante=p_variante;
 PERFORM 1 FROM producto WHERE id_producto=prod FOR UPDATE;
 DELETE FROM variante_atributo WHERE id_variante=p_variante;
 FOR r IN SELECT * FROM jsonb_each_text(p_atributos) LOOP
   IF r.value IS NULL OR length(trim(r.value))=0 THEN RAISE EXCEPTION 'Atributo sin valor'; END IF;
   SELECT id_atributo INTO STRICT atributo_id FROM atributo_variante WHERE nombre=r.key;
   INSERT INTO variante_atributo VALUES(p_variante,atributo_id,trim(r.value));
 END LOOP;
 SELECT string_agg(id_atributo||':'||lower(valor),'|' ORDER BY id_atributo) INTO firma
 FROM variante_atributo WHERE id_variante=p_variante;
 IF EXISTS(SELECT 1 FROM producto_variante v WHERE v.id_producto=prod AND v.id_variante<>p_variante
   AND coalesce(firma,'')=coalesce((SELECT string_agg(a.id_atributo||':'||lower(a.valor),'|' ORDER BY a.id_atributo)
      FROM variante_atributo a WHERE a.id_variante=v.id_variante),'')) THEN
   RAISE EXCEPTION 'Ya existe esa combinacion de atributos en el producto';
 END IF;
END $$;
CREATE FUNCTION fn_verificar_resena() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.fecha_creacion<(SELECT fecha_registro FROM cliente WHERE id_cliente=NEW.id_cliente) THEN
   RAISE EXCEPTION 'Resena anterior al registro';
 END IF;
 NEW.compra_verificada:=EXISTS(SELECT 1 FROM pedido p JOIN detalle_pedido d USING(id_pedido)
 JOIN producto_variante v USING(id_variante) WHERE p.id_cliente=NEW.id_cliente
 AND v.id_producto=NEW.id_producto AND p.fecha_confirmacion<=NEW.fecha_creacion);
 RETURN NEW;
END $$;
CREATE TRIGGER trg_resena_verificada BEFORE INSERT OR UPDATE ON resena_producto
FOR EACH ROW EXECUTE FUNCTION fn_verificar_resena();

-- 8. COTIZACION: domicilio o retiro; productos/descuento/envio separados.
CREATE FUNCTION fn_cotizar_envio(p_carrito bigint,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; ch seguimiento_carrito%ROWTYPE; regla condiciones_envio%ROWTYPE;
    tarifa tarifa_envio%ROWTYPE; promo cupon%ROWTYPE;
    gratis boolean; costo numeric(12,2); descuento numeric(12,2);
    rebaja numeric(12,2):=0; cupon text; modalidad text; distrito_id integer;
BEGIN
 SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 SELECT * INTO STRICT ch FROM seguimiento_carrito WHERE id_carrito=p_carrito;
 IF ch.fecha_inicio_checkout IS NULL THEN RETURN; END IF;
 IF c.estado NOT IN ('ACTIVO','ABANDONADO','VACIADO') THEN RAISE EXCEPTION 'No recotizar carrito en pago/convertido'; END IF;
 SELECT * INTO STRICT regla FROM condiciones_envio WHERE id_condicion=c.id_condicion;
 IF c.id_cupon IS NOT NULL THEN
   SELECT * INTO promo FROM cupon WHERE id_cupon=c.id_cupon AND activa
     AND p_fecha BETWEEN fecha_inicio AND fecha_fin AND c.subtotal>=subtotal_minimo;
   IF FOUND THEN
     rebaja:=least(c.subtotal,CASE WHEN promo.tipo='PORCENTAJE' THEN round(c.subtotal*promo.valor/100,2) ELSE promo.valor END);
     cupon:=promo.codigo;
   ELSE UPDATE carrito SET id_cupon=NULL WHERE id_carrito=p_carrito; END IF;
 END IF;
 SELECT codigo INTO STRICT modalidad FROM metodo_envio WHERE id_metodo_envio=ch.id_metodo_envio AND activo;
 gratis:=(regla.tipo='GRATIS_TOTAL' OR (regla.tipo='GRATIS_DESDE_MINIMO' AND c.subtotal>=regla.compra_minima_gratis));
 IF modalidad='RETIRO_SUCURSAL' THEN
   IF ch.id_sucursal_retiro IS NULL THEN RAISE EXCEPTION 'Seleccionar sucursal de retiro'; END IF;
   SELECT id_distrito INTO STRICT distrito_id FROM sucursal WHERE id_sucursal=ch.id_sucursal_retiro;
   UPDATE seguimiento_carrito SET subtotal_mostrado=c.subtotal,descuento_productos_mostrado=rebaja,codigo_cupon_mostrado=cupon,
     aplica_envio_gratis=false,id_tarifa_envio=NULL,tarifa_base_mostrada=0,descuento_envio_mostrado=0,
     costo_envio_mostrado=0,total_mostrado=c.subtotal-rebaja,fecha_actualizacion_resumen=p_fecha,id_distrito_cotizado=distrito_id,
     direccion_mostrada=(SELECT direccion_texto FROM sucursal WHERE id_sucursal=ch.id_sucursal_retiro)
     WHERE id_carrito=p_carrito;
   RETURN; -- no requiere direccion domiciliaria ni equivale a beneficio de envio gratis
 END IF;
 IF ch.id_direccion IS NULL THEN
   UPDATE seguimiento_carrito SET subtotal_mostrado=c.subtotal,descuento_productos_mostrado=rebaja,codigo_cupon_mostrado=cupon,
     aplica_envio_gratis=gratis,
     id_tarifa_envio=NULL,tarifa_base_mostrada=NULL,descuento_envio_mostrado=NULL,costo_envio_mostrado=NULL,
     total_mostrado=NULL,fecha_actualizacion_resumen=NULL,id_distrito_cotizado=NULL,direccion_mostrada=NULL
     WHERE id_carrito=p_carrito;
   RETURN;
 END IF;
 SELECT id_distrito INTO STRICT distrito_id FROM direccion WHERE id_direccion=ch.id_direccion AND id_cliente=c.id_cliente;
 SELECT t.* INTO STRICT tarifa FROM tarifa_envio t JOIN municipio m ON m.id_departamento=t.id_departamento
 JOIN distrito di USING(id_municipio) WHERE di.id_distrito=distrito_id AND t.activa ORDER BY t.id_tarifa_envio DESC LIMIT 1;
 descuento:=CASE WHEN gratis THEN tarifa.monto WHEN regla.tipo='DESCUENTO_ENVIO' THEN least(tarifa.monto,regla.descuento_envio) ELSE 0 END;
 costo:=tarifa.monto-descuento;
 UPDATE seguimiento_carrito SET subtotal_mostrado=c.subtotal,descuento_productos_mostrado=rebaja,codigo_cupon_mostrado=cupon,
   aplica_envio_gratis=gratis,id_tarifa_envio=tarifa.id_tarifa_envio,tarifa_base_mostrada=tarifa.monto,
   descuento_envio_mostrado=descuento,costo_envio_mostrado=costo,total_mostrado=c.subtotal-rebaja+costo,
   fecha_actualizacion_resumen=p_fecha,id_distrito_cotizado=distrito_id,
   direccion_mostrada=(SELECT direccion_texto FROM direccion WHERE id_direccion=ch.id_direccion)
   WHERE id_carrito=p_carrito;
END $$;
CREATE FUNCTION fn_aplicar_cupon(p_carrito bigint,p_codigo text,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; promo cupon%ROWTYPE;
BEGIN
 SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 IF c.estado<>'ACTIVO' OR p_fecha<c.ultima_actividad THEN RAISE EXCEPTION 'Carrito no editable o fecha anterior'; END IF;
 IF p_codigo IS NULL THEN UPDATE carrito SET id_cupon=NULL WHERE id_carrito=p_carrito;
 ELSE
   SELECT * INTO STRICT promo FROM cupon WHERE upper(codigo)=upper(trim(p_codigo)) AND activa
     AND p_fecha BETWEEN fecha_inicio AND fecha_fin AND c.subtotal>=subtotal_minimo;
   UPDATE carrito SET id_cupon=promo.id_cupon WHERE id_carrito=p_carrito;
 END IF;
 UPDATE carrito SET ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
 PERFORM fn_cotizar_envio(p_carrito,p_fecha);
END $$;
CREATE UNIQUE INDEX uq_cupon_codigo ON cupon(upper(codigo));
CREATE FUNCTION fn_configurar_checkout(p_carrito bigint,p_metodo_pago text,p_metodo_envio text,
 p_sucursal integer DEFAULT NULL,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; mp integer; me integer;
BEGIN
 SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 IF c.estado<>'ACTIVO' OR c.etapa_proceso<>'CHECKOUT_INICIADO' OR p_fecha<c.ultima_actividad THEN
   RAISE EXCEPTION 'Checkout no editable'; END IF;
 SELECT id_metodo_pago INTO STRICT mp FROM metodo_pago WHERE codigo=p_metodo_pago AND activo;
 SELECT id_metodo_envio INTO STRICT me FROM metodo_envio WHERE codigo=p_metodo_envio AND activo;
 IF p_metodo_envio='RETIRO_SUCURSAL' AND NOT EXISTS(SELECT 1 FROM sucursal WHERE id_sucursal=p_sucursal) THEN
   RAISE EXCEPTION 'Elegir sucursal de retiro'; END IF;
 UPDATE seguimiento_carrito SET id_metodo_pago=mp,id_metodo_envio=me,
   id_sucursal_retiro=CASE WHEN p_metodo_envio='RETIRO_SUCURSAL' THEN p_sucursal END WHERE id_carrito=p_carrito;
 UPDATE carrito SET ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
 PERFORM fn_cotizar_envio(p_carrito,p_fecha);
END $$;
CREATE FUNCTION fn_datos_retiro(p_carrito bigint,p_nombre text,p_telefono text,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM carrito c JOIN seguimiento_carrito ch USING(id_carrito) JOIN metodo_envio me USING(id_metodo_envio)
   WHERE c.id_carrito=p_carrito AND c.estado='ACTIVO' AND c.etapa_proceso='CHECKOUT_INICIADO'
     AND c.ultima_actividad<=p_fecha AND me.codigo='RETIRO_SUCURSAL') THEN RAISE EXCEPTION 'No es seguimiento_carrito de retiro activo'; END IF;
 IF p_nombre IS NULL OR p_telefono IS NULL OR length(trim(p_nombre))=0 OR length(trim(p_telefono))=0 THEN
   RAISE EXCEPTION 'Destinatario requerido'; END IF;
 UPDATE seguimiento_carrito SET nombre_destinatario=p_nombre,telefono_destinatario=p_telefono WHERE id_carrito=p_carrito;
 UPDATE carrito SET ultima_actividad=p_fecha WHERE id_carrito=p_carrito;
 PERFORM fn_cotizar_envio(p_carrito,p_fecha);
END $$;

-- 9. PEDIDO: crear y descontar existencias, con cobro PAGADO o PENDIENTE.
-- Funcion interna del backend; el navegador no debe tener permisos SQL.
CREATE FUNCTION fn_crear_pedido_interno(p_carrito bigint,p_sucursal integer,p_fecha timestamp,p_pagado boolean)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; ch seguimiento_carrito%ROWTYPE; nuevo bigint; d record;
 v producto_variante%ROWTYPE; dept integer; descripcion text; sede integer; modalidad text;
BEGIN
 SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 IF c.estado<>'EN_PAGO' THEN RAISE EXCEPTION 'Primero reservar el stock'; END IF;
 SELECT * INTO STRICT ch FROM seguimiento_carrito WHERE id_carrito=p_carrito;
 IF p_fecha<c.ultima_actividad OR ch.total_mostrado IS NULL OR ch.nombre_destinatario IS NULL THEN
   RAISE EXCEPTION 'Checkout incompleto o fecha anterior'; END IF;
 SELECT codigo INTO STRICT modalidad FROM metodo_envio WHERE id_metodo_envio=ch.id_metodo_envio;
 sede:=CASE WHEN modalidad='RETIRO_SUCURSAL' THEN ch.id_sucursal_retiro ELSE p_sucursal END;
 -- Modelo de una sola bodega: sucursal de retiro no implica stock por sede.
 IF NOT EXISTS(SELECT 1 FROM sucursal WHERE id_sucursal=sede) THEN RAISE EXCEPTION 'Sucursal inexistente'; END IF;
 SELECT m.id_departamento INTO STRICT dept FROM distrito di JOIN municipio m USING(id_municipio)
   WHERE di.id_distrito=ch.id_distrito_cotizado;
 INSERT INTO pedido(id_carrito,id_cliente,fecha_confirmacion,subtotal,costo_envio,descuento_productos,codigo_cupon,
   id_metodo_pago,id_metodo_envio,estado_pago,nombre_destinatario,telefono_destinatario,direccion_entrega,
   id_departamento,id_distrito,id_sucursal_retiro)
 VALUES(p_carrito,c.id_cliente,p_fecha,ch.subtotal_mostrado,ch.costo_envio_mostrado,ch.descuento_productos_mostrado,
   ch.codigo_cupon_mostrado,ch.id_metodo_pago,ch.id_metodo_envio,CASE WHEN p_pagado THEN 'PAGADO' ELSE 'PENDIENTE' END,
   ch.nombre_destinatario,ch.telefono_destinatario,ch.direccion_mostrada,dept,ch.id_distrito_cotizado,ch.id_sucursal_retiro)
 RETURNING id_pedido INTO nuevo;
 FOR d IN SELECT * FROM detalle_carrito WHERE id_carrito=p_carrito ORDER BY id_variante LOOP
   SELECT * INTO STRICT v FROM producto_variante WHERE id_variante=d.id_variante FOR UPDATE;
   IF NOT EXISTS(SELECT 1 FROM reserva_inventario WHERE id_carrito=p_carrito AND id_variante=d.id_variante
     AND estado='ACTIVA' AND cantidad=d.cantidad) THEN RAISE EXCEPTION 'Reserva no valida'; END IF;
   SELECT p.nombre||coalesce(' - '||(SELECT string_agg(a.nombre||': '||va.valor,', ' ORDER BY a.nombre)
      FROM variante_atributo va JOIN atributo_variante a USING(id_atributo) WHERE va.id_variante=v.id_variante),'')
      INTO descripcion FROM producto p WHERE p.id_producto=v.id_producto;
   INSERT INTO detalle_pedido(id_pedido,id_variante,cantidad,precio_unitario,costo_unitario,descripcion_producto)
   VALUES(nuevo,d.id_variante,d.cantidad,d.precio_unitario,v.costo_promedio,descripcion);
   UPDATE producto_variante SET stock_actual=stock_actual-d.cantidad,stock_reservado=stock_reservado-d.cantidad WHERE id_variante=d.id_variante;
   INSERT INTO kardex_inventario(id_variante,id_sucursal,id_pedido,tipo_movimiento,cantidad_salida,costo_unitario,
     saldo_cantidad,saldo_costo_unitario,fecha_movimiento,motivo)
   VALUES(d.id_variante,p_sucursal,nuevo,'SALIDA',d.cantidad,v.costo_promedio,v.stock_actual-d.cantidad,
     v.costo_promedio,p_fecha,'Pedido confirmado');
 END LOOP;
 UPDATE reserva_inventario SET estado='CONSUMIDA' WHERE id_carrito=p_carrito;
 UPDATE carrito SET estado='CONVERTIDO',ultima_actividad=p_fecha,
   fecha_recuperacion=CASE WHEN fecha_abandono IS NOT NULL THEN p_fecha END WHERE id_carrito=p_carrito;
 INSERT INTO registro_evento(id_carrito,tipo,fecha,descripcion)
 VALUES(p_carrito,'COMPRA_CONFIRMADA',p_fecha,'Pedido confirmado; consultar estado_pago para cobro');
 INSERT INTO envio(id_pedido,id_metodo_envio,id_sucursal,fecha_preparacion)
 VALUES(nuevo,ch.id_metodo_envio,sede,p_fecha);
 PERFORM fn_emitir_factura(nuevo,p_sucursal,p_fecha);
 -- Atribucion operativa solo si abrio el enlace antes de comprar, no prueba causalidad.
 UPDATE notificacion_carrito SET id_pedido_recuperado=nuevo WHERE id_notificacion=(
   SELECT id_notificacion FROM notificacion_carrito WHERE id_carrito=p_carrito AND estado='ENVIADO'
     AND fecha_clic IS NOT NULL AND fecha_clic<=p_fecha AND fecha_expiracion>=p_fecha ORDER BY fecha_clic DESC LIMIT 1);
 RETURN nuevo;
END $$;
CREATE FUNCTION fn_confirmar_compra(p_carrito bigint,p_proveedor text,p_referencia text,
 p_monto numeric,p_sucursal integer,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE c carrito%ROWTYPE; ch seguimiento_carrito%ROWTYPE; cp confirmacion_pago%ROWTYPE; nuevo bigint; metodo text;
BEGIN
 IF p_proveedor IS NULL OR p_referencia IS NULL OR p_monto IS NULL OR
    length(trim(p_proveedor))=0 OR length(trim(p_referencia))=0 THEN RAISE EXCEPTION 'Confirmacion incompleta'; END IF;
 SELECT * INTO STRICT c FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 SELECT cp2.* INTO cp FROM confirmacion_pago cp2 JOIN pedido p USING(id_pedido) WHERE p.id_carrito=p_carrito;
 IF FOUND THEN
   IF cp.proveedor<>p_proveedor OR cp.referencia_externa<>p_referencia OR cp.monto<>p_monto THEN
     RAISE EXCEPTION 'Confirmacion repetida con datos diferentes'; END IF;
   RETURN cp.id_pedido;
 END IF;
 SELECT * INTO STRICT ch FROM seguimiento_carrito WHERE id_carrito=p_carrito;
 SELECT codigo INTO STRICT metodo FROM metodo_pago WHERE id_metodo_pago=ch.id_metodo_pago;
 IF metodo='CONTRA_ENTREGA' THEN RAISE EXCEPTION 'Usar confirmar contra entrega, sin inventar un cobro'; END IF;
 IF p_monto<>ch.total_mostrado THEN RAISE EXCEPTION 'Monto no coincide'; END IF;
 nuevo:=fn_crear_pedido_interno(p_carrito,p_sucursal,p_fecha,true);
 INSERT INTO confirmacion_pago VALUES(nuevo,p_proveedor,p_referencia,p_monto,p_fecha);
 RETURN nuevo;
END $$;
CREATE FUNCTION fn_confirmar_contra_entrega(p_carrito bigint,p_sucursal integer,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE existente bigint; codigo text;
BEGIN
 PERFORM 1 FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 SELECT p.id_pedido INTO existente FROM pedido p JOIN metodo_pago m USING(id_metodo_pago)
   WHERE p.id_carrito=p_carrito AND m.codigo='CONTRA_ENTREGA';
 IF FOUND THEN RETURN existente; END IF;
 SELECT m.codigo INTO STRICT codigo FROM seguimiento_carrito ch JOIN metodo_pago m USING(id_metodo_pago) WHERE ch.id_carrito=p_carrito;
 IF codigo<>'CONTRA_ENTREGA' THEN RAISE EXCEPTION 'Metodo no es contra entrega'; END IF;
 PERFORM fn_iniciar_pago(p_carrito,p_fecha);
 RETURN fn_crear_pedido_interno(p_carrito,p_sucursal,p_fecha,false);
END $$;
-- Cupon que cubre todo + envio cero: confirmar sin pasar un cobro inexistente.
CREATE FUNCTION fn_confirmar_sin_cobro(p_carrito bigint,p_sucursal integer,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE nuevo bigint;
BEGIN
 PERFORM 1 FROM carrito WHERE id_carrito=p_carrito FOR UPDATE;
 SELECT p.id_pedido INTO nuevo FROM pedido p JOIN confirmacion_pago cp USING(id_pedido)
 WHERE p.id_carrito=p_carrito AND cp.proveedor='SIN_COBRO' AND cp.monto=0;
 IF FOUND THEN RETURN nuevo; END IF;
 IF (SELECT total_mostrado FROM seguimiento_carrito WHERE id_carrito=p_carrito) IS DISTINCT FROM 0::numeric THEN
   RAISE EXCEPTION 'El total debe ser exactamente cero'; END IF;
 PERFORM fn_iniciar_pago(p_carrito,p_fecha);
 nuevo:=fn_crear_pedido_interno(p_carrito,p_sucursal,p_fecha,true);
 INSERT INTO confirmacion_pago VALUES(nuevo,'SIN_COBRO','GRATUITO-'||p_carrito,0,p_fecha);
 RETURN nuevo;
END $$;
CREATE FUNCTION fn_registrar_cobro(p_pedido bigint,p_proveedor text,p_referencia text,p_monto numeric,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
DECLARE p pedido%ROWTYPE; cp confirmacion_pago%ROWTYPE;
BEGIN
 SELECT * INTO STRICT p FROM pedido WHERE id_pedido=p_pedido FOR UPDATE;
 IF p_proveedor IS NULL OR p_referencia IS NULL OR p_monto IS NULL OR length(trim(p_referencia))=0 OR
    p_monto<>p.total OR p_fecha<p.fecha_confirmacion THEN RAISE EXCEPTION 'Cobro invalido'; END IF;
 SELECT * INTO cp FROM confirmacion_pago WHERE id_pedido=p_pedido;
 IF FOUND THEN
   IF cp.proveedor<>p_proveedor OR cp.referencia_externa<>p_referencia OR cp.monto<>p_monto THEN
     RAISE EXCEPTION 'Cobro repetido con otros datos'; END IF;
   RETURN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM metodo_pago WHERE id_metodo_pago=p.id_metodo_pago AND codigo='CONTRA_ENTREGA') THEN
   RAISE EXCEPTION 'Pedido pendiente no es contra entrega'; END IF;
 INSERT INTO confirmacion_pago VALUES(p_pedido,p_proveedor,p_referencia,p_monto,p_fecha);
 UPDATE pedido SET estado_pago='PAGADO' WHERE id_pedido=p_pedido;
END $$;

-- 10. COMPROBANTE PDF: datos historicos y numero atomico; el app renderiza PDF.
CREATE FUNCTION fn_emitir_factura(p_pedido bigint,p_sucursal integer,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE p pedido%ROWTYPE; f bigint; corr integer; numero bigint; cliente_datos jsonb;
BEGIN
 SELECT * INTO STRICT p FROM pedido WHERE id_pedido=p_pedido FOR UPDATE;
 SELECT id_factura INTO f FROM factura WHERE id_pedido=p_pedido;
 IF FOUND THEN RETURN f; END IF;
 IF p_fecha<p.fecha_confirmacion THEN RAISE EXCEPTION 'Factura anterior al pedido'; END IF;
 INSERT INTO correlativo_documento(anio,id_sucursal) VALUES(extract(year FROM p_fecha)::integer,p_sucursal)
 ON CONFLICT(tipo_comprobante,serie,anio,id_sucursal) DO NOTHING;
 UPDATE correlativo_documento SET ultimo_numero=ultimo_numero+1
 WHERE anio=extract(year FROM p_fecha)::integer AND id_sucursal=p_sucursal AND serie='DEMO'
 RETURNING id_correlativo,ultimo_numero INTO corr,numero;
 SELECT jsonb_build_object('nombre',c.nombre,'correo',c.correo,'tipo_persona',c.tipo_persona,
   'perfil',coalesce((SELECT to_jsonb(n) FROM cliente_natural n WHERE n.id_cliente=c.id_cliente),
                      (SELECT to_jsonb(j) FROM cliente_juridico j WHERE j.id_cliente=c.id_cliente),'{}'::jsonb),
   'contribuyente',coalesce((SELECT to_jsonb(cn) FROM contribuyente_natural cn WHERE cn.id_cliente=c.id_cliente),'{}'::jsonb))
 INTO cliente_datos FROM cliente c WHERE c.id_cliente=p.id_cliente;
 INSERT INTO factura(id_pedido,id_correlativo,numero_documento,fecha_emision,datos_cliente,subtotal,descuento_productos,costo_envio)
 VALUES(p_pedido,corr,numero,p_fecha,cliente_datos,p.subtotal,p.descuento_productos,p.costo_envio) RETURNING id_factura INTO f;
 INSERT INTO detalle_factura(id_factura,id_variante,descripcion_producto,cantidad,precio_unitario)
 SELECT f,id_variante,descripcion_producto,cantidad,precio_unitario FROM detalle_pedido WHERE id_pedido=p_pedido;
 RETURN f;
END $$;
CREATE FUNCTION fn_actualizar_envio(p_pedido bigint,p_estado text,p_guia text DEFAULT NULL,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
DECLARE e envio%ROWTYPE; modalidad text;
BEGIN
 SELECT * INTO STRICT e FROM envio WHERE id_pedido=p_pedido FOR UPDATE;
 IF p_fecha<coalesce(e.fecha_entrega,e.fecha_despacho,e.fecha_preparacion) THEN RAISE EXCEPTION 'Fecha anterior'; END IF;
 SELECT codigo INTO STRICT modalidad FROM metodo_envio WHERE id_metodo_envio=e.id_metodo_envio;
 IF e.estado=p_estado THEN RETURN; END IF;
 IF modalidad='DOMICILIO' AND NOT ((e.estado='PREPARANDO' AND p_estado='EN_TRANSITO') OR
   (e.estado='EN_TRANSITO' AND p_estado='ENTREGADO')) THEN RAISE EXCEPTION 'Transicion de domicilio no permitida'; END IF;
 IF modalidad='RETIRO_SUCURSAL' AND NOT ((e.estado='PREPARANDO' AND p_estado='LISTO_RETIRO') OR
   (e.estado='LISTO_RETIRO' AND p_estado='RETIRADO')) THEN RAISE EXCEPTION 'Transicion de retiro no permitida'; END IF;
 UPDATE envio SET estado=p_estado,numero_guia=coalesce(p_guia,numero_guia),
   fecha_despacho=CASE WHEN p_estado IN ('EN_TRANSITO','LISTO_RETIRO') THEN p_fecha ELSE fecha_despacho END,
   fecha_entrega=CASE WHEN p_estado IN ('ENTREGADO','RETIRADO') THEN p_fecha ELSE fecha_entrega END WHERE id_pedido=p_pedido;
END $$;

-- 11. RECORDATORIOS OPCIONALES: admin solicita, trabajador SMTP envia.
-- Solo PROTOTIPO + permiso + correo verificado. NUNCA historico simulado.
CREATE FUNCTION fn_encolar_recordatorios(p_ahora timestamp DEFAULT fn_ahora_tienda())
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE cantidad integer;
BEGIN
 INSERT INTO notificacion_carrito(id_carrito,fecha_abandono,correo_destino,fecha_creacion,fecha_expiracion)
 SELECT c.id_carrito,c.fecha_abandono,cli.correo,p_ahora,p_ahora+interval '7 days'
 FROM carrito c JOIN cliente cli USING(id_cliente)
 WHERE c.estado='ABANDONADO' AND c.origen_datos='PROTOTIPO' AND cli.origen_datos='PROTOTIPO'
   AND cli.activo AND cli.permite_recordatorios AND cli.correo_verificado
   AND c.fecha_abandono<=p_ahora AND cli.correo NOT ILIKE '%@demo.nizestore.test'
   AND NOT EXISTS(SELECT 1 FROM pedido p WHERE p.id_carrito=c.id_carrito)
 ON CONFLICT(id_carrito,fecha_abandono) DO NOTHING;
 GET DIAGNOSTICS cantidad=ROW_COUNT;
 RETURN cantidad;
END $$;
CREATE FUNCTION fn_marcar_recordatorio_enviado(p_notificacion bigint,p_referencia text,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF p_referencia IS NULL OR length(trim(p_referencia))=0 THEN RAISE EXCEPTION 'Referencia del servicio requerida'; END IF;
 UPDATE notificacion_carrito SET estado='ENVIADO',referencia_correo=p_referencia,fecha_envio=p_fecha
 WHERE id_notificacion=p_notificacion AND estado='PENDIENTE' AND fecha_creacion<=p_fecha AND fecha_expiracion>=p_fecha;
 IF NOT FOUND THEN RAISE EXCEPTION 'Recordatorio no pendiente o expirado'; END IF;
END $$;
CREATE FUNCTION fn_abrir_recordatorio(p_token uuid,p_cliente bigint,p_fecha timestamp DEFAULT fn_ahora_tienda())
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE n notificacion_carrito%ROWTYPE;
BEGIN
 SELECT n2.* INTO STRICT n FROM notificacion_carrito n2 JOIN carrito c USING(id_carrito)
 WHERE n2.token=p_token AND c.id_cliente=p_cliente AND n2.estado='ENVIADO'
 AND p_fecha BETWEEN n2.fecha_envio AND n2.fecha_expiracion FOR UPDATE OF n2;
 UPDATE notificacion_carrito SET fecha_clic=coalesce(fecha_clic,p_fecha) WHERE id_notificacion=n.id_notificacion;
 RETURN n.id_carrito; -- el backend autentica al dueño; token NO sustituye login
END $$;

-- PANEL ADMIN: opciones visibles, sin escribir SQL desde la interfaz.
-- Backend comprueba el rol administrador antes de llamar estas funciones.
CREATE FUNCTION fn_crear_condicion_envio(p_nombre text,p_tipo text,
    p_compra_minima numeric DEFAULT NULL,p_descuento numeric DEFAULT 0)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE resultado integer;
BEGIN
 IF p_nombre IS NULL OR length(trim(p_nombre))=0 THEN RAISE EXCEPTION 'Escribir nombre de la regla'; END IF;
 INSERT INTO condiciones_envio(nombre,tipo,compra_minima_gratis,descuento_envio)
 VALUES(trim(p_nombre),p_tipo,p_compra_minima,p_descuento) RETURNING id_condicion INTO resultado;
 RETURN resultado;
END $$;
CREATE FUNCTION fn_seleccionar_condicion_envio(p_condicion integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM condiciones_envio WHERE id_condicion=p_condicion AND activa FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La regla no existe o esta desactivada'; END IF;
 UPDATE ajustes_tienda SET id_condicion=p_condicion WHERE id_configuracion=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Falta configuracion inicial de la tienda'; END IF;
END $$;
CREATE FUNCTION fn_actualizar_tarifa_envio(p_departamento integer,p_nombre text,p_monto numeric)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE resultado integer;
BEGIN
 -- Serializa cambios simultaneos del panel en el mismo departamento.
 PERFORM 1 FROM departamento WHERE id_departamento=p_departamento FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Departamento inexistente'; END IF;
 IF p_nombre IS NULL OR length(trim(p_nombre))=0 OR p_monto IS NULL OR p_monto<0 THEN
   RAISE EXCEPTION 'Nombre y tarifa no negativa obligatorios'; END IF;
 UPDATE tarifa_envio SET activa=false WHERE id_departamento=p_departamento AND activa;
 INSERT INTO tarifa_envio(id_departamento,nombre,monto) VALUES(p_departamento,trim(p_nombre),p_monto)
 RETURNING id_tarifa_envio INTO resultado;
 RETURN resultado;
END $$;

CREATE FUNCTION fn_historial_reactivado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.estado='ABANDONADO' AND NEW.estado IN ('ACTIVO','CONVERTIDO','VACIADO') THEN
  UPDATE historial_abandono SET fecha_reactivacion=NEW.ultima_actividad
   WHERE id_carrito=NEW.id_carrito AND fecha_reactivacion IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_historial_reactivado AFTER UPDATE OF estado ON carrito
FOR EACH ROW EXECUTE FUNCTION fn_historial_reactivado();

COMMIT;
