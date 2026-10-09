-- NizeStore V2: catalogos fijos + datos HISTORICOS SIMULADOS de prueba.
-- Ejecutar una sola vez despues de NiceStoreDB_V2.sql. No borra ni duplica datos.
-- Periodo: 2024-10-01 a 2026-09-30, 100 carritos/mes = 2,400.
-- Resultado final: 30% abandono historico y 55% julio-septiembre 2026.
-- Patrones deliberados: rango $25-$34.99 mas afectado; seguimiento_carrito frecuente;
-- existen tambien abandonos anteriores al seguimiento_carrito y carritos gratuitos
-- abandonados. Ninguna fila afirma conocer la intencion del comprador.
-- El flujo usa las mismas funciones operativas que debe invocar el backend.
-- Solo fechas y decisiones de clientes son ficticias; no se desactivan triggers.
-- No hay poblacion de sesiones/dispositivos/origen/error de pago.
-- Los originales V1 y su CSV se conservan como antecedentes, no fuente V2.
-- Cuentas de laboratorio: admin@demo.nizestore.test / NizeDemo2026!
-- Clientes: ClienteDemo2026! (bcrypt, sin almacenar clave en columna).
-- Estas cuentas son exclusivamente de pruebas; no desplegar esas claves.

BEGIN;
SET LOCAL TIME ZONE 'America/El_Salvador';
SET LOCAL search_path = public, pg_temp;
SELECT setseed(0.351025);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pais) OR EXISTS(SELECT 1 FROM carrito) THEN
    RAISE EXCEPTION 'La V2 no esta vacia. No ejecutar dos veces la poblacion';
  END IF;
END $$;

-- A. CATALOGOS INTERNOS: todos los departamentos para dropdown y tarifa.
INSERT INTO pais(nombre,codigo_iso) VALUES('El Salvador','SLV');
INSERT INTO departamento(id_pais,nombre)
SELECT id_pais,d.nombre FROM pais CROSS JOIN (VALUES
 ('Ahuachapán'),('Santa Ana'),('Sonsonate'),('Chalatenango'),('La Libertad'),
 ('San Salvador'),('Cuscatlán'),('La Paz'),('Cabañas'),('San Vicente'),
 ('Usulután'),('San Miguel'),('Morazán'),('La Unión')) AS d(nombre);
-- Catalogo territorial: Decreto 762, Asamblea Legislativa.
-- Fuente: https://www.asamblea.gob.sv/sites/default/files/documents/decretos/4194112C-1F6E-4E24-808E-9854A3D081AD.pdf
INSERT INTO municipio(id_departamento,nombre)
SELECT d.id_departamento,g.municipio FROM (VALUES
 ('Ahuachapán','Ahuachapán Norte'),
 ('Ahuachapán','Ahuachapán Centro'),
 ('Ahuachapán','Ahuachapán Sur'),
 ('San Salvador','San Salvador Norte'),
 ('San Salvador','San Salvador Oeste'),
 ('San Salvador','San Salvador Este'),
 ('San Salvador','San Salvador Centro'),
 ('San Salvador','San Salvador Sur'),
 ('La Libertad','La Libertad Norte'),
 ('La Libertad','La Libertad Centro'),
 ('La Libertad','La Libertad Oeste'),
 ('La Libertad','La Libertad Este'),
 ('La Libertad','La Libertad Costa'),
 ('La Libertad','La Libertad Sur'),
 ('Chalatenango','Chalatenango Norte'),
 ('Chalatenango','Chalatenango Centro'),
 ('Chalatenango','Chalatenango Sur'),
 ('Cuscatlán','Cuscatlán Norte'),
 ('Cuscatlán','Cuscatlán Sur'),
 ('Cabañas','Cabañas Este'),
 ('Cabañas','Cabañas Oeste'),
 ('La Paz','La Paz Oeste'),
 ('La Paz','La Paz Centro'),
 ('La Paz','La Paz Este'),
 ('La Unión','La Unión Norte'),
 ('La Unión','La Unión Sur'),
 ('Usulután','Usulután Norte'),
 ('Usulután','Usulután Este'),
 ('Usulután','Usulután Oeste'),
 ('Sonsonate','Sonsonate Norte'),
 ('Sonsonate','Sonsonate Centro'),
 ('Sonsonate','Sonsonate Este'),
 ('Sonsonate','Sonsonate Oeste'),
 ('Santa Ana','Santa Ana Norte'),
 ('Santa Ana','Santa Ana Centro'),
 ('Santa Ana','Santa Ana Este'),
 ('Santa Ana','Santa Ana Oeste'),
 ('San Vicente','San Vicente Norte'),
 ('San Vicente','San Vicente Sur'),
 ('San Miguel','San Miguel Norte'),
 ('San Miguel','San Miguel Centro'),
 ('San Miguel','San Miguel Oeste'),
 ('Morazán','Morazán Norte'),
 ('Morazán','Morazán Sur')) g(departamento,municipio)
