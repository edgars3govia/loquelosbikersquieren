import fs from 'fs';
import path from 'path';
import { getProductBySlug, getCategoryBySlug, formatDirectImageUrl, DEFAULT_OG_IMAGE } from '../src/services/productsService.js';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  try {
    const url = req.url || '/';
    const host = req.headers['x-forwarded-host'] || req.headers?.host || 'loquelosbikersquieren.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${proto}://${host}`;

    // 1. Manejo de endpoint API para depuración de OG en JSON
    if (url.startsWith('/api/og/producto/')) {
      const slug = url.replace('/api/og/producto/', '').split('?')[0];
      const product = await getProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      return res.status(200).json({
        title: `${product.nombre} | Lo que los bikers quieren`,
        description: product.descripcion,
        image: product.imagenUrl,
        image_width: 800,
        image_height: 800,
        url: `${siteUrl}/producto/${product.slug || slug}`,
        product,
      });
    }

    // 2. Obtener plantilla HTML base de forma segura (sin invocar __dirname en ESM)
    let template = '';
    const possiblePaths = [
      path.join(process.cwd(), 'dist', 'index.html'),
      path.join(process.cwd(), 'index.html'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          template = fs.readFileSync(p, 'utf-8');
          break;
        } catch {
          // Continuar con la siguiente ruta
        }
      }
    }

    if (!template) {
      template = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lo que los bikers quieren</title>
</head>
<body class="bg-zinc-950 text-white">
  <div id="root"></div>
</body>
</html>`;
    }

    // 3. Resolver metadatos específicos según la ruta dinámica
    let title = 'Lo que los bikers quieren | Tienda de Accesorios y Repuestos';
    let description = 'Catálogo oficial de repuestos, cascos, chaquetas y accesorios para motos en Venezuela.';
    let ogImage = DEFAULT_OG_IMAGE;
    let canonicalUrl = `${siteUrl}${url.split('?')[0]}`;
    let ogType = 'website';
    let jsonLd: any = null;
    let isNotFound = false;

    if (url.startsWith('/producto/')) {
      const slug = url.replace('/producto/', '').split('?')[0].split('/')[0];
      let product = null;
      try {
        product = await getProductBySlug(slug);
      } catch (err) {
        console.warn('Error fetching product for OG in /api handler:', err);
      }

      if (product) {
        const pPrice = product.precioVentaUSD > 0 ? ` - $${product.precioVentaUSD.toFixed(2)} USD` : '';
        title = `${product.nombre}${pPrice} | Lo que los bikers quieren`;
        description = product.descripcion || `Compra ${product.nombre} al mejor precio en Venezuela. Envíos nacionales.`;
        ogImage = product.imagenUrl || DEFAULT_OG_IMAGE;
        canonicalUrl = `${siteUrl}/producto/${product.slug || slug}`;
        ogType = 'product';

        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.nombre,
          image: [ogImage],
          description,
          sku: product.sku || product.id,
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'USD',
            price: product.precioVentaUSD.toFixed(2),
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        };
      } else {
        isNotFound = true;
        title = 'Producto no encontrado | Lo que los bikers quieren';
        description = 'El accesorio que buscas no está disponible o ha cambiado de enlace.';
      }
    } else if (url.startsWith('/categoria/')) {
      const slug = url.replace('/categoria/', '').split('?')[0].split('/')[0];
      let categoria = null;
      try {
        categoria = await getCategoryBySlug(slug);
      } catch (err) {
        console.warn('Error fetching category for OG in /api handler:', err);
      }

      if (categoria) {
        title = `Categoría: ${categoria} | Lo que los bikers quieren`;
        description = `Catálogo de ${categoria} para motos en Venezuela. Envíos nacionales asegurados por MRW y Domesa.`;
        canonicalUrl = `${siteUrl}/categoria/${slug}`;
      } else {
        isNotFound = true;
        title = 'Categoría no encontrada | Lo que los bikers quieren';
        description = 'La categoría solicitada no se encuentra disponible.';
      }
    }

    // Asegurar protocolo https:// en la imagen para WhatsApp
    if (ogImage && ogImage.startsWith('http://')) {
      ogImage = ogImage.replace('http://', 'https://');
    }

    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const safeImg = escapeHtml(ogImage);
    const safeUrl = escapeHtml(canonicalUrl);

    const headInject = `
    <!-- Metadatos Dinámicos Inyectados por Servidor (Open Graph & WhatsApp) -->
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />

    <!-- Open Graph / WhatsApp / Facebook -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="Lo que los bikers quieren" />
    <meta property="og:locale" content="es_VE" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImg}" />
    <meta property="og:image:secure_url" content="${safeImg}" />
    <meta property="og:image:width" content="800" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${safeTitle}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImg}" />
    ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
  `;

    let finalHtml = template;
    finalHtml = finalHtml.replace(/<title>[\s\S]*?<\/title>/i, '');
    finalHtml = finalHtml.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    finalHtml = finalHtml.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
    finalHtml = finalHtml.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

    if (finalHtml.includes('</head>')) {
      finalHtml = finalHtml.replace('</head>', `${headInject}\n</head>`);
    } else {
      finalHtml = `${headInject}\n${finalHtml}`;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    return res.status(isNotFound ? 404 : 200).send(finalHtml);
  } catch (globalError) {
    console.error('Fatal crash prevented in /api serverless function:', globalError);
    // En caso de cualquier error imprevisto, retornar un HTML funcional sin colapsar con 500
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lo que los bikers quieren</title>
</head>
<body class="bg-zinc-950 text-white">
  <div id="root"></div>
</body>
</html>`);
  }
}
