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
  MessageCircle
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
import { StoreCategoriesModal } from './StoreCategoriesModal';
import { StoreTextEditorModal, DEFAULT_STORE_TEXTS } from './StoreTextEditorModal';
import { EditableStoreText } from './EditableStoreText';
import { PaymentMethodsEditorModal } from './PaymentMethodsEditorModal';
import { DEFAULT_PAYMENT_METHODS } from '../constants/defaultPaymentMethods';
import { fetchTasaOficialBCV, getCachedTasaBCV, DEFAULT_TASA_FALLBACK } from '../lib/tasaService';

/**
 * Formatea un texto a formato "Title Case" o "Sentence Case" para títulos limpios y minimalistas
 */
const formatTitleCase = (text?: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
  className?: string;
  showThumbnails?: boolean;
}

export const StoreImageCarousel: React.FC<StoreImageCarouselProps> = ({
  images,
  currentIndex,
  onIndexChange,
  altText,
  onOpenDetail,
  className = "h-32 sm:h-36 md:h-40 max-h-40 w-full",
  showThumbnails = true,
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
    <div className="w-full flex flex-col space-y-1 select-none">
      {/* Contenedor Principal de la Imagen */}
      <div
        onClick={onOpenDetail}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full ${className} bg-[#FAFAFA] rounded-lg overflow-hidden flex items-center justify-center cursor-pointer group/img transition-transform`}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={altText}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Package size={28} />
            <span className="text-[8.5px] font-bold uppercase">Sin foto</span>
          </div>
        )}

        {/* Indicador flotante Ver Detalle al pasar el cursor */}
        {onOpenDetail && (
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="px-2.5 py-1 bg-[#111111]/90 text-white rounded-md text-[8.5px] font-bold uppercase flex items-center gap-1 shadow-sm">
              <Eye size={11} className="text-[#FFC107]" /> Ver Detalle
            </span>
          </div>
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

      {/* Mini-Carrusel de Galería (SOLO para fotos extra de la misma variante, OCULTO si solo tiene 1 foto) */}
      {showThumbnails && validImages.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 px-0.5 custom-scrollbar">
          {validImages.map((thumbUrl, tIdx) => {
            const isSelectedThumb = tIdx === safeIndex;
            return (
              <button
                key={`thumb-${tIdx}-${thumbUrl.slice(-15)}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(tIdx);
                }}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md overflow-hidden shrink-0 border transition-all cursor-pointer relative bg-gray-50 ${
                  isSelectedThumb
                    ? 'border-[#FFC107] ring-1 ring-[#FFC107] scale-105 opacity-100 shadow-xs'
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
          })}
        </div>
      )}
    </div>
  );
};

// Helper para reunir las fotos disponibles garantizando exclusividad absoluta:
// - Si la variante es la opción Kit (es_kit): muestra la foto unificada del kit (grupo_kit_imagen).
// - Si es una variante individual: reúne las fotos de esa variante y EXCLUYE estrictamente la foto unificada del kit.
const getItemImages = (
  item: {
    isGroup: boolean;
    coverProduct: Producto;
    variants: Producto[];
    hasKit?: boolean;
    kitImage?: string;
  },
  activeVariant: Producto
): string[] => {
  // 1. Obtener identificadores y URLs de la foto unificada del kit si existe
  const rawKitImg = item.kitImage || activeVariant.grupo_kit_imagen || item.coverProduct?.grupo_kit_imagen || '';
  const kitDirectUrl = rawKitImg ? formatDirectImageUrl(rawKitImg) : '';
  const kitDriveId = rawKitImg ? (extractDriveFileId(rawKitImg) || (!rawKitImg.includes('/') ? rawKitImg : '')) : '';

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

  // CASO B: Variante individual regular (la foto unificada del kit NO debe repetirse aquí)
  const imagesList: string[] = [];

  // 1. Foto principal de la variante activa (prioridad máxima)
  const activeMain = formatDirectImageUrl(activeVariant.imagen_url || activeVariant.link);
  if (activeMain) {
    imagesList.push(activeMain);
  }

  // 2. Foto HD específica de la variante activa
  if (activeVariant.variante_imagen_hd) {
    imagesList.push(formatDirectImageUrl(activeVariant.variante_imagen_hd));
  }

  // 3. Portada específica de la variante activa
  if (activeVariant.imagen_portada) {
    imagesList.push(formatDirectImageUrl(activeVariant.imagen_portada));
  }

  // 4. Miniatura de la variante activa (si es una URL de imagen válida)
  if (activeVariant.variante_imagen_miniatura) {
    imagesList.push(formatDirectImageUrl(activeVariant.variante_imagen_miniatura));
  }

  // 5. Fotos secundarias exclusivas de esta misma variante (Galería de este modelo)
  if (Array.isArray(activeVariant.imagenes_secundarias)) {
    activeVariant.imagenes_secundarias.forEach(url => {
      if (url) imagesList.push(formatDirectImageUrl(url));
    });
  }

  // 6. Colección de imágenes adicionales asociadas a esta variante
  if (Array.isArray(activeVariant.imagenes)) {
    activeVariant.imagenes.forEach(u => {
      if (u) imagesList.push(formatDirectImageUrl(u));
    });
  }

  // 7. Si no es un grupo, o si es la portada general asignada al producto base
  if (!item.isGroup && item.coverProduct.grupo_imagen_portada) {
    imagesList.push(formatDirectImageUrl(item.coverProduct.grupo_imagen_portada));
  }

  // Deduplicar manteniendo el orden de prioridad y APLICAR EXCLUSIVIDAD ESTRICTA DEL KIT
  const seen = new Set<string>();
  const uniqueList: string[] = [];
  imagesList.forEach(url => {
    const clean = url?.trim();
    if (!clean || seen.has(clean)) return;

    // Verificar si esta foto es la del kit para excluirla de las variantes individuales
    const isKitPhoto = (kitDirectUrl && clean === kitDirectUrl) || 
                       (kitDriveId && (clean.includes(kitDriveId) || extractDriveFileId(clean) === kitDriveId));

    if (!isKitPhoto) {
      seen.add(clean);
      uniqueList.push(clean);
    }
  });

  return uniqueList;
};

interface BikerStoreProps {
  products?: Producto[];
  financialSettings?: GlobalFinancialSettings;
  onExitToAdmin?: () => void;
  isAdmin?: boolean;
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
  isAdmin = false
}) => {
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

  // Shipping Form State (The exact 4 fields requested + payment method)
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCedula, setClienteCedula] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccionAgencia, setDireccionAgencia] = useState('');
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState<'MRW' | 'Zoom' | 'Tealca' | 'Domesa' | 'Otra'>('MRW');
  const [metodoPago, setMetodoPago] = useState<string>('Pago Móvil');
  const [notasCliente, setNotasCliente] = useState('');
  
  // Payment mode: 'whatsapp' (manual coordination) or 'comprobante' (instant upload & automatic entry)
  const [tipoConfirmacion, setTipoConfirmacion] = useState<'whatsapp' | 'comprobante'>('comprobante');
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [comprobanteFileName, setComprobanteFileName] = useState<string | null>(null);
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState<boolean>(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [isOrderSummaryExpanded, setIsOrderSummaryExpanded] = useState<boolean>(false);

  // Configuración de Métodos de Pago editables (Pago Móvil, Transferencia, Zinli, USDT, etc.)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() => {
    try {
      const saved = localStorage.getItem('biker_store_payment_methods');
      return saved ? JSON.parse(saved) : DEFAULT_PAYMENT_METHODS;
    } catch {
      return DEFAULT_PAYMENT_METHODS;
    }
  });
  const [isPaymentMethodsModalOpen, setIsPaymentMethodsModalOpen] = useState(false);

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

  useEffect(() => {
    try {
      const q = query(collection(db, 'productos'));
      const unsub = onSnapshot(q, (snapshot) => {
        const list: Producto[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as any;
          const rawLink = data.link || (data.imagen_url && data.imagen_url.includes('http') ? data.imagen_url : '');
          const idOnly = extractDriveFileId(rawLink || data.imagen_url) || (!data.imagen_url?.includes('/') ? data.imagen_url : '');
          return {
            id: docSnap.id,
            ...data,
            nombre: removeAccents(data.nombre || ''),
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
    return products.length > 0 ? products : dbProducts;
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
            setPaymentMethods(data.methods);
            try {
              localStorage.setItem('biker_store_payment_methods', JSON.stringify(data.methods));
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
    setPaymentMethods(updatedMethods);
    try {
      localStorage.setItem('biker_store_payment_methods', JSON.stringify(updatedMethods));
      await setDoc(doc(db, 'configuracion', 'tienda_metodos_pago'), {
        methods: updatedMethods,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving payment methods:", e);
      throw e;
    }
  };

  const activePaymentMethods = useMemo(() => {
    const active = paymentMethods.filter(m => m.activo !== false);
    return active.length > 0 ? active : DEFAULT_PAYMENT_METHODS;
  }, [paymentMethods]);

  // Ensure metodoPago matches an active method
  useEffect(() => {
    if (activePaymentMethods.length > 0) {
      if (!activePaymentMethods.some(m => m.nombre.toLowerCase() === metodoPago.toLowerCase())) {
        setMetodoPago(activePaymentMethods[0].nombre);
      }
    }
  }, [activePaymentMethods, metodoPago]);

  const selectedPaymentMethod = useMemo(() => {
    return activePaymentMethods.find(m => m.nombre.toLowerCase() === metodoPago.toLowerCase()) || activePaymentMethods[0];
  }, [activePaymentMethods, metodoPago]);

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
        if (quickViewProduct) {
          setQuickViewProduct(null);
          setQuickViewActiveVariant(null);
          setQuickViewImageIndex(0);
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
        } else if (mobileExpandedCategory) {
          setMobileExpandedCategory(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    quickViewProduct,
    completedOrder,
    isCheckoutOpen,
    isCartOpen,
    isCategoryModalOpen,
    isTextEditorOpen,
    isPaymentMethodsModalOpen,
    mobileExpandedCategory
  ]);

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

  // 3. EXTRACCIÓN DINÁMICA DE SUBCATEGORÍAS (useMemo)
  // Nota: Se excluye explícitamente cualquier subcategoría cuyo nombre coincida con la categoría general
  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
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
          const subMap = map.get(catName) || new Map<string, number>();
          subMap.set(displaySub, (subMap.get(displaySub) || 0) + 1);
          map.set(catName, subMap);
        });
      });
    });

    const result: Record<string, { name: string; count: number }[]> = {};
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
        .map(([name, count]) => ({ name, count }))
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
          if (!matchesSubcat && p.grupo_id) {
            const groupSiblings = sourceProducts.filter(v => v.grupo_id === p.grupo_id);
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

        // Si pertenece a un grupo, tomar también el score de las variantes hermanas para que el grupo ascienda
        if (p.grupo_id) {
          const siblings = sourceProducts.filter(v => v.grupo_id === p.grupo_id);
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

    // 1. Clasificar variantes por grupo_id
    filteredProducts.forEach(p => {
      if (p.grupo_id) {
        const list = groupMap.get(p.grupo_id) || [];
        list.push(p);
        groupMap.set(p.grupo_id, list);
      }
    });

    const processedGroupIds = new Set<string>();
    const items: Array<{
      id: string;
      isGroup: boolean;
      groupId?: string;
      title: string;
      coverProduct: Producto;
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
      if (p.grupo_id) {
        if (processedGroupIds.has(p.grupo_id)) return;
        processedGroupIds.add(p.grupo_id);

        const variants = groupMap.get(p.grupo_id) || [p];

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
        items.push({
          id: p.id,
          isGroup: false,
          title: p.nombre,
          coverProduct: p,
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
  }, [filteredProducts]);

  // Cart Totals
  const cartTotals = useMemo(() => {
    const totalUSD = cart.reduce((sum, item) => sum + (item.precio_unitario * item.quantity), 0);
    const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalBS = totalUSD * tasaBCV;
    return {
      totalUSD: Number(totalUSD.toFixed(2)),
      totalBS: Number(totalBS.toFixed(2)),
      totalUnits
    };
  }, [cart, tasaBCV]);

  // Add to cart
  const handleAddToCart = (product: Producto, qty: number = 1) => {
    let unitPrice = product.precio_venta_ref || product.precio_mayor || 0;
    const isKit = Boolean(product.es_kit || product.variante_nombre?.toLowerCase() === 'kit');

    let displayProduct = product;
    if (isKit) {
      // Si es un kit, asegurarse de que el precio unitario sea el precio total del Kit
      let kitPrice = product.precio_venta_ref || product.grupo_kit_precio || 0;
      let kitComponents: string[] = product.kit_componentes_ids || [];

      if (product.grupo_id) {
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
            const newQty = item.quantity + qty;
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

    // Animation trigger
    setAddedAnimationId(displayProduct.id);
    setTimeout(() => setAddedAnimationId(null), 1800);
  };

  // Buy now (add to cart & open checkout immediately)
  const handleBuyNow = (product: Producto) => {
    handleAddToCart(product, 1);
    setIsCartOpen(false);
    setCheckoutStep(1);
    setIsCheckoutOpen(true);
  };

  // Update quantity in cart
  const handleUpdateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: newQty,
            subtotal: Number((item.precio_unitario * newQty).toFixed(2))
          };
        }
        return item;
      })
    );
  };

  // Helper to open QuickView modal
  const openQuickView = (variant: Producto, keepSelectedKit: boolean = false) => {
    let effectiveVariant = variant;
    // Si la variante enviada es el kit pero no se forzó mantenerlo (ej: apertura inicial desde imagen/título), preseleccionar la primera variante individual
    if (!keepSelectedKit && effectiveVariant.es_kit && effectiveVariant.grupo_id) {
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
  };

  // Apertura desde la tarjeta del catálogo: si el usuario ya seleccionó una opción (incluyendo el Kit), abrir con esa opción; si no, preselecciona la primera individual
  const handleOpenCardQuickView = (item: (typeof catalogItems)[0]) => {
    const selectedId = selectedVariantMap[item.id];
    if (selectedId) {
      const selectedVar = item.variants.find(v => v.id === selectedId);
      if (selectedVar) {
        openQuickView(selectedVar, true);
        return;
      }
    }
    // Si no ha seleccionado ninguna miniatura en la tarjeta, preselecciona la primera individual
    if (item.hasKit && item.individualVariants && item.individualVariants.length > 0) {
      openQuickView(item.individualVariants[0]);
    } else if (item.isGroup && item.variants.length > 0) {
      openQuickView(item.variants.find(v => !v.es_kit) || item.coverProduct);
    } else {
      openQuickView(item.coverProduct);
    }
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

    if (cart.length === 0) {
      setOrderFormError("Tu carrito está vacío. Agrega productos antes de finalizar la compra.");
      return;
    }
    if (!clienteNombre.trim()) {
      setOrderFormError("Por favor ingresa tu Nombre y Apellido.");
      return;
    }
    if (!clienteCedula.trim()) {
      setOrderFormError("Por favor ingresa tu Número de Cédula.");
      return;
    }
    if (!clienteTelefono.trim()) {
      setOrderFormError("Por favor ingresa tu Número de Teléfono o WhatsApp.");
      return;
    }
    if (!direccionAgencia.trim()) {
      setOrderFormError("Por favor ingresa la Dirección de la agencia de envío.");
      return;
    }

    // When paying directly with receipt, ensure voucher image is attached
    if (tipoConfirmacion === 'comprobante') {
      if (!comprobanteUrl) {
        setOrderFormError("Por favor adjunta la foto o captura de tu comprobante de pago.");
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      const orderId = doc(collection(db, 'pedidos_tienda')).id;
      const orderNumber = `BIKER-${Date.now().toString().slice(-6)}`;
      const fullShippingAddress = `${agenciaSeleccionada.toUpperCase()}: ${direccionAgencia.trim()}`;

      const orderItems: PedidoTiendaItem[] = cart.map((item) => ({
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

      if (tipoConfirmacion === 'comprobante') {
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
          cliente_nombre: removeAccents(clienteNombre.trim()),
          cliente_cedula: clienteCedula.trim(),
          cliente_telefono: clienteTelefono.trim(),
          direccion_agencia_envio: removeAccents(fullShippingAddress),
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
    
    text += `👤 *DATOS DE ENVÍO*\n`;
    text += `• *Nombre:* ${order.cliente_nombre}\n`;
    text += `• *Cédula:* ${order.cliente_cedula}\n`;
    text += `• *Teléfono:* ${order.cliente_telefono}\n`;
    text += `• *${agencyLabel}:* ${agencyAddress}\n\n`;

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

  // Open WhatsApp with prefilled message directed to store owner (04128276786 -> 584128276786)
  const handleSendToWhatsApp = (order: PedidoTienda) => {
    const text = generateOrderWhatsAppText(order);
    const encoded = encodeURIComponent(text);
    const targetPhone = '584128276786';
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
    const url = 'https://loquelosbikersquieren.vercel.app/';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans selection:bg-[#FFC107] selection:text-black pb-[max(2rem,env(safe-area-inset-bottom))] pt-[130px] sm:pt-[138px]">
      {/* ========================================================= */}
      {/* SMART STICKY HEADER (UNIFICADO EN NEGRO PURO #000000)      */}
      {/* ========================================================= */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out bg-[#000000] shadow-md ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* TOP ANNOUNCEMENT BAR (DENTRO DEL CONTENEDOR UNIFICADO #000000) */}
        <div className="bg-[#000000] text-white px-3 sm:px-6 py-1.5 pt-[max(0.6rem,calc(env(safe-area-inset-top)+0.2rem))] text-[10px] sm:text-xs font-semibold tracking-wide flex flex-wrap items-center justify-between gap-2 border-b border-white/10">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar">
            <span className="flex items-center gap-1 uppercase font-bold text-gray-200">
              <Truck size={13} className="text-[#FFC107] stroke-[2.5]" />
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
            <span className="font-mono bg-white/10 text-white px-2 py-0.5 rounded border border-white/15 flex items-center gap-1 font-bold text-[10.5px]">
              💵 Tasa Oficial BCV: <strong className="text-[#FFC107]">Bs. {formatVES(tasaBCV)}</strong>
              {isFetchingTasa && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FFC107] animate-pulse" title="Sincronizando tasa oficial en vivo..." />
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 text-gray-200 px-2.5 py-0.5 rounded text-[9.5px] uppercase font-bold transition-colors cursor-pointer"
              title="Copiar enlace para compartir esta tienda con clientes"
            >
              {copiedLink ? <Check size={11} className="text-emerald-400" /> : <Share2 size={11} />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Compartir Tienda'}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setTextEditorInitialKey(null);
                  setIsTextEditorOpen(true);
                }}
                className="bg-white/10 hover:bg-white/20 text-[#FFC107] border border-[#FFC107]/40 px-2.5 py-0.5 rounded text-[9.5px] uppercase font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                title="Editar todos los textos fijos, títulos y aclaratorias del e-commerce"
              >
                <Edit3 size={11} className="text-[#FFC107]" />
                <span>Editar Textos</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-[#FFC107] border border-[#FFC107]/30 px-2 py-0.5 rounded text-[9.5px] uppercase font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Configurar qué categorías se muestran a los clientes"
              >
                <Sliders size={11} className="text-[#FFC107]" />
                <span className="hidden sm:inline">Categorías Visibles</span>
                <span className="sm:hidden">Categorías</span>
              </button>
            )}

            {isAdmin && onExitToAdmin && (
              <button
                type="button"
                onClick={onExitToAdmin}
                className="bg-white/10 text-[#FFC107] hover:text-white px-2 py-0.5 rounded text-[9.5px] uppercase font-black transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft size={11} />
                <span>Volver</span>
              </button>
            )}
          </div>
        </div>

        {/* MAIN STORE HEADER (FONDO NEGRO PURO #000000) */}
        <header className="bg-[#000000]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
            {/* LOGO PRINCIPAL */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center">
                <img src="/logo png.png" alt="Lo que los bikers quieren" className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm" />
              </div>
              <div className="hidden sm:block">
                <EditableStoreText
                  textKey="headerSubtitle"
                  value={getText('headerSubtitle')}
                  isAdmin={isAdmin}
                  onOpenEditor={handleOpenTextEditorFor}
                  as="p"
                  className="text-[8.5px] text-gray-300 font-bold uppercase tracking-wider"
                />
              </div>
            </div>

            {/* OMNI SEARCH BAR CENTRAL: FONDO BLANCO PURO #FFFFFF, TEXTO Y PLACEHOLDER NEGRO CARBÓN #111111 */}
            <div className="flex-1 max-w-xl hidden md:block">
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
                  placeholder={getText('searchPlaceholder') || "busca aqui tus accesorios favoritos, acompañante, led, tapa suichera.."}
                  className="w-full bg-[#FFFFFF] border-2 border-transparent focus:border-[#FF5200] rounded-xl pl-11 pr-10 py-2 text-xs sm:text-sm text-[#111111] placeholder:text-[#111111] font-medium outline-none transition-all shadow-sm"
                />
                <Search size={16} className="absolute left-4 text-[#111111] pointer-events-none" />
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
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 sm:p-2.5 text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95"
                title={`Carrito de compras (${cartTotals.totalUnits} ${cartTotals.totalUnits === 1 ? 'artículo' : 'artículos'})`}
                aria-label={`Ver carrito de compras con ${cartTotals.totalUnits} artículos`}
              >
                <ShoppingCart size={22} className="stroke-[2.2] text-gray-200 hover:text-white" />
                {cartTotals.totalUnits > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs border border-[#000000] animate-scale-up">
                    {cartTotals.totalUnits}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* MOBILE SEARCH BAR: BLANCO PURO #FFFFFF, TEXTO Y PLACEHOLDER #111111 */}
          <div className="px-3 pb-2.5 md:hidden">
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
                placeholder={getText('searchPlaceholder') || "busca aqui tus accesorios favoritos, acompañante, led, tapa suichera.."}
                className="w-full bg-[#FFFFFF] border-2 border-transparent focus:border-[#FF5200] rounded-xl pl-9 pr-8 py-2 text-xs text-[#111111] placeholder:text-[#111111] font-medium outline-none shadow-sm"
              />
              <Search size={14} className="absolute left-3 text-[#111111] pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-gray-500 hover:text-black p-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* 5. MENÚ SUPERIOR CON DESPLEGABLE EN HOVER (TIPO SHEIN/AMAZON) */}
          <div id="biker-category-header-bar" className="bg-[#0e121b] border-t border-white/5 relative z-30">
            {/* Contenedor horizontal de categorías con scroll fluido sin barra forzada */}
            <div className="px-3 sm:px-6 py-2 overflow-x-auto md:overflow-visible flex items-center gap-1.5 sm:gap-2 no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedSubcategory(null);
                  setSearchQuery('');
                  setMobileExpandedCategory(null);
                }}
                className={`px-3 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'all' && !selectedSubcategory
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                    : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                }`}
              >
                🔥 Todos los Productos
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
                            setSelectedCategory(cat);
                            setSelectedSubcategory(null);
                            setMobileExpandedCategory(cat);
                          }
                        } else {
                          setSelectedCategory(cat);
                          setSelectedSubcategory(null);
                          setMobileExpandedCategory(null);
                        }
                        setSearchQuery('');
                      }}
                      className={`px-3 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        isCatSelected
                          ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                          : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>{cat}</span>
                      {hasSubs && (
                        <ChevronDown 
                          size={11} 
                          className={`transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          } ${isCatSelected ? 'text-black' : 'text-slate-400'}`} 
                        />
                      )}
                    </button>

                    {/* DESKTOP DROPDOWN: Flota bajo el botón en pantallas medianas y superiores sin scroll interno */}
                    {hasSubs && (
                      <div
                        className={`hidden md:block absolute top-full left-0 pt-1.5 min-w-[210px] z-50 transition-all duration-200 ${
                          isHovered ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                        }`}
                      >
                        <div className="bg-[#0b0f19]/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-2 shadow-2xl shadow-black/90 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedSubcategory(null);
                              setSearchQuery('');
                              setHoveredCategory(null);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                              isCatSelected && !selectedSubcategory
                                ? 'bg-amber-400/20 text-amber-300 font-black'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span>Ver todo en {cat}</span>
                            <ArrowRight size={11} className="text-amber-400" />
                          </button>

                          <div className="border-t border-white/10 my-1" />

                          {/* Lista sin max-h-56 ni scrollbar interno forzado */}
                          <div className="space-y-0.5">
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
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                                    isSubSelected
                                      ? 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20'
                                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  <span className="truncate">{subItem.name}</span>
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                                    isSubSelected ? 'bg-black/20 text-black' : 'bg-white/5 text-slate-400'
                                  }`}>
                                    {subItem.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
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
                        className={`flex-1 text-left py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                          isCatSelected && !selectedSubcategory
                            ? 'text-amber-300'
                            : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        <span>Ver Todo en {cat}</span>
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
                            className={`w-full text-left p-2 rounded-xl text-[10.5px] font-bold flex items-center justify-between gap-1 transition-all cursor-pointer ${
                              isSubSelected
                                ? 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20'
                                : 'bg-white/5 text-slate-200 hover:text-white hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            <span className="truncate">{subItem.name}</span>
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

      {/* ========================================================= */}
      {/* HERO BANNER BIKER (ESTILO LUMINOSO Y DE ALTA CONVERSIÓN)    */}
      {/* ========================================================= */}
      <section className="bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-white border-b border-[#E5E7EB] py-5 sm:py-7 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl text-center md:text-left">
            <h1 className="font-extrabold text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-[#111111] leading-tight">
              LO QUE LOS BIKERS QUIEREN
            </h1>
            <EditableStoreText
              textKey="heroSubtitle"
              value={getText('heroSubtitle')}
              isAdmin={isAdmin}
              onOpenEditor={handleOpenTextEditorFor}
              as="p"
              className="text-xs sm:text-sm text-[#555555] font-medium max-w-xl leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1 text-[11px] sm:text-xs font-semibold text-[#111111]">
              <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-xs">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <EditableStoreText
                  textKey="badgeProtected"
                  value={getText('badgeProtected')}
                  isAdmin={isAdmin}
                  onOpenEditor={handleOpenTextEditorFor}
                  as="span"
                />
              </span>
              <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-xs">
                <Truck size={13} className="text-amber-600" />
                <EditableStoreText
                  textKey="badgeDispatch"
                  value={getText('badgeDispatch')}
                  isAdmin={isAdmin}
                  onOpenEditor={handleOpenTextEditorFor}
                  as="span"
                />
              </span>
              <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-xs">
                <ShieldCheck size={13} className="text-blue-600" />
                <EditableStoreText
                  textKey="badgePrices"
                  value={getText('badgePrices')}
                  isAdmin={isAdmin}
                  onOpenEditor={handleOpenTextEditorFor}
                  as="span"
                />
              </span>
            </div>
          </div>

          {/* QUICK PROMO CARD (FONDO BLANCO Y BORDE SUAVE) */}
          <div className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm relative">
            <span className="absolute -top-2.5 right-4 bg-[#FFC107] text-[#111111] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              ⚡ Envíos Diarios
            </span>
            <div className="space-y-2">
              <EditableStoreText
                textKey="stepsBoxTitle"
                value={getText('stepsBoxTitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="p"
                className="text-[10px] font-black uppercase tracking-wider text-[#111111]"
              />
              <div className="space-y-1.5 text-xs text-[#555555]">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#FFC107] text-[#111111] text-[9.5px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <EditableStoreText
                    textKey="step1"
                    value={getText('step1')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="span"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#FFC107] text-[#111111] text-[9.5px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <EditableStoreText
                    textKey="step2"
                    value={getText('step2')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="span"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#FFC107] text-[#111111] text-[9.5px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <EditableStoreText
                    textKey="step3"
                    value={getText('step3')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="span"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* STORE CATALOG & FILTERS                                   */}
      {/* ========================================================= */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* FILTERS TOOLBAR */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <EditableStoreText
                textKey="catalogTitle"
                value={getText('catalogTitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="span"
                className="font-extrabold text-xl tracking-tight uppercase text-[#111111]"
              />
              <span className="font-extrabold text-xl tracking-tight uppercase text-[#FF5200]">
                ({catalogItems.length})
              </span>
            </div>
            {!searchQuery && selectedCategory !== 'all' && (
              <span className="text-[10.5px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span>{selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubcategory(null);
                  }}
                  className="ml-1 text-amber-700 hover:text-black p-0.5 rounded-full hover:bg-amber-200/60 transition-colors cursor-pointer"
                  title="Quitar categoría"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            {!searchQuery && selectedSubcategory && (
              <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                <span>Subcategoría: {selectedSubcategory}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className="hover:text-white ml-0.5 cursor-pointer text-amber-300"
                  title="Quitar filtro de subcategoría"
                >
                  ✕
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="text-[10.5px] font-bold uppercase bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span>Búsqueda: "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-amber-800 hover:text-black p-0.5 rounded-full hover:bg-amber-200/60 transition-colors cursor-pointer"
                  title="Quitar búsqueda"
                >
                  <X size={10} />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Ordenar por */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-[#111111]">
              <SlidersHorizontal size={13} className="text-amber-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-[#111111] outline-none cursor-pointer font-bold"
              >
                <option value="destacados">Destacados</option>
                <option value="precio_asc">Menor Precio</option>
                <option value="precio_desc">Mayor Precio</option>
                <option value="nombre">Nombre (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* PRODUCTS GRID (ESTILO CONSOLIDADO CON VARIANTES) */}
        {isLoadingProducts && sourceProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4.5 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={`skel-${n}`} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 space-y-3">
                <div className="w-full aspect-square bg-gray-100 rounded-lg" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-6 bg-gray-100 rounded w-1/2" />
                <div className="h-8 bg-gray-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : catalogItems.length === 0 ? (
          <div className="py-20 text-center space-y-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 max-w-lg mx-auto p-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <ShoppingBag size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg uppercase tracking-tight text-[#111111]">No se encontraron productos</h3>
              <p className="text-xs text-[#555555]">
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
              className="px-4 py-2 bg-[#FFC107] hover:bg-[#ffb300] text-[#111111] text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Ver Todo el Catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
            {catalogItems.map((item, itemIdx) => {
              const isSelectedByUser = Boolean(selectedVariantMap[item.id]);
              const activeVariant = item.variants.find(v => v.id === selectedVariantMap[item.id]) || item.coverProduct;
              const hasVariants = Boolean(item.variants && item.variants.length > 1);
              
              // Si el grupo tiene kit (grupo_tiene_kit) y no se ha seleccionado una variante individual, la portada principal es la foto unificada del kit (grupo_kit_imagen)
              const defaultKitCoverUrl = (item.hasKit && item.kitImage) ? formatDirectImageUrl(item.kitImage) : null;
              const itemImages = (!isSelectedByUser && defaultKitCoverUrl)
                ? [defaultKitCoverUrl]
                : getItemImages(item, activeVariant);

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
                  className="bg-white hover:shadow-lg border border-[#E5E7EB] hover:border-gray-400 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden cursor-pointer"
                  title="Haz clic para ver detalles y agregar al carrito"
                >
                  {/* Indicador de Stock Crítico (Solo si casi agotado, 5 o menos unidades) */}
                  {currentStock > 0 && currentStock <= 5 && (
                    <div className="flex items-center justify-end mb-1 z-10">
                      <span className="text-[7.5px] sm:text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-50 text-[#FF5200] border border-orange-200 flex items-center gap-1 shadow-xs tracking-tight">
                        <span className="animate-pulse">⏳</span>
                        <span>Casi agotado, quedan solo {currentStock}</span>
                      </span>
                    </div>
                  )}

                  {/* Product Image: Carrusel de fotos compacto con altura máxima restringida */}
                  <div className="mb-1.5">
                    <StoreImageCarousel
                      images={itemImages}
                      currentIndex={currentImageIndex}
                      onIndexChange={(newIdx) => {
                        setCardImageIndexMap(prev => ({ ...prev, [item.id]: newIdx }));
                      }}
                      altText={item.title}
                      className="h-32 sm:h-36 md:h-40 max-h-40 w-full"
                      onOpenDetail={() => handleOpenCardQuickView(item)}
                      showThumbnails={true}
                    />
                  </div>

                  {/* Product Info */}
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Name / Título General: Negro Amazon #111111 */}
                      <h4 
                        className="font-bold text-xs sm:text-[13px] text-[#111111] line-clamp-2 min-h-[2rem] sm:min-h-[2.3rem] group-hover:text-[#FF5200] transition-colors leading-tight tracking-tight"
                        title={item.title}
                      >
                        {formatTitleCase(item.title)}
                      </h4>

                      {/* Selector Visual de Variantes por Miniaturas */}
                      {item.isGroup && item.variants.length > 1 && (
                        <div className="pt-1 pb-0.5 space-y-0.5">
                          <div className="flex items-center justify-between text-[7.5px]">
                            <span className="text-[#4B5563] font-semibold uppercase flex items-center gap-1 truncate max-w-[140px]">
                              <Boxes size={8} className="text-[#FF5200] shrink-0" />
                              <span className="text-[#4B5563]">
                                {(activeVariant.es_kit || (!isSelectedByUser && item.hasKit)) ? 'Kit:' : 'Modelo:'}
                              </span>
                              <strong className="text-[#111111] truncate">
                                {isSelectedByUser 
                                  ? (activeVariant.variante_nombre || activeVariant.nombre) 
                                  : (item.hasKit ? (item.kitName || 'Kit') : (activeVariant.variante_nombre || activeVariant.nombre))}
                              </strong>
                            </span>
                            <span className="text-[7px] font-mono text-[#4B5563] shrink-0">
                              {item.variants.length} opc.
                            </span>
                          </div>

                          {/* Tira de Miniaturas Visuales de Modelos Diferentes (incluyendo miniatura del Kit con su respectiva foto) */}
                          <div className="flex items-center gap-1 overflow-x-auto py-0.5 px-0.5 custom-scrollbar">
                            {item.variants.map((v) => {
                              const isSelected = isSelectedByUser && activeVariant.id === v.id;
                              const vInStock = (v.stock_disponible || 0) > 0;
                              const vImg = formatDirectImageUrl(
                                v.es_kit 
                                  ? (item.kitImage || v.grupo_kit_imagen || v.variante_imagen_miniatura || v.imagen_url)
                                  : (v.variante_imagen_miniatura || v.imagen_portada || v.variante_imagen_hd || v.imagen_url || v.link)
                              );
                              return (
                                <button
                                  key={`v-visual-thumb-${item.id}-${v.id}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVariantMap(prev => ({ ...prev, [item.id]: v.id }));
                                    setCardImageIndexMap(prev => ({ ...prev, [item.id]: 0 }));
                                  }}
                                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden shrink-0 border transition-all cursor-pointer relative bg-gray-50 flex items-center justify-center ${
                                    isSelected
                                      ? 'border-[#FF5200] ring-2 ring-[#FF5200]/50 scale-105 shadow-xs z-10'
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
                                    <span className="text-[7px] font-black text-gray-500 uppercase text-center p-0.5 truncate leading-none">
                                      {v.es_kit ? (v.variante_nombre || item.kitName || 'KIT').slice(0, 4).toUpperCase() : (v.variante_nombre || v.nombre).slice(0, 3)}
                                    </span>
                                  )}
                                  {!vInStock && (
                                    <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-rose-600 text-[7px] font-black">
                                      ✕
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price section: Naranja de Alta Conversión #FF5200 y Secundario en Gris Oxford Neutro #4B5563 */}
                    <div className="pt-1.5 border-t border-gray-100 space-y-0.5 font-mono">
                      <div className="flex items-baseline gap-1 flex-wrap">
                        {item.hasKit && !isSelectedByUser ? (
                          <>
                            <span className="text-[8px] font-bold text-[#4B5563] uppercase">Desde</span>
                            <span className="text-base sm:text-lg font-black text-[#FF5200] tracking-tight"> ${item.priceMin.toFixed(2)} </span>
                            <span className="text-[10px] font-bold text-[#FF5200]">USD</span>
                          </>
                        ) : item.isGroup && item.priceMin !== item.priceMax && !isSelectedByUser ? (
                          <>
                            <span className="text-[8px] font-bold text-[#4B5563] uppercase">Desde</span>
                            <span className="text-base sm:text-lg font-black text-[#FF5200] tracking-tight"> ${item.priceMin.toFixed(2)} - ${item.priceMax.toFixed(2)} </span>
                            <span className="text-[10px] font-bold text-[#FF5200]">USD</span>
                          </>
                        ) : (
                          <>
                            <span className="text-base sm:text-lg font-black text-[#FF5200] tracking-tight"> ${priceUSD.toFixed(2)} </span>
                            <span className="text-[10px] font-bold text-[#FF5200]">USD</span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[10.5px] font-medium text-[#4B5563] leading-tight">
                        ≈ Bs. {formatVES((item.hasKit && !isSelectedByUser ? item.priceMin : priceUSD) * tasaBCV)}
                      </div>
                    </div>

                    {/* Botón CTA Único (Lógica Amazon: "Ver opciones" vs "Agregar al carrito") */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCardQuickView(item);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#000000] hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98 transition-all"
                        title={hasVariants ? "Ver opciones disponibles" : "Agregar este producto al carrito"}
                      >
                        <ShoppingCart size={13} className="text-white stroke-[2.2] shrink-0" />
                        <span>{hasVariants ? 'Ver opciones' : 'Agregar al carrito'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* CART DRAWER / SLIDE-OVER                                  */}
      {/* ========================================================= */}
      {isCartOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCartOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl animate-slide-left text-[#111111] cursor-default"
          >
            {/* Header Drawer */}
            <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFC107] text-[#111111] flex items-center justify-center font-black shadow-xs">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <EditableStoreText
                    textKey="cartDrawerTitle"
                    value={getText('cartDrawerTitle')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="h3"
                    className="font-extrabold text-base uppercase tracking-tight text-[#111111] leading-none"
                  />
                  <p className="text-[9.5px] text-[#555555] font-bold uppercase mt-0.5">
                    {cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-red-500 hover:text-white text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shrink-0"
                title="Cerrar carrito"
                aria-label="Cerrar carrito"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* List of items */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <p className="font-extrabold text-base uppercase tracking-tight text-[#111111]">Tu carrito está vacío</p>
                  <p className="text-xs text-[#555555] max-w-xs mx-auto">
                    Explora nuestro catálogo de accesorios para motos para agregar productos a tu compra.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 bg-[#FFC107] hover:bg-[#ffb300] text-[#111111] text-xs font-black uppercase rounded-xl cursor-pointer shadow-xs transition-colors"
                  >
                    Ir al Catálogo
                  </button>
                </div>
              ) : (
                cart.map((item, cartIdx) => {
                  const img = formatDirectImageUrl(item.product.imagen_url || item.product.link);
                  return (
                    <div
                      key={`cart-item-${item.product.id || 'p'}-${item.product.sku || ''}-${cartIdx}`}
                      className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center gap-3 relative group"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                        {img ? (
                          <img src={img} alt={item.product.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-gray-400" />
                        )}
                      </div>

                      {/* Info & Quantity */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs text-[#111111] truncate">
                          {item.product.nombre}
                        </h5>
                        <p className="text-[10.5px] font-mono text-[#FF5200] font-bold mt-0.5">
                          ${item.precio_unitario.toFixed(2)} USD <span className="text-[#4B5563] font-normal">c/u</span>
                        </p>

                        {/* Stepper */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.product.id, item.quantity - 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-100 font-black cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-xs text-[#111111]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.product.id, item.quantity + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-100 font-black cursor-pointer text-xs"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-mono font-black text-xs text-[#FF5200]">
                            ${item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-gray-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                        title="Eliminar del carrito"
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
                  <div className="flex items-center justify-between text-xs text-[#4B5563]">
                    <span>Subtotal USD:</span>
                    <span className="font-bold text-[#111111]">${cartTotals.totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#4B5563]">
                    <span>Equivalente en Bolívares:</span>
                    <span className="font-bold text-[#4B5563]">Bs. {formatVES(cartTotals.totalBS)}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-sm uppercase text-[#111111]">Total a Pagar:</span>
                    <span className="font-extrabold text-2xl tracking-tight text-[#FF5200]">${cartTotals.totalUSD.toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3 bg-[#FFC107] hover:bg-[#ffb300] text-[#111111] font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
                  >
                    <span>Finalizar Compra y Datos de Envío</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="w-full py-1 text-center text-[10px] text-gray-500 hover:text-rose-600 uppercase font-bold cursor-pointer transition-colors"
                  >
                    {confirmClearCart ? '⚠️ ¿Confirmar vaciar todo el carrito?' : 'Vaciar Carrito'}
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl max-h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden shadow-2xl animate-scale-up my-auto text-[#111111] cursor-default"
          >
            {/* Modal Header: Título y Ruta de Pasos */}
            <div className="p-3.5 sm:p-4 border-b border-gray-200 bg-gray-50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#FFC107] text-[#111111] flex items-center justify-center font-black shrink-0 shadow-xs">
                    <Truck size={17} />
                  </div>
                  <div>
                    <EditableStoreText
                      textKey="checkoutModalTitle"
                      value={getText('checkoutModalTitle')}
                      isAdmin={isAdmin}
                      onOpenEditor={handleOpenTextEditorFor}
                      as="h3"
                      className="font-extrabold text-base sm:text-lg uppercase tracking-tight text-[#111111] leading-none"
                    />
                    <EditableStoreText
                      textKey="checkoutModalSubtitle"
                      value={getText('checkoutModalSubtitle')}
                      isAdmin={isAdmin}
                      onOpenEditor={handleOpenTextEditorFor}
                      as="p"
                      className="text-[9.5px] sm:text-[10.5px] text-[#555555] font-bold uppercase mt-0.5"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-200 hover:bg-red-500 hover:text-white text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shrink-0"
                  title="Cerrar ventana"
                  aria-label="Cerrar ventana"
                >
                  <X size={17} strokeWidth={2.5} />
                </button>
              </div>

              {/* Barra de Ruta (Pasos 1 y 2) */}
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-2 px-3 text-xs font-bold shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOrderFormError(null);
                    setCheckoutStep(1);
                  }}
                  className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                    checkoutStep === 1 ? 'text-[#111111] font-black' : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    checkoutStep === 1 ? 'bg-[#FFC107] text-[#111111]' : 'bg-emerald-500 text-white'
                  }`}>
                    {checkoutStep === 2 ? '✓' : '1'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold">1. Llenar datos para el envío</span>
                </button>

                <div className="flex-1 mx-2 sm:mx-3 h-0.5 bg-gray-200 relative">
                  <div className={`h-full bg-[#FFC107] transition-all duration-300 ${checkoutStep === 2 ? 'w-full' : 'w-0'}`} />
                </div>

                <div className={`flex items-center gap-1.5 ${
                  checkoutStep === 2 ? 'text-[#111111] font-black' : 'text-gray-400'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    checkoutStep === 2 ? 'bg-[#FFC107] text-[#111111]' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold">2. Pago y Confirmación</span>
                </div>
              </div>
            </div>

            {/* Form & Items */}
            <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {/* Form Error Banner */}
              {orderFormError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-shake">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{orderFormError}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 1: DATOS PERSONALES Y ENCOMIENDA                    */}
              {/* ========================================================= */}
              {checkoutStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <User size={15} className="text-[#FF5722]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                      Información Personal & Encomienda
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. NOMBRE */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#111111] flex items-center gap-1">
                        <span>1. Nombre Completo *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        placeholder="Ej: Carlos Rodriguez"
                        className="w-full bg-white border border-gray-300 focus:border-[#FFC107] focus:ring-1 focus:ring-[#FFC107] p-2.5 rounded-xl text-[#111111] text-xs font-semibold outline-none transition-all placeholder:text-gray-400"
                      />
                    </div>

                    {/* 2. NÚMERO DE CÉDULA */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#111111] flex items-center gap-1">
                        <span>2. Número de Cédula (V / E) *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteCedula}
                        onChange={(e) => setClienteCedula(e.target.value)}
                        placeholder="Ej: V-19.456.789"
                        className="w-full bg-white border border-gray-300 focus:border-[#FFC107] focus:ring-1 focus:ring-[#FFC107] p-2.5 rounded-xl text-[#111111] text-xs font-semibold outline-none transition-all placeholder:text-gray-400 font-mono"
                      />
                    </div>

                    {/* 3. TELÉFONO */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                        <img src="/whatsapp.png" alt="WhatsApp" className="w-3.5 h-3.5 object-contain shrink-0" />
                        <span>3. Teléfono / WhatsApp *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        placeholder="Ej: 0412-1234567"
                        className="w-full bg-white border border-gray-300 focus:border-[#FFC107] focus:ring-1 focus:ring-[#FFC107] p-2.5 rounded-xl text-[#111111] text-xs font-semibold outline-none transition-all placeholder:text-gray-400 font-mono"
                      />
                    </div>

                    {/* AGENCIA DE ENVÍO SELECTOR */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#555555] flex items-center gap-1">
                        <span>Empresa de Encomiendas</span>
                      </label>
                      <select
                        value={agenciaSeleccionada}
                        onChange={(e) => setAgenciaSeleccionada(e.target.value as any)}
                        className="w-full bg-white border border-gray-300 focus:border-[#FFC107] focus:ring-1 focus:ring-[#FFC107] p-2.5 rounded-xl text-[#111111] text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="MRW">MRW</option>
                        <option value="Zoom">Zoom</option>
                        <option value="Tealca">Tealca</option>
                        <option value="Domesa">Domesa</option>
                        <option value="Otra">Otra Agencia / Entrega Local</option>
                      </select>
                    </div>

                    {/* 4. DIRECCIÓN DE LA AGENCIA DE ENVÍO */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#111111] flex items-center gap-1">
                        <MapPin size={11} className="text-[#FF5722]" />
                        <span>4. Dirección de la Agencia de Envío *</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={direccionAgencia}
                        onChange={(e) => setDireccionAgencia(e.target.value)}
                        placeholder="Ej: Agencia MRW San Cristóbal Centro, Calle 5 con Carrera 8, Estado Táchira (Código: 1234)"
                        className="w-full bg-white border border-gray-300 focus:border-[#FFC107] focus:ring-1 focus:ring-[#FFC107] p-2.5 rounded-xl text-[#111111] text-xs font-medium outline-none transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Resumen sutil al final del formulario */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#555555] font-medium px-1">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag size={13} className="text-amber-500" />
                        <span>{cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'producto en orden' : 'productos en orden'}</span>
                      </span>
                      <span className="font-mono text-right">
                        Total: <strong className="text-[#FF5200] font-black">${cartTotals.totalUSD.toFixed(2)} USD</strong> <span className="text-[#4B5563] font-medium text-[10px]">(≈ Bs. {formatVES(cartTotals.totalBS)})</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setOrderFormError(null);
                        if (!clienteNombre.trim()) {
                          setOrderFormError("Por favor ingresa tu Nombre y Apellido.");
                          return;
                        }
                        if (!clienteCedula.trim()) {
                          setOrderFormError("Por favor ingresa tu Número de Cédula.");
                          return;
                        }
                        if (!clienteTelefono.trim()) {
                          setOrderFormError("Por favor ingresa tu Número de Teléfono o WhatsApp.");
                          return;
                        }
                        if (!direccionAgencia.trim()) {
                          setOrderFormError("Por favor ingresa la Dirección de la agencia de envío.");
                          return;
                        }
                        setCheckoutStep(2);
                      }}
                      className="w-full py-3 bg-[#FFC107] hover:bg-[#ffb300] text-[#111111] font-bold tracking-normal text-sm uppercase rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
                    >
                      <span>Siguiente: Método de Pago</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 2: PAGO Y CONFIRMACIÓN                               */}
              {/* ========================================================= */}
              {checkoutStep === 2 && (
                <div className="space-y-3 animate-fade-in">
                  {/* SECCIÓN 1: MÉTODOS DE PAGO Y DATOS BANCARIOS */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2.5">
                    {/* Botones de Métodos de Pago */}
                    <div>
                      <div className="flex items-center justify-between pb-1 flex-wrap gap-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[#111111] flex items-center gap-1">
                          <CreditCard size={12} className="text-[#FF5722]" />
                          <span>Métodos de Pago</span>
                        </label>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setIsPaymentMethodsModalOpen(true)}
                            className="text-[9.5px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-colors"
                          >
                            <Edit3 size={10} />
                            <span>Editar Cuentas</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {activePaymentMethods.map((method) => {
                          const isSel = metodoPago.toLowerCase() === method.nombre.toLowerCase();
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setMetodoPago(method.nombre)}
                              className={`py-1.5 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-[#FFC107] text-[#111111] border-[#FFC107] font-black shadow-xs'
                                  : 'bg-white border-gray-200 text-[#555555] hover:bg-gray-100'
                              }`}
                            >
                              {method.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Datos Bancarios Copiables y Monto Unificado */}
                    <div className="space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider px-0.5 text-[#111111] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]"></span>
                        <span>Datos para transferir ({selectedPaymentMethod?.nombre || metodoPago}):</span>
                      </div>

                      {/* Monto exacto a pagar (USD y Bs BCV) */}
                      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs">
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-[#4B5563] block tracking-wider">Monto Exacto a Pagar:</span>
                          <div className="font-mono text-base sm:text-lg font-black text-[#FF5200] leading-tight mt-0.5">
                            ${cartTotals.totalUSD.toFixed(2)} <span className="text-xs font-bold text-[#FF5200]">USD</span>
                          </div>
                        </div>
                        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                          <span className="text-[9.5px] uppercase font-bold text-[#4B5563] block tracking-wider">
                            En Bolívares (Tasa BCV {formatVES(tasaBCV)}):
                          </span>
                          <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                            <span className="font-mono text-base sm:text-lg font-black text-[#D97706] tracking-tight leading-tight">
                              Bs. {formatVES(cartTotals.totalBS)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyBankData(formatVES(cartTotals.totalBS), 'monto_bs')}
                              className="text-[10px] bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer font-bold transition-all shadow-xs active:scale-95 shrink-0"
                              title="Copiar monto exacto en Bolívares para tu transferencia o Pago Móvil"
                            >
                              {copiedBankField === 'monto_bs' ? (
                                <>
                                  <Check size={11} className="text-emerald-600 stroke-[3]" />
                                  <span className="text-emerald-700">¡Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copiar Bs</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Campos bancarios copiables */}
                      <div className="space-y-1.5 text-[11px]">
                        {selectedPaymentMethod && selectedPaymentMethod.campos && selectedPaymentMethod.campos.length > 0 ? (
                          selectedPaymentMethod.campos.map((campo, cIdx) => {
                            const cleanLabel = (campo.etiqueta || '').replace(/:+$/, '').trim();
                            return (
                              <div
                                key={campo.id || `campo-${cIdx}`}
                                className="flex justify-between items-center bg-white p-2 px-3 rounded-xl border border-gray-200 gap-2 shadow-xs"
                              >
                                <span className="text-[#555555] text-[10.5px] shrink-0 font-medium">{cleanLabel}:</span>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="font-bold text-[#111111] font-mono truncate text-right text-xs">
                                    {campo.valor}
                                  </span>
                                  {campo.copiable !== false && campo.valor && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyBankData(campo.valor, `field_${campo.id || cIdx}`)}
                                      className="text-[9.5px] bg-gray-100 hover:bg-gray-200 text-[#111111] px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0 font-bold border border-gray-200"
                                    >
                                      {copiedBankField === `field_${campo.id || cIdx}` ? (
                                        <Check size={10} className="text-emerald-600" />
                                      ) : (
                                        <Copy size={10} />
                                      )}
                                      <span>{copiedBankField === `field_${campo.id || cIdx}` ? '¡Copiado!' : 'Copiar'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10.5px] text-[#555555] py-1">
                            No hay datos registrados para este método.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: COMPROBANTE DE PAGO */}
                  {tipoConfirmacion === 'comprobante' && (
                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Receipt size={12} className="text-emerald-600" />
                          <span>Adjuntar Comprobante de Pago (Captura o Foto) *</span>
                        </span>
                        <span className="text-[9px] text-emerald-700 font-semibold">Requerido</span>
                      </label>

                      {comprobanteUrl ? (
                        <div className="bg-white border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <img
                              src={comprobanteUrl}
                              alt="Comprobante de pago"
                              className="w-11 h-11 object-cover rounded-lg border border-emerald-200 shrink-0"
                            />
                            <div className="overflow-hidden">
                              <span className="text-xs font-bold text-emerald-800 block truncate">
                                {comprobanteFileName || 'comprobante_pago.jpg'}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 font-semibold">
                                <CheckCircle2 size={10} /> Comprobante listo
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setComprobanteUrl(null);
                              setComprobanteFileName(null);
                            }}
                            className="text-rose-600 hover:text-rose-700 text-[10px] font-bold py-1 px-2.5 rounded-lg bg-rose-50 border border-rose-200 shrink-0 cursor-pointer"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer text-center group shadow-xs">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptFileChange}
                            className="hidden"
                            disabled={isUploadingReceipt}
                          />
                          {isUploadingReceipt ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold py-1.5">
                              <RotateCcw size={14} className="animate-spin text-emerald-600" />
                              <span>Optimizando comprobante...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 py-1">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                <Upload size={15} />
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-bold text-[#111111] group-hover:text-emerald-700 block">
                                  Toca para subir captura o foto
                                </span>
                                <span className="text-[9.5px] text-[#555555] block">
                                  PNG, JPG o captura de pantalla
                                </span>
                              </div>
                            </div>
                          )}
                        </label>
                      )}
                    </div>
                  )}



                  {/* SECCIÓN 4: RESUMEN AL FINAL */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden transition-all shadow-xs">
                    <div
                      onClick={() => setIsOrderSummaryExpanded(!isOrderSummaryExpanded)}
                      className="p-2 px-3 flex items-center justify-between text-[11px] gap-2 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center -space-x-1 shrink-0">
                          {cart.slice(0, 3).map((item, idx) => {
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
                          {cart.length > 3 && (
                            <span className="w-5 h-5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[8px] font-black flex items-center justify-center shrink-0 z-10 shadow-xs">
                              +{cart.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 truncate text-[#555555] text-[10.5px] sm:text-[11px]">
                          <span className="font-bold text-[#111111] font-mono shrink-0">{cartTotals.totalUnits} items</span>
                          <span className="text-gray-300">•</span>
                          <span className="truncate">
                            Envío: <strong className="text-[#111111]">{clienteNombre || 'Cliente'}</strong> ({agenciaSeleccionada})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCheckoutStep(1);
                          }}
                          className="text-[10px] text-amber-700 hover:text-amber-800 underline font-bold cursor-pointer"
                        >
                          Modificar
                        </button>
                        <div className={`w-5 h-5 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 transition-transform duration-200 ${
                          isOrderSummaryExpanded ? 'rotate-180 text-amber-600' : ''
                        }`}>
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>

                    {isOrderSummaryExpanded && (
                      <div className="p-3 border-t border-gray-200 bg-white space-y-3 animate-fade-in text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#555555] block">
                            Productos en tu pedido ({cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'unidad' : 'unidades'}):
                          </span>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                            {cart.map((item, idx) => {
                              const imgUrl = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                              return (
                                <div
                                  key={`expanded-item-${item.product.id}-${idx}`}
                                  className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-gray-50 border border-gray-200"
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
                                      <p className="text-[11px] font-bold text-[#111111] truncate leading-tight">
                                        {item.product.nombre}
                                      </p>
                                      <span className="text-[9.5px] text-[#555555]">
                                        Cant: <strong className="text-[#111111] font-mono">{item.quantity}</strong> × ${item.precio_unitario.toFixed(2)} USD
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-[#111111] shrink-0">
                                    ${item.subtotal.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mini resumen de datos de envío */}
                        <div className="pt-2 border-t border-gray-200 space-y-1 text-[10.5px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#555555] block">
                            Datos de Envío Registrados:
                          </span>
                          <div className="bg-gray-50 p-2 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#555555]">
                            <div>
                              <span className="text-gray-400 block text-[9px] uppercase font-bold">Destinatario:</span>
                              <span className="text-[#111111] font-semibold">{clienteNombre || 'Sin nombre'} ({clienteCedula || 'Sin cédula'})</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[9px] uppercase font-bold flex items-center gap-1">
                                <img src="/whatsapp.png" alt="" className="w-3 h-3 object-contain shrink-0 inline" />
                                <span>Teléfono / WhatsApp:</span>
                              </span>
                              <span className="text-[#111111] font-semibold">{clienteTelefono || 'Sin teléfono'}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-gray-400 block text-[9px] uppercase font-bold">Agencia & Dirección:</span>
                              <span className="text-[#111111] font-semibold">{agenciaSeleccionada}: {direccionAgencia || 'Sin dirección especificada'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTÓN FINAL DE CONFIRMAR COMPRA */}
                  <div className="pt-1 space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmittingOrder || isUploadingReceipt}
                      className={`w-full py-3.5 disabled:opacity-50 font-bold tracking-normal text-sm sm:text-base uppercase rounded-xl flex items-center justify-center gap-2.5 shadow-md cursor-pointer active:scale-98 transition-all ${
                        tipoConfirmacion === 'comprobante'
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-[#111111] shadow-emerald-500/20'
                          : 'bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-lg shadow-[#25D366]/30 border border-[#25D366]'
                      }`}
                    >
                      {tipoConfirmacion === 'comprobante' ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <img src="/whatsapp.png" alt="WhatsApp" className="w-5 h-5 object-contain shrink-0 drop-shadow-xs" />
                      )}
                      <span>
                        {isSubmittingOrder
                          ? 'Procesando Pedido...'
                          : tipoConfirmacion === 'comprobante'
                            ? getText('btnSubmitReceipt')
                            : getText('btnSubmitWhatsapp')}
                      </span>
                    </button>

                    {/* Vía de escape y aclaratorias debajo del botón */}
                    {tipoConfirmacion === 'comprobante' ? (
                      <div className="space-y-1 text-center pt-0.5">
                        <p className="text-[10.5px] sm:text-[11px] text-[#555555] font-medium leading-relaxed px-1">
                          Al confirmar tu orden, se abrirá WhatsApp con el resumen de tu compra para confirmar cada detalle y responder cualquier consulta si lo deseas
                        </p>

                        <div className="pt-0.5 pb-0.5">
                          <button
                            type="button"
                            onClick={() => setTipoConfirmacion('whatsapp')}
                            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-[#555555] hover:text-[#111111] transition-colors cursor-pointer group py-1 px-2.5 rounded-lg hover:bg-gray-100"
                          >
                            <img src="/whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain group-hover:scale-110 transition-transform shrink-0" />
                            <span>
                              ¿Tienes problemas para pagar?{' '}
                              <span className="underline font-bold text-[#128C7E] group-hover:text-[#075E54]">
                                Escríbenos al WhatsApp
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center pt-0.5">
                        <p className="text-[10.5px] sm:text-[11px] text-[#555555] font-medium leading-relaxed px-1">
                          Presiona confirmar para realizar el pago y concretar tu pedido con un asesor.
                        </p>

                        <div className="pt-0.5 pb-0.5">
                          <button
                            type="button"
                            onClick={() => setTipoConfirmacion('comprobante')}
                            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-[#555555] hover:text-emerald-700 transition-colors cursor-pointer group py-1 px-2.5 rounded-lg hover:bg-gray-100"
                          >
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>
                              Prefiero realizar el pago directo y{' '}
                              <span className="underline font-bold text-emerald-700">
                                subir comprobante
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white border-2 border-emerald-500/50 rounded-3xl w-full max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-5 sm:p-7 text-center space-y-5 shadow-2xl animate-scale-up my-auto custom-scrollbar text-[#111111] cursor-default"
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
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
              completedOrder.tipo_confirmacion === 'comprobante_automatico'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-amber-100 text-amber-700 border border-amber-300'
            }`}>
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <EditableStoreText
                textKey="orderSuccessTitle"
                value={getText('orderSuccessTitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="span"
                className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border font-mono ${
                  completedOrder.tipo_confirmacion === 'comprobante_automatico'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              />
              <h3 className="font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[#111111]">
                #{completedOrder.numero_pedido}
              </h3>
              <EditableStoreText
                textKey="orderSuccessSubtitle"
                value={getText('orderSuccessSubtitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="p"
                className="text-xs text-[#555555] font-medium"
              />
            </div>

            {/* Order Details Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[#555555]">Cliente:</span>
                <span className="font-bold text-[#111111]">{completedOrder.cliente_nombre}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[#555555]">Cédula:</span>
                <span className="font-bold font-mono text-[#111111]">{completedOrder.cliente_cedula}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[#555555]">Teléfono:</span>
                <span className="font-bold font-mono text-[#111111]">{completedOrder.cliente_telefono}</span>
              </div>
              <div className="border-b border-gray-200 pb-2">
                <span className="text-[#555555] block mb-0.5">Agencia de Envío:</span>
                <span className="font-bold text-[#111111] text-[11px] block">{completedOrder.direccion_agencia_envio}</span>
              </div>
              {completedOrder.referencia_pago && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-[#555555]">N° Referencia:</span>
                  <span className="font-bold font-mono text-emerald-700">{completedOrder.referencia_pago}</span>
                </div>
              )}
              {completedOrder.comprobante_url && (
                <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
                  <span className="text-[#555555]">Comprobante Adjunto:</span>
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Recibido en sistema
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-mono">
                <span className="text-[#111111] font-bold uppercase">Total del Pedido:</span>
                <span className="text-base font-black text-emerald-700">${completedOrder.totalUSD.toFixed(2)} USD (Bs. {formatVES(completedOrder.totalBS)})</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSendToWhatsApp(completedOrder)}
                className="w-full py-3.5 font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-[#25D366]/30 cursor-pointer active:scale-95 transition-all bg-[#25D366] hover:bg-[#20ba5a] text-white border border-[#25D366]"
              >
                <img src="/whatsapp.png" alt="WhatsApp" className="w-5 h-5 object-contain shrink-0 drop-shadow-xs" />
                <span>Ir a WhatsApp y Notificar/enviar copia de pedido</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#111111] text-xs font-black uppercase rounded-xl transition-all cursor-pointer"
              >
                Seguir Comprando
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
        // Obtener el item del catálogo correspondiente para reutilizar la lista unificada de variantes y kit
        const parentCatalogItem = activeQV.grupo_id 
          ? catalogItems.find(it => it.groupId === activeQV.grupo_id || it.id === activeQV.grupo_id)
          : null;

        const qvVariants: Producto[] = (parentCatalogItem 
          ? parentCatalogItem.variants 
          : (activeQV.grupo_id 
              ? sourceProducts.filter(p => p.grupo_id === activeQV.grupo_id && (Number(p.stock_disponible) || 0) > 0).sort((a, b) => {
                  if (a.es_principal_grupo && !b.es_principal_grupo) return -1;
                  if (!a.es_principal_grupo && b.es_principal_grupo) return 1;
                  return (a.variante_nombre || a.nombre).localeCompare(b.variante_nombre || b.nombre);
                })
              : [activeQV])
        ).filter(v => (Number(v.stock_disponible) || 0) > 0);

        const qvImages = getItemImages(
          parentCatalogItem || {
            isGroup: Boolean(activeQV.grupo_id),
            coverProduct: quickViewProduct,
            variants: qvVariants.length > 0 ? qvVariants : [activeQV],
            hasKit: Boolean(activeQV.grupo_tiene_kit),
            kitImage: activeQV.grupo_kit_imagen
          },
          activeQV
        );
        const qvPriceUSD = activeQV.precio_venta_ref || activeQV.precio_mayor || 0;
        const qvPriceBS = qvPriceUSD * tasaBCV;
        const qvInStock = (activeQV.stock_disponible || 0) > 0;

        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setQuickViewProduct(null);
                setQuickViewActiveVariant(null);
                setQuickViewImageIndex(0);
              }
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white border border-gray-200 rounded-3xl w-full max-w-3xl max-h-[calc(100dvh-2.5rem)] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden shadow-2xl animate-scale-up my-auto custom-scrollbar text-[#111111] cursor-default"
            >
              
              {/* Botón X Siempre Fijo en la Esquina Superior Derecha */}
              <button
                type="button"
                onClick={() => {
                  setQuickViewProduct(null);
                  setQuickViewActiveVariant(null);
                  setQuickViewImageIndex(0);
                }}
                className="absolute top-4 right-4 z-30 w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white text-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-xs shrink-0"
                title="Cerrar ventana"
                aria-label="Cerrar ventana"
              >
                <X size={18} strokeWidth={2.5} />
              </button>

              {/* Columna Izquierda: Carrusel Completo */}
              <div className="w-full md:w-1/2 bg-gray-50 p-4 sm:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
                <StoreImageCarousel
                  images={qvImages}
                  currentIndex={quickViewImageIndex}
                  onIndexChange={setQuickViewImageIndex}
                  altText={activeQV.nombre}
                  className="h-60 sm:h-72 md:h-84"
                  showThumbnails={true}
                />
              </div>

              {/* Columna Derecha: Información y Selector Visual de Variantes (Flexbox con altura mínima y justify-between para evitar layout shift) */}
              <div 
                className="w-full md:w-1/2 p-5 sm:p-6 flex flex-col justify-between space-y-4 pr-12 sm:pr-14 min-h-[480px] md:min-h-[520px]"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                {/* Bloque Superior Informativo: 1) Título, 2) Precio (Naranja) y Tasa BCV, 3) Descripción corta */}
                <div className="space-y-3">
                  {/* 1) Título Principal en Title Case sin uppercase forzado */}
                  <h3 className="font-extrabold text-lg sm:text-2xl tracking-tight text-[#111111] leading-tight">
                    {formatTitleCase(activeQV.grupo_nombre || activeQV.nombre)}
                  </h3>

                  {/* 2) Precios: fuente limpia mono en Naranja de Alta Conversión #FF5200 y Tasa BCV */}
                  <div className="pt-0.5 font-mono">
                    <div className="text-2xl sm:text-3xl font-black text-[#FF5200] tracking-tight">
                      ${qvPriceUSD.toFixed(2)} USD
                    </div>
                    <p className="text-xs text-[#4B5563] font-semibold mt-0.5">
                      ≈ Bs. {formatVES(qvPriceBS)} <span className="text-[#4B5563] font-normal text-[10px]">(Tasa BCV: {formatVES(tasaBCV)})</span>
                    </p>
                  </div>

                  {/* Stock info con urgencia inteligente (solo si casi agotado, 5 o menos unidades) */}
                  {activeQV.stock_disponible > 0 && activeQV.stock_disponible <= 5 && (
                    <div>
                      <span className="text-[11px] font-bold text-[#FF5722] flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl inline-flex">
                        <span className="animate-pulse">⏳</span>
                        <span>Casi agotado, quedan solo {activeQV.stock_disponible}</span>
                      </span>
                    </div>
                  )}

                  {/* 3) Descripción corta con espacio reservado fijo (min-h-[60px]) para prevenir layout shift */}
                  <div className="min-h-[60px] flex items-start">
                    <p className="text-xs text-[#555555] leading-relaxed line-clamp-3">
                      {activeQV.palabras_clave || 'Accesorio y repuesto garantizado de alta calidad seleccionado para motocicletas.'}
                    </p>
                  </div>
                </div>

                {/* Zona interactiva agrupada en la parte inferior: 4) Variantes, 5) Cantidad, 6) Botón negro principal */}
                <div 
                  className="sticky bottom-0 z-50 bg-white pt-3 pb-2 sm:pb-0 border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:shadow-none space-y-3 mt-auto shrink-0"
                  style={{ position: 'sticky', bottom: 0, zIndex: 50 }}
                >
                  {/* 4) Selector de Modelo/Variantes */}
                  {qvVariants.length > 1 && (
                    <div className="space-y-1.5">
                      {/* Etiqueta unificada "Modelo:" con truncado en una sola línea para evitar saltos por textos largos */}
                      <div className="flex items-center text-xs min-w-0 overflow-hidden whitespace-nowrap">
                        <span className="text-[#555555] font-semibold flex items-center gap-1.5 shrink-0">
                          <Boxes size={13} className="text-amber-500 shrink-0" />
                          <span>Modelo:</span>
                        </span>
                        <strong 
                          className="text-[#111111] font-bold underline truncate ml-1.5 min-w-0"
                          title={formatTitleCase(activeQV.variante_nombre || activeQV.nombre)}
                        >
                          {formatTitleCase(activeQV.variante_nombre || activeQV.nombre)}
                        </strong>
                      </div>

                      {/* Miniaturas de variantes para QuickView */}
                      <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 custom-scrollbar">
                        {qvVariants.map((v) => {
                          const isSelected = activeQV.id === v.id;
                          const vStock = (v.stock_disponible || 0) > 0;
                          const vImg = formatDirectImageUrl(
                            v.es_kit 
                              ? (parentCatalogItem?.kitImage || v.grupo_kit_imagen || v.variante_imagen_miniatura || v.imagen_url)
                              : (v.variante_imagen_miniatura || v.imagen_portada || v.variante_imagen_hd || v.imagen_url || v.link)
                          );
                          return (
                            <button
                              key={`qv-visual-var-${v.id}`}
                              type="button"
                              onClick={() => {
                                setQuickViewActiveVariant(v);
                                setQuickViewImageIndex(0);
                                setQuickViewQty(1);
                              }}
                              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer relative bg-gray-50 flex items-center justify-center ${
                                isSelected
                                  ? 'border-[#FF5200] ring-2 ring-[#FF5200]/50 scale-105 shadow-sm z-10'
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
                                <span className="text-[8px] font-black text-gray-500 uppercase text-center p-0.5 truncate leading-none">
                                  {v.es_kit ? 'KIT' : (v.variante_nombre || v.nombre).slice(0, 4)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 5) Selector de Cantidad */}
                  {qvInStock && (
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                      <span className="text-xs font-bold text-[#555555]">Cantidad:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickViewQty((prev) => Math.max(1, prev - 1))}
                          disabled={quickViewQty <= 1}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-[#111111] font-bold flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="font-mono font-bold text-[#111111] text-sm w-7 text-center">
                          {quickViewQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickViewQty((prev) => Math.min(activeQV.stock_disponible || 99, prev + 1))}
                          disabled={quickViewQty >= (activeQV.stock_disponible || 99)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-[#111111] font-bold flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6) Botón negro principal (Negro Sólido #000000 con texto en MAYÚSCULAS) */}
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(activeQV, quickViewQty);
                      setQuickViewAdded(true);
                      setTimeout(() => setQuickViewAdded(false), 2200);
                    }}
                    disabled={!qvInStock}
                    className={`w-full py-3 rounded-xl font-black uppercase text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 ${
                      quickViewAdded
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-[#000000] hover:bg-neutral-800 text-white shadow-black/20 disabled:opacity-30'
                    }`}
                  >
                    {quickViewAdded ? (
                      <>
                        <Check size={16} className="stroke-[3]" />
                        <span>¡AGREGADO AL CARRITO ({quickViewQty})!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        <span>AGREGAR AL CARRITO</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* STORE FOOTER (Anclaje de Marca en #0F1115)                 */}
      {/* ========================================================= */}
      <footer className="bg-[#0F1115] border-t border-gray-800 py-10 px-4 sm:px-6 text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <h4 className="font-extrabold text-lg tracking-tight uppercase text-[#FFC107]">
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

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-[11px] font-bold">
            <span className="text-gray-300">Envíos: MRW • Zoom • Tealca • Domesa</span>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <span className="text-emerald-400">Tasa BCV Oficial Garantizada</span>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <a
              href="https://api.whatsapp.com/send?phone=584128276786&text=Hola!%20Deseo%20hacer%20una%20consulta%20en%20la%20tienda%20online"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#25D366] hover:text-[#20ba5a] transition-colors"
              title="Atención directa por WhatsApp (0412-8276786)"
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
    </div>
  );
};
