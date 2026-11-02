import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

// ============================================================================
// UTILIDADES PURAS DE TEXTO Y SLUGS (SELF-CONTAINED)
// ============================================================================

export function removeAccents(str = '') {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[áàäâ]/g, 'a')
    .replace(/[ÁÀÄÂ]/g, 'A')
    .replace(/[éèëê]/g, 'e')
    .replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[íìïî]/g, 'i')
    .replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[óòöô]/g, 'o')
    .replace(/[ÓÒÖÔ]/g, 'O')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/[ñ]/g, 'n')
    .replace(/[Ñ]/g, 'N');
}

export function formatTitleCase(text = '') {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getCategoryKey(category = '') {
  if (!category || typeof category !== 'string') return '';
  return removeAccents(category.trim().replace(/\s+/g, ' ')).toLowerCase();
}

export function formatCategoryDisplay(category = '') {
  const key = getCategoryKey(category);
  if (!key || key === 'sin categoria') return '';
  return key
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function slugify(text = '') {
  if (!text) return '';
  return removeAccents(String(text))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getProductSlug(product) {
  if (!product) return '';
  const baseName = product.grupo_nombre || product.nombre || product.id || '';
  const slug = slugify(baseName);
  return slug || String(product.id || '');
}

export function findProductBySlugOrId(products, param) {
  if (!param || !Array.isArray(products) || products.length === 0) return undefined;
  const cleanParam = decodeURIComponent(param).trim().toLowerCase();
  const slugParam = slugify(cleanParam);

  // 1. Coincidencia exacta por ID de documento
  const byId = products.find((p) => p && p.id && String(p.id).toLowerCase() === cleanParam);
  if (byId) return byId;

  // 2. Coincidencia por SKU
  const bySku = products.find((p) => p && p.sku && String(p.sku).toLowerCase() === cleanParam);
  if (bySku) return bySku;

  // 3. Coincidencia exacta por slug de nombre o grupo
  const bySlug = products.find((p) => {
    if (!p) return false;
    const sName = slugify(p.nombre);
    const sGroup = slugify(p.grupo_nombre);
    return (sName && sName === slugParam) || (sGroup && sGroup === slugParam);
  });
  if (bySlug) return bySlug;

  // 4. Si el parámetro incluye el ID compuesto (ej: "37-tapa-suichera")
  const byComposite = products.find((p) => {
    if (!p || !p.id) return false;
    const lowerId = String(p.id).toLowerCase();
    return cleanParam.startsWith(`${lowerId}-`) || cleanParam.endsWith(`-${lowerId}`);
  });
  if (byComposite) return byComposite;

  // 5. Coincidencia parcial si el slug comienza con el parámetro o viceversa
  const byPartial = products.find((p) => {
    if (!p) return false;
    const sName = slugify(p.nombre);
    const sGroup = slugify(p.grupo_nombre);
    if (!sName && !sGroup) return false;
    return (
      (sName && (sName.startsWith(slugParam) || slugParam.startsWith(sName))) ||
      (sGroup && (sGroup.startsWith(slugParam) || slugParam.startsWith(sGroup)))
    );
  });
  if (byPartial) return byPartial;

  return undefined;
}

export function findCategoryBySlug(categories, param) {
  if (!param || !Array.isArray(categories) || categories.length === 0) return undefined;
  const cleanParam = decodeURIComponent(param).trim().toLowerCase();
  const slugParam = slugify(cleanParam);

  return categories.find((cat) => {
    if (!cat) return false;
    const sCat = slugify(cat);
    const kCat = getCategoryKey(cat);
    return sCat === slugParam || kCat === cleanParam || slugify(kCat) === slugParam;
  });
}

// ============================================================================
// FORMATEO DE IMÁGENES Y URLs
// ============================================================================

export function extractDriveFileId(rawUrl) {
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

export function formatDirectImageUrl(rawUrl) {
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
    const fileIdMatch =
      url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
      url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  // Dropbox
  if (url.includes('dropbox.com')) {
    url = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    url = url.replace(/[?&]dl=0/, '?dl=1');
  }

  // Asegurar https://
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  } else if (!url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return url;
}

export const DEFAULT_OG_IMAGE = 'https://loquelosbikersquieren.vercel.app/logo-og.png';

// ============================================================================
// CONFIGURACIÓN DE FIREBASE Y FIRESTORE (A PRUEBA DE VERCEL SSR)
// ============================================================================

function loadFirebaseConfig() {
  const possiblePaths = [
    path.join(process.cwd(), 'firebase-applet-config.json'),
    path.join(process.cwd(), 'src', 'firebase-applet-config.json'),
  ];

  let diskConfig = {};
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        diskConfig = JSON.parse(fs.readFileSync(p, 'utf-8'));
        break;
      } catch {
        // Ignorar
      }
    }
  }

  return {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || diskConfig.projectId || 'ai-studio-c0bff50d-0bf4-4cb2-83dc-2712ee3eb530',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || diskConfig.appId,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || diskConfig.apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || diskConfig.authDomain,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || diskConfig.storageBucket,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || diskConfig.messagingSenderId,
    firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || diskConfig.firestoreDatabaseId || 'ai-studio-c0bff50d-0bf4-4cb2-83dc-2712ee3eb530',
  };
}

let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    try {
      const config = loadFirebaseConfig();
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      const dbId = config.firestoreDatabaseId;
      try {
        dbInstance = initializeFirestore(app, {}, dbId);
      } catch {
        dbInstance = getFirestore(app, dbId);
      }
    } catch (err) {
      console.warn('Firebase initialization in productsService.js warning:', err);
      return null;
    }
  }
  return dbInstance;
}

