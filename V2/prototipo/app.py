"""Tienda/panel NizeStore. SQL solo en servidor; navegador nunca decide precios."""
from pathlib import Path
import sys, os, json, secrets, sqlite3, threading, time, io, csv, smtplib, logging
from functools import wraps
from contextlib import contextmanager
from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta
from email.message import EmailMessage
from zoneinfo import ZoneInfo
BASE=Path(__file__).resolve().parent
sys.path.insert(0,str(BASE/'vendor'))
from flask import Flask,request,session,jsonify,send_from_directory,send_file,abort,redirect
from flask.json.provider import DefaultJSONProvider
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from werkzeug.utils import secure_filename

RUNTIME=BASE/'runtime'; RUNTIME.mkdir(exist_ok=True)
CFG={}
for line in (BASE.parent/'db/.env').read_text(encoding='utf-8-sig').splitlines():
 if line.strip() and not line.lstrip().startswith('#') and '=' in line:
  k,v=line.split('=',1);CFG[k.strip()]=v.strip().strip('"').strip("'")
if (BASE/'config.local.json').exists(): CFG.update(json.loads((BASE/'config.local.json').read_text()))
keyfile=RUNTIME/'secret.key'
if not keyfile.exists(): keyfile.write_text(secrets.token_hex(32))
app=Flask(__name__,static_folder='static')
app.config.update(SECRET_KEY=keyfile.read_text(),MAX_CONTENT_LENGTH=6*1024*1024,
 SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Lax',PERMANENT_SESSION_LIFETIME=timedelta(hours=8))
class JsonProvider(DefaultJSONProvider):
 @staticmethod
 def default(o):
  if isinstance(o,Decimal): return str(o)
  if isinstance(o,datetime): return o.isoformat(timespec='seconds')
  if isinstance(o,timedelta): return int(o.total_seconds())
  return DefaultJSONProvider.default(o)
app.json=JsonProvider(app)
signer=URLSafeTimedSerializer(app.secret_key)
TZ=ZoneInfo('America/El_Salvador')
def now():
 with conn() as db:return scalar(db,'SELECT fn_ahora_tienda()')
def conn():
 return psycopg.connect(host=CFG['DB_HOST'],port=CFG.get('DB_PORT',5432),dbname=CFG['DB_NAME'],
  user=CFG['DB_USER'],password=CFG['DB_PASSWORD'],row_factory=dict_row,options='-c timezone=America/El_Salvador')
def query(db,sql,args=(),one=False):
 c=db.execute(sql,args)
 return c.fetchone() if one else c.fetchall()
def scalar(db,sql,args=()): return next(iter(query(db,sql,args,True).values()))
def number(v,minimum=0):
 try:
  n=Decimal(str(v))
  if not n.is_finite() or n<minimum: raise ValueError()
  return n.quantize(Decimal('.01'))
 except (InvalidOperation,ValueError,TypeError): abort(400,description='Monto inválido')
def integer(v,minimum=1):
 try:
  if isinstance(v,bool) or str(v)!=str(int(v)) or int(v)<minimum: raise ValueError()
  return int(v)
 except (ValueError,TypeError): abort(400,description='Número inválido')
def text(d,key,maxlen=200,required=True):
 s=str(d.get(key,'')).strip()
 if (required and not s) or len(s)>maxlen: abort(400,description=f'Revisa el campo {key}')
 return s
@contextmanager
def localdb():
 c=sqlite3.connect(RUNTIME/'servicios.sqlite',timeout=20);c.row_factory=sqlite3.Row
 try:
  with c: yield c
 finally: c.close()
with localdb() as l:
 l.executescript('''CREATE TABLE IF NOT EXISTS pagos(token TEXT PRIMARY KEY,cliente INTEGER,carrito INTEGER,monto TEXT,estado TEXT,creado TEXT,pedido INTEGER);
 CREATE TABLE IF NOT EXISTS correos(id INTEGER PRIMARY KEY,destino TEXT,asunto TEXT,cuerpo TEXT,creado TEXT);
 CREATE TABLE IF NOT EXISTS acceso(clave TEXT PRIMARY KEY,intentos INTEGER,desde REAL);''')
def require(role='cliente'):
 def wrap(f):
  @wraps(f)
  def inner(*a,**k):
   if session.get('role')!=role: abort(401 if not session.get('uid') else 403,description='Inicia sesión con la cuenta correspondiente')
   with conn() as db:
    table='administrador' if role=='admin' else 'cliente'; pk='id_administrador' if role=='admin' else 'id_cliente'
    if not query(db,f'SELECT 1 FROM {table} WHERE {pk}=%s AND activo',(session['uid'],),True):
     session.clear();abort(401)
   return f(*a,**k)
  return inner
 return wrap
@app.before_request
def protect():
 session.setdefault('csrf',secrets.token_urlsafe(24))
 if request.path.startswith('/api/') and request.method not in ('GET','HEAD','OPTIONS'):
  if not secrets.compare_digest(request.headers.get('X-CSRF-Token',''),session['csrf']): abort(403,description='Actualiza la página para continuar')
@app.after_request
def headers(r):
 r.headers['X-Content-Type-Options']='nosniff';r.headers['X-Frame-Options']='DENY'
 r.headers['Referrer-Policy']='same-origin'
 r.headers['Content-Security-Policy']="default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"
 if request.path.startswith('/api/'):r.headers['Cache-Control']='no-store'
 return r
@app.errorhandler(psycopg.Error)
def database_error(e):
 app.logger.warning('Operacion PostgreSQL rechazada: %s',e.sqlstate)
 msg=e.diag.message_primary if e.sqlstate=='P0001' else 'No se pudo guardar: revisa datos, disponibilidad y registros relacionados.'
 return jsonify(error=msg),400
@app.errorhandler(Exception)
def error(e):
 from werkzeug.exceptions import HTTPException
 if isinstance(e,HTTPException):return jsonify(error=e.description),e.code
 app.logger.exception('Error interno')
 return jsonify(error='No se pudo completar la operación. Revisa el registro del servidor.'),500

def catalogs(db):
 out={}
 for table in ['categoria','franquicia','proveedor','atributo_variante','pais','departamento','municipio','distrito','metodo_envio','metodo_pago','sucursal','condiciones_envio','tipo_documento']:
  out[table]=query(db,f'SELECT * FROM {table} ORDER BY 1')
 out['ajustes']=query(db,'SELECT a.*,c.nombre AS regla_nombre,c.tipo,c.compra_minima_gratis FROM ajustes_tienda a JOIN condiciones_envio c USING(id_condicion)',one=True)
 return out
@app.get('/api/bootstrap')
def bootstrap():
 with conn() as db:
  data=catalogs(db)
  data.update(hora_tienda=scalar(db,'SELECT fn_ahora_tienda()'),csrf=session['csrf'],user={'id':session.get('uid'),'nombre':session.get('nombre'),'role':session.get('role')},correo_real=bool(CFG.get('SMTP_HOST')))
  return jsonify(data)
@app.post('/api/contacto')
def contact():
 import re
 d=request.get_json();email=text(d,'correo',150).lower()
 if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):abort(400,description='Escribe un correo válido')
 name=text(d,'nombre',100);message=text(d,'mensaje',2000);topic=d.get('tema','OTRO')
 if topic not in ('PRODUCTO','PEDIDO','ENVIO','OTRO'):abort(400)
 key='contacto:'+request.remote_addr
 with localdb() as l:
  l.execute('BEGIN IMMEDIATE')
  prior=l.execute('SELECT * FROM acceso WHERE clave=?',(key,)).fetchone();moment=time.time()
  count=prior['intentos'] if prior and moment-prior['desde']<60 else 0
  if count>=10:abort(429,description='Espera un minuto antes de enviar otra consulta')
  since=prior['desde'] if count else moment
  l.execute('INSERT OR REPLACE INTO acceso VALUES(?,?,?)',(key,count+1,since))
 body=f'Nombre: {name}\nCorreo de respuesta: {email}\nTema: {topic}\n\n{message}'
 destination=CFG.get('CONTACT_EMAIL','equipo@nizestore.local')
 if CFG.get('SMTP_HOST') and CFG.get('CONTACT_EMAIL'):
  reference=mail(destination,'Consulta NizeStore · '+topic,body);mode='SMTP'
 else:
  with localdb() as l:
   row=l.execute('INSERT INTO correos(destino,asunto,cuerpo,creado) VALUES(?,?,?,?)',(destination,'Consulta NizeStore · '+topic,body,now().isoformat()))
   reference='LOCAL-'+str(row.lastrowid);mode='LOCAL'
 return jsonify(referencia=reference,modo=mode)
