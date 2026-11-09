import { CartItem, Producto } from '../types';
import { findProductBySlugOrId, getProductSlug } from './slugHelper';

export interface SharedCartItemPayload {
  id: string;
  sku?: string;
  qty: number;
  name?: string;
  price?: number;
  img?: string;
  variant?: string;
}

export interface SharedCartPayload {
  delivery: 'envio' | 'retiro';
  agency?: 'MRW' | 'Zoom' | 'Tealca' | 'Domesa';
  items: SharedCartItemPayload[];
  createdAt?: string;
}

/**
 * Genera el formato plano ultracompacto del carrito compartido:
 * Formato: c=ID1:QTY,ID2:QTY&d=TIPO
 * Ejemplo: c=psyduck:1,mandaloriano:2&d=mrw (o d=tienda)
 * 
 * NO serializa objetos completos, ni descripciones, ni URLs de fotos en Base64.
 * Usa únicamente el id o slug del producto y su cantidad (qty).
 */
export function buildShortSharedCartQuery(
  cart: CartItem[],
  deliveryType: 'mrw' | 'zoom' | 'tienda' | 'envio' = 'mrw'
): string {
  const activeItems = cart.filter(it => it.quantity > 0);
  if (activeItems.length === 0) return '';

  const parts = activeItems.map(it => {
    // Si tiene un ID limpio de Firestore o slug
    let identifier = it.product.id ? String(it.product.id).trim() : '';
    if (!identifier || identifier.includes(' ') || identifier.includes(',') || identifier.includes(':')) {
      identifier = getProductSlug(it.product) || String(it.product.sku || 'item').trim();
    }
    // Sanitizar cualquier carácter reservado en URLs
    identifier = identifier.replace(/[,:&?=]/g, '-');
    const qty = Math.max(1, it.quantity);
    return `${identifier}:${qty}`;
  });

  const cValue = parts.join(',');
  const dValue = deliveryType.toLowerCase().trim();

  return `c=${cValue}&d=${dValue}`;
}

/**
 * Decodifica el parámetro compacto 'c' (ej: psyduck:1,mandaloriano:2)
 * y resuelve los productos correspondientes contra el catálogo.
 */
export function parseShortCartQuery(
  cParam: string,
  dParam?: string | null,
  availableProducts: Producto[] = []
): {
  delivery: 'envio' | 'retiro';
  agency: 'MRW' | 'Zoom';
  items: CartItem[];
} | null {
  if (!cParam || typeof cParam !== 'string') return null;

  const cleanD = (dParam || '').toLowerCase().trim();
  const isTienda = cleanD === 'tienda' || cleanD === 'retiro';
  const isZoom = cleanD === 'zoom';
  const delivery: 'envio' | 'retiro' = isTienda ? 'retiro' : 'envio';
  const agency: 'MRW' | 'Zoom' = isZoom ? 'Zoom' : 'MRW';

  const parts = cParam.split(',');
  const hydrated: CartItem[] = [];

  for (const part of parts) {
    const [rawId, rawQty] = part.split(':');
    if (!rawId) continue;
    const cleanId = rawId.trim();
    const qty = Math.max(1, parseInt(rawQty || '1', 10) || 1);

    // Buscar en el catálogo en memoria por ID, SKU o Slug tolerante
    const found = findProductBySlugOrId(availableProducts, cleanId);
    if (found) {
      const price = Number(found.precio_venta_ref || found.precio_mayor || 0);
      hydrated.push({
        product: found,
        quantity: qty,
        precio_unitario: price,
        subtotal: Number((price * qty).toFixed(2)),
      });
    } else {
      // Stub seguro temporal si aún no se ha cargado el catálogo completo
      const stub: Producto = {
        id: cleanId,
        sku: cleanId,
        nombre: 'Accesorio Biker',
        precio_venta_ref: 0,
        precio_mayor: 0,
        stock_disponible: 99,
        peso_g: 0,
        precio_rmb: 0,
        costo_landed_aereo: 0,
        costo_landed_barco: 0,
        userId: '',
        createdAt: new Date().toISOString(),
      };
      hydrated.push({
        product: stub,
        quantity: qty,
        precio_unitario: 0,
        subtotal: 0,
      });
    }
  }

  if (hydrated.length === 0) return null;
  return { delivery, agency, items: hydrated };
}

/**
 * Serializa los productos del carrito en una cadena compacta.
 * Ahora genera el formato corto si se usa en URLs, manteniendo compatibilidad de firma.
 */
export function encodeSharedCart(cart: CartItem[], delivery: 'envio' | 'retiro' = 'envio'): string {
  const dType = delivery === 'retiro' ? 'tienda' : 'mrw';
  return buildShortSharedCartQuery(cart, dType);
}

/**
 * Decodifica tanto el formato nuevo ultra-compacto (?c=ID:QTY)
 * como el formato heredado Base64 (?shared_cart=...) para retrocompatibilidad total.
 */
