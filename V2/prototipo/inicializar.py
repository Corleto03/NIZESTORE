"""Crea el acceso del nuevo panel y las ilustraciones propias del catálogo."""
from pathlib import Path
import secrets,html
from app import conn,query,BASE

credentials=BASE/'ACCESO_ADMIN.local.txt'
email='administrador.prototipo@nizestore.local'
with conn() as db:
 row=query(db,'SELECT id_administrador FROM administrador WHERE lower(correo)=lower(%s)',(email,),True)
 if not row:
  password='Nize!'+secrets.token_urlsafe(12)
  db.execute("INSERT INTO administrador(nombre,correo,password_hash) VALUES(%s,%s,crypt(%s,gen_salt('bf',10)))",('Administrador del prototipo',email,password))
  credentials.write_text('NizeStore · Acceso al panel nuevo\n\nURL: http://localhost:5050/admin\nUsuario: '+email+'\nContraseña: '+password+'\n\nAcceso local de laboratorio. No compartir este archivo públicamente.\n',encoding='utf-8')
 elif not credentials.exists():
  raise RuntimeError('La cuenta ya existe. No se restableció su contraseña; conserva las credenciales originales.')
 images=BASE/'static/ilustraciones';images.mkdir(exist_ok=True)
 products=query(db,'SELECT p.id_producto,p.nombre,c.nombre AS categoria FROM producto p JOIN categoria c USING(id_categoria)')
 for p in products:
  cat=p['categoria'].upper();title=html.escape(p['nombre'])
  if 'ROPA' in cat:
   art='<path d="M150 110l55-35h70l55 35 55 70-50 35-35-40v195H200V175l-35 40-50-35z" fill="#30303b"/><path d="M205 75q35 70 70 0" fill="none" stroke="#f9f4ed" stroke-width="12"/><circle cx="250" cy="235" r="40" fill="#c92f3c"/><path d="M230 252l20-40 20 40z" fill="#f9f4ed"/>'
  elif 'MANGA' in cat:
   art='<rect x="155" y="85" width="200" height="290" rx="6" fill="#fbfaf7"/><path d="M170 85v290" stroke="#383440" stroke-width="18"/><rect x="185" y="100" width="155" height="185" fill="#c72e3a"/><path d="M195 255l140-130M195 205l90-85M230 280l105-105" stroke="#f4bfa6" stroke-width="20"/><text x="190" y="335" font-size="28" font-family="sans-serif" font-weight="bold" fill="#383440">MANGA</text>'
  elif 'FIGURA' in cat:
   art='<ellipse cx="250" cy="373" rx="110" ry="18" fill="#bdaebc"/><path d="M218 350l12-110h40l16 110" fill="#32333e"/><path d="M220 185l-50 85 20 12 47-53h28l45 53 20-12-50-85z" fill="#c72e3a"/><circle cx="250" cy="145" r="38" fill="#edbf9f"/><path d="M210 140l5-40 33-18 40 23 4 40-40-30z" fill="#30303b"/><path d="M226 200h48v52h-48z" fill="#c72e3a"/>'
  else:
   art='<circle cx="250" cy="125" r="45" fill="none" stroke="#8f8897" stroke-width="17"/><path d="M250 167v50" stroke="#8f8897" stroke-width="12"/><rect x="175" y="205" width="150" height="150" rx="28" fill="#c72e3a"/><path d="M250 230l15 30 34 5-25 24 6 34-30-16-30 16 6-34-25-24 34-5z" fill="#fbdfba"/>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 450"><title>{title}</title><rect width="500" height="450" fill="#f1e8df"/><circle cx="405" cy="60" r="145" fill="#edd3ce"/>{art}<text x="250" y="422" text-anchor="middle" font-family="sans-serif" font-size="13" letter-spacing="3" fill="#806861">NIZESTORE · {html.escape(cat)}</text></svg>'
  (images/f'{p["id_producto"]}.svg').write_text(svg,encoding='utf-8')
  db.execute("UPDATE producto SET url_imagen=%s WHERE id_producto=%s AND (url_imagen IS NULL OR url_imagen='' OR url_imagen LIKE '/images/%%')",('/static/ilustraciones/'+str(p['id_producto'])+'.svg',p['id_producto']))
print('Administrador preparado; contraseña guardada en ACCESO_ADMIN.local.txt. Catálogo con ilustraciones propias.')