@app.get('/api/catalogo')
def catalog():
 args=[];where=['p.activo','cat.activa','v.activa']
 for param,col in [('categoria','p.id_categoria'),('franquicia','p.id_franquicia')]:
  if request.args.get(param):where.append(col+'=%s');args.append(integer(request.args[param]))
 if request.args.get('q'):
  where.append('(p.nombre ILIKE %s OR f.nombre ILIKE %s)');args.extend(['%'+request.args['q'][:100]+'%']*2)
 for param,op in [('min','>='),('max','<=')]:
  if request.args.get(param):where.append('v.precio'+op+'%s');args.append(number(request.args[param]))
 if request.args.get('stock')=='1':where.append('v.stock_actual-v.stock_reservado>0')
 order={'precio':'precio_min','precio_desc':'precio_min DESC','nombre':'p.nombre','recientes':'p.id_producto DESC'}.get(request.args.get('orden'),'p.id_producto DESC')
 with conn() as db:
  rows=query(db,'''SELECT p.*,cat.nombre AS categoria,f.nombre AS franquicia,min(v.precio) AS precio_min,
   sum(v.stock_actual-v.stock_reservado) AS disponibles,
   (SELECT count(*) FROM producto_variante u WHERE u.id_producto=p.id_producto AND u.activa) AS cantidad_variantes,
   (SELECT CASE WHEN count(*)=1 THEN min(u.id_variante) END FROM producto_variante u
    WHERE u.id_producto=p.id_producto AND u.activa) AS variante_unica
   FROM producto p JOIN categoria cat USING(id_categoria)
   LEFT JOIN franquicia f USING(id_franquicia) JOIN producto_variante v USING(id_producto)
   WHERE '''+' AND '.join(where)+' GROUP BY p.id_producto,cat.nombre,f.nombre ORDER BY '+order,args)
  return jsonify(rows)
def product_data(db,pid,admin=False):
 p=query(db,'SELECT * FROM producto WHERE id_producto=%s'+('' if admin else ' AND activo'),(pid,),True)
 if not p:abort(404,description='Producto no disponible')
 p['variantes']=query(db,'''SELECT v.*,coalesce((SELECT jsonb_object_agg(a.nombre,va.valor) FROM variante_atributo va
 JOIN atributo_variante a USING(id_atributo) WHERE va.id_variante=v.id_variante),'{}'::jsonb) AS atributos
 FROM producto_variante v WHERE id_producto=%s'''+('' if admin else ' AND activa')+' ORDER BY id_variante',(pid,))
 p['especificaciones']=query(db,'SELECT atributo,valor FROM especificacion_producto WHERE id_producto=%s',(pid,))
 p['resenas']=query(db,'''SELECT r.calificacion,r.comentario,r.fecha_creacion,r.compra_verificada,c.nombre
 FROM resena_producto r JOIN cliente c USING(id_cliente) WHERE id_producto=%s ORDER BY r.fecha_creacion DESC''',(pid,))
 return p
@app.get('/api/producto/<int:pid>')
def product(pid):
 with conn() as db:return jsonify(product_data(db,pid))

