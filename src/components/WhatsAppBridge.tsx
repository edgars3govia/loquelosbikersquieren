'use client';

import React, { useState, useEffect } from 'react';
import { isTikTokOrInAppBrowser } from '../utils/tiktokDetector';
import { 
  STORE_WHATSAPP_VIP_CHANNEL, 
  getWhatsAppDirectUrl, 
  resolveWhatsAppTargetUrl 
} from '../constants/whatsapp';

/**
 * Icono vectorial oficial de WhatsApp (SVG auto-contenido)
 */
function WhatsAppIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.89-9.888 9.89m8.415-18.303A11.893 11.893 0 0012.046 0C5.467 0 .11 5.355.107 11.936c0 2.102.548 4.155 1.589 5.961L0 24l6.335-1.662a11.87 11.87 0 005.707 1.458h.005c6.578 0 11.934-5.356 11.937-11.938a11.85 11.85 0 00-3.484-8.441z"/>
    </svg>
  );
}

export interface WhatsAppBridgeProps {
  /**
   * 'chat': Enlace de contacto directo oficial con mensaje predeterminado
   * 'vip': Enlace de invitación al Canal VIP de WhatsApp
   */
  mode?: 'chat' | 'vip';
  forcedTargetUrl?: string;
}

export function WhatsAppBridge({ mode = 'chat', forcedTargetUrl }: WhatsAppBridgeProps) {
  const [isTikTok, setIsTikTok] = useState(false);
  const [targetUrl, setTargetUrl] = useState(() => {
    if (forcedTargetUrl) return forcedTargetUrl;
    if (mode === 'vip') return STORE_WHATSAPP_VIP_CHANNEL;
    return getWhatsAppDirectUrl('¡Hola! Me gustaría hacer una consulta sobre la tienda.');
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar si la URL actual en navegador es /canal
    const isVipPath = mode === 'vip' || window.location.pathname.startsWith('/canal');
    const defaultChatUrl = getWhatsAppDirectUrl('¡Hola! Me gustaría hacer una consulta sobre la tienda.');

    let resolvedUrl = forcedTargetUrl;
    if (!resolvedUrl) {
      if (isVipPath) {
        resolvedUrl = STORE_WHATSAPP_VIP_CHANNEL;
      } else {
        // En /whatsapp, respeta parámetros query opcionales o usa el chat oficial
        resolvedUrl = resolveWhatsAppTargetUrl(window.location.search) || defaultChatUrl;
      }
    }

    setTargetUrl(resolvedUrl);

    // Detección de WebView / In-App browser de TikTok
    const detectedTikTok = isTikTokOrInAppBrowser();
    setIsTikTok(detectedTikTok);
    setIsReady(true);

    // Redirección inmediata en navegadores estándar
    if (!detectedTikTok) {
      try {
        window.location.href = resolvedUrl;
      } catch (err) {
        console.error("Error en redirección automática:", err);
      }
    }
  }, [mode, forcedTargetUrl]);

  const isVipMode = mode === 'vip' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/canal'));

  // 1. CASO TIKTOK / IN-APP BROWSER: Mantener en pantalla con guía visual hacia los tres puntos
  if (isTikTok) {
    return (
      <main
        role="main"
        aria-label={isVipMode ? "Página puente Canal VIP para TikTok" : "Página puente de WhatsApp para TikTok"}
        className="fixed inset-0 z-[999999] bg-black text-white flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200 overflow-hidden"
      >
        {/* Flecha indicadora superior derecha apuntando hacia los tres puntos (•••) */}
        <div className="fixed top-2 right-4 sm:top-4 sm:right-6 pointer-events-none flex flex-col items-end z-[1000000] animate-bounce">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#25D366] drop-shadow-[0_2px_10px_rgba(37,211,102,0.6)]"
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
          <span className="text-[11px] font-medium text-[#25D366] bg-neutral-900/95 border border-[#25D366]/40 px-2.5 py-0.5 rounded-full shadow-lg mt-1 font-mono">
            Toca aquí •••
          </span>
        </div>

        {/* Tarjeta Modal Central */}
        <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 max-w-xs sm:max-w-sm w-full text-center shadow-2xl space-y-4 my-auto">
          {/* Icono central de WhatsApp */}
          <div className="w-16 h-16 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center mx-auto text-[#25D366] shadow-[0_0_24px_rgba(37,211,102,0.2)]">
            <WhatsAppIcon size={34} className="text-[#25D366] fill-current" />
          </div>

          {/* Badge de Canal VIP si corresponde */}
          {isVipMode && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#25D366]/20 to-[#128C7E]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-bold uppercase tracking-wider">
              <span>Canal VIP Oficial</span>
            </div>
          )}

          {/* Título */}
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
            {isVipMode ? "Para unirte al canal sin errores:" : "Para chatear sin errores:"}
          </h1>

          {/* Pasos requeridos */}
          <div className="bg-neutral-800/80 border border-neutral-750/60 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-neutral-700 text-[#25D366] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <p className="text-xs text-neutral-200 leading-relaxed">
                Toca los tres puntos (<strong className="text-white font-medium"> ••• </strong>) arriba a la derecha.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-neutral-700 text-[#25D366] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <p className="text-xs text-neutral-200 leading-relaxed">
                Selecciona <span className="text-white font-medium">&quot;Abrir en el navegador&quot;</span>.
              </p>
            </div>
          </div>

          {/* Enlace discreto abajo */}
          <div className="pt-2">
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-300 text-xs transition-colors underline underline-offset-4 cursor-pointer"
            >
              {isVipMode ? "Continuar al Canal VIP de todos modos" : "Continuar a WhatsApp de todos modos"}
            </a>
          </div>
        </div>
      </main>
    );
  }

  // 2. CASO NAVEGADOR ESTÁNDAR: Pantalla limpia de transición con redirección automática
  return (
    <main
      role="main"
      aria-label={isVipMode ? "Conectando con el Canal VIP de WhatsApp" : "Conectando con WhatsApp"}
      className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[#25D366] shadow-[0_0_30px_rgba(37,211,102,0.25)] animate-pulse">
          <WhatsAppIcon size={40} className="text-[#25D366] fill-current" />
        </div>
        <div className="absolute -inset-1 rounded-full border-2 border-[#25D366] border-t-transparent animate-spin" />
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
        {isVipMode ? "Conectando con el Canal VIP..." : "Conectando con WhatsApp..."}
      </h1>

      <p className="text-xs sm:text-sm text-neutral-400 max-w-xs mb-8 leading-relaxed">
        {isVipMode 
          ? "Te estamos redirigiendo automáticamente a nuestro Canal VIP de ofertas y lanzamientos."
          : "Te estamos redirigiendo automáticamente a nuestro chat oficial de WhatsApp."}
      </p>

      {/* Botón de fallback */}
      <a
        href={targetUrl}
        className="px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-98 transition-all text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#25D366]/20 cursor-pointer min-w-[220px]"
      >
        <WhatsAppIcon size={18} className="text-white fill-current shrink-0" />
        <span>{isVipMode ? "Entrar al Canal VIP ahora" : "Abrir chat de WhatsApp"}</span>
      </a>

      <p className="text-[11px] text-neutral-600 mt-4">
        Si no se abre automáticamente en unos segundos, presiona el botón de arriba.
      </p>
    </main>
  );
}

export default WhatsAppBridge;
