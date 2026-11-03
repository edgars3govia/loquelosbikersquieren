import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { slugify, getProductSlug, findProductBySlugOrId, findCategoryBySlug } from '../utils/slugHelper';
import { removeAccents, formatTitleCase } from '../utils/textUtils';

// Configuración segura con soporte para variables de entorno de Vercel y fallback al archivo de configuración
const resolvedFirebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-c0bff50d-0bf4-4cb2-83dc-2712ee3eb530',
};

let dbInstance: any = null;
function getDb() {
  if (!dbInstance) {
    try {
      const app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();
      const firestoreDbId = resolvedFirebaseConfig.firestoreDatabaseId;
      try {
        dbInstance = initializeFirestore(app, {}, firestoreDbId);
      } catch {
        dbInstance = getFirestore(app, firestoreDbId);
      }
    } catch (err) {
      console.warn('Firebase initialization in productsService warning:', err);
      return null;
    }
  }
  return dbInstance;
}

export interface ProductDetails {
  id: string;
  sku?: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  imagenes: string[];
  precioVentaUSD: number;
  precioMayorUSD: number;
  precioGranMayorUSD: number;
  precioBS?: number;
  stock: number;
  categoria: string;
  subcategoria?: string;
  slug: string;
  grupo_nombre?: string;
  variante_nombre?: string;
  es_kit?: boolean;
  raw?: any;
}

// Extrae el ID de archivo de Google Drive
export function extractDriveFileId(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const url = rawUrl.trim();
  if (!url) return '';

  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  if (!url.includes('/') && !url.includes('.') && /^[a-zA-Z0-9_-]{10,}$/.test(url)) {
    return url;
  }
  return '';
}