JOIN departamento d ON d.nombre=g.departamento;
INSERT INTO distrito(id_municipio,nombre)
SELECT m.id_municipio,g.distrito FROM (VALUES
 ('Ahuachapán','Ahuachapán Norte','Atiquizaya'),
 ('Ahuachapán','Ahuachapán Norte','El Refugio'),
 ('Ahuachapán','Ahuachapán Norte','San Lorenzo'),
 ('Ahuachapán','Ahuachapán Norte','Turín'),
 ('Ahuachapán','Ahuachapán Centro','Ahuachapán'),
 ('Ahuachapán','Ahuachapán Centro','Apaneca'),
 ('Ahuachapán','Ahuachapán Centro','Concepción de Ataco'),
 ('Ahuachapán','Ahuachapán Centro','Tacuba'),
 ('Ahuachapán','Ahuachapán Sur','Guaymango'),
 ('Ahuachapán','Ahuachapán Sur','Jujutla'),
 ('Ahuachapán','Ahuachapán Sur','San Francisco Menéndez'),
 ('Ahuachapán','Ahuachapán Sur','San Pedro Puxtla'),
 ('San Salvador','San Salvador Norte','Aguilares'),
 ('San Salvador','San Salvador Norte','El Paisnal'),
 ('San Salvador','San Salvador Norte','Guazapa'),
 ('San Salvador','San Salvador Oeste','Apopa'),
 ('San Salvador','San Salvador Oeste','Nejapa'),
 ('San Salvador','San Salvador Este','Ilopango'),
 ('San Salvador','San Salvador Este','San Martín'),
 ('San Salvador','San Salvador Este','Soyapango'),
 ('San Salvador','San Salvador Este','Tonacatepeque'),
 ('San Salvador','San Salvador Centro','Ayutuxtepeque'),
 ('San Salvador','San Salvador Centro','Mejicanos'),
 ('San Salvador','San Salvador Centro','San Salvador'),
 ('San Salvador','San Salvador Centro','Cuscatancingo'),
 ('San Salvador','San Salvador Centro','Ciudad Delgado'),
 ('San Salvador','San Salvador Sur','Panchimalco'),
 ('San Salvador','San Salvador Sur','Rosario de Mora'),
 ('San Salvador','San Salvador Sur','San Marcos'),
 ('San Salvador','San Salvador Sur','Santo Tomás'),
 ('San Salvador','San Salvador Sur','Santiago Texacuangos'),
 ('La Libertad','La Libertad Norte','Quezaltepeque'),
 ('La Libertad','La Libertad Norte','San Matías'),
 ('La Libertad','La Libertad Norte','San Pablo Tacachico'),
 ('La Libertad','La Libertad Centro','San Juan Opico'),
 ('La Libertad','La Libertad Centro','Ciudad Arce'),
 ('La Libertad','La Libertad Oeste','Colón'),
 ('La Libertad','La Libertad Oeste','Jayaque'),
 ('La Libertad','La Libertad Oeste','Sacacoyo'),
 ('La Libertad','La Libertad Oeste','Tepecoyo'),
 ('La Libertad','La Libertad Oeste','Talnique'),
 ('La Libertad','La Libertad Este','Antiguo Cuscatlán'),
 ('La Libertad','La Libertad Este','Huizúcar'),
 ('La Libertad','La Libertad Este','Nuevo Cuscatlán'),
 ('La Libertad','La Libertad Este','San José Villanueva'),
 ('La Libertad','La Libertad Este','Zaragoza'),
 ('La Libertad','La Libertad Costa','Chiltiupán'),
 ('La Libertad','La Libertad Costa','Jicalapa'),
 ('La Libertad','La Libertad Costa','La Libertad'),
 ('La Libertad','La Libertad Costa','Tamanique'),
 ('La Libertad','La Libertad Costa','Teotepeque'),
 ('La Libertad','La Libertad Sur','Comasagua'),
 ('La Libertad','La Libertad Sur','Santa Tecla'),
 ('Chalatenango','Chalatenango Norte','La Palma'),
 ('Chalatenango','Chalatenango Norte','Citalá'),
 ('Chalatenango','Chalatenango Norte','San Ignacio'),
 ('Chalatenango','Chalatenango Centro','Nueva Concepción'),
 ('Chalatenango','Chalatenango Centro','Tejutla'),
 ('Chalatenango','Chalatenango Centro','La Reina'),
 ('Chalatenango','Chalatenango Centro','Agua Caliente'),
 ('Chalatenango','Chalatenango Centro','Dulce Nombre de María'),
 ('Chalatenango','Chalatenango Centro','El Paraíso'),
 ('Chalatenango','Chalatenango Centro','San Fernando'),
 ('Chalatenango','Chalatenango Centro','San Francisco Morazán'),
 ('Chalatenango','Chalatenango Centro','San Rafael'),
 ('Chalatenango','Chalatenango Centro','Santa Rita'),
 ('Chalatenango','Chalatenango Sur','Chalatenango'),
 ('Chalatenango','Chalatenango Sur','Arcatao'),
 ('Chalatenango','Chalatenango Sur','Azacualpa'),
 ('Chalatenango','Chalatenango Sur','Comalapa'),
 ('Chalatenango','Chalatenango Sur','Concepción Quezaltepeque'),
 ('Chalatenango','Chalatenango Sur','El Carrizal'),
 ('Chalatenango','Chalatenango Sur','La Laguna'),
 ('Chalatenango','Chalatenango Sur','Las Vueltas'),
 ('Chalatenango','Chalatenango Sur','Nombre de Jesús'),
 ('Chalatenango','Chalatenango Sur','Nueva Trinidad'),
 ('Chalatenango','Chalatenango Sur','Ojos de Agua'),
 ('Chalatenango','Chalatenango Sur','Potonico'),
 ('Chalatenango','Chalatenango Sur','San Antonio de La Cruz'),
 ('Chalatenango','Chalatenango Sur','San Antonio Los Ranchos'),
 ('Chalatenango','Chalatenango Sur','San Francisco Lempa'),
 ('Chalatenango','Chalatenango Sur','San Isidro Labrador'),
 ('Chalatenango','Chalatenango Sur','San José Cancasque'),
 ('Chalatenango','Chalatenango Sur','San Miguel de Mercedes'),
 ('Chalatenango','Chalatenango Sur','San José Las Flores'),
 ('Chalatenango','Chalatenango Sur','San Luis del Carmen'),
 ('Cuscatlán','Cuscatlán Norte','Suchitoto'),
 ('Cuscatlán','Cuscatlán Norte','San José Guayabal'),
 ('Cuscatlán','Cuscatlán Norte','Oratorio de Concepción'),
 ('Cuscatlán','Cuscatlán Norte','San Bartolomé Perulapía'),
 ('Cuscatlán','Cuscatlán Norte','San Pedro Perulapán'),
 ('Cuscatlán','Cuscatlán Sur','Cojutepeque'),
 ('Cuscatlán','Cuscatlán Sur','San Rafael Cedros'),
 ('Cuscatlán','Cuscatlán Sur','Candelaria'),
 ('Cuscatlán','Cuscatlán Sur','Monte San Juan'),
 ('Cuscatlán','Cuscatlán Sur','El Carmen'),
 ('Cuscatlán','Cuscatlán Sur','San Cristobal'),
 ('Cuscatlán','Cuscatlán Sur','Santa Cruz Michapa'),
 ('Cuscatlán','Cuscatlán Sur','San Ramón'),
 ('Cuscatlán','Cuscatlán Sur','El Rosario'),
 ('Cuscatlán','Cuscatlán Sur','Santa Cruz Analquito'),
 ('Cuscatlán','Cuscatlán Sur','Tenancingo'),
 ('Cabañas','Cabañas Este','Sensuntepeque'),
 ('Cabañas','Cabañas Este','Victoria'),
 ('Cabañas','Cabañas Este','Dolores'),
 ('Cabañas','Cabañas Este','Guacotecti'),
 ('Cabañas','Cabañas Este','San Isidro'),
 ('Cabañas','Cabañas Oeste','Ilobasco'),
 ('Cabañas','Cabañas Oeste','Tejutepeque'),
 ('Cabañas','Cabañas Oeste','Jutiapa'),
 ('Cabañas','Cabañas Oeste','Cinquera'),
 ('La Paz','La Paz Oeste','Cuyultitan'),
 ('La Paz','La Paz Oeste','Olocuilta'),
 ('La Paz','La Paz Oeste','San Juan Talpa'),
 ('La Paz','La Paz Oeste','San Luis Talpa'),
 ('La Paz','La Paz Oeste','San Pedro Masahuat'),
 ('La Paz','La Paz Oeste','Tapalhuaca'),
 ('La Paz','La Paz Oeste','San Francisco Chinameca'),
 ('La Paz','La Paz Centro','El Rosario'),
 ('La Paz','La Paz Centro','Jerusalén'),
 ('La Paz','La Paz Centro','Mercedes La Ceiba'),
 ('La Paz','La Paz Centro','Paraíso de Osorio'),
 ('La Paz','La Paz Centro','San Antonio Masahuat'),
 ('La Paz','La Paz Centro','San Emigdio'),
 ('La Paz','La Paz Centro','San Juan Tepezontes'),
 ('La Paz','La Paz Centro','San Luís La Herradura'),
 ('La Paz','La Paz Centro','San Miguel Tepezontes'),
 ('La Paz','La Paz Centro','San Pedro Nonualco'),
 ('La Paz','La Paz Centro','Santa María Ostuma'),
 ('La Paz','La Paz Centro','Santiago Nonualco'),
 ('La Paz','La Paz Este','San Juan Nonualco'),
 ('La Paz','La Paz Este','San Rafael Obrajuelo'),
 ('La Paz','La Paz Este','Zacatecoluca'),
 ('La Unión','La Unión Norte','Anamorós'),
 ('La Unión','La Unión Norte','Bolivar'),
 ('La Unión','La Unión Norte','Concepción de Oriente'),
 ('La Unión','La Unión Norte','El Sauce'),
 ('La Unión','La Unión Norte','Lislique'),
 ('La Unión','La Unión Norte','Nueva Esparta'),
 ('La Unión','La Unión Norte','Pasaquina'),
 ('La Unión','La Unión Norte','Polorós'),
 ('La Unión','La Unión Norte','San José La Fuente'),
 ('La Unión','La Unión Norte','Santa Rosa de Lima'),
 ('La Unión','La Unión Sur','Conchagua'),
 ('La Unión','La Unión Sur','El Carmen'),
 ('La Unión','La Unión Sur','Intipucá'),
 ('La Unión','La Unión Sur','La Unión'),
 ('La Unión','La Unión Sur','Meanguera del Golfo'),
 ('La Unión','La Unión Sur','San Alejo'),
 ('La Unión','La Unión Sur','Yayantique'),
 ('La Unión','La Unión Sur','Yucuaiquín'),
 ('Usulután','Usulután Norte','Santiago de María'),
 ('Usulután','Usulután Norte','Alegría'),
 ('Usulután','Usulután Norte','Berlín'),
 ('Usulután','Usulután Norte','Mercedes Umaña'),
 ('Usulután','Usulután Norte','Jucuapa'),
 ('Usulután','Usulután Norte','El triunfo'),
 ('Usulután','Usulután Norte','Estanzuelas'),
 ('Usulután','Usulután Norte','San Buenaventura'),
 ('Usulután','Usulután Norte','Nueva Granada'),
 ('Usulután','Usulután Este','Usulután'),
 ('Usulután','Usulután Este','Jucuarán'),
 ('Usulután','Usulután Este','San Dionisio'),
 ('Usulután','Usulután Este','Concepción Batres'),
 ('Usulután','Usulután Este','Santa María'),
 ('Usulután','Usulután Este','Ozatlán'),
 ('Usulután','Usulután Este','Tecapán'),
 ('Usulután','Usulután Este','Santa Elena'),
 ('Usulután','Usulután Este','California'),
 ('Usulután','Usulután Este','Ereguayquín'),
 ('Usulután','Usulután Oeste','Jiquilisco'),
 ('Usulután','Usulután Oeste','Puerto El Triunfo'),
 ('Usulután','Usulután Oeste','San Agustín'),
 ('Usulután','Usulután Oeste','San Francisco Javier'),
 ('Sonsonate','Sonsonate Norte','Juayua'),
 ('Sonsonate','Sonsonate Norte','Nahuizalco'),
 ('Sonsonate','Sonsonate Norte','Salcoatitán'),
 ('Sonsonate','Sonsonate Norte','Santa Catarina Masahuat'),
 ('Sonsonate','Sonsonate Centro','Sonsonate'),
 ('Sonsonate','Sonsonate Centro','Sonzacate'),
 ('Sonsonate','Sonsonate Centro','Nahulingo'),
 ('Sonsonate','Sonsonate Centro','San Antonio del Monte'),
 ('Sonsonate','Sonsonate Centro','Santo Domingo de Guzmán'),
 ('Sonsonate','Sonsonate Este','Izalco'),
 ('Sonsonate','Sonsonate Este','Armenia'),
 ('Sonsonate','Sonsonate Este','Caluco'),
 ('Sonsonate','Sonsonate Este','San Julián'),
 ('Sonsonate','Sonsonate Este','Cuisnahuat'),
 ('Sonsonate','Sonsonate Este','Santa Isabel Ishuatán'),
 ('Sonsonate','Sonsonate Oeste','Acajutla'),
 ('Santa Ana','Santa Ana Norte','Masahuat'),
 ('Santa Ana','Santa Ana Norte','Metapán'),
 ('Santa Ana','Santa Ana Norte','Santa Rosa Guachipilín'),
 ('Santa Ana','Santa Ana Norte','Texistepeque'),
 ('Santa Ana','Santa Ana Centro','Santa Ana'),
 ('Santa Ana','Santa Ana Este','Coatepeque'),
 ('Santa Ana','Santa Ana Este','El Congo'),
 ('Santa Ana','Santa Ana Oeste','Candelaria de la Frontera'),
 ('Santa Ana','Santa Ana Oeste','Chalchuapa'),
 ('Santa Ana','Santa Ana Oeste','El Porvenir'),
 ('Santa Ana','Santa Ana Oeste','San Antonio Pajonal'),
 ('Santa Ana','Santa Ana Oeste','San Sebastián Salitrillo'),
 ('Santa Ana','Santa Ana Oeste','Santiago de La Frontera'),
 ('San Vicente','San Vicente Norte','Apastepeque'),
 ('San Vicente','San Vicente Norte','Santa Clara'),
 ('San Vicente','San Vicente Norte','San Ildefonso'),
 ('San Vicente','San Vicente Norte','San Esteban Catarina'),
 ('San Vicente','San Vicente Norte','San Sebastián'),
 ('San Vicente','San Vicente Norte','San Lorenzo'),
 ('San Vicente','San Vicente Norte','Santo Domingo'),
 ('San Vicente','San Vicente Sur','San Vicente'),
 ('San Vicente','San Vicente Sur','Guadalupe'),
 ('San Vicente','San Vicente Sur','Verapaz'),
 ('San Vicente','San Vicente Sur','Tepetitán'),
 ('San Vicente','San Vicente Sur','Tecoluca'),
 ('San Vicente','San Vicente Sur','San Cayetano Istepeque'),
 ('San Miguel','San Miguel Norte','Ciudad Barrios'),
 ('San Miguel','San Miguel Norte','Sesori'),
 ('San Miguel','San Miguel Norte','Nuevo Edén de San Juan'),
 ('San Miguel','San Miguel Norte','San Gerardo'),
 ('San Miguel','San Miguel Norte','San Luis de La Reina'),
 ('San Miguel','San Miguel Norte','Carolina'),
 ('San Miguel','San Miguel Norte','San Antonio del Mosco'),
 ('San Miguel','San Miguel Norte','Chapeltique'),
 ('San Miguel','San Miguel Centro','San Miguel'),
 ('San Miguel','San Miguel Centro','Comacarán'),
 ('San Miguel','San Miguel Centro','Uluazapa'),
 ('San Miguel','San Miguel Centro','Moncagua'),
 ('San Miguel','San Miguel Centro','Quelepa'),
 ('San Miguel','San Miguel Centro','Chirilagua'),
 ('San Miguel','San Miguel Oeste','Chinameca'),
 ('San Miguel','San Miguel Oeste','Nueva Guadalupe'),
 ('San Miguel','San Miguel Oeste','Lolotique'),
 ('San Miguel','San Miguel Oeste','San Jorge'),
 ('San Miguel','San Miguel Oeste','San Rafael Oriente'),
 ('San Miguel','San Miguel Oeste','El Tránsito'),
 ('Morazán','Morazán Norte','Arambala'),
 ('Morazán','Morazán Norte','Cacaopera'),
 ('Morazán','Morazán Norte','Corinto'),
 ('Morazán','Morazán Norte','El Rosario'),
 ('Morazán','Morazán Norte','Joateca'),
 ('Morazán','Morazán Norte','Jocoaitique'),
 ('Morazán','Morazán Norte','Meanguera'),
 ('Morazán','Morazán Norte','Perquín'),
 ('Morazán','Morazán Norte','San Fernando'),
 ('Morazán','Morazán Norte','San Isidro'),
 ('Morazán','Morazán Norte','Torola'),
 ('Morazán','Morazán Sur','Chilanga'),
 ('Morazán','Morazán Sur','Delicias de Concepción'),
 ('Morazán','Morazán Sur','El Divisadero'),
 ('Morazán','Morazán Sur','Gualococti'),
 ('Morazán','Morazán Sur','Guatajiagua'),
 ('Morazán','Morazán Sur','Jocoro'),
 ('Morazán','Morazán Sur','Lolotiquillo'),
 ('Morazán','Morazán Sur','Osicala'),
 ('Morazán','Morazán Sur','San Carlos'),
 ('Morazán','Morazán Sur','San Francisco Gotera'),
 ('Morazán','Morazán Sur','San Simón'),
 ('Morazán','Morazán Sur','Sensembra'),
 ('Morazán','Morazán Sur','Sociedad'),
 ('Morazán','Morazán Sur','Yamabal'),
 ('Morazán','Morazán Sur','Yoloaiquín')) g(departamento,municipio,distrito)
