import React from 'react';
import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getSharedCartMetadata } from '../src/services/sharedCartMetadataService';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

/**
 * Vista previa dinámica y personalizada en WhatsApp (generateMetadata SSR).
 * Responde a los rastreadores de Meta/WhatsApp generando el HTML del lado del servidor
 * con las etiquetas <meta property="og:title"> y <meta property="og:description"> actualizadas.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await searchParams;
    const rawC = resolvedParams?.c || resolvedParams?.items || resolvedParams?.shared_cart;
    const c = typeof rawC === 'string' ? rawC.trim() : (Array.isArray(rawC) ? rawC[0]?.trim() : undefined);

    if (c) {
      return await getSharedCartMetadata(c);
    }
    return await getSharedCartMetadata();
  } catch (err) {
    console.error('Error in HomePage generateMetadata:', err);
    return await getSharedCartMetadata();
  }
}

export default function HomePage() {
  return <HomePageClient />;
}
