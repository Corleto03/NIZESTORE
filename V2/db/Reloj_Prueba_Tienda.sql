-- Migración conservadora: no borra tablas, carritos ni pedidos.
-- El reloj de laboratorio es compartido: nunca retrocede y no altera fechas previas.
BEGIN;
ALTER TABLE ajustes_tienda ADD COLUMN IF NOT EXISTS adelanto_reloj interval NOT NULL DEFAULT interval '0' CHECK(adelanto_reloj>=interval '0');
CREATE OR REPLACE FUNCTION fn_ahora_tienda() RETURNS timestamp LANGUAGE sql STABLE AS $$
 SELECT localtimestamp + coalesce((SELECT adelanto_reloj FROM ajustes_tienda WHERE id_configuracion=1),interval '0')
$$;
-- Todos los valores por defecto y funciones de negocio usan el mismo reloj.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT pg_get_functiondef(p.oid) AS definicion FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'fn_%' AND p.proname<>'fn_ahora_tienda'
 LOOP
  IF r.definicion ~* 'localtimestamp' THEN
   EXECUTE regexp_replace(r.definicion,'localtimestamp','public.fn_ahora_tienda()','gi');
  END IF;
 END LOOP;
 FOR r IN SELECT c.relname,a.attname,pg_get_expr(d.adbin,d.adrelid) AS expresion
  FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.adnum
  WHERE n.nspname='public' AND pg_get_expr(d.adbin,d.adrelid) ~* 'localtimestamp'
 LOOP
  EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT %s',r.relname,r.attname,
    regexp_replace(r.expresion,'localtimestamp','public.fn_ahora_tienda()','gi'));
 END LOOP;
END $$;
COMMIT;
