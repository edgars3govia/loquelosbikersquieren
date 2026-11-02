import React from 'react';
import { Metadata } from 'next';
import { getProductBySlug } from '../../../src/services/productsService';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

/**
 * Inyección de Metadatos Server-Side para WhatsApp, Facebook y buscadores.
 * Se ejecuta en el servidor sin la directiva "use client".
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug || '';
  const producto = await getProductBySlug(slug);

  if (!producto) {
    return {
      title: 'Producto no encontrado | Lo que los bikers quieren',
      description: 'El accesorio que buscas no está disponible o ha cambiado de enlace.',
      robots: { index: false, follow: false },
    };
  }

  const pageUrl = `https://loquelosbikersquieren.vercel.app/producto/${slug}`;
  const title = `${producto.nombre} | Lo que los bikers quieren`;
  const description = producto.descripcion || 'Accesorios, repuestos y equipamiento exclusivo para moteros en Venezuela.';

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Lo que los bikers quieren',
      locale: 'es_VE',
      images: [
        {
          url: producto.imagenUrl, // Garantizado formato directo "https://..."
          width: 800,
          height: 800,
          alt: producto.nombre,
          type: 'image/jpeg',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [producto.imagenUrl],
    },
  };
}

/**
 * Página física de producto individual para evitar 404 NOT_FOUND en Vercel.
 * Renderiza la vista detallada del accesorio con botón directo a WhatsApp y enlace al catálogo completo.
 */
export default async function ProductPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug || '';
  const producto = await getProductBySlug(slug);

  if (!producto) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 text-2xl font-bold">
          !
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Producto No Encontrado</h1>
        <p className="text-zinc-400 max-w-md mb-6">
          El accesorio o repuesto con el identificador &quot;{slug}&quot; no existe en nuestro inventario o fue retirado temporalmente.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all shadow-lg shadow-amber-500/20"
        >
          Explorar Catálogo Completo
        </a>
      </main>
    );
  }

  // Enlace directo a WhatsApp con mensaje pre-rellenado
  const whatsappMsg = encodeURIComponent(
    `¡Hola! Estoy interesado en el producto "${producto.nombre}" (SKU: ${producto.sku || producto.id}) que vi en su catálogo: https://loquelosbikersquieren.vercel.app/producto/${slug}`
  );
  const whatsappUrl = `https://wa.me/584241234567?text=${whatsappMsg}`;

  // Schema.org estructurado para Google Search
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    image: producto.imagenes.length > 0 ? producto.imagenes : [producto.imagenUrl],
    description: producto.descripcion,
    sku: producto.sku || producto.id,
    brand: {
      '@type': 'Brand',
      name: 'Lo Que Los Bikers Quieren',
    },
    offers: {
      '@type': 'Offer',
      url: `https://loquelosbikersquieren.vercel.app/producto/${slug}`,
      priceCurrency: 'USD',
      price: producto.precioVentaUSD > 0 ? producto.precioVentaUSD.toFixed(2) : '0.00',
      availability: producto.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-zinc-950">
      {/* Schema.org JSON-LD para SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header Superior */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-8">
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
            className="text-xs sm:text-sm font-semibold text-zinc-300 hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            &larr; Ver Catálogo
          </a>
        </div>
      </header>

      {/* Contenido Principal del Producto */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-zinc-400 mb-6 flex-wrap">
          <a href="/" className="hover:text-amber-400 transition-colors">Inicio</a>
          <span>/</span>
          {producto.categoria && (
            <>
              <a
                href={`/categoria/${producto.categoria.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="hover:text-amber-400 transition-colors"
              >
                {producto.categoria}
              </a>
              <span>/</span>
            </>
          )}
          <span className="text-zinc-200 font-medium truncate max-w-[200px] sm:max-w-xs">
            {producto.nombre}
          </span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Columna Izquierda: Imagen Principal y Galería */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center group">
              {producto.imagenUrl ? (
                <img
                  src={producto.imagenUrl}
                  alt={producto.nombre}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  loading="eager"
                />
              ) : (
                <div className="text-zinc-600 font-medium text-sm">Sin imagen disponible</div>
              )}

              {/* Badge de Stock */}
              <div className="absolute top-4 left-4">
                {producto.stock > 0 ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
                    ● En Stock ({producto.stock} disponibles)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 backdrop-blur-md">
                    Bajo Pedido
                  </span>
                )}
              </div>
            </div>

            {/* Miniaturas de galería si hay más fotos */}
            {producto.imagenes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {producto.imagenes.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="w-16 h-16 rounded-xl border border-zinc-800 overflow-hidden flex-shrink-0 bg-zinc-950 p-1 cursor-pointer hover:border-amber-500 transition-colors"
                  >
                    <img src={imgUrl} alt={`${producto.nombre} - vista ${idx + 1}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Información del Producto */}
          <div className="flex flex-col">
            {/* Categoría y SKU */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
                {producto.categoria}
              </span>
              {producto.sku && (
                <span className="text-xs text-zinc-500 font-mono">
                  SKU: {producto.sku}
                </span>
              )}
            </div>

            {/* Título Principal */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
              {producto.nombre}
            </h1>

            {/* Precios */}
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-amber-400">
                  ${producto.precioVentaUSD.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  USD Ref.
                </span>
              </div>

              {producto.precioMayorUSD > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                  <span>Precio al mayor:</span>
                  <span className="font-bold text-zinc-200">${producto.precioMayorUSD.toFixed(2)} USD</span>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
                Descripción & Características
              </h3>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                {producto.descripcion}
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.77.814 2.796.814 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.589-5.766-5.768-5.766zm9.969 5.766c0 5.503-4.497 10-10 10-1.745 0-3.385-.45-4.819-1.238l-5.181 1.3 1.341-4.908c-.879-1.488-1.341-3.21-1.341-5.154 0-5.503 4.497-10 10-10 5.503 0 10 4.497 10 10z" />
                </svg>
                Pedir por WhatsApp Ahora
              </a>

              <a
                href={`/?producto=${producto.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors text-sm"
              >
                Abrir en Catálogo Interactivo
              </a>
            </div>

            {/* Envíos e Información de Seguridad */}
            <div className="mt-6 pt-6 border-t border-zinc-800/80 grid grid-cols-2 gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-base">🚚</span>
                <span>Envíos nacionales por MRW / Domesa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base">🛡️</span>
                <span>Garantía de calidad garantizada</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6 px-4 text-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} Lo Que Los Bikers Quieren. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
