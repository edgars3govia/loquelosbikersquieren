/**
 * Utility functions for accent-free text normalization and searches.
 * Strips Spanish and Latin diacritical accents (á, é, í, ó, ú, Á, É, Í, Ó, Ú, etc.)
 * so that names in inventory and throughout the app remain clean and without accents,
 * and search queries match seamlessly without being blocked by accents.
 */

export const removeAccents = (str: string = ''): string => {
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
    .replace(/[ÚÙÜÛ]/g, 'U');
};

/**
 * Normalizes text for search comparisons by stripping accents,
 * converting to lower case, and normalizing whitespace.
 */
export const normalizeSearch = (str: string = ''): string => {
  if (!str || typeof str !== 'string') return '';
  return removeAccents(str)
    .replace(/[ñ]/g, 'n')
    .replace(/[Ñ]/g, 'n')
    .toLowerCase()
    .trim();
};

/**
 * Checks if search query is found in target text regardless of accents or casing.
 */
export const matchesSearch = (text: string = '', query: string = ''): boolean => {
  if (!query || !query.trim()) return true;
  const q = normalizeSearch(query);
  const t = normalizeSearch(text);
  return t.includes(q);
};

/**
 * Cleans a category name by removing accents and trimming whitespace.
 * If empty or 'sin categoria', standardizes it.
 */
export const cleanCategoryName = (category: string = ''): string => {
  const cleaned = removeAccents((category || '').trim());
  if (!cleaned || cleaned.toLowerCase() === 'sin categoria') {
    return 'Sin Categoria';
  }
  return cleaned;
};

/**
 * Cleans a product name by removing accents and trimming excess whitespace.
 */
export const cleanProductName = (name: string = ''): string => {
  return removeAccents((name || '').trim());
};

/**
 * Returns a canonical key for comparing or deduplicating categories:
 * lowercased, single-spaced, without accents.
 * E.g., "  LUCES   LED  " -> "luces led"
 */
export const getCategoryKey = (category: string = ''): string => {
  if (!category || typeof category !== 'string') return '';
  return removeAccents(category.trim().replace(/\s+/g, ' ')).toLowerCase();
};

/**
 * Standardizes a category display name in Title Case without accents or duplicates.
 * E.g., "LUCES LED", "luces led", "Luces  Led" -> "Luces Led"
 */
export const formatCategoryDisplay = (category: string = ''): string => {
  const key = getCategoryKey(category);
  if (!key || key === 'sin categoria') return '';
  return key
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Extracts an array of lowercase canonical category keys from a product.
 * Handles both product.categorias (array of strings) and product.categoria (string, which can be comma/slash separated).
 */
export const getProductCategoryKeys = (product: { categoria?: string; categorias?: string[] } | null | undefined): string[] => {
  if (!product) return [];
  const keysSet = new Set<string>();

  // Check array of categories
  if (Array.isArray(product.categorias)) {
    product.categorias.forEach((c) => {
      if (typeof c === 'string') {
        const parts = c.split(/[,/|;]+/);
        parts.forEach((p) => {
          const k = getCategoryKey(p);
          if (k && k !== 'sin categoria') keysSet.add(k);
        });
      }
    });
  }

  // Check single category string
  if (typeof product.categoria === 'string' && product.categoria.trim()) {
    const parts = product.categoria.split(/[,/|;]+/);
    parts.forEach((p) => {
      const k = getCategoryKey(p);
      if (k && k !== 'sin categoria') keysSet.add(k);
    });
  }

  return Array.from(keysSet);
};

/**
 * Extracts an array of standardized Title Case category display names from a product.
 */
export const getProductCategoryNames = (product: { categoria?: string; categorias?: string[] } | null | undefined): string[] => {
  const keys = getProductCategoryKeys(product);
  return keys.map((k) => formatCategoryDisplay(k)).filter(Boolean);
};

/**
 * Returns a canonical key for comparing or deduplicating subcategories:
 * lowercased, single-spaced, without accents.
 * E.g., "  FAROS   LED  " -> "faros led"
 */
export const getSubcategoryKey = (subcategory: string = ''): string => {
  if (!subcategory || typeof subcategory !== 'string') return '';
  return removeAccents(subcategory.trim().replace(/\s+/g, ' ')).toLowerCase();
};

/**
 * Standardizes a subcategory display name in Title Case without accents.
 * E.g., "FAROS LED", "faros led" -> "Faros Led"
 */
export const formatSubcategoryDisplay = (subcategory: string = ''): string => {
  const key = getSubcategoryKey(subcategory);
  if (!key || key === 'sin subcategoria' || key === 'sin categoria') return '';
  return key
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Extracts an array of lowercase canonical subcategory keys from a product.
 * Handles both product.subcategorias (array of strings) and product.subcategoria (string, which can be comma/slash/pipe separated).
 */
export const getProductSubcategoryKeys = (
  product: { subcategoria?: string; subcategorias?: string[] } | null | undefined
): string[] => {
  if (!product) return [];
  const keysSet = new Set<string>();

  // Check array of subcategories
  if (Array.isArray(product.subcategorias)) {
    product.subcategorias.forEach((s) => {
      if (typeof s === 'string') {
        const parts = s.split(/[,/|;]+/);
        parts.forEach((p) => {
          const k = getSubcategoryKey(p);
          if (k && k !== 'sin subcategoria' && k !== 'sin categoria') {
            keysSet.add(k);
          }
        });
      }
    });
  }

  // Check single subcategoria string
  if (typeof product.subcategoria === 'string' && product.subcategoria.trim()) {
    const parts = product.subcategoria.split(/[,/|;]+/);
    parts.forEach((p) => {
      const k = getSubcategoryKey(p);
      if (k && k !== 'sin subcategoria' && k !== 'sin categoria') {
        keysSet.add(k);
      }
    });
  }

  return Array.from(keysSet);
};

/**
 * Extracts an array of standardized Title Case subcategory display names from a product.
 */
export const getProductSubcategoryNames = (
  product: { subcategoria?: string; subcategorias?: string[] } | null | undefined
): string[] => {
  if (!product) return [];
  const namesMap = new Map<string, string>();

  const extractRaw = (raw: string) => {
    const parts = raw.split(/[,/|;]+/);
    parts.forEach((p) => {
      const clean = removeAccents(p.trim());
      const k = getSubcategoryKey(clean);
      if (k && k !== 'sin subcategoria' && k !== 'sin categoria' && !namesMap.has(k)) {
        namesMap.set(k, formatSubcategoryDisplay(clean));
      }
    });
  };

  if (Array.isArray(product.subcategorias)) {
    product.subcategorias.forEach((s) => {
      if (typeof s === 'string') extractRaw(s);
    });
  }

  if (typeof product.subcategoria === 'string' && product.subcategoria.trim()) {
    extractRaw(product.subcategoria);
  }

  return Array.from(namesMap.values());
};