@app.post('/api/registro')
def register():
 d=request.get_json(); email=text(d,'correo',150).lower(); password=text(d,'password',150)
 if '@' not in email or len(password)<8:abort(400,description='Correo válido y contraseña de al menos 8 caracteres')
 role=d.get('tipo_persona','NATURAL')
 if role not in ('NATURAL','JURIDICA'):abort(400)
 with conn() as db:
  uid=scalar(db,'''INSERT INTO cliente(nombre,tipo_persona,correo,password_hash,telefono,permite_recordatorios)
   VALUES(%s,%s,%s,crypt(%s,gen_salt('bf',10)),%s,%s) RETURNING id_cliente''',
   (text(d,'nombre',100),role,email,password,text(d,'telefono',25,False) or None,bool(d.get('permite_recordatorios',False))))
  if role=='NATURAL':
   query(db,'INSERT INTO cliente_natural(id_cliente,nombres,apellidos) VALUES(%s,%s,%s) RETURNING id_cliente',
    (uid,text(d,'nombres',100),text(d,'apellidos',100)))
  else:
   query(db,'''INSERT INTO cliente_juridico(id_cliente,razon_social,nit,giro,nombre_contacto)
   VALUES(%s,%s,%s,%s,%s) RETURNING id_cliente''',(uid,text(d,'razon_social'),text(d,'nit',30),text(d,'giro',150),text(d,'nombre_contacto',100)))
 session.clear();session.update(uid=uid,role='cliente',nombre=d['nombre'],csrf=secrets.token_urlsafe(24));session.permanent=True
 return jsonify(ok=True)
@app.post('/api/login')
def login():
 d=request.get_json(); role='admin' if d.get('admin') else 'cliente';email=text(d,'correo',150).lower()
 key=role+'|'+email+'|'+request.remote_addr
 with localdb() as l:
  row=l.execute('SELECT * FROM acceso WHERE clave=?',(key,)).fetchone()
  if row and row['intentos']>=10 and time.time()-row['desde']<300:abort(429,description='Espera cinco minutos antes de intentar de nuevo')
 with conn() as db:
  fn='fn_autenticar_administrador' if role=='admin' else 'fn_autenticar_cliente'
  uid=scalar(db,f'SELECT {fn}(%s,%s)',(email,text(d,'password',150)))
  if uid:
   table='administrador' if role=='admin' else 'cliente'; pk='id_administrador' if role=='admin' else 'id_cliente'
   name=scalar(db,f'SELECT nombre FROM {table} WHERE {pk}=%s',(uid,))
 if not uid:
  with localdb() as l:l.execute('INSERT INTO acceso VALUES(?,1,?) ON CONFLICT(clave) DO UPDATE SET intentos=CASE WHEN ?-desde>300 THEN 1 ELSE intentos+1 END,desde=CASE WHEN ?-desde>300 THEN ? ELSE desde END',(key,time.time(),time.time(),time.time(),time.time()))
  abort(401,description='Correo o contraseña incorrectos')
 with localdb() as l:l.execute('DELETE FROM acceso WHERE clave=?',(key,))
 session.clear();session.update(uid=uid,role=role,nombre=name,csrf=secrets.token_urlsafe(24));session.permanent=True
 return jsonify(ok=True,role=role)
@app.post('/api/logout')
def logout():session.clear();return jsonify(ok=True)

def cart_id(db):
 return scalar(db,"SELECT id_carrito FROM carrito WHERE id_cliente=%s AND estado IN ('ACTIVO','EN_PAGO','ABANDONADO') ORDER BY CASE WHEN estado IN ('ACTIVO','EN_PAGO') THEN 0 ELSE 1 END,fecha_creacion DESC LIMIT 1",(session['uid'],)) if query(db,"SELECT 1 FROM carrito WHERE id_cliente=%s AND estado IN ('ACTIVO','EN_PAGO','ABANDONADO') LIMIT 1",(session['uid'],),True) else None
def owned_cart(db,cid):
 c=query(db,'SELECT * FROM carrito WHERE id_carrito=%s AND id_cliente=%s FOR UPDATE',(cid,session['uid']),True)
 if not c:abort(404,description='Carrito no encontrado')
 return c
def cart_data(db,cid):
 if not cid:return {'carrito':None,'lineas':[],'resumen':None}
 c=query(db,'SELECT * FROM carrito WHERE id_carrito=%s',(cid,),True)
 lines=query(db,'''SELECT d.*,p.nombre,p.url_imagen,v.stock_actual-v.stock_reservado AS disponibles,
 coalesce((SELECT string_agg(a.nombre||': '||va.valor,', ') FROM variante_atributo va JOIN atributo_variante a USING(id_atributo) WHERE va.id_variante=v.id_variante),'Estándar') AS opciones
 FROM detalle_carrito d JOIN producto_variante v USING(id_variante) JOIN producto p USING(id_producto) WHERE id_carrito=%s ORDER BY id_detalle''',(cid,))
 ch=query(db,'SELECT * FROM seguimiento_carrito WHERE id_carrito=%s',(cid,),True)
 return {'carrito':c,'lineas':lines,'resumen':ch}
@app.get('/api/carrito')
@require()
def cart_get():
 with conn() as db:return jsonify(cart_data(db,cart_id(db)))
@app.post('/api/carrito')
@require()
def cart_action():
 d=request.get_json();action=d.get('accion')
 with conn() as db:
  query(db,'SELECT id_cliente FROM cliente WHERE id_cliente=%s FOR UPDATE',(session['uid'],))
  cid=cart_id(db)
  if action=='agregar':
   if not cid:cid=scalar(db,'SELECT fn_crear_carrito(%s)',(session['uid'],))
   owned_cart(db,cid)
   query(db,'SELECT fn_agregar_producto(%s,%s,%s)',(cid,integer(d.get('variante')),integer(d.get('cantidad',1))))
  elif cid:
   owned_cart(db,cid)
   if action=='cantidad':query(db,'SELECT fn_cambiar_cantidad(%s,%s,%s)',(cid,integer(d.get('variante')),integer(d.get('cantidad'),0)))
   elif action=='abrir':
    c=owned_cart(db,cid)
    if c['estado']!='EN_PAGO':query(db,"SELECT fn_avanzar_carrito(%s,'CARRITO_REVISADO')",(cid,))
   elif action=='checkout':
    c=owned_cart(db,cid)
    if c['estado']!='EN_PAGO':
     query(db,"SELECT fn_avanzar_carrito(%s,'CARRITO_REVISADO')",(cid,))
     query(db,"SELECT fn_avanzar_carrito(%s,'CHECKOUT_INICIADO')",(cid,))
   elif action=='cupon':query(db,'SELECT fn_aplicar_cupon(%s,%s)',(cid,d.get('codigo') or None))
   else:abort(400)
  else:abort(400,description='Agrega productos primero')
  return jsonify(cart_data(db,cid))