let cachedProducts = null;
let lastCacheTime = 0;
const CACHE_TTL = 3 * 60 * 1000;

export async function getAllProducts() {
  const now = Date.now();
  if (cachedProducts && now - lastCacheTime < CACHE_TTL) {
    return cachedProducts;
  }

  try {
    const db = getDb();
    if (!db) return cachedProducts || [];
    const snap = await getDocs(collection(db, 'productos'));
    const list = snap.docs.map((docSnap) => {
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
    console.warn('Firestore fetch products note/fallback in productsService.js:', error);
    return cachedProducts || [];
  }
}

export async function getProductBySlug(param) {
  if (!param) return null;

  try {
    const products = await getAllProducts();
    let targetProduct = findProductBySlugOrId(products, param);

    if (!targetProduct) {
      try {
        const db = getDb();
        if (db) {
          const directDoc = await getDoc(doc(db, 'productos', param));
          if (directDoc.exists()) {
            targetProduct = { id: directDoc.id, ...directDoc.data() };
          }
        }
      } catch (e) {
        console.warn('Direct Firestore lookup note:', e);
      }
    }

    if (!targetProduct) return null;

    const rawImage =
      targetProduct.variante_imagen_hd ||
      targetProduct.imagen_portada ||
      targetProduct.imagen_url ||
      targetProduct.link ||
      (Array.isArray(targetProduct.imagenes) && targetProduct.imagenes[0]) ||
      targetProduct.grupo_kit_imagen ||
      '';

    const formattedImage = formatDirectImageUrl(rawImage) || DEFAULT_OG_IMAGE;

    const gallery = [];
    if (formattedImage) gallery.push(formattedImage);
    if (Array.isArray(targetProduct.imagenes)) {
      targetProduct.imagenes.forEach((img) => {
        const f = formatDirectImageUrl(img);
        if (f && !gallery.includes(f)) gallery.push(f);
      });
    }

    const pVenta = Number(targetProduct.precio_venta_ref) || 0;
    const pMayor = Number(targetProduct.precio_mayor) || 0;
    const pGranMayor = Number(targetProduct.precio_gran_mayor) || 0;
    const stock = Number(targetProduct.stock_disponible) || 0;
    const nombre = formatTitleCase(targetProduct.grupo_nombre || targetProduct.nombre || 'Accesorio Biker');

    let descripcion = '';
    if (pVenta > 0) {
      descripcion += `Precio: $${pVenta.toFixed(2)} USD. `;
    }
    if (targetProduct.palabras_clave) {
      descripcion += `${targetProduct.palabras_clave}. `;
    } else if (targetProduct.notas) {
      descripcion += `${targetProduct.notas}. `;
    }
    if (stock > 0) {
      descripcion += `Disponibilidad inmediata: ${stock} unidades. `;
    }
    descripcion += 'Envíos a toda Venezuela. Lo Que Los Bikers Quieren - Accesorios y Repuestos.';

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
    console.error('Unhandled error in getProductBySlug (productsService.js):', err);
    return null;
  }
}

export async function getCategoryBySlug(slugParam) {
  if (!slugParam) return null;
  try {
    const products = await getAllProducts();
    const catSet = new Set();
    products.forEach((p) => {
      if (p.categoria) catSet.add(p.categoria);
      if (Array.isArray(p.categorias)) {
        p.categorias.forEach((c) => c && catSet.add(c));
      }
    });
    return findCategoryBySlug(Array.from(catSet), slugParam) || null;
  } catch (err) {
    console.error('Unhandled error in getCategoryBySlug (productsService.js):', err);
    return null;
  }
}
