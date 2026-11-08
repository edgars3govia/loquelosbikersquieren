'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const WhatsAppBridge = dynamic(
  () => import('../../src/components/WhatsAppBridge').then((mod) => mod.WhatsAppBridge),
  { ssr: false }
);

export default function WhatsAppBridgeClient() {
  return <WhatsAppBridge mode="chat" />;
}
