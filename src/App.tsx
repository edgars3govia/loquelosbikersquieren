import React from 'react';
import { BikerStore } from './components/BikerStore';
import { TikTokInAppNotice } from './components/TikTokInAppNotice';

interface AppProps {
  initialProductSlug?: string;
  initialCategorySlug?: string;
}

export default function App({ initialProductSlug, initialCategorySlug }: AppProps = {}) {
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

