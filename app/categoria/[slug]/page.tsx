import React from 'react';
import { Metadata } from 'next';
import { getCategoryBySlug, DEFAULT_OG_IMAGE } from '../../../src/services/productsService';
import CategoryRouteClient from './CategoryRouteClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug || '';
    if (!slug) {
      return {
        title: 'Categoría | Lo que los bikers quieren',
      };
    }

    const categoria = await getCategoryBySlug(slug);

    if (!categoria) {
      return {
        title: 'Categoría de Accesorios | Lo que los bikers quieren',
        description: 'Explora los mejores accesorios y repuestos para motos en Venezuela.',
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
        type: 'website',
        images: [
          {
            url: DEFAULT_OG_IMAGE,
            width: 800,
            height: 800,
            alt: `Categoría ${categoria}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [DEFAULT_OG_IMAGE],
      },
    };
  } catch (error) {
    console.error('Error generating metadata in /categoria/[slug]:', error);
    return {
      title: 'Categorías | Lo que los bikers quieren',
      description: 'Accesorios y repuestos para motos en Venezuela.',
    };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  let slug = '';
  try {
    const resolved = await params;
    slug = resolved?.slug || '';
  } catch (err) {
    console.warn('Error resolving category params:', err);
  }

  let categoria: string | null = null;
  if (slug) {
    try {
      categoria = await getCategoryBySlug(slug);
    } catch (err) {
      console.warn('Server-side getCategoryBySlug fallback triggered:', err);
      categoria = null;
    }
  }

  return <CategoryRouteClient slug={slug} initialCategory={categoria || undefined} />;
}
