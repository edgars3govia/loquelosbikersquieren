import React from 'react';
import { BikerStore } from './components/BikerStore';

export default function App() {
  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col justify-between selection:bg-[#FFC107] selection:text-black">
      {/* Tienda Oficial */}
      <BikerStore isAdmin={false} />
    </div>
  );
}

