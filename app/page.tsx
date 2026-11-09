import React from 'react';
import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getSharedCartMetadata } from '../src/services/sharedCartMetadataService';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

/**
 * Vista previa dinámica y personalizada en WhatsApp (generateMetadata SSR).
 * Responde a rastreadores de WhatsApp/Meta con el resumen real del pedido si existe el parámetro 'c'.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  try {
    const resolvedSearchParams = await searchParams;
    return await getSharedCartMetadata(resolvedSearchParams);
  } catch (err) {
    console.error('Error in HomePage generateMetadata:', err);
    return await getSharedCartMetadata();
  }
}

export default function HomePage() {
  return <HomePageClient />;
}
