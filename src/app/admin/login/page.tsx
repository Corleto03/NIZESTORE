"use client";

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('admin', {
      correo,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError('Credenciales inválidas');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-lg shadow-md border-t-4 border-red-600">
      <div className="flex justify-center mb-4">
        <Shield className="w-12 h-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Portal Administrativo</h1>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Correo de Staff</label>
          <input 
            type="email" 
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 outline-none"
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 outline-none"
            required 
          />
        </div>
        <button type="submit" className="w-full bg-gray-900 text-white p-2 rounded-md hover:bg-gray-800 font-medium transition-colors mt-4">
          Ingresar al Panel
        </button>
      </form>
    </div>
  );
}
