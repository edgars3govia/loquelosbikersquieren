'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('../src/App'), { ssr: false });

export default function HomePageClient() {
  return <App />;
}
