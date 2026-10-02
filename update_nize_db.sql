-- Tabla: administrador
CREATE TABLE administrador (
    id_administrador SERIAL PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL,
    correo           VARCHAR(100) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion   TIMESTAMP DEFAULT now()
);

-- Tabla: resena_producto
CREATE TABLE resena_producto (
    id_resena      SERIAL PRIMARY KEY,
    id_producto    INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    nombre_cliente VARCHAR(100) NOT NULL,
    calificacion   INT NOT NULL,
    comentario     TEXT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    verificado     BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_resena_producto_id ON resena_producto(id_producto);

-- Campos faltantes en tablas existentes
ALTER TABLE categoria 
ADD COLUMN atributos_plantilla JSON DEFAULT '[]';

ALTER TABLE producto 
ADD COLUMN url_imagen TEXT;

ALTER TABLE producto_variante 
ADD COLUMN url_imagen TEXT,
ADD COLUMN descripcion_variante TEXT;
