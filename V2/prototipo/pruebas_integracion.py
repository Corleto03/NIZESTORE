"""Pruebas completas en una base temporal; no añade clientes de prueba a la tienda."""
import tempfile,sqlite3,uuid
from datetime import timedelta
from pathlib import Path
import app as web
from psycopg import sql

temporary_db='nizestore_prueba_'+uuid.uuid4().hex[:10]
original=web.CFG['DB_NAME']
smtp_original=web.CFG.pop('SMTP_HOST',None) # Ensayos sin enviar correos externos.
db=web.conn();db.autocommit=True
db.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(temporary_db)));db.close()
web.CFG['DB_NAME']=temporary_db
tmp=tempfile.TemporaryDirectory();web.RUNTIME=Path(tmp.name)
with web.localdb() as local:
 local.executescript('CREATE TABLE pagos(token TEXT PRIMARY KEY,cliente INTEGER,carrito INTEGER,monto TEXT,estado TEXT,creado TEXT,pedido INTEGER); CREATE TABLE correos(id INTEGER PRIMARY KEY,destino TEXT,asunto TEXT,cuerpo TEXT,creado TEXT); CREATE TABLE acceso(clave TEXT PRIMARY KEY,intentos INTEGER,desde REAL);')
checks=0
def check(value,message):
 global checks
 assert value,message
 checks+=1;print('OK',message,flush=True)
def boot(client):return client.get('/api/bootstrap').get_json()['csrf']
def post(client,path,data,expected=200):
 r=client.post(path,json=data,headers={'X-CSRF-Token':boot(client)})
 assert r.status_code==expected,(path,r.status_code,r.get_json())
 return r.get_json()
