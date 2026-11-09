import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Search, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  ChevronLeft,
  ChevronRight,
  ChevronDown, 
  Share2, 
  Phone, 
  User, 
  CreditCard, 
  MapPin, 
  Eye, 
  ExternalLink, 
  Copy, 
  Flame, 
  Star, 
  Sparkles, 
  SlidersHorizontal, 
  RotateCcw, 
  Package, 
  Compass, 
  ArrowLeft,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Clock,
  Printer,
  Upload,
  Receipt,
  Building,
  Image as ImageIcon,
  Store,
  Sliders,
  Edit3,
  Boxes,
  MessageCircle,
  Menu,
  Maximize2,
  Layers,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { collection, doc, setDoc, onSnapshot, query, orderBy, limit, addDoc, writeBatch, increment } from 'firebase/firestore';
import { db, cleanForFirestore } from '../lib/firebase';
import { Producto, CartItem, PedidoTienda, PedidoTiendaItem, GlobalFinancialSettings, StoreCustomTexts, PaymentMethodConfig } from '../types';
import { formatDirectImageUrl, extractDriveFileId } from '../utils/imageUrlHelper';
import { compressAndResizeImage } from '../utils/fileHelpers';
import { 
  removeAccents, 
  matchesSearch, 
  normalizeSearch,
  getCategoryKey, 
  formatCategoryDisplay, 
  getProductCategoryKeys, 
  getProductCategoryNames,
  getSubcategoryKey,
  formatSubcategoryDisplay,
  getProductSubcategoryKeys,
  getProductSubcategoryNames,
  calculateProductSearchScore,
  formatVES
} from '../utils/textUtils';
import { slugify, getProductSlug, findProductBySlugOrId, findCategoryBySlug } from '../utils/slugHelper';
import { 
  encodeSharedCart, 
  decodeSharedCart, 
  hydrateSharedCart, 
  parseQueryCart, 
  buildShortSharedCartQuery, 
  parseShortCartQuery 
} from '../utils/sharedCartHelper';
import { StoreCategoriesModal } from './StoreCategoriesModal';
import { StoreTextEditorModal, DEFAULT_STORE_TEXTS } from './StoreTextEditorModal';
import { EditableStoreText } from './EditableStoreText';
import { PaymentMethodsEditorModal } from './PaymentMethodsEditorModal';
import { ProductVariantsModal, isValidGroupId } from './ProductVariantsModal';
import { DEFAULT_PAYMENT_METHODS } from '../constants/defaultPaymentMethods';
import { fetchTasaOficialBCV, getCachedTasaBCV, DEFAULT_TASA_FALLBACK } from '../lib/tasaService';
import { STORE_WHATSAPP_PHONE, STORE_WHATSAPP_DISPLAY, STORE_WHATSAPP_VIP_CHANNEL, getWhatsAppDirectUrl } from '../constants/whatsapp';
import { FeaturedHomeSections } from './FeaturedHomeSections';

/**
 * Formatea un texto a formato "Title Case" o "Sentence Case" para títulos limpios y minimalistas
 */
const formatTitleCase = (text?: string): string => {
  if (!text) return '';
  const trimmed = text.trim();
  if (/^usdt/i.test(trimmed)) {
    return 'USDT (Tether USD)';
  }
  if (/^zinli/i.test(trimmed)) {
    return 'Zinli';
  }
  return trimmed
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'usdt') return 'USDT';
      if (lower === 'zinli') return 'Zinli';
      if (lower === 'usd') return 'USD';
      if (lower === 'bcv') return 'BCV';
      if (lower === 'rif') return 'RIF';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Formatea un texto a formato "Sentence case" o Capitalización simple (ej. "Todos los productos", "Accesorios - llaveros")
 */
