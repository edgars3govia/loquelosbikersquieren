import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950 font-sans">
      {/* Header Minimalista */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-zinc-950 text-sm shadow-md group-hover:scale-105 transition-transform">
              LQ
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-white text-base leading-tight">
                LO QUE LOS BIKERS QUIEREN
              </span>
              <span className="text-[10px] text-amber-400/90 font-medium tracking-wide">
                TIENDA DE ACCESORIOS & REPUESTOS
              </span>
            </div>
          </a>

          <a
            href="/"
            className="text-xs sm:text-sm font-semibold text-zinc-300 hover:text-amber-400 transition-colors"
          >
            &larr; Ir a la Tienda
          </a>
        </div>
      </header>

      {/* Contenido Central */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-3xl font-black shadow-lg shadow-amber-500/10">
            404
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs">
            🏍️
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
          Accesorio o Categoría No Encontrada
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8">
          El producto o enlace que intentas abrir no existe en nuestro inventario actual o ha sido actualizado. Explora nuestro catálogo completo con más de 70 referencias activas.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <a
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all shadow-lg shadow-amber-500/20 text-sm"
          >
            Ver Catálogo de Productos
          </a>

          <a
            href="https://wa.me/584241234567?text=%C2%A1Hola!%20Busco%20un%20accesorio%20o%20repuesto%20que%20no%20encontr%C3%A9%20en%20el%20cat%C3%A1logo."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold transition-all text-sm"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6 px-4 text-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} Lo Que Los Bikers Quieren. Accesorios y Repuestos para motos en Venezuela.</p>
      </footer>
    </div>
  );
}
