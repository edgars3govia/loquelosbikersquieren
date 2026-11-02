import { removeAccents, getCategoryKey } from './textUtils';
import { Producto } from '../types';

/**
 * Convierte cualquier texto en un slug URL limpio y legible.
 * Ejemplo: "Tapa Suichera BWS (Par)" -> "tapa-suichera-bws-par"
 */
export function slugify(text?: string | null): string {
  if (!text) return '';
  return removeAccents(String(text))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no alfanuméricos por guiones
    .replace(/^-+|-+$/g, '');   // Eliminar guiones al inicio o al final
}

/**
 * Genera el slug canónico para un producto.
 */
export function getProductSlug(product: { id: string; nombre?: string; grupo_nombre?: string }): string {
  const baseName = product.grupo_nombre || product.nombre || product.id;
  const slug = slugify(baseName);
  return slug || product.id;
}

/**
 * Busca un producto en una lista según un parámetro que puede ser ID o slug.
 */
export function findProductBySlugOrId(products: Producto[], param: string): Producto | undefined {
  if (!param || products.length === 0) return undefined;
  const cleanParam = decodeURIComponent(param).trim().toLowerCase();
  const slugParam = slugify(cleanParam);

  // 1. Coincidencia exacta por ID de documento
  const byId = products.find(p => p.id && p.id.toLowerCase() === cleanParam);
  if (byId) return byId;

  // 2. Coincidencia por SKU
  const bySku = products.find(p => p.sku && p.sku.toLowerCase() === cleanParam);
  if (bySku) return bySku;

  // 3. Coincidencia exacta por slug de nombre o grupo
  const bySlug = products.find(p => {
    const sName = slugify(p.nombre);
    const sGroup = slugify(p.grupo_nombre);
    return (sName && sName === slugParam) || (sGroup && sGroup === slugParam);
  });
  if (bySlug) return bySlug;

  // 4. Si el slug incluye el ID (ej: "37-tapa-suichera" o "tapa-suichera-37")
  const byComposite = products.find(p => {
    if (!p.id) return false;
    const lowerId = p.id.toLowerCase();
    return cleanParam.startsWith(`${lowerId}-`) || cleanParam.endsWith(`-${lowerId}`);
  });
  if (byComposite) return byComposite;

  // 5. Coincidencia parcial si el slug comienza con el parámetro o viceversa
  const byPartial = products.find(p => {
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

/**
 * Busca una categoría de la lista de categorías según el slug de la URL.
 */
export function findCategoryBySlug(categories: string[], param: string): string | undefined {
  if (!param || categories.length === 0) return undefined;
  const cleanParam = decodeURIComponent(param).trim().toLowerCase();
  const slugParam = slugify(cleanParam);

  return categories.find(cat => {
    const sCat = slugify(cat);
    const kCat = getCategoryKey(cat);
    return sCat === slugParam || kCat === cleanParam || slugify(kCat) === slugParam;
  });
}
