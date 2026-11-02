'use client';

import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

let activeNoticeMounted = false;

export function TikTokInAppNotice() {
  const [isTikTok, setIsTikTok] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    if (activeNoticeMounted) {
      return;
    }
    activeNoticeMounted = true;

    // Diagnóstico en consola para auditar UserAgent y Referrer en dispositivos reales
    console.log("TikTokInAppNotice montado. UserAgent:", navigator.userAgent, "Referrer:", document.referrer);

    const ua = (navigator.userAgent || '').toLowerCase();
    const ref = (document.referrer || '').toLowerCase();
    const isTikTokUA = /musical_ly|bytedance|tiktok|trill|bytefull/.test(ua);
    const isTikTokRef = ref.includes('tiktok') || ref.includes('tiktoklinksafety');
    const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
    const isIOSWebView = /(iphone|ipod|ipad)/.test(ua) && !ua.includes('safari');
    const isTestMode = window.location.search.includes('tiktok_test=1');

    if (isTikTokUA || isTikTokRef || isAndroidWebView || isIOSWebView || isTestMode) {
      setIsTikTok(true);
    }

    return () => {
      activeNoticeMounted = false;
    };
  }, []);

  if (!isTikTok || isDismissed) {
    return null;
  }

  return (
    <div
      id="tiktok-inapp-notice-root"
      role="dialog"
      aria-modal="true"
      aria-label="Aviso para navegador de TikTok"
      className="fixed inset-0 z-[999999] pointer-events-auto bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      {/* Flecha indicadora superior derecha apuntando hacia los tres puntos (•••) */}
      <div className="fixed top-2 right-4 sm:top-4 sm:right-6 pointer-events-none flex flex-col items-end z-[1000000] animate-bounce">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]"
        >
          {/* Arco curvo ascendente hacia la esquina superior derecha */}
          <path
            d="M 12 52 C 16 32, 34 16, 54 10"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Punta de flecha apuntando a los tres puntos */}
          <path
            d="M 40 8 L 56 10 L 53 26"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] font-medium text-emerald-400 bg-neutral-900/90 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-md mt-1 font-mono">
          Toca aquí •••
        </span>
      </div>

      {/* Tarjeta Modal Compacta */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl space-y-4 my-auto">
        {/* Icono central de mundo/web */}
        <div className="w-14 h-14 rounded-full bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
          <Globe size={28} strokeWidth={1.8} />
        </div>

        {/* Título exacto */}
        <h3 className="text-base font-semibold text-white tracking-tight leading-snug">
          Para ver la tienda sin errores:
        </h3>

        {/* Pasos numerados dentro de una caja gris sutil */}
        <div className="bg-neutral-800/70 border border-neutral-750/50 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-neutral-700 text-emerald-400 text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed">
              Toca los tres puntos (<strong className="text-white font-medium"> ••• </strong>) arriba a la derecha.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-neutral-700 text-emerald-400 text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed">
              Selecciona <span className="text-white font-medium">&quot;Abrir en el navegador&quot;</span>.
            </p>
          </div>
        </div>

        {/* Enlace de salida */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-neutral-500 hover:text-neutral-300 text-xs transition-colors cursor-pointer bg-transparent border-0 p-0 focus:outline-none"
          >
            Continuar en TikTok
          </button>
        </div>
      </div>
    </div>
  );
}
export default TikTokInAppNotice;
