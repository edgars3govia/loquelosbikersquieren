import { Producto } from '../types';

export interface ProductPriceInfo {
  hasOffer: boolean;
  effectivePriceUSD: number;
  originalPriceUSD: number;
  discountPercentage: number;
}

/**
 * Detección de oferta desde Firestore:
 * - Lee los campos precio_venta_ref y precio_oferta_usd.
 * - Un producto tiene oferta activa si: precio_oferta_usd > 0 && precio_oferta_usd < precio_venta_ref.
 * - Calcula o lee descuento_porcentaje = Math.round(((precio_venta_ref - precio_oferta_usd) / precio_venta_ref) * 100).
 */
export function getProductPriceInfo(product?: Producto | null): ProductPriceInfo {
  if (!product) {
    return {
      hasOffer: false,
      effectivePriceUSD: 0,
      originalPriceUSD: 0,
      discountPercentage: 0,
    };
  }

  const originalPriceUSD = Number(product.precio_venta_ref || product.precio_mayor || 0);
  const rawOffer = Number(product.precio_oferta_usd || 0);
  const hasOffer = rawOffer > 0 && rawOffer < originalPriceUSD;
  const effectivePriceUSD = hasOffer ? rawOffer : originalPriceUSD;

  const discountPercentage = hasOffer
    ? (Number(product.descuento_porcentaje) || Math.round(((originalPriceUSD - rawOffer) / originalPriceUSD) * 100))
    : 0;

  return {
    hasOffer,
    effectivePriceUSD,
    originalPriceUSD,
    discountPercentage,
  };
}
