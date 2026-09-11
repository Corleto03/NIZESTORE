"use client";

import { useState, useRef } from "react";
import { Upload, X, Check, Image as ImageIcon, Loader2, FolderOpen, Link as LinkIcon } from "lucide-react";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ value, onChange, label = "Fotografía o Imagen del Producto" }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"file" | "url">("file");
  const [manualUrl, setManualUrl] = useState(value || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("El archivo seleccionado no es una imagen válida (JPEG, PNG, WEBP, etc.).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("La imagen es demasiado pesada. El tamaño máximo permitido es 10 MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al subir la imagen al servidor.");
      }

      onChange(data.url);
      setManualUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || "No se pudo subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    onChange("");
    setManualUrl("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-2.5 py-1 rounded transition-colors ${
              mode === "file"
                ? "bg-slate-900 text-white font-medium"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Subir archivo local
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2.5 py-1 rounded transition-colors ${
              mode === "url"
                ? "bg-slate-900 text-white font-medium"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Enlace URL
          </button>
        </div>
      </div>

      {mode === "file" ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />

          {value ? (
            <div className="relative flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="w-3.5 h-3.5" />
                  <span>Imagen cargada correctamente</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5" title={value}>
                  {value}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                  >
                    <FolderOpen className="w-3 h-3 text-slate-500" />
                    Cambiar archivo
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                  >
                    <X className="w-3 h-3 text-rose-500" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-red-600 bg-red-50/50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-3">
                  <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Subiendo imagen al servidor...</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Espere un instante</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-11 h-11 mb-2.5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600">
                    <Upload className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Haz clic para abrir tu carpeta local o arrastra la imagen aquí
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Archivos soportados: PNG, JPG, WEBP o GIF (hasta 10 MB)
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                      Examinar en mi computadora
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => {
                  setManualUrl(e.target.value);
                  onChange(e.target.value);
                }}
                placeholder="https://ejemplo.com/imagen.jpg o /images/products/..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Limpiar
              </button>
            )}
          </div>
          {value && (
            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs text-slate-600 truncate">{value}</span>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-rose-600 font-medium">{uploadError}</p>
      )}
    </div>
  );
}
