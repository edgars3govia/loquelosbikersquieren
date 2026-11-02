import React from 'react';
import { Metadata } from 'next';
import { getProductBySlug } from '../../../src/services/productsService';
import ProductoVistaCliente from './ProductoVistaCliente';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

/**
 * Inyección de Metadatos Server-Side para WhatsApp, Facebook y buscadores.
 * Se ejecuta exclusivamente en el servidor sin directiva "use client".
 * Protegido con try/catch para evitar colapsos SSR.
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
        title: 'Producto | Lo que los bikers quieren',
        description: 'Accesorios y repuestos exclusivos para moteros en Venezuela.',
      };
    }

    const pageUrl = `https://www.loquelosbikersquieren.com/producto/${slug}`;
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
 * Totalmente aislado del cliente (sin hooks ni llamadas a window/document).
 *
 * Hibridación a prueba de fallos:
 * Si la consulta en el servidor falla por falta de variables de entorno en Vercel,
 * se captura el error y se pasa el slug al Client Component ProductoVistaCliente
 * para que realice la consulta directamente desde el navegador sin arrojar error 500.
 */
export default async function ProductPage({ params }: PageProps) {
  let slug = '';
  try {
    const resolved = await params;
    slug = resolved?.slug || '';
  } catch (err) {
    console.warn('Error resolving product params:', err);
  }

  let producto = null;
  if (slug) {
    try {
      producto = await getProductBySlug(slug);
    } catch (err) {
      console.warn('Server-side getProductBySlug fallback triggered:', err);
      producto = null;
    }
  }

  return <ProductoVistaCliente slug={slug} initialProduct={producto} />;
}
