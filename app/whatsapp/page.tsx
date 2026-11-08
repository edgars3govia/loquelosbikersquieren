import React from 'react';
import { Metadata } from 'next';
import WhatsAppBridgeClient from './WhatsAppBridgeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Atención por WhatsApp | Lo que los bikers quieren',
  description: 'Canal oficial y atención directa por WhatsApp de Lo que los bikers quieren.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Atención por WhatsApp | Lo que los bikers quieren',
    description: 'Chatea directamente con nosotros por WhatsApp o ingresa a nuestro canal VIP.',
    url: 'https://www.loquelosbikersquieren.com/whatsapp',
    siteName: 'Lo que los bikers quieren',
    locale: 'es_VE',
    type: 'website',
    images: [
      {
        url: 'https://www.loquelosbikersquieren.com/LOGO.png',
        width: 1200,
        height: 630,
        alt: 'Lo que los bikers quieren - WhatsApp',
      },
    ],
  },
};

export default function WhatsAppPage() {
  return <WhatsAppBridgeClient />;
}
