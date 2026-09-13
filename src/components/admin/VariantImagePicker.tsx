"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface VariantImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  fallbackImage?: string;
}

export default function VariantImagePicker({
  value,
  onChange,
  fallbackImage = "/images/products/one-piece-vol-100.jpeg"
}: VariantImagePickerProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [inputUrl, setInputUrl] = useState(value || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImg = value || fallbackImage;

  const handleUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onChange(data.url);
      }
    } catch (e) {
      console.error("Error uploading variant image:", e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
        <img
          src={displayImg}
          alt="Variante"
          className="w-full h-full object-cover"
        />
        {uploading ? (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
            title="Subir foto para esta variante"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUpload(e.target.files[0]);
        }}
      />

      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-[10px] font-bold text-red-600 hover:text-red-700 underline text-left"
        >
          {value ? "Cambiar foto" : "+ Subir foto"}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] text-slate-400 hover:text-rose-600 text-left"
          >
            Heredar principal
          </button>
        )}
      </div>
    </div>
  );
}