const formatCategorySentenceCase = (text?: string): string => {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.includes(' - ')) {
    return trimmed
      .split(' - ')
      .map((part) => {
        const clean = part.trim();
        if (!clean) return '';
        return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
      })
      .join(' - ');
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

/**
 * Componente SVG para icono vectorial de WhatsApp (evita imágenes rotas o bordes invertidos)
 */
const WhatsAppVectorIcon: React.FC<{ className?: string; size?: number }> = ({ className = "w-4 h-4", size = 16 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    className={className} 
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.89-9.888 9.89m8.415-18.303A11.893 11.893 0 0012.046 0C5.467 0 .11 5.355.107 11.936c0 2.102.548 4.155 1.589 5.961L0 24l6.335-1.662a11.87 11.87 0 005.707 1.458h.005c6.578 0 11.934-5.356 11.937-11.938a11.85 11.85 0 00-3.484-8.441z"/>
  </svg>
);

/**
 * Formatea valores bancarios para erradicar mayúsculas sostenidas ("MERCANTIL" -> "Mercantil", "EDGAR CONTRERAS" -> "Edgar Contreras")
 * preservando números de cuenta, teléfonos, correos y prefijos de cédula/RIF (V- / J-) y nombres de marcas (Zinli, USDT).
 */
const formatBankValue = (value?: string): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  // Específico para USDT y Zinli
  if (/^usdt\s*\(\s*tether\s*usd\s*\)$/i.test(trimmed) || /^usdt$/i.test(trimmed)) {
    return 'USDT (Tether USD)';
  }
  if (/^zinli$/i.test(trimmed)) {
    return 'Zinli';
  }

  // Si es un número puro, teléfono, cuenta bancaria o formato numérico con guiones/puntos: no alterar
  if (/^[\d\s\-().+]+$/.test(trimmed)) {
    return trimmed;
  }

  // Si contiene formato de cédula o RIF tipo "V-12345678", "V12345678", "J-12345678"
  if (/^[vVeEjJgG]-?\s*[\d\s.]+$/i.test(trimmed)) {
    const prefix = trimmed.charAt(0).toUpperCase();
    const rest = trimmed.slice(1).replace(/^[\s-]+/, '').trim();
    return `${prefix}-${rest}`;
  }

  // Si alguien escribió "CEDULA V: 12345" o "V: 12345" en el valor
  if (/^(c[eé]dula\s*)?[vVeEjJgG]:?\s*[\d\s.]+$/i.test(trimmed)) {
    const match = trimmed.match(/([vVeEjJgG]):?\s*([\d\s.]+)$/i);
    if (match) {
      return `${match[1].toUpperCase()}-${match[2].trim()}`;
    }
  }

  // Si es un correo electrónico
  if (trimmed.includes('@') && !trimmed.includes(' ')) {
    return trimmed.toLowerCase();
  }

  // Si es una dirección de billetera cripto (alfanumérica larga)
  if (/^[a-zA-Z0-9]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // Para nombres de personas, bancos o textos generales ("MERCANTIL", "EDGAR CONTRERAS")
  const lowercaseWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'o', 'por', 'a']);
  return trimmed
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (lower === 'zinli') return 'Zinli';
      if (lower === 'usdt') return 'USDT';
      if (lower === 'usd') return 'USD';
      if (lower === 'tether') return 'Tether';
      if (lower === 'bcv') return 'BCV';
      if (lower === 'rif') return 'RIF';
      // Si la palabra es un prefijo de cédula pegado a números (ej. "V-12345")
      if (/^[vVeEjJgG]-?\d+$/i.test(word)) {
        return word.charAt(0).toUpperCase() + '-' + word.slice(1).replace(/^-/, '');
      }
      if (/^\d+$/.test(word)) {
        return word;
      }
      if (index > 0 && lowercaseWords.has(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Formatea y normaliza las etiquetas de los datos bancarios eliminando mayúsculas sostenidas
 * ("CEDULA V:" -> "Cédula", "BANCO:" -> "Banco") y acortando etiquetas para evitar truncamiento
 * ("Número de cuenta:" -> "Cuenta:", "Correo zinli:" -> "Correo Zinli:").
 */
const formatBankLabel = (rawLabel?: string): string => {
  if (!rawLabel) return '';
  let label = rawLabel.replace(/:+$/, '').trim();

  // Corregir número de cuenta / Cta Banesco a formato compacto ("Cuenta") para evitar truncado con puntos suspensivos
  if (
    /^(cta|cuenta)\s+banesco$/i.test(label) || 
    /^(cta|cuenta)\s+banco$/i.test(label) || 
    /^cta\b/i.test(label) || 
    /^n[uú]mero\s+de\s+cuenta$/i.test(label) ||
    /^num(ero)?\s+cuenta$/i.test(label) ||
    /^cuenta$/i.test(label)
  ) {
    return 'Cuenta';
  }

  // Corregir marcas y siglas para evitar "Correo zinli" o "Usdt (tether usd)"
  if (/^correo\s*zinli$/i.test(label) || /^zinli$/i.test(label)) {
    return 'Correo Zinli';
  }
  if (/^usdt(\s*\(.*\))?$/i.test(label) || /^red\s*usdt$/i.test(label) || /tether/i.test(label)) {
    return 'USDT (Tether USD)';
  }

  // Normalizar variaciones de Cédula
  if (/^c[eé]dula(\s*v)?$/i.test(label) || /^c[eé]dula\s*v:?$/i.test(label)) {
    return 'Cédula';
  }
  if (/^c[eé]dula\s*\/\s*rif$/i.test(label)) {
    return 'Cédula / RIF';
  }
  if (/^rif$/i.test(label)) {
    return 'RIF';
  }
  if (/^titular$/i.test(label)) {
    return 'Titular';
  }
  if (/^beneficiario$/i.test(label)) {
    return 'Beneficiario';
  }
  if (/^banco$/i.test(label)) {
    return 'Banco';
  }
  if (/^tel[eé]fono$/i.test(label)) {
    return 'Teléfono';
  }

  // Capitalización de marcas y palabras para cualquier otra etiqueta
  return label
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'zinli') return 'Zinli';
      if (lower === 'usdt') return 'USDT';
      if (lower === 'usd') return 'USD';
      if (lower === 'tether') return 'Tether';
      if (lower === 'bcv') return 'BCV';
      if (lower === 'rif') return 'RIF';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// ============================================================================
// COMPONENTE: CARRUSEL DE IMÁGENES MULTI-FOTO CON FLECHAS, SWIPE Y MINIATURAS
// ============================================================================
interface StoreImageCarouselProps {
  images: string[];
  currentIndex: number;
  onIndexChange: (newIndex: number) => void;
  altText: string;
  onOpenDetail?: () => void;
  onImageClick?: () => void;
  className?: string;
  imageClassName?: string;
  showThumbnails?: boolean;
  containerClassName?: string;
}

export const StoreImageCarousel: React.FC<StoreImageCarouselProps> = ({
  images,
  currentIndex,
  onIndexChange,
  altText,
  onOpenDetail,
  onImageClick,
  className = "h-32 sm:h-36 md:h-40 max-h-40 w-full",
  imageClassName,
  showThumbnails = true,
  containerClassName,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const validImages = useMemo(() => {
    return images.filter(Boolean);
  }, [images]);

  const safeIndex = validImages.length > 0 
    ? ((currentIndex % validImages.length) + validImages.length) % validImages.length 
    : 0;
  const currentImage = validImages[safeIndex] || '';

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (validImages.length <= 1) return;
    const nextIdx = (safeIndex - 1 + validImages.length) % validImages.length;
    onIndexChange(nextIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (validImages.length <= 1) return;
    const nextIdx = (safeIndex + 1) % validImages.length;
    onIndexChange(nextIdx);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 35;
    if (distance > minSwipeDistance) {
      // Deslizó hacia la izquierda -> Siguiente foto
      if (validImages.length > 1) {
        onIndexChange((safeIndex + 1) % validImages.length);
      }
    } else if (distance < -minSwipeDistance) {
      // Deslizó hacia la derecha -> Foto anterior
      if (validImages.length > 1) {
        onIndexChange((safeIndex - 1 + validImages.length) % validImages.length);
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <div className={`w-full flex flex-col select-none ${containerClassName || 'space-y-1'}`}>
      {/* Contenedor Principal de la Imagen */}
      <div
        onClick={() => {
          if (onImageClick) {
            onImageClick();
          } else if (onOpenDetail) {
            onOpenDetail();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full overflow-hidden flex items-center justify-center cursor-pointer group/img transition-transform ${
          className.includes('bg-') ? '' : 'bg-[#FAFAFA]'
        } ${className.includes('rounded') ? className : `rounded-sm ${className}`}`}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={altText}
            className={`w-full h-full ${imageClassName || 'object-cover'} transition-transform duration-500 group-hover/img:scale-105`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Package size={28} />
            <span className="text-[8.5px] font-medium">Sin foto</span>
          </div>
        )}

        {/* Indicador flotante Ver Detalle al pasar el cursor */}
        {onOpenDetail && !onImageClick && (
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="px-2.5 py-1 bg-[#111111]/90 text-white rounded-md text-[8.5px] font-medium flex items-center gap-1 shadow-sm">
              <Eye size={11} className="text-[#FFC107]" /> Ver detalle
            </span>
          </div>
        )}

        {/* Indicador flotante de Pantalla Completa / Ampliar cuando se pasa onImageClick */}
        {onImageClick && currentImage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick();
            }}
            aria-label="Ver a pantalla completa"
            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/85 text-white p-1.5 sm:px-2 sm:py-1 rounded-md shadow-xs opacity-80 sm:opacity-0 group-hover/img:opacity-100 transition-all flex items-center gap-1 z-10 cursor-pointer backdrop-blur-xs"
          >
            <Maximize2 size={13} strokeWidth={2} />
            <span className="text-[10px] font-medium hidden sm:inline">Ampliar</span>
          </button>
        )}

        {/* Contador de Fotos (ej: 1/4) - Solo si hay más de 1 foto */}
        {validImages.length > 1 && (
          <div className="absolute top-1.5 right-1.5 bg-black/75 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold z-10 pointer-events-none shadow-xs">
            {safeIndex + 1}/{validImages.length}
          </div>
        )}

        {/* Flecha Lateral Izquierda (<) - Solo si hay más de 1 foto */}
        {validImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto anterior"
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 hover:bg-white text-[#111111] hover:text-[#FF5722] flex items-center justify-center border border-gray-200 shadow-md cursor-pointer z-20 transition-all active:scale-90 opacity-90 sm:opacity-0 sm:group-hover/img:opacity-100"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
        )}

        {/* Flecha Lateral Derecha (>) - Solo si hay más de 1 foto */}
        {validImages.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Siguiente foto"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 hover:bg-white text-[#111111] hover:text-[#FF5722] flex items-center justify-center border border-gray-200 shadow-md cursor-pointer z-20 transition-all active:scale-90 opacity-90 sm:opacity-0 sm:group-hover/img:opacity-100"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Mini-Carrusel de Galería con Altura Fija de 64px (h-16 shrink-0) para Zero CLS */}
      {showThumbnails && (
        <div className="h-16 shrink-0 flex items-center gap-1.5 overflow-x-auto py-1 px-3 md:px-0.5 custom-scrollbar">
          {validImages.length > 0 ? (
            validImages.map((thumbUrl, tIdx) => {
              const isSelectedThumb = tIdx === safeIndex;
              return (
                <button
                  key={`thumb-${tIdx}-${thumbUrl.slice(-15)}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange(tIdx);
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-md overflow-hidden shrink-0 border transition-all cursor-pointer relative bg-gray-50 ${
                    isSelectedThumb
                      ? 'border-[#FF5200] ring-1 ring-[#FF5200] scale-105 opacity-100 shadow-xs'
                      : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400'
                  }`}
                  title={`Ver foto ${tIdx + 1}`}
                >
                  <img
                    src={thumbUrl}
                    alt={`Miniatura ${tIdx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
                </button>
              );
            })
          ) : (
            <div className="h-11 sm:h-12 w-full" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
};

// Helper para reunir las fotos disponibles garantizando exclusividad absoluta:
// - Al abrir la página (modo portada): muestra prioritariamente la foto asignada como portada en la base de datos (grupo_imagen_portada).
// - Si la variante es la opción Kit (es_kit): muestra la foto unificada del kit (grupo_kit_imagen).
// - Si es una variante individual: reúne las fotos de esa variante y EXCLUYE estrictamente fotos ajenas.
const getItemImages = (
  item: {
    isGroup: boolean;
    coverProduct: Producto;
    coverImage?: string;
    variants: Producto[];
    hasKit?: boolean;
    kitImage?: string;
  },
  activeVariant: Producto,
  isCoverView: boolean = false
): string[] => {
  // 1. Obtener identificadores y URLs de la foto unificada del kit si existe
  const rawKitImg = item.kitImage || activeVariant.grupo_kit_imagen || item.coverProduct?.grupo_kit_imagen || '';
  const kitDirectUrl = rawKitImg ? formatDirectImageUrl(rawKitImg) : '';
  const kitDriveId = rawKitImg ? (extractDriveFileId(rawKitImg) || (!rawKitImg.includes('/') ? rawKitImg : '')) : '';

  // CASO 0: Modo Portada Inicial (al abrir la página para productos con variantes)
  // Cuando el usuario aún no ha seleccionado una variante específica, se prioriza estrictamente la foto asignada como portada en la base de datos
  if (item.isGroup && item.coverImage && isCoverView) {
    const directCover = formatDirectImageUrl(item.coverImage);
    if (directCover) {
      // Reúne también las fotos secundarias de la portada base para el carrusel sin duplicados
      const baseImages = getItemImages(item, activeVariant, false);
      return [directCover, ...baseImages.filter(img => img !== directCover)];
    }
  }

  // CASO A: La variante activa ES la opción Kit
  if (activeVariant.es_kit) {
    const kitPhotos: string[] = [];
    if (kitDirectUrl) kitPhotos.push(kitDirectUrl);
    const varMain = formatDirectImageUrl(activeVariant.imagen_url || activeVariant.link);
    if (varMain && !kitPhotos.includes(varMain)) kitPhotos.push(varMain);
    if (activeVariant.variante_imagen_hd) {
      const hd = formatDirectImageUrl(activeVariant.variante_imagen_hd);
      if (hd && !kitPhotos.includes(hd)) kitPhotos.push(hd);
    }
    return kitPhotos.length > 0 ? kitPhotos : (kitDirectUrl ? [kitDirectUrl] : []);
  }

  // CASO B: Variante individual regular (la foto unificada del kit y portadas globales ajenas NO deben incluirse aquí)
  const imagesList: string[] = [];

  // 1. Foto principal y propia de la variante seleccionada (prioridad máxima y exclusiva)
  // Regla estricta: selectedVariant.variante_imagen_miniatura || selectedVariant.imagen_portada || selectedVariant.link || selectedVariant.imagen_url
  const heroRaw = activeVariant.variante_imagen_miniatura || activeVariant.imagen_portada || activeVariant.link || activeVariant.imagen_url;
  if (heroRaw) {
    const formatted = formatDirectImageUrl(heroRaw);
    if (formatted) imagesList.push(formatted);
  }

  // 2. Foto HD específica de la variante activa si existe
  if (activeVariant.variante_imagen_hd) {
    const formatted = formatDirectImageUrl(activeVariant.variante_imagen_hd);
    if (formatted) imagesList.push(formatted);
  }

  // 3. Portada específica si difiere de heroRaw
  if (activeVariant.imagen_portada) {
    const formatted = formatDirectImageUrl(activeVariant.imagen_portada);
    if (formatted) imagesList.push(formatted);
  }

  // 4. Fotos secundarias exclusivas de esta misma variante (Galería de este modelo)
  if (Array.isArray(activeVariant.imagenes_secundarias)) {
    activeVariant.imagenes_secundarias.forEach(url => {
      if (url) imagesList.push(formatDirectImageUrl(url));
    });
  }

  // 5. Colección de imágenes adicionales asociadas a esta variante
  if (Array.isArray(activeVariant.imagenes)) {
    activeVariant.imagenes.forEach(u => {
      if (u) imagesList.push(formatDirectImageUrl(u));
    });
  }

  // Deduplicar manteniendo el orden de prioridad y APLICAR EXCLUSIVIDAD ESTRICTA DEL KIT
  const seen = new Set<string>();
  const uniqueList: string[] = [];
  imagesList.forEach(url => {
    const clean = url?.trim();
    if (!clean || seen.has(clean)) return;

    // Verificar si esta foto es la del kit para excluirla de las variantes individuales
    const isKitPhoto = Boolean(
      (kitDirectUrl && clean === kitDirectUrl) || 
      (kitDriveId && (clean.includes(kitDriveId) || extractDriveFileId(clean) === kitDriveId))
    );

    if (!isKitPhoto) {
      seen.add(clean);
      uniqueList.push(clean);
    }
  });

  // Si después del filtrado no quedó ninguna foto, asegurar la foto principal de la variante
  if (uniqueList.length === 0 && heroRaw) {
    return [formatDirectImageUrl(heroRaw)];
  }

  return uniqueList;
};

interface BikerStoreProps {
  products?: Producto[];
  financialSettings?: GlobalFinancialSettings;
  onExitToAdmin?: () => void;
  isAdmin?: boolean;
  initialProductSlug?: string;
  initialCategorySlug?: string;
}

export const BikerStore: React.FC<BikerStoreProps> = ({
  products = [],
  financialSettings = {
    tarifaAereaGramo: 0.020,
    factorImpuestoAereo: 1.42,
    tasaYuanUSD: 7.00,
    tasaBCV: 0,
    tasaSubasta: 0,
    factorComisionBarco: 1.07
  },
  onExitToAdmin,
  isAdmin = false,
  initialProductSlug,
  initialCategorySlug
}) => {
  // Support activating admin controls via props, URL param (?admin=true), or localStorage
  const [isAdminMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true' || params.get('modo') === 'admin') return true;
      return localStorage.getItem('biker_store_admin_mode') === 'true';
    }
    return false;
  });
  const effectiveAdmin = isAdmin || isAdminMode;

  // Exchange rate: Live official BCV rate (ve.dolarapi.com) + Cache + Firestore sync
  const [liveTasaBCV, setLiveTasaBCV] = useState<number>(() => {
    const cached = getCachedTasaBCV();
    if (cached > 1) return cached;
    if (financialSettings.tasaBCV > 1) return financialSettings.tasaBCV;
    return DEFAULT_TASA_FALLBACK;
  });
  const [isFetchingTasa, setIsFetchingTasa] = useState<boolean>(false);
  const [_tasaFecha, setTasaFecha] = useState<string | null>(() => {
    try {
      return localStorage.getItem('biker_store_tasa_bcv_fecha') || null;
    } catch {
      return null;
    }
  });

  // Consulta automática en tiempo real de la tasa oficial del BCV al cargar la tienda
  useEffect(() => {
    let isMounted = true;
    const loadLiveRate = async () => {
      setIsFetchingTasa(true);
      try {
        const result = await fetchTasaOficialBCV();
        if (isMounted && result.tasa > 1) {
          setLiveTasaBCV(result.tasa);
          if (result.fechaActualizacion) {
            setTasaFecha(result.fechaActualizacion);
          }
        }
      } catch (err) {
        console.warn('Error al consultar tasa oficial BCV:', err);
      } finally {
        if (isMounted) setIsFetchingTasa(false);
      }
    };

    loadLiveRate();
    return () => {
      isMounted = false;
    };
  }, []);

  const [syncedTasaBCV, setSyncedTasaBCV] = useState<number>(0);

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'configuracion', 'financiera'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data.tasaBCV === 'number' && data.tasaBCV > 1) {
            setSyncedTasaBCV(data.tasaBCV);
          }
        }
      }, () => {});
      return () => unsub();
    } catch {}
  }, []);

  // Tasa final efectiva: se calcula siempre con la tasa oficial real del día
  const tasaBCV = liveTasaBCV > 1
    ? liveTasaBCV
    : (syncedTasaBCV > 1 ? syncedTasaBCV : (financialSettings.tasaBCV > 1 ? financialSettings.tasaBCV : DEFAULT_TASA_FALLBACK));

  // Smart Sticky Header: desaparece al scrollear hacia abajo, reaparece de inmediato al subir
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollYRef.current + 8) {
        // Scrolling down: ocultar barra
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollYRef.current - 8) {
        // Scrolling up: reaparecer de inmediato
        setIsHeaderVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'destacados' | 'precio_asc' | 'precio_desc' | 'nombre'>('destacados');

  // Cart State (persisted in localStorage for customer convenience)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('biker_store_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Producto | null>(null);
  const [completedOrder, setCompletedOrder] = useState<PedidoTienda | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDrawerCategoriesOpen, setIsDrawerCategoriesOpen] = useState(false);

  // Close hamburger drawer on ESC key
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Shipping Form State (The exact 4 fields requested + payment method)
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCedula, setClienteCedula] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccionAgencia, setDireccionAgencia] = useState('');
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState<'MRW' | 'Zoom' | 'Tealca' | 'Domesa' | 'Otra'>('MRW');
  const [metodoEntrega, setMetodoEntrega] = useState<'retiro' | 'envio'>('envio');
  const [metodoPago, setMetodoPago] = useState<string>('Pago Móvil');
  const [notasCliente, setNotasCliente] = useState('');
  const [isPickupPromptOpen, setIsPickupPromptOpen] = useState(false);
  
  // Payment mode: 'whatsapp' (manual coordination) or 'comprobante' (instant upload & automatic entry)
  const [tipoConfirmacion, setTipoConfirmacion] = useState<'whatsapp' | 'comprobante'>('comprobante');
  const [checkoutStep, setCheckoutStep] = useState<0 | 1 | 2>(0);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [comprobanteFileName, setComprobanteFileName] = useState<string | null>(null);
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState<boolean>(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [isOrderSummaryExpanded, setIsOrderSummaryExpanded] = useState<boolean>(false);
  const [copiedSharedCartLink, setCopiedSharedCartLink] = useState<boolean>(false);
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState<boolean>(false);
  const sharePopoverRef = useRef<HTMLDivElement | null>(null);
  const [sharedCartToast, setSharedCartToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const sharedCartToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cerrar el popover de compartir si se hace clic afuera
  useEffect(() => {
    if (!isSharePopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sharePopoverRef.current && !sharePopoverRef.current.contains(e.target as Node)) {
        setIsSharePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSharePopoverOpen]);

  const triggerSharedCartToast = (message: string, type: 'success' | 'info' = 'success') => {
    setSharedCartToast({ message, type });
    if (sharedCartToastTimeoutRef.current) {
      clearTimeout(sharedCartToastTimeoutRef.current);
    }
    sharedCartToastTimeoutRef.current = setTimeout(() => {
      setSharedCartToast(null);
    }, 4500);
  };

  const handleCopySharedCartLink = async (deliveryMethod: 'mrw' | 'zoom' | 'tienda' | 'envio' = 'mrw') => {
    const activeItems = cart.filter(it => it.quantity > 0);
    if (activeItems.length === 0) return;

    try {
      const isTienda = deliveryMethod === 'tienda';
      setMetodoEntrega(isTienda ? 'retiro' : 'envio');
      if (deliveryMethod === 'zoom') {
        setAgenciaSeleccionada('Zoom');
      } else if (deliveryMethod === 'mrw' || deliveryMethod === 'envio') {
        setAgenciaSeleccionada('MRW');
      }

      // Formato plano ultracompacto: https://www.loquelosbikersquieren.com/?c=ID1:QTY,ID2:QTY&d=TIPO
      const shortQuery = buildShortSharedCartQuery(activeItems, deliveryMethod);
      const origin = 'https://www.loquelosbikersquieren.com';
      const shareUrl = `${origin}/?${shortQuery}`;

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setCopiedSharedCartLink(true);
      setTimeout(() => setCopiedSharedCartLink(false), 2500);
      setIsSharePopoverOpen(false);

      const toastMessage = isTienda
        ? "¡Enlace copiado (Retiro en Tienda)!"
        : deliveryMethod === 'zoom'
        ? "¡Enlace copiado (Envío Zoom)!"
        : "¡Enlace copiado (Envío MRW)!";

      triggerSharedCartToast(toastMessage, "success");
    } catch (err) {
      console.error("Error copying shared cart link:", err);
    }
  };

  // Configuración de Métodos de Pago editables (Pago Móvil, Transferencia, Zinli, USDT, etc.)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() => {
    try {
      const saved = localStorage.getItem('biker_store_payment_methods');
      const parsed = saved ? JSON.parse(saved) : DEFAULT_PAYMENT_METHODS;
      const list = Array.isArray(parsed) ? parsed : DEFAULT_PAYMENT_METHODS;
      return list.filter((m: PaymentMethodConfig) => m.id !== 'zinli' && m.nombre?.toLowerCase() !== 'zinli');
    } catch {
      return DEFAULT_PAYMENT_METHODS;
    }
  });
  const [isPaymentMethodsModalOpen, setIsPaymentMethodsModalOpen] = useState(false);
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [variantsModalInitialGroupId, setVariantsModalInitialGroupId] = useState<string | null>(null);

  // Fallback public listener for products to ensure incognito / public visitors ALWAYS see the 78 products immediately
  const [dbProducts, setDbProducts] = useState<Producto[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  // Active variant per group map (for interactive variant switching on cards)
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({});
  // Card image active index map (for multi-image navigation on catalog cards)
  const [cardImageIndexMap, setCardImageIndexMap] = useState<Record<string, number>>({});
  // QuickView active variant and image index
  const [quickViewActiveVariant, setQuickViewActiveVariant] = useState<Producto | null>(null);
  const [quickViewImageIndex, setQuickViewImageIndex] = useState<number>(0);
  const [quickViewQty, setQuickViewQty] = useState<number>(1);
  const [quickViewAdded, setQuickViewAdded] = useState<boolean>(false);
  const [quickViewUserSelectedVariant, setQuickViewUserSelectedVariant] = useState<boolean>(false);

  // Estados para Visor de Imágenes a Pantalla Completa (Lightbox)
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number>(0);
  const [lightboxTouchStartX, setLightboxTouchStartX] = useState<number | null>(null);
  const [lightboxTouchEndX, setLightboxTouchEndX] = useState<number | null>(null);

  // Estados para Animación Espacial "Fly-to-Cart" y Dropdown Minimalista de Confirmación
  const [flyingItem, setFlyingItem] = useState<{
    id: number;
    imageUrl: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    isFlying: boolean;
  } | null>(null);

  const [isCartBouncing, setIsCartBouncing] = useState(false);

  const [addedHeaderDropdown, setAddedHeaderDropdown] = useState<{
    id: number;
    productName: string;
    imageUrl: string;
    priceUSD: number;
    priceBS: number;
    quantity: number;
  } | null>(null);

  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number }>({ top: 86, right: 16 });
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const headerDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerFlyToCart = (
    product: Producto,
    qty: number,
    sourceElement?: HTMLElement | null
  ) => {
    // 1. Forzar la reaparición inmediata del Header para que el carrito esté 100% visible
    setIsHeaderVisible(true);

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

    // En Desktop, el destino apunta dinámicamente SIEMPRE al ícono del carrito en el Header principal de la página
    let cartBtn: HTMLElement | null = null;
    if (isDesktop) {
      cartBtn = document.getElementById('header-cart-button');
    } else {
      const modalCartBtn = document.getElementById('modal-cart-button');
      cartBtn = (modalCartBtn && modalCartBtn.offsetParent !== null)
        ? modalCartBtn
        : (document.getElementById('header-cart-button-mobile') || document.getElementById('header-cart-button'));
    }

    const cartRect = cartBtn
      ? cartBtn.getBoundingClientRect()
      : { left: window.innerWidth - 50, top: 20, width: 36, height: 36 };

    const targetX = cartRect.left + cartRect.width / 2;
    const targetY = cartRect.top + cartRect.height / 2;

    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (sourceElement) {
      const rect = sourceElement.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else {
      const qvImg = document.getElementById('quickview-main-image');
      if (qvImg) {
        const rect = qvImg.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }
    }

    const rawImg = product.variante_imagen_miniatura || product.imagen_portada || product.imagen_url || product.link || '';
    const imgUrl = rawImg ? formatDirectImageUrl(rawImg) : '';

    const flyId = Date.now();
    setFlyingItem({
      id: flyId,
      imageUrl: imgUrl,
      startX,
      startY,
      targetX,
      targetY,
      isFlying: false
    });

    // Activar transición de vuelo en el siguiente cuadro de animación
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyingItem((curr) => (curr?.id === flyId ? { ...curr, isFlying: true } : curr));
      });
    });

    // Duración del vuelo hacia el ícono del Header: 620ms
    setTimeout(() => {
      setFlyingItem((curr) => (curr?.id === flyId ? null : curr));

      // Rebote visual (bounce) en el ícono del carrito en el Header
      setIsCartBouncing(true);
      setTimeout(() => setIsCartBouncing(false), 450);

      // Flujo Inmersivo Desktop: Si el producto se agrega desde el modal QuickView,
      // cerrar automáticamente el modal y abrir el panel lateral (drawer) del carrito
      if (isDesktop && quickViewProduct) {
        closeQuickView();
        setIsCartOpen(true);
        setAddedHeaderDropdown(null);
        return;
      }

      // En catálogo o móvil: Desplegar dropdown de confirmación anclado
      const currentCartBtn = isDesktop
        ? document.getElementById('header-cart-button')
        : ((document.getElementById('modal-cart-button') && document.getElementById('modal-cart-button')!.offsetParent !== null)
            ? document.getElementById('modal-cart-button')
            : (document.getElementById('header-cart-button-mobile') || document.getElementById('header-cart-button')));

      if (currentCartBtn) {
        const cRect = currentCartBtn.getBoundingClientRect();
        setDropdownPosition({
          top: Math.max(10, cRect.bottom + 8),
          right: Math.max(8, window.innerWidth - cRect.right)
        });
      }

      // Despliegue de la tarjeta minimalista (Dropdown) con animación de entrada
      const unitPrice = product.precio_venta_ref || product.precio_mayor || 0;
      setIsDropdownClosing(false);
      setAddedHeaderDropdown({
        id: flyId,
        productName: product.nombre,
        imageUrl: rawImg,
        priceUSD: unitPrice,
        priceBS: unitPrice * tasaBCV,
        quantity: qty
      });

      if (headerDropdownTimerRef.current) {
        clearTimeout(headerDropdownTimerRef.current);
      }
      // Mantener visible durante unos 3 segundos y deslizarse suavemente hacia arriba
      headerDropdownTimerRef.current = setTimeout(() => {
        setIsDropdownClosing(true);
        setTimeout(() => {
          setAddedHeaderDropdown((curr) => (curr?.id === flyId ? null : curr));
          setIsDropdownClosing(false);
        }, 300);
      }, 2900);
    }, 620);
  };

  useEffect(() => {
    try {
      const q = query(collection(db, 'productos'));
      const unsub = onSnapshot(q, (snapshot) => {
        const list: Producto[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as any;
          const rawLink = data.link || (data.imagen_url && data.imagen_url.includes('http') ? data.imagen_url : '');
          const idOnly = extractDriveFileId(rawLink || data.imagen_url) || (!data.imagen_url?.includes('/') ? data.imagen_url : '');
          
          // Los nombres de las variantes en Firestore son legítimos y se mantienen intactos
          const varianteNombre = data.variante_nombre;
          
          // Corregir únicamente posibles desalineaciones en el texto del nombre secundario
          let nombreItem = data.nombre || '';
          if (docSnap.id === 'J5LtYs3rOF9iuwk2isUY') {
            nombreItem = 'tornillos decorativos - pua negro (par)';
          } else if (docSnap.id === 'W6l5zqNhGRwVskCwBgoA') {
            nombreItem = 'tornillos decorativos - pua rojo (par)';
          }

          return {
            id: docSnap.id,
            ...data,
            variante_nombre: varianteNombre,
            nombre: removeAccents(nombreItem),
            categoria: removeAccents(data.categoria || ''),
            subcategoria: data.subcategoria ? removeAccents(String(data.subcategoria)).trim() : '',
            subcategorias: Array.isArray(data.subcategorias)
              ? data.subcategorias.map((s: any) => removeAccents(String(s || '')).trim()).filter(Boolean)
              : (data.subcategoria ? [removeAccents(String(data.subcategoria)).trim()] : []),
            palabras_clave: removeAccents(data.palabras_clave || ''),
            link: rawLink || (idOnly ? `https://drive.google.com/file/d/${idOnly}/view` : ''),
            imagen_url: idOnly || data.imagen_url || ''
          };
        });
        setDbProducts(list);
        setIsLoadingProducts(false);
      }, (err) => {
        console.warn("BikerStore public products listener error:", err);
        setIsLoadingProducts(false);
      });
      return () => unsub();
    } catch (err) {
      console.warn("Could not attach public products listener:", err);
      setIsLoadingProducts(false);
    }
  }, []);

  // Definitive source of products (prop or direct snapshot)
  const sourceProducts = useMemo(() => {
    const rawList = products.length > 0 ? products : dbProducts;
    return rawList.map(p => {
      if (p.id === 'J5LtYs3rOF9iuwk2isUY') {
        return {
          ...p,
          variante_nombre: 'negro',
          nombre: 'tornillos decorativos - pua negro (par)',
          imagen_url: p.imagen_url || '1dx2Siz9X1ZfcX5SRuy9e52-NyJ_HBLXt'
        };
      }
      if (p.id === 'W6l5zqNhGRwVskCwBgoA') {
        return {
          ...p,
          variante_nombre: 'rojo',
          nombre: 'tornillos decorativos - pua rojo (par)',
          imagen_url: p.imagen_url || '1tSIc-2TErMaUTnK6imlbnGjzZCFZ_BO0'
        };
      }
      return p;
    });
  }, [products, dbProducts]);

  // Store Hidden Categories (synced with Firestore and localStorage)
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('biker_store_hidden_categories');
      return saved ? JSON.parse(saved) : ['embalaje'];
    } catch {
      return ['embalaje'];
    }
  });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Sync hidden categories with Firestore in real-time
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'configuracion', 'tienda_categorias'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.hiddenCategories)) {
            setHiddenCategories(data.hiddenCategories);
            try {
              localStorage.setItem('biker_store_hidden_categories', JSON.stringify(data.hiddenCategories));
            } catch {}
          }
        }
      }, (e) => {
        console.log('tienda_categorias listener note:', e);
      });
      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleUpdateHiddenCategories = async (newHidden: string[]) => {
    setHiddenCategories(newHidden);
    try {
      localStorage.setItem('biker_store_hidden_categories', JSON.stringify(newHidden));
      await setDoc(doc(db, 'configuracion', 'tienda_categorias'), {
        hiddenCategories: newHidden,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving hidden store categories:", e);
    }
  };

  // Custom Store Texts (Editable by Admin)
  const [customTexts, setCustomTexts] = useState<StoreCustomTexts>(() => {
    try {
      const saved = localStorage.getItem('biker_store_custom_texts');
      return saved ? JSON.parse(saved) : DEFAULT_STORE_TEXTS;
    } catch {
      return DEFAULT_STORE_TEXTS;
    }
  });
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [textEditorInitialKey, setTextEditorInitialKey] = useState<string | null>(null);

  // Sync custom texts with Firestore in real-time
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'configuracion', 'tienda_textos'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data === 'object') {
            const merged = { ...DEFAULT_STORE_TEXTS, ...data };
            setCustomTexts(merged);
            try {
              localStorage.setItem('biker_store_custom_texts', JSON.stringify(merged));
            } catch {}
          }
        }
      }, (e) => {
        console.log('tienda_textos listener note:', e);
      });
      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveCustomTexts = async (updatedTexts: StoreCustomTexts) => {
    setCustomTexts(updatedTexts);
    try {
      localStorage.setItem('biker_store_custom_texts', JSON.stringify(updatedTexts));
      await setDoc(doc(db, 'configuracion', 'tienda_textos'), {
        ...updatedTexts,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving store custom texts:", e);
      throw e;
    }
  };

  const handleOpenTextEditorFor = (key: keyof StoreCustomTexts) => {
    setTextEditorInitialKey(String(key));
    setIsTextEditorOpen(true);
  };

  // Sync payment methods with Firestore in real-time
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'configuracion', 'tienda_metodos_pago'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.methods) && data.methods.length > 0) {
            const filtered = data.methods.filter((m: any) => m.id !== 'zinli' && m.nombre?.toLowerCase() !== 'zinli');
            setPaymentMethods(filtered);
            try {
              localStorage.setItem('biker_store_payment_methods', JSON.stringify(filtered));
            } catch {}
          }
        }
      }, (e) => {
        console.log('tienda_metodos_pago listener note:', e);
      });
      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSavePaymentMethods = async (updatedMethods: PaymentMethodConfig[]) => {
    const filtered = updatedMethods.filter(m => m.id !== 'zinli' && m.nombre?.toLowerCase() !== 'zinli');
    setPaymentMethods(filtered);
    try {
      localStorage.setItem('biker_store_payment_methods', JSON.stringify(filtered));
      await setDoc(doc(db, 'configuracion', 'tienda_metodos_pago'), {
        methods: filtered,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving payment methods:", e);
      throw e;
    }
  };

  const activePaymentMethods = useMemo(() => {
    const raw = paymentMethods.length > 0 ? paymentMethods : DEFAULT_PAYMENT_METHODS;
    return raw.filter(m => m.activo !== false && m.id !== 'zinli' && m.nombre?.toLowerCase() !== 'zinli');
  }, [paymentMethods]);

  // Lista de métodos disponibles según el tipo de entrega (Retiro local incluye 'Pago en tienda' al final)
  const availablePaymentMethods = useMemo(() => {
    if (metodoEntrega === 'retiro') {
      const storeMethod: PaymentMethodConfig = {
        id: 'pago_tienda_local',
        nombre: 'Pago en tienda',
        moneda: 'AMBAS',
        instrucciones: 'Paga en efectivo o punto de venta al retirar tus productos en Moto Cristo.',
        activo: true,
        campos: []
      };
      return [...activePaymentMethods, storeMethod];
    }
    return activePaymentMethods;
  }, [metodoEntrega, activePaymentMethods]);

  // Ensure metodoPago matches an active available method, defaulting to 'Pago Móvil'
  useEffect(() => {
    if (availablePaymentMethods.length > 0) {
      if (!availablePaymentMethods.some(m => m.nombre.toLowerCase() === metodoPago.toLowerCase())) {
        const preferred = availablePaymentMethods.find(m => m.nombre.toLowerCase().includes('pago móvil') || m.nombre.toLowerCase().includes('pago movil')) || availablePaymentMethods[0];
        setMetodoPago(preferred.nombre);
      }
    }
  }, [availablePaymentMethods, metodoPago]);

  const selectedPaymentMethod = useMemo(() => {
    return availablePaymentMethods.find(m => m.nombre.toLowerCase() === metodoPago.toLowerCase()) || availablePaymentMethods[0];
  }, [availablePaymentMethods, metodoPago]);

  const getText = (key: keyof StoreCustomTexts): string => {
    if (customTexts && customTexts[key] !== undefined) {
      return customTexts[key] as string;
    }
    return DEFAULT_STORE_TEXTS[key] || '';
  };

  // UI helper states
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderFormError, setOrderFormError] = useState<string | null>(null);
  const [confirmClearCart, setConfirmClearCart] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const shareToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedInitialUrlRef = useRef(false);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('biker_store_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Permitir cerrar cualquier ventana modal abierta con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else if (quickViewProduct) {
          closeQuickView();
        } else if (completedOrder) {
          setCompletedOrder(null);
        } else if (isCheckoutOpen) {
          setIsCheckoutOpen(false);
        } else if (isCartOpen) {
          setIsCartOpen(false);
        } else if (isCategoryModalOpen) {
          setIsCategoryModalOpen(false);
        } else if (isTextEditorOpen) {
          setIsTextEditorOpen(false);
        } else if (isPaymentMethodsModalOpen) {
          setIsPaymentMethodsModalOpen(false);
        } else if (isVariantsModalOpen) {
          setIsVariantsModalOpen(false);
        } else if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        } else if (isMobileSearchOpen) {
          setIsMobileSearchOpen(false);
        } else if (mobileExpandedCategory) {
          setMobileExpandedCategory(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isLightboxOpen,
    quickViewProduct,
    completedOrder,
    isCheckoutOpen,
    isCartOpen,
    isCategoryModalOpen,
    isTextEditorOpen,
    isPaymentMethodsModalOpen,
    isVariantsModalOpen,
    isMobileMenuOpen,
    isMobileSearchOpen,
    mobileExpandedCategory
  ]);

  // Bloqueo de Scroll (Body Scroll Lock): aplica overflow: hidden al body cuando se abre el modal o panel
  useEffect(() => {
    const isLocked = Boolean(isLightboxOpen || quickViewProduct || isCheckoutOpen || isCartOpen || isMobileMenuOpen || completedOrder);
    if (isLocked) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || '';
      };
    }
  }, [isLightboxOpen, quickViewProduct, isCheckoutOpen, isCartOpen, isMobileMenuOpen, completedOrder]);

  // Cerrar el menú desplegado en móvil al tocar fuera de la barra de categorías
  useEffect(() => {
    if (!mobileExpandedCategory) return;
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#biker-category-header-bar')) {
        setMobileExpandedCategory(null);
      }
    };
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => document.removeEventListener('pointerdown', handleDocumentClick);
  }, [mobileExpandedCategory]);

  // Categories list (Deduplicadas canónicamente y filtrando categorías no comerciales, con soporte de múltiples categorías por producto)
  const categories = useMemo(() => {
    const catMap = new Map<string, string>();
    sourceProducts.forEach((p) => {
      // Ocultar categorías si sus productos están agotados (stock <= 0)
      const stock = Number(p.stock_disponible ?? 0);
      if (isNaN(stock) || stock <= 0) return;

      const keys = getProductCategoryKeys(p);
      const names = getProductCategoryNames(p);
      keys.forEach((key, idx) => {
        if (key && key !== 'sin categoria') {
          // Ocultar categorías excluidas para la tienda
          if (hiddenCategories.includes(key)) return;

          if (!catMap.has(key)) {
            catMap.set(key, names[idx] || formatCategoryDisplay(key));
          }
        }
      });
    });
    return Array.from(catMap.values()).sort((a, b) => a.localeCompare(b));
  }, [sourceProducts, hiddenCategories]);

  // 3. EXTRACCIÓN DINÁMICA DE SUBCATEGORÍAS CON MINIATURAS VISUALES (useMemo)
  // Nota: Se excluye explícitamente cualquier subcategoría cuyo nombre coincida con la categoría general
  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, Map<string, { count: number; image?: string }>>();
    sourceProducts.forEach((p) => {
      const stock = Number(p.stock_disponible ?? 0);
      if (isNaN(stock) || stock <= 0) return;
      const hasPrice = (p.precio_venta_ref && p.precio_venta_ref > 0) || (p.precio_mayor && p.precio_mayor > 0);
      if (!hasPrice) return;

      // Extraer subcategorías tanto del campo string 'subcategoria' como de posibles arrays
      const candidates: string[] = [];
      if (p.subcategoria && typeof p.subcategoria === 'string' && p.subcategoria.trim()) {
        candidates.push(p.subcategoria.trim());
      }
      if (Array.isArray(p.subcategorias)) {
        p.subcategorias.forEach((s) => {
          if (typeof s === 'string' && s.trim()) candidates.push(s.trim());
        });
      }
      if (candidates.length === 0) return;

      const prodImg =
        p.variante_imagen_miniatura ||
        p.imagen_portada ||
        p.imagen_url ||
        (Array.isArray(p.imagenes) && p.imagenes[0]) ||
        p.link;

      const prodKeys = getProductCategoryKeys(p);
      const prodNames = getProductCategoryNames(p);

      prodKeys.forEach((key, idx) => {
        if (!key || key === 'sin categoria' || hiddenCategories.includes(key)) return;
        const catName = prodNames[idx] || formatCategoryDisplay(key);
        const catKey = getCategoryKey(catName);

        candidates.forEach((rawSub) => {
          const subKey = getSubcategoryKey(rawSub);
          const normalizedSub = normalizeSearch(rawSub);
          const normalizedCat = normalizeSearch(catName);

          // NO REPETIR la categoría general en el despliegue de las subcategorías:
          // Si la subcategoría es idéntica o equivalente a la categoría general, se ignora por completo.
          if (
            !subKey ||
            subKey === 'sin subcategoria' ||
            subKey === 'sin categoria' ||
            subKey === 'general' ||
            subKey === key ||
            subKey === catKey ||
            normalizedSub === normalizedCat ||
            rawSub.toLowerCase().trim() === catName.toLowerCase().trim()
          ) {
            return;
          }

          const displaySub = formatSubcategoryDisplay(rawSub) || rawSub;
          const subMap = map.get(catName) || new Map<string, { count: number; image?: string }>();
          const existing = subMap.get(displaySub) || { count: 0, image: undefined };
          subMap.set(displaySub, {
            count: existing.count + 1,
            image: existing.image || prodImg || undefined,
          });
          map.set(catName, subMap);
        });
      });
    });

    const result: Record<string, { name: string; count: number; image?: string }[]> = {};
    map.forEach((subMap, catName) => {
      const catKey = getCategoryKey(catName);
      const items = Array.from(subMap.entries())
        .filter(([name]) => {
          const subKey = getSubcategoryKey(name);
          return (
            subKey !== catKey &&
            normalizeSearch(name) !== normalizeSearch(catName) &&
            name.toLowerCase().trim() !== catName.toLowerCase().trim()
          );
        })
        .map(([name, data]) => ({ name, count: data.count, image: data.image }))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (items.length > 0) {
        result[catName] = items;
      }
    });
    return result;
  }, [sourceProducts, hiddenCategories]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim();
    const isSearching = Boolean(query);

    // 1. Filtrado base: productos con precio, con stock y categorías activas
    const baseProducts = sourceProducts.filter((p) => {
      // Must have price
      const hasPrice = (p.precio_venta_ref && p.precio_venta_ref > 0) || (p.precio_mayor && p.precio_mayor > 0);
      if (!hasPrice) return false;

      // Ocultar estrictamente productos agotados (stock <= 0 o no disponible)
      const stock = Number(p.stock_disponible ?? 0);
      if (isNaN(stock) || stock <= 0) {
        return false;
      }

      // Ocultar productos de categorías desactivadas (ej: embalaje, uso interno) si todas sus categorías están ocultas
      const prodKeys = getProductCategoryKeys(p);
      if (prodKeys.length > 0 && prodKeys.every((k) => hiddenCategories.includes(k))) {
        return false;
      }

      // "QUIERO QUE LA BUSQUEDA ANULE EL FILTRO":
      // Si el usuario está buscando, se anulan los filtros de categoría y subcategoría para abarcar TODO el catálogo.
      if (!isSearching) {
        // Category filter (coincidencia con cualquiera de sus categorías asignadas)
        if (selectedCategory !== 'all') {
          const targetKey = getCategoryKey(selectedCategory);
          if (!prodKeys.includes(targetKey)) {
            return false;
          }
        }

        // Subcategory filter: filtrado instantáneo por la subcategoría seleccionada
        if (selectedSubcategory) {
          const targetSubKey = getSubcategoryKey(selectedSubcategory);
          const targetSubNorm = normalizeSearch(selectedSubcategory);
          const prodSubKeys = getProductSubcategoryKeys(p);
          let matchesSubcat = prodSubKeys.includes(targetSubKey);
          if (!matchesSubcat && p.subcategoria) {
            matchesSubcat = getSubcategoryKey(p.subcategoria) === targetSubKey || normalizeSearch(p.subcategoria) === targetSubNorm;
          }
          if (!matchesSubcat && Array.isArray(p.subcategorias)) {
            matchesSubcat = p.subcategorias.some(s => getSubcategoryKey(s) === targetSubKey || normalizeSearch(s) === targetSubNorm);
          }
          if (!matchesSubcat && isValidGroupId(p.grupo_id)) {
            const groupSiblings = sourceProducts.filter(v => isValidGroupId(v.grupo_id) && v.grupo_id === p.grupo_id);
            matchesSubcat = groupSiblings.some(v => {
              const vKeys = getProductSubcategoryKeys(v);
              if (vKeys.includes(targetSubKey)) return true;
              if (v.subcategoria && (getSubcategoryKey(v.subcategoria) === targetSubKey || normalizeSearch(v.subcategoria) === targetSubNorm)) return true;
              if (Array.isArray(v.subcategorias)) {
                return v.subcategorias.some(s => getSubcategoryKey(s) === targetSubKey || normalizeSearch(s) === targetSubNorm);
              }
              return false;
            });
          }
          if (!matchesSubcat) {
            return false;
          }
        }
      }

      return true;
    });

    // 2. Si hay búsqueda activa: calcular score de similitud, ordenar por mayor coincidencia y nunca arrojar 0
    if (isSearching) {
      // Calcular score de similitud para cada producto (y sus variantes si es grupo)
      const scoredList = baseProducts.map((p) => {
        let score = calculateProductSearchScore(p, query);

        // Si pertenece a un grupo válido, tomar también el score de las variantes hermanas para que el grupo ascienda
        if (isValidGroupId(p.grupo_id)) {
          const siblings = sourceProducts.filter(v => isValidGroupId(v.grupo_id) && v.grupo_id === p.grupo_id);
          for (const sib of siblings) {
            const sScore = calculateProductSearchScore(sib, query);
            if (sScore > score) {
              score = sScore;
            }
          }
        }

        return { product: p, score };
      });

      // Filtrar productos con similitud/coincidencias (score > 0)
      const matchingItems = scoredList.filter(item => item.score > 0);

      // "Nunca arrojar un catálogo en cero por búsqueda":
      // Si hay coincidencias, usamos los productos coincidentes ordenados por similitud.
      // Si una búsqueda no produjo coincidencias exactas, mostramos todo el catálogo base para nunca dejarlo en cero.
      const candidateList = matchingItems.length > 0 ? matchingItems : scoredList;

      // Ordenar: lo que tenga MÁS SIMILITUD y COINCIDENCIAS primero
      candidateList.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        // Criterio secundario de orden
        const priceA = a.product.precio_venta_ref || a.product.precio_mayor || 0;
        const priceB = b.product.precio_venta_ref || b.product.precio_mayor || 0;
        if (sortBy === 'precio_asc') return priceA - priceB;
        if (sortBy === 'precio_desc') return priceB - priceA;
        if (sortBy === 'nombre') return (a.product.nombre || '').localeCompare(b.product.nombre || '');

        const hasImgA = Boolean(a.product.imagen_url || a.product.link);
        const hasImgB = Boolean(b.product.imagen_url || b.product.link);
        if (hasImgA && !hasImgB) return -1;
        if (!hasImgA && hasImgB) return 1;
        return (b.product.stock_disponible || 0) - (a.product.stock_disponible || 0);
      });

      return candidateList.map(item => item.product);
    }

    // 3. Ordenamiento normal cuando no hay búsqueda
    const result = [...baseProducts];
    result.sort((a, b) => {
      const priceA = a.precio_venta_ref || a.precio_mayor || 0;
      const priceB = b.precio_venta_ref || b.precio_mayor || 0;
      if (sortBy === 'precio_asc') return priceA - priceB;
      if (sortBy === 'precio_desc') return priceB - priceA;
      if (sortBy === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '');
      // Default: Destacados (highest stock or with image first)
      const hasImgA = Boolean(a.imagen_url || a.link);
      const hasImgB = Boolean(b.imagen_url || b.link);
      if (hasImgA && !hasImgB) return -1;
      if (!hasImgA && hasImgB) return 1;
      return (b.stock_disponible || 0) - (a.stock_disponible || 0);
    });

    return result;
  }, [sourceProducts, searchQuery, selectedCategory, selectedSubcategory, sortBy, hiddenCategories]);

  // Agrupación de artículos por grupo de variantes para la tienda e-commerce
  const catalogItems = useMemo(() => {
    const groupMap = new Map<string, Producto[]>();

    // 1. Clasificar variantes por grupo_id desde sourceProducts para mantener integridad total de la agrupación
    // REGLA: Si grupo_id es null, undefined, "", "sin_grupo" o "default", NUNCA se agrupa.
    sourceProducts.forEach(p => {
      if (isValidGroupId(p.grupo_id) && (Number(p.stock_disponible) || 0) > 0) {
        const gid = p.grupo_id!.trim();
        const list = groupMap.get(gid) || [];
        list.push(p);
        groupMap.set(gid, list);
      }
    });

    const processedGroupIds = new Set<string>();
    const items: Array<{
      id: string;
      isGroup: boolean;
      groupId?: string;
      title: string;
      coverProduct: Producto;
      coverImage?: string;
      grupo_imagen_portada?: string;
      variants: Producto[];
      individualVariants: Producto[];
      kitVariant: Producto | null;
      hasKit: boolean;
      kitImage: string;
      kitName?: string;
      priceMin: number;
      priceMax: number;
      totalStock: number;
      categoria?: string;
      categorias?: string[];
      palabras_clave?: string;
    }> = [];

    filteredProducts.forEach(p => {
      if (isValidGroupId(p.grupo_id)) {
        const gid = p.grupo_id!.trim();
        if (processedGroupIds.has(gid)) return;
        processedGroupIds.add(gid);

        const variants = groupMap.get(gid) || [p];

        // 1. Detección de si el grupo tiene kit (grupo_tiene_kit)
        const hasKit = Boolean(
          variants.some(v => 
            v.grupo_tiene_kit === true || 
            v.grupo_tiene_kit === 'true' || 
            v.grupo_tiene_kit === 'si' || 
            v.grupo_tiene_kit === 1 || 
            v.es_kit === true
          ) || 
          p.grupo_tiene_kit === true || 
          p.grupo_tiene_kit === 'true' || 
          p.grupo_tiene_kit === 'si' || 
          p.grupo_tiene_kit === 1
        );

        // 2. Foto unificada del kit (grupo_kit_imagen)
        const kitImage = variants.find(v => v.grupo_kit_imagen)?.grupo_kit_imagen || 
                         p.grupo_kit_imagen || 
                         '';

        // 3. Filtrar variantes individuales (excluyendo cualquier ítem de tipo kit y asegurando stock > 0)
        const individualVariants = variants.filter(v => 
          !v.es_kit && 
          v.variante_nombre?.toLowerCase() !== 'kit' && 
          !v.nombre?.toLowerCase().startsWith('kit ') &&
          (Number(v.stock_disponible) || 0) > 0
        );

        // Ordenar variantes individuales: la principal primero, luego alfabéticamente
        individualVariants.sort((a, b) => {
          if (a.es_principal_grupo && !b.es_principal_grupo) return -1;
          if (!a.es_principal_grupo && b.es_principal_grupo) return 1;
          return (a.variante_nombre || a.nombre).localeCompare(b.variante_nombre || b.nombre);
        });

        // 4. Buscar si ya existe una variante de kit explícita en los productos del grupo con stock
        let kitVariant = variants.find(v => 
          (v.es_kit === true || 
          v.variante_nombre?.toLowerCase() === 'kit' || 
          v.nombre?.toLowerCase().startsWith('kit ')) &&
          (Number(v.stock_disponible) || 0) > 0
        ) || null;

        const coverBase = (searchQuery.trim() ? (individualVariants.find(v => v.id === p.id) || variants.find(v => v.id === p.id)) : null) || individualVariants.find(v => v.es_principal_grupo) || individualVariants[0] || variants.find(v => (Number(v.stock_disponible) || 0) > 0) || variants[0];
        const coverProduct = coverBase;

        // 5. Nombre asignado para el kit unificado desde Firestore (grupo_kit_nombre / kit_nombre / nombre_kit)
        const rawKitNombre = (
          variants.find(v => (v as any).grupo_kit_nombre)?.grupo_kit_nombre ||
          p.grupo_kit_nombre ||
          coverBase?.grupo_kit_nombre ||
          variants.find(v => (v as any).kit_nombre)?.kit_nombre ||
          p.kit_nombre ||
          coverBase?.kit_nombre ||
          variants.find(v => (v as any).nombre_kit)?.nombre_kit ||
          (p as any).nombre_kit ||
          (kitVariant?.variante_nombre && kitVariant?.variante_nombre.toLowerCase() !== 'kit' ? kitVariant.variante_nombre : undefined) ||
          ''
        )?.trim();

        const kitNombre = rawKitNombre || 'Kit';

        if (hasKit) {
          // Cálculo del precio del Kit:
          // 1. grupo_kit_precio de Firestore (si está definido y es > 0)
          // 2. Si grupo_kit_precio viene vacío o en null/0, sumar precios de variantes individuales
          const sumOfVariants = individualVariants.reduce((sum, v) => sum + (v.precio_venta_ref || v.precio_mayor || 0), 0);
          const rawKitPrecio = Number(
            coverProduct?.grupo_kit_precio ?? 
            p.grupo_kit_precio ?? 
            variants.find(v => Number(v.grupo_kit_precio) > 0)?.grupo_kit_precio ?? 
            (kitVariant ? kitVariant.grupo_kit_precio : undefined) ?? 
            0
          );
          const kitPrice = (rawKitPrecio > 0) ? rawKitPrecio : (sumOfVariants > 0 ? sumOfVariants : (coverProduct.precio_venta_ref || coverProduct.precio_mayor || 0));
          const kitComponentesIds = individualVariants.map(v => v.id);

          if (!kitVariant) {
            // Sintetizar la miniatura del Kit con su respectiva foto y nombre asignado
            const calculatedKitStock = individualVariants.length > 0 
              ? Math.min(...individualVariants.map(v => Number(v.stock_disponible) || 0)) 
              : (Number(coverBase?.stock_disponible) || 0);

            // Solo sintetizar la variante de Kit si tiene stock disponible
            if (calculatedKitStock > 0) {
              kitVariant = {
                ...coverBase,
                id: `${p.grupo_id || coverBase.id}-kit-opc`,
                sku: `${coverBase.sku || 'KIT'}-KIT`,
                nombre: coverBase.grupo_nombre ? `${coverBase.grupo_nombre} (${kitNombre})` : `${coverBase.nombre} (${kitNombre})`,
                variante_nombre: kitNombre,
                es_kit: true,
                grupo_tiene_kit: true,
                grupo_kit_imagen: kitImage,
                grupo_kit_nombre: kitNombre,
                kit_nombre: kitNombre,
                grupo_kit_precio: kitPrice,
                imagen_url: kitImage,
                variante_imagen_miniatura: kitImage,
                variante_imagen_hd: kitImage,
                precio_venta_ref: kitPrice,
                precio_mayor: kitPrice,
                stock_disponible: calculatedKitStock,
                kit_componentes_ids: kitComponentesIds
              };
            }
          } else {
            // Asegurar propiedades de kit con foto unificada, PRECIO y NOMBRE ASIGNADO DEL KIT
            if ((Number(kitVariant.stock_disponible) || 0) <= 0) {
              kitVariant = null;
            } else {
              kitVariant = {
                ...kitVariant,
                es_kit: true,
                variante_nombre: kitVariant.variante_nombre && kitVariant.variante_nombre.toLowerCase() !== 'kit' ? kitVariant.variante_nombre : kitNombre,
                nombre: kitVariant.nombre || (coverBase.grupo_nombre ? `${coverBase.grupo_nombre} (${kitNombre})` : kitNombre),
                grupo_tiene_kit: true,
                grupo_kit_imagen: kitImage || kitVariant.grupo_kit_imagen || kitVariant.imagen_url,
                grupo_kit_nombre: kitNombre,
                kit_nombre: kitNombre,
                grupo_kit_precio: kitPrice,
                variante_imagen_miniatura: kitImage || kitVariant.variante_imagen_miniatura || kitVariant.imagen_url,
                imagen_url: kitImage || kitVariant.imagen_url,
                precio_venta_ref: kitPrice,
                precio_mayor: kitPrice,
                kit_componentes_ids: kitComponentesIds
              };
            }
          }
        }

        // Tira completa de opciones: variantes individuales primero, seguidas por el Kit al final (solo con stock)
        const allVariants = (hasKit && kitVariant 
          ? [...individualVariants, kitVariant] 
          : (individualVariants.length > 0 ? individualVariants : variants)
        ).filter(v => (Number(v.stock_disponible) || 0) > 0);

        // Si el grupo no tiene variantes disponibles con stock, no mostrar la tarjeta
        if (allVariants.length === 0) {
          return;
        }

        const cover = coverBase || allVariants[0];

        // Determinación de la portada asignada en la base de datos para productos con variantes:
        // Prioridad:
        // 1. grupo_imagen_portada: imagen asignada a nivel de grupo en Firestore en cualquiera de sus productos
        // 2. Si no tiene grupo_imagen_portada, foto de la variante designada como principal (es_principal_grupo)
        // 3. Foto de portada o principal de la variante con stock
        const rawGroupCover = (
          variants.find(v => v.grupo_imagen_portada && typeof v.grupo_imagen_portada === 'string' && v.grupo_imagen_portada.trim())?.grupo_imagen_portada ||
          p.grupo_imagen_portada ||
          coverBase?.grupo_imagen_portada ||
          variants.find(v => v.es_principal_grupo && (v.imagen_portada || v.variante_imagen_hd || v.link || v.imagen_url))?.imagen_portada ||
          individualVariants.find(v => v.es_principal_grupo && (v.imagen_portada || v.variante_imagen_hd || v.link || v.imagen_url))?.imagen_portada ||
          individualVariants.find(v => v.es_principal_grupo)?.variante_imagen_hd ||
          variants.find(v => v.es_principal_grupo)?.variante_imagen_hd ||
          individualVariants.find(v => v.es_principal_grupo)?.link ||
          variants.find(v => v.es_principal_grupo)?.link ||
          individualVariants.find(v => v.es_principal_grupo)?.imagen_url ||
          variants.find(v => v.es_principal_grupo)?.imagen_url ||
          variants.find(v => v.imagen_portada && typeof v.imagen_portada === 'string' && v.imagen_portada.trim())?.imagen_portada ||
          coverBase?.imagen_portada ||
          coverBase?.variante_imagen_hd ||
          coverBase?.link ||
          coverBase?.imagen_url ||
          ''
        );
        const groupCoverImage = rawGroupCover ? formatDirectImageUrl(rawGroupCover) : '';

        const validPrices = allVariants.map(v => v.precio_venta_ref || v.precio_mayor || 0).filter(pr => pr > 0);
        const priceMin = validPrices.length > 0 ? Math.min(...validPrices) : (cover.precio_venta_ref || cover.precio_mayor || 0);
        const priceMax = validPrices.length > 0 ? Math.max(...validPrices) : (cover.precio_venta_ref || cover.precio_mayor || 0);
        const totalStock = allVariants.reduce((sum, v) => sum + (Number(v.stock_disponible) || 0), 0);

        if (totalStock <= 0) {
          return;
        }

        items.push({
          id: p.grupo_id,
          isGroup: true,
          groupId: p.grupo_id,
          title: cover.grupo_nombre || cover.nombre,
          coverProduct: cover,
          coverImage: groupCoverImage,
          grupo_imagen_portada: rawGroupCover,
          variants: allVariants,
          individualVariants,
          kitVariant,
          hasKit,
          kitImage,
          kitName: kitNombre,
          priceMin,
          priceMax,
          totalStock,
          categoria: cover.categoria,
          categorias: cover.categorias,
          palabras_clave: cover.palabras_clave
        });
      } else {
        const itemStock = Number(p.stock_disponible) || 0;
        if (itemStock <= 0) {
          return;
        }

        const hasKit = Boolean(
          p.grupo_tiene_kit === true || 
          p.grupo_tiene_kit === 'true' || 
          p.grupo_tiene_kit === 'si' || 
          p.grupo_tiene_kit === 1 || 
          p.es_kit === true
        );
        const kitImage = p.grupo_kit_imagen || '';
        const kitNombre = p.grupo_kit_nombre || p.kit_nombre || (p as any).nombre_kit || 'Kit';
        const price = p.precio_venta_ref || p.precio_mayor || 0;
        const rawSingleCover = p.imagen_portada || p.variante_imagen_hd || p.link || p.imagen_url || '';
        items.push({
          id: p.id,
          isGroup: false,
          title: p.nombre,
          coverProduct: p,
          coverImage: rawSingleCover ? formatDirectImageUrl(rawSingleCover) : '',
          variants: [p],
          individualVariants: [p],
          kitVariant: null,
          hasKit,
          kitImage,
          kitName: kitNombre,
          priceMin: price,
          priceMax: price,
          totalStock: itemStock,
          categoria: p.categoria,
          categorias: p.categorias,
          palabras_clave: p.palabras_clave
        });
      }
    });

    return items;
  }, [filteredProducts, sourceProducts, searchQuery]);

  // Cart Totals: Solo suma los productos con cantidad activa (> 0)
  const cartTotals = useMemo(() => {
    const activeItems = cart.filter((item) => item.quantity > 0);
    const totalUSD = activeItems.reduce((sum, item) => sum + (item.precio_unitario * item.quantity), 0);
    const totalUnits = activeItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalBS = totalUSD * tasaBCV;
    return {
      totalUSD: Number(totalUSD.toFixed(2)),
      totalBS: Number(totalBS.toFixed(2)),
      totalUnits
    };
  }, [cart, tasaBCV]);

  // Add to cart con soporte de feedback espacial Fly-to-Cart hacia el Header
  const handleAddToCart = (
    product: Producto, 
    qty: number = 1,
    sourceElement?: HTMLElement | null
  ) => {
    let unitPrice = product.precio_venta_ref || product.precio_mayor || 0;
    const isKit = Boolean(product.es_kit || product.variante_nombre?.toLowerCase() === 'kit');

    let displayProduct = product;
    if (isKit) {
      // Si es un kit, asegurarse de que el precio unitario sea el precio total del Kit
      let kitPrice = product.precio_venta_ref || product.grupo_kit_precio || 0;
      let kitComponents: string[] = product.kit_componentes_ids || [];

      if (isValidGroupId(product.grupo_id)) {
        const groupItem = catalogItems.find(it => it.groupId === product.grupo_id || it.id === product.grupo_id);
        if (groupItem) {
          if (!kitPrice || kitPrice <= 0 || (groupItem.kitVariant && kitPrice < (groupItem.kitVariant.precio_venta_ref || 0))) {
            kitPrice = groupItem.kitVariant?.precio_venta_ref || groupItem.priceMax || kitPrice;
          }
          if (kitComponents.length === 0 && groupItem.individualVariants.length > 0) {
            kitComponents = groupItem.individualVariants.map(v => v.id);
          }
        }
      }

      if (kitPrice > 0) {
        unitPrice = kitPrice;
      }

      displayProduct = {
        ...product,
        nombre: product.nombre.toLowerCase().includes('(kit)') 
          ? product.nombre 
          : `${product.grupo_nombre || product.nombre} (Kit)`,
        es_kit: true,
        precio_venta_ref: unitPrice,
        precio_mayor: unitPrice,
        grupo_kit_precio: unitPrice,
        kit_componentes_ids: kitComponents
      };
    } else if (product.grupo_nombre && product.variante_nombre) {
      displayProduct = {
        ...product,
        nombre: `${product.grupo_nombre} (${product.variante_nombre})`
      };
    }

    if (unitPrice <= 0) return;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.product.id === displayProduct.id);
      if (existingIdx >= 0) {
        return prevCart.map((item, idx) => {
          if (idx === existingIdx) {
            // Si estaba en 0 (pausa), reactivar sumando sobre 0
            const baseQty = item.quantity > 0 ? item.quantity : 0;
            const newQty = baseQty + qty;
            return {
              ...item,
              product: displayProduct,
              quantity: newQty,
              precio_unitario: unitPrice,
              subtotal: Number((unitPrice * newQty).toFixed(2))
            };
          }
          return item;
        });
      } else {
        return [
          ...prevCart,
          {
            product: displayProduct,
            quantity: qty,
            precio_unitario: unitPrice,
            subtotal: Number((unitPrice * qty).toFixed(2))
          }
        ];
      }
    });

    // Forzar la reaparición inmediata del Header para que el carrito esté 100% visible
    setIsHeaderVisible(true);

    // Animation trigger
    setAddedAnimationId(displayProduct.id);
    setTimeout(() => setAddedAnimationId(null), 1800);

    // Animación espacial "Fly-to-Cart" hacia el ícono del Header y Mini-cart Dropdown
    triggerFlyToCart(displayProduct, qty, sourceElement);
  };

  // Buy now (add to cart & open checkout immediately)
  const handleBuyNow = (product: Producto) => {
    handleAddToCart(product, 1);
    setIsCartOpen(false);
    setCheckoutStep(1);
    setIsCheckoutOpen(true);
  };

  // Añadir un combo/kit completo al carrito de una sola vez
  const handleAddComboToCart = (comboProducts: Producto[]) => {
    if (!comboProducts || comboProducts.length === 0) return;

    setCart((prevCart) => {
      let updatedCart = [...prevCart];
      for (const prod of comboProducts) {
        const unitPrice = prod.precio_venta_ref || prod.precio_mayor || 0;
        if (unitPrice <= 0) continue;

        const existingIdx = updatedCart.findIndex((it) => it.product.id === prod.id);
        if (existingIdx >= 0) {
          const item = updatedCart[existingIdx];
          const newQty = (item.quantity > 0 ? item.quantity : 0) + 1;
          updatedCart[existingIdx] = {
            ...item,
            quantity: newQty,
            precio_unitario: unitPrice,
            subtotal: Number((unitPrice * newQty).toFixed(2)),
          };
        } else {
          updatedCart.push({
            product: prod,
            quantity: 1,
            precio_unitario: unitPrice,
            subtotal: Number(unitPrice.toFixed(2)),
          });
        }
      }
      return updatedCart;
    });

    setIsHeaderVisible(true);
    setIsCartOpen(true);
  };

  // Update quantity in cart: permite valor 0 sin borrar del DOM para prevención de borrado accidental
  const handleUpdateCartQty = (productId: string, newQty: number) => {
    const safeQty = Math.max(0, newQty);
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: safeQty,
            subtotal: Number((item.precio_unitario * safeQty).toFixed(2))
          };
        }
        return item;
      })
    );
  };

  // Finalizar compra desde el panel lateral: filtra automáticamente productos en 0
  const handleProceedToCheckout = () => {
    const activeItems = cart.filter((item) => item.quantity > 0);
    if (activeItems.length === 0) return;
    setCart(activeItems);
    setIsCartOpen(false);
    setCheckoutStep(0);
    setIsCheckoutOpen(true);
  };

  // Cerrar QuickView y sincronizar URL canónica (/ o /categoria/[slug])
  const closeQuickView = () => {
    setIsLightboxOpen(false);
    setQuickViewProduct(null);
    setQuickViewActiveVariant(null);
    setQuickViewUserSelectedVariant(false);
    setQuickViewImageIndex(0);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('p')) {
        url.searchParams.delete('p');
      }
      const targetPath = selectedCategory !== 'all' ? `/categoria/${slugify(selectedCategory)}` : '/';
      const searchStr = url.search ? url.search : '';
      window.history.pushState({}, '', targetPath + searchStr + url.hash);
    } catch (e) {
      console.warn("Could not clear product URL parameter:", e);
    }
  };

  // Helper para abrir QuickView con soporte de URL canónica limpia (/producto/[slug])
  const openQuickView = (variant: Producto, keepSelectedKit: boolean = false, updateHistory: boolean = true) => {
    setIsLightboxOpen(false);
    let effectiveVariant = variant;
    // Si la variante enviada es el kit pero no se forzó mantenerlo (ej: apertura inicial desde imagen/título), preseleccionar la primera variante individual
    if (!keepSelectedKit && effectiveVariant.es_kit && isValidGroupId(effectiveVariant.grupo_id)) {
      const parent = catalogItems.find(it => it.groupId === effectiveVariant.grupo_id || it.id === effectiveVariant.grupo_id);
      if (parent && parent.individualVariants && parent.individualVariants.length > 0) {
        effectiveVariant = parent.individualVariants[0];
      }
    }
    setQuickViewProduct(effectiveVariant);
    setQuickViewActiveVariant(effectiveVariant);
    setQuickViewImageIndex(0);
    setQuickViewQty(1);
    setQuickViewAdded(false);

    if (updateHistory) {
      try {
        const slug = getProductSlug(effectiveVariant);
        const targetPath = `/producto/${slug}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ productId: effectiveVariant.id, slug }, '', targetPath);
        }
      } catch (e) {
        console.warn("Could not update product URL parameter:", e);
      }
    }
  };

  // Seleccionar categoría con actualización fluida de URL (/categoria/[slug] o /)
  const handleSelectCategory = (catName: string, updateUrl: boolean = true) => {
    setSelectedCategory(catName);
    setSelectedSubcategory(null);
    setSearchQuery('');
    setMobileExpandedCategory(null);

    if (updateUrl) {
      try {
        const targetPath = catName === 'all' ? '/' : `/categoria/${slugify(catName)}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ category: catName }, '', targetPath);
        }
      } catch (e) {
        console.warn("Could not update category URL parameter:", e);
      }
    }
  };

  // Compartir enlace del producto (URL canónica limpia /producto/[slug] con Clipboard API y feedback visual)
  const handleShareProduct = async (productToShare?: Producto) => {
    const prod = productToShare || quickViewActiveVariant || quickViewProduct;
    if (!prod) return;

    const slug = getProductSlug(prod);
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://loquelosbikersquieren.com';
    const shareUrl = `${origin}/producto/${slug}`;

    try {
      window.history.replaceState({ productId: prod.id, slug }, '', `/producto/${slug}`);
    } catch {}

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.warn("Fallback copy failed:", err);
      }
    }

    setCopiedShareLink(true);
    setShowShareToast(true);

    if (shareToastTimeoutRef.current) {
      clearTimeout(shareToastTimeoutRef.current);
    }
    shareToastTimeoutRef.current = setTimeout(() => {
      setCopiedShareLink(false);
      setShowShareToast(false);
    }, 2000);
  };

  // Deep linking: Escuchar cambios de historial en el navegador (Botones Atrás / Adelante)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        const pId = params.get('p');

        // 1. Ruta de Producto: /producto/[slug-o-id]
        if (path.startsWith('/producto/')) {
          const param = path.replace('/producto/', '').split('/')[0].split('?')[0];
          if (param) {
            const found = findProductBySlugOrId(sourceProducts, param);
            if (found) {
              setQuickViewUserSelectedVariant(true);
              openQuickView(found, true, false);
              return;
            }
          }
        }

        // 2. Ruta de Categoría: /categoria/[slug]
        if (path.startsWith('/categoria/')) {
          if (quickViewProduct) {
            setQuickViewProduct(null);
            setQuickViewActiveVariant(null);
            setQuickViewUserSelectedVariant(false);
            setQuickViewImageIndex(0);
            setIsLightboxOpen(false);
          }
          const catSlug = path.replace('/categoria/', '').split('/')[0].split('?')[0];
          if (catSlug && categories.length > 0) {
            const foundCat = findCategoryBySlug(categories, catSlug);
            if (foundCat) {
              setSelectedCategory(foundCat);
              setSelectedSubcategory(null);
              return;
            }
          }
        }

        // 3. Parámetro query legacy (?p=ID)
        if (pId) {
          const found = findProductBySlugOrId(sourceProducts, pId) || sourceProducts.find(p => p.id === pId || p.sku === pId || p.grupo_id === pId);
          if (found) {
            setQuickViewUserSelectedVariant(true);
            openQuickView(found, true, false);
            return;
          }
        }

        // 4. Ruta raíz /
        if (quickViewProduct) {
          setQuickViewProduct(null);
          setQuickViewActiveVariant(null);
          setQuickViewUserSelectedVariant(false);
          setQuickViewImageIndex(0);
          setIsLightboxOpen(false);
        }
        if (path === '/') {
          setSelectedCategory('all');
          setSelectedSubcategory(null);
        }
      } catch (err) {
        console.warn("Popstate handling error:", err);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [quickViewProduct, sourceProducts, categories, catalogItems]);

  // Detección y Carga de Carrito Compartido / Enlace de Pago Directo (?c=... o legacy ?shared_cart=... o ?items=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const shortCartParam = params.get('c');
      const legacySharedCartParam = params.get('shared_cart') || params.get('cart');
      const legacyItemsParam = params.get('items');
      const deliveryParam = (params.get('d') || params.get('delivery') || '').toLowerCase().trim();

      if (!shortCartParam && !legacySharedCartParam && !legacyItemsParam) return;

      let hydrated: CartItem[] = [];
      let delivery: 'envio' | 'retiro' = 'envio';
      let selectedAgency: 'MRW' | 'Zoom' = 'MRW';

      // 1. Prioridad: Formato nuevo ultra-compacto (?c=ID1:QTY,ID2:QTY&d=TIPO)
      if (shortCartParam) {
        const parsed = parseShortCartQuery(shortCartParam, deliveryParam, sourceProducts);
        if (parsed && parsed.items.length > 0) {
          delivery = parsed.delivery;
          selectedAgency = parsed.agency;
          hydrated = parsed.items;
        }
      } 
      // 2. Soporte retrocompatible para formato heredado (?shared_cart=...)
      else if (legacySharedCartParam) {
        const decoded = decodeSharedCart(legacySharedCartParam);
        if (decoded && decoded.items.length > 0) {
          delivery = (deliveryParam as 'envio' | 'retiro') || decoded.delivery || 'envio';
          hydrated = hydrateSharedCart(decoded, sourceProducts);
        }
      } 
      // 3. Soporte para formato ?items=...
      else if (legacyItemsParam) {
        const parsed = parseQueryCart(legacyItemsParam, deliveryParam, sourceProducts);
        if (parsed && parsed.items.length > 0) {
          delivery = parsed.delivery;
          hydrated = parsed.items;
        }
      }

      if (hydrated.length > 0) {
        hasCheckedInitialUrlRef.current = true;
        setCart(hydrated);
        try {
          localStorage.setItem('biker_store_cart', JSON.stringify(hydrated));
        } catch {}

        setMetodoEntrega(delivery);
        if (delivery === 'retiro') {
          const preferred = availablePaymentMethods.find(m => 
            m.nombre.toLowerCase().includes('pago móvil') || m.nombre.toLowerCase().includes('pago movil')
          );
          setMetodoPago(preferred ? preferred.nombre : 'Pago Móvil');
        } else {
          setAgenciaSeleccionada(selectedAgency);
        }

        // Abre directamente el modal de checkout en el Paso 2 (checkoutStep: 1)
        // (Paso 2 de envío si es 'mrw'/'zoom' o datos de quien retira si es 'tienda')
        setCheckoutStep(1);

        setIsCartOpen(false);
        setIsCheckoutOpen(true);
        setIsOrderSummaryExpanded(true);

        const toastMsg = delivery === 'retiro'
          ? "🛒 ¡Carrito recibido! Confirma tus datos para retirar en tienda."
          : `🛒 ¡Carrito recibido! Confirma tus datos de encomienda (${selectedAgency}).`;

        triggerSharedCartToast(toastMsg, "success");

        try {
          const cleanUrl = window.location.pathname + (window.location.hash || '');
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {}
      }
    } catch (err) {
      console.warn("Error hydrating shared cart from URL:", err);
    }
  }, [sourceProducts, availablePaymentMethods]);

  // Deep linking: Carga inicial directa de la página (/producto/[slug], /categoria/[slug] o ?p=ID)
  useEffect(() => {
    if (sourceProducts.length === 0 || hasCheckedInitialUrlRef.current) return;
    try {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const pId = params.get('p');

      // 1. Carga directa por ruta /producto/[slug] o /producto/[id]
      if (path.startsWith('/producto/')) {
        const param = path.replace('/producto/', '').split('/')[0].split('?')[0];
        if (param) {
          const found = findProductBySlugOrId(sourceProducts, param);
          if (found) {
            hasCheckedInitialUrlRef.current = true;
            setQuickViewUserSelectedVariant(true);
            openQuickView(found, true, false);
            return;
          }
        }
      }

      // 2. Carga por parámetro query legacy ?p=ID
      if (pId) {
        const found = findProductBySlugOrId(sourceProducts, pId) || sourceProducts.find(p => p.id === pId || p.sku === pId || p.grupo_id === pId);
        if (found) {
          hasCheckedInitialUrlRef.current = true;
          setQuickViewUserSelectedVariant(true);
          openQuickView(found, true, false);
          return;
        }
      }

      // 3. Carga directa por ruta /categoria/[slug]
      if (path.startsWith('/categoria/')) {
        const catSlug = path.replace('/categoria/', '').split('/')[0].split('?')[0];
        if (catSlug && categories.length > 0) {
          const foundCat = findCategoryBySlug(categories, catSlug);
          if (foundCat) {
            hasCheckedInitialUrlRef.current = true;
            setSelectedCategory(foundCat);
            setSelectedSubcategory(null);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Initial URL deep linking error:", err);
    }
  }, [sourceProducts, categories, catalogItems]);

  // Sincronización reactiva directa cuando initialProductSlug es provisto por la ruta dinámica
  useEffect(() => {
    if (!initialProductSlug || sourceProducts.length === 0) return;
    const found = findProductBySlugOrId(sourceProducts, initialProductSlug);
    if (found) {
      hasCheckedInitialUrlRef.current = true;
      setQuickViewUserSelectedVariant(true);
      openQuickView(found, true, false);
    }
  }, [initialProductSlug, sourceProducts]);

  // Sincronización reactiva directa cuando initialCategorySlug es provisto por la ruta dinámica
  useEffect(() => {
    if (!initialCategorySlug || categories.length === 0) return;
    const foundCat = findCategoryBySlug(categories, initialCategorySlug);
    if (foundCat) {
      hasCheckedInitialUrlRef.current = true;
      setSelectedCategory(foundCat);
      setSelectedSubcategory(null);
    }
  }, [initialCategorySlug, categories]);

  // Apertura desde la tarjeta del catálogo: si el usuario ya seleccionó una opción, abrir con esa opción; si no, abre con la portada asignada
  const handleOpenCardQuickView = (item: (typeof catalogItems)[0]) => {
    const selectedId = selectedVariantMap[item.id];
    if (selectedId) {
      const selectedVar = item.variants.find(v => v.id === selectedId);
      if (selectedVar) {
        setQuickViewUserSelectedVariant(true);
        openQuickView(selectedVar, true);
        return;
      }
    }
    // Si no ha seleccionado ninguna miniatura en la tarjeta, abre con la portada asignada en la base de datos
    setQuickViewUserSelectedVariant(false);
    openQuickView(item.coverProduct);
  };

  // Remove from cart
  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Clear cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (!confirmClearCart) {
      setConfirmClearCart(true);
      setTimeout(() => setConfirmClearCart(false), 3000);
      return;
    }
    setCart([]);
    setConfirmClearCart(false);
  };

  // Helper to copy bank account details
  const handleCopyBankData = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldKey);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  // Handle receipt image upload and client-side compression
  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setOrderFormError("Por favor selecciona un archivo de imagen válido (JPG, PNG o WEBP).");
      return;
    }

    setIsUploadingReceipt(true);
    setOrderFormError(null);
    try {
      const res = await compressAndResizeImage(file, 1200, 1200, 0.82);
      setComprobanteUrl(res.dataUrl);
      setComprobanteFileName(file.name);
    } catch (err) {
      console.error("Error compressing receipt image:", err);
      setOrderFormError("No se pudo cargar la imagen del comprobante. Intenta con otra foto.");
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Submit Order to Firestore
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFormError(null);

    const activeCart = cart.filter((item) => item.quantity > 0);
    if (activeCart.length === 0) {
      setOrderFormError("Tu carrito está vacío o no contiene productos con cantidad válida.");
      return;
    }
    const isPickupInStore = metodoEntrega === 'retiro';
    const isStorePayment = metodoPago.toLowerCase() === 'pago en tienda';

    // 1. Nombre y Teléfono son obligatorios para TODOS los pedidos (tanto retiro como envío)
    if (!clienteNombre.trim()) {
      setOrderFormError(
        isPickupInStore
          ? "Por favor ingresa tu Nombre y Apellido para saber a quién apartarle el producto."
          : "Por favor ingresa tu Nombre y Apellido."
      );
      if (isPickupInStore && isStorePayment) {
        setIsPickupPromptOpen(true);
      }
      return;
    }
    if (!clienteTelefono.trim()) {
      setOrderFormError(
        isPickupInStore
          ? "Por favor ingresa tu Número de Teléfono o WhatsApp para apartar y coordinar tu retiro."
          : "Por favor ingresa tu Número de Teléfono o WhatsApp."
      );
      if (isPickupInStore && isStorePayment) {
        setIsPickupPromptOpen(true);
      }
      return;
    }

    // 2. Para envíos nacionales, se exigen Cédula y Dirección de Agencia
    if (!isPickupInStore) {
      if (!clienteCedula.trim()) {
        setOrderFormError("Por favor ingresa tu Número de Cédula.");
        return;
      }
      if (!direccionAgencia.trim()) {
        setOrderFormError("Por favor ingresa la Dirección de la agencia de envío.");
        return;
      }
    }

    // When paying directly with receipt, ensure voucher image is attached
    if (!isStorePayment && tipoConfirmacion === 'comprobante') {
      if (!comprobanteUrl) {
        setOrderFormError("Por favor adjunta la foto o captura de tu comprobante de pago.");
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      const orderId = doc(collection(db, 'pedidos_tienda')).id;
      const orderNumber = `BIKER-${Date.now().toString().slice(-6)}`;
      const fullShippingAddress = isPickupInStore
        ? 'Retiro en tienda (Mérida) - Moto Cristo'
        : `${agenciaSeleccionada.toUpperCase()}: ${direccionAgencia.trim()}`;
      const effectiveClientName = clienteNombre.trim() || 'Cliente';
      const effectiveClientCedula = clienteCedula.trim() || 'N/A';
      const effectiveClientPhone = clienteTelefono.trim() || 'N/A';

      const orderItems: PedidoTiendaItem[] = activeCart.map((item) => ({
        productId: item.product.id,
        sku: item.product.sku || '',
        nombre: removeAccents(item.product.nombre || 'Producto'),
        imagen_url: item.product.imagen_url || item.product.link || '',
        categoria: item.product.categoria ? removeAccents(item.product.categoria) : '',
        cantidad: item.quantity,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        es_kit: Boolean(item.product.es_kit),
        kit_componentes_ids: item.product.kit_componentes_ids || undefined
      }));

      if (!isStorePayment && tipoConfirmacion === 'comprobante') {
        // =========================================================================
        // AUTOMATED MODE: Create income transaction and deduct stock immediately
        // =========================================================================
        const incomePayload = {
          userId: 'tienda_online',
          date: new Date().toISOString(),
          source: `Venta Tienda: ${removeAccents(clienteNombre.trim())}`,
          totalUSD: Number((cartTotals.totalUSD || 0).toFixed(2)),
          totalBS: Number((cartTotals.totalBS || 0).toFixed(2)),
          exchangeRate: tasaBCV,
          category: 'ventas',
          owner: 'main',
          orderNumber,
          client: removeAccents(clienteNombre.trim()),
          phone: clienteTelefono.trim(),
          idCard: clienteCedula.trim(),
          address: removeAccents(fullShippingAddress),
          paymentMethod: metodoPago,
          hasShippingGuide: true,
          shippingGuide: {
            client: removeAccents(clienteNombre.trim()),
            phone: clienteTelefono.trim(),
            idCard: clienteCedula.trim(),
            address: removeAccents(fullShippingAddress),
            product: orderItems.map(it => `${it.cantidad}x ${it.nombre}`).join(', '),
            orderNumber
          },
          items: orderItems.map(it => ({
            name: it.nombre,
            quantity: it.cantidad,
            priceUSD: it.precio_unitario,
            priceBS: Number((it.precio_unitario * tasaBCV).toFixed(2)),
            sku: it.sku || '',
            productId: it.productId || '',
            es_kit: it.es_kit || false,
            kit_componentes_ids: it.kit_componentes_ids || []
          })),
          currencyMode: 'USD',
          additionalAmount: 0,
          additionalAmountBS: 0,
          additionalAmountUSD: 0,
          amountPaid: 0,
          amountPaidBS: 0,
          amountPaidUSD: 0,
          originalAmountBS: Number((cartTotals.totalBS || 0).toFixed(2)),
          originalAmountUSD: Number((cartTotals.totalUSD || 0).toFixed(2)),
          sourceType: 'tienda_online',
          storeOrderId: orderId,
          comprobanteUrl: comprobanteUrl || null,
          referenciaPago: referenciaPago.trim() || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const incomeDocRef = await addDoc(collection(db, 'income'), incomePayload);

        // Deduct inventory in 'productos' (descuenta 1 unidad de cada variante componente si es un Kit)
        const batch = writeBatch(db);
        orderItems.forEach((it) => {
          if (it.es_kit && it.kit_componentes_ids && it.kit_componentes_ids.length > 0) {
            // Descontar 1 unidad (por cada kit) de cada variante individual del grupo
            it.kit_componentes_ids.forEach((compProductId) => {
              if (compProductId) {
                const prodRef = doc(db, 'productos', compProductId);
                batch.update(prodRef, {
                  stock_disponible: increment(-it.cantidad),
                  updatedAt: new Date().toISOString()
                });
              }
            });
            // Si el item del kit tiene doc real en 'productos' (no es solo sintético terminado en -kit-opc)
            if (it.productId && !it.productId.includes('-kit-opc')) {
              const prodRef = doc(db, 'productos', it.productId);
              batch.update(prodRef, {
                stock_disponible: increment(-it.cantidad),
                updatedAt: new Date().toISOString()
              });
            }
          } else if (it.productId) {
            const prodRef = doc(db, 'productos', it.productId);
            batch.update(prodRef, {
              stock_disponible: increment(-it.cantidad),
              updatedAt: new Date().toISOString()
            });
          }
        });
        await batch.commit();

        const newOrder: PedidoTienda = {
          id: orderId,
          numero_pedido: orderNumber,
          fecha: format(new Date(), 'yyyy-MM-dd HH:mm'),
          cliente_nombre: removeAccents(clienteNombre.trim()),
          cliente_cedula: clienteCedula.trim(),
          cliente_telefono: clienteTelefono.trim(),
          direccion_agencia_envio: removeAccents(fullShippingAddress),
          metodo_entrega: metodoEntrega,
          items: orderItems,
          tasaBCV,
          totalUSD: cartTotals.totalUSD,
          totalBS: cartTotals.totalBS,
          metodo_pago: metodoPago,
          notas_cliente: removeAccents(notasCliente.trim()),
          estado: 'confirmado',
          origen: 'web_ecommerce',
          tipo_confirmacion: 'comprobante_automatico',
          pago_estado: 'pagado_con_comprobante',
          comprobante_url: comprobanteUrl || undefined,
          referencia_pago: referenciaPago.trim() || undefined,
          descontado_inventario: true,
          incomeTransactionId: incomeDocRef.id,
          confirmedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'pedidos_tienda', orderId), cleanForFirestore(newOrder));

        // Clear cart & state
        setCart([]);
        setComprobanteUrl(null);
        setComprobanteFileName(null);
        setReferenciaPago('');
        setIsPickupPromptOpen(false);
        setIsCheckoutOpen(false);
        setCompletedOrder(newOrder);
      } else {
        // =========================================================================
        // MANUAL MODE: Save as pending for WhatsApp coordination & admin manual check
        // =========================================================================
        const newOrder: PedidoTienda = {
          id: orderId,
          numero_pedido: orderNumber,
          fecha: format(new Date(), 'yyyy-MM-dd HH:mm'),
          cliente_nombre: removeAccents(effectiveClientName),
          cliente_cedula: effectiveClientCedula,
          cliente_telefono: effectiveClientPhone,
          direccion_agencia_envio: removeAccents(fullShippingAddress),
          metodo_entrega: metodoEntrega,
          items: orderItems,
          tasaBCV,
          totalUSD: cartTotals.totalUSD,
          totalBS: cartTotals.totalBS,
          metodo_pago: metodoPago,
          notas_cliente: removeAccents(notasCliente.trim()),
          estado: 'pendiente',
          origen: 'web_ecommerce',
          tipo_confirmacion: 'whatsapp_manual',
          pago_estado: 'pendiente_por_whatsapp',
          descontado_inventario: false,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'pedidos_tienda', orderId), cleanForFirestore(newOrder));

        // Clear cart & state
        setCart([]);
        setIsPickupPromptOpen(false);
        setIsCheckoutOpen(false);
        setCompletedOrder(newOrder);

        // Abrir directamente el chat de WhatsApp con el número del dueño (04128276786)
        handleSendToWhatsApp(newOrder);
      }
    } catch (error) {
      console.error("Error submitting biker store order:", error);
      setOrderFormError("Ocurrió un error al procesar tu pedido. Por favor intenta de nuevo o escríbenos directamente.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Generate WhatsApp Message for Order matching user's exact specification
  const generateOrderWhatsAppText = (order: PedidoTienda) => {
    const isPickupInStore = 
      order.metodo_entrega === 'retiro' || 
      order.direccion_agencia_envio === 'Retiro en tienda (Mérida) - Moto Cristo' ||
      Boolean(order.direccion_agencia_envio?.toLowerCase().includes('retiro en tienda'));

    let agencyLabel = 'Agencia MRW';
    let agencyAddress = order.direccion_agencia_envio || '';
    if (agencyAddress.includes(':')) {
      const parts = agencyAddress.split(':');
      const agName = parts[0].trim();
      agencyLabel = agName.toLowerCase().startsWith('agencia') ? agName : `Agencia ${agName}`;
      agencyAddress = parts.slice(1).join(':').trim();
    }

    const isPaid = order.tipo_confirmacion === 'comprobante_automatico';

    let text = isPaid
      ? `🏍️ *PEDIDO PAGADO: LO QUE LOS BIKERS QUIEREN*\n`
      : `🏍️ *NUEVO PEDIDO (POR CONCRETAR): LO QUE LOS BIKERS QUIEREN*\n`;
    text += `Ref: #${order.numero_pedido}\n\n`;
    
    if (isPickupInStore) {
      text += `📦 *DATOS DE RETIRO*\n`;
      if (order.cliente_nombre && order.cliente_nombre !== 'Cliente' && order.cliente_nombre !== 'Cliente (Retiro en tienda)') {
        text += `• *Nombre:* ${order.cliente_nombre}\n`;
      }
      if (order.cliente_cedula && order.cliente_cedula !== 'N/A') {
        text += `• *Cédula:* ${order.cliente_cedula}\n`;
      }
      if (order.cliente_telefono && order.cliente_telefono !== 'N/A') {
        text += `• *Teléfono:* ${order.cliente_telefono}\n`;
      }
      text += `• Punto de Retiro: Moto Cristo (Calle Kennedy, entre Campo de Oro y Santa Mónica, Mérida)\n  Ubicación: https://share.google/YdVNZ3c9PRzGRBsB4\n\n`;
    } else {
      text += `👤 *DATOS DE ENVÍO*\n`;
      text += `• *Nombre:* ${order.cliente_nombre}\n`;
      text += `• *Cédula:* ${order.cliente_cedula}\n`;
      text += `• *Teléfono:* ${order.cliente_telefono}\n`;
      text += `• *${agencyLabel}:* ${agencyAddress}\n\n`;
    }

    text += `📦 *PRODUCTOS*\n`;
    order.items.forEach((it) => {
      text += `• ${it.cantidad}x ${it.nombre} — $${it.precio_unitario.toFixed(2)}\n`;
    });

    text += `\n💰 *TOTAL A PAGAR*\n`;
    text += `• *USD:* $${order.totalUSD.toFixed(2)} (BCV)\n\n`;

    text += `*Método de Pago:* ${order.metodo_pago || 'Pago Móvil'}\n`;
    text += `• *Monto a transferir:* Bs. ${formatVES(order.totalBS)} ${isPaid ? '(pagado)' : '(pago pendiente)'}`;

    if (order.referencia_pago) {
      text += `\n• *Referencia:* ${order.referencia_pago}`;
    }
    if (isPaid && order.comprobante_url) {
      text += `\n• *Comprobante:* Adjuntado en la tienda web`;
    }
    if (order.notas_cliente) {
      text += `\n• *Notas:* ${order.notas_cliente}`;
    }

    if (!isPaid) {
      text += `\n\n💬 *Hola, quiero concretar mi pedido y coordinar el pago con ustedes.*`;
    }

    return text;
  };

  // Generate clean WhatsApp Message for in-store pickup
  const generateStorePickupWhatsAppText = (order: PedidoTienda) => {
    return generateOrderWhatsAppText(order);
  };

  // Open WhatsApp with prefilled message directed to store owner (04128276786 -> 584128276786)
  const handleSendToWhatsApp = (order: PedidoTienda) => {
    const text = generateOrderWhatsAppText(order);
    const encoded = encodeURIComponent(text);
    const targetPhone = STORE_WHATSAPP_PHONE;
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy store link
  const handleCopyStoreLink = () => {
    const url = 'https://www.loquelosbikersquieren.com/';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans selection:bg-[#FFC107] selection:text-black pb-[max(2rem,env(safe-area-inset-bottom))] pt-[94px] md:pt-[138px]">
      {/* ========================================================= */}
      {/* SMART STICKY HEADER (UNIFICADO EN NEGRO PURO #000000)      */}
      {/* ========================================================= */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out bg-[#000000] ${
          isHeaderVisible ? 'translate-y-0' : 'translate-y-0 md:-translate-y-full'
        }`}
      >
        {/* TOP ANNOUNCEMENT BAR (OCULTA EN MÓVIL ESTILO SHEIN, VISIBLE EN DESKTOP) */}
        <div className="hidden md:flex bg-[#000000] text-white px-3 sm:px-6 py-1.5 pt-[max(0.6rem,calc(env(safe-area-inset-top)+0.2rem))] text-[10px] sm:text-xs font-semibold tracking-wide flex-wrap items-center justify-between gap-2 border-b border-white/10">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar">
            <span className="flex items-center gap-1 font-medium text-gray-200">
              <Truck size={13} className="text-[#FFC107] stroke-[2]" />
              <EditableStoreText
                textKey="topAnnouncement"
                value={getText('topAnnouncement')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="span"
                pencilClassName="text-white"
              />
            </span>
            <span className="opacity-30 text-gray-500">|</span>
            <span className="font-mono bg-white/10 text-white px-2 py-0.5 rounded border border-white/15 flex items-center gap-1 font-medium text-[10.5px]">
              💵 Tasa oficial BCV: <strong className="text-[#FFC107] font-semibold">Bs. {formatVES(tasaBCV)}</strong>
              {isFetchingTasa && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FFC107] animate-pulse" title="Sincronizando tasa oficial en vivo..." />
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 text-gray-200 px-2.5 py-0.5 rounded text-[9.5px] font-medium transition-colors cursor-pointer"
              title="Copiar enlace para compartir esta tienda con clientes"
            >
              {copiedLink ? <Check size={11} className="text-emerald-400" /> : <Share2 size={11} />}
              <span>{copiedLink ? '¡Enlace copiado!' : 'Compartir tienda'}</span>
            </button>

            {effectiveAdmin && (
              <button
                type="button"
                onClick={() => {
                  setVariantsModalInitialGroupId(null);
                  setIsVariantsModalOpen(true);
                }}
                className="bg-white/10 hover:bg-white/20 text-[#FFC107] border border-[#FFC107]/40 px-2.5 py-0.5 rounded text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                title="Supervisar y gestionar variantes, grupos y desvincular productos mal agrupados"
              >
                <Boxes size={11} className="text-[#FFC107]" />
                <span>Variantes y grupos</span>
              </button>
            )}

            {effectiveAdmin && (
              <button
                type="button"
                onClick={() => {
                  setTextEditorInitialKey(null);
                  setIsTextEditorOpen(true);
                }}
                className="bg-white/10 hover:bg-white/20 text-[#FFC107] border border-[#FFC107]/40 px-2.5 py-0.5 rounded text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                title="Editar todos los textos fijos, títulos y aclaratorias del e-commerce"
              >
                <Edit3 size={11} className="text-[#FFC107]" />
                <span>Editar textos</span>
              </button>
            )}

            {effectiveAdmin && (
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-[#FFC107] border border-[#FFC107]/30 px-2 py-0.5 rounded text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Configurar qué categorías se muestran a los clientes"
              >
                <Sliders size={11} className="text-[#FFC107]" />
                <span className="hidden sm:inline">Categorías visibles</span>
                <span className="sm:hidden">Categorías</span>
              </button>
            )}

            {effectiveAdmin && onExitToAdmin && (
              <button
                type="button"
                onClick={onExitToAdmin}
                className="bg-white/10 text-[#FFC107] hover:text-white px-2 py-0.5 rounded text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft size={11} />
                <span>Volver</span>
              </button>
            )}
          </div>
        </div>

        {/* MAIN STORE HEADER (FONDO NEGRO PURO #000000) */}
        <header className="bg-[#000000]">
          {/* DESKTOP HEADER ROW */}
          <div className="hidden md:flex max-w-7xl mx-auto px-6 py-3 items-center justify-between gap-4">
            {/* LOGO PRINCIPAL Y BOTÓN DE MENÚ */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-neutral-500 rounded-xl text-neutral-100 hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm group"
                aria-label="Abrir menú"
                title="Abrir menú de navegación"
              >
                <Menu size={18} strokeWidth={2.4} className="text-neutral-100 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-100 group-hover:text-white transition-colors">Menú</span>
              </button>

              <div className="flex items-center">
                <img src="/logo png.png" alt="Lo que los bikers quieren" className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm" />
              </div>
              <div>
                <EditableStoreText
                  textKey="headerSubtitle"
                  value={getText('headerSubtitle')}
                  isAdmin={isAdmin}
                  onOpenEditor={handleOpenTextEditorFor}
                  as="p"
                  className="text-[8.5px] text-gray-300 font-normal tracking-wide"
                />
              </div>
            </div>

            {/* OMNI SEARCH BAR CENTRAL: FONDO BLANCO PURO #FFFFFF, TEXTO NEGRO Y PLACEHOLDER GRIS SUTIL */}
            <div className="flex-1 max-w-xl">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim()) {
                      setSelectedCategory('all');
                      setSelectedSubcategory(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder={getText('searchPlaceholder') || "busca aqui tus accesorios favoritos, acompañante, led, tapa suichera.."}
                  className="w-full bg-[#FFFFFF] border-2 border-transparent focus:border-[#FF5200] rounded-xl pl-11 pr-10 py-2 text-base md:text-sm text-[#111111] placeholder:text-gray-400 font-medium outline-none transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                />
                <Search size={16} className="absolute left-4 text-gray-400 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-gray-500 hover:text-black p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT ACTION BUTTON: CARRITO MINIMALISTA CON ÍCONO CLARO Y BADGE ROJO */}
            <div className="flex items-center gap-2 shrink-0 relative">
              <button
                id="header-cart-button"
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={`relative p-2.5 text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                  isCartBouncing ? 'scale-125 text-emerald-400 rotate-6 shadow-md' : ''
                }`}
                style={{ transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s ease' }}
                title={`Carrito de compras (${cartTotals.totalUnits} ${cartTotals.totalUnits === 1 ? 'artículo' : 'artículos'})`}
                aria-label={`Ver carrito de compras con ${cartTotals.totalUnits} artículos`}
              >
                <ShoppingCart size={22} className={`stroke-[2.2] transition-colors ${isCartBouncing ? 'text-emerald-400' : 'text-gray-200 hover:text-white'}`} />
                {cartTotals.totalUnits > 0 && (
                  <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs border border-[#000000] ${isCartBouncing ? 'animate-bounce scale-110' : 'animate-scale-up'}`}>
                    {cartTotals.totalUnits}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* MÓVIL: FILA ÚNICA HORIZONTAL (SINGLE-ROW CON BUSCADOR SIEMPRE VISIBLE) */}
          <div className="md:hidden flex items-center gap-2 px-2.5 h-14 max-h-[60px] bg-[#000000] text-white w-full">
            {/* 1. ÍCONO DE MENÚ HAMBURGUESA */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-0.5 text-gray-200 hover:text-white rounded-lg active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={22} strokeWidth={2.2} />
            </button>

            {/* 2. LOGO DE LA TIENDA (TAMAÑO COMPACTO) */}
            <div className="flex items-center justify-center shrink-0">
              <img src="/logo png.png" alt="Lo que los bikers quieren" className="h-7 w-auto object-contain drop-shadow-sm" />
            </div>

            {/* 3. CASILLA DE BÚSQUEDA (INPUT SIEMPRE VISIBLE, FLEX-1) */}
            <div className="flex-1 min-w-0 relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim()) {
                    setSelectedCategory('all');
                    setSelectedSubcategory(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder={getText('searchPlaceholder') || "buscar accesorios..."}
                className="w-full bg-[#FFFFFF] border border-transparent focus:border-[#FF5200] rounded-xl pl-8 pr-7 py-1.5 text-base text-[#111111] placeholder:text-gray-400 font-medium outline-none shadow-xs truncate leading-normal"
                style={{ fontSize: '16px' }}
              />
              <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none shrink-0" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-gray-500 hover:text-black p-1 cursor-pointer shrink-0"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* 4. ÍCONO DEL CARRITO (CON BADGE DE CANTIDAD) */}
            <button
              id="header-cart-button-mobile"
              type="button"
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 text-gray-200 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center active:scale-95 shrink-0 ${
                isCartBouncing ? 'scale-125 text-emerald-400 rotate-6' : ''
              }`}
              title={`Carrito de compras (${cartTotals.totalUnits} ${cartTotals.totalUnits === 1 ? 'artículo' : 'artículos'})`}
              aria-label={`Ver carrito de compras con ${cartTotals.totalUnits} artículos`}
            >
              <ShoppingCart size={20} className={`stroke-[2.2] transition-colors ${isCartBouncing ? 'text-emerald-400' : 'text-gray-200'}`} />
              {cartTotals.totalUnits > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9.5px] font-black flex items-center justify-center border border-[#000000] ${isCartBouncing ? 'animate-bounce scale-110' : 'animate-scale-up'}`}>
                  {cartTotals.totalUnits}
                </span>
              )}
            </button>
          </div>

          {/* MÓVIL: TIRA DELGADA DE CATEGORÍAS TIPO SHEIN (FONDO BLANCO, TEXTO DESLIZABLE SIN BORDES) */}
          <div className="md:hidden bg-white px-3 py-2 overflow-x-auto flex items-center gap-5 no-scrollbar whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              className={`text-xs transition-all cursor-pointer shrink-0 pb-1 border-b-2 ${
                selectedCategory === 'all' && !selectedSubcategory
                  ? 'text-black font-semibold border-black'
                  : 'text-gray-500 hover:text-black font-normal border-transparent'
              }`}
            >
              Todos los productos
            </button>
            {categories.map((cat) => {
              const isCatSelected = getCategoryKey(selectedCategory) === getCategoryKey(cat);
              return (
                <button
                  key={`mob-strip-${cat}`}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`text-xs transition-all cursor-pointer shrink-0 pb-1 border-b-2 ${
                    isCatSelected
                      ? 'text-black font-semibold border-black'
                      : 'text-gray-500 hover:text-black font-normal border-transparent'
                  }`}
                >
                  {formatCategorySentenceCase(cat)}
                </button>
              );
            })}
          </div>

          {/* 5. DESKTOP: MENÚ SUPERIOR CON DESPLEGABLE EN HOVER (TIPO SHEIN/AMAZON - TEXTO LIMPIO SIN PILLS) */}
          <div id="biker-category-header-bar" className="hidden md:block bg-[#000000] border-t border-white/10 relative z-30">
            {/* Contenedor horizontal de categorías con scroll fluido sin barra forzada */}
            <div className="max-w-[1720px] mx-auto px-4 sm:px-6 overflow-x-auto md:overflow-visible flex items-center gap-6 sm:gap-7 md:gap-8 no-scrollbar">
              <button
                type="button"
                onClick={() => handleSelectCategory('all')}
                className={`py-2.5 text-xs sm:text-[13px] whitespace-nowrap transition-all cursor-pointer shrink-0 border-b-2 flex items-center gap-1.5 ${
                  selectedCategory === 'all' && !selectedSubcategory
                    ? 'text-white font-medium border-white'
                    : 'text-gray-300 hover:text-white font-normal border-transparent'
                }`}
              >
                <span>Todos los productos</span>
              </button>

              {categories.map((cat, catIdx) => {
                const isCatSelected = getCategoryKey(selectedCategory) === getCategoryKey(cat);
                const rawSubs = subcategoriesByCategory[cat] || [];
                // Filtrar estrictamente cualquier subcategoría que coincida con la categoría general
                const subs = rawSubs.filter(
                  (s) =>
                    getCategoryKey(s.name) !== getCategoryKey(cat) &&
                    normalizeSearch(s.name) !== normalizeSearch(cat) &&
                    s.name.toLowerCase().trim() !== cat.toLowerCase().trim()
                );
                const hasSubs = subs.length > 0;
                const isHovered = hoveredCategory === cat;
                const isMobileOpen = mobileExpandedCategory === cat;
                const isExpanded = isHovered || isMobileOpen;

                return (
                  <div
                    key={`biker-cat-wrap-${cat}-${catIdx}`}
                    className="relative group shrink-0"
                    onMouseEnter={() => setHoveredCategory(cat)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (hasSubs) {
                          if (mobileExpandedCategory === cat) {
                            setMobileExpandedCategory(null);
                          } else {
                            handleSelectCategory(cat);
                            setMobileExpandedCategory(cat);
                          }
                        } else {
                          handleSelectCategory(cat);
                        }
                      }}
                      className={`py-2.5 text-xs sm:text-[13px] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                        isCatSelected
                          ? 'text-white font-medium border-white'
                          : 'text-gray-300 hover:text-white font-normal border-transparent'
                      }`}
                    >
                      <span>{formatCategorySentenceCase(cat)}</span>
                      {hasSubs && (
                        <ChevronDown 
                          size={12} 
                          className={`transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          } ${isCatSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} 
                        />
                      )}
                    </button>

                    {/* DESKTOP DROPDOWN: Menú minimalista limpio estilo Shein / Apple (fondo blanco puro, lista en texto simple, sombras suaves) */}
                    {hasSubs && (
                      <div
                        className={`hidden md:block absolute top-full left-0 pt-2 z-50 transition-all duration-200 ${
                          isHovered ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                        }`}
                      >
                        <div className="bg-white border border-gray-100 rounded-xl p-2 shadow-md min-w-[210px] max-w-[280px] space-y-0.5">
                          {/* Primer elemento: "Ver todo" */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedSubcategory(null);
                              setSearchQuery('');
                              setHoveredCategory(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between cursor-pointer ${
                              isCatSelected && !selectedSubcategory
                                ? 'bg-gray-100 text-black font-semibold'
                                : 'text-gray-600 hover:text-black hover:bg-gray-50 font-normal'
                            }`}
                          >
                            <span>Ver todo</span>
                            <ArrowRight size={13} className="text-gray-400" />
                          </button>

                          <div className="border-t border-gray-100 my-1" />

                          {/* Lista limpia de subcategorías en texto simple con hover suave */}
                          {subs.map((subItem) => {
                            const isSubSelected = isCatSelected && (
                              selectedSubcategory?.toLowerCase() === subItem.name.toLowerCase() ||
                              getSubcategoryKey(selectedSubcategory || '') === getSubcategoryKey(subItem.name)
                            );

                            return (
                              <button
                                key={`sub-${cat}-${subItem.name}`}
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setSelectedSubcategory(subItem.name);
                                  setSearchQuery('');
                                  setHoveredCategory(null);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between cursor-pointer ${
                                  isSubSelected
                                    ? 'bg-gray-100 text-black font-semibold'
                                    : 'text-gray-600 hover:text-black hover:bg-gray-50 font-normal'
                                }`}
                              >
                                <span className="truncate">{formatCategorySentenceCase(subItem.name)}</span>
                                {subItem.count !== undefined && (
                                  <span className="text-xs text-gray-400 font-normal ml-2 shrink-0">
                                    ({subItem.count})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* MÓVIL: DESPLIEGUE FLUIDO SOBRE LA SECCIÓN BLANCA INFERIOR (SIN SCROLL INTERNO FORZADO) */}
            {mobileExpandedCategory && (() => {
              const cat = mobileExpandedCategory;
              const isCatSelected = getCategoryKey(selectedCategory) === getCategoryKey(cat);
              const rawSubs = subcategoriesByCategory[cat] || [];
              const subs = rawSubs.filter(
                (s) =>
                  getCategoryKey(s.name) !== getCategoryKey(cat) &&
                  normalizeSearch(s.name) !== normalizeSearch(cat) &&
                  s.name.toLowerCase().trim() !== cat.toLowerCase().trim()
              );
              if (subs.length === 0) return null;

              return (
                <div className="md:hidden absolute top-full left-0 right-0 px-2.5 pt-1 pb-2 z-50 animate-fade-in pointer-events-auto">
                  <div className="bg-[#0b0f19]/98 backdrop-blur-2xl border border-amber-500/35 rounded-2xl p-2.5 shadow-2xl shadow-black/95 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedSubcategory(null);
                          setSearchQuery('');
                          setMobileExpandedCategory(null);
                        }}
                        className={`flex-1 text-left py-1 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isCatSelected && !selectedSubcategory
                            ? 'text-amber-300'
                            : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        <span>Ver todo</span>
                        <ArrowRight size={13} className="text-amber-400 shrink-0" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileExpandedCategory(null)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ml-2 shrink-0 transition-colors"
                        aria-label="Cerrar subcategorías"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>

                    <div className="border-t border-white/10" />

                    {/* Despliegue de subcategorías en rejilla limpia de 2 columnas sin scroll interno */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {subs.map((subItem) => {
                        const isSubSelected = isCatSelected && (
                          selectedSubcategory?.toLowerCase() === subItem.name.toLowerCase() ||
                          getSubcategoryKey(selectedSubcategory || '') === getSubcategoryKey(subItem.name)
                        );

                        return (
                          <button
                            key={`mob-sub-${cat}-${subItem.name}`}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedSubcategory(subItem.name);
                              setSearchQuery('');
                              setMobileExpandedCategory(null);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-[10.5px] font-medium flex items-center justify-between gap-1 transition-all cursor-pointer ${
                              isSubSelected
                                ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                                : 'bg-white/5 text-slate-200 hover:text-white hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            <span className="truncate">{formatCategorySentenceCase(subItem.name)}</span>
                            <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              isSubSelected ? 'bg-black/25 text-black' : 'bg-white/10 text-slate-400'
                            }`}>
                              {subItem.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </header>
      </div>

      <main className="max-w-[1720px] mx-auto px-2 sm:px-3 md:px-4 lg:px-5 pt-1 sm:pt-2 pb-6 sm:pb-8 space-y-2.5">
        {/* ACTIVE FILTERS & SORTING ROW (MINIMALISTA, SIN BORDES DIVISORES NI TÍTULO REDUNDANTE) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {!searchQuery && selectedCategory !== 'all' && (
              <span className="text-xs font-normal bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span>{formatCategorySentenceCase(selectedCategory)}</span>
                <button
                  type="button"
                  onClick={() => handleSelectCategory('all')}
                  className="ml-1 text-gray-500 hover:text-black p-0.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                  title="Quitar categoría"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            {!searchQuery && selectedSubcategory && (
              <span className="text-xs font-normal bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <span>Subcategoría: {formatCategorySentenceCase(selectedSubcategory)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className="hover:text-black ml-0.5 cursor-pointer text-gray-500"
                  title="Quitar filtro de subcategoría"
                >
                  ✕
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="text-xs font-normal bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span>Búsqueda: "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-gray-500 hover:text-black p-0.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                  title="Quitar búsqueda"
                >
                  <X size={10} />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Ordenar por */}
            <div className="flex items-center gap-1.5 text-xs font-normal text-gray-500">
              <SlidersHorizontal size={12} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-gray-600 outline-none cursor-pointer font-normal hover:text-black transition-colors"
              >
                <option value="destacados">Destacados</option>
                <option value="precio_asc">Menor precio</option>
                <option value="precio_desc">Mayor precio</option>
                <option value="nombre">Nombre (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* PRODUCTS GRID (ESTILO DE ALTA DENSIDAD SHEIN: 5-6 COLUMNAS, TARJETAS PLANAS Y FOTO EDGE-TO-EDGE) */}
        {isLoadingProducts && sourceProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <div key={`skel-${n}`} className="bg-white rounded-none sm:rounded-sm p-0 space-y-2">
                <div className="w-full aspect-[4/5] sm:aspect-square bg-gray-100 rounded-none sm:rounded-sm" />
                <div className="px-1.5 pb-2 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded-sm w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-sm w-1/2" />
                  <div className="h-7 bg-gray-100 rounded-sm w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : catalogItems.length === 0 ? (
          <div className="py-20 text-center space-y-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 max-w-lg mx-auto p-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <ShoppingBag size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-lg tracking-tight text-[#111111]">No se encontraron productos</h3>
              <p className="text-xs text-gray-500 font-normal">
                Intenta ajustar tu búsqueda o selecciona otra categoría en el menú superior.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedSubcategory(null);
              }}
              className="px-4 py-2 bg-[#000000] hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition-all cursor-pointer shadow-sm"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3 lg:gap-3.5">
            {catalogItems.map((item, itemIdx) => {
              const isSelectedByUser = Boolean(selectedVariantMap[item.id]);
              const activeVariant = item.variants.find(v => v.id === selectedVariantMap[item.id]) || item.coverProduct;
              const hasVariants = Boolean(item.variants && item.variants.length > 1);
              
              // Al abrir la página (cuando el usuario no ha seleccionado una variante específica),
              // se utiliza estrictamente la imagen asignada como portada en la base de datos
              const itemImages = getItemImages(item, activeVariant, !isSelectedByUser && Boolean(item.coverImage));

              const currentImageIndex = cardImageIndexMap[item.id] || 0;
              const priceUSD = activeVariant.precio_venta_ref || activeVariant.precio_mayor || 0;
              const priceBS = priceUSD * tasaBCV;
              const currentStock = activeVariant.stock_disponible ?? item.totalStock ?? 0;
              const isVariantInStock = (activeVariant.stock_disponible || 0) > 0;
              const isJustAdded = addedAnimationId === activeVariant.id;

              return (
                <div
                  key={`biker-cat-item-${item.id}-${itemIdx}`}
                  onClick={() => handleOpenCardQuickView(item)}
                  className="bg-white rounded-none sm:rounded-sm p-0 flex flex-col h-full group relative cursor-pointer overflow-hidden transition-all duration-150"
                  title="Haz clic para ver detalles y agregar al carrito"
                >
                  {/* Contenedor de Imagen: Ocupa el 100% del ancho de la tarjeta sin padding lateral */}
                  <div className="relative w-full overflow-hidden bg-[#FAFAFA] rounded-none sm:rounded-sm">
                    {/* Indicador de Stock Crítico superpuesto en la esquina superior izquierda */}
                    {currentStock > 0 && currentStock <= 5 && (
                      <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
                        <span className="text-[7.5px] sm:text-[8px] font-normal px-1.5 py-0.5 rounded-sm bg-white/95 backdrop-blur-xs text-[#FF5200] border border-orange-200/80 flex items-center gap-1 shadow-2xs tracking-tight">
                          <span className="animate-pulse">⏳</span>
                          <span>Casi agotado: {currentStock}</span>
                        </span>
                      </div>
                    )}

                    <StoreImageCarousel
                      images={itemImages}
                      currentIndex={currentImageIndex}
                      onIndexChange={(newIdx) => {
                        setCardImageIndexMap(prev => ({ ...prev, [item.id]: newIdx }));
                      }}
                      altText={item.title}
                      className="w-full aspect-[4/5] sm:aspect-square object-cover"
                      onOpenDetail={() => handleOpenCardQuickView(item)}
                      showThumbnails={false}
                    />
                  </div>

                  {/* Product Info: Con ligero espaciado interno para respirar debajo de la foto */}
                  <div className="pt-2 pb-2 px-1 sm:px-1.5 flex-1 flex flex-col justify-between">
                    <div className="flex-1 flex flex-col">
                      {/* Name / Título General: Negro Apple / Shein #111111 */}
                      <h4 
                        className="font-medium text-xs sm:text-[13px] text-[#111111] line-clamp-2 min-h-[2rem] sm:min-h-[2.3rem] group-hover:text-[#FF5200] transition-colors leading-snug tracking-tight"
                        title={item.title}
                      >
                        {formatTitleCase(item.title)}
                      </h4>

                      {/* Selector Visual de Variantes: Altura mínima fija de 40px para Zero CLS */}
                      <div className="min-h-[40px] flex flex-col justify-center">
                        {item.isGroup && item.variants.length > 1 ? (
                          <div className="pt-1 pb-0.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[7.5px]">
                              <span className="text-gray-500 font-normal flex items-center gap-1 truncate max-w-[130px]">
                                <Boxes size={8} className="text-[#FF5200] shrink-0" />
                                <span>
                                  {isSelectedByUser ? (activeVariant.es_kit ? 'Kit:' : 'Mod:') : 'Opciones:'}
                                </span>
                                <strong className="text-gray-800 font-medium truncate">
                                  {isSelectedByUser ? (activeVariant.variante_nombre || activeVariant.nombre) : 'Portada'}
                                </strong>
                              </span>
                              <span className="text-[7px] font-mono text-gray-400 shrink-0">
                                {item.variants.length} opc.
                              </span>
                            </div>

                            {/* Tira de Miniaturas Visuales de Modelos Diferentes */}
                            <div className="flex items-center gap-1 overflow-x-auto py-0.5 px-0.5 custom-scrollbar">
                              {item.variants.map((v) => {
                                const isSelected = isSelectedByUser && activeVariant.id === v.id;
                                const vInStock = (v.stock_disponible || 0) > 0;
                                const rawThumb = v.es_kit 
                                  ? (v.grupo_kit_imagen || item.kitImage || v.variante_imagen_miniatura || v.imagen_portada || v.link || v.imagen_url)
                                  : (v.variante_imagen_miniatura || v.imagen_portada || v.link || v.imagen_url);
                                const vImg = rawThumb ? formatDirectImageUrl(rawThumb) : '';
                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedVariantMap(prev => ({ ...prev, [item.id]: v.id }));
                                      setCardImageIndexMap(prev => ({ ...prev, [item.id]: 0 }));
                                    }}
                                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-sm overflow-hidden shrink-0 border transition-all cursor-pointer relative bg-gray-50 flex items-center justify-center ${
                                      isSelected
                                        ? 'border-[#FF5200] ring-1 ring-[#FF5200]/40 scale-105 shadow-2xs z-10'
                                        : 'border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-400'
                                    }`}
                                    title={`${v.variante_nombre || (v.es_kit ? (item.kitName || 'Kit') : v.nombre)} - $${(v.precio_venta_ref || v.precio_mayor || 0).toFixed(2)} USD`}
                                  >
                                    {vImg ? (
                                      <img
                                        src={vImg}
                                        alt={v.variante_nombre || v.nombre}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                                        }}
                                      />
                                    ) : (
                                      <span className="text-[7px] font-medium text-gray-500 text-center p-0.5 truncate leading-none">
                                        {v.es_kit ? (v.variante_nombre || item.kitName || 'Kit').slice(0, 4) : (v.variante_nombre || v.nombre).slice(0, 3)}
                                      </span>
                                    )}
                                    {!vInStock && (
                                      <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-rose-600 text-[7px] font-bold">
                                        ✕
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="h-[40px]" aria-hidden="true" />
                        )}
                      </div>
                    </div>

                    {/* Contenedor inferior fijado con mt-auto: Precios y Botón CTA */}
                    <div className="mt-auto pt-2 space-y-1.5">
                      {/* Price section: Naranja Refinado #FF5200 en semibold y Bolívares en gris medio normal */}
                      <div className="pt-1 border-t border-gray-100 space-y-0.5 font-mono">
                        <div className="flex items-baseline gap-1 flex-wrap">
                          {item.hasKit && !isSelectedByUser ? (
                            <>
                              <span className="text-[9px] font-normal text-gray-500">Desde</span>
                              <span className="text-sm sm:text-base font-semibold text-[#FF5200] tracking-tight"> ${item.priceMin.toFixed(2)} </span>
                              <span className="text-[10px] font-medium text-[#FF5200]">USD</span>
                            </>
                          ) : item.isGroup && item.priceMin !== item.priceMax && !isSelectedByUser ? (
                            <>
                              <span className="text-[9px] font-normal text-gray-500">Desde</span>
                              <span className="text-sm sm:text-base font-semibold text-[#FF5200] tracking-tight"> ${item.priceMin.toFixed(2)} - ${item.priceMax.toFixed(2)} </span>
                              <span className="text-[10px] font-medium text-[#FF5200]">USD</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm sm:text-base font-semibold text-[#FF5200] tracking-tight"> ${priceUSD.toFixed(2)} </span>
                              <span className="text-[10px] font-medium text-[#FF5200]">USD</span>
                            </>
                          )}
                        </div>
                        <div className="text-[9.5px] sm:text-[10px] font-normal text-gray-500 leading-tight">
                          ≈ Bs. {formatVES((item.hasKit && !isSelectedByUser ? item.priceMin : priceUSD) * tasaBCV)}
                        </div>
                      </div>

                      {/* Botón CTA Único (Fondo negro, font-medium, esquinas mínimas rounded-sm) */}
                      <div>
                        {hasVariants ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCardQuickView(item);
                            }}
                            className="w-full py-1.5 sm:py-2 px-2.5 rounded-sm bg-[#000000] hover:bg-neutral-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                            title="Ver opciones disponibles"
                          >
                            <ShoppingCart size={12} className="text-white stroke-[2.2] shrink-0" />
                            <span>Ver opciones</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isVariantInStock) {
                                handleAddToCart(activeVariant, 1, e.currentTarget as HTMLElement);
                              }
                            }}
                            disabled={!isVariantInStock}
                            className={`w-full py-1.5 sm:py-2 px-2.5 rounded-sm font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              isJustAdded
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                                : 'bg-[#000000] hover:bg-neutral-800 text-white'
                            }`}
                            title={isVariantInStock ? "Agregar este producto al carrito" : "Producto agotado"}
                          >
                            {isJustAdded ? (
                              <>
                                <Check size={12} className="stroke-[3] text-white shrink-0" />
                                <span>¡Agregado!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={12} className="text-white stroke-[2.2] shrink-0" />
                                <span>{isVariantInStock ? 'Agregar al carrito' : 'Agotado'}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MENÚ HAMBURGUESA LATERAL (MÓVIL Y ESCRITORIO)             */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[99999]">
          {/* Backdrop oscuro */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 transition-opacity duration-300"
          />
          
          {/* Panel lateral */}
          <div className="fixed inset-y-0 left-0 w-[82vw] max-w-sm bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-right text-[#111111]">
            {/* Cabecera del Drawer */}
            <div className="bg-[#000000] text-white p-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <img src="/logo png.png" alt="Lo que los bikers quieren" className="h-8 w-auto object-contain" />
                <span className="font-medium text-xs text-white">Menú</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {/* 1. Botón Canal VIP de WhatsApp */}
              <a
                href={STORE_WHATSAPP_VIP_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 px-3.5 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white text-xs font-bold flex items-center justify-between shadow-md hover:opacity-95 transition-all cursor-pointer group active:scale-98"
                aria-label="Canal VIP de WhatsApp"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <WhatsAppVectorIcon className="w-4 h-4 text-white" size={18} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[13px] leading-tight text-white">Canal VIP de WhatsApp</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-white text-[#128C7E] text-[9px] font-black uppercase tracking-wider">VIP</span>
                    </div>
                    <p className="text-[10px] text-emerald-100 font-normal leading-tight mt-0.5">Ofertas y lanzamientos exclusivos</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-white/80 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </a>

              {/* 2. Botón Contacto Directo WhatsApp */}
              <a
                href={getWhatsAppDirectUrl('¡Hola! Me gustaría hacer una consulta sobre la tienda.')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 px-3.5 rounded-2xl bg-black hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-between shadow-md transition-all cursor-pointer group active:scale-98 border border-neutral-800"
                aria-label="Contacto directo por WhatsApp"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0 shadow-xs">
                    <WhatsAppVectorIcon className="w-4 h-4 text-white" size={18} />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-[13px] leading-tight text-white block">Contacto directo WhatsApp</span>
                    <p className="text-[10px] text-gray-300 font-normal leading-tight mt-0.5">+58 412-8276786 (Atención personalizada)</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </a>

              {/* Tasa BCV */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between text-xs font-medium text-[#111111]">
                <span className="flex items-center gap-1.5 text-gray-700">
                  💵 Tasa Oficial BCV:
                </span>
                <span className="text-[#000000] font-semibold">
                  Bs. {formatVES(tasaBCV)}
                </span>
              </div>

              {/* Botón Desplegable de Categorías */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsDrawerCategoriesOpen((prev) => !prev)}
                  className="w-full p-3.5 bg-gray-50 hover:bg-gray-100 flex items-center justify-between cursor-pointer transition-colors"
                  aria-expanded={isDrawerCategoriesOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
                      <Layers size={14} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-gray-900 block">Categorías de productos</span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {isDrawerCategoriesOpen ? 'Toca para contraer' : 'Toca para desplegar categorías'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform duration-200 ${isDrawerCategoriesOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isDrawerCategoriesOpen && (
                  <div className="p-2 space-y-1 border-t border-gray-200 bg-white animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedSubcategory(null);
                      setSearchQuery('');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedCategory === 'all' && !selectedSubcategory
                        ? 'bg-black text-white font-black'
                        : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <span>🔥 Todos los productos</span>
                    <span className="text-xs">→</span>
                  </button>

                  {categories.map((cat) => {
                    const isCatSelected = getCategoryKey(selectedCategory) === getCategoryKey(cat);
                    const rawSubs = subcategoriesByCategory[cat] || [];
                    const subs = rawSubs.filter(
                      (s) =>
                        getCategoryKey(s.name) !== getCategoryKey(cat) &&
                        normalizeSearch(s.name) !== normalizeSearch(cat) &&
                        s.name.toLowerCase().trim() !== cat.toLowerCase().trim()
                    );
                    const hasSubs = subs.length > 0;
                    const isExpanded = mobileExpandedCategory === cat;

                    return (
                      <div key={`drawer-cat-${cat}`} className="rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedSubcategory(null);
                              setSearchQuery('');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex-1 text-left px-3 py-2.5 rounded-l-xl text-xs font-bold transition-all cursor-pointer ${
                              isCatSelected && !selectedSubcategory
                                ? 'bg-black text-white font-black'
                                : 'text-gray-800 hover:bg-gray-100'
                            }`}
                          >
                            {formatCategorySentenceCase(cat)}
                          </button>
                          {hasSubs && (
                            <button
                              type="button"
                              onClick={() => setMobileExpandedCategory(isExpanded ? null : cat)}
                              className={`p-2.5 rounded-r-xl transition-colors cursor-pointer ${
                                isCatSelected && !selectedSubcategory
                                  ? 'bg-black text-white'
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                              aria-label={`Ver subcategorías de ${cat}`}
                            >
                              <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>

                        {/* Subcategorías anidadas */}
                        {hasSubs && isExpanded && (
                          <div className="pl-4 pr-1 py-1 space-y-1 bg-gray-50 rounded-b-xl border-l-2 border-black ml-3 my-1">
                            {/* Opción limpia "Ver todo" */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat);
                                setSelectedSubcategory(null);
                                setSearchQuery('');
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                isCatSelected && !selectedSubcategory
                                  ? 'bg-black text-white font-bold'
                                  : 'text-gray-600 hover:text-black hover:bg-gray-200/60'
                              }`}
                            >
                              <span>Ver todo</span>
                              <ArrowRight size={13} className={isCatSelected && !selectedSubcategory ? 'text-white' : 'text-gray-400'} />
                            </button>

                            {subs.map((subItem) => {
                              const isSubSelected = isCatSelected && (
                                selectedSubcategory?.toLowerCase() === subItem.name.toLowerCase() ||
                                getSubcategoryKey(selectedSubcategory || '') === getSubcategoryKey(subItem.name)
                              );
                              return (
                                <button
                                  key={`drawer-sub-${cat}-${subItem.name}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(cat);
                                    setSelectedSubcategory(subItem.name);
                                    setSearchQuery('');
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                    isSubSelected
                                      ? 'bg-black text-white font-bold'
                                      : 'text-gray-600 hover:text-black hover:bg-gray-200/60'
                                  }`}
                                >
                                  <span>{formatCategorySentenceCase(subItem.name)}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">({subItem.count})</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>

              {/* Acciones de Contacto y Tienda */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyStoreLink();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer text-gray-700"
                >
                  <Share2 size={14} />
                  <span>Compartir Tienda</span>
                </button>

                {effectiveAdmin && (
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <span className="text-[10px] font-medium text-amber-600 px-1">Opciones de administrador</span>
                    <button
                      type="button"
                      onClick={() => {
                        setVariantsModalInitialGroupId(null);
                        setIsVariantsModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Boxes size={13} className="text-amber-600" />
                      <span>Variantes y Grupos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTextEditorInitialKey(null);
                        setIsTextEditorOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 size={13} className="text-amber-600" />
                      <span>Editar Textos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Sliders size={13} className="text-amber-600" />
                      <span>Categorías Visibles</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer del Drawer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 font-normal">
                Lo que los bikers quieren © {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CART DRAWER / SLIDE-OVER                                  */}
      {/* ========================================================= */}
      {isCartOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCartOpen(false);
          }}
          className="fixed inset-0 z-[100010] bg-black/60 flex justify-end animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl animate-slide-left text-[#111111] cursor-default"
          >
            {/* Header Drawer */}
            <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#000000] text-white flex items-center justify-center font-black shadow-xs">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <EditableStoreText
                    textKey="cartDrawerTitle"
                    value={getText('cartDrawerTitle')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="h3"
                    className="font-medium text-base tracking-tight text-[#111111] leading-none"
                  />
                  <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                    {cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {cart.length > 0 && (
                  <div className="relative" ref={sharePopoverRef}>
                    <button
                      type="button"
                      onClick={() => setIsSharePopoverOpen(!isSharePopoverOpen)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-90 shrink-0 ${
                        isSharePopoverOpen
                          ? 'bg-neutral-900 text-white'
                          : 'bg-gray-100 hover:bg-neutral-900 hover:text-white text-gray-700'
                      }`}
                      title="Compartir enlace directo del carrito"
                      aria-label="Compartir carrito"
                    >
                      <Share2 size={16} />
                    </button>

                    {/* Popover / Menú desplegable */}
                    {isSharePopoverOpen && (
                      <div className="absolute right-0 top-full mt-2 bg-neutral-900 border border-neutral-700 shadow-xl rounded-xl p-2 z-50 min-w-[220px] space-y-1 animate-scale-up">
                        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold border-b border-neutral-800 mb-1">
                          Copiar enlace corto
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySharedCartLink('mrw')}
                          className="w-full text-left px-2.5 py-2 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <span className="text-sm">🚚</span>
                          <span>Envío Nacional MRW</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySharedCartLink('zoom')}
                          className="w-full text-left px-2.5 py-2 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <span className="text-sm">📦</span>
                          <span>Envío Nacional Zoom</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySharedCartLink('tienda')}
                          className="w-full text-left px-2.5 py-2 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <span className="text-sm">🏬</span>
                          <span>Retiro en Tienda Mérida</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-[#000000] hover:text-white text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shrink-0"
                  title="Cerrar carrito"
                  aria-label="Cerrar carrito"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* List of items */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <p className="font-medium text-base tracking-tight text-[#111111]">Tu carrito está vacío</p>
                  <p className="text-xs text-gray-500 font-normal max-w-xs mx-auto">
                    Explora nuestro catálogo de accesorios para motos para agregar productos a tu compra.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 bg-[#000000] hover:bg-neutral-800 text-white text-xs font-medium rounded-lg cursor-pointer shadow-xs transition-colors"
                  >
                    Ir al catálogo
                  </button>
                </div>
              ) : (
                cart.map((item, cartIdx) => {
                  const isZero = item.quantity === 0;
                  const img = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                  return (
                    <div
                      key={`cart-item-${item.product.id || 'p'}-${item.product.sku || ''}-${cartIdx}`}
                      className={`border rounded-2xl p-3 flex items-center gap-3 relative transition-all duration-200 group ${
                        isZero
                          ? 'bg-gray-100/90 border-dashed border-gray-300 opacity-60 grayscale'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className={`w-14 h-14 rounded-xl bg-white border overflow-hidden flex items-center justify-center shrink-0 ${
                        isZero ? 'border-gray-300 opacity-60' : 'border-gray-200'
                      }`}>
                        {img ? (
                          <img src={img} alt={item.product.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-gray-400" />
                        )}
                      </div>

                      {/* Info & Quantity */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h5 className={`font-medium text-xs truncate ${isZero ? 'text-gray-500 line-through' : 'text-[#111111]'}`}>
                            {item.product.nombre}
                          </h5>
                          {isZero && (
                            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                              En pausa (0)
                            </span>
                          )}
                        </div>

                        <p className={`text-[10.5px] font-mono font-medium mt-0.5 ${isZero ? 'text-gray-400' : 'text-[#FF5200]'}`}>
                          ${item.precio_unitario.toFixed(2)} USD <span className="text-gray-500 font-normal">c/u</span>
                        </p>

                        {/* Stepper y opción de recuperación */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.product.id, item.quantity - 1)}
                              disabled={isZero}
                              className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed font-medium cursor-pointer text-xs transition-colors"
                              title="Disminuir cantidad"
                              aria-label="Disminuir cantidad"
                            >
                              -
                            </button>
                            <span className={`w-7 text-center font-mono font-medium text-xs ${
                              isZero ? 'text-amber-800 bg-amber-50 rounded' : 'text-[#111111]'
                            }`}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.product.id, item.quantity + 1)}
                              className={`w-5 h-5 rounded flex items-center justify-center font-medium cursor-pointer text-xs transition-colors ${
                                isZero 
                                  ? 'bg-[#000000] text-white hover:bg-neutral-800 shadow-xs' 
                                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
                              }`}
                              title={isZero ? "Restaurar a 1 unidad" : "Aumentar cantidad"}
                              aria-label="Aumentar cantidad"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            {isZero ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(item.product.id, 1)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                              >
                                ↩ Restaurar a 1
                              </button>
                            ) : (
                              <span className="font-mono font-semibold text-xs text-[#FF5200]">
                                ${item.subtotal.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-gray-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer shrink-0"
                        title="Eliminar definitivamente del carrito"
                        aria-label="Eliminar del carrito"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Drawer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3 font-mono">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Subtotal USD:</span>
                    <span className="font-medium text-[#111111]">${cartTotals.totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Equivalente en Bolívares:</span>
                    <span className="font-normal text-gray-500">Bs. {formatVES(cartTotals.totalBS)}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-gray-200">
                    <span className="font-medium text-sm text-[#111111]">Total a pagar:</span>
                    <span className="font-semibold text-2xl tracking-tight text-[#FF5200]">${cartTotals.totalUSD.toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 font-sans">
                  {/* Botón Principal (Fondo negro sólido, texto blanco, font-medium, rounded-lg) */}
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    disabled={cartTotals.totalUnits === 0}
                    className="w-full py-3.5 bg-[#000000] hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
                  >
                    <span>Finalizar compra</span>
                    <ArrowRight size={15} className="text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-1 text-center text-xs text-gray-500 hover:text-[#111111] font-normal cursor-pointer transition-colors"
                  >
                    Seguir comprando
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CHECKOUT MODAL: DATOS DE ENVÍO REQUERIDOS POR EL CLIENTE   */}
      {/* ========================================================= */}
      {isCheckoutOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCheckoutOpen(false);
          }}
          className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-0 sm:p-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white sm:border sm:border-gray-200 rounded-none sm:rounded-3xl w-full h-full sm:h-auto max-w-2xl sm:max-h-[calc(100dvh-2.5rem)] flex flex-col overflow-y-auto sm:overflow-hidden shadow-2xl animate-scale-up my-auto text-[#111111] cursor-default"
          >
            {/* Modal Header: Título y Ruta de Pasos */}
            <div className="p-2.5 sm:p-4 border-b border-gray-200 bg-gray-50 space-y-1.5 sm:space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {checkoutStep > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderFormError(null);
                        setCheckoutStep((prev) => Math.max(0, prev - 1) as 0 | 1 | 2);
                      }}
                      className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center font-bold shrink-0 shadow-2xs cursor-pointer transition-all active:scale-90"
                      title="Regresar al paso anterior"
                      aria-label="Regresar al paso anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  ) : (
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#000000] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                      {metodoEntrega === 'retiro' ? <Store size={15} /> : <Truck size={15} />}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-sm sm:text-lg text-[#111111] leading-none">
                      {checkoutStep === 0
                        ? "Método de entrega"
                        : checkoutStep === 1
                        ? (metodoEntrega === 'retiro' ? "Datos de quien retira" : (getText('checkoutModalTitle') || "Datos de envío"))
                        : "Método de pago"}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 font-normal mt-0.5 leading-none">
                      {checkoutStep === 0
                        ? "Elige la forma de entrega para continuar"
                        : checkoutStep === 1
                        ? (metodoEntrega === 'retiro' ? "Indica tus datos para apartar tu producto en Mérida" : (getText('checkoutModalSubtitle') || "Información para encomienda nacional"))
                        : (metodoEntrega === 'retiro' ? "Paga y retira en Moto Cristo (Mérida)" : "Selecciona tu método de pago")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setIsCartOpen(true);
                    }}
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shrink-0"
                    title="Volver al carrito"
                    aria-label="Volver al carrito"
                  >
                    <ShoppingCart size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shrink-0"
                    title="Cerrar ventana"
                    aria-label="Cerrar ventana"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Barra de Ruta (3 Pasos Claros) */}
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg sm:rounded-xl py-1 px-2.5 sm:p-2 sm:px-3 text-xs font-medium shadow-xs">
                {/* 1. Entrega */}
                <button
                  type="button"
                  onClick={() => {
                    setOrderFormError(null);
                    setCheckoutStep(0);
                  }}
                  className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                    checkoutStep === 0 ? 'text-[#111111] font-semibold' : 'text-gray-600 hover:text-black font-normal'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8.5px] sm:text-[9px] font-medium ${
                    checkoutStep > 0 ? 'bg-[#000000] text-white' : 'bg-[#000000] text-white'
                  }`}>
                    {checkoutStep > 0 ? '✓' : '1'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium">1. Entrega</span>
                </button>

                <div className="flex-1 mx-2 sm:mx-3 h-0.5 bg-gray-200 relative">
                  <div className={`h-full bg-[#000000] transition-all duration-300 ${
                    checkoutStep > 0 ? 'w-full' : 'w-0'
                  }`} />
                </div>

                {/* 2. Datos de Retiro / Envío */}
                <button
                  type="button"
                  onClick={() => {
                    if (checkoutStep >= 1) {
                      setOrderFormError(null);
                      setCheckoutStep(1);
                    }
                  }}
                  className={`flex items-center gap-1.5 ${
                    checkoutStep >= 1 ? 'cursor-pointer' : 'cursor-default'
                  } transition-colors ${
                    checkoutStep === 1 ? 'text-[#111111] font-semibold' : (checkoutStep > 1 ? 'text-gray-600 hover:text-black font-normal' : 'text-gray-400')
                  }`}
                >
                  <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8.5px] sm:text-[9px] font-medium ${
                    checkoutStep > 1 ? 'bg-[#000000] text-white' : (checkoutStep === 1 ? 'bg-[#000000] text-white' : 'bg-gray-200 text-gray-600')
                  }`}>
                    {checkoutStep > 1 ? '✓' : '2'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium">
                    {metodoEntrega === 'retiro' ? '2. Datos de retiro' : '2. Envío'}
                  </span>
                </button>

                <div className="flex-1 mx-2 sm:mx-3 h-0.5 bg-gray-200 relative">
                  <div className={`h-full bg-[#000000] transition-all duration-300 ${
                    checkoutStep === 2 ? 'w-full' : 'w-0'
                  }`} />
                </div>

                {/* 3. Pago */}
                <div className={`flex items-center gap-1.5 ${
                  checkoutStep === 2 ? 'text-[#111111] font-semibold' : 'text-gray-400'
                }`}>
                  <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8.5px] sm:text-[9px] font-medium ${
                    checkoutStep === 2 ? 'bg-[#000000] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    3
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium">
                    3. Pago
                  </span>
                </div>
              </div>
            </div>

            {/* Form & Items */}
            <form onSubmit={handleSubmitOrder} className={`p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1 custom-scrollbar transition-colors ${checkoutStep === 2 ? 'bg-gray-50' : 'bg-white'}`}>
              {/* Form Error Banner */}
              {orderFormError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-normal flex items-center gap-2.5 animate-shake">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{orderFormError}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 0: SELECCIÓN DE MÉTODO DE ENTREGA                     */}
              {/* ========================================================= */}
              {checkoutStep === 0 && (
                <div className="space-y-3 sm:space-y-4 animate-fade-in py-1">
                  <div className="text-left pb-1 border-b border-gray-100">
                    <h4 className="text-sm font-medium text-[#111111]">
                      Método de entrega
                    </h4>
                    <p className="text-xs text-gray-500 font-normal mt-0.5">
                      Selecciona cómo deseas recibir tu pedido
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    {/* Tarjeta A: Retiro en tienda (Mérida) */}
                    <div
                      onClick={() => setMetodoEntrega('retiro')}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left relative ${
                        metodoEntrega === 'retiro'
                          ? 'border-black ring-1 ring-black bg-white shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          metodoEntrega === 'retiro' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <Store size={20} strokeWidth={1.8} />
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          metodoEntrega === 'retiro' ? 'border-black bg-black text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {metodoEntrega === 'retiro' && <Check size={11} strokeWidth={3} />}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-[#111111] leading-snug">
                          Retiro en tienda (Mérida)
                        </h4>
                        <p className="text-xs text-gray-500 font-normal mt-1 leading-relaxed">
                          Retira personalmente en Moto Cristo y paga en tienda en efectivo o punto de venta.
                        </p>
                      </div>
                    </div>

                    {/* Tarjeta B: Envío a nivel nacional */}
                    <div
                      onClick={() => setMetodoEntrega('envio')}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left relative ${
                        metodoEntrega === 'envio'
                          ? 'border-black ring-1 ring-black bg-white shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          metodoEntrega === 'envio' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <Truck size={20} strokeWidth={1.8} />
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          metodoEntrega === 'envio' ? 'border-black bg-black text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {metodoEntrega === 'envio' && <Check size={11} strokeWidth={3} />}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-[#111111] leading-snug">
                          Envío a nivel nacional
                        </h4>
                        <p className="text-xs text-gray-500 font-normal mt-1 leading-relaxed">
                          MRW, Zoom, Domesa, Tealca
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen sutil */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div 
                      onClick={() => setIsOrderSummaryExpanded(!isOrderSummaryExpanded)}
                      className="flex items-center justify-between text-xs text-gray-600 font-normal px-2 py-1.5 rounded-lg hover:bg-gray-100/80 cursor-pointer select-none transition-colors border border-transparent hover:border-gray-200"
                      title="Toca para ver u ocultar los productos en la orden"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag size={13} className="text-gray-400" />
                        <span>{cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'producto' : 'productos'}</span>
                        <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${isOrderSummaryExpanded ? 'rotate-180 text-amber-600' : ''}`} />
                      </span>
                      <span className="font-mono">
                        Total: <strong className="text-[#FF5200] font-medium">${cartTotals.totalUSD.toFixed(2)} USD</strong> (≈ Bs. {formatVES(cartTotals.totalBS)})
                      </span>
                    </div>

                    {isOrderSummaryExpanded && (
                      <div className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/80 space-y-2 animate-fade-in text-xs">
                        <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                          {cart.filter((item) => item.quantity > 0).map((item, idx) => {
                            const imgUrl = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                            const formattedTitle = formatTitleCase(item.product.nombre);
                            const itemSubtotalUSD = (item.precio_unitario || item.product.precio_venta_ref || 0) * item.quantity;
                            const itemSubtotalBS = itemSubtotalUSD * tasaBCV;
                            return (
                              <div
                                key={`checkout-step0-summary-${item.product.id}-${idx}`}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-gray-200/80 shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-md bg-white border border-gray-200 overflow-hidden shrink-0">
                                    {imgUrl ? (
                                      <img src={imgUrl} alt={item.product.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">🏍️</div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#111111] text-[11px] truncate leading-tight">
                                      <span className="text-amber-600 font-semibold">{item.quantity}x</span> {formattedTitle}
                                    </p>
                                    {item.product.variante_nombre && (
                                      <span className="text-[10px] text-gray-500 block truncate">
                                        Opción: {formatTitleCase(item.product.variante_nombre)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 font-mono text-[11px]">
                                  <span className="font-medium text-[#111111] block">
                                    ${itemSubtotalUSD.toFixed(2)} USD
                                  </span>
                                  <span className="text-[9.5px] text-gray-400 block">
                                    Bs. {formatVES(itemSubtotalBS)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setOrderFormError(null);
                        setCheckoutStep(1);
                        if (metodoEntrega === 'retiro') {
                          const preferred = availablePaymentMethods.find(m => m.nombre.toLowerCase().includes('pago móvil') || m.nombre.toLowerCase().includes('pago movil'));
                          if (preferred) setMetodoPago(preferred.nombre);
                        }
                      }}
                      className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98 transition-all"
                    >
                      <span>Continuar</span>
                      <ArrowRight size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 1: DATOS PERSONALES Y ENCOMIENDA                    */}
              {/* ========================================================= */}
              {checkoutStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  {metodoEntrega === 'retiro' ? (
                    <>
                      {/* Cabecera para Retiro en tienda */}
                      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                        <User size={15} className="text-[#FF5200]" />
                        <h4 className="text-sm font-medium text-[#111111]">
                          Datos de quien retira en tienda
                        </h4>
                      </div>

                      {/* 2 Casillas principales: Nombre, Apellido y Teléfono */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* 1. NOMBRE Y APELLIDO */}
                        <div className="space-y-1">
                          <label className="text-xs font-normal text-gray-700 flex items-center gap-1">
                            <span>1. Nombre y apellido de quien retira *</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            placeholder="Ej: Carlos Rodriguez"
                            className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-lg text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400"
                          />
                        </div>

                        {/* 2. TELÉFONO / WHATSAPP */}
                        <div className="space-y-1">
                          <label className="text-xs font-normal text-gray-700 flex items-center gap-1.5">
                            <WhatsAppVectorIcon size={14} className="text-[#25D366] fill-current shrink-0" />
                            <span>2. Teléfono o WhatsApp de contacto *</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={clienteTelefono}
                            onChange={(e) => setClienteTelefono(e.target.value)}
                            placeholder="Ej: 0412-1234567"
                            className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-lg text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400 font-mono"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                        <User size={15} className="text-[#FF5722]" />
                        <h4 className="text-sm font-medium text-[#111111]">
                          Información personal y encomienda
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* 1. NOMBRE */}
                        <div className="space-y-1">
                          <label className="text-xs font-normal text-gray-700 flex items-center gap-1">
                            <span>1. Nombre completo *</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            placeholder="Ej: Carlos Rodriguez"
                            className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-lg text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400"
                          />
                        </div>

                        {/* 2. NÚMERO DE CÉDULA */}
                        <div className="space-y-1">
                          <label className="text-xs font-normal text-gray-700 flex items-center gap-1">
                            <span>2. Número de cédula (V / E) *</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={clienteCedula}
                            onChange={(e) => setClienteCedula(e.target.value)}
                            placeholder="Ej: V-19.456.789"
                            className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-lg text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400 font-mono"
                          />
                        </div>

                        {/* 3. TELÉFONO */}
                        <div className="space-y-1">
                          <label className="text-xs font-normal text-gray-700 flex items-center gap-1.5">
                            <WhatsAppVectorIcon size={14} className="text-[#25D366] fill-current shrink-0" />
                            <span>3. Teléfono / WhatsApp *</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={clienteTelefono}
                            onChange={(e) => setClienteTelefono(e.target.value)}
                            placeholder="Ej: 0412-1234567"
                            className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-lg text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400 font-mono"
                          />
                        </div>

                        {/* AGENCIA DE ENVÍO SELECTOR */}
                        <div className="space-y-1">
                          <label className="text-xs font-normal text-gray-700 flex items-center gap-1">
                            <span>Empresa de encomiendas</span>
                          </label>
                          <select
                            value={agenciaSeleccionada}
                            onChange={(e) => setAgenciaSeleccionada(e.target.value as any)}
                            className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-lg text-[#111111] text-xs font-normal outline-none cursor-pointer"
                          >
                            <option value="MRW">MRW</option>
                            <option value="Zoom">Zoom</option>
                            <option value="Tealca">Tealca</option>
                            <option value="Domesa">Domesa</option>
                            <option value="Otra">Otra agencia / entrega local</option>
                          </select>
                        </div>

                        {/* 4. DIRECCIÓN DE LA AGENCIA DE ENVÍO */}
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-normal text-gray-700 flex items-center gap-1">
                            <MapPin size={11} className="text-[#FF5722]" />
                            <span>4. Dirección de la agencia de envío *</span>
                          </label>
                          <textarea
                            required
                            rows={2}
                            value={direccionAgencia}
                            onChange={(e) => setDireccionAgencia(e.target.value)}
                            placeholder="Ej: Agencia MRW San Cristóbal Centro, Calle 5 con Carrera 8, Estado Táchira (Código: 1234)"
                            className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-lg text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Resumen sutil al final del formulario con acordeón interactivo */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div 
                      onClick={() => setIsOrderSummaryExpanded(!isOrderSummaryExpanded)}
                      className="flex items-center justify-between text-[11px] text-gray-600 font-normal px-2 py-1.5 rounded-lg hover:bg-gray-100/80 cursor-pointer select-none transition-colors border border-transparent hover:border-gray-200"
                      title="Toca para ver u ocultar los productos en la orden"
                    >
                      <span className="flex items-center gap-1.5 font-medium text-gray-700">
                        <ShoppingBag size={13} className="text-amber-500" />
                        <span>{cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'producto en orden' : 'productos en orden'}</span>
                        <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${isOrderSummaryExpanded ? 'rotate-180 text-amber-600' : ''}`} />
                      </span>
                      <span className="font-mono text-right">
                        Total: <strong className="text-[#FF5200] font-semibold">${cartTotals.totalUSD.toFixed(2)} USD</strong> <span className="text-gray-500 font-normal text-[10px]">(≈ Bs. {formatVES(cartTotals.totalBS)})</span>
                      </span>
                    </div>

                    {/* Acordeón desplegable de productos */}
                    {isOrderSummaryExpanded && (
                      <div className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/80 space-y-2 animate-fade-in text-xs">
                        <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                          {cart.filter((item) => item.quantity > 0).map((item, idx) => {
                            const imgUrl = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                            const formattedTitle = formatTitleCase(item.product.nombre);
                            const itemSubtotalUSD = (item.precio_unitario || item.product.precio_venta_ref || 0) * item.quantity;
                            const itemSubtotalBS = itemSubtotalUSD * tasaBCV;
                            return (
                              <div
                                key={`checkout-step1-summary-${item.product.id}-${idx}`}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-gray-200/80 shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-md bg-white border border-gray-200 overflow-hidden shrink-0">
                                    {imgUrl ? (
                                      <img src={imgUrl} alt={item.product.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">🏍️</div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#111111] text-[11px] truncate leading-tight">
                                      <span className="text-amber-600 font-semibold">{item.quantity}x</span> {formattedTitle}
                                    </p>
                                    {item.product.variante_nombre && (
                                      <span className="text-[10px] text-gray-500 block truncate">
                                        Opción: {formatTitleCase(item.product.variante_nombre)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 font-mono text-[11px]">
                                  <span className="font-medium text-[#111111] block">
                                    ${itemSubtotalUSD.toFixed(2)} USD
                                  </span>
                                  <span className="text-[9.5px] text-gray-400 block">
                                    Bs. {formatVES(itemSubtotalBS)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOrderFormError(null);
                          if (!clienteNombre.trim()) {
                            setOrderFormError(
                              metodoEntrega === 'retiro'
                                ? "Por favor ingresa el Nombre y Apellido de quien retira."
                                : "Por favor ingresa tu Nombre y Apellido."
                            );
                            return;
                          }
                          if (metodoEntrega === 'envio' && !clienteCedula.trim()) {
                            setOrderFormError("Por favor ingresa tu Número de Cédula.");
                            return;
                          }
                          if (!clienteTelefono.trim()) {
                            setOrderFormError(
                              metodoEntrega === 'retiro'
                                ? "Por favor ingresa tu Número de Teléfono o WhatsApp para apartar tu producto."
                                : "Por favor ingresa tu Número de Teléfono o WhatsApp."
                            );
                            return;
                          }
                          if (metodoEntrega === 'envio' && !direccionAgencia.trim()) {
                            setOrderFormError("Por favor ingresa la Dirección de la agencia de envío.");
                            return;
                          }
                          setCheckoutStep(2);
                        }}
                        className="w-full py-3.5 bg-[#000000] hover:bg-neutral-800 text-white font-medium text-xs sm:text-sm rounded-lg flex items-center justify-center shadow-md cursor-pointer active:scale-98 transition-all"
                      >
                        <span>Siguiente: Método de pago</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 2: PAGO Y CONFIRMACIÓN                               */}
              {/* ========================================================= */}
              {checkoutStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  {/* ========================================================= */}
                  {/* TARJETA 1: MÉTODOS DE PAGO                                */}
                  {/* ========================================================= */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between pb-0.5 flex-wrap gap-1">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                        <CreditCard size={13} className="text-[#FF5200]" />
                        <span>Métodos de pago</span>
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsPaymentMethodsModalOpen(true)}
                          className="text-[9.5px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium cursor-pointer transition-colors"
                        >
                          <Edit3 size={10} />
                          <span>Editar cuentas</span>
                        </button>
                      )}
                    </div>
                    <div className={`grid gap-1.5 sm:gap-2 ${availablePaymentMethods.length === 3 ? 'grid-cols-3' : (availablePaymentMethods.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}`}>
                      {availablePaymentMethods.map((method) => {
                        const isSel = metodoPago.toLowerCase() === method.nombre.toLowerCase();
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setMetodoPago(method.nombre)}
                            className={`py-2 px-1.5 sm:px-2.5 rounded-lg border text-center text-xs transition-all cursor-pointer truncate ${
                              isSel
                                ? 'bg-[#111111] text-white border-[#111111] font-medium shadow-xs'
                                : 'bg-white border-gray-200 text-gray-600 font-normal hover:bg-gray-50 hover:text-[#111111]'
                            }`}
                          >
                            {method.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* TARJETA 2: DATOS PARA TRANSFERIR O PAGO EN TIENDA         */}
                  {/* ========================================================= */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-sm">
                    {metodoPago.toLowerCase() === 'pago en tienda' ? (
                      <div className="text-center py-2 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                          <Store size={20} strokeWidth={1.8} />
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-[#111111]">Retiro en tienda física</h5>
                          <p className="text-xs text-gray-500 font-normal leading-relaxed max-w-sm mx-auto mt-1">
                            Paga en efectivo o punto de venta al retirar tus productos en Moto Cristo.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-800 flex items-center gap-1.5 pb-1 border-b border-gray-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5200]"></span>
                          <span>Datos para transferir ({formatTitleCase(selectedPaymentMethod?.nombre || metodoPago)}):</span>
                        </div>

                        {/* Montos consolidados con Lógica Condicional de Colores */}
                        {(() => {
                          const isBsPrimary = metodoPago.toLowerCase().includes('móvil') || 
                                              metodoPago.toLowerCase().includes('movil') || 
                                              metodoPago.toLowerCase().includes('transferencia');
                          return (
                            <div className="bg-gray-50/80 border border-gray-100 rounded-lg p-2.5 px-3 flex flex-row items-center justify-between gap-2 shadow-2xs">
                              <div className="min-w-0">
                                <span className="text-[11px] text-gray-500 font-normal block leading-tight">Monto a pagar:</span>
                                <div className={`font-mono text-base font-medium leading-tight mt-0.5 ${!isBsPrimary ? 'text-[#FF5200]' : 'text-gray-900'}`}>
                                  ${cartTotals.totalUSD.toFixed(2)} <span className="text-xs font-normal">USD</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[11px] text-gray-500 font-normal block leading-tight">
                                  En bolívares (Tasa BCV {formatVES(tasaBCV)}):
                                </span>
                                <div className="flex items-center justify-end mt-0.5">
                                  <span className={`font-mono text-base font-medium tracking-tight leading-tight ${isBsPrimary ? 'text-[#FF5200]' : 'text-gray-900'}`}>
                                    Bs. {formatVES(cartTotals.totalBS)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBankData(formatVES(cartTotals.totalBS), 'monto_bs')}
                                    className="text-[9.5px] bg-white hover:bg-gray-100 text-[#111111] border border-gray-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 cursor-pointer font-medium transition-all shadow-2xs active:scale-95 shrink-0 ml-2 sm:ml-2.5"
                                    title="Copiar monto exacto en Bolívares"
                                  >
                                    {copiedBankField === 'monto_bs' ? (
                                      <>
                                        <Check size={10} className="text-emerald-600 stroke-[3]" />
                                        <span className="text-emerald-700">¡Copiado!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={10} />
                                        <span>Copiar Bs</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Lista de Datos Bancarios con etiqueta compacta 'Cuenta:' y valores sin mayúsculas sostenidas */}
                        <div className="divide-y divide-gray-100 pt-0.5">
                          {selectedPaymentMethod && selectedPaymentMethod.campos && selectedPaymentMethod.campos.length > 0 ? (
                            selectedPaymentMethod.campos.map((campo, cIdx) => {
                              const cleanLabel = formatBankLabel(campo.etiqueta);
                              const cleanValue = formatBankValue(campo.valor);
                              return (
                                <div
                                  key={campo.id || `campo-${cIdx}`}
                                  className={`flex justify-between items-center gap-2 py-1.5 ${cIdx === 0 ? 'pt-0.5' : ''} ${cIdx === selectedPaymentMethod.campos.length - 1 ? 'pb-0.5' : ''}`}
                                >
                                  <span className="text-[#555555] text-xs shrink-0 font-normal">
                                    {cleanLabel}:
                                  </span>
                                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden justify-end">
                                    <span className="font-medium text-[#111111] font-mono truncate text-right text-xs" title={cleanValue}>
                                      {cleanValue}
                                    </span>
                                    {campo.copiable !== false && campo.valor && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyBankData(campo.valor, `field_${campo.id || cIdx}`)}
                                        className="text-[9.5px] bg-gray-50 hover:bg-gray-100 text-[#111111] px-1.5 py-0.5 rounded-md flex items-center gap-1 cursor-pointer shrink-0 font-medium border border-gray-200 active:scale-95 transition-all ml-1"
                                      >
                                        {copiedBankField === `field_${campo.id || cIdx}` ? (
                                          <Check size={10} className="text-emerald-600 stroke-[2.5]" />
                                        ) : (
                                          <Copy size={10} />
                                        )}
                                        <span>{copiedBankField === `field_${campo.id || cIdx}` ? 'Copiado' : 'Copiar'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-gray-500 py-1 text-center">
                              No hay datos registrados para este método.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* TARJETA 3: ADJUNTAR COMPROBANTE DE PAGO                   */}
                  {/* ========================================================= */}
                  {tipoConfirmacion === 'comprobante' && metodoPago.toLowerCase() !== 'pago en tienda' && (
                    <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-sm">
                      <label className="text-xs font-medium text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Receipt size={13} className="text-gray-700" />
                          <span>Adjuntar comprobante de pago *</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">Requerido</span>
                      </label>

                      {comprobanteUrl ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 px-3 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img
                              src={comprobanteUrl}
                              alt="Comprobante"
                              className="w-9 h-9 object-cover rounded-md border border-gray-200 shrink-0"
                            />
                            <div className="overflow-hidden min-w-0">
                              <span className="text-xs font-medium text-[#111111] block truncate leading-tight">
                                {comprobanteFileName || 'comprobante_pago.jpg'}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 font-medium leading-none mt-0.5">
                                <CheckCircle2 size={9} /> Listo
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setComprobanteUrl(null);
                              setComprobanteFileName(null);
                            }}
                            className="text-rose-600 hover:text-rose-700 text-[10px] font-medium py-1 px-2.5 rounded-md bg-rose-50 border border-rose-200 shrink-0 cursor-pointer transition-colors"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <label className="border border-dashed border-gray-300 hover:border-black bg-gray-50/70 hover:bg-gray-100/70 transition-all rounded-lg py-2.5 px-3 flex items-center justify-between cursor-pointer group shadow-2xs">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptFileChange}
                            className="hidden"
                            disabled={isUploadingReceipt}
                          />
                          {isUploadingReceipt ? (
                            <div className="flex items-center gap-2 text-xs text-gray-700 font-medium py-0.5 mx-auto">
                              <RotateCcw size={13} className="animate-spin text-black" />
                              <span>Optimizando comprobante...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-md bg-white border border-gray-200 text-[#111111] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-2xs">
                                  <Upload size={13} />
                                </div>
                                <span className="text-xs font-medium text-[#111111] truncate">
                                  Toca para subir captura o foto
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-normal shrink-0">
                                PNG / JPG
                              </span>
                            </div>
                          )}
                        </label>
                      )}
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* RESUMEN DE ORDEN (ACCORDION)                              */}
                  {/* ========================================================= */}
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden transition-all shadow-sm">
                    <div
                      onClick={() => setIsOrderSummaryExpanded(!isOrderSummaryExpanded)}
                      className="p-2 px-3 sm:p-2.5 sm:px-3.5 flex items-center justify-between text-[11px] gap-2 cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center -space-x-1 shrink-0">
                          {cart.filter((item) => item.quantity > 0).slice(0, 3).map((item, idx) => {
                            const imgUrl = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                            return (
                              <div
                                key={`summary-thumb-${item.product.id}-${idx}`}
                                className="w-5 h-5 rounded-md bg-white border border-gray-300 overflow-hidden shrink-0 shadow-xs"
                                title={`${item.product.nombre} (x${item.quantity})`}
                              >
                                {imgUrl ? (
                                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[7px] text-amber-500 font-bold">
                                    🛒
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {cart.filter((item) => item.quantity > 0).length > 3 && (
                            <span className="w-5 h-5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[8px] font-medium flex items-center justify-center shrink-0 z-10 shadow-xs">
                              +{cart.filter((item) => item.quantity > 0).length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 truncate text-[#555555] text-[10.5px] sm:text-[11px]">
                          <span className="font-semibold text-[#111111] font-mono shrink-0">{cartTotals.totalUnits} items</span>
                          <span className="text-gray-300">•</span>
                          <span className="truncate">
                            {metodoEntrega === 'retiro' ? (
                              <span>Retiro: <strong className="text-[#111111] font-medium">{clienteNombre || 'Cliente'}</strong> (Moto Cristo, Mérida)</span>
                            ) : (
                              <span>Envío: <strong className="text-[#111111] font-medium">{clienteNombre || 'Cliente'}</strong> ({agenciaSeleccionada})</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 transition-transform duration-200 shrink-0 ${
                        isOrderSummaryExpanded ? 'rotate-180 text-amber-600' : ''
                      }`}>
                        <ChevronDown size={12} />
                      </div>
                    </div>

                    {isOrderSummaryExpanded && (
                      <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-3 animate-fade-in text-xs">
                        <div className="space-y-1.5">
                          <span className="text-xs font-normal text-gray-600 block">
                            Productos en tu pedido ({cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'unidad' : 'unidades'}):
                          </span>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                            {cart.filter((item) => item.quantity > 0).map((item, idx) => {
                              const imgUrl = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                              return (
                                <div
                                  key={`expanded-item-${item.product.id}-${idx}`}
                                  className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white border border-gray-200"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0">
                                      {imgUrl ? (
                                        <img src={imgUrl} alt={item.product.nombre} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400">
                                          🛍️
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-medium text-[#111111] truncate leading-tight">
                                        {item.product.nombre}
                                      </p>
                                      <span className="text-[9.5px] text-[#555555]">
                                        Cant: <strong className="text-[#111111] font-mono font-medium">{item.quantity}</strong> × ${item.precio_unitario.toFixed(2)} USD
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-semibold text-[#111111] shrink-0">
                                    ${item.subtotal.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mini resumen: Solo muestra datos de envío si es envío nacional */}
                        <div className="pt-2 border-t border-gray-200 space-y-1 text-[10.5px]">
                          {metodoEntrega === 'retiro' ? (
                            <div className="bg-white p-2 rounded-xl border border-gray-200 flex items-center gap-2 text-[#555555]">
                              <Store size={14} className="text-gray-700 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-gray-400 block text-[9px] font-normal">Lugar de retiro:</span>
                                <span className="text-[#111111] font-medium text-xs">Moto Cristo — Mérida, Venezuela</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-normal text-gray-600 block">
                                Datos de envío registrados:
                              </span>
                              <div className="bg-white p-2 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#555555]">
                                <div>
                                  <span className="text-gray-400 block text-[9px] font-normal">Destinatario:</span>
                                  <span className="text-[#111111] font-medium">{clienteNombre || 'Sin nombre'} ({clienteCedula || 'Sin cédula'})</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block text-[9px] font-normal flex items-center gap-1">
                                    <WhatsAppVectorIcon size={12} className="text-[#25D366] fill-current shrink-0 inline" />
                                    <span>Teléfono / WhatsApp:</span>
                                  </span>
                                  <span className="text-[#111111] font-medium">{clienteTelefono || 'Sin teléfono'}</span>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-gray-400 block text-[9px] font-normal">Agencia y dirección:</span>
                                  <span className="text-[#111111] font-medium">{agenciaSeleccionada}: {direccionAgencia || 'Sin dirección especificada'}</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* RESUMEN DE QUIEN RETIRA Y PUNTO DE RETIRO (PASO FINAL)    */}
                  {/* ========================================================= */}
                  {metodoEntrega === 'retiro' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
                            <User size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate leading-tight">
                              Retira: {clienteNombre || 'Cliente'}
                            </p>
                            <p className="text-[11px] text-gray-500 font-mono truncate">
                              Tel: {clienteTelefono || 'Sin teléfono'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(1)}
                          className="text-[11px] text-amber-700 hover:text-amber-900 font-medium underline shrink-0 cursor-pointer"
                        >
                          Modificar
                        </button>
                      </div>

                      {/* Información secundaria de ubicación de retiro */}
                      <div className="flex items-start justify-between gap-2 pt-0.5 text-gray-600">
                        <div className="flex items-start gap-2 min-w-0">
                          <Store size={14} className="text-amber-700 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-[11px]">
                              Punto de retiro: Moto Cristo (Mérida)
                            </p>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Calle Kennedy, entre Campo de Oro y Santa Mónica.
                            </p>
                          </div>
                        </div>
                        <a
                          href="https://share.google/YdVNZ3c9PRzGRBsB4"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10.5px] text-amber-800 hover:text-amber-950 underline font-medium shrink-0 pt-0.5"
                        >
                          <span>Ver mapa</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* BOTÓN FINAL: APARTAR POR WHATSAPP O CONFIRMAR PAGO       */}
                  {/* ========================================================= */}
                  {metodoPago.toLowerCase() === 'pago en tienda' ? (
                    <div className="pt-1 space-y-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!clienteNombre.trim() || !clienteTelefono.trim()) {
                            setOrderFormError("Por favor ingresa tu Nombre y Teléfono en el paso anterior para apartar el producto.");
                            setCheckoutStep(1);
                            return;
                          }
                          handleSubmitOrder(e);
                        }}
                        disabled={isSubmittingOrder}
                        className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-98 transition-all text-white font-medium text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <WhatsAppVectorIcon size={18} className="text-white fill-current shrink-0" />
                        <span>Apartar por WhatsApp</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-0.5 space-y-1">
                      <button
                        type="submit"
                        disabled={isSubmittingOrder || isUploadingReceipt}
                        className="w-full py-2.5 sm:py-3.5 bg-[#000000] hover:bg-neutral-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
                      >
                        {isSubmittingOrder ? (
                          <RotateCcw size={15} className="animate-spin text-white" />
                        ) : (
                          <CheckCircle2 size={15} className="text-white" />
                        )}
                        <span>
                          {isSubmittingOrder
                            ? 'Procesando pedido...'
                            : 'Confirmar pago'}
                        </span>
                      </button>

                      {/* Vía de escape y aclaratorias debajo del botón */}
                      {tipoConfirmacion === 'comprobante' ? (
                        <div className="space-y-0.5 text-center pt-0.5">
                          <p className="text-xs text-gray-500 font-normal leading-tight px-1">
                            Al confirmar tu orden, se abrirá WhatsApp con el resumen de tu compra para confirmar cada detalle y responder cualquier consulta si lo deseas.
                          </p>

                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setTipoConfirmacion('whatsapp')}
                              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#111111] transition-colors cursor-pointer group py-0.5 px-2 rounded-md hover:bg-gray-100"
                            >
                              <WhatsAppVectorIcon size={14} className="text-[#128C7E] fill-current shrink-0 group-hover:scale-110 transition-transform" />
                              <span>
                                ¿Tienes problemas para pagar?{' '}
                                <span className="underline font-medium text-[#128C7E] group-hover:text-[#075E54]">
                                  Escríbenos al WhatsApp
                                </span>
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5 text-center pt-0.5">
                          <p className="text-xs text-gray-500 font-normal leading-tight px-1">
                            Presiona confirmar para realizar el pago y concretar tu pedido con un asesor.
                          </p>

                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setTipoConfirmacion('comprobante')}
                              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 transition-colors cursor-pointer group py-0.5 px-2 rounded-md hover:bg-gray-100"
                            >
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>
                                Prefiero realizar el pago directo y{' '}
                                <span className="underline font-medium text-emerald-700">
                                  subir comprobante
                                </span>
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMACIÓN: DATOS PARA APARTAR POR WHATSAPP     */}
      {/* ========================================================= */}
      {isPickupPromptOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPickupPromptOpen(false);
          }}
          className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-gray-200 rounded-3xl w-full max-w-sm p-5 sm:p-6 text-left space-y-4 shadow-2xl animate-scale-up text-[#111111] cursor-default"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <WhatsAppVectorIcon size={20} className="fill-current text-[#25D366]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#111111]">
                    ¿A quién le apartamos el pedido?
                  </h4>
                  <p className="text-[11px] text-gray-500 font-normal">
                    Ingresa tus 2 datos para confirmar y apartar en Moto Cristo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickupPromptOpen(false)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {orderFormError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-normal flex items-center gap-2 animate-shake">
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                  <span>{orderFormError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <User size={12} className="text-gray-500" />
                  <span>1. Nombre y Apellido *</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={clienteNombre}
                  onChange={(e) => {
                    setClienteNombre(e.target.value);
                    setOrderFormError(null);
                  }}
                  placeholder="Ej: Carlos Rodriguez"
                  className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-xl text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <WhatsAppVectorIcon size={12} className="text-[#25D366] fill-current shrink-0" />
                  <span>2. Número de Teléfono o WhatsApp *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={clienteTelefono}
                  onChange={(e) => {
                    setClienteTelefono(e.target.value);
                    setOrderFormError(null);
                  }}
                  placeholder="Ej: 0412-1234567"
                  className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2.5 rounded-xl text-[#111111] text-xs font-normal outline-none transition-all placeholder:text-gray-400 font-mono"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={(e) => {
                  if (!clienteNombre.trim()) {
                    setOrderFormError("Por favor ingresa tu Nombre y Apellido para saber a quién apartarle el producto.");
                    return;
                  }
                  if (!clienteTelefono.trim()) {
                    setOrderFormError("Por favor ingresa tu Número de Teléfono o WhatsApp.");
                    return;
                  }
                  setIsPickupPromptOpen(false);
                  handleSubmitOrder(e);
                }}
                disabled={isSubmittingOrder}
                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-98 transition-all text-white font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isSubmittingOrder ? (
                  <RotateCcw size={16} className="animate-spin text-white" />
                ) : (
                  <WhatsAppVectorIcon size={16} className="text-white fill-current shrink-0" />
                )}
                <span>Confirmar y apartar por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ORDER SUCCESS SCREEN                                      */}
      {/* ========================================================= */}
      {completedOrder && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompletedOrder(null);
          }}
          className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white border border-emerald-500/30 rounded-3xl w-full max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-5 sm:p-7 text-center space-y-5 shadow-2xl animate-scale-up my-auto custom-scrollbar text-[#111111] cursor-default"
          >
            {/* Botón X visible en la esquina superior derecha */}
            <button
              type="button"
              onClick={() => setCompletedOrder(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-xs z-10 shrink-0"
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
              completedOrder.tipo_confirmacion === 'comprobante_automatico'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              <CheckCircle2 size={28} />
            </div>

            <div className="space-y-1">
              <EditableStoreText
                textKey="orderSuccessTitle"
                value={getText('orderSuccessTitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="span"
                className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  completedOrder.tipo_confirmacion === 'comprobante_automatico'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              />
              <h3 className="font-medium text-2xl sm:text-3xl tracking-tight text-[#111111]">
                #{completedOrder.numero_pedido}
              </h3>
              <EditableStoreText
                textKey="orderSuccessSubtitle"
                value={getText('orderSuccessSubtitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="p"
                className="text-xs text-[#555555] font-normal"
              />
            </div>

            {/* Order Details Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              {completedOrder.cliente_nombre && completedOrder.cliente_nombre !== 'Cliente (Retiro en tienda)' && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-[#555555] font-normal">Cliente:</span>
                  <span className="font-medium text-[#111111]">{completedOrder.cliente_nombre}</span>
                </div>
              )}
              {completedOrder.cliente_cedula && completedOrder.cliente_cedula !== 'N/A' && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-[#555555] font-normal">Cédula:</span>
                  <span className="font-medium font-mono text-[#111111]">{completedOrder.cliente_cedula}</span>
                </div>
              )}
              {completedOrder.cliente_telefono && completedOrder.cliente_telefono !== 'N/A' && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-[#555555] font-normal">Teléfono:</span>
                  <span className="font-medium font-mono text-[#111111]">{completedOrder.cliente_telefono}</span>
                </div>
              )}
              <div className="border-b border-gray-200 pb-2">
                <span className="text-[#555555] font-normal block mb-0.5">
                  {completedOrder.metodo_entrega === 'retiro' || completedOrder.direccion_agencia_envio?.includes('Retiro en tienda')
                    ? 'Método de entrega:'
                    : 'Agencia de envío:'}
                </span>
                {completedOrder.metodo_entrega === 'retiro' || completedOrder.direccion_agencia_envio?.includes('Retiro en tienda') ? (
                  <div className="space-y-1 mt-0.5">
                    <span className="font-medium text-[#111111] text-[11px] block">
                      Retiro en tienda (Mérida) - Moto Cristo
                    </span>
                    <p className="text-[11px] text-[#555555] font-normal leading-snug">
                      Calle Kennedy, entre Campo de Oro y Santa Mónica.
                    </p>
                    <div className="pt-1">
                      <a
                        href="https://share.google/YdVNZ3c9PRzGRBsB4"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <span>📍 Ver ubicación en Google Maps</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <span className="font-medium text-[#111111] text-[11px] block">
                    {completedOrder.direccion_agencia_envio}
                  </span>
                )}
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[#555555] font-normal">Método de pago:</span>
                <span className="font-medium text-[#111111]">{completedOrder.metodo_pago}</span>
              </div>
              {completedOrder.referencia_pago && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-[#555555] font-normal">N° Referencia:</span>
                  <span className="font-medium font-mono text-emerald-700">{completedOrder.referencia_pago}</span>
                </div>
              )}
              {completedOrder.comprobante_url && (
                <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
                  <span className="text-[#555555] font-normal">Comprobante adjunto:</span>
                  <span className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Recibido en sistema
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-gray-700 font-normal">Total del pedido:</span>
                <span className="font-mono text-base font-semibold text-emerald-700">
                  ${completedOrder.totalUSD.toFixed(2)} USD <span className="text-xs font-normal text-gray-500">(Bs. {formatVES(completedOrder.totalBS)})</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSendToWhatsApp(completedOrder)}
                className="w-full py-3.5 font-medium text-sm sm:text-base rounded-lg flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all bg-[#25D366] hover:bg-[#20ba5a] text-white border border-[#25D366]"
              >
                <img src="/whatsapp.png" alt="WhatsApp" className="w-5 h-5 object-contain shrink-0 drop-shadow-xs" />
                <span>
                  {completedOrder.metodo_pago?.toLowerCase() === 'pago en tienda'
                    ? 'Apartar por WhatsApp'
                    : 'Ir a WhatsApp y notificar pedido'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#111111] text-xs font-medium rounded-lg transition-all cursor-pointer"
              >
                Seguir comprando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* QUICK VIEW PRODUCT MODAL (CON SOPORTE DE VARIANTES)        */}
      {/* ========================================================= */}
      {quickViewProduct && (() => {
        const activeQV = quickViewActiveVariant || quickViewProduct;
        const hasValidGroup = isValidGroupId(activeQV.grupo_id);
        // Obtener el item del catálogo correspondiente para reutilizar la lista unificada de variantes y kit
        const parentCatalogItem = hasValidGroup 
          ? catalogItems.find(it => it.groupId === activeQV.grupo_id || it.id === activeQV.grupo_id)
          : null;

        const qvVariants: Producto[] = (parentCatalogItem 
          ? parentCatalogItem.variants 
          : (hasValidGroup 
              ? sourceProducts.filter(p => isValidGroupId(p.grupo_id) && p.grupo_id === activeQV.grupo_id && (Number(p.stock_disponible) || 0) > 0).sort((a, b) => {
                  if (a.es_principal_grupo && !b.es_principal_grupo) return -1;
                  if (!a.es_principal_grupo && b.es_principal_grupo) return 1;
                  return (a.variante_nombre || a.nombre).localeCompare(b.variante_nombre || b.nombre);
                })
              : [activeQV])
        ).filter(v => (Number(v.stock_disponible) || 0) > 0);

        const qvImages = getItemImages(
          parentCatalogItem || {
            isGroup: hasValidGroup,
            coverProduct: quickViewProduct,
            coverImage: parentCatalogItem?.coverImage,
            variants: qvVariants.length > 0 ? qvVariants : [activeQV],
            hasKit: Boolean(activeQV.grupo_tiene_kit),
            kitImage: activeQV.grupo_kit_imagen
          },
          activeQV,
          !quickViewUserSelectedVariant && Boolean(parentCatalogItem?.coverImage)
        );
        const qvPriceUSD = activeQV.precio_venta_ref || activeQV.precio_mayor || 0;
        const qvPriceBS = qvPriceUSD * tasaBCV;
        const qvInStock = (activeQV.stock_disponible || 0) > 0;

        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeQuickView();
              }
            }}
            className="fixed inset-0 z-[99999] bg-black/60 md:flex md:items-center md:justify-center p-0 md:p-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-hidden transition-all duration-200"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.60)' }}
          >
            {/* Modal Box: Full-screen en Móvil (w-full h-full rounded-none), diálogo flotante elegante en Desktop (md:max-w-3xl md:h-auto md:max-h-[calc(100dvh-2.5rem)] md:rounded-3xl) */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white w-full h-[100dvh] md:h-auto md:max-h-[calc(100dvh-2.5rem)] md:max-w-3xl rounded-none md:rounded-3xl md:border md:border-gray-200 flex flex-col md:flex-row overflow-hidden shadow-2xl animate-scale-up text-[#111111] cursor-default"
            >
              {/* Botones de Cabecera Exclusivos para Desktop (Compartir y Cerrar - Carrito en Desktop exclusivamente en Header principal) */}
              <div className="hidden md:flex absolute top-4 right-4 z-30 items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleShareProduct(activeQV)}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-xs shrink-0"
                  title="Compartir enlace directo del producto"
                  aria-label="Compartir producto"
                >
                  {copiedShareLink ? (
                    <Check size={16} className="text-emerald-600 stroke-[2.5] animate-scale-up" />
                  ) : (
                    <Share2 size={16} strokeWidth={2.2} className="text-gray-700 hover:text-black transition-colors" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-xs shrink-0"
                  title="Cerrar ventana"
                  aria-label="Cerrar ventana"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* BARRA SUPERIOR FIJA EXCLUSIVA MÓVIL (HEADER DEL PRODUCTO TIPO SHEIN) */}
              <header className="md:hidden sticky top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 py-1.5 flex items-center justify-between shrink-0 h-11">
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="p-1 -ml-1 text-gray-800 hover:text-black rounded-full active:scale-90 transition-transform cursor-pointer flex items-center justify-center shrink-0"
                  aria-label="Volver al catálogo"
                >
                  <ArrowLeft size={19} strokeWidth={2.2} />
                </button>

                <div className="flex-1 px-3 text-center min-w-0">
                  <span className="text-xs font-medium text-gray-800 truncate block whitespace-nowrap">
                    {formatTitleCase(activeQV.grupo_nombre || activeQV.nombre)}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleShareProduct(activeQV)}
                    className="p-1 text-gray-800 hover:text-black rounded-full transition-all cursor-pointer flex items-center justify-center active:scale-90 shrink-0"
                    title="Compartir enlace directo del producto"
                    aria-label="Compartir enlace directo del producto"
                  >
                    {copiedShareLink ? (
                      <Check size={18} className="text-emerald-600 stroke-[2.5] animate-scale-up" />
                    ) : (
                      <Share2 size={18} strokeWidth={2.2} className="text-gray-800 hover:text-black transition-colors" />
                    )}
                  </button>

                  <button
                    id="modal-cart-button"
                    type="button"
                    onClick={() => {
                      closeQuickView();
                      setAddedHeaderDropdown(null);
                      setIsCartOpen(true);
                    }}
                    className={`relative p-1 text-gray-800 hover:text-black rounded-full transition-all cursor-pointer flex items-center justify-center active:scale-90 shrink-0 ${
                      isCartBouncing ? 'scale-125 text-emerald-500 rotate-6' : ''
                    }`}
                    aria-label={`Ver carrito con ${cartTotals.totalUnits} artículos`}
                  >
                    <ShoppingCart size={18} className={`stroke-[2.2] transition-colors ${isCartBouncing ? 'text-emerald-500' : 'text-gray-800'}`} />
                    {cartTotals.totalUnits > 0 && (
                      <span className={`absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white text-[8.5px] font-black flex items-center justify-center border border-white ${isCartBouncing ? 'animate-bounce scale-110' : 'animate-scale-up'}`}>
                        {cartTotals.totalUnits}
                      </span>
                    )}
                  </button>
                </div>
              </header>

              {/* ÁREA DE SCROLL CENTRAL (MÓVIL Y DESKTOP) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row w-full pb-2 md:pb-0">
                {/* Columna Izquierda / Imagen: En móvil altura fija uniforme h-[45vh] max-h-80 para Zero CLS */}
                <div id="quickview-main-image" className="w-full md:w-1/2 bg-white px-0 mx-0 p-0 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 shrink-0 h-[45vh] max-h-80 md:h-auto md:max-h-none overflow-hidden">
                  <StoreImageCarousel
                    images={qvImages}
                    currentIndex={quickViewImageIndex}
                    onIndexChange={setQuickViewImageIndex}
                    onImageClick={() => {
                      setLightboxImageIndex(quickViewImageIndex);
                      setIsLightboxOpen(true);
                    }}
                    altText={activeQV.nombre}
                    containerClassName="w-full h-full flex flex-col bg-white"
                    className="flex-1 min-h-0 w-full bg-white rounded-none md:rounded-xl md:h-84 md:max-h-none cursor-pointer"
                    imageClassName="object-contain w-full h-full cursor-pointer"
                    showThumbnails={true}
                  />
                </div>

                {/* Columna Derecha / Información y Selector Visual de Variantes */}
                <div className="w-full md:w-1/2 p-3 sm:p-4 md:p-6 flex flex-col justify-between space-y-2 md:space-y-4 md:pr-10 lg:pr-12 md:min-h-[480px]">
                  {/* Bloque Superior Informativo: Título, Precios, Stock, Descripción */}
                  <div className="space-y-1.5 sm:space-y-2 md:space-y-3 md:pr-24">
                    {/* Título Principal */}
                    <h3 className="font-medium text-base sm:text-lg md:text-2xl tracking-tight text-[#111111] leading-tight">
                      {formatTitleCase(activeQV.grupo_nombre || activeQV.nombre)}
                    </h3>

                    {/* Precios: fuente limpia mono en Naranja #FF5200 y Tasa BCV agrupados */}
                    <div className="pt-0 font-mono">
                      <div className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#FF5200] tracking-tight leading-none">
                        ${qvPriceUSD.toFixed(2)} USD
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-normal mt-0.5 leading-none">
                        ≈ Bs. {formatVES(qvPriceBS)} <span className="text-gray-400 font-normal text-[11px] sm:text-xs">(Tasa BCV: {formatVES(tasaBCV)})</span>
                      </p>
                    </div>

                    {/* Stock info con urgencia inteligente */}
                    {activeQV.stock_disponible > 0 && activeQV.stock_disponible <= 5 && (
                      <div className="pt-0.5">
                        <span className="text-[10px] sm:text-[11px] font-normal text-[#FF5722] flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md inline-flex">
                          <span className="animate-pulse">⏳</span>
                          <span>Casi agotado, quedan solo {activeQV.stock_disponible}</span>
                        </span>
                      </div>
                    )}

                    {/* Descripción del producto (solo si existe en la base de datos, sin textos ni espacios de relleno) */}
                    {Boolean(((activeQV as any).descripcion || activeQV.palabras_clave || activeQV.notas)?.trim()) && (
                      <p className="text-[11px] sm:text-xs text-gray-600 font-normal leading-snug line-clamp-2 sm:line-clamp-3 pt-0.5">
                        {((activeQV as any).descripcion || activeQV.palabras_clave || activeQV.notas || '').trim()}
                      </p>
                    )}
                  </div>

                  {/* Zona interactiva: Variantes y Selector de Cantidad */}
                  <div className="space-y-2 sm:space-y-2.5 md:space-y-3.5 pt-1 sm:pt-2">
                    {/* Selector de Modelo/Variantes */}
                    {qvVariants.length > 1 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs min-w-0 overflow-hidden whitespace-nowrap gap-2">
                          <div className="flex items-center min-w-0 overflow-hidden whitespace-nowrap">
                            <span className="text-gray-600 font-normal flex items-center gap-1 shrink-0">
                              <Boxes size={11} className="text-amber-500 shrink-0" />
                              <span>{quickViewUserSelectedVariant ? 'Modelo:' : 'Opciones:'}</span>
                            </span>
                            <strong 
                              className="text-gray-900 font-medium truncate ml-1 min-w-0"
                              title={quickViewUserSelectedVariant ? formatTitleCase(activeQV.variante_nombre || activeQV.nombre) : 'Portada (Elige un modelo)'}
                            >
                              {quickViewUserSelectedVariant ? formatTitleCase(activeQV.variante_nombre || activeQV.nombre) : 'Portada (Elige un modelo)'}
                            </strong>
                          </div>

                          {effectiveAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setVariantsModalInitialGroupId(hasValidGroup ? activeQV.grupo_id : null);
                                setIsVariantsModalOpen(true);
                              }}
                              className="text-[9px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium cursor-pointer transition-colors shrink-0"
                              title="Gestionar variantes de este grupo o desvincular productos"
                            >
                              <Boxes size={10} className="text-[#FF5200]" />
                              <span>Gestionar</span>
                            </button>
                          )}
                        </div>

                        {/* Miniaturas de variantes para QuickView */}
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 custom-scrollbar">
                          {qvVariants.map((v) => {
                            const isSelected = quickViewUserSelectedVariant && activeQV.id === v.id;
                            const rawThumb = v.es_kit 
                              ? (v.grupo_kit_imagen || parentCatalogItem?.kitImage || v.variante_imagen_miniatura || v.imagen_portada || v.link || v.imagen_url)
                              : (v.variante_imagen_miniatura || v.imagen_portada || v.link || v.imagen_url);
                            const vImg = rawThumb ? formatDirectImageUrl(rawThumb) : '';
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  setQuickViewUserSelectedVariant(true);
                                  setQuickViewActiveVariant(v);
                                  setQuickViewImageIndex(0);
                                  setQuickViewQty(1);
                                  try {
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('p', v.id);
                                    window.history.replaceState({ productId: v.id }, '', url.toString());
                                  } catch {}
                                }}
                                className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer relative bg-gray-50 flex items-center justify-center ${
                                  isSelected
                                    ? 'border-[#FF5200] ring-1 ring-[#FF5200]/40 scale-105 shadow-2xs z-10'
                                    : 'border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-400'
                                }`}
                                title={v.variante_nombre || (v.es_kit ? 'Kit' : v.nombre)}
                              >
                                {vImg ? (
                                  <img
                                    src={vImg}
                                    alt={v.variante_nombre || v.nombre}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                                    }}
                                  />
                                ) : (
                                  <span className="text-[7.5px] font-medium text-gray-500 text-center p-0.5 truncate leading-none">
                                    {v.es_kit ? 'Kit' : (v.variante_nombre || v.nombre).slice(0, 4)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selector de Cantidad */}
                    {qvInStock && (
                      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5">
                        <span className="text-xs font-normal text-gray-600">Cantidad:</span>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickViewQty((prev) => Math.max(1, prev - 1))}
                            disabled={quickViewQty <= 1}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-[#111111] font-medium flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-mono font-medium text-[#111111] text-xs sm:text-sm w-6 sm:w-7 text-center">
                            {quickViewQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuickViewQty((prev) => Math.min(activeQV.stock_disponible || 99, prev + 1))}
                            disabled={quickViewQty >= (activeQV.stock_disponible || 99)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-[#111111] font-medium flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* BOTÓN EN DESKTOP (Integrado al pie de la columna derecha) */}
                    <div className="hidden md:block pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          handleAddToCart(
                            activeQV, 
                            quickViewQty, 
                            document.getElementById('quickview-main-image') || (e.currentTarget as HTMLElement)
                          );
                          setQuickViewAdded(true);
                          setTimeout(() => setQuickViewAdded(false), 2000);
                        }}
                        disabled={!qvInStock}
                        className={`w-full py-3.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 ${
                          quickViewAdded
                            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                            : 'bg-[#000000] hover:bg-neutral-800 text-white shadow-black/20 disabled:opacity-30'
                        }`}
                      >
                        {quickViewAdded ? (
                          <>
                            <Check size={16} className="stroke-[3]" />
                            <span>¡Agregado al carrito ({quickViewQty})!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} />
                            <span>Agregar al carrito</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* BARRA INFERIOR DE ACCIÓN FIJA (STICKY BOTTOM BAR EXCLUSIVA MÓVIL TIPO SHEIN) */}
              <div 
                className="md:hidden sticky bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-3 py-2 pb-[max(10px,calc(env(safe-area-inset-bottom)+6px))] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] shrink-0"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    handleAddToCart(
                      activeQV, 
                      quickViewQty, 
                      document.getElementById('quickview-main-image') || (e.currentTarget as HTMLElement)
                    );
                    setQuickViewAdded(true);
                    setTimeout(() => setQuickViewAdded(false), 2000);
                  }}
                  disabled={!qvInStock}
                  className={`w-full py-2.5 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-98 ${
                    quickViewAdded
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : 'bg-[#000000] hover:bg-neutral-800 text-white shadow-black/20 disabled:opacity-30'
                  }`}
                >
                  {quickViewAdded ? (
                    <>
                      <Check size={16} className="stroke-[3]" />
                      <span>¡Agregado al carrito ({quickViewQty})!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} />
                      <span>Agregar al carrito</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* MODAL DE PANTALLA COMPLETA (LIGHTBOX)                     */}
            {/* ========================================================= */}
            {isLightboxOpen && qvImages.length > 0 && (() => {
              const currentLbIndex = ((lightboxImageIndex % qvImages.length) + qvImages.length) % qvImages.length;
              const currentLbImage = qvImages[currentLbIndex];

              const handleLbPrev = (e?: React.MouseEvent) => {
                e?.stopPropagation();
                if (qvImages.length <= 1) return;
                const nextIdx = (currentLbIndex - 1 + qvImages.length) % qvImages.length;
                setLightboxImageIndex(nextIdx);
                setQuickViewImageIndex(nextIdx);
              };

              const handleLbNext = (e?: React.MouseEvent) => {
                e?.stopPropagation();
                if (qvImages.length <= 1) return;
                const nextIdx = (currentLbIndex + 1) % qvImages.length;
                setLightboxImageIndex(nextIdx);
                setQuickViewImageIndex(nextIdx);
              };

              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.target === e.currentTarget) {
                      setIsLightboxOpen(false);
                    }
                  }}
                  className="fixed inset-0 z-[100000] bg-black/95 flex items-center justify-center p-2 select-none touch-none backdrop-blur-sm animate-fade-in"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Visor de imagen a pantalla completa"
                >
                  {/* Botón de Cierre ('X' blanco y grande en la esquina superior derecha) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(false);
                    }}
                    aria-label="Cerrar visor de pantalla completa"
                    className="absolute top-4 right-4 z-[100002] w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 border border-white/20 shadow-xl"
                  >
                    <X size={28} strokeWidth={2.5} className="text-white" />
                  </button>

                  {/* Contador de fotos (ej: 1 / 4) y título de variante */}
                  <div className="absolute top-4 left-4 z-[100002] flex items-center gap-2 pointer-events-none">
                    <span className="px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-white text-xs sm:text-sm font-mono font-medium backdrop-blur-md shadow-md">
                      {currentLbIndex + 1} / {qvImages.length}
                    </span>
                    {activeQV.variante_nombre && (
                      <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-white/80 text-xs font-normal backdrop-blur-md truncate max-w-xs">
                        {activeQV.variante_nombre}
                      </span>
                    )}
                  </div>

                  {/* Flechas Laterales de Navegación (Solo si hay múltiples imágenes) */}
                  {qvImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handleLbPrev}
                        aria-label="Foto anterior"
                        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[100002] w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 border border-white/20 shadow-xl"
                      >
                        <ChevronLeft size={28} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={handleLbNext}
                        aria-label="Siguiente foto"
                        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[100002] w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 border border-white/20 shadow-xl"
                      >
                        <ChevronRight size={28} strokeWidth={2.5} />
                      </button>
                    </>
                  )}

                  {/* Contenedor de la Imagen con Detección de Toques Fuera y Swipe */}
                  <div 
                    className="w-full h-full flex items-center justify-center p-2 sm:p-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.target === e.currentTarget) {
                        setIsLightboxOpen(false);
                      }
                    }}
                    onTouchStart={(e) => setLightboxTouchStartX(e.targetTouches[0].clientX)}
                    onTouchMove={(e) => setLightboxTouchEndX(e.targetTouches[0].clientX)}
                    onTouchEnd={() => {
                      if (lightboxTouchStartX === null || lightboxTouchEndX === null) return;
                      const diff = lightboxTouchStartX - lightboxTouchEndX;
                      if (diff > 40) {
                        handleLbNext();
                      } else if (diff < -40) {
                        handleLbPrev();
                      }
                      setLightboxTouchStartX(null);
                      setLightboxTouchEndX(null);
                    }}
                  >
                    <img
                      src={currentLbImage}
                      alt={activeQV.nombre}
                      className="w-full h-full object-contain pointer-events-auto max-h-[92vh] max-w-[95vw] transition-transform duration-300 select-none"
                      draggable={false}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Miniaturas en carrusel inferior (si hay más de 1 imagen) */}
                  {qvImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100002] flex items-center gap-2 max-w-[90vw] overflow-x-auto p-1.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md custom-scrollbar">
                      {qvImages.map((img, idx) => (
                        <button
                          key={`lb-thumb-${idx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImageIndex(idx);
                            setQuickViewImageIndex(idx);
                          }}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border transition-all cursor-pointer shrink-0 ${
                            idx === currentLbIndex 
                              ? 'border-[#FF5200] ring-2 ring-[#FF5200] scale-105 opacity-100' 
                              : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/50'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* STORE FOOTER (Anclaje de Marca en #0F1115)                 */}
      {/* ========================================================= */}
      <footer className="bg-[#0F1115] border-t border-gray-800 py-10 px-4 sm:px-6 text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <h4 className="font-medium text-lg tracking-tight text-[#FFC107]">
              Lo que los bikers quieren
            </h4>
            <div className="mt-0.5">
              <EditableStoreText
                textKey="footerTagline"
                value={getText('footerTagline')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="p"
                className="text-[11px] text-gray-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-[11px] font-medium">
            <span className="text-gray-300">Envíos: MRW • Zoom • Tealca • Domesa</span>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <span className="text-emerald-400">Tasa BCV Oficial Garantizada</span>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <a
              href={getWhatsAppDirectUrl('Hola! Deseo hacer una consulta en la tienda online')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#25D366] hover:text-[#20ba5a] transition-colors"
              title={`Atención directa por WhatsApp (${STORE_WHATSAPP_DISPLAY})`}
            >
              <img src="/whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain shrink-0" />
              <span>Atención WhatsApp</span>
            </a>
          </div>
        </div>
      </footer>


      {/* Modal para configurar categorías visibles en la tienda online */}
      <StoreCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        products={products}
        hiddenCategories={hiddenCategories}
        onUpdateHiddenCategories={handleUpdateHiddenCategories}
      />

      {/* Modal para editar todos los textos fijos de la tienda (Admin) */}
      <StoreTextEditorModal
        isOpen={isTextEditorOpen}
        onClose={() => setIsTextEditorOpen(false)}
        customTexts={customTexts}
        onSaveTexts={handleSaveCustomTexts}
        initialFocusKey={textEditorInitialKey}
      />

      {/* Modal para configurar y editar métodos y cuentas de pago (Admin) */}
      <PaymentMethodsEditorModal
        isOpen={isPaymentMethodsModalOpen}
        onClose={() => setIsPaymentMethodsModalOpen(false)}
        methods={paymentMethods}
        onSaveMethods={handleSavePaymentMethods}
      />

      {/* Modal para supervisar y gestionar variantes y grupos (Admin) */}
      <ProductVariantsModal
        isOpen={isVariantsModalOpen}
        onClose={() => setIsVariantsModalOpen(false)}
        products={sourceProducts}
        initialGroupId={variantsModalInitialGroupId}
      />

      {/* TARJETA DE CONFIRMACIÓN (MINI-CART DROPDOWN) EN PRIMER PLANO ABSOLUTO Z-[100000] */}
      {addedHeaderDropdown && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed z-[100000] w-72 sm:w-80 bg-[#111111] text-white border border-neutral-700/80 rounded-2xl p-3 shadow-2xl transition-all duration-300 ease-out pointer-events-auto ${
            isDropdownClosing 
              ? '-translate-y-3 opacity-0 pointer-events-none' 
              : 'translate-y-0 opacity-100'
          }`}
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right,
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.12)'
          }}
        >
          {/* Flechita superior apuntando al ícono del carrito */}
          <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[#111111] border-l border-t border-neutral-700/80 rotate-45" />

          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10.5px] font-medium text-emerald-400">
                Nuevo producto agregado
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              {cartTotals.totalUnits} en carrito
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center">
              {addedHeaderDropdown.imageUrl ? (
                <img
                  src={formatDirectImageUrl(addedHeaderDropdown.imageUrl)}
                  alt={addedHeaderDropdown.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingCart size={16} className="text-neutral-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-medium text-gray-100 truncate leading-snug">
                {addedHeaderDropdown.productName}
              </h4>
              <div className="flex items-baseline gap-1 mt-0.5 font-mono">
                <span className="text-xs font-semibold text-[#FF5200]">
                  ${addedHeaderDropdown.priceUSD.toFixed(2)} USD
                </span>
                {addedHeaderDropdown.quantity > 1 && (
                  <span className="text-[10px] text-gray-400 font-sans">
                    × {addedHeaderDropdown.quantity}
                  </span>
                )}
              </div>
              <div className="text-[9.5px] font-normal text-gray-400 font-mono">
                ≈ Bs. {formatVES(addedHeaderDropdown.priceBS)}
              </div>
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setAddedHeaderDropdown(null);
                closeQuickView();
                setIsCartOpen(true);
              }}
              className="flex-1 py-1.5 px-2 bg-white hover:bg-gray-100 text-[#111111] text-xs font-medium rounded-lg transition-colors text-center cursor-pointer shadow-xs"
            >
              Ver carrito
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDropdownClosing(true);
                setTimeout(() => setAddedHeaderDropdown(null), 250);
              }}
              className="px-2 py-1.5 text-gray-400 hover:text-white text-[10px] font-medium cursor-pointer transition-colors"
            >
              Cerrar
            </button>
          </div>
        </aside>
      )}

      {/* Elemento Clon Volador Fly-to-Cart (Feedback Espacial hacia el Header o Modal) */}
      {flyingItem && (
        <div
          key={flyingItem.id}
          className="fixed pointer-events-none z-[100001] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/90 bg-white"
          style={{
            width: 68,
            height: 68,
            left: flyingItem.startX - 34,
            top: flyingItem.startY - 34,
            transform: flyingItem.isFlying
              ? `translate3d(${flyingItem.targetX - flyingItem.startX}px, ${flyingItem.targetY - flyingItem.startY}px, 0) scale(0.2) rotate(16deg)`
              : 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
            opacity: flyingItem.isFlying ? 0.35 : 1,
            transition: 'transform 0.62s cubic-bezier(0.2, 0.8, 0.25, 1), opacity 0.62s cubic-bezier(0.4, 0, 1, 1)',
            boxShadow: flyingItem.isFlying
              ? '0 4px 12px rgba(0,0,0,0.35)'
              : '0 20px 40px rgba(0,0,0,0.5)'
          }}
        >
          {flyingItem.imageUrl ? (
            <img
              src={flyingItem.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#111111] text-[#FF5200] flex items-center justify-center font-bold">
              <ShoppingCart size={26} />
            </div>
          )}
        </div>
      )}

      {/* Toast flotante de "Enlace copiado" */}
      {showShareToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100002] bg-[#111111] text-white text-xs py-2 px-3.5 rounded-full shadow-2xl flex items-center gap-2 animate-scale-up pointer-events-none border border-neutral-700/80"
        >
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check size={11} strokeWidth={3} />
          </div>
          <span className="font-medium text-white tracking-tight">Enlace copiado</span>
        </aside>
      )}

      {/* Toast flotante de Carrito Compartido / Link de Pago Directo */}
      {sharedCartToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100003] max-w-md w-[92%] sm:w-auto bg-[#111111] text-white text-xs py-2.5 px-4 rounded-full shadow-2xl flex items-center justify-between gap-3 animate-scale-up border border-emerald-500/50 backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="font-medium text-neutral-100 text-xs leading-snug">
              {sharedCartToast.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSharedCartToast(null)}
            className="text-neutral-400 hover:text-white p-1 ml-1 cursor-pointer shrink-0"
            title="Cerrar notificación"
          >
            <X size={13} />
          </button>
        </aside>
      )}
    </div>
  );
};
