import React, { useState } from 'react';
import { BikerStore } from './components/BikerStore';
import { ShieldCheck, Lock, Unlock } from 'lucide-react';

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bikers_store_is_admin') === 'true';
    } catch {
      return false;
    }
  });
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const handleToggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      localStorage.removeItem('bikers_store_is_admin');
    } else {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default Owner PIN: 1234 o 1984
    if (pinInput === '1234' || pinInput === '1984' || pinInput === 'biker') {
      setIsAdmin(true);
      localStorage.setItem('bikers_store_is_admin', 'true');
      setShowPinModal(false);
    } else {
      setPinError('PIN incorrecto. Intenta con 1234');
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col justify-between selection:bg-[#FFC107] selection:text-black">
      {/* Tienda Oficial */}
      <BikerStore isAdmin={isAdmin} />

      {/* Discreto botón de acceso para el dueño en la esquina inferior */}
      <div className="fixed bottom-3 left-3 z-40">
        <button
          type="button"
          onClick={handleToggleAdmin}
          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-md border transition-all cursor-pointer backdrop-blur-md ${
            isAdmin
              ? 'bg-[#FFC107] text-[#111111] border-amber-400 ring-2 ring-amber-400/40 font-black'
              : 'bg-white/90 hover:bg-white text-gray-600 hover:text-black border-gray-200 shadow-sm opacity-60 hover:opacity-100'
          }`}
          title={isAdmin ? 'Modo Editor Activo (puedes editar textos y categorías)' : 'Acceso Administrador'}
        >
          {isAdmin ? <Unlock size={11} className="text-[#111111]" /> : <Lock size={11} />}
          <span>{isAdmin ? 'Modo Editor Activo' : 'Dueño'}</span>
        </button>
      </div>

      {/* Modal PIN de Acceso para el Dueño */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#FFC107] border border-amber-200 flex items-center justify-center font-bold">
                  <ShieldCheck size={16} className="text-amber-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base uppercase text-[#111111] tracking-tight">Acceso Dueño</h4>
                  <p className="text-[10px] text-[#555555]">Introduce el PIN de edición</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-gray-400 hover:text-black text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="PIN (por defecto: 1234)"
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFC107] focus:bg-white p-2.5 rounded-xl text-center text-[#111111] font-mono text-lg tracking-widest outline-none transition-colors"
              />

              {pinError && (
                <p className="text-rose-600 text-[10.5px] font-bold text-center">{pinError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-[#555555] hover:text-[#111111] bg-gray-100 hover:bg-gray-200 border border-gray-200 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-black uppercase text-[#111111] bg-[#FFC107] hover:bg-[#ffb300] shadow-sm cursor-pointer transition-colors"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
