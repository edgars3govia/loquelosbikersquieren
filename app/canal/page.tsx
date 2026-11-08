import React from 'react';
import { Metadata } from 'next';
import CanalBridgeClient from './CanalBridgeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Canal VIP de WhatsApp | Lo que los bikers quieren',
  description: 'Únete a nuestro canal VIP oficial de WhatsApp para recibir ofertas exclusivas, novedades y lanzamientos de accesorios para motos.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Canal VIP de WhatsApp | Lo que los bikers quieren',
    description: 'Únete al canal VIP oficial para recibir ofertas y lanzamientos antes que nadie.',
    url: 'https://www.loquelosbikersquieren.com/canal',
    siteName: 'Lo que los bikers quieren',
    locale: 'es_VE',
    type: 'website',
    images: [
      {
        url: 'https://www.loquelosbikersquieren.com/LOGO.png',
        width: 1200,
        height: 630,
        alt: 'Canal VIP de WhatsApp - Lo que los bikers quieren',
      },
    ],
  },
};

export default function CanalPage() {
  return <CanalBridgeClient />;
}
