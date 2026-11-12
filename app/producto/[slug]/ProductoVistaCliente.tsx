'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
  Check,
  CheckCircle2,
  Share2,
  MessageCircle,
  Truck,
  ShieldCheck,
  Star,
  Plus,
  Minus,
  Copy,
  Sparkles,
  Clock,
  CreditCard,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { ProductDetails, getProductBySlug } from '../../../src/services/productsService';
import { fetchTasaOficialBCV, getCachedTasaBCV, DEFAULT_TASA_FALLBACK } from '../../../src/lib/tasaService';
import { formatVES } from '../../../src/utils/textUtils';
import { slugify } from '../../../src/utils/slugHelper';

interface ProductoVistaClienteProps {
  slug: string;
  initialProduct?: ProductDetails | null;
}

export default function ProductoVistaCliente({ slug, initialProduct }: ProductoVistaClienteProps) {
  const [product, setProduct] = useState<ProductDetails | null>(initialProduct || null);
  const [loading, setLoading] = useState<boolean>(!initialProduct);
  const [selectedImage, setSelectedImage] = useState<string>(initialProduct?.imagenUrl || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [cartFeedback, setCartFeedback] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [cartCount, setCartCount] = useState<number>(0);
  const [tasaBCV, setTasaBCV] = useState<number>(() => {
    const cached = getCachedTasaBCV();
    return cached > 1 ? cached : DEFAULT_TASA_FALLBACK;
  });

  // Hibridación a prueba de fallos: Si el servidor no cargó el producto (initialProduct es null),
  // se realiza la consulta directamente desde el cliente en el navegador
  useEffect(() => {
    if (!initialProduct && slug) {
      let isMounted = true;
      setLoading(true);

      getProductBySlug(slug)
        .then((fetched) => {
          if (isMounted) {
            setProduct(fetched);
            if (fetched?.imagenUrl) {
              setSelectedImage(fetched.imagenUrl);
            }
          }
        })
        .catch((err) => {
          console.error('Error fetching product on client-side fallback:', err);
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else if (initialProduct) {
      setProduct(initialProduct);
      if (initialProduct.imagenUrl) {
        setSelectedImage(initialProduct.imagenUrl);
      }
      setLoading(false);
    }
  }, [slug, initialProduct]);

  // Actualizar imagen seleccionada cuando cambie el producto
  useEffect(() => {
    if (product?.imagenUrl && !selectedImage) {
      setSelectedImage(product.imagenUrl);
    }
  }, [product, selectedImage]);

  // Sincronizar contador de carrito desde localStorage
  const syncCartCount = () => {
    try {
      const saved = localStorage.getItem('biker_store_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const totalItems = parsed.reduce((acc: number, item: any) => acc + (Number(item?.quantity) || 0), 0);
          setCartCount(totalItems);
          return;
        }
      }
      setCartCount(0);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    syncCartCount();
    const handleStorageChange = () => syncCartCount();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('biker_cart_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('biker_cart_updated', handleStorageChange);
    };
  }, []);

  // Consultar tasa oficial BCV actualizada
  useEffect(() => {
    let isMounted = true;
    fetchTasaOficialBCV()
      .then((res) => {
        if (isMounted && res.tasa > 1) {
          setTasaBCV(res.tasa);
        }
      })
      .catch((err) => {
        console.warn('Error fetching live BCV rate:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Agregar al carrito con persistencia garantizada en localStorage
  const handleAddToCart = () => {
    if (!product) return;

    try {
      const saved = localStorage.getItem('biker_store_cart');
      let currentCart: any[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) currentCart = parsed;
        } catch {}
      }

      const prodRaw = product.raw || {
        id: product.id,
        sku: product.sku || '',
        nombre: product.nombre,
        precio_venta_ref: product.precioVentaUSD,
        precio_mayor: product.precioMayorUSD,
        precio_gran_mayor: product.precioGranMayorUSD,
        stock_disponible: product.stock,
        categoria: product.categoria,
        subcategoria: product.subcategoria,
        imagen_url: product.imagenUrl,
        imagenes: product.imagenes,
        descripcion: product.descripcion,
      };

      const existingIndex = currentCart.findIndex((item: any) => item.product?.id === product.id);

      if (existingIndex >= 0) {
        const item = currentCart[existingIndex];
        const newQty = (item.quantity || 1) + quantity;
        currentCart[existingIndex] = {
          ...item,
          quantity: newQty,
          subtotal: Number((item.precio_unitario * newQty).toFixed(2)),
        };
      } else {
        currentCart.push({
          product: prodRaw,
          quantity: quantity,
          precio_unitario: priceUSD,
          subtotal: Number((priceUSD * quantity).toFixed(2)),
        });
      }

      localStorage.setItem('biker_store_cart', JSON.stringify(currentCart));
      syncCartCount();
      window.dispatchEvent(new Event('biker_cart_updated'));

      setCartFeedback(true);
      setTimeout(() => {
        setCartFeedback(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving cart in localStorage:', err);
    }
  };

  // Enlace directo a WhatsApp del dueño
  const handleDirectWhatsApp = () => {
    if (!product) return;
    const phone = '584128276786';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://www.loquelosbikersquieren.com/producto/${slug}`;
    const totalUSD = (product.precioVentaUSD * quantity).toFixed(2);
    const totalBS = formatVES(product.precioVentaUSD * quantity * tasaBCV);

    const message = `🏍️ *HOLA! ESTOY INTERESADO EN ESTE ACCESORIO*\n` +
      `📦 *Producto:* ${product.nombre}\n` +
      `🔢 *Cantidad:* ${quantity} unidad(es)\n` +
      `💵 *Total USD:* $${totalUSD}\n` +
      `🇻🇪 *Total Bs. (BCV):* Bs. ${totalBS}\n` +
      `🔗 *Enlace:* ${currentUrl}\n\n` +
      `¿Tienen disponibilidad para envío inmediato?`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`, '_blank');
  };

  // Copiar enlace canónico para compartir en redes / WhatsApp
  const handleCopyLink = async () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://www.loquelosbikersquieren.com/producto/${slug}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Could not copy product link:', err);
    }
  };

  // Pantalla de carga mientras se ejecuta el fallback de cliente
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-4 py-3 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-amber-500 font-bold hover:text-amber-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Volver a la tienda</span>
            </Link>
            <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Lo que los bikers quieren</span>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Cargando producto...</h2>
          <p className="text-sm text-zinc-400 max-w-sm">
            Conectando con el inventario de la tienda para mostrarte los detalles y precios actualizados.
          </p>
        </div>
      </div>
    );
  }

  // Si no se encontró el producto tras el intento en servidor y cliente
  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-4 py-3 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-amber-500 font-bold hover:text-amber-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Volver al catálogo</span>
            </Link>
            <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Lo que los bikers quieren</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-5">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Producto no disponible</h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            El accesorio que buscas ha sido vendido o su enlace ha cambiado. Te invitamos a explorar nuestro catálogo completo con más de 70 accesorios disponibles para entrega inmediata.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            Explorar Catálogo de la Tienda
          </Link>
        </div>
      </div>
    );
  }

  // Cálculos de precios en USD y Bolívares con soporte para oferta activa
  const rawProduct = product.raw;
  const rawOffer = Number(product.precioOfertaUSD ?? rawProduct?.precio_oferta_usd ?? 0);
  const rawOriginal = Number(product.precioVentaUSD ?? rawProduct?.precio_venta_ref ?? 0);
  const hasOffer = rawOffer > 0 && rawOffer < rawOriginal;
  const effectivePriceUSD = hasOffer ? rawOffer : rawOriginal;
  const discountPercentage = hasOffer
    ? (Number(product.descuentoPorcentaje ?? rawProduct?.descuento_porcentaje) || Math.round(((rawOriginal - rawOffer) / rawOriginal) * 100))
    : 0;

  const priceUSD = effectivePriceUSD;
  const priceBS = priceUSD * tasaBCV;
  const inStock = product.stock > 0;
  const galleryImages = product.imagenes && product.imagenes.length > 0
    ? product.imagenes
    : [product.imagenUrl].filter(Boolean);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Header Superior Limpio y Funcional */}
      <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-zinc-300 hover:text-amber-500 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 group-hover:border-amber-500/40">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-400 leading-none">Volver a la tienda</span>
              <span className="text-sm font-black text-white group-hover:text-amber-500 transition-colors">
                LO QUE LOS BIKERS QUIEREN
              </span>
            </div>
          </Link>

          {/* Botón Carrito en Cabecera */}
          <Link
            href="/?cart=true"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all text-xs font-bold active:scale-95"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 text-amber-500" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-amber-500 text-black text-[10px] font-black rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Carrito</span>
          </Link>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-10">
        {/* Migas de Pan (Breadcrumbs) */}
        <nav className="flex items-center gap-2 text-xs text-zinc-400 mb-6 overflow-x-auto pb-1">
          <Link href="/" className="hover:text-amber-500 transition-colors shrink-0">
            Inicio
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          {product.categoria && (
            <>
              <Link
                href={`/categoria/${slugify(product.categoria)}`}
                className="hover:text-amber-500 transition-colors shrink-0"
              >
                {product.categoria}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            </>
          )}
          <span className="text-zinc-200 font-medium truncate max-w-[200px] sm:max-w-md">
            {product.nombre}
          </span>
        </nav>

        {/* Notificación flotante de agregado al carrito */}
        {cartFeedback && (
          <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-black px-4 py-3 rounded-xl shadow-2xl shadow-emerald-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="w-5 h-5 font-bold" />
            <div>
              <p className="text-xs font-black uppercase">¡Agregado al Carrito!</p>
              <p className="text-[11px] font-medium opacity-90">{product.nombre}</p>
            </div>
            <Link
              href="/?cart=true"
              className="ml-2 px-2.5 py-1 bg-black text-white hover:bg-zinc-900 rounded-lg text-xs font-bold transition-colors"
            >
              Ver Carrito
            </Link>
          </div>
        )}

        {/* Layout Principal: 2 Columnas (Fotos a la izquierda, detalles a la derecha) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA 1: Galería de Fotos */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Foto Principal */}
            <div className="relative aspect-square w-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center group shadow-xl">
              {selectedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage}
                  alt={product.nombre}
                  className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-zinc-500 flex flex-col items-center">
                  <ShoppingBag className="w-16 h-16 mb-2 stroke-1" />
                  <span className="text-xs">Sin foto disponible</span>
                </div>
              )}

              {/* Insignia de Stock */}
              <div className="absolute top-4 left-4">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 backdrop-blur">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    En Stock • Envío Inmediato
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 backdrop-blur">
                    Agotado temporalmente
                  </span>
                )}
              </div>

              {/* Botón flotante para copiar enlace directo */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="absolute top-4 right-4 p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 backdrop-blur transition-all active:scale-95"
                title="Copiar enlace del producto"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Miniaturas de Galería */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {galleryImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-20 h-20 rounded-xl bg-zinc-900 border overflow-hidden shrink-0 transition-all ${
                      selectedImage === img
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : 'border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Foto miniatura ${idx + 1}`}
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA 2: Información, Precios y Acciones */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Categoría y SKU */}
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
                {product.categoria || 'Accesorios'}
              </span>
              {product.sku && (
                <span className="text-zinc-500 font-mono">SKU: {product.sku}</span>
              )}
            </div>

            {/* Título Principal */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {product.nombre}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <Star className="w-4 h-4 fill-amber-500" />
                  <Star className="w-4 h-4 fill-amber-500" />
                  <Star className="w-4 h-4 fill-amber-500" />
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <span className="text-xs text-zinc-400 font-medium">4.9 / 5 (Calidad Comprobada)</span>
              </div>
            </div>

            {/* Bloque de Precios (USD + Bolívares con Tasa BCV Oficial) */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center flex-wrap leading-none">
                  <span className="text-3xl sm:text-4xl font-black text-amber-500">
                    ${priceUSD.toFixed(2)}
                  </span>
                  {hasOffer && (
                    <>
                      <span className="text-xs sm:text-sm text-neutral-400 line-through font-normal ml-1.5">
                        ${rawOriginal.toFixed(2)}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-xs sm:rounded-sm ml-1.5 bg-black text-white shrink-0">
                        -{discountPercentage}%
                      </span>
                    </>
                  )}
                  <span className="text-sm font-bold text-zinc-400 ml-2">USD</span>
                </div>
                {inStock && (
                  <span className="text-xs text-zinc-400">
                    {product.stock} disponibles
                  </span>
                )}
              </div>

              {/* Equivalencia en Bolívares */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                <span className="text-zinc-400">Precio en Bolívares:</span>
                <span className="font-bold text-white font-mono">
                  Bs. {formatVES(priceBS)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 text-right">
                Calculado a tasa oficial BCV: Bs. {formatVES(tasaBCV)} / USD
              </p>
            </div>

            {/* Precios al Mayor si aplican */}
            {(product.precioMayorUSD > 0 || product.precioGranMayorUSD > 0) && (
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 grid grid-cols-2 gap-2 text-xs">
                {product.precioMayorUSD > 0 && (
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Precio Mayor:</span>
                    <span className="font-bold text-white">${product.precioMayorUSD.toFixed(2)} USD</span>
                  </div>
                )}
                {product.precioGranMayorUSD > 0 && (
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Gran Mayor:</span>
                    <span className="font-bold text-white">${product.precioGranMayorUSD.toFixed(2)} USD</span>
                  </div>
                )}
              </div>
            )}

            {/* Selector de Cantidad */}
            {inStock && (
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-zinc-300">Cantidad:</span>
                <div className="flex items-center border border-zinc-700 bg-zinc-900 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-black text-sm text-white min-w-[40px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                    disabled={quantity >= (product.stock || 99)}
                    className="p-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Botones de Acción Principales */}
            <div className="flex flex-col gap-3">
              {/* Botón Agregar al Carrito */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock}
                className={`w-full py-3.5 px-6 rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 ${
                  cartFeedback
                    ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {cartFeedback ? (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    ¡Agregado al Carrito!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    {inStock ? 'Agregar al Carrito' : 'Producto Agotado'}
                  </>
                )}
              </button>

              {/* Botón Comprar directo por WhatsApp */}
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                Comprar directo por WhatsApp
              </button>

              {/* Botón Compartir / Copiar enlace */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">¡Enlace copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-zinc-400" />
                    <span>Compartir este producto (WhatsApp / Redes)</span>
                  </>
                )}
              </button>
            </div>

            {/* Ventajas y Garantías de la Tienda */}
            <div className="pt-4 border-t border-zinc-800/80 flex flex-col gap-3 text-xs text-zinc-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Envíos a Toda Venezuela</span>
                  <span className="text-zinc-400 text-[11px]">Por MRW, Zoom, Tealca o Domesa</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Garantía y Calidad 100% Biker</span>
                  <span className="text-zinc-400 text-[11px]">Accesorios seleccionados y probados</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Múltiples Métodos de Pago</span>
                  <span className="text-zinc-400 text-[11px]">Pago Móvil, Transferencia, USDT o Efectivo</span>
                </div>
              </div>
            </div>

            {/* Descripción Detallada del Producto */}
            {product.descripcion && (
              <div className="pt-4 border-t border-zinc-800/80">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Detalles del Producto
                </h3>
                <div className="text-xs text-zinc-400 leading-relaxed space-y-2 whitespace-pre-line">
                  {product.descripcion}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Lo Que Los Bikers Quieren. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-amber-500 transition-colors">
              Catálogo
            </Link>
            <Link href="/?cart=true" className="hover:text-amber-500 transition-colors">
              Mi Carrito
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
