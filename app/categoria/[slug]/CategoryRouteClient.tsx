'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// Carga dinámica del catálogo con SSR deshabilitado para evitar cualquier acceso a window/document/localStorage en el servidor
const App = dynamic(() => import('../../../src/App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-amber-500">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
      <span className="text-sm font-semibold tracking-wide text-zinc-300">Cargando categoría...</span>
    </div>
  ),
});

interface CategoryRouteClientProps {
  slug: string;
  initialCategory?: string;
}

export default function CategoryRouteClient({ slug: initialSlug, initialCategory }: CategoryRouteClientProps) {
  const params = useParams();
  const slugFromParams = typeof params?.slug === 'string'
    ? params.slug
    : (Array.isArray(params?.slug) ? params.slug[0] : '');
  const activeSlug = slugFromParams || initialSlug;

  return <App initialCategorySlug={activeSlug} />;
}
