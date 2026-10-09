# Accesos de laboratorio

Se generan al cargar Poblacion_NizeStore_V2.sql. No usar estas claves en producción.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador de población | admin@demo.nizestore.test | NizeDemo2026! |
| Cliente histórico | cliente1@demo.nizestore.test | ClienteDemo2026! |

Para probar compras y abandono, registra un cliente nuevo desde la tienda. Así sus operaciones son PROTOTIPO; las cuentas históricas sirven para consultar el histórico, no para ensayar abandono ni enviar recordatorios.

inicializar.py crea además **administrador.prototipo@nizestore.local**, con contraseña aleatoria en **prototipo/ACCESO_ADMIN.local.txt** de tu equipo. Ese archivo queda fuera de Git. No reemplaza la contraseña de una cuenta existente.

La cuenta cliente.prototipo@example.test usada en el equipo original no forma parte de estos SQL. Crea tu propia cuenta mediante Registro. No se publican la contraseña del administrador original, conexión PostgreSQL ni claves de sesión.