JOIN departamento d ON d.nombre=g.departamento
JOIN municipio m ON m.id_departamento=d.id_departamento AND m.nombre=g.municipio;

-- TARIFAS DE EJEMPLO, no precios oficiales de una empresa de transporte.
INSERT INTO tarifa_envio(id_departamento,nombre,monto)
SELECT id_departamento,'Entrega estandar - '||nombre,
 CASE WHEN nombre IN ('San Salvador','La Libertad') THEN 3
      WHEN nombre IN ('La Unión','Morazán','San Miguel','Usulután') THEN 5 ELSE 4 END
FROM departamento;
INSERT INTO condiciones_envio(nombre,tipo,compra_minima_gratis,descuento_envio)
VALUES
 ('Estandar: gratis desde $35','GRATIS_DESDE_MINIMO',35,0),
 ('Prueba: gratis desde $25','GRATIS_DESDE_MINIMO',25,0),
 ('Sin beneficio de envio','NORMAL',NULL,0),
 ('Envio gratuito para todos','GRATIS_TOTAL',NULL,0),
 ('Descuento de $2 en envio','DESCUENTO_ENVIO',NULL,2);
INSERT INTO ajustes_tienda(id_configuracion,id_condicion)
SELECT 1,id_condicion FROM condiciones_envio WHERE nombre='Estandar: gratis desde $35';
INSERT INTO sucursal(nombre,id_distrito,direccion_texto)
SELECT 'Bodega central NizeStore',di.id_distrito,'Direccion de laboratorio, San Salvador'
FROM distrito di JOIN municipio m USING(id_municipio) JOIN departamento d USING(id_departamento)
WHERE di.nombre='San Salvador' AND d.nombre='San Salvador';
INSERT INTO metodo_pago(codigo,nombre) VALUES ('TARJETA','Tarjeta'),('TRANSFERENCIA','Transferencia bancaria'),('CONTRA_ENTREGA','Pago contra entrega');
INSERT INTO metodo_envio(codigo,nombre) VALUES ('DOMICILIO','Entrega a domicilio'),('RETIRO_SUCURSAL','Retiro en sucursal');
INSERT INTO tipo_documento(nombre,aplica_a) VALUES ('DUI','NATURAL'),('NIT','AMBOS'),('Pasaporte','NATURAL'),('Carnet de residente','NATURAL');
INSERT INTO atributo_variante(nombre) VALUES ('Talla'),('Color'),('Altura'),('Edicion');
INSERT INTO proveedor(nombre,origen) VALUES ('Proveedor de laboratorio nacional','NACIONAL'),('Proveedor de laboratorio importacion','INTERNACIONAL');
INSERT INTO franquicia(nombre) VALUES ('One Piece'),('Naruto'),('Black Clover'),('Harry Potter'),('Marvel'),('DC');
INSERT INTO cupon(codigo,tipo,valor,subtotal_minimo,fecha_inicio,fecha_fin)
VALUES ('DEMO10','PORCENTAJE',10,10,'2026-10-01','2027-12-31'),('DEMO3','MONTO_FIJO',3,25,'2026-10-01','2027-12-31');
INSERT INTO administrador(nombre,correo,password_hash)
VALUES('Administrador demo','admin@demo.nizestore.test',crypt('NizeDemo2026!',gen_salt('bf',10)));
INSERT INTO categoria(nombre) VALUES('Accesorios'),('Manga'),('Ropa'),('Figuras');

