import { CartItem, Producto } from '../types';
import { findProductBySlugOrId } from './slugHelper';

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
  items: SharedCartItemPayload[];
  createdAt?: string;
}

/**
 * Serializa los productos del carrito y el método de entrega en una cadena compacta URL-safe Base64.
 */
export function encodeSharedCart(cart: CartItem[], delivery: 'envio' | 'retiro' = 'envio'): string {
  const activeItems = cart.filter(it => it.quantity > 0);
  if (activeItems.length === 0) return '';

  const items: SharedCartItemPayload[] = activeItems.map(it => ({
    id: String(it.product.id || ''),
    sku: it.product.sku ? String(it.product.sku) : undefined,
    qty: it.quantity,
    name: it.product.nombre ? String(it.product.nombre) : undefined,
    price: it.precio_unitario || it.product.precio_venta_ref || undefined,
    img: it.product.variante_imagen_miniatura || it.product.imagen_portada || it.product.imagen_url || undefined,
    variant: it.product.variante_nombre ? String(it.product.variante_nombre) : undefined
  }));

  const payload: SharedCartPayload = {
    delivery,
    items,
    createdAt: new Date().toISOString()
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // Base64 seguro para UTF-8 en navegadores
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    return btoa(utf8Bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error("Error encoding shared cart:", err);
    return '';
  }
}

/**
 * Decodifica una cadena Base64 o URL-encoded para recuperar el payload del carrito.
 */
export function decodeSharedCart(param: string): SharedCartPayload | null {
  if (!param || typeof param !== 'string') return null;

  try {
    let clean = param.trim();
    // Revertir formato URL-safe Base64
    clean = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }

    const binary = atob(clean);
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
      createdAt: parsed.createdAt
    };
  } catch (err) {
    // Fallback: Si no era base64 puro, intentar parse directo si era JSON encodeado
    try {
      const decodedJson = JSON.parse(decodeURIComponent(param));
      if (decodedJson && Array.isArray(decodedJson.items)) {
        return {
          delivery: decodedJson.delivery === 'retiro' ? 'retiro' : 'envio',
          items: decodedJson.items,
          createdAt: decodedJson.createdAt
        };
      }
    } catch {}
    console.warn("Could not decode shared cart string:", err);
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

    if (found) {
      const price = Number(found.precio_venta_ref || found.precio_mayor || item.price || 0);
      hydrated.push({
        product: found,
        quantity: qty,
        precio_unitario: price,
        subtotal: Number((price * qty).toFixed(2))
      });
    } else {
      // Stub seguro en caso de que el catálogo aún no haya finalizado su carga o sea variante personalizada
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
        createdAt: new Date().toISOString()
      };

      hydrated.push({
        product: stub,
        quantity: qty,
        precio_unitario: price,
        subtotal: Number((price * qty).toFixed(2))
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

    let found = availableProducts.find(p => String(p.id).toLowerCase() === cleanId.toLowerCase());
    if (!found) {
      found = availableProducts.find(p => String(p.sku).toLowerCase() === cleanId.toLowerCase());
    }
    if (!found) {
      found = findProductBySlugOrId(availableProducts, cleanId);
    }

    if (found) {
      const price = Number(found.precio_venta_ref || found.precio_mayor || 0);
      hydrated.push({
        product: found,
        quantity: qty,
        precio_unitario: price,
        subtotal: Number((price * qty).toFixed(2))
      });
    }
  }

  if (hydrated.length === 0) return null;
  return { delivery, items: hydrated };
}
