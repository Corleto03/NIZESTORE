-- NizeStore V2: 1 FILA = 1 CARRITO. 10 tablas, SELECT + LEFT JOIN.
-- No agrupa productos, intentos de pago ni logs. No altera datos ni calcula DAX.
-- Fechas NULL = paso no alcanzado; envio NULL = no se pudo cotizar todavia.
-- Pedido NULL = no hay pedido confirmado. Contra entrega puede estar sin cobrar.
-- Segmento se fijo al crear carrito, no segun compras posteriores.
-- subtotal_carrito = productos, nunca incluye envio. Cotizacion = lo mostrado.
-- condiciones/tarifas conservan sus valores historicos, no precios actuales.
-- Estado EN_PAGO no demuestra fallo. Etapa no demuestra motivo psicologico.
-- cantidad de abandonos en etapa / todos los abandonos es una distribucion;
-- para tasa por etapa usar como denominador los carritos que llegaron a ella.
-- La condicion de elegibilidad usa >= umbral (incluye exactamente $35).

CREATE OR REPLACE VIEW vista_maestra_nizestore_v2 AS
SELECT
    -- 1. Carrito: fechas, estado, etapa y productos expresados en dinero
    c.id_carrito,
    c.origen_datos,
    c.fecha_creacion AS fecha_creacion_carrito,
    c.ultima_actividad,
    c.estado AS estado_carrito,
    c.etapa_proceso,
    c.fecha_abandono,
    c.etapa_abandono,
    c.fecha_recuperacion,
    c.segmento_cliente,
    c.subtotal AS subtotal_carrito,

    -- 2. Cliente: identificado porque el catalogo exige login para agregar
    cli.id_cliente,
    cli.fecha_registro AS fecha_registro_cliente,

    -- 3. Checkout: etapas reales y resumen dentro de la misma pantalla
    ch.fecha_vista_carrito,
    ch.fecha_inicio_checkout,
    ch.fecha_inicio_pago,
    ch.fecha_actualizacion_resumen,
    ch.subtotal_mostrado AS subtotal_checkout,
    ch.aplica_envio_gratis,
    ch.tarifa_base_mostrada AS tarifa_envio_base,
    ch.descuento_envio_mostrado AS descuento_envio,
    ch.costo_envio_mostrado AS costo_envio,
    ch.total_mostrado AS total_checkout,
    ch.descuento_productos_mostrado AS descuento_productos_checkout,
    ch.codigo_cupon_mostrado AS cupon_checkout,
    me.nombre AS metodo_entrega,
    mp.nombre AS metodo_pago,

    -- 4. Condiciones: regla asignada al carrito y compra minima de esa regla
    ce.nombre AS condicion_envio,
    ce.tipo AS tipo_condicion_envio,
    ce.compra_minima_gratis AS umbral_envio_gratis,

    -- 5. Ubicacion cotizada: distrito -> municipio -> departamento
    dep.nombre AS departamento_envio,

    -- 6. Pedido: solo existe despues de la confirmacion de compra
    p.id_pedido,
    p.fecha_confirmacion AS fecha_compra,
    p.estado AS estado_pedido,
    p.estado_pago,
    p.subtotal AS subtotal_pedido,
    p.costo_envio AS envio_pedido,
    p.total AS total_pedido,
    p.descuento_productos AS descuento_productos_pedido

FROM carrito c
LEFT JOIN cliente cli ON cli.id_cliente = c.id_cliente
LEFT JOIN seguimiento_carrito ch ON ch.id_carrito = c.id_carrito
LEFT JOIN condiciones_envio ce ON ce.id_condicion = c.id_condicion
LEFT JOIN distrito di ON di.id_distrito = ch.id_distrito_cotizado
LEFT JOIN municipio mu ON mu.id_municipio = di.id_municipio
LEFT JOIN departamento dep ON dep.id_departamento = mu.id_departamento
LEFT JOIN pedido p ON p.id_carrito = c.id_carrito
LEFT JOIN metodo_envio me ON me.id_metodo_envio = ch.id_metodo_envio
LEFT JOIN metodo_pago mp ON mp.id_metodo_pago = ch.id_metodo_pago;