export function decodeSharedCart(param: string): SharedCartPayload | null {
  if (!param || typeof param !== 'string') return null;

  const clean = param.trim();

  // 1. Detectar si viene en el nuevo formato plano: "ID:QTY,ID2:QTY"
  if (clean.includes(':') && !clean.startsWith('ey') && !clean.includes('{"')) {
    const parts = clean.split(',');
    const items: SharedCartItemPayload[] = [];
    for (const part of parts) {
      const [id, qtyStr] = part.split(':');
      if (id) {
        items.push({
          id: id.trim(),
          qty: Math.max(1, parseInt(qtyStr || '1', 10) || 1),
        });
      }
    }
    if (items.length > 0) {
      return {
        delivery: 'envio',
        items,
        createdAt: new Date().toISOString(),
      };
    }
  }

  // 2. Soporte retrocompatible para enlaces previos en Base64
  try {
    let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }

    const binary = atob(b64);
    const jsonStr = decodeURIComponent(
      Array.prototype.map.call(binary, (ch: string) => {
        return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );

    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.items)) return null;

    const delivery: 'envio' | 'retiro' = 
      parsed.delivery === 'retiro' || parsed.delivery === 'tienda' ? 'retiro' : 'envio';

    return {
      delivery,
      items: parsed.items,
      createdAt: parsed.createdAt,
    };
  } catch {
    // Fallback JSON directo si no era base64
    try {
      const decodedJson = JSON.parse(decodeURIComponent(param));
      if (decodedJson && Array.isArray(decodedJson.items)) {
        return {
          delivery: decodedJson.delivery === 'retiro' ? 'retiro' : 'envio',
          items: decodedJson.items,
          createdAt: decodedJson.createdAt,
        };
      }
    } catch {}
    return null;
  }
}

/**
 * Reconstruye el array de CartItem[] a partir del payload decodificado y el catálogo de productos disponibles.
 */
export function hydrateSharedCart(
  payload: SharedCartPayload,
  availableProducts: Producto[]
): CartItem[] {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) return [];

  const hydrated: CartItem[] = [];

  for (const item of payload.items) {
    const qty = Math.max(1, Number(item.qty) || 1);
    
    // Buscar en productos disponibles por ID, SKU o Slug
    let found = availableProducts.find(p => String(p.id).toLowerCase() === String(item.id).toLowerCase());
    if (!found && item.sku) {
      found = availableProducts.find(p => String(p.sku).toLowerCase() === String(item.sku).toLowerCase());
    }
    if (!found && item.name) {
      found = findProductBySlugOrId(availableProducts, item.name);
    }
    if (!found && item.id) {
      found = findProductBySlugOrId(availableProducts, item.id);
    }

    if (found) {
      const price = Number(found.precio_venta_ref || found.precio_mayor || item.price || 0);
      hydrated.push({
        product: found,
        quantity: qty,
        precio_unitario: price,
        subtotal: Number((price * qty).toFixed(2)),
      });
    } else {
      const price = Number(item.price || 0);
      const stub: Producto = {
        id: item.id || `shared-${Date.now()}`,
        sku: item.sku || '',
        nombre: item.name || 'Accesorio para moto',
        precio_venta_ref: price,
        precio_mayor: price,
        stock_disponible: 99,
        variante_nombre: item.variant,
        imagen_url: item.img,
        variante_imagen_miniatura: item.img,
        variante_imagen_hd: item.img,
        peso_g: 0,
        precio_rmb: 0,
        costo_landed_aereo: 0,
        costo_landed_barco: 0,
        userId: '',
        createdAt: new Date().toISOString(),
      };

      hydrated.push({
        product: stub,
        quantity: qty,
        precio_unitario: price,
        subtotal: Number((price * qty).toFixed(2)),
      });
    }
  }

  return hydrated;
}

/**
 * Parsea formato simple por query string ej: ?items=ID:QTY,ID:QTY&delivery=envio
 */
export function parseQueryCart(
  itemsQuery: string,
  deliveryQuery: string | null,
  availableProducts: Producto[]
): { delivery: 'envio' | 'retiro'; items: CartItem[] } | null {
  if (!itemsQuery || typeof itemsQuery !== 'string') return null;

  const cleanDelivery = (deliveryQuery || '').toLowerCase();
  const delivery: 'envio' | 'retiro' = 
    cleanDelivery === 'retiro' || cleanDelivery === 'tienda' ? 'retiro' : 'envio';

  const parts = itemsQuery.split(',');
  const hydrated: CartItem[] = [];

  for (const part of parts) {
    const [identifier, qtyStr] = part.split(':');
    if (!identifier) continue;
    const qty = Math.max(1, parseInt(qtyStr || '1', 10) || 1);
    const cleanId = identifier.trim();

    const found = findProductBySlugOrId(availableProducts, cleanId);
    if (found) {
      const price = Number(found.precio_venta_ref || found.precio_mayor || 0);
      hydrated.push({
        product: found,
        quantity: qty,
        precio_unitario: price,
        subtotal: Number((price * qty).toFixed(2)),
      });
    }
  }

  if (hydrated.length === 0) return null;
  return { delivery, items: hydrated };
}