@app.get('/api/cuenta')
@require()
def account():
 with conn() as db:
  profile=query(db,'SELECT id_cliente,nombre,correo,telefono,tipo_persona,permite_recordatorios,correo_verificado FROM cliente WHERE id_cliente=%s',(session['uid'],),True)
  profile['direcciones']=query(db,'''SELECT d.*,di.nombre AS distrito FROM direccion d JOIN distrito di USING(id_distrito) WHERE id_cliente=%s''',(session['uid'],))
  profile['pedidos']=query(db,'''SELECT p.*,e.estado AS estado_entrega,m.nombre AS entrega FROM pedido p JOIN envio e USING(id_pedido) JOIN metodo_envio m ON m.id_metodo_envio=e.id_metodo_envio WHERE p.id_cliente=%s ORDER BY p.fecha_confirmacion DESC''',(session['uid'],))
  return jsonify(profile)
@app.post('/api/direccion')
@require()
def address():
 d=request.get_json()
 with conn() as db:
  uid=scalar(db,'INSERT INTO direccion(id_cliente,id_distrito,direccion_texto,referencia) VALUES(%s,%s,%s,%s) RETURNING id_direccion',
   (session['uid'],integer(d.get('id_distrito')),text(d,'direccion_texto',300),text(d,'referencia',200,False) or None))
  return jsonify(id_direccion=uid)
@app.post('/api/checkout')
@require()
def checkout():
 d=request.get_json()
 with conn() as db:
  cid=cart_id(db)
  if not cid:abort(400)
  owned_cart(db,cid)
  method=d.get('metodo_envio','DOMICILIO');payment=d.get('metodo_pago','CONTRA_ENTREGA')
  query(db,'SELECT fn_configurar_checkout(%s,%s,%s,%s)',(cid,payment,method,integer(d['sucursal']) if method=='RETIRO_SUCURSAL' else None))
  if method=='DOMICILIO':query(db,'SELECT fn_guardar_checkout(%s,%s,%s,%s)',(cid,integer(d.get('direccion')),text(d,'nombre_destinatario',100),text(d,'telefono_destinatario',25)))
  else:query(db,'SELECT fn_datos_retiro(%s,%s,%s)',(cid,text(d,'nombre_destinatario',100),text(d,'telefono_destinatario',25)))
  return jsonify(cart_data(db,cid))

def mail(destination,subject,body):
 if CFG.get('SMTP_HOST'):
  m=EmailMessage();m['From']=CFG.get('SMTP_FROM',CFG.get('SMTP_USER'));m['To']=destination;m['Subject']=subject;m.set_content(body)
  klass=smtplib.SMTP_SSL if CFG.get('SMTP_SSL') else smtplib.SMTP
  with klass(CFG['SMTP_HOST'],int(CFG.get('SMTP_PORT',465 if CFG.get('SMTP_SSL') else 587)),timeout=15) as s:
   if not CFG.get('SMTP_SSL'):s.starttls()
   if CFG.get('SMTP_USER'):s.login(CFG['SMTP_USER'],CFG.get('SMTP_PASSWORD',''))
   s.send_message(m)
  return 'SMTP-'+secrets.token_hex(8)
 with localdb() as l:
  c=l.execute('INSERT INTO correos(destino,asunto,cuerpo,creado) VALUES(?,?,?,?)',(destination,subject,body,now().isoformat()))
  return 'LOCAL-'+str(c.lastrowid)
@app.post('/api/verificacion')
@require()
def verify_send():
 with conn() as db:email=scalar(db,'SELECT correo FROM cliente WHERE id_cliente=%s',(session['uid'],))
 token=signer.dumps({'uid':session['uid'],'email':email},salt='correo')
 link=CFG.get('PUBLIC_URL','http://localhost:5050')+'/verificar/'+token
 mail(email,'Verifica tu correo en NizeStore',link)
 return jsonify(ok=True,modo='SMTP' if CFG.get('SMTP_HOST') else 'LOCAL',enlace_local=link if not CFG.get('SMTP_HOST') else None)
@app.get('/verificar/<token>')
def verify(token):
 try:d=signer.loads(token,salt='correo',max_age=3600)
 except (BadSignature,SignatureExpired):abort(400,description='Enlace inválido o vencido')
 with conn() as db:db.execute('UPDATE cliente SET correo_verificado=true WHERE id_cliente=%s AND correo=%s',(d['uid'],d['email']))
 return redirect('/cuenta?verificado=1')
@app.post('/api/perfil')
@require()
def profile():
 d=request.get_json()
 with conn() as db:
  db.execute('UPDATE cliente SET telefono=%s,permite_recordatorios=%s WHERE id_cliente=%s',(text(d,'telefono',25,False) or None,bool(d.get('permite_recordatorios')),session['uid']))
  if d.get('contribuyente'):
   db.execute('''INSERT INTO contribuyente_natural(id_cliente,nit,nrc,giro) VALUES(%s,%s,%s,%s)
    ON CONFLICT(id_cliente) DO UPDATE SET nit=EXCLUDED.nit,nrc=EXCLUDED.nrc,giro=EXCLUDED.giro''',(session['uid'],text(d,'nit',30),text(d,'nrc',30),text(d,'giro',150)))
  if d.get('documento'):
   db.execute('UPDATE cliente_natural SET id_tipo_documento=%s,numero_documento=%s WHERE id_cliente=%s',(integer(d['documento']),text(d,'numero_documento',40),session['uid']))
 return jsonify(ok=True)
@app.post('/api/resena/<int:pid>')
@require()
def review(pid):
 d=request.get_json();stars=integer(d.get('calificacion'))
 if stars>5:abort(400)
 with conn() as db:
  db.execute('''INSERT INTO resena_producto(id_producto,id_cliente,calificacion,comentario) VALUES(%s,%s,%s,%s)
  ON CONFLICT(id_producto,id_cliente) DO UPDATE SET calificacion=EXCLUDED.calificacion,comentario=EXCLUDED.comentario''',(pid,session['uid'],stars,text(d,'comentario',2000)))
 return jsonify(ok=True)

