"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [tipoPersona, setTipoPersona] = useState('natural');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, password, tipo_persona: tipoPersona }),
    });
    
    if (res.ok) {
      const loginRes = await signIn('client', { correo, password, redirect: false });
      if (!loginRes?.error) {
        router.push('/');
        router.refresh();
      }
    } else {
      const data = await res.json();
      setError(data.message || 'Error al registrarse');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Crear Cuenta</h1>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
          <input 
            type="text" 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 outline-none"
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Correo Electrï¿½nico</label>
          <input 
            type="email" 
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 outline-none"
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de Cliente</label>
          <select 
            value={tipoPersona}
            onChange={(e) => setTipoPersona(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 outline-none"
          >
            <option value="natural">Persona Natural</option>
            <option value="juridica">Persona Jurï¿½dica (Empresa)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contraseï¿½a</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 outline-none"
            required 
          />
        </div>
        <button type="submit" className="w-full bg-red-600 text-white p-2 rounded-md hover:bg-red-700 font-medium transition-colors">
          Registrarme
        </button>
      </form>
    </div>
  );
}
