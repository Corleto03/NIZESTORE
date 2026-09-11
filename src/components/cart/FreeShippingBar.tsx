"use client";

import { Truck, CheckCircle2 } from "lucide-react";

interface FreeShippingBarProps {
  subtotal: number;
  className?: string;
}

export default function FreeShippingBar({ subtotal, className = "" }: FreeShippingBarProps) {
  const THRESHOLD = 35.0;
  const currentSubtotal = Math.max(0, subtotal || 0);
  const remaining = Math.max(0, THRESHOLD - currentSubtotal);
  const percentage = Math.min(100, Math.round((currentSubtotal / THRESHOLD) * 100));
  const hasFreeShipping = remaining === 0;

  return (
    <div className={`p-3.5 rounded-xl border transition-all ${
      hasFreeShipping 
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900" 
        : "bg-zinc-50 border-zinc-200/70 text-zinc-800"
    } ${className}`}>
      <div className="flex items-center justify-between text-xs font-medium mb-2">
        <div className="flex items-center gap-1.5">
          {hasFreeShipping ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold text-emerald-800">
                ¡Felicidades! Tienes <strong className="text-emerald-950 underline decoration-emerald-400">Envío Gratis</strong> a todo El Salvador
              </span>
            </>
          ) : (
            <>
              <Truck className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>
                Agrega <strong className="text-red-600 font-bold">${remaining.toFixed(2)}</strong> más para <strong className="font-semibold text-zinc-900">Envío Gratis</strong>
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-bold font-mono text-zinc-600">{percentage}%</span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-zinc-200/80 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            hasFreeShipping ? "bg-emerald-600" : "bg-red-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
