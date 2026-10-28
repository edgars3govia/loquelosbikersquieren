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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {/* Tienda Oficial */}
      <BikerStore isAdmin={isAdmin} />

      {/* Discreto botón de acceso para el dueño en la esquina inferior */}
      <div className="fixed bottom-3 left-3 z-40">
        <button
          type="button"
          onClick={handleToggleAdmin}
          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-lg border transition-all cursor-pointer backdrop-blur-md ${
            isAdmin
              ? 'bg-amber-400 text-black border-amber-300 ring-2 ring-amber-400/40 font-black'
              : 'bg-black/40 hover:bg-black/80 text-slate-400 hover:text-white border-white/10 opacity-30 hover:opacity-100'
          }`}
          title={isAdmin ? 'Modo Editor Activo (puedes editar textos y categorías)' : 'Acceso Administrador'}
        >
          {isAdmin ? <Unlock size={11} className="text-black" /> : <Lock size={11} />}
          <span>{isAdmin ? 'Modo Editor Activo' : 'Dueño'}</span>
        </button>
      </div>

      {/* Modal PIN de Acceso para el Dueño */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e121b] border border-amber-500/40 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="font-anton text-base uppercase text-white tracking-wider">Acceso Dueño</h4>
                  <p className="text-[10px] text-slate-400">Introduce el PIN de edición</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
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
                className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 p-2.5 rounded-xl text-center text-white font-mono text-lg tracking-widest outline-none"
              />

              {pinError && (
                <p className="text-rose-400 text-[10.5px] font-bold text-center">{pinError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 border border-white/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-black uppercase text-black bg-amber-400 hover:bg-amber-300 shadow-md cursor-pointer"
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