-- B. CATALOGO VENDIBLE. Precio/costo/stock pertenecen a la variante.
CREATE TEMP TABLE demo_catalogo(nombre text,categoria text,precio numeric,costo numeric,sku text) ON COMMIT DROP;
INSERT INTO demo_catalogo VALUES
 ('Llavero anime','Accesorios',6,2.5,'AC-LLAVERO'),
 ('Taza ilustrada','Accesorios',12,5,'AC-TAZA'),
 ('Manga tomo inicial','Manga',18,8,'MA-TOMO'),
 ('Gorra ilustrada','Ropa',24,11,'RO-GORRA'),
 ('Camiseta anime','Ropa',25,12,'RO-CAMISETA'),
 ('Figura mini','Figuras',29,14,'FI-MINI'),
 ('Sudadera ligera','Ropa',34,17,'RO-SUDADERA'),
 ('Figura coleccionable','Figuras',35,18,'FI-COLECCION'),
 ('Manga edicion especial','Manga',42,21,'MA-ESPECIAL'),
 ('Figura premium','Figuras',55,28,'FI-PREMIUM');
INSERT INTO producto(id_categoria,nombre,descripcion)
SELECT cat.id_categoria,dc.nombre,'Producto de laboratorio con precio final al consumidor'
FROM demo_catalogo dc JOIN categoria cat ON cat.nombre=dc.categoria;
UPDATE producto SET id_proveedor=(SELECT id_proveedor FROM proveedor WHERE origen='NACIONAL'),
 id_franquicia=(SELECT id_franquicia FROM franquicia WHERE nombre='One Piece');