@app.post('/api/pago/iniciar')
@require()
def start_payment():
 with conn() as db:
  cid=cart_id(db)
  if not cid:abort(400)
  owned_cart(db,cid)
  ch=query(db,'SELECT ch.*,m.codigo FROM seguimiento_carrito ch JOIN metodo_pago m USING(id_metodo_pago) WHERE id_carrito=%s',(cid,),True)
  if not ch:abort(400,description='Completa el checkout')
  sede=scalar(db,'SELECT id_sucursal FROM sucursal ORDER BY id_sucursal LIMIT 1')
  if ch['total_mostrado']==0:ped=scalar(db,'SELECT fn_confirmar_sin_cobro(%s,%s)',(cid,sede))
  elif ch['codigo']=='CONTRA_ENTREGA':ped=scalar(db,'SELECT fn_confirmar_contra_entrega(%s,%s)',(cid,sede))
  else:
   query(db,'SELECT fn_iniciar_pago(%s)',(cid,))
   with localdb() as l:
    old=l.execute("SELECT token FROM pagos WHERE carrito=? AND estado='PENDIENTE'",(cid,)).fetchone()
    token=old['token'] if old else secrets.token_urlsafe(32)
    if not old:l.execute('INSERT INTO pagos VALUES(?,?,?,?,?,?,NULL)',(token,session['uid'],cid,str(ch['total_mostrado']),'PENDIENTE',now().isoformat()))
   return jsonify(pasarela='/pago/'+token)
 return jsonify(pedido=ped)
@app.get('/api/pago/<token>')
@require()
def payment_info(token):
 with localdb() as l:row=l.execute('SELECT * FROM pagos WHERE token=? AND cliente=?',(token,session['uid'])).fetchone()
 if not row:abort(404)
 return jsonify(**dict(row),modo='PASARELA_LOCAL_DE_PRUEBA')
@app.post('/api/pago/<token>')
@require()
def payment_decision(token):
 action=request.get_json().get('accion')
 if action not in ('confirmar','cancelar'):abort(400)
 with localdb() as l:
  l.execute('BEGIN IMMEDIATE')
  row=l.execute('SELECT * FROM pagos WHERE token=? AND cliente=?',(token,session['uid'])).fetchone()
  if not row:abort(404)
  if row['estado']=='CONFIRMADO':return jsonify(pedido=row['pedido'])
  if row['estado']!='PENDIENTE':abort(400,description='Este pago ya se cerró')
  with conn() as db:
   c=owned_cart(db,row['carrito']);sede=scalar(db,'SELECT id_sucursal FROM sucursal ORDER BY 1 LIMIT 1')
   if action=='confirmar':
    ped=scalar(db,'SELECT fn_confirmar_compra(%s,%s,%s,%s,%s)',(row['carrito'],'PASARELA_LOCAL',token,Decimal(row['monto']),sede))
   else:
    query(db,'SELECT fn_retornar_del_pago(%s)',(row['carrito'],));ped=None
  l.execute('UPDATE pagos SET estado=?,pedido=? WHERE token=?',('CONFIRMADO' if ped else 'CANCELADO',ped,token))
 return jsonify(pedido=ped,retorno=not bool(ped))

@app.get('/api/comprobante/<int:pid>')
@require()
def pdf(pid):
 with conn() as db:
  p=query(db,'SELECT * FROM pedido WHERE id_pedido=%s AND id_cliente=%s',(pid,session['uid']),True)
  if not p:abort(404)
  f=query(db,'SELECT * FROM factura WHERE id_pedido=%s',(pid,),True)
  lines=query(db,'SELECT * FROM detalle_pedido WHERE id_pedido=%s',(pid,))
  db.execute('UPDATE factura SET url_pdf=%s WHERE id_pedido=%s',('/api/comprobante/'+str(pid),pid))
 from reportlab.pdfgen import canvas
 out=io.BytesIO();c=canvas.Canvas(out)
 c.setFont('Helvetica-Bold',23);c.drawString(48,790,'NizeStore')
 c.setFont('Helvetica',11);c.drawString(48,765,'Comprobante de laboratorio - no es un DTE')
 c.drawString(48,735,f'Pedido {pid} / Documento {f["numero_documento"]} / {p["fecha_confirmacion"]}')
 c.drawString(48,715,str(f['datos_cliente']['nombre']));y=670
 for line in lines:
  if y<150:c.showPage();c.setFont('Helvetica',10);y=770
  c.drawString(48,y,line['descripcion_producto'][:65]);c.drawRightString(540,y,f'{line["cantidad"]} x ${line["precio_unitario"]}');y-=25
 for label,val in [('Subtotal',p['subtotal']),('Descuento cupón',p['descuento_productos']),('Envío',p['costo_envio']),('Total',p['total'])]:
  y-=22;c.drawString(48,y,label);c.drawRightString(540,y,'$'+str(val))
 c.drawString(48,y-35,'Estado del pago: '+p['estado_pago']);c.save();out.seek(0)
 return send_file(out,mimetype='application/pdf',download_name=f'NizeStore-Pedido-{pid}.pdf')

@app.get('/api/admin/resumen')
@require('admin')
def admin_summary():
 with conn() as db:
  return jsonify(**query(db,"""SELECT count(*) AS carritos,count(*) FILTER(WHERE estado='ABANDONADO') AS abandonados,
   count(*) FILTER(WHERE estado='CONVERTIDO') AS convertidos FROM carrito WHERE origen_datos='PROTOTIPO'""",one=True),
   ventas=scalar(db,"SELECT coalesce(sum(p.total),0) FROM pedido p JOIN carrito c USING(id_carrito) WHERE c.origen_datos='PROTOTIPO'"),
   productos=scalar(db,'SELECT count(*) FROM producto WHERE activo'),historial=scalar(db,'SELECT count(*) FROM historial_abandono'))
@app.get('/api/admin/productos')
@require('admin')
def admin_products():
 with conn() as db:
  return jsonify([product_data(db,p['id_producto'],True) for p in query(db,'SELECT id_producto FROM producto ORDER BY id_producto DESC')])
