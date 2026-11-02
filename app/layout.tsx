import React from 'react';
import type { Metadata } from 'next';
import '../src/index.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://loquelosbikersquieren.vercel.app'),
  title: 'Lo que los bikers quieren | Tienda de Accesorios y Repuestos',
  description: 'Catálogo oficial de repuestos, cascos, chaquetas y accesorios para motos en Venezuela.',
  openGraph: {
    siteName: 'Lo que los bikers quieren',
    locale: 'es_VE',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="theme-color" content="#09090b" />
        <link rel="icon" type="image/svg+xml" href="/logo-biker.svg" />
      </head>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