INSERT INTO producto_variante(id_producto,sku,precio)
SELECT p.id_producto,dc.sku,dc.precio FROM demo_catalogo dc JOIN producto p ON p.nombre=dc.nombre;
INSERT INTO producto_variante(id_producto,sku,precio)
SELECT id_producto,'RO-CAMISETA-L',25 FROM producto WHERE nombre='Camiseta anime';
INSERT INTO producto_variante(id_producto,sku,precio)
SELECT id_producto,'FI-MINI-15CM',32 FROM producto WHERE nombre='Figura mini';
SELECT fn_guardar_atributos_variante(id_variante,'{"Talla":"M","Color":"Negro"}') FROM producto_variante WHERE sku='RO-CAMISETA';
SELECT fn_guardar_atributos_variante(id_variante,'{"Talla":"L","Color":"Azul"}') FROM producto_variante WHERE sku='RO-CAMISETA-L';
SELECT fn_guardar_atributos_variante(id_variante,'{"Altura":"10 cm"}') FROM producto_variante WHERE sku='FI-MINI';
SELECT fn_guardar_atributos_variante(id_variante,'{"Altura":"15 cm"}') FROM producto_variante WHERE sku='FI-MINI-15CM';
INSERT INTO especificacion_producto(id_producto,atributo,valor)
SELECT id_producto,'Tomo','1' FROM producto WHERE nombre='Manga tomo inicial';
INSERT INTO especificacion_producto(id_producto,atributo,valor)
SELECT id_producto,'Material','PVC' FROM producto WHERE nombre LIKE 'Figura%';
DO $$ DECLARE r record; sede integer;
BEGIN
  SELECT id_sucursal INTO sede FROM sucursal WHERE nombre='Bodega central NizeStore';
  FOR r IN SELECT v.id_variante,dc.costo FROM producto_variante v JOIN producto p USING(id_producto)
    JOIN demo_catalogo dc ON dc.nombre=p.nombre LOOP
    PERFORM fn_entrada_inventario(r.id_variante,sede,5000,r.costo,
      timestamp '2024-09-01 08:00','Stock inicial de pruebas');
  END LOOP;
