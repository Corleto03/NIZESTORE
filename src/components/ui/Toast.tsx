"use client";

import Link from 'next/link';
import { Check } from 'lucide-react';

interface ToastProps {
  show: boolean;
  onClose: () => void;
}

export default function Toast({ show, onClose }: ToastProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50 animate-bounce">
      <div className="bg-green-500 rounded-full p-1">
        <Check className="w-4 h-4 text-white" />
      </div>
      <span className="text-sm font-medium">Agregado al carrito</span>
      <Link
        href="/carrito"
        onClick={onClose}
        className="ml-4 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
      >
        Ver carrito
      </Link>
    </div>
  );
}
