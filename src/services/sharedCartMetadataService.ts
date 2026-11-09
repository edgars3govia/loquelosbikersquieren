import type { Metadata } from 'next';
import { getAllProducts, formatDirectImageUrl, DEFAULT_OG_IMAGE } from './productsService';
import { findProductBySlugOrId } from '../utils/slugHelper';
import { formatTitleCase } from '../utils/textUtils';

const DEFAULT_TITLE = 'Lo que los bikers quieren | Tienda de Accesorios y Repuestos';
const DEFAULT_DESCRIPTION = 'Catálogo oficial de repuestos, cascos, chaquetas y accesorios para motos en Venezuela.';
const STORE_URL = 'https://www.loquelosbikersquieren.com';
const OFFICIAL_LOGO = 'https://www.loquelosbikersquieren.com/LOGO.png';

export async function getSharedCartMetadata(
  searchParams?: { [key: string]: string | string[] | undefined }
): Promise<Metadata> {
  // 1. Extraer el parámetro c o items
  const rawC = searchParams?.c || searchParams?.items || searchParams?.shared_cart;
  const cParam = typeof rawC === 'string' ? rawC.trim() : Array.isArray(rawC) ? rawC[0]?.trim() : '';

  // Si NO existe el parámetro 'c', retornar los metadatos globales predeterminados
  if (!cParam) {
    return {
      metadataBase: new URL(STORE_URL),
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      openGraph: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        url: STORE_URL,
        siteName: 'Lo que los bikers quieren',
        locale: 'es_VE',
        type: 'website',
        images: [
          {
            url: OFFICIAL_LOGO,
            width: 1200,
            height: 630,
            alt: 'Lo que los bikers quieren',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        images: [OFFICIAL_LOGO],
      },
    };
  }

  try {
    // 2. Consulta rápida de productos del catálogo en memoria/Firestore
    const allProducts = await getAllProducts();

    const parts = cParam.split(',');
    interface ResolvedItem {
      name: string;
      qty: number;
      price: number;
      imageUrl: string;
    }

    const resolvedItems: ResolvedItem[] = [];

    for (const part of parts) {
      const [rawId, rawQty] = part.split(':');
      if (!rawId) continue;
      const cleanId = rawId.trim();
      const qty = Math.max(1, parseInt(rawQty || '1', 10) || 1);

      const found = findProductBySlugOrId(allProducts, cleanId);
      if (found) {
        const rawImg = found.variante_imagen_hd ||
                       found.variante_imagen_miniatura ||
                       found.imagen_portada ||
                       found.imagen_url ||
                       found.link ||
                       (Array.isArray(found.imagenes) && found.imagenes[0]) ||
                       '';
        const formattedImg = formatDirectImageUrl(rawImg) || OFFICIAL_LOGO;
        const price = Number(found.precio_venta_ref || found.precio_mayor || 0);
        const name = formatTitleCase(found.grupo_nombre || found.nombre || 'Accesorio');

        resolvedItems.push({
          name,
          qty,
          price,
          imageUrl: formattedImg,
        });
      }
    }

    // 3. Estructuración del resumen dinámico
    let accessoriesSummary = '';
    let previewImage = OFFICIAL_LOGO;

    if (resolvedItems.length > 0) {
      previewImage = resolvedItems[0].imageUrl || OFFICIAL_LOGO;

      if (resolvedItems.length === 1) {
        const it = resolvedItems[0];
        accessoriesSummary = `${it.name}${it.qty > 1 ? ` (x${it.qty})` : ''}`;
      } else if (resolvedItems.length === 2) {
        const it1 = resolvedItems[0];
        const it2 = resolvedItems[1];
        accessoriesSummary = `${it1.name}${it1.qty > 1 ? ` (x${it1.qty})` : ''} + ${it2.name}${it2.qty > 1 ? ` (x${it2.qty})` : ''}`;
      } else {
        const firstTwo = resolvedItems.slice(0, 2).map(it => `${it.name}${it.qty > 1 ? ` (x${it.qty})` : ''}`).join(', ');
        const remaining = resolvedItems.length - 2;
        accessoriesSummary = `${firstTwo} y ${remaining} accesorio${remaining > 1 ? 's' : ''} más`;
      }
    } else {
      accessoriesSummary = 'Tus accesorios seleccionados';
    }

    // Especificación exacta solicitada:
    // og:title: "🛒 Tu pedido biker está listo | Lo que los bikers quieren"
    // og:description: "Incluye: [Nombres de los accesorios o cantidad]. Toca aquí para confirmar tus datos de encomienda y completar el pago."
    // og:image: Mantén el logo oficial o la imagen del primer producto del kit.
    const ogTitle = '🛒 Tu pedido biker está listo | Lo que los bikers quieren';
    const ogDescription = `Incluye: ${accessoriesSummary}. Toca aquí para confirmar tus datos de encomienda y completar el pago.`;
    const shareUrl = `${STORE_URL}/?c=${cParam}`;

    return {
      metadataBase: new URL(STORE_URL),
      title: ogTitle,
      description: ogDescription,
      alternates: {
        canonical: shareUrl,
      },
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        url: shareUrl,
        siteName: 'Lo que los bikers quieren',
        locale: 'es_VE',
        type: 'website',
        images: [
          {
            url: previewImage,
            width: 1200,
            height: 630,
            alt: 'Tu pedido biker',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description: ogDescription,
        images: [previewImage],
      },
    };
  } catch (err) {
    console.error('Error generating shared cart dynamic metadata:', err);
    const ogTitle = '🛒 Tu pedido biker está listo | Lo que los bikers quieren';
    const ogDescription = 'Incluye: Tus accesorios seleccionados. Toca aquí para confirmar tus datos de encomienda y completar el pago.';
    return {
      metadataBase: new URL(STORE_URL),
      title: ogTitle,
      description: ogDescription,
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        url: STORE_URL,
        siteName: 'Lo que los bikers quieren',
        locale: 'es_VE',
        type: 'website',
        images: [
          {
            url: OFFICIAL_LOGO,
            width: 1200,
            height: 630,
            alt: 'Lo que los bikers quieren',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description: ogDescription,
        images: [OFFICIAL_LOGO],
      },
    };
  }
}
