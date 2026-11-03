import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// UTILIDADES PURAS DE TEXTO, IMÁGENES Y SLUGS (SELF-CONTAINED EN EL SERVIDOR)
// ============================================================================

function removeAccents(str: string = ''): string {
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

function formatTitleCase(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategoryKey(category: string = ''): string {
  if (!category || typeof category !== 'string') return '';
  return removeAccents(category.trim().replace(/\s+/g, ' ')).toLowerCase();
}

function formatCategoryDisplay(category: string = ''): string {
  const key = getCategoryKey(category);
  if (!key || key === 'sin categoria') return '';
  return key
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeSlug(text?: string | null): string {
  if (!text) return '';
  let str = String(text);
  try {
    str = decodeURIComponent(str);
  } catch {}

  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return removeAccents(str)
    .toLowerCase()
    .replace(/[ñ]/gi, 'n')
    .replace(/\bacompa-ante\b/gi, 'acompanante')
    .replace(/acompa-ante/gi, 'acompanante')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toAlphaNumericKey(text?: string | null): string {
  if (!text) return '';
  return normalizeSlug(text).replace(/[^a-z0-9]/g, '');
}

function slugify(text?: string | null): string {
  return normalizeSlug(text);
}

function getProductSlug(product: { id: string; nombre?: string; grupo_nombre?: string }): string {
  const baseName = product.grupo_nombre || product.nombre || product.id;
  const slug = slugify(baseName);
  return slug || product.id;
}

function findProductBySlugOrId(products: any[], param: string): any | undefined {
  if (!param || !Array.isArray(products) || products.length === 0) return undefined;

  let rawParam = String(param).trim();
  try {
    rawParam = decodeURIComponent(rawParam);
  } catch {}

  const cleanParam = rawParam.toLowerCase().trim();
  const targetSlug = slugify(cleanParam);
  const targetKey = toAlphaNumericKey(cleanParam);

  // 1. Coincidencia exacta por ID de Firestore
  const byId = products.find(p => p.id && String(p.id).toLowerCase() === cleanParam);
  if (byId) return byId;

  // 2. Coincidencia por SKU
  const bySku = products.find(p => p.sku && String(p.sku).toLowerCase() === cleanParam);
  if (bySku) return bySku;

  // 3. Coincidencia exacta por slug normalizado (nombre, grupo_nombre, variante, etc.)
  const bySlug = products.find(p => {
    const sName = slugify(p.nombre);
    const sGroup = slugify(p.grupo_nombre);
    const sProd = slugify(getProductSlug(p));
    const sVar = slugify(p.variante_nombre);
    const sGroupVar = slugify(`${p.grupo_nombre || ''} ${p.variante_nombre || ''}`);
    const sNameVar = slugify(`${p.nombre || ''} ${p.variante_nombre || ''}`);
    const sGroupNombre = slugify(`${p.grupo_nombre || ''} ${p.nombre || ''}`);

    return (
      (sName && sName === targetSlug) ||
      (sGroup && sGroup === targetSlug) ||
      (sProd && sProd === targetSlug) ||
      (sVar && sVar === targetSlug) ||
      (sGroupVar && sGroupVar === targetSlug) ||
      (sNameVar && sNameVar === targetSlug) ||
      (sGroupNombre && sGroupNombre === targetSlug)
    );
  });
  if (bySlug) return bySlug;

  // 4. Coincidencia alfanumérica pura (ignora guiones y espacios)
  if (targetKey.length >= 3) {
    const byAlphaNumeric = products.find(p => {
      const kName = toAlphaNumericKey(p.nombre);
      const kGroup = toAlphaNumericKey(p.grupo_nombre);
      const kProd = toAlphaNumericKey(getProductSlug(p));
      const kVar = toAlphaNumericKey(p.variante_nombre);
      const kGroupVar = toAlphaNumericKey(`${p.grupo_nombre || ''} ${p.variante_nombre || ''}`);
      const kNameVar = toAlphaNumericKey(`${p.nombre || ''} ${p.variante_nombre || ''}`);

      return (
        (kName && kName === targetKey) ||
        (kGroup && kGroup === targetKey) ||
        (kProd && kProd === targetKey) ||
        (kVar && kVar === targetKey) ||
        (kGroupVar && kGroupVar === targetKey) ||
        (kNameVar && kNameVar === targetKey)
      );
    });
    if (byAlphaNumeric) return byAlphaNumeric;
  }

  // 5. Parámetro compuesto con ID (ej: "37-tapa-suichera" o "tapa-suichera-37")
  const byComposite = products.find(p => {
    if (!p.id) return false;
    const lowerId = String(p.id).toLowerCase();
    return cleanParam.startsWith(`${lowerId}-`) || cleanParam.endsWith(`-${lowerId}`);
  });
  if (byComposite) return byComposite;

  // 6. Coincidencia por prefijo / inclusión
  if (targetSlug.length >= 6) {
    const byPartial = products.find(p => {
      const sName = slugify(p.nombre);
      const sGroup = slugify(p.grupo_nombre);
      const sProd = slugify(getProductSlug(p));
      return (
        (sName && (sName.startsWith(targetSlug) || targetSlug.startsWith(sName))) ||
        (sGroup && (sGroup.startsWith(targetSlug) || targetSlug.startsWith(sGroup))) ||
        (sProd && (sProd.startsWith(targetSlug) || targetSlug.startsWith(sProd)))
      );
    });
    if (byPartial) return byPartial;
  }

  // 7. Búsqueda tolerante por tokens relevantes (ej. ["acompanante", "pato", "psyduck", "metralleta"])
  const stopWords = new Set(['de', 'la', 'el', 'los', 'las', 'en', 'para', 'con', 'y', 'a', 'del', 'un', 'una', 'por']);
  const tokens = targetSlug
    .split('-')
    .map(t => t.trim())
    .filter(t => t.length > 2 && !stopWords.has(t));

  if (tokens.length >= 2) {
    let bestMatch: any = undefined;
    let maxMatchCount = 0;

    for (const p of products) {
      const candidateText = normalizeSlug(`${p.grupo_nombre || ''} ${p.nombre || ''} ${p.variante_nombre || ''}`);
      let matchCount = 0;
      for (const token of tokens) {
        if (candidateText.includes(token)) {
          matchCount++;
        }
      }

      if (matchCount >= 2 && matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestMatch = p;
      }
    }

    if (bestMatch && maxMatchCount >= Math.ceil(tokens.length * 0.5)) {
      return bestMatch;
    }
  }

  return undefined;
}

function findCategoryBySlug(categories: string[], param: string): string | undefined {
  if (!param || !Array.isArray(categories) || categories.length === 0) return undefined;
  const cleanParam = decodeURIComponent(param).trim().toLowerCase();
  const slugParam = slugify(cleanParam);
  const keyParam = toAlphaNumericKey(cleanParam);

  return categories.find(cat => {
    const sCat = slugify(cat);
    const kCat = getCategoryKey(cat);
    const keyCat = toAlphaNumericKey(cat);
    return (
      sCat === slugParam ||
      kCat === cleanParam ||
      slugify(kCat) === slugParam ||
      (keyParam.length >= 3 && keyCat === keyParam)
    );
  });
}

function extractDriveFileId(rawUrl?: string | null): string {
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

function formatDirectImageUrl(rawUrl?: string | null): string {
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

  // Google Drive ID plano
  if (!url.includes('/') && !url.includes('.') && /^[a-zA-Z0-9_-]{10,}$/.test(url)) {
    return `https://lh3.googleusercontent.com/d/${url}`;
  }

  // Google Drive enlaces
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                        url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                        url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
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

  try {
    url = encodeURI(url);
  } catch {}

  return url;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================================
// CONFIGURACIÓN DE FIREBASE Y CLIENTE FIRESTORE
// ============================================================================

const firebaseConfigFile = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));
} catch (e) {
  console.error("Could not read firebase-applet-config.json:", e);
}

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDbId = firebaseConfig.firestoreDatabaseId || 'ai-studio-c0bff50d-0bf4-4cb2-83dc-2712ee3eb530';
const db = initializeFirestore(firebaseApp, {}, firestoreDbId);

// Memoria caché de productos para respuestas en menos de 5ms en rastreadores sociales
interface ProductCache {
  products: any[];
  timestamp: number;
}
let productCache: ProductCache | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000;

async function getAllProducts(): Promise<any[]> {
  const now = Date.now();
  if (productCache && now - productCache.timestamp < CACHE_TTL_MS) {
    return productCache.products;
  }
  try {
    const snap = await getDocs(collection(db, 'productos'));
    const list = snap.docs.map(docSnap => {
      const data = docSnap.data();
      const rawLink = data.link || (data.imagen_url && data.imagen_url.includes('http') ? data.imagen_url : '');
      const idOnly = extractDriveFileId(rawLink || data.imagen_url) || (!data.imagen_url?.includes('/') ? data.imagen_url : '');
      return {
        id: docSnap.id,
        ...data,
        nombre: removeAccents(data.nombre || ''),
        categoria: removeAccents(data.categoria || ''),
        subcategoria: data.subcategoria ? removeAccents(String(data.subcategoria)).trim() : '',
        link: rawLink || (idOnly ? `https://drive.google.com/file/d/${idOnly}/view` : ''),
        imagen_url: idOnly || data.imagen_url || ''
      };
    });
    productCache = { products: list, timestamp: now };
    return list;
  } catch (err) {
    console.error("Server error loading products from Firestore:", err);
    return productCache ? productCache.products : [];
  }
}

async function resolveProduct(param: string): Promise<any | null> {
  const products = await getAllProducts();
  const found = findProductBySlugOrId(products, param);
  if (found) return found;

  try {
    const directDoc = await getDoc(doc(db, 'productos', param));
    if (directDoc.exists()) {
      return { id: directDoc.id, ...directDoc.data() };
    }
  } catch (err) {
    console.warn("Direct doc lookup error:", err);
  }

  return null;
}

async function resolveCategory(slugParam: string): Promise<string | null> {
  const products = await getAllProducts();
  const catSet = new Set<string>();
  products.forEach(p => {
    if (p.categoria) catSet.add(p.categoria);
    if (Array.isArray(p.categorias)) {
      p.categorias.forEach((c: any) => c && catSet.add(c));
    }
  });
  return findCategoryBySlug(Array.from(catSet), slugParam) || null;
}

// ============================================================================
// GENERADOR DINÁMICO DE METADATOS OPEN GRAPH (SERVER-SIDE SSR)
// ============================================================================

async function injectMetadata(htmlTemplate: string, req: Request): Promise<string> {
  const host = req.get('x-forwarded-host') || req.get('host') || 'www.loquelosbikersquieren.com';
  // WhatsApp y redes sociales requieren estrictamente URLs absolutas con https://
  const baseUrl = `https://${host}`;
  const pathParts = req.path.split('/').filter(Boolean);

  let ogTitle = "Lo que los bikers quieren - Tienda Oficial";
  let ogDescription = "Accesorios y equipamiento biker. Haz tu pedido en línea con entregas en tienda Mérida y envíos a todo el país.";
  let ogImage = `${baseUrl}/LOGO.png`;
  let ogType = "website";
  let canonicalUrl = `${baseUrl}${req.originalUrl.split('?')[0]}`;
  let structuredDataJson = "";

  // 1. Ruta de Producto: /producto/[slug] o /producto/[id]
  if (pathParts[0] === 'producto' && pathParts[1]) {
    const productParam = pathParts[1];
    const product = await resolveProduct(productParam);
    if (product) {
      const prodName = formatTitleCase(product.grupo_nombre || product.nombre);
      const priceUSD = Number(product.precio_venta_ref || product.precio_mayor || 0);

      ogTitle = priceUSD > 0 
        ? `${prodName} - $${priceUSD.toFixed(2)} USD | Lo que los bikers quieren`
        : `${prodName} - Lo que los bikers quieren`;

      if (product.palabras_clave && typeof product.palabras_clave === 'string' && product.palabras_clave.trim()) {
        ogDescription = `${product.palabras_clave.trim()} | Lo que los bikers quieren.`;
      } else if (product.notas && typeof product.notas === 'string' && product.notas.trim()) {
        ogDescription = `${product.notas.trim()} | Lo que los bikers quieren.`;
      } else {
        ogDescription = `Compra ${prodName} por solo $${priceUSD.toFixed(2)} USD. Accesorios de alta calidad para motos. Envíos nacionales con MRW, Zoom, Tealca, Domesa y retiro en tienda física Mérida.`;
      }

      // Obtener URL de imagen directa desde la base de datos (con tamaño absoluto https://)
      const rawImage = (
        product.grupo_imagen_portada ||
        product.imagen_portada ||
        product.variante_imagen_hd ||
        product.imagen_url ||
        product.link ||
        ''
      );

      const directImg = formatDirectImageUrl(rawImage);
      if (directImg && (directImg.startsWith('http://') || directImg.startsWith('https://'))) {
        ogImage = directImg.startsWith('http://') ? directImg.replace('http://', 'https://') : directImg;
      } else {
        ogImage = `${baseUrl}/LOGO.png`;
      }

      ogType = "product";
      canonicalUrl = `${baseUrl}/producto/${getProductSlug(product)}`;

      structuredDataJson = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": ${JSON.stringify(prodName)},
      "image": [${JSON.stringify(ogImage)}],
      "description": ${JSON.stringify(ogDescription)},
      "sku": ${JSON.stringify(product.sku || product.id)},
      "offers": {
        "@type": "Offer",
        "url": ${JSON.stringify(canonicalUrl)},
        "priceCurrency": "USD",
        "price": "${priceUSD.toFixed(2)}",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    }
    </script>`;
    }
  } 
  // 2. Ruta de Categoría: /categoria/[slug]
  else if (pathParts[0] === 'categoria' && pathParts[1]) {
    const catSlug = pathParts[1];
    const categoryName = await resolveCategory(catSlug);
    const catDisplay = categoryName ? formatCategoryDisplay(categoryName) : formatTitleCase(catSlug.replace(/-/g, ' '));

    ogTitle = `${catDisplay} - Lo que los bikers quieren`;
    ogDescription = `Explora nuestro catálogo de ${catDisplay} para motos. Accesorios y repuestos de alta calidad con entregas en Mérida y envíos a toda Venezuela.`;

    const products = await getAllProducts();
    const firstCatProd = products.find(p => {
      const k = removeAccents(p.categoria || '').toLowerCase();
      return k.includes(catSlug.replace(/-/g, ' ')) || (Array.isArray(p.categorias) && p.categorias.some((c: string) => removeAccents(c).toLowerCase().includes(catSlug.replace(/-/g, ' '))));
    });
    if (firstCatProd) {
      const rawImg = firstCatProd.grupo_imagen_portada || firstCatProd.imagen_portada || firstCatProd.imagen_url;
      const direct = formatDirectImageUrl(rawImg);
      if (direct && direct.startsWith('http')) {
        ogImage = direct.startsWith('http://') ? direct.replace('http://', 'https://') : direct;
      }
    }
    canonicalUrl = `${baseUrl}/categoria/${slugify(catSlug)}`;
  }

  let verifiedOgImage = (ogImage || '').trim();
  if (verifiedOgImage.startsWith('http://')) {
    verifiedOgImage = verifiedOgImage.replace('http://', 'https://');
  } else if (verifiedOgImage.startsWith('/')) {
    verifiedOgImage = `${baseUrl}${verifiedOgImage}`;
  } else if (!verifiedOgImage.startsWith('https://')) {
    verifiedOgImage = `${baseUrl}/LOGO.png`;
  }
  try {
    verifiedOgImage = encodeURI(verifiedOgImage);
  } catch {}

  if (canonicalUrl.startsWith('http://')) {
    canonicalUrl = canonicalUrl.replace('http://', 'https://');
  }

  // Inyección de etiquetas Open Graph con soporte recomendado de 1200x630 para WhatsApp
  const tagsToInject = `
    <title>${escapeHtml(ogTitle)}</title>
    <meta name="title" content="${escapeHtml(ogTitle)}" />
    <meta name="description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="Lo que los bikers quieren" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:image" content="${escapeHtml(verifiedOgImage)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(verifiedOgImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(verifiedOgImage)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    ${structuredDataJson}
  `;

  // Remover meta tags estáticos existentes en index.html
  let modifiedHtml = htmlTemplate
    .replace(/<title>.*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']title["'].*?>/gi, '')
    .replace(/<meta\s+name=["']description["'].*?>/gi, '')
    .replace(/<meta\s+property=["']og:.*?["'].*?>/gi, '')
    .replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, '')
    .replace(/<link\s+rel=["']canonical["'].*?>/gi, '');

  modifiedHtml = modifiedHtml.replace(/<head>/i, `<head>${tagsToInject}`);

  return modifiedHtml;
}

// ============================================================================
// SERVIDOR PRINCIPAL EXPRESS
// ============================================================================

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  let vite: any = null;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false }));
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Endpoint de comprobación previa de metadatos OG
  app.get('/api/og-preview', async (req, res) => {
    const productParam = String(req.query.p || '');
    if (!productParam) {
      return res.status(400).json({ error: 'Missing product param (?p=...)' });
    }
    const product = await resolveProduct(productParam);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const host = req.get('x-forwarded-host') || req.get('host') || 'www.loquelosbikersquieren.com';
    const prodName = formatTitleCase(product.grupo_nombre || product.nombre);
    const priceUSD = Number(product.precio_venta_ref || product.precio_mayor || 0);
    const rawImage = product.grupo_imagen_portada || product.imagen_portada || product.variante_imagen_hd || product.imagen_url || product.link;
    const directImg = formatDirectImageUrl(rawImage);
    const ogImage = directImg && directImg.startsWith('http') ? directImg : `https://${host}/LOGO.png`;

    res.json({
      title: `${prodName} - $${priceUSD.toFixed(2)} USD | Lo que los bikers quieren`,
      description: product.palabras_clave || product.notas || `Compra ${prodName} por solo $${priceUSD.toFixed(2)} USD.`,
      image: ogImage,
      image_width: 800,
      image_height: 800,
      canonicalUrl: `https://${host}/producto/${getProductSlug(product)}`,
      product
    });
  });

  // Manejo de renderizado para todas las rutas HTML (Deep Linking + Open Graph Server-Side)
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const url = req.originalUrl;
    try {
      let template: string;
      if (!isProd) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        const prodIndexPath = path.resolve(__dirname, 'dist', 'index.html');
        template = fs.readFileSync(prodIndexPath, 'utf-8');
      }

      const finalHtml = await injectMetadata(template, req);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
    } catch (e) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      console.error("Error serving HTML in server.ts:", e);
      next(e);
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Biker Store Full-Stack Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
