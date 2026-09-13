-- ====================================================================
-- Script: Vistas de Ventas para Base de Datos NOVADATA (PostgreSQL)
-- Generado a partir del análisis del backup: BackupNovaData.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- Opción 1 (Recomendada): Vista Resumen de Ventas por Factura
-- Consolida cada factura emitida con información de cliente, vendedor,
-- sucursal, canal, método de pago, cantidades y ganancia bruta.
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_ventas_resumen AS
SELECT 
    f.id_factura,
    f.numero_documento,
    f.fecha,
    f.fecha::date AS fecha_emision,
    COALESCE(
        TRIM(cn.primer_nombre || ' ' || cn.primer_apellido),
        cj.razon_social,
        'Consumidor Final'
    ) AS cliente,
    tc.nombre AS tipo_cliente,
    TRIM(e.primer_nombre || ' ' || e.primer_apellido) AS vendedor,
    s.nombre AS sucursal,
    c.nombre_canal AS canal_venta,
    fp.nombre AS forma_pago,
    COUNT(df.id_detalle) AS total_items,
    COALESCE(SUM(df.cantidad), 0) AS total_unidades,
    f.sub_total,
    f.descuento_total,
    f.iva,
    f.total AS total_venta,
    COALESCE(SUM(df.costo_unitario * df.cantidad), 0) AS costo_total,
    (f.sub_total - COALESCE(SUM(df.costo_unitario * df.cantidad), 0)) AS ganancia_bruta
FROM public.factura f
INNER JOIN public.cliente cl ON f.id_cliente = cl.id_cliente
INNER JOIN public.tipo_cliente tc ON cl.id_tipo_cliente = tc.id_tipo_cliente
LEFT JOIN public.cliente_natural cn ON cl.id_cliente = cn.id_cliente
LEFT JOIN public.cliente_juridico cj ON cl.id_cliente = cj.id_cliente
INNER JOIN public.empleado e ON f.id_empleado = e.id_empleado
INNER JOIN public.sucursal s ON f.id_sucursal = s.id_sucursal
INNER JOIN public.canal c ON f.id_canal = c.id_canal
INNER JOIN public.forma_pago fp ON f.id_forma_pago = fp.id_forma_pago
LEFT JOIN public.detalle_factura df ON f.id_factura = df.id_factura
WHERE f.estado = 'Emitida'
GROUP BY 
    f.id_factura,
    f.numero_documento,
    f.fecha,
    cn.primer_nombre,
    cn.primer_apellido,
    cj.razon_social,
    tc.nombre,
    e.primer_nombre,
    e.primer_apellido,
    s.nombre,
    c.nombre_canal,
    fp.nombre,
    f.sub_total,
    f.descuento_total,
    f.iva,
    f.total
ORDER BY f.fecha DESC;


-- --------------------------------------------------------------------
-- Opción 2 (Alternativa): Rendimiento de Ventas por Producto
-- Muestra los productos más vendidos, ingresos generados y rentabilidad.
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_ventas_por_producto AS
SELECT 
    p.id_producto,
    p.nombre_producto,
    cat.nombre_categoria AS categoria,
    COUNT(DISTINCT f.id_factura) AS total_transacciones,
    SUM(df.cantidad) AS unidades_vendidas,
    ROUND(AVG(df.precio_unitario), 2) AS precio_promedio,
    SUM(df.sub_total) AS total_ingresos,
    SUM(df.costo_unitario * df.cantidad) AS total_costo,
    (SUM(df.sub_total) - SUM(df.costo_unitario * df.cantidad)) AS ganancia_total
FROM public.detalle_factura df
INNER JOIN public.factura f ON df.id_factura = f.id_factura
INNER JOIN public.producto p ON df.id_producto = p.id_producto
INNER JOIN public.categoria cat ON p.id_categoria = cat.id_categoria
WHERE f.estado = 'Emitida'
GROUP BY p.id_producto, p.nombre_producto, cat.nombre_categoria
ORDER BY total_ingresos DESC;