@app.post('/api/admin/productos')
@require('admin')
def admin_product_save():
 d=request.get_json();pid=integer(d['id_producto']) if d.get('id_producto') else None
 name=text(d,'nombre',150);cat=integer(d.get('id_categoria'))
 with conn() as db:
  vals=(name,cat,integer(d['id_franquicia']) if d.get('id_franquicia') else None,integer(d['id_proveedor']) if d.get('id_proveedor') else None,text(d,'descripcion',5000,False),text(d,'url_imagen',500,False),bool(d.get('activo',True)))
  if pid:
   if not query(db,'SELECT 1 FROM producto WHERE id_producto=%s FOR UPDATE',(pid,),True):abort(404)
   db.execute('UPDATE producto SET nombre=%s,id_categoria=%s,id_franquicia=%s,id_proveedor=%s,descripcion=%s,url_imagen=%s,activo=%s WHERE id_producto=%s',vals+(pid,))
  else:pid=scalar(db,'INSERT INTO producto(nombre,id_categoria,id_franquicia,id_proveedor,descripcion,url_imagen,activo) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING id_producto',vals)
  variants=d.get('variantes',[])
  if not variants:abort(400,description='Agrega al menos una variante')
  for v in variants:
   vid=integer(v['id_variante']) if v.get('id_variante') else None
   sku=text(v,'sku',60,False)
   if not sku:
    sku=scalar(db,'SELECT sku FROM producto_variante WHERE id_variante=%s',(vid,)) if vid else f'NZ-{pid}-{secrets.token_hex(4).upper()}'
   values=(sku,number(v.get('precio'),Decimal('.01')),bool(v.get('activa',True)))
   if vid:
    if not query(db,'SELECT 1 FROM producto_variante WHERE id_variante=%s AND id_producto=%s',(vid,pid),True):abort(400)
    db.execute('UPDATE producto_variante SET sku=%s,precio=%s,activa=%s WHERE id_variante=%s',values+(vid,))
   else:vid=scalar(db,'INSERT INTO producto_variante(id_producto,sku,precio,activa) VALUES(%s,%s,%s,%s) RETURNING id_variante',(pid,)+values)
   attrs=v.get('atributos',{})
   if not isinstance(attrs,dict):abort(400)
   for attr in attrs:db.execute('INSERT INTO atributo_variante(nombre) VALUES(%s) ON CONFLICT(nombre) DO NOTHING',(attr[:60],))
   query(db,'SELECT fn_guardar_atributos_variante(%s,%s)',(vid,Jsonb(attrs)))
   qty=integer(v.get('entrada',0),0)
   if qty:
    sede=scalar(db,'SELECT id_sucursal FROM sucursal ORDER BY 1 LIMIT 1')
    query(db,'SELECT fn_entrada_inventario(%s,%s,%s,%s)',(vid,sede,qty,number(v.get('costo',0))))
  specs=d.get('especificaciones',{})
  db.execute('DELETE FROM especificacion_producto WHERE id_producto=%s',(pid,))
  for key,value in specs.items():db.execute('INSERT INTO especificacion_producto(id_producto,atributo,valor) VALUES(%s,%s,%s)',(pid,str(key)[:60],str(value)[:200]))
  return jsonify(id_producto=pid)
@app.delete('/api/admin/productos/<int:pid>')
@require('admin')
def delete_product(pid):
 with conn() as db:
  # Papelera lógica: conserva compras y movimientos históricos.
  db.execute('UPDATE producto SET activo=false WHERE id_producto=%s',(pid,))
 return jsonify(ok=True)
@app.post('/api/admin/imagen')
@require('admin')
def upload():
 f=request.files.get('imagen')
 if not f:abort(400)
 ext=Path(secure_filename(f.filename)).suffix.lower()
 raw=f.read()
 if ext not in ('.png','.jpg','.jpeg','.webp') or len(raw)>5*1024*1024:abort(400,description='Imagen PNG, JPEG o WEBP, hasta 5 MB')
 from PIL import Image
 try:im=Image.open(io.BytesIO(raw));im.verify()
 except Exception:abort(400,description='Archivo de imagen inválido')
 fname=secrets.token_hex(16)+ext;folder=BASE/'static/uploads';folder.mkdir(exist_ok=True)
 (folder/fname).write_bytes(raw)
 return jsonify(url='/static/uploads/'+fname)

@app.post('/api/admin/regla')
@require('admin')
def admin_rule():
 d=request.get_json()
 with conn() as db:
  if d.get('seleccionar'):query(db,'SELECT fn_seleccionar_condicion_envio(%s)',(integer(d['seleccionar']),))
  else:
   typ=d.get('tipo');minimum=number(d.get('compra_minima'),Decimal('.01')) if typ=='GRATIS_DESDE_MINIMO' else None
   discount=number(d.get('descuento'),Decimal('.01')) if typ=='DESCUENTO_ENVIO' else Decimal(0)
   query(db,'SELECT fn_crear_condicion_envio(%s,%s,%s,%s)',(text(d,'nombre',120),typ,minimum,discount))
 return jsonify(ok=True)
ZONES={'central':['La Libertad','Chalatenango','Cuscatlán','San Salvador','La Paz','Cabañas','San Vicente'],'occidental':['Ahuachapán','Santa Ana','Sonsonate'],'oriental':['Usulután','San Miguel','Morazán','La Unión']}
@app.post('/api/admin/tarifa')
@require('admin')
def admin_tariff():
 d=request.get_json();amount=number(d.get('monto'))
 with conn() as db:
  if d.get('zona'):
   if d['zona'] not in ZONES:abort(400)
   ids=query(db,'SELECT id_departamento,nombre FROM departamento WHERE nombre=ANY(%s)',(ZONES[d['zona']],))
  else:ids=query(db,'SELECT id_departamento,nombre FROM departamento WHERE id_departamento=%s',(integer(d.get('departamento')),))
  for item in ids:query(db,'SELECT fn_actualizar_tarifa_envio(%s,%s,%s)',(item['id_departamento'],'Entrega '+item['nombre'],amount))
 return jsonify(ok=True)
