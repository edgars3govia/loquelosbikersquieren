import { removeAccents, getCategoryKey } from './textUtils';
import { Producto } from '../types';

/**
 * Normaliza cualquier texto o slug para búsquedas ultra-tolerantes en URLs:
 * - Decodifica entidades URI (%C3%B1, etc.)
 * - Convierte caracteres acentuados a letras base
 * - Normaliza 'ñ' / 'Ñ' a 'n'
 * - Maneja variaciones históricas como "acompa-ante" -> "acompanante"
 * - Reemplaza cualquier carácter no alfanumérico por guiones limpios
 */
export function normalizeSlug(text?: string | null): string {
  if (!text) return '';
  let str = String(text);
  try {
    str = decodeURIComponent(str);
  } catch {}

  // Normalizar acentos descomponiendo caracteres diacríticos
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return removeAccents(str)
    .toLowerCase()
    .replace(/[ñ]/gi, 'n')
    // Tolerar variaciones comunes donde la 'ñ' fue convertida a guion por otros slugifiers
    .replace(/\bacompa-ante\b/gi, 'acompanante')
    .replace(/acompa-ante/gi, 'acompanante')
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no alfanuméricos por guiones
    .replace(/^-+|-+$/g, '');   // Eliminar guiones al inicio o al final
}

/**
 * Normaliza un texto a solo caracteres alfanuméricos sin guiones ni espacios.
 * Permite emparejar enlaces que tengan ligeras variaciones en los guiones.
 * Ej: "acompa-ante-pato-psyduck-metralleta" -> "acompanantepatopsyduckmetralleta"
 */
export function toAlphaNumericKey(text?: string | null): string {
  if (!text) return '';
  return normalizeSlug(text).replace(/[^a-z0-9]/g, '');
}

/**
 * Convierte cualquier texto en un slug URL limpio y canónico.
 * Ejemplo: "Acompañante Pato Psyduck" -> "acompanante-pato-psyduck"
 */
export function slugify(text?: string | null): string {
  return normalizeSlug(text);
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
 * Busca un producto en una lista según un parámetro que puede ser ID o slug,
 * de manera tolerante a variaciones de 'ñ', 'n', guiones y nombres compuestos.
 */
export function findProductBySlugOrId(products: Producto[], param: string): Producto | undefined {
  if (!param || !Array.isArray(products) || products.length === 0) return undefined;

  let rawParam = String(param).trim();
  try {
    rawParam = decodeURIComponent(rawParam);
  } catch {}

  const cleanParam = rawParam.toLowerCase().trim();
  const targetSlug = slugify(cleanParam);
  const targetKey = toAlphaNumericKey(cleanParam);

  // 1. Coincidencia exacta por ID de documento en Firestore
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

  // 4. Coincidencia alfanumérica pura (ignora guiones, dobles guiones y espacios)
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

  // 6. Coincidencia por inclusión / substring si el slug o nombre lo contiene
  const bySubstring = products.find(p => {
    const sName = slugify(p.nombre);
    const sGroup = slugify(p.grupo_nombre);
    const sProd = slugify(getProductSlug(p));
    const cleanCandidate = `${sGroup} ${sName} ${sProd}`;
    return cleanCandidate.includes(targetSlug) || (targetKey.length >= 3 && toAlphaNumericKey(cleanCandidate).includes(targetKey));
  });
  if (bySubstring) return bySubstring;

  // 7. Búsqueda tolerante por tokens relevantes (ej. ["psyduck"] o ["mandaloriano"] o ["acompanante", "pato"])
  const stopWords = new Set(['de', 'la', 'el', 'los', 'las', 'en', 'para', 'con', 'y', 'a', 'del', 'un', 'una', 'por']);
  const tokens = targetSlug
    .split('-')
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !stopWords.has(t));

  if (tokens.length >= 1) {
    let bestMatch: Producto | undefined = undefined;
    let maxMatchCount = 0;

    for (const p of products) {
      const candidateText = normalizeSlug(`${p.grupo_nombre || ''} ${p.nombre || ''} ${p.variante_nombre || ''}`);
      let matchCount = 0;
      for (const token of tokens) {
        if (candidateText.includes(token)) {
          matchCount++;
        }
      }

      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestMatch = p;
      }
    }

    if (bestMatch && maxMatchCount > 0) {
      return bestMatch;
    }
  }

  return undefined;
}

/**
 * Busca una categoría de la lista de categorías según el slug de la URL.
 */
export function findCategoryBySlug(categories: string[], param: string): string | undefined {
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
