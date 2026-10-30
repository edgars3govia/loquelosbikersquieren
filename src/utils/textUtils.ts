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
 * Splits query or text into normalized search tokens, eliminating empty strings and punctuation.
 */
export const tokenizeSearch = (str: string = ''): string[] => {
  if (!str || typeof str !== 'string') return [];
  const normalized = normalizeSearch(str);
  return normalized
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 0);
};

/**
 * Checks if search query is found in target text regardless of accents or casing.
 * Supports tokenized matching when multiple words are present.
 */
export const matchesSearch = (text: string = '', query: string = ''): boolean => {
  if (!query || !query.trim()) return true;
  const q = normalizeSearch(query);
  const t = normalizeSearch(text);
  if (t.includes(q)) return true;
  const tokens = tokenizeSearch(query);
  if (tokens.length === 0) return true;
  return tokens.some((token) => t.includes(token));
};

/**
 * Calculates a search relevance / similarity score for a product against a search query.
 * - Exact full query matches get the highest score.
 * - Each matching word from the query adds significant score.
 * - Prioritizes matches in product title (nombre), group name, SKU, keywords, categories.
 * - Supports prefix matching, partial word matching, and multi-word queries.
 * - Even if additional words are typed that don't match, existing matching words preserve the product in the results!
 */
export const calculateProductSearchScore = (
  product: {
    nombre?: string;
    grupo_nombre?: string;
    variante_nombre?: string;
    sku?: string;
    palabras_clave?: string;
    categoria?: string;
    categorias?: string[];
    subcategoria?: string;
    subcategorias?: string[];
  },
  query: string = ''
): number => {
  if (!query || !query.trim()) return 1;

  const queryNorm = normalizeSearch(query);
  const queryTokens = tokenizeSearch(query);
  if (queryTokens.length === 0) return 1;

  const nameNorm = normalizeSearch(product.nombre || '');
  const groupNorm = normalizeSearch(product.grupo_nombre || '');
  const variantNorm = normalizeSearch(product.variante_nombre || '');
  const skuNorm = normalizeSearch(product.sku || '');
  const keywordsNorm = normalizeSearch(product.palabras_clave || '');
  const catNorm = normalizeSearch(`${product.categoria || ''} ${(product.categorias || []).join(' ')}`);
  const subcatNorm = normalizeSearch(`${product.subcategoria || ''} ${(product.subcategorias || []).join(' ')}`);

  const nameTokens = tokenizeSearch(product.nombre || '');
  const groupTokens = tokenizeSearch(product.grupo_nombre || '');
  const keywordTokens = tokenizeSearch(product.palabras_clave || '');

  let score = 0;

  // 1. Full Query Exact or Substring Matches (Highest priority)
  if (nameNorm === queryNorm) {
    score += 5000;
  } else if (nameNorm.startsWith(queryNorm)) {
    score += 2500;
  } else if (nameNorm.includes(queryNorm)) {
    score += 1500;
  }

  if (groupNorm === queryNorm) {
    score += 3500;
  } else if (groupNorm.includes(queryNorm)) {
    score += 1200;
  }

  if (skuNorm === queryNorm) {
    score += 4000;
  } else if (skuNorm.includes(queryNorm)) {
    score += 1000;
  }

  if (keywordsNorm.includes(queryNorm)) {
    score += 800;
  }

  // 2. Token-by-Token Match Scoring
  let matchedTokens = 0;

  for (const qToken of queryTokens) {
    let tokenScore = 0;

    // Check exact token match in name
    if (nameTokens.includes(qToken)) {
      tokenScore += 400;
    } else if (nameNorm.includes(qToken)) {
      tokenScore += 250;
    } else if (nameTokens.some(nt => nt.startsWith(qToken) || qToken.startsWith(nt))) {
      tokenScore += 180;
    }

    // Check in group name
    if (groupTokens.includes(qToken)) {
      tokenScore += 300;
    } else if (groupNorm.includes(qToken)) {
      tokenScore += 180;
    }

    // Check in variant name
    if (variantNorm.includes(qToken)) {
      tokenScore += 200;
    }

    // Check in SKU
    if (skuNorm === qToken || skuNorm.includes(qToken)) {
      tokenScore += 300;
    }

    // Check in Keywords / Tags
    if (keywordTokens.includes(qToken)) {
      tokenScore += 180;
    } else if (keywordsNorm.includes(qToken)) {
      tokenScore += 120;
    }

    // Check in Category / Subcategory
    if (catNorm.includes(qToken) || subcatNorm.includes(qToken)) {
      tokenScore += 90;
    }

    // Partial 3-letter n-gram in name if token is at least 3 letters
    if (tokenScore === 0 && qToken.length >= 3) {
      for (let i = 0; i <= qToken.length - 3; i++) {
        const sub = qToken.slice(i, i + 3);
        if (nameNorm.includes(sub)) {
          tokenScore += 40;
          break;
        }
      }
    }

    if (tokenScore > 0) {
      score += tokenScore;
      matchedTokens++;
    }
  }

  // 3. Multi-word Match Bonus: reward products matching more query words
  if (matchedTokens > 0) {
    score += matchedTokens * 250;
    if (matchedTokens === queryTokens.length) {
      score += 1000; // All tokens matched bonus!
    } else if (matchedTokens > 1) {
      score += Math.round((matchedTokens / queryTokens.length) * 500);
    }
  }

  return score;
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

