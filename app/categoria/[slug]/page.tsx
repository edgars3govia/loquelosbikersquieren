import React from 'react';
import { Metadata } from 'next';
import { getCategoryBySlug, getAllProducts, formatDirectImageUrl, DEFAULT_OG_IMAGE } from '../../../src/services/productsService';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug || '';
  const categoria = await getCategoryBySlug(slug);

  if (!categoria) {
    return {
      title: 'Categoría no encontrada | Lo que los bikers quieren',
      description: 'La categoría solicitada no se encuentra disponible.',
      robots: { index: false, follow: false },
    };
  }

  const pageUrl = `https://loquelosbikersquieren.vercel.app/categoria/${slug}`;
  const title = `Categoría: ${categoria} | Lo que los bikers quieren`;
  const description = `Explora los mejores accesorios y repuestos de ${categoria} para motos en Venezuela. Envíos nacionales e inventario actualizado.`;

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
          url: DEFAULT_OG_IMAGE,
          width: 800,
          height: 800,
          alt: `Categoría ${categoria}`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug || '';
  const categoria = await getCategoryBySlug(slug);
  const allProducts = await getAllProducts();

  const filteredProducts = allProducts.filter(p => {
    if (!categoria) return false;
    const cleanCat = categoria.toLowerCase();
    const pCat = (p.categoria || '').toLowerCase();
    return pCat === cleanCat || (Array.isArray(p.categorias) && p.categorias.some((c: string) => c.toLowerCase() === cleanCat));
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-zinc-950 text-sm">
              LQ
            </span>
            <span className="font-extrabold tracking-tight text-white text-base">
              LO QUE LOS BIKERS QUIEREN
            </span>
          </a>

          <a href="/" className="text-xs sm:text-sm font-semibold text-zinc-300 hover:text-amber-400 transition-colors">
            &larr; Ver Todo el Catálogo
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
            {categoria || 'Categoría no encontrada'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {filteredProducts.length} productos disponibles en esta categoría.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredProducts.map(p => {
            const img = formatDirectImageUrl(p.variante_imagen_hd || p.imagen_portada || p.imagen_url || p.link) || DEFAULT_OG_IMAGE;
            const pSlug = p.id;
            return (
              <a
                key={p.id}
                href={`/producto/${pSlug}`}
                className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 flex flex-col group hover:border-amber-500/50 transition-colors"
              >
                <div className="aspect-square w-full rounded-lg bg-zinc-950 overflow-hidden mb-2 flex items-center justify-center">
                  <img src={img} alt={p.nombre} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-200 line-clamp-2 mb-1 group-hover:text-amber-400">
                  {p.nombre}
                </h3>
                <span className="text-sm font-bold text-amber-400 mt-auto">
                  ${(Number(p.precio_venta_ref) || 0).toFixed(2)} USD
                </span>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
