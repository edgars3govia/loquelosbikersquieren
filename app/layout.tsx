import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../src/index.css';
import { TikTokInAppNotice } from '../src/components/TikTokInAppNotice';

export const metadata: Metadata = {
  metadataBase: new URL('https://loquelosbikersquieren.vercel.app'),
  title: 'Lo que los bikers quieren | Tienda de Accesorios y Repuestos',
  description: 'Catálogo oficial de repuestos, cascos, chaquetas y accesorios para motos en Venezuela.',
  icons: {
    icon: '/logo-biker.svg',
  },
  openGraph: {
    siteName: 'Lo que los bikers quieren',
    locale: 'es_VE',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {children}
        <TikTokInAppNotice />
      </body>
    </html>
  );
}