try:
 with web.conn() as con:
  con.autocommit=True
  for file in ['NiceStoreDB_V2.sql','Poblacion_NizeStore_V2.sql','Vista_Maestra_NizeStore_V2.sql']:
   con.execute((web.BASE.parent/'db'/file).read_text(encoding='utf-8-sig'));print('Preparado',file,flush=True)
 a=web.app.test_client();u=web.app.test_client();v=web.app.test_client()
 check(a.get('/api/catalogo').status_code==200,'Catálogo público conectado')
 check(a.get('/api/carrito').status_code==401,'Carrito exige autenticación')
 check(a.post('/api/login',json={}).status_code==403,'Protección CSRF')
 post(a,'/api/login',{'correo':'admin@demo.nizestore.test','password':'NizeDemo2026!','admin':True})
 check(a.get('/api/admin/resumen').status_code==200,'Escritorio administrador')
 post(u,'/api/contacto',{'nombre':'Ensayo','correo':'no-valido','mensaje':'Consulta'},400)
 check(True,'Contacto rechaza correo inválido')
 contact=post(u,'/api/contacto',{'nombre':'Ensayo','correo':'ensayo@example.test','tema':'PRODUCTO','mensaje':'Consulta de prueba aislada'})
 check(contact['modo']=='LOCAL' and contact['referencia'].startswith('LOCAL-'),'Contacto confirma recepción local')
 with web.localdb() as local:
  check(local.execute("SELECT count(*) FROM correos WHERE cuerpo LIKE '%Consulta de prueba aislada%'").fetchone()[0]==1,'Consulta queda en bandeja del administrador')
 for section in ['productos','tarifas','cupones','pedidos','carritos','kardex','clientes','correos']:
  check(a.get('/api/admin/'+section).status_code==200,'Lectura admin '+section)
 post(a,'/api/admin/productos',{'nombre':'Producto integración','id_categoria':1,'descripcion':'Ensayo aislado','activo':True,'variantes':[{'sku':'TEST-1','precio':30,'entrada':20,'costo':10,'atributos':{'Talla':'M','Color':'Rojo'}}],'especificaciones':{'Material':'Algodón'}})
 with web.conn() as con:
  variant=web.scalar(con,"SELECT id_variante FROM producto_variante WHERE sku='TEST-1'")
 catalog_rows=a.get('/api/catalogo').get_json()
 check(any(p['variante_unica']==variant and p['cantidad_variantes']==1 for p in catalog_rows),'Catálogo identifica presentación única para compra directa')
 for client,email in [(u,'primero@example.test'),(v,'segundo@example.test')]:
  post(client,'/api/registro',{'nombre':'Prueba','nombres':'Prueba','apellidos':'Cliente','correo':email,'password':'ClavePrueba!234','telefono':'70000000','permite_recordatorios':True})
 check(u.get('/api/admin/productos').status_code==403,'Cliente sin permiso de administrador')
 c=post(u,'/api/carrito',{'accion':'agregar','variante':variant,'cantidad':1});cid=c['carrito']['id_carrito']
 check(c['carrito']['subtotal']=='30.00','Precio del servidor y subtotal coherente')
 post(u,'/api/admin/carrito/'+str(cid)+'/demostrar-abandono',{},403)
 check(True,'Cliente no puede ejecutar demostración administrativa')
 with web.conn() as con:
  historical=web.scalar(con,"SELECT id_carrito FROM carrito WHERE origen_datos='HISTORICO_SIMULADO' LIMIT 1")
  previous=web.scalar(con,'SELECT ultima_actividad FROM carrito WHERE id_carrito=%s',(cid,))
  expected=web.scalar(con,'SELECT tiempo_inactividad_para_abandono FROM ajustes_tienda WHERE id_configuracion=1')
 post(a,'/api/admin/carrito/'+str(historical)+'/demostrar-abandono',{},400)
 check(True,'Reloj no permite elegir población histórica')
 demo=post(a,'/api/admin/carrito/'+str(cid)+'/demostrar-abandono',{})
 with web.conn() as con:
  saved=web.query(con,'SELECT * FROM carrito WHERE id_carrito=%s',(cid,),True)
  check(saved['ultima_actividad']==previous,'Simulación conserva actividad original')
  check(saved['fecha_abandono']==previous+expected,'Abandono cumple plazo configurado completo')
  check(web.scalar(con,'SELECT fecha_abandono<=fn_ahora_tienda() FROM carrito WHERE id_carrito=%s',(cid,)),'Fecha de abandono concuerda con reloj compartido')
  check(web.scalar(con,'SELECT count(*) FROM historial_abandono WHERE id_carrito=%s',(cid,))==1,'Detección normal registra un episodio')
  before=web.scalar(con,'SELECT fn_ahora_tienda()')
 check(web.now()>=before,'Backend y PostgreSQL comparten hora de negocio')
 post(a,'/api/admin/carrito/'+str(cid)+'/demostrar-abandono',{},409)
 check(True,'Repetición no duplica abandono')
 post(u,'/api/carrito',{'accion':'abrir'})
 with web.conn() as con:
  check(web.scalar(con,'SELECT h.fecha_reactivacion>=h.fecha_abandono FROM historial_abandono h WHERE id_carrito=%s',(cid,)),'Reactivación posterior al abandono con reloj adelantado')
  check(web.scalar(con,'SELECT count(*) FROM vista_maestra_nizestore_v2 WHERE id_carrito=%s',(cid,))==1,'Carrito simulado incluido en misma vista Power BI')
  con.execute('DELETE FROM historial_abandono WHERE id_carrito=%s',(cid,))
 # Dos abandonos en distintas etapas: fechas de ensayo solo en esta base aislada.
 with web.conn() as con:
  con.execute("UPDATE carrito SET fecha_creacion=fn_ahora_tienda()-interval '2 hours',ultima_actividad=fn_ahora_tienda()-interval '1 hour' WHERE id_carrito=%s",(cid,))
  check(web.scalar(con,"SELECT fn_detectar_abandonos(fn_ahora_tienda(),interval '30 minutes')")==1,'Primer episodio automático')
 post(u,'/api/carrito',{'accion':'checkout'})
 with web.conn() as con:
  con.execute("UPDATE carrito SET ultima_actividad=fn_ahora_tienda()-interval '20 minutes' WHERE id_carrito=%s",(cid,))
  check(web.scalar(con,"SELECT fn_detectar_abandonos(fn_ahora_tienda(),interval '10 minutes')")==1,'Segundo episodio automático')
  check(web.scalar(con,'SELECT count(*) FROM historial_abandono WHERE id_carrito=%s',(cid,))==2,'Historial conserva ambos abandonos')
 post(u,'/api/carrito',{'accion':'checkout'})
 post(u,'/api/direccion',{'id_distrito':1,'direccion_texto':'Dirección de ensayo'})
 address=u.get('/api/cuenta').get_json()['direcciones'][0]['id_direccion']
 q=post(u,'/api/checkout',{'metodo_envio':'DOMICILIO','metodo_pago':'TARJETA','direccion':address,'nombre_destinatario':'Prueba','telefono_destinatario':'70000000'})
 check(q['resumen']['costo_envio_mostrado'] is not None and not q['resumen']['aplica_envio_gratis'],'Domicilio bajo mínimo cobra envío')
 q=post(u,'/api/checkout',{'metodo_envio':'RETIRO_SUCURSAL','metodo_pago':'TARJETA','sucursal':1,'nombre_destinatario':'Prueba','telefono_destinatario':'70000000'})
 check(q['resumen']['costo_envio_mostrado']=='0.00' and not q['resumen']['aplica_envio_gratis'],'Retiro gratuito no confunde beneficio por umbral')
 pay=post(u,'/api/pago/iniciar',{});token=pay['pasarela'].split('/')[-1]
 check(u.get('/api/pago/'+token).status_code==200,'Proveedor local guarda operación')
 check(v.get('/api/pago/'+token).status_code==404,'Pago ajeno inaccesible')
 post(u,'/api/pago/'+token,{'accion':'cancelar'})
 with web.conn() as con:check(web.scalar(con,'SELECT stock_reservado FROM producto_variante WHERE id_variante=%s',(variant,))==0,'Retorno libera reserva')
 pay=post(u,'/api/pago/iniciar',{});token=pay['pasarela'].split('/')[-1]
 result=post(u,'/api/pago/'+token,{'accion':'confirmar'});pid=result['pedido']
 check(post(u,'/api/pago/'+token,{'accion':'confirmar'})['pedido']==pid,'Confirmación repetida no duplica pedido')
 with web.conn() as con:
  check(web.scalar(con,'SELECT stock_actual FROM producto_variante WHERE id_variante=%s',(variant,))==19,'Inventario descuenta una sola vez')
  check(web.scalar(con,'SELECT fecha_recuperacion IS NOT NULL FROM carrito WHERE id_carrito=%s',(cid,)),'Recuperación solo al comprar')
  check(web.scalar(con,'SELECT count(*) FROM vista_maestra_nizestore_v2 WHERE id_carrito=%s',(cid,))==1,'Vista mantiene una fila por carrito')
 check(u.get('/api/comprobante/'+str(pid)).data.startswith(b'%PDF'),'Comprobante PDF generado')
 check(v.get('/api/comprobante/'+str(pid)).status_code==404,'Comprobante ajeno inaccesible')
 post(u,'/api/resena/1',{'calificacion':5,'comentario':'Opinión de laboratorio'})
 verification=post(u,'/api/verificacion',{})
 check(u.get(verification['enlace_local'].split('5050')[-1]).status_code==302,'Verificación de correo por enlace')
 check(u.get('/api/cuenta').get_json()['correo_verificado'],'Correo verificado guardado')
 # Compra contra entrega y reclasificación del cliente después de una compra.
 c=post(u,'/api/carrito',{'accion':'agregar','variante':variant,'cantidad':2})
 check(c['carrito']['segmento_cliente']=='RECURRENTE','Nueva compra identifica cliente recurrente')
 post(u,'/api/carrito',{'accion':'checkout'})
 q=post(u,'/api/checkout',{'metodo_envio':'DOMICILIO','metodo_pago':'CONTRA_ENTREGA','direccion':address,'nombre_destinatario':'Prueba','telefono_destinatario':'70000000'})
 check(q['resumen']['aplica_envio_gratis'],'Compra superior al mínimo aplica envío gratis')
 pid2=post(u,'/api/pago/iniciar',{})['pedido']
 post(a,'/api/admin/pedido/'+str(pid2),{'cobrar':True,'referencia':'RECIBO-PRUEBA'})
 post(a,'/api/admin/pedido/'+str(pid2),{'estado':'EN_TRANSITO','guia':'GUIA-PRUEBA'})
 post(a,'/api/admin/pedido/'+str(pid2),{'estado':'ENTREGADO'})
 check(a.get('/api/admin/bi.csv').status_code==200,'CSV exportado desde vista actual')
 post(a,'/api/admin/tarifa',{'zona':'central','monto':4})
 post(a,'/api/admin/regla',{'nombre':'Gratis desde 25','tipo':'GRATIS_DESDE_MINIMO','compra_minima':25})
 post(a,'/api/admin/ajustes',{'nombre_tienda':'NizeStore','minutos':5})
 post(a,'/api/admin/cupones',{'codigo':'ENSAYO','tipo':'PORCENTAJE','valor':10,'subtotal_minimo':0,'fecha_inicio':'2024-01-01','fecha_fin':'2028-01-01'})
 post(a,'/api/admin/catalogos/franquicia',{'nombre':'Colección de ensayo'})
 # Vencimiento y recordatorio: tiempos de ensayo solo en esta base aislada.
 c=post(v,'/api/carrito',{'accion':'agregar','variante':variant,'cantidad':1});vid=c['carrito']['id_carrito']
 post(v,'/api/carrito',{'accion':'checkout'})
 post(v,'/api/checkout',{'metodo_envio':'RETIRO_SUCURSAL','metodo_pago':'TARJETA','sucursal':1,'nombre_destinatario':'Prueba','telefono_destinatario':'70000000'})
 pay=post(v,'/api/pago/iniciar',{});pending=pay['pasarela'].split('/')[-1]
 with web.localdb() as local:local.execute('UPDATE pagos SET creado=? WHERE token=?',((web.now()-timedelta(minutes=20)).isoformat(),pending))
 web.services_once()
 check(v.get('/api/pago/'+pending).get_json()['estado']=='EXPIRADO','Pago pendiente vence automáticamente')
 with web.conn() as con:
  check(web.scalar(con,'SELECT estado FROM carrito WHERE id_carrito=%s',(vid,))=='ACTIVO','Vencimiento retorna al checkout')
  check(web.scalar(con,'SELECT stock_reservado FROM producto_variante WHERE id_variante=%s',(variant,))==0,'Vencimiento libera inventario')
 verified=post(v,'/api/verificacion',{})
 v.get(verified['enlace_local'].split('5050')[-1])
 with web.conn() as con:
  con.execute("UPDATE carrito SET fecha_creacion=fn_ahora_tienda()-interval '2 hours',ultima_actividad=fn_ahora_tienda()-interval '1 hour' WHERE id_carrito=%s",(vid,))
  web.scalar(con,'SELECT fn_detectar_abandonos()')
 sent=post(a,'/api/admin/recordatorios',{})
 check(sent['enviados']==1,'Recordatorio solo para abandono autorizado')
 check(post(a,'/api/admin/recordatorios',{})['enviados']==0,'Repetir envío no duplica recordatorio')
 with web.conn() as con:recovery=str(web.scalar(con,'SELECT token FROM notificacion_carrito WHERE id_carrito=%s',(vid,)))
 post(v,'/api/recuperar/'+recovery,{})
 with web.conn() as con:
  check(web.scalar(con,'SELECT estado FROM carrito WHERE id_carrito=%s',(vid,))=='ACTIVO','Enlace retoma carrito del dueño')
  check(web.scalar(con,'SELECT fecha_recuperacion IS NULL FROM carrito WHERE id_carrito=%s',(vid,)),'Retomar no inventa venta recuperada')
 post(a,'/api/admin/productos',{'nombre':'Producto sencillo sin código manual','id_categoria':1,'activo':True,'variantes':[{'precio':15,'entrada':2,'costo':8,'atributos':{}}]})
 with web.conn() as con:
  check(web.scalar(con,"SELECT count(*) FROM producto_variante v JOIN producto p USING(id_producto) WHERE p.nombre='Producto sencillo sin código manual' AND v.sku LIKE 'NZ-%%'")==1,'Editor sencillo genera código único automáticamente')
  # La migración se puede repetir sin borrar datos ni avanzar el reloj.
  clock_before=web.scalar(con,'SELECT adelanto_reloj FROM ajustes_tienda WHERE id_configuracion=1')
  con.execute((web.BASE.parent/'db/Reloj_Prueba_Tienda.sql').read_text(encoding='utf-8'))
 with web.conn() as con:
  check(web.scalar(con,'SELECT adelanto_reloj FROM ajustes_tienda WHERE id_configuracion=1')==clock_before,'Migración conserva reloj y datos')
 print('RESULTADO:',checks,'comprobaciones correctas',flush=True)
finally:
 web.CFG['DB_NAME']=original
 if smtp_original: web.CFG['SMTP_HOST']=smtp_original
 with web.conn() as con:
  con.autocommit=True
  con.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(temporary_db)))
 tmp.cleanup()
