import { MetadataRoute } from 'next';
import { getAllProducts } from '../src/services/productsService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.loquelosbikersquieren.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  try {
    const products = await getAllProducts();
    const productRoutes: MetadataRoute.Sitemap = products
      .filter((p) => p && (p.slug || p.id))
      .map((p) => ({
        url: `${baseUrl}/producto/${p.slug || p.id}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));

    return [...staticRoutes, ...productRoutes];
  } catch (e) {
    console.warn('Error building sitemap:', e);
    return staticRoutes;
  }
}
