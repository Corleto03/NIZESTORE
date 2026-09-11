"use client";

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('client', {
      correo,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError('Credenciales inválidas');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Iniciar Sesión</h1>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
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
        <button type="submit" className="w-full bg-red-600 text-white p-2 rounded-md hover:bg-red-700 font-medium transition-colors">
          Ingresar
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        ¿¿No tienes cuenta? <Link href="/register" className="text-red-600 hover:underline">Regístrate</Link>
      </p>
    </div>
  );
}