@app.get('/api/admin/tarifas')
@require('admin')
def tariffs():
 with conn() as db:return jsonify(query(db,'SELECT t.*,d.nombre AS departamento FROM tarifa_envio t JOIN departamento d USING(id_departamento) WHERE t.activa ORDER BY d.nombre'))
@app.post('/api/admin/ajustes')
@require('admin')
def settings():
 d=request.get_json();mins=integer(d.get('minutos'),1)
 if mins>525600:abort(400)
 with conn() as db:db.execute('UPDATE ajustes_tienda SET nombre_tienda=%s,tiempo_inactividad_para_abandono=%s WHERE id_configuracion=1',(text(d,'nombre_tienda',100),timedelta(minutes=mins)))
 return jsonify(ok=True)
@app.get('/api/admin/cupones')
@require('admin')
def coupons_get():
 with conn() as db:return jsonify(query(db,'SELECT * FROM cupon ORDER BY id_cupon DESC'))
@app.post('/api/admin/cupones')
@require('admin')
def coupons_save():
 d=request.get_json();values=(text(d,'codigo',50).upper(),text(d,'tipo',15),number(d.get('valor'),Decimal('.01')),number(d.get('subtotal_minimo',0)),text(d,'fecha_inicio',30),text(d,'fecha_fin',30),bool(d.get('activa',True)))
 with conn() as db:
  if d.get('id_cupon'):db.execute('UPDATE cupon SET codigo=%s,tipo=%s,valor=%s,subtotal_minimo=%s,fecha_inicio=%s,fecha_fin=%s,activa=%s WHERE id_cupon=%s',values+(integer(d['id_cupon']),))
  else:db.execute('INSERT INTO cupon(codigo,tipo,valor,subtotal_minimo,fecha_inicio,fecha_fin,activa) VALUES(%s,%s,%s,%s,%s,%s,%s)',values)
 return jsonify(ok=True)
@app.route('/api/admin/catalogos/<table>',methods=['POST','DELETE'])
@require('admin')
def admin_catalog(table):
 allowed={'categoria':('id_categoria','activa'),'franquicia':('id_franquicia','activa'),'proveedor':('id_proveedor','activo'),'atributo_variante':('id_atributo',None)}
 if table not in allowed:abort(400)
 pk,active=allowed[table];d=request.get_json()
 with conn() as db:
  if request.method=='DELETE':
   if not active:abort(400)
   db.execute(f'UPDATE {table} SET {active}=false WHERE {pk}=%s',(integer(d['id']),))
  elif table=='proveedor':
   if d.get('id'):db.execute('UPDATE proveedor SET nombre=%s,contacto=%s,telefono=%s,correo=%s,origen=%s,activo=true WHERE id_proveedor=%s',(text(d,'nombre',150),text(d,'contacto',100,False),text(d,'telefono',25,False),text(d,'correo',150,False),text(d,'origen',15),integer(d['id'])))
   else:db.execute('INSERT INTO proveedor(nombre,contacto,telefono,correo,origen) VALUES(%s,%s,%s,%s,%s)',(text(d,'nombre',150),text(d,'contacto',100,False),text(d,'telefono',25,False),text(d,'correo',150,False),text(d,'origen',15)))
  elif d.get('id'):db.execute(f'UPDATE {table} SET nombre=%s'+(f',{active}=true' if active else '')+f' WHERE {pk}=%s',(text(d,'nombre',100),integer(d['id'])))
  else:db.execute(f'INSERT INTO {table}(nombre) VALUES(%s)',(text(d,'nombre',100),))
 return jsonify(ok=True)
@app.get('/api/admin/pedidos')
@require('admin')
def admin_orders():
 with conn() as db:return jsonify(query(db,'''SELECT p.*,c.nombre AS cliente,c.origen_datos,e.estado AS estado_entrega,m.codigo AS entrega
 FROM pedido p JOIN cliente c USING(id_cliente) JOIN envio e USING(id_pedido) JOIN metodo_envio m ON m.id_metodo_envio=e.id_metodo_envio
 WHERE c.origen_datos=%s ORDER BY p.fecha_confirmacion DESC LIMIT 200''',('HISTORICO_SIMULADO' if request.args.get('historico')=='1' else 'PROTOTIPO',)))
@app.post('/api/admin/pedido/<int:pid>')
@require('admin')
def order_update(pid):
 d=request.get_json()
 with conn() as db:
  if d.get('cobrar'):
   p=query(db,'SELECT * FROM pedido WHERE id_pedido=%s',(pid,),True)
   if not p:abort(404)
   query(db,'SELECT fn_registrar_cobro(%s,%s,%s,%s)',(pid,'EFECTIVO',text(d,'referencia',150),p['total']))
  else:query(db,'SELECT fn_actualizar_envio(%s,%s,%s)',(pid,text(d,'estado',20),text(d,'guia',100,False) or None))
 return jsonify(ok=True)
@app.get('/api/admin/carritos')
@require('admin')
def admin_carts():
 with conn() as db:return jsonify(query(db,'''SELECT c.*,cli.nombre,ch.costo_envio_mostrado,
 (SELECT count(*) FROM historial_abandono h WHERE h.id_carrito=c.id_carrito) AS episodios
 FROM carrito c JOIN cliente cli USING(id_cliente) JOIN seguimiento_carrito ch USING(id_carrito)
 WHERE c.origen_datos=%s ORDER BY c.fecha_creacion DESC LIMIT 200''',('HISTORICO_SIMULADO' if request.args.get('historico')=='1' else 'PROTOTIPO',)))
@app.get('/api/admin/historial/<int:cid>')
@require('admin')
def history(cid):
 with conn() as db:return jsonify(query(db,'SELECT * FROM historial_abandono WHERE id_carrito=%s ORDER BY fecha_abandono',(cid,)))