END $$;

-- C. PLAN TEMPORAL: no se crea una tabla permanente de resultados fabricados.
-- Ordenar por riesgo permite fijar 30/55 casos mensuales, sin suponer motivos.
CREATE TEMP TABLE demo_plan ON COMMIT DROP AS
WITH base AS (
 SELECT m, n,
   timestamp '2024-10-01 09:00' + m*interval '1 month'
      + ((n-1)/4)*interval '1 day' + ((n-1)%4)*interval '2 hours' AS fecha,
   CASE WHEN n<=40 THEN 'BAJO' WHEN n<=75 THEN 'MEDIO' ELSE 'ALTO' END AS rango,
   random()<0.60 AS crear_cliente,
   random() AS azar,
   random() AS salida
 FROM generate_series(0,23) m CROSS JOIN generate_series(1,100) n
), puntuacion AS (
 SELECT *, azar + CASE rango WHEN 'MEDIO' THEN CASE WHEN m>=21 THEN 0.45 ELSE 0.25 END
          WHEN 'ALTO' THEN -0.10 ELSE 0 END
          + CASE WHEN crear_cliente THEN 0.10 ELSE 0 END AS riesgo FROM base
)
SELECT *, row_number() OVER(PARTITION BY m ORDER BY riesgo DESC,n)
    <= CASE WHEN m>=21 THEN 55 ELSE 30 END AS abandonado
