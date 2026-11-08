import React, { useState, useEffect } from 'react';
import { BikerStore } from './components/BikerStore';
import { TikTokInAppNotice } from './components/TikTokInAppNotice';
import { WhatsAppBridge } from './components/WhatsAppBridge';

interface AppProps {
  initialProductSlug?: string;
  initialCategorySlug?: string;
}

export default function App({ initialProductSlug, initialCategorySlug }: AppProps = {}) {
  const [bridgeMode, setBridgeMode] = useState<'chat' | 'vip' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/canal')) {
        setBridgeMode('vip');
      } else if (pathname.startsWith('/whatsapp')) {
        setBridgeMode('chat');
      }
    }
  }, []);

  if (bridgeMode) {
    return <WhatsAppBridge mode={bridgeMode} />;
  }

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col justify-between selection:bg-[#FFC107] selection:text-black">
      {/* Tienda Oficial */}
      <BikerStore 
        isAdmin={false} 
        initialProductSlug={initialProductSlug}
        initialCategorySlug={initialCategorySlug}
      />
      <TikTokInAppNotice />
    </div>
  );
}

