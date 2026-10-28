import React, { useState, useMemo, useEffect } from 'react';
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
  Boxes
} from 'lucide-react';
import { format } from 'date-fns';
import { collection, doc, setDoc, onSnapshot, query, orderBy, limit, addDoc, writeBatch, increment } from 'firebase/firestore';
import { db, cleanForFirestore } from '../lib/firebase';
import { Producto, CartItem, PedidoTienda, PedidoTiendaItem, GlobalFinancialSettings, StoreCustomTexts, PaymentMethodConfig } from '../types';
import { formatDirectImageUrl, extractDriveFileId } from '../utils/imageUrlHelper';
import { removeAccents, matchesSearch, getCategoryKey, formatCategoryDisplay, getProductCategoryKeys, getProductCategoryNames } from '../utils/textUtils';
import { compressAndResizeImage } from '../utils/fileHelpers';
import { StoreCategoriesModal } from './StoreCategoriesModal';
import { StoreTextEditorModal, DEFAULT_STORE_TEXTS } from './StoreTextEditorModal';
import { EditableStoreText } from './EditableStoreText';
import { PaymentMethodsEditorModal } from './PaymentMethodsEditorModal';
import { DEFAULT_PAYMENT_METHODS } from '../constants/defaultPaymentMethods';

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
        className={`relative w-full ${className} bg-[#07090e] rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group/img transition-transform`}
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
          <div className="flex flex-col items-center gap-1 text-slate-600">
            <Package size={28} />
            <span className="text-[8.5px] font-bold uppercase">Sin foto</span>
          </div>
        )}

        {/* Indicador flotante Ver Detalle al pasar el cursor */}
        {onOpenDetail && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="px-2 py-0.5 bg-black/80 text-amber-300 rounded-md text-[8.5px] font-black uppercase flex items-center gap-1 border border-amber-400/30 shadow-md">
              <Eye size={11} /> Ver Detalle
            </span>
          </div>
        )}

        {/* Contador de Fotos (ej: 1/4) - Solo si hay más de 1 foto */}
        {validImages.length > 1 && (
          <div className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-amber-300 border border-amber-400/30 px-1 py-0.5 rounded text-[7.5px] font-mono font-black z-10 pointer-events-none shadow-sm">
            {safeIndex + 1}/{validImages.length}
          </div>
        )}

        {/* Flecha Lateral Izquierda (<) - Solo si hay más de 1 foto */}
        {validImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto anterior"
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/75 hover:bg-black/95 text-white hover:text-amber-300 flex items-center justify-center border border-white/20 hover:border-amber-400/80 shadow-md cursor-pointer z-20 transition-all active:scale-90 opacity-90 sm:opacity-0 sm:group-hover/img:opacity-100"
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
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/75 hover:bg-black/95 text-white hover:text-amber-300 flex items-center justify-center border border-white/20 hover:border-amber-400/80 shadow-md cursor-pointer z-20 transition-all active:scale-90 opacity-90 sm:opacity-0 sm:group-hover/img:opacity-100"
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
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md overflow-hidden shrink-0 border transition-all cursor-pointer relative bg-black/60 ${
                  isSelectedThumb
                    ? 'border-amber-400 ring-1 ring-amber-400/50 scale-105 opacity-100 shadow-sm'
                    : 'border-white/10 opacity-55 hover:opacity-100 hover:border-white/40'
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

// Helper para reunir ÚNICAMENTE las fotos disponibles de la variante activa (Galería del modelo actual)
const getItemImages = (
  item: { isGroup: boolean; coverProduct: Producto; variants: Producto[] },
  activeVariant: Producto
): string[] => {
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

  // Deduplicar manteniendo el orden de prioridad
  const seen = new Set<string>();
  const uniqueList: string[] = [];
  imagesList.forEach(url => {
    const clean = url?.trim();
    if (clean && !seen.has(clean)) {
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
  isAdmin = true
}) => {
  // Exchange rate fallback if not provided in props
  const [syncedTasaBCV, setSyncedTasaBCV] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('biker_store_tasa_bcv');
      return saved ? parseFloat(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'configuracion', 'financiera'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data.tasaBCV === 'number' && data.tasaBCV > 0) {
            setSyncedTasaBCV(data.tasaBCV);
            try { localStorage.setItem('biker_store_tasa_bcv', String(data.tasaBCV)); } catch {}
          }
        }
      }, () => {});
      return () => unsub();
    } catch {}
  }, []);

  const tasaBCV = financialSettings.tasaBCV > 0 ? financialSettings.tasaBCV : (syncedTasaBCV > 0 ? syncedTasaBCV : 1);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'destacados' | 'precio_asc' | 'precio_desc' | 'nombre'>('destacados');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);

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

  // Categories list (Deduplicadas canónicamente y filtrando categorías no comerciales, con soporte de múltiples categorías por producto)
  const categories = useMemo(() => {
    const catMap = new Map<string, string>();
    sourceProducts.forEach((p) => {
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

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = sourceProducts.filter((p) => {
      // Must have price
      const hasPrice = (p.precio_venta_ref && p.precio_venta_ref > 0) || (p.precio_mayor && p.precio_mayor > 0);
      if (!hasPrice) return false;

      // Ocultar productos de categorías desactivadas (ej: embalaje, uso interno) si todas sus categorías están ocultas
      const prodKeys = getProductCategoryKeys(p);
      if (prodKeys.length > 0 && prodKeys.every((k) => hiddenCategories.includes(k))) {
        return false;
      }

      // Stock filter
      if (onlyInStock && (!p.stock_disponible || p.stock_disponible <= 0)) {
        return false;
      }

      // Category filter (coincidencia con cualquiera de sus categorías asignadas)
      if (selectedCategory !== 'all') {
        const targetKey = getCategoryKey(selectedCategory);
        if (!prodKeys.includes(targetKey)) {
          return false;
        }
      }

      // Search match
      if (searchQuery.trim()) {
        const matchName = matchesSearch(p.nombre, searchQuery);
        const matchSku = matchesSearch(p.sku, searchQuery);
        const matchCat = matchesSearch(p.categoria, searchQuery) || (Array.isArray(p.categorias) && p.categorias.some(c => matchesSearch(c, searchQuery)));
        const matchKeywords = matchesSearch(p.palabras_clave, searchQuery);
        const matchGroup = p.grupo_nombre ? matchesSearch(p.grupo_nombre, searchQuery) : false;
        const matchVariant = p.variante_nombre ? matchesSearch(p.variante_nombre, searchQuery) : false;
        if (!matchName && !matchSku && !matchCat && !matchKeywords && !matchGroup && !matchVariant) {
          return false;
        }
      }

      return true;
    });

    // Sorting
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
  }, [sourceProducts, searchQuery, selectedCategory, sortBy, onlyInStock, hiddenCategories]);

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
        // Ordenar variantes: la principal de portada primero, luego alfabéticamente por nombre de variante
        variants.sort((a, b) => {
          if (a.es_principal_grupo && !b.es_principal_grupo) return -1;
          if (!a.es_principal_grupo && b.es_principal_grupo) return 1;
          return (a.variante_nombre || a.nombre).localeCompare(b.variante_nombre || b.nombre);
        });

        const cover = variants.find(v => v.es_principal_grupo) || variants[0];
        const validPrices = variants.map(v => v.precio_venta_ref || v.precio_mayor || 0).filter(pr => pr > 0);
        const priceMin = validPrices.length > 0 ? Math.min(...validPrices) : (cover.precio_venta_ref || cover.precio_mayor || 0);
        const priceMax = validPrices.length > 0 ? Math.max(...validPrices) : (cover.precio_venta_ref || cover.precio_mayor || 0);
        const totalStock = variants.reduce((sum, v) => sum + (v.stock_disponible || 0), 0);

        items.push({
          id: p.grupo_id,
          isGroup: true,
          groupId: p.grupo_id,
          title: cover.grupo_nombre || cover.nombre,
          coverProduct: cover,
          variants,
          priceMin,
          priceMax,
          totalStock,
          categoria: cover.categoria,
          categorias: cover.categorias,
          palabras_clave: cover.palabras_clave
        });
      } else {
        const price = p.precio_venta_ref || p.precio_mayor || 0;
        items.push({
          id: p.id,
          isGroup: false,
          title: p.nombre,
          coverProduct: p,
          variants: [p],
          priceMin: price,
          priceMax: price,
          totalStock: p.stock_disponible || 0,
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
    const unitPrice = product.precio_venta_ref || product.precio_mayor || 0;
    if (unitPrice <= 0) return;

    // Si el producto pertenece a un grupo y tiene variante_nombre, formatear el título limpio para el carrito
    const displayProduct = (product.grupo_nombre && product.variante_nombre)
      ? { ...product, nombre: `${product.grupo_nombre} (${product.variante_nombre})` }
      : product;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.product.id === displayProduct.id);
      if (existingIdx >= 0) {
        return prevCart.map((item, idx) => {
          if (idx === existingIdx) {
            const newQty = item.quantity + qty;
            return {
              ...item,
              quantity: newQty,
              subtotal: Number((item.precio_unitario * newQty).toFixed(2))
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

  // Helper to open QuickView modal and initialize variant & quantity
  const openQuickView = (variant: Producto) => {
    setQuickViewProduct(variant);
    setQuickViewActiveVariant(variant);
    setQuickViewImageIndex(0);
    setQuickViewQty(1);
    setQuickViewAdded(false);
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
        subtotal: item.subtotal
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
            productId: it.productId || ''
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

        // Deduct inventory in 'productos'
        const batch = writeBatch(db);
        orderItems.forEach((it) => {
          if (it.productId) {
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

  // Formato monetario venezolano exacto: punto para miles y coma para decimales (ej: 19.520,64)
  const formatVES = (val: number): string => {
    const fixed = (val || 0).toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${withDots},${decPart}`;
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

    let text = `🏍️ *NUEVO PEDIDO: LO QUE LOS BIKERS QUIEREN*\n`;
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
    text += `• *Monto a transferir:* Bs. ${formatVES(order.totalBS)}`;

    if (order.referencia_pago) {
      text += `\n• *Referencia:* ${order.referencia_pago}`;
    }
    if (order.notas_cliente) {
      text += `\n• *Notas:* ${order.notas_cliente}`;
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
    const url = window.location.origin + window.location.pathname + '?tienda=true';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-amber-500 selection:text-black pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* ========================================================= */}
      {/* TOP ANNOUNCEMENT BAR (OPTIMIZADA PARA MÓVIL Y NOTCH)       */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-black px-3 py-2 pt-[max(1.1rem,calc(env(safe-area-inset-top)+0.4rem))] text-[10px] sm:text-xs font-black tracking-wide flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar">
          <span className="flex items-center gap-1 uppercase">
            <Truck size={14} className="stroke-[2.5]" />
            <EditableStoreText
              textKey="topAnnouncement"
              value={getText('topAnnouncement')}
              isAdmin={isAdmin}
              onOpenEditor={handleOpenTextEditorFor}
              as="span"
              pencilClassName="text-black"
            />
          </span>
          <span className="opacity-40">|</span>
          <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded">
            💵 Tasa Oficial BCV: Bs. {tasaBCV.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyStoreLink}
            className="hidden sm:flex items-center gap-1 bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded text-[9.5px] uppercase font-black transition-colors cursor-pointer"
            title="Copiar enlace para compartir esta tienda con clientes"
          >
            {copiedLink ? <Check size={11} /> : <Share2 size={11} />}
            <span>{copiedLink ? '¡Enlace Copiado!' : 'Compartir Tienda'}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setTextEditorInitialKey(null);
                setIsTextEditorOpen(true);
              }}
              className="bg-black/50 hover:bg-black/70 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded text-[9.5px] uppercase font-black transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              title="Editar todos los textos fijos, títulos y aclaratorias del e-commerce"
            >
              <Edit3 size={11} className="text-amber-400" />
              <span>Editar Textos</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="bg-black/40 hover:bg-black/60 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[9.5px] uppercase font-black transition-colors cursor-pointer flex items-center gap-1"
              title="Configurar qué categorías se muestran a los clientes"
            >
              <Sliders size={11} className="text-amber-400" />
              <span className="hidden sm:inline">Categorías Visibles</span>
              <span className="sm:hidden">Categorías</span>
            </button>
          )}

          {isAdmin && onExitToAdmin && (
            <button
              type="button"
              onClick={onExitToAdmin}
              className="bg-black text-amber-400 hover:text-white px-2 py-0.5 rounded text-[9.5px] uppercase font-black transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft size={11} />
              <span>Volver</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN STORE HEADER                                         */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-[#0a0d14]/95 backdrop-blur-xl border-b border-amber-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4">
{/* LOGO PRINCIPAL */}
    <div className="flex items-center gap-3 shrink-0">
      <div className="flex items-center">
        <img src="/logo png.png" alt="Lo que los bikers quieren" className="h-16 sm:h-20 w-auto object-contain drop-shadow-sm" />
      </div>
      <div className="hidden sm:block">
        <EditableStoreText textKey="headerSubtitle" value={getText('headerSubtitle')} isAdmin={isAdmin} onOpenEditor={handleOpenTextEditorFor} as="p" className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider" />
      </div>
    </div>

          {/* OMNI SEARCH BAR (ESTILO AMAZON / MERCADO LIBRE) */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cascos, guantes, luces, alarmas, accesorios para motos..."
                className="w-full bg-[#121622] border-2 border-white/10 focus:border-amber-400/80 rounded-2xl pl-11 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition-all shadow-inner font-medium"
              />
              <Search size={16} className="absolute left-4 text-amber-400 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* TOP BAR CART BUTTON */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 bg-[#0e121b] hover:bg-[#151b27] text-white border-2 border-amber-400 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-black text-xs uppercase shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart size={18} className="text-amber-400 stroke-[2.5]" />
                {cartTotals.totalUnits > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 min-w-[19px] h-[19px] px-1 rounded-full bg-red-600 text-white text-[9.5px] font-black flex items-center justify-center border-2 border-[#0e121b] animate-scale-up">
                    {cartTotals.totalUnits}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <span className="text-[9.5px] block text-amber-300 font-black uppercase tracking-wider">Carrito</span>
                <span className="font-mono font-black text-xs text-white">${cartTotals.totalUSD.toFixed(2)}</span>
              </div>
            </button>
          </div>
        </div>

        {/* MOBILE SEARCH BAR */}
        <div className="px-3 pb-2.5 md:hidden">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar accesorios para motos, cascos, luces, guantes..."
              className="w-full bg-[#121622] border border-white/10 focus:border-amber-400 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
            />
            <Search size={14} className="absolute left-3 text-amber-400 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 p-1"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* HORIZONTAL CATEGORIES CAROUSEL */}
        <div className="bg-[#0e121b] border-t border-white/5 px-3 sm:px-6 py-2 overflow-x-auto flex items-center gap-1.5 sm:gap-2 custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            🔥 Todos los Productos
          </button>

          {categories.map((cat, catIdx) => {
            const isSelected = getCategoryKey(selectedCategory) === getCategoryKey(cat);
            return (
              <button
                key={`biker-cat-${cat}-${catIdx}`}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                    : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </header>

      {/* ========================================================= */}
      {/* HERO BANNER BIKER                                         */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0a0d14] via-[#0f1422] to-[#07090e] border-b border-white/10 py-4 sm:py-6 px-3 sm:px-6">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl text-center md:text-left">
          
            <EditableStoreText
              textKey="heroSubtitle"
              value={getText('heroSubtitle')}
              isAdmin={isAdmin}
              onOpenEditor={handleOpenTextEditorFor}
              as="p"
              className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl"
            />

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 pt-1 text-[10px] sm:text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <EditableStoreText
                  textKey="badgeProtected"
                  value={getText('badgeProtected')}
                  isAdmin={isAdmin}
                  onOpenEditor={handleOpenTextEditorFor}
                  as="span"
                />
              </span>
              <span className="flex items-center gap-1.5">
                <Truck size={13} className="text-amber-400" />
                <EditableStoreText
                  textKey="badgeDispatch"
                  value={getText('badgeDispatch')}
                  isAdmin={isAdmin}
                  onOpenEditor={handleOpenTextEditorFor}
                  as="span"
                />
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-cyan-400" />
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

          {/* QUICK PROMO CARD */}
          <div className="w-full max-w-sm bg-gradient-to-tr from-black/80 to-[#141926] border-2 border-amber-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl relative">
            <span className="absolute -top-2.5 right-4 bg-amber-400 text-black text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
              ⚡ Envíos Diarios
            </span>
            <div className="space-y-1.5">
              <EditableStoreText
                textKey="stepsBoxTitle"
                value={getText('stepsBoxTitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="p"
                className="text-[9.5px] font-black uppercase tracking-wider text-amber-400"
              />
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <EditableStoreText
                    textKey="step1"
                    value={getText('step1')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="span"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <EditableStoreText
                    textKey="step2"
                    value={getText('step2')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="span"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
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
      <main className="max-w-7xl mx-auto px-2.5 sm:px-4 py-3 sm:py-5 space-y-3 sm:space-y-4">
        {/* FILTERS TOOLBAR */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <EditableStoreText
                textKey="catalogTitle"
                value={getText('catalogTitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="span"
                className="font-anton text-lg tracking-wide uppercase text-white"
              />
              <span className="font-anton text-lg tracking-wide uppercase text-amber-400">
                ({catalogItems.length})
              </span>
            </div>
            {selectedCategory !== 'all' && (
              <span className="text-[10px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                {selectedCategory}
              </span>
            )}
            {searchQuery && (
              <span className="text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                Búsqueda: "{searchQuery}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Solo en stock */}
            <label className="flex items-center gap-2 bg-[#121622] px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-400 rounded"
              />
              <span>Solo en Stock</span>
            </label>

            {/* Ordenar por */}
            <div className="flex items-center gap-1.5 bg-[#121622] px-2.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300">
              <SlidersHorizontal size={13} className="text-amber-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-white outline-none cursor-pointer font-bold"
              >
                <option value="destacados" className="bg-[#121622]">Destacados</option>
                <option value="precio_asc" className="bg-[#121622]">Menor Precio</option>
                <option value="precio_desc" className="bg-[#121622]">Mayor Precio</option>
                <option value="nombre" className="bg-[#121622]">Nombre (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* PRODUCTS GRID (ESTILO CONSOLIDADO CON VARIANTES) */}
        {isLoadingProducts && sourceProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4.5 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={`skel-${n}`} className="bg-[#101420] border border-white/5 rounded-3xl p-3.5 space-y-3">
                <div className="w-full aspect-square bg-white/5 rounded-2xl" />
                <div className="h-4 bg-white/10 rounded-lg w-3/4" />
                <div className="h-6 bg-white/10 rounded-lg w-1/2" />
                <div className="h-8 bg-white/5 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : catalogItems.length === 0 ? (
          <div className="py-20 text-center space-y-4 border-2 border-dashed border-white/10 rounded-3xl bg-[#0e121b]/50 max-w-lg mx-auto p-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
              <ShoppingBag size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-anton text-xl uppercase tracking-wide text-white">No se encontraron productos</h3>
              <p className="text-xs text-slate-400">
                Intenta ajustar tu búsqueda o selecciona otra categoría en el menú superior.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setOnlyInStock(false);
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-md"
            >
              Ver Todo el Catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
            {catalogItems.map((item, itemIdx) => {
              const activeVariant = item.variants.find(v => v.id === selectedVariantMap[item.id]) || item.coverProduct;
              const itemImages = getItemImages(item, activeVariant);
              const currentImageIndex = cardImageIndexMap[item.id] || 0;
              const priceUSD = activeVariant.precio_venta_ref || activeVariant.precio_mayor || 0;
              const priceBS = priceUSD * tasaBCV;
              const currentStock = activeVariant.stock_disponible ?? item.totalStock ?? 0;
              const isVariantInStock = (activeVariant.stock_disponible || 0) > 0;
              const isJustAdded = addedAnimationId === activeVariant.id;

              return (
                <div
                  key={`biker-cat-item-${item.id}-${itemIdx}`}
                  className="bg-[#101420] hover:bg-[#141a29] border border-white/10 hover:border-amber-400/50 rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-300 group shadow-lg hover:shadow-amber-500/10 relative overflow-hidden"
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1 mb-1.5 z-10 flex-wrap">
                    <div className="flex items-center gap-1">
                      {item.categoria ? (
                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 truncate max-w-[90px]">
                          {item.categoria}
                        </span>
                      ) : (
                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/20">
                          Biker
                        </span>
                      )}

                      {/* Badge de Variantes Agrupadas */}
                      {item.isGroup && (
                        <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 flex items-center gap-0.5 shadow-sm">
                          <Boxes size={8} /> {item.variants.length}
                        </span>
                      )}
                    </div>

                    {/* Indicador Inteligente de Stock (Oculto si > 6, Urgencia si <= 6) */}
                    {currentStock <= 0 ? (
                      <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                        Agotado
                      </span>
                    ) : currentStock <= 6 ? (
                      <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/25 text-orange-300 border border-orange-500/40 flex items-center gap-0.5 shrink-0 shadow-sm">
                        <span className="animate-pulse">⏳</span>
                        <span>Casi agotado</span>
                      </span>
                    ) : null}
                  </div>

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
                      onOpenDetail={() => openQuickView(activeVariant)}
                      showThumbnails={true}
                    />
                  </div>

                  {/* Product Info */}
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Name / Título General Compacto */}
                      <h4 
                        onClick={() => openQuickView(activeVariant)}
                        className="font-bold text-[11px] sm:text-xs text-white line-clamp-1 hover:text-amber-300 transition-colors cursor-pointer leading-tight"
                        title={item.title}
                      >
                        {item.title}
                      </h4>

                      {/* Selector Visual de Variantes por Miniaturas (ÚNICA zona donde aparecen los modelos) */}
                      {item.isGroup && item.variants.length > 1 && (
                        <div className="pt-1 pb-0.5 space-y-0.5">
                          <div className="flex items-center justify-between text-[7.5px]">
                            <span className="text-slate-400 font-bold uppercase flex items-center gap-1 truncate max-w-[140px]">
                              <Boxes size={8} className="text-amber-400 shrink-0" />
                              <span className="text-slate-400">Modelo:</span>
                              <strong className="text-amber-300 truncate">
                                {activeVariant.variante_nombre || activeVariant.nombre}
                              </strong>
                            </span>
                            <span className="text-[7px] font-mono text-slate-500 shrink-0">
                              {item.variants.length} opc.
                            </span>
                          </div>

                          {/* Tira de Miniaturas Visuales de Modelos Diferentes */}
                          <div className="flex items-center gap-1 overflow-x-auto py-0.5 px-0.5 custom-scrollbar">
                            {item.variants.map((v) => {
                              const isSelected = activeVariant.id === v.id;
                              const vInStock = (v.stock_disponible || 0) > 0;
                              const vImg = formatDirectImageUrl(v.variante_imagen_miniatura || v.imagen_portada || v.variante_imagen_hd || v.imagen_url || v.link);
                              return (
                                <button
                                  key={`v-visual-thumb-${item.id}-${v.id}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVariantMap(prev => ({ ...prev, [item.id]: v.id }));
                                    setCardImageIndexMap(prev => ({ ...prev, [item.id]: 0 }));
                                  }}
                                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden shrink-0 border transition-all cursor-pointer relative bg-black/60 flex items-center justify-center ${
                                    isSelected
                                      ? 'border-amber-400 ring-1 ring-amber-400/50 scale-105 shadow-sm shadow-amber-400/25 z-10'
                                      : vInStock
                                      ? 'border-white/15 opacity-75 hover:opacity-100 hover:border-white/40'
                                      : 'border-white/5 opacity-40 line-through'
                                  }`}
                                  title={`${v.variante_nombre || v.nombre} - $${(v.precio_venta_ref || v.precio_mayor || 0).toFixed(2)} USD`}
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
                                    <span className="text-[7px] font-black text-slate-400 uppercase text-center p-0.5 truncate leading-none">
                                      {(v.variante_nombre || v.nombre).slice(0, 3)}
                                    </span>
                                  )}
                                  {!vInStock && (
                                    <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-rose-400 text-[7px] font-black">
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

                    {/* Price section compacta */}
                    <div className="pt-1 border-t border-white/5 space-y-0.5 font-mono">
                      <div className="flex items-baseline gap-1 flex-wrap">
                        {item.isGroup && item.priceMin !== item.priceMax && !selectedVariantMap[item.id] ? (
                          <>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Desde</span>
                            <span className="text-sm sm:text-base font-extrabold text-amber-400 tracking-tight"> ${item.priceMin.toFixed(2)} - ${item.priceMax.toFixed(2)} </span>
                            <span className="text-[10px] font-semibold text-slate-300">USD</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm sm:text-base font-extrabold text-amber-400 tracking-tight"> ${priceUSD.toFixed(2)} </span>
                            <span className="text-[10px] font-semibold text-slate-300">USD</span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[10.5px] font-medium text-slate-400 leading-tight">
                        ≈ Bs. {priceBS.toFixed(2)}
                      </div>
                    </div>

                    {/* Action Buttons Compactos: Abren la ventana de detalle para seleccionar modelo y cantidad */}
                    <div className="pt-1.5 space-y-1">
                      <button
                        type="button"
                        onClick={() => openQuickView(activeVariant)}
                        disabled={!isVariantInStock}
                        className="w-full py-1.5 rounded-lg text-[9.5px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-md bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20 disabled:bg-white/5 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        <ShoppingCart size={11} className="stroke-[2.5]" />
                        <span>Agregar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openQuickView(activeVariant)}
                        disabled={!isVariantInStock}
                        className="w-full py-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 hover:text-white rounded-lg text-[8.5px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span>Comprar Ahora</span>
                        <ArrowRight size={9} />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="w-full max-w-md bg-[#0e121b] border-l border-amber-500/30 h-full flex flex-col shadow-2xl animate-slide-left">
            {/* Header Drawer */}
            <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 bg-[#0a0d14] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <EditableStoreText
                    textKey="cartDrawerTitle"
                    value={getText('cartDrawerTitle')}
                    isAdmin={isAdmin}
                    onOpenEditor={handleOpenTextEditorFor}
                    as="h3"
                    className="font-anton text-base uppercase tracking-wider text-white leading-none"
                  />
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5">
                    {cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500/60 hover:border-red-600 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md shadow-red-500/20 shrink-0"
                title="Cerrar carrito"
                aria-label="Cerrar carrito"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            {/* List of items */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 text-slate-600 flex items-center justify-center mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <p className="font-anton text-base uppercase text-slate-400">Tu carrito está vacío</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Explora nuestro catálogo de accesorios para motos para agregar productos a tu compra.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 bg-amber-400 text-black text-xs font-black uppercase rounded-xl cursor-pointer"
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
                      className="bg-[#141824] border border-white/5 rounded-2xl p-3 flex items-center gap-3 relative group"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {img ? (
                          <img src={img} alt={item.product.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-slate-600" />
                        )}
                      </div>

                      {/* Info & Quantity */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs text-white truncate">
                          {item.product.nombre}
                        </h5>
                        <p className="text-[10px] font-mono text-amber-400 font-bold mt-0.5">
                          ${item.precio_unitario.toFixed(2)} USD <span className="text-slate-400 font-normal">c/u</span>
                        </p>

                        {/* Stepper */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="inline-flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.product.id, item.quantity - 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 font-black cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-xs text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.product.id, item.quantity + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 font-black cursor-pointer text-xs"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-mono font-black text-xs text-white">
                            ${item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors cursor-pointer"
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
              <div className="p-4 border-t border-white/10 bg-[#0a0d14] space-y-3 font-mono">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Subtotal USD:</span>
                    <span className="font-bold text-white">${cartTotals.totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Equivalente en Bolívares:</span>
                    <span className="font-bold text-amber-300">Bs. {cartTotals.totalBS.toFixed(2)}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-white/10">
                    <span className="font-anton text-sm uppercase text-slate-300">Total a Pagar:</span>
                    <span className="font-anton text-2xl text-amber-400">${cartTotals.totalUSD.toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 cursor-pointer active:scale-98 transition-all"
                  >
                    <span>Finalizar Compra y Datos de Envío</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto">
          <div className="bg-[#0e121b] border-2 border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden shadow-2xl animate-scale-up my-auto">
            {/* Modal Header: Título y Ruta de Pasos integrados en la misma tarjeta */}
            <div className="p-3.5 sm:p-4 border-b border-white/10 bg-[#0a0d14] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-black shrink-0">
                    <Truck size={17} />
                  </div>
                  <div>
                    <EditableStoreText
                      textKey="checkoutModalTitle"
                      value={getText('checkoutModalTitle')}
                      isAdmin={isAdmin}
                      onOpenEditor={handleOpenTextEditorFor}
                      as="h3"
                      className="font-anton text-base sm:text-lg uppercase tracking-wider text-white leading-none"
                    />
                    <EditableStoreText
                      textKey="checkoutModalSubtitle"
                      value={getText('checkoutModalSubtitle')}
                      isAdmin={isAdmin}
                      onOpenEditor={handleOpenTextEditorFor}
                      as="p"
                      className="text-[9.5px] sm:text-[10.5px] text-slate-400 font-bold uppercase mt-0.5"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500/60 hover:border-red-600 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md shadow-red-500/20 shrink-0"
                  title="Cerrar ventana"
                  aria-label="Cerrar ventana"
                >
                  <X size={17} strokeWidth={3} />
                </button>
              </div>

              {/* Barra de Ruta (Pasos 1 y 2) dentro de la tarjeta de cabecera */}
              <div className="flex items-center justify-between bg-black/50 border border-white/10 rounded-xl p-2 px-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setOrderFormError(null);
                    setCheckoutStep(1);
                  }}
                  className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                    checkoutStep === 1 ? 'text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    checkoutStep === 1 ? 'bg-amber-400 text-black' : 'bg-emerald-500 text-black'
                  }`}>
                    {checkoutStep === 2 ? '✓' : '1'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold">1. Llenar datos para el envío</span>
                </button>

                <div className="flex-1 mx-2 sm:mx-3 h-0.5 bg-white/10 relative">
                  <div className={`h-full bg-amber-400 transition-all duration-300 ${checkoutStep === 2 ? 'w-full' : 'w-0'}`} />
                </div>

                <div className={`flex items-center gap-1.5 ${
                  checkoutStep === 2 ? 'text-amber-300' : 'text-slate-500 opacity-60'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    checkoutStep === 2 ? 'bg-amber-400 text-black' : 'bg-white/10 text-slate-400'
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
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-shake">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{orderFormError}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASO 1: DATOS PERSONALES Y ENCOMIENDA                    */}
              {/* ========================================================= */}
              {checkoutStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                    <User size={15} className="text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Información Personal & Encomienda
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. NOMBRE */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                        <span>1. Nombre Completo *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        placeholder="Ej: Carlos Rodriguez"
                        className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 p-3 rounded-xl text-white text-xs font-bold outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>

                    {/* 2. NÚMERO DE CÉDULA */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                        <span>2. Número de Cédula (V / E) *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteCedula}
                        onChange={(e) => setClienteCedula(e.target.value)}
                        placeholder="Ej: V-19.456.789"
                        className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 p-3 rounded-xl text-white text-xs font-bold outline-none transition-all placeholder:text-slate-600 font-mono"
                      />
                    </div>

                    {/* 3. TELÉFONO */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                        <span>3. Teléfono / WhatsApp *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        placeholder="Ej: 0412-1234567"
                        className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 p-3 rounded-xl text-white text-xs font-bold outline-none transition-all placeholder:text-slate-600 font-mono"
                      />
                    </div>

                    {/* AGENCIA DE ENVÍO SELECTOR */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                        <span>Empresa de Encomiendas</span>
                      </label>
                      <select
                        value={agenciaSeleccionada}
                        onChange={(e) => setAgenciaSeleccionada(e.target.value as any)}
                        className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 p-3 rounded-xl text-white text-xs font-bold outline-none cursor-pointer"
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                        <MapPin size={11} className="text-amber-400" />
                        <span>4. Dirección de la Agencia de Envío *</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={direccionAgencia}
                        onChange={(e) => setDireccionAgencia(e.target.value)}
                        placeholder="Ej: Agencia MRW San Cristóbal Centro, Calle 5 con Carrera 8, Estado Táchira (Código: 1234)"
                        className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 p-3 rounded-xl text-white text-xs font-medium outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Resumen sutil al final del formulario: texto pequeño para priorizar el llenado de datos */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag size={13} className="text-amber-400" />
                        <span>{cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'producto en orden' : 'productos en orden'}</span>
                      </span>
                      <span className="font-mono text-right">
                        Total: <strong className="text-amber-400 font-extrabold">${cartTotals.totalUSD.toFixed(2)} USD</strong> <span className="text-slate-400 font-normal text-[10px]">(≈ Bs. {cartTotals.totalBS.toFixed(2)})</span>
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
                      className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-anton tracking-wider text-base uppercase rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 cursor-pointer active:scale-98 transition-all"
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
                  {/* Micro Progreso Compacto */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep(1)}
                        className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <span>✓ 1. Llenar datos para el envío</span>
                      </button>
                      <span className="text-slate-600">›</span>
                      <span className="text-amber-400 font-black">2. Pago y Confirmación</span>
                    </div>
                    <span className="font-mono text-amber-300 font-extrabold text-xs">
                      ${cartTotals.totalUSD.toFixed(2)} USD
                    </span>
                  </div>

                  {/* SECCIÓN 1: MÉTODOS DE PAGO Y DATOS BANCARIOS */}
                  <div className="bg-[#0c101a] border border-white/10 rounded-2xl p-3 space-y-2.5">
                    {/* Botones de Métodos de Pago */}
                    <div>
                      <div className="flex items-center justify-between pb-1 flex-wrap gap-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                          <CreditCard size={12} className="text-amber-400" />
                          <span>Métodos de Pago</span>
                        </label>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setIsPaymentMethodsModalOpen(true)}
                            className="text-[9.5px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-colors"
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
                                  ? 'bg-amber-400 text-black border-amber-400 font-black shadow-sm'
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              {method.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Monto exacto a pagar (USD y Bs BCV) */}
                    <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-amber-300/80 block">Monto Exacto a Pagar:</span>
                        <span className="font-mono text-base font-extrabold text-amber-400">${cartTotals.totalUSD.toFixed(2)} USD</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">En Bolívares (BCV {tasaBCV.toFixed(2)}):</span>
                        <span className="font-mono font-bold text-white text-sm">Bs. {cartTotals.totalBS.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Datos Bancarios Copiables */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-0.5">
                        <span>Datos para transferir ({selectedPaymentMethod?.nombre || metodoPago}):</span>
                        <span className="text-amber-400">Toca para copiar</span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        {selectedPaymentMethod && selectedPaymentMethod.campos && selectedPaymentMethod.campos.length > 0 ? (
                          selectedPaymentMethod.campos.map((campo, cIdx) => (
                            <div
                              key={campo.id || `campo-${cIdx}`}
                              className="flex justify-between items-center bg-[#07090e] p-1.5 px-2.5 rounded-xl border border-white/5 gap-2"
                            >
                              <span className="text-slate-400 text-[10.5px] shrink-0">{campo.etiqueta}:</span>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="font-bold text-amber-300 font-mono truncate text-right text-xs">
                                  {campo.valor}
                                </span>
                                {campo.copiable !== false && campo.valor && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBankData(campo.valor, `field_${campo.id || cIdx}`)}
                                    className="text-[9.5px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0 font-bold"
                                  >
                                    {copiedBankField === `field_${campo.id || cIdx}` ? (
                                      <Check size={10} className="text-emerald-400" />
                                    ) : (
                                      <Copy size={10} />
                                    )}
                                    <span>{copiedBankField === `field_${campo.id || cIdx}` ? '¡Copiado!' : 'Copiar'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10.5px] text-slate-400 py-1">
                            No hay datos registrados para este método.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: COMPROBANTE DE PAGO (Solo subida de imagen, sin campo de referencia) */}
                  {tipoConfirmacion === 'comprobante' && (
                    <div className="bg-[#0c101a] border border-emerald-500/30 rounded-2xl p-3 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Receipt size={12} className="text-emerald-400" />
                          <span>Adjuntar Comprobante de Pago (Captura o Foto) *</span>
                        </span>
                        <span className="text-[9px] text-emerald-400/80 font-normal">Requerido</span>
                      </label>

                      {comprobanteUrl ? (
                        <div className="bg-[#07090e] border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <img
                              src={comprobanteUrl}
                              alt="Comprobante de pago"
                              className="w-11 h-11 object-cover rounded-lg border border-emerald-500/30 shrink-0"
                            />
                            <div className="overflow-hidden">
                              <span className="text-xs font-bold text-emerald-300 block truncate">
                                {comprobanteFileName || 'comprobante_pago.jpg'}
                              </span>
                              <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1">
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
                            className="text-rose-400 hover:text-rose-300 text-[10px] font-bold py-1 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 shrink-0 cursor-pointer"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/30 transition-all rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer text-center group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptFileChange}
                            className="hidden"
                            disabled={isUploadingReceipt}
                          />
                          {isUploadingReceipt ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold py-1.5">
                              <RotateCcw size={14} className="animate-spin text-emerald-400" />
                              <span>Optimizando comprobante...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 py-1">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                <Upload size={15} />
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-bold text-white group-hover:text-emerald-300 block">
                                  Toca para subir captura o foto
                                </span>
                                <span className="text-[9.5px] text-slate-400 block">
                                  PNG, JPG o captura de pantalla
                                </span>
                              </div>
                            </div>
                          )}
                        </label>
                      )}
                    </div>
                  )}

                  {/* SECCIÓN 3: MODO DE CONFIRMACIÓN (Botones limpios con texto multilínea sin desbordar) */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Opción 1: Pagar y subir comprobante */}
                      <button
                        type="button"
                        onClick={() => setTipoConfirmacion('comprobante')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 min-h-[60px] ${
                          tipoConfirmacion === 'comprobante'
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400/40'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="text-sm shrink-0 mt-0.5">⚡</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-white block leading-snug break-words">
                              Pagar y subir comprobante
                            </span>
                            <EditableStoreText
                              textKey="optionReceiptBadge"
                              value={getText('optionReceiptBadge')}
                              isAdmin={isAdmin}
                              onOpenEditor={handleOpenTextEditorFor}
                              as="span"
                              className="text-[9.5px] text-emerald-400 font-medium block leading-snug break-words mt-0.5 whitespace-normal"
                            />
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          tipoConfirmacion === 'comprobante' ? 'border-emerald-400 bg-emerald-400' : 'border-white/30'
                        }`}>
                          {tipoConfirmacion === 'comprobante' && <Check size={9} className="text-black stroke-[3]" />}
                        </div>
                      </button>

                      {/* Opción 2: Concretar por WhatsApp */}
                      <button
                        type="button"
                        onClick={() => setTipoConfirmacion('whatsapp')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 min-h-[60px] ${
                          tipoConfirmacion === 'whatsapp'
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/40'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="text-sm shrink-0 mt-0.5">💬</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-white block leading-snug break-words">
                              Concretar por WhatsApp
                            </span>
                            <EditableStoreText
                              textKey="optionWhatsappBadge"
                              value={getText('optionWhatsappBadge')}
                              isAdmin={isAdmin}
                              onOpenEditor={handleOpenTextEditorFor}
                              as="span"
                              className="text-[9.5px] text-amber-400 font-medium block leading-snug break-words mt-0.5 whitespace-normal"
                            />
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          tipoConfirmacion === 'whatsapp' ? 'border-amber-400 bg-amber-400' : 'border-white/30'
                        }`}>
                          {tipoConfirmacion === 'whatsapp' && <Check size={9} className="text-black stroke-[3]" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN 4: RESUMEN AL FINAL (Desplegable con miniaturas y datos de envío) */}
                  <div className="bg-[#0c101a] border border-white/10 rounded-2xl overflow-hidden transition-all shadow-sm">
                    {/* Barra principal siempre visible (Muestra máximo 3 miniaturas y flecha) */}
                    <div
                      onClick={() => setIsOrderSummaryExpanded(!isOrderSummaryExpanded)}
                      className="p-2 px-3 flex items-center justify-between text-[11px] gap-2 cursor-pointer hover:bg-white/5 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Miniaturas de los productos (máximo 3 visibles) */}
                        <div className="flex items-center -space-x-1 shrink-0">
                          {cart.slice(0, 3).map((item, idx) => {
                            const imgUrl = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                            return (
                              <div
                                key={`summary-thumb-${item.product.id}-${idx}`}
                                className="w-5 h-5 rounded-md bg-black/70 border border-white/20 overflow-hidden shrink-0 shadow-sm"
                                title={`${item.product.nombre} (x${item.quantity})`}
                              >
                                {imgUrl ? (
                                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[7px] text-amber-300 font-bold">
                                    🛒
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {cart.length > 3 && (
                            <span className="w-5 h-5 rounded-md bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[8px] font-black flex items-center justify-center shrink-0 z-10 shadow-sm">
                              +{cart.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 truncate text-slate-300 text-[10.5px] sm:text-[11px]">
                          <span className="font-bold text-white font-mono shrink-0">{cartTotals.totalUnits} items</span>
                          <span className="text-slate-500">•</span>
                          <span className="truncate">
                            Envío: <strong className="text-white">{clienteNombre || 'Cliente'}</strong> ({agenciaSeleccionada})
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
                          className="text-[10px] text-amber-300 hover:text-amber-200 underline font-bold cursor-pointer"
                        >
                          Modificar
                        </button>
                        <div className={`w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-slate-300 transition-transform duration-200 ${
                          isOrderSummaryExpanded ? 'rotate-180 text-amber-400' : ''
                        }`}>
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>

                    {/* Desplegable con detalle completo de productos y datos de envío */}
                    {isOrderSummaryExpanded && (
                      <div className="p-3 border-t border-white/10 bg-black/40 space-y-3 animate-fade-in text-xs">
                        {/* Lista de todos los productos seleccionados */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Productos en tu pedido ({cartTotals.totalUnits} {cartTotals.totalUnits === 1 ? 'unidad' : 'unidades'}):
                          </span>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                            {cart.map((item, idx) => {
                              const imgUrl = formatDirectImageUrl(item.product.variante_imagen_miniatura || item.product.imagen_portada || item.product.imagen_url || item.product.link);
                              return (
                                <div
                                  key={`expanded-item-${item.product.id}-${idx}`}
                                  className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white/5 border border-white/5"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 overflow-hidden shrink-0">
                                      {imgUrl ? (
                                        <img src={imgUrl} alt={item.product.nombre} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500">
                                          🛍️
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-white truncate leading-tight">
                                        {item.product.nombre}
                                      </p>
                                      <span className="text-[9.5px] text-slate-400">
                                        Cant: <strong className="text-amber-300 font-mono">{item.quantity}</strong> × ${item.precio_unitario.toFixed(2)} USD
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-amber-400 shrink-0">
                                    ${item.subtotal.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mini resumen de datos de envío del cliente */}
                        <div className="pt-2 border-t border-white/10 space-y-1 text-[10.5px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Datos de Envío Registrados:
                          </span>
                          <div className="bg-[#07090e] p-2 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-300">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Destinatario:</span>
                              <span className="text-white font-semibold">{clienteNombre || 'Sin nombre'} ({clienteCedula || 'Sin cédula'})</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Teléfono / WhatsApp:</span>
                              <span className="text-white font-semibold">{clienteTelefono || 'Sin teléfono'}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Agencia & Dirección:</span>
                              <span className="text-amber-300 font-semibold">{agenciaSeleccionada}: {direccionAgencia || 'Sin dirección especificada'}</span>
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
                      className={`w-full py-3 disabled:opacity-50 text-black font-anton tracking-wider text-sm sm:text-base uppercase rounded-xl flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-98 transition-all ${
                        tipoConfirmacion === 'comprobante'
                          ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 shadow-emerald-500/20'
                          : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 shadow-amber-500/20'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      <span>
                        {isSubmittingOrder
                          ? 'Procesando Pedido...'
                          : tipoConfirmacion === 'comprobante'
                            ? getText('btnSubmitReceipt')
                            : getText('btnSubmitWhatsapp')}
                      </span>
                    </button>

                    <div className="text-[10px] text-center text-slate-400 font-medium">
                      {tipoConfirmacion === 'comprobante' ? (
                        <EditableStoreText
                          textKey="receiptNotice"
                          value={getText('receiptNotice')}
                          isAdmin={isAdmin}
                          onOpenEditor={handleOpenTextEditorFor}
                          as="p"
                        />
                      ) : (
                        <EditableStoreText
                          textKey="whatsappNotice"
                          value={getText('whatsappNotice')}
                          isAdmin={isAdmin}
                          onOpenEditor={handleOpenTextEditorFor}
                          as="p"
                        />
                      )}
                    </div>
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto">
          <div className="relative bg-[#0e121b] border-2 border-emerald-500/40 rounded-3xl w-full max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-5 sm:p-7 text-center space-y-5 shadow-2xl animate-scale-up my-auto custom-scrollbar">
            {/* Botón X roja visible en la esquina superior derecha */}
            <button
              type="button"
              onClick={() => setCompletedOrder(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500/60 hover:border-red-600 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md shadow-red-500/20 z-10 shrink-0"
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
            >
              <X size={18} strokeWidth={3} />
            </button>
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl ${
              completedOrder.tipo_confirmacion === 'comprobante_automatico'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/20'
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
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              />
              <h3 className="font-anton text-2xl sm:text-3xl uppercase tracking-wider text-white">
                #{completedOrder.numero_pedido}
              </h3>
              <EditableStoreText
                textKey="orderSuccessSubtitle"
                value={getText('orderSuccessSubtitle')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="p"
                className="text-xs text-slate-300 font-medium"
              />
            </div>

            {/* Order Details Card */}
            <div className="bg-[#141926] border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{completedOrder.cliente_nombre}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Cédula:</span>
                <span className="font-bold font-mono text-white">{completedOrder.cliente_cedula}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Teléfono:</span>
                <span className="font-bold font-mono text-white">{completedOrder.cliente_telefono}</span>
              </div>
              <div className="border-b border-white/5 pb-2">
                <span className="text-slate-400 block mb-0.5">Agencia de Envío:</span>
                <span className="font-bold text-amber-300 text-[11px] block">{completedOrder.direccion_agencia_envio}</span>
              </div>
              {completedOrder.referencia_pago && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">N° Referencia:</span>
                  <span className="font-bold font-mono text-emerald-400">{completedOrder.referencia_pago}</span>
                </div>
              )}
              {completedOrder.comprobante_url && (
                <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                  <span className="text-slate-400">Comprobante Adjunto:</span>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Recibido en sistema
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-mono">
                <span className="text-slate-300 font-bold uppercase">Total del Pedido:</span>
                <span className="text-base font-black text-emerald-400">${completedOrder.totalUSD.toFixed(2)} USD (Bs. {completedOrder.totalBS.toFixed(2)})</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSendToWhatsApp(completedOrder)}
                className={`w-full py-3.5 text-black font-anton uppercase text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all ${
                  completedOrder.tipo_confirmacion === 'comprobante_automatico'
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                    : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                }`}
              >
                <Share2 size={16} />
                <span>
                  {completedOrder.tipo_confirmacion === 'comprobante_automatico'
                    ? 'Notificar / Enviar Copia por WhatsApp (Opcional)'
                    : '👉 ENVIAR PEDIDO POR WHATSAPP AHORA'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-black uppercase rounded-xl transition-all cursor-pointer"
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
        const qvVariants = activeQV.grupo_id 
          ? sourceProducts.filter(p => p.grupo_id === activeQV.grupo_id).sort((a, b) => {
              if (a.es_principal_grupo && !b.es_principal_grupo) return -1;
              if (!a.es_principal_grupo && b.es_principal_grupo) return 1;
              return (a.variante_nombre || a.nombre).localeCompare(b.variante_nombre || b.nombre);
            })
          : [];
        const qvImages = getItemImages(
          {
            isGroup: Boolean(activeQV.grupo_id),
            coverProduct: quickViewProduct,
            variants: qvVariants.length > 0 ? qvVariants : [activeQV]
          },
          activeQV
        );
        const qvPriceUSD = activeQV.precio_venta_ref || activeQV.precio_mayor || 0;
        const qvPriceBS = qvPriceUSD * tasaBCV;
        const qvInStock = (activeQV.stock_disponible || 0) > 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto">
            <div className="relative bg-[#0e121b] border-2 border-amber-500/30 rounded-3xl w-full max-w-3xl max-h-[calc(100dvh-2.5rem)] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden shadow-2xl animate-scale-up my-auto custom-scrollbar">
              
              {/* Botón X Roja Siempre Fijo en la Esquina Superior Derecha */}
              <button
                type="button"
                onClick={() => {
                  setQuickViewProduct(null);
                  setQuickViewActiveVariant(null);
                  setQuickViewImageIndex(0);
                }}
                className="absolute top-4 right-4 z-30 w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500/60 hover:border-red-600 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md shadow-red-500/20 shrink-0"
                title="Cerrar ventana"
                aria-label="Cerrar ventana"
              >
                <X size={18} strokeWidth={3} />
              </button>

              {/* Columna Izquierda: Carrusel Completo con Flechas, Swipe y Miniaturas */}
              <div className="w-full md:w-1/2 bg-[#07090e] p-4 sm:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
                <StoreImageCarousel
                  images={qvImages}
                  currentIndex={quickViewImageIndex}
                  onIndexChange={setQuickViewImageIndex}
                  altText={activeQV.nombre}
                  className="h-60 sm:h-72 md:h-84"
                  showThumbnails={true}
                />
              </div>

              {/* Columna Derecha: Información y Selector Visual de Variantes */}
              <div className="w-full md:w-1/2 p-5 sm:p-6 flex flex-col justify-between space-y-4 pr-12 sm:pr-14">
                <div className="space-y-3">
                  <h3 className="font-anton text-lg sm:text-2xl uppercase tracking-wide text-white leading-tight">
                    {activeQV.grupo_nombre || activeQV.nombre}
                  </h3>

                  {/* SELECTOR VISUAL DE VARIANTES POR MINIATURAS EN QUICKVIEW */}
                  {qvVariants.length > 1 && (
                    <div className="pt-2 pb-2 space-y-2 border-t border-b border-white/10">
                      <div className="flex items-center justify-between text-[9.5px]">
                        <span className="text-amber-400 font-black uppercase flex items-center gap-1.5">
                          <Boxes size={12} className="text-amber-400" />
                          <span>Modelo Seleccionado:</span>
                          <strong className="text-white text-[11px] underline">
                            {activeQV.variante_nombre || activeQV.nombre}
                          </strong>
                        </span>
                      </div>

                      {/* Miniaturas de variantes para QuickView */}
                      <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 custom-scrollbar">
                        {qvVariants.map((v) => {
                          const isSelected = activeQV.id === v.id;
                          const vStock = (v.stock_disponible || 0) > 0;
                          const vImg = formatDirectImageUrl(v.variante_imagen_miniatura || v.imagen_portada || v.variante_imagen_hd || v.imagen_url || v.link);
                          return (
                            <button
                              key={`qv-visual-var-${v.id}`}
                              type="button"
                              onClick={() => {
                                setQuickViewActiveVariant(v);
                                setQuickViewImageIndex(0);
                                setQuickViewQty(1);
                              }}
                              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer relative bg-black/60 flex items-center justify-center ${
                                isSelected
                                  ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-md shadow-amber-400/30 z-10'
                                  : vStock
                                  ? 'border-white/15 opacity-75 hover:opacity-100 hover:border-white/40'
                                  : 'border-white/5 opacity-40 line-through'
                              }`}
                              title={v.variante_nombre || v.nombre}
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
                                <span className="text-[8px] font-black text-slate-400 uppercase text-center p-0.5 truncate leading-none">
                                  {(v.variante_nombre || v.nombre).slice(0, 4)}
                                </span>
                              )}
                              {!vStock && (
                                <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-rose-400 text-[9px] font-black">
                                  ✕
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Precios (Idénticos al catálogo exterior: fuente limpia mono) */}
                  <div className="pt-1 font-mono">
                    <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                      ${qvPriceUSD.toFixed(2)} USD
                    </div>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">
                      ≈ Bs. {qvPriceBS.toFixed(2)} <span className="text-slate-400 font-normal text-[10px]">(Tasa BCV: {tasaBCV.toFixed(2)})</span>
                    </p>
                  </div>

                  {/* Stock info con urgencia inteligente (Cero números innecesarios) */}
                  <div>
                    {!qvInStock ? (
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                        <AlertCircle size={13} />
                        Agotado temporalmente
                      </span>
                    ) : activeQV.stock_disponible <= 6 ? (
                      <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/25 px-2.5 py-1 rounded-xl inline-flex">
                        <span className="animate-pulse">⏳</span>
                        <span>Casi agotado</span>
                      </span>
                    ) : null}
                  </div>

                  {activeQV.palabras_clave && (
                    <p className="text-[11px] text-slate-400 pt-1 line-clamp-3">
                      {activeQV.palabras_clave}
                    </p>
                  )}
                </div>

                {/* Selector de Cantidad y Botones de Acción */}
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  {qvInStock && (
                    <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Cantidad:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickViewQty((prev) => Math.max(1, prev - 1))}
                          disabled={quickViewQty <= 1}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="font-mono font-bold text-white text-sm w-7 text-center">
                          {quickViewQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickViewQty((prev) => Math.min(activeQV.stock_disponible || 99, prev + 1))}
                          disabled={quickViewQty >= (activeQV.stock_disponible || 99)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botón Agregar al Carrito (No cierra la ventana para permitir agregar más variantes) */}
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(activeQV, quickViewQty);
                      setQuickViewAdded(true);
                      setTimeout(() => setQuickViewAdded(false), 2200);
                    }}
                    disabled={!qvInStock}
                    className={`w-full py-2.5 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 ${
                      quickViewAdded
                        ? 'bg-emerald-400 text-black shadow-emerald-500/20'
                        : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20 disabled:opacity-30'
                    }`}
                  >
                    {quickViewAdded ? (
                      <>
                        <Check size={14} className="stroke-[3]" />
                        <span>¡Agregado al Carrito ({quickViewQty})!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={14} />
                        <span>Agregar al Carrito</span>
                      </>
                    )}
                  </button>

                  {/* Botón Secundario: Ir al Carrito */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickViewProduct(null);
                      setQuickViewActiveVariant(null);
                      setIsCartOpen(true);
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ShoppingCart size={13} className="text-amber-400" />
                    <span>Ir al Carrito ({cartTotals.totalUnits})</span>
                    <ArrowRight size={12} className="text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* STORE FOOTER                                              */}
      {/* ========================================================= */}
      <footer className="bg-[#040609] border-t border-white/10 py-10 px-4 sm:px-6 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <h4 className="font-anton text-lg tracking-wider uppercase text-amber-400">
              Lo que los bikers quieren
            </h4>
            <div className="mt-0.5">
              <EditableStoreText
                textKey="footerTagline"
                value={getText('footerTagline')}
                isAdmin={isAdmin}
                onOpenEditor={handleOpenTextEditorFor}
                as="p"
                className="text-[11px] text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="text-slate-400">Envíos: MRW • Zoom • Tealca • Domesa</span>
            <span>•</span>
            <span className="text-emerald-400">Tasa BCV Garantizada</span>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* FLOATING CART BUBBLE (MITAD DEL LADO DERECHO)             */}
      {/* ========================================================= */}
      <aside 
        className="fixed right-2 sm:right-5 top-1/2 -translate-y-1/2 z-40"
        aria-label="Acceso Rápido al Carrito"
      >
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="group relative flex items-center gap-2.5 sm:gap-3 bg-[#090d16] hover:bg-[#0f1422] text-white pl-3.5 pr-4 sm:pr-5 py-3 rounded-full font-black uppercase shadow-[0_4px_25px_rgba(245,158,11,0.45)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.65)] border-2 border-amber-400 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
          title="Ir al Carrito de Compras"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-black flex items-center justify-center font-black shadow-md">
              <ShoppingCart size={17} className="stroke-[2.5] text-black" />
            </div>
            {cartTotals.totalUnits > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#090d16] shadow-md animate-scale-up">
                {cartTotals.totalUnits}
              </span>
            )}
          </div>
          
          <div className="flex flex-col text-left leading-tight">
            <span className="font-anton tracking-wider text-xs sm:text-sm uppercase text-amber-300 group-hover:text-amber-200 whitespace-nowrap drop-shadow-sm">
              Ir al Carrito
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-white whitespace-nowrap drop-shadow-sm">
              {cartTotals.totalUSD > 0 ? `$${cartTotals.totalUSD.toFixed(2)} USD` : '0 productos'}
            </span>
          </div>
        </button>
      </aside>

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