// Formatea la URL directa de la imagen para que siempre comience con https://
export function formatDirectImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  const lower = url.toLowerCase();
  if (
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'none' ||
    lower === 'false' ||
    lower === 'true' ||
    lower === 'sin foto' ||
    lower === 'sin_foto'
  ) {
    return '';
  }

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  // Google Drive ID directo
  if (!url.includes('/') && !url.includes('.') && /^[a-zA-Z0-9_-]{10,}$/.test(url)) {
    return `https://lh3.googleusercontent.com/d/${url}`;
  }

  // Enlaces de Google Drive
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                        url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                        url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  // Enlaces Dropbox
  if (url.includes('dropbox.com')) {
    url = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    url = url.replace(/[?&]dl=0/, '?dl=1');
  }

  // Asegurar protocolo https:// y resolver rutas relativas
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  } else if (!url.startsWith('https://')) {
    if (url.startsWith('/')) {
      url = `https://www.loquelosbikersquieren.com${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  // Aplicar encodeURI para escapar espacios y caracteres especiales en WhatsApp
  try {
    url = encodeURI(url);
  } catch {}

  return url;
}

// Imagen por defecto corporativa en caso de no poseer imagen específica
export const DEFAULT_OG_IMAGE = 'https://www.loquelosbikersquieren.com/LOGO.png';

// Caché en memoria para respuestas ultra rápidas (< 10ms) en rastreadores de WhatsApp/Facebook
let cachedProducts: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

export async function getAllProducts(): Promise<any[]> {
  const now = Date.now();
  if (cachedProducts && now - lastCacheTime < CACHE_TTL) {
    return cachedProducts;
  }

  try {
    const db = getDb();
    if (!db) return cachedProducts || [];
    const snap = await getDocs(collection(db, 'productos'));
    const list = snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
      };
    });
    cachedProducts = list;
    lastCacheTime = now;
    return list;
  } catch (error) {
    console.warn('Firestore fetch products note/fallback:', error);
    return cachedProducts || [];
  }
}

/**
 * Consulta un producto por su slug, ID o SKU directamente desde Firestore.
 * Diseñado especialmente para generateMetadata de Next.js App Router y rutas SSR.
 */
export async function getProductBySlug(param: string): Promise<ProductDetails | null> {
  if (!param) return null;

  try {
    const products = await getAllProducts();
    const raw = findProductBySlugOrId(products, param);

    let targetProduct = raw;
    if (!targetProduct) {
      // Si no se encontró en la lista cacheadas, buscar directamente por ID de documento
      try {
        const db = getDb();
        if (db) {
          const directDoc = await getDoc(doc(db, 'productos', param));
          if (directDoc.exists()) {
            targetProduct = { id: directDoc.id, ...directDoc.data() } as any;
          }
        }
      } catch (e) {
        console.warn('Direct Firestore doc lookup warning:', e);
      }
    }

    if (!targetProduct) return null;

    // Extraer la mejor imagen disponible del producto
    const rawImage = targetProduct.variante_imagen_hd ||
                     targetProduct.imagen_portada ||
                     targetProduct.imagen_url ||
                     targetProduct.link ||
                     (Array.isArray(targetProduct.imagenes) && targetProduct.imagenes[0]) ||
                     targetProduct.grupo_kit_imagen ||
                     '';

    let formattedImage = formatDirectImageUrl(rawImage);
    if (!formattedImage || !formattedImage.startsWith('https://')) {
      formattedImage = DEFAULT_OG_IMAGE;
    }

    // Recopilar galería de imágenes
    const gallery: string[] = [];
    if (formattedImage) gallery.push(formattedImage);
    if (Array.isArray(targetProduct.imagenes)) {
      targetProduct.imagenes.forEach((img: string) => {
        const f = formatDirectImageUrl(img);
        if (f && !gallery.includes(f)) gallery.push(f);
      });
    }
    if (Array.isArray(targetProduct.imagenes_secundarias)) {
      targetProduct.imagenes_secundarias.forEach((img: string) => {
        const f = formatDirectImageUrl(img);
        if (f && !gallery.includes(f)) gallery.push(f);
      });
    }

    const pVenta = Number(targetProduct.precio_venta_ref) || 0;
    const pMayor = Number(targetProduct.precio_mayor) || 0;
    const pGranMayor = Number(targetProduct.precio_gran_mayor) || 0;
    const stock = Number(targetProduct.stock_disponible) || 0;
    const nombre = formatTitleCase(targetProduct.grupo_nombre || targetProduct.nombre || 'Accesorio Biker');

    // Construir descripción enriquecida para WhatsApp y SEO
    let descripcion = '';
    if (pVenta > 0) {
      descripcion += `Precio: $${pVenta.toFixed(2)} USD. `;
    }
    descripcion += 'Envíos a toda Venezuela. Lo Que Los Bikers Quieren - Accesorios.';
    
    return {
      id: targetProduct.id,
      sku: targetProduct.sku,
      nombre,
      descripcion: descripcion.trim(),
      imagenUrl: formattedImage,
      imagenes: gallery,
      precioVentaUSD: pVenta,
      precioMayorUSD: pMayor,
      precioGranMayorUSD: pGranMayor,
      stock,
      categoria: formatTitleCase(targetProduct.categoria || 'Accesorios'),
      subcategoria: targetProduct.subcategoria,
      slug: getProductSlug(targetProduct),
      grupo_nombre: targetProduct.grupo_nombre,
      variante_nombre: targetProduct.variante_nombre,
      es_kit: !!targetProduct.es_kit,
      raw: targetProduct,
    };
  } catch (err) {
    console.error('Unhandled error in getProductBySlug:', err);
    return null;
  }
}

/**
 * Consulta una categoría por slug.
 */
export async function getCategoryBySlug(slugParam: string): Promise<string | null> {
  if (!slugParam) return null;
  try {
    const products = await getAllProducts();
    const catSet = new Set<string>();
    products.forEach(p => {
      if (p.categoria) catSet.add(p.categoria);
      if (Array.isArray(p.categorias)) {
        p.categorias.forEach((c: any) => c && catSet.add(c));
      }
    });
    return findCategoryBySlug(Array.from(catSet), slugParam) || null;
  } catch (err) {
    console.error('Unhandled error in getCategoryBySlug:', err);
    return null;
  }
}