@app.post('/api/admin/carrito/<int:cid>/demostrar-abandono')
@require('admin')
def demonstrate_abandonment(cid):
 # Un reloj compartido conserva la cronología de toda la tienda.
 with conn() as db:
  settings=query(db,'SELECT * FROM ajustes_tienda WHERE id_configuracion=1 FOR UPDATE',one=True)
  c=query(db,'SELECT * FROM carrito WHERE id_carrito=%s FOR UPDATE',(cid,),True)
  if not c:abort(404)
  if c['origen_datos']!='PROTOTIPO':abort(400,description='Elige un carrito del prototipo')
  if c['estado']!='ACTIVO' or c['subtotal']<=0:abort(409,description='Necesitas un carrito activo con productos y sin pago pendiente')
  before=scalar(db,'SELECT fn_ahora_tienda()')
  target=max(before,c['ultima_actividad']+settings['tiempo_inactividad_para_abandono']+timedelta(seconds=1))
  jump=target-before
  db.execute('UPDATE ajustes_tienda SET adelanto_reloj=adelanto_reloj+%s WHERE id_configuracion=1',(jump,))
  detected=scalar(db,'SELECT fn_detectar_abandonos()')
  after=scalar(db,'SELECT fn_ahora_tienda()')
 # Las operaciones pendientes y sus vencimientos también siguen la misma hora.
 services_once()
 return jsonify(ok=True,detectados=detected,hora_tienda=after,adelanto_segundos=int(jump.total_seconds()))
@app.get('/api/admin/kardex')
@require('admin')
def kardex():
 with conn() as db:return jsonify(query(db,'''SELECT k.*,v.sku FROM kardex_inventario k JOIN producto_variante v USING(id_variante) ORDER BY fecha_movimiento DESC LIMIT 150'''))
@app.get('/api/admin/clientes')
@require('admin')
def customers():
 with conn() as db:return jsonify(query(db,'''SELECT id_cliente,nombre,correo,tipo_persona,fecha_registro,correo_verificado,permite_recordatorios,activo,origen_datos FROM cliente WHERE origen_datos='PROTOTIPO' ORDER BY fecha_registro DESC'''))
@app.get('/api/admin/bi.csv')
@require('admin')
def export():
 with conn() as db:
  rows=query(db,'SELECT * FROM vista_maestra_nizestore_v2 ORDER BY id_carrito')
  columns=[c['column_name'] for c in query(db,"SELECT column_name FROM information_schema.columns WHERE table_name='vista_maestra_nizestore_v2' AND table_schema='public' ORDER BY ordinal_position")]
 out=io.StringIO();w=csv.DictWriter(out,fieldnames=columns);w.writeheader();w.writerows(rows)
 return app.response_class('\ufeff'+out.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename=vista_maestra_nizestore.csv'})
@app.post('/api/admin/abandonos')
@require('admin')
def detect():
 with conn() as db:n=scalar(db,'SELECT fn_detectar_abandonos()')
 return jsonify(detectados=n)
@app.get('/api/admin/correos')
@require('admin')
def outbox():
 with localdb() as l:rows=[dict(x) for x in l.execute('SELECT * FROM correos ORDER BY id DESC LIMIT 50')]
 return jsonify(correos=rows,modo='SMTP' if CFG.get('SMTP_HOST') else 'BANDEJA_LOCAL')
@app.post('/api/admin/recordatorios')
@require('admin')
def reminders():
 with conn() as db:
  scalar(db,'SELECT fn_encolar_recordatorios()')
  rows=query(db,"""SELECT n.* FROM notificacion_carrito n JOIN carrito c USING(id_carrito) JOIN cliente cli USING(id_cliente)
   WHERE n.estado='PENDIENTE' AND c.estado='ABANDONADO' AND c.origen_datos='PROTOTIPO'
   AND cli.permite_recordatorios AND cli.correo_verificado AND n.fecha_expiracion>fn_ahora_tienda()
   FOR UPDATE OF n SKIP LOCKED""")
  for n in rows:
   link=CFG.get('PUBLIC_URL','http://localhost:5050')+'/recuperar/'+str(n['token'])
   reference=mail(n['correo_destino'],'Tu carrito te espera en NizeStore',link)
   query(db,'SELECT fn_marcar_recordatorio_enviado(%s,%s)',(n['id_notificacion'],reference))
 return jsonify(enviados=len(rows),modo='SMTP' if CFG.get('SMTP_HOST') else 'BANDEJA_LOCAL')
@app.post('/api/recuperar/<token>')
@require()
def recover(token):
 with conn() as db:
  cid=scalar(db,'SELECT fn_abrir_recordatorio(%s,%s)',(token,session['uid']))
  if cart_id(db) not in (None,cid):abort(400,description='Completa o vacía tu carrito actual antes de recuperar otro')
  query(db,"SELECT fn_avanzar_carrito(%s,'CARRITO_REVISADO')",(cid,))
 return jsonify(ok=True)

def services_once():
 # Pasarela LOCAL: el servidor conoce y expira sus propias solicitudes, sin inventar resultado externo.
 with localdb() as l:
  # Mantiene el mismo orden de bloqueo que confirmar pago: local -> PostgreSQL.
  l.execute('BEGIN IMMEDIATE')
  rows=l.execute("SELECT * FROM pagos WHERE estado='PENDIENTE'").fetchall()
  for p in rows:
   if now()-datetime.fromisoformat(p['creado'])>timedelta(minutes=15):
    with conn() as db:
     c=query(db,'SELECT estado FROM carrito WHERE id_carrito=%s',(p['carrito'],),True)
     if c and c['estado']=='EN_PAGO':query(db,'SELECT fn_retornar_del_pago(%s)',(p['carrito'],))
    l.execute("UPDATE pagos SET estado='EXPIRADO' WHERE token=? AND estado='PENDIENTE'",(p['token'],))
 with conn() as db:scalar(db,'SELECT fn_detectar_abandonos()')
def services_loop():
 while True:
  try:services_once()
  except Exception:app.logger.exception('Tarea periódica')
  time.sleep(20)
@app.get('/')
@app.get('/<path:path>')
def shell(path=''):
 if path.startswith(('api/','static/')):abort(404)
 return send_from_directory(BASE/'static','index.html')
if __name__=='__main__':
 from waitress import serve
 logging.basicConfig(level=logging.INFO)
 threading.Thread(target=services_loop,daemon=True).start()
 serve(app,host='127.0.0.1',port=int(CFG.get('PORT',5050)),threads=8)
