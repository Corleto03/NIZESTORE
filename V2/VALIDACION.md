# Validación del paquete V2

9 de octubre de 2026: **56 comprobaciones correctas ejecutadas contra esta copia**, en PostgreSQL temporal creado y eliminado por pruebas_integracion.py. No se modificó la base de la tienda original.

Comprobaciones: autenticación y permisos, CSRF, catálogo, contacto local, carritos, etapas, envío/domicilio/retiro, reserva y liberación de stock, pago local, confirmación sin duplicados, PDF privado, correo y recordatorio locales, episodios y recuperación, segmento de cliente, CSV con una fila por carrito, código automático y migración del reloj.

Arranque adaptado a .venv estándar; no contiene rutas de Codex. No se incluyen .env real, runtime, contraseñas originales, respaldos ni dependencias instaladas. Una instalación nueva comienza con adelanto cero; el botón de adelanto existente sigue pendiente de rediseño según README.