FROM puntuacion;

DO $$
DECLARE r record; cli bigint; dir bigint; cart bigint; variante integer;
    sede integer; dept integer; paso text; cliente_hash text; fecha timestamp;
    cantidad integer; v_sku text; subtotal numeric; pedido_id bigint; total numeric;
BEGIN
  SELECT id_sucursal INTO sede FROM sucursal WHERE nombre='Bodega central NizeStore';
  cliente_hash:=crypt('ClienteDemo2026!',gen_salt('bf',10));
  FOR r IN SELECT * FROM demo_plan ORDER BY fecha,n LOOP
    PERFORM fn_detectar_abandonos(r.fecha);
    cli:=NULL;
    IF NOT r.crear_cliente THEN
      SELECT c.id_cliente INTO cli FROM cliente c WHERE EXISTS
        (SELECT 1 FROM pedido p WHERE p.id_cliente=c.id_cliente AND p.fecha_confirmacion<r.fecha)
        AND NOT EXISTS(SELECT 1 FROM carrito ca WHERE ca.id_cliente=c.id_cliente AND ca.estado IN ('ACTIVO','EN_PAGO'))
        ORDER BY random() LIMIT 1;
    END IF;
    IF cli IS NULL THEN
      INSERT INTO cliente(nombre,correo,password_hash,telefono,fecha_registro,origen_datos,tipo_persona)
      VALUES('Cliente de prueba '||(r.m*100+r.n),
        'cliente'||(r.m*100+r.n)||'@demo.nizestore.test',cliente_hash,
        '70000000',r.fecha-interval '2 days','HISTORICO_SIMULADO',
        CASE WHEN r.n%50=0 THEN 'JURIDICA' ELSE 'NATURAL' END) RETURNING id_cliente INTO cli;
      IF r.n%50=0 THEN
        INSERT INTO cliente_juridico(id_cliente,razon_social,nit,nrc,giro,nombre_contacto)
        VALUES(cli,'Empresa de laboratorio '||cli,'NIT-SIM-J-'||cli,'NRC-SIM-J-'||cli,
          'Comercio de laboratorio','Contacto ficticio');
      ELSE
        INSERT INTO cliente_natural(id_cliente,nombres,apellidos)
        VALUES(cli,'Cliente de prueba '||(r.m*100+r.n),'Laboratorio');
        IF r.n%20=0 THEN
          INSERT INTO contribuyente_natural(id_cliente,nrc,nit,giro)
          VALUES(cli,'NRC-SIM-N-'||cli,'NIT-SIM-N-'||cli,'Actividad de laboratorio');
        END IF;
      END IF;
      SELECT id_distrito INTO dept FROM distrito ORDER BY random() LIMIT 1;
      INSERT INTO direccion(id_cliente,id_distrito,direccion_texto,referencia)
      VALUES(cli,dept,'Calle de laboratorio, casa '||(r.m*100+r.n),'Datos ficticios de prueba')
      RETURNING id_direccion INTO dir;
    ELSE
      SELECT id_direccion INTO dir FROM direccion WHERE id_cliente=cli ORDER BY id_direccion LIMIT 1;
    END IF;
    cart:=fn_crear_carrito(cli,r.fecha);
    cantidad:=1;
    -- Algunos carritos tienen dos productos; la vista sigue teniendo una fila.
    v_sku:=CASE r.rango
      WHEN 'BAJO' THEN CASE WHEN r.n%3=0 THEN 'MA-TOMO' ELSE 'AC-TAZA' END
      WHEN 'MEDIO' THEN CASE WHEN r.n%3=0 THEN 'RO-SUDADERA' WHEN r.n%3=1 THEN 'RO-CAMISETA' ELSE 'FI-MINI' END
      ELSE CASE WHEN r.n%3=0 THEN 'FI-PREMIUM' WHEN r.n%3=1 THEN 'FI-COLECCION' ELSE 'MA-ESPECIAL' END END;
    SELECT id_variante INTO variante FROM producto_variante WHERE producto_variante.sku=v_sku;
    PERFORM fn_agregar_producto(cart,variante,cantidad,r.fecha);
    IF r.n%5=0 AND r.rango='BAJO' THEN
      SELECT id_variante INTO variante FROM producto_variante WHERE producto_variante.sku='AC-LLAVERO';
      PERFORM fn_agregar_producto(cart,variante,1,r.fecha+interval '1 minute');
    END IF;
    paso:=CASE WHEN NOT r.abandonado THEN 'CHECKOUT_INICIADO'
      WHEN r.salida<0.12 THEN 'PRODUCTOS_AGREGADOS'
      WHEN r.salida<0.30 THEN 'CARRITO_REVISADO' ELSE 'CHECKOUT_INICIADO' END;
    IF paso<>'PRODUCTOS_AGREGADOS' THEN
      PERFORM fn_avanzar_carrito(cart,'CARRITO_REVISADO',r.fecha+interval '3 minutes');
    END IF;
    IF paso='CHECKOUT_INICIADO' THEN
      PERFORM fn_avanzar_carrito(cart,'CHECKOUT_INICIADO',r.fecha+interval '5 minutes');
      -- Unos abandonados salen sin completar direccion: tarifa exacta NULL valida.
      IF NOT r.abandonado OR r.salida<0.88 THEN
        PERFORM fn_guardar_checkout(cart,dir,'Cliente de prueba','70000000',r.fecha+interval '7 minutes');
      END IF;
    END IF;
    IF NOT r.abandonado THEN
      -- Metodos reales del catalogo: contra entrega no inventa un cobro previo.
      PERFORM fn_configurar_checkout(cart,
        CASE WHEN r.n%9=0 THEN 'CONTRA_ENTREGA' WHEN r.n%7=0 THEN 'TRANSFERENCIA' ELSE 'TARJETA' END,
        CASE WHEN r.n%10=0 THEN 'RETIRO_SUCURSAL' ELSE 'DOMICILIO' END,
        CASE WHEN r.n%10=0 THEN sede END,r.fecha+interval '8 minutes');
      PERFORM fn_iniciar_pago(cart,r.fecha+interval '9 minutes');
      SELECT total_mostrado INTO total FROM seguimiento_carrito WHERE id_carrito=cart;
      IF r.n%9=0 THEN
        pedido_id:=fn_confirmar_contra_entrega(cart,sede,r.fecha+interval '10 minutes');
        PERFORM fn_registrar_cobro(pedido_id,'SIMULADOR_CONTRA_ENTREGA','SIM-COBRO-'||cart,
          total,r.fecha+interval '2 days');
      ELSE
        pedido_id:=fn_confirmar_compra(cart,'SIMULADOR', 'SIM-V2-'||cart,
          total,sede,r.fecha+interval '10 minutes');
      END IF;
      PERFORM fn_actualizar_envio(pedido_id,
        CASE WHEN r.n%10=0 THEN 'LISTO_RETIRO' ELSE 'EN_TRANSITO' END,
        CASE WHEN r.n%10<>0 THEN 'GUIA-SIM-'||cart END,r.fecha+interval '1 day');
      PERFORM fn_actualizar_envio(pedido_id,
        CASE WHEN r.n%10=0 THEN 'RETIRADO' ELSE 'ENTREGADO' END,
        NULL,r.fecha+interval '2 days');
    END IF;
  END LOOP;
  PERFORM fn_detectar_abandonos(timestamp '2026-10-03 00:00');
