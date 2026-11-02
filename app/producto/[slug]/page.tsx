import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '../../../src/services/productsService';
import ProductRouteClient from './ProductRouteClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

/**
 * Inyección de Metadatos Server-Side para WhatsApp, Facebook y buscadores.
 * Se ejecuta exclusivamente en el servidor sin directiva "use client".
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug || '';
    if (!slug) {
      return {
        title: 'Producto no encontrado | Lo que los bikers quieren',
      };
    }

    const producto = await getProductBySlug(slug);

    if (!producto) {
      return {
        title: 'Producto no encontrado | Lo que los bikers quieren',
        description: 'El accesorio que buscas no está disponible o ha cambiado de enlace.',
        robots: { index: false, follow: false },
      };
    }

    const pageUrl = `https://loquelosbikersquieren.vercel.app/producto/${slug}`;
    const priceText = producto.precioVentaUSD > 0 ? ` - $${producto.precioVentaUSD.toFixed(2)} USD` : '';
    const title = `${producto.nombre}${priceText} | Lo que los bikers quieren`;
    const description = producto.descripcion || 'Accesorios, repuestos y equipamiento exclusivo para moteros en Venezuela.';

    return {
      title,
      description,
      alternates: {
        canonical: pageUrl,
      },
      openGraph: {
        title: `${producto.nombre}${priceText}`,
        description,
        url: pageUrl,
        siteName: 'Lo que los bikers quieren',
        locale: 'es_VE',
        type: 'website',
        images: [
          {
            url: producto.imagenUrl,
            width: 800,
            height: 800,
            alt: producto.nombre,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${producto.nombre}${priceText}`,
        description,
        images: [producto.imagenUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata in /producto/[slug]:', error);
    return {
      title: 'Accesorio para moto | Lo que los bikers quieren',
      description: 'Accesorios y repuestos exclusivos para moteros en Venezuela.',
    };
  }
}

/**
 * Server Component principal de la ruta física /producto/[slug].
 * Verifica la existencia del producto sin colapsar el SSR y delega la interfaz
 * al Client Component interactivo que sincroniza con el modal de la tienda.
 */
export default async function ProductPage({ params }: PageProps) {
  let slug = '';
  try {
    const resolved = await params;
    slug = resolved?.slug || '';
  } catch (err) {
    console.warn('Error resolving product params:', err);
    notFound();
  }

  if (!slug) {
    notFound();
  }

  let producto = null;
  try {
    producto = await getProductBySlug(slug);
  } catch (err) {
    console.error('Error fetching product in ProductPage:', err);
  }

  // Si el producto no existe en la base de datos, retornar 404 amigable
  if (!producto) {
    notFound();
  }

  return <ProductRouteClient slug={slug} />;
}