END $$;

-- D. CONTROLES: una falla revierte toda la poblacion.
DO $$ BEGIN
  IF (SELECT count(*) FROM carrito)<>2400 OR
     (SELECT count(*) FROM carrito WHERE estado='ABANDONADO')<>795 OR
     (SELECT count(*) FROM pedido)<>1605 THEN
    RAISE EXCEPTION 'No coinciden los resultados de referencia 2400 / 795 / 1605';
  END IF;
  IF EXISTS(SELECT 1 FROM carrito c WHERE c.subtotal <>
      (SELECT sum(subtotal_linea) FROM detalle_carrito WHERE id_carrito=c.id_carrito)) THEN
    RAISE EXCEPTION 'Subtotal de carrito no conciliado';
  END IF;
  IF EXISTS(SELECT 1 FROM pedido p WHERE p.subtotal <>
      (SELECT sum(subtotal_linea) FROM detalle_pedido WHERE id_pedido=p.id_pedido)) THEN
    RAISE EXCEPTION 'Subtotal de pedido no conciliado';
  END IF;
  IF EXISTS(SELECT 1 FROM producto_variante WHERE stock_reservado<>0) THEN
    RAISE EXCEPTION 'La poblacion historica no debe dejar pagos pendientes';
  END IF;
END $$;
-- Perfil personal ficticio, sin inventar DUI/NIT reales.
-- Resenas verificadas: solo clientes con compra anterior del producto.
INSERT INTO resena_producto(id_producto,id_cliente,calificacion,comentario,fecha_creacion)
SELECT pv.id_producto,p.id_cliente,4,'Resena de laboratorio',min(p.fecha_confirmacion)+interval '1 day'
FROM pedido p JOIN detalle_pedido dp USING(id_pedido) JOIN producto_variante pv USING(id_variante)
GROUP BY pv.id_producto,p.id_cliente ORDER BY min(p.fecha_confirmacion) LIMIT 20;
COMMIT;

SELECT CASE WHEN fecha_creacion<timestamp '2026-07-01' THEN 'Historico' ELSE 'Ultimo trimestre' END AS periodo,
 count(*) AS carritos,count(*) FILTER(WHERE estado='ABANDONADO') AS abandonados,
 round(100.0*count(*) FILTER(WHERE estado='ABANDONADO')/count(*),2) AS tasa_abandono
FROM carrito GROUP BY 1 ORDER BY 1;
