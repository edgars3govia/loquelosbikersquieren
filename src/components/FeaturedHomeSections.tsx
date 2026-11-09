'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Producto, ComboItem, ReviewItem } from '../types';
import { formatDirectImageUrl } from '../utils/imageUrlHelper';

interface FeaturedHomeSectionsProps {
  products: Producto[];
  tasaBCV: number;
  onAddComboToCart: (comboProducts: Producto[]) => void;
  onOpenProductQuickView?: (product: Producto) => void;
  isAdmin?: boolean;
}

export function FeaturedHomeSections({
  products,
  tasaBCV,
  onAddComboToCart,
  onOpenProductQuickView,
}: FeaturedHomeSectionsProps) {
  // 1. Estado de Combos reales desde Firestore
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [activeComboIndex, setActiveComboIndex] = useState(0);
  const [isComboHovered, setIsComboHovered] = useState(false);

  // 2. Estado de Reviews reales desde Firestore (CERO mock data)
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [isReviewHovered, setIsReviewHovered] = useState(false);

  // Lightbox Modal para zoom de captura de WhatsApp si hay reseñas reales
  const [lightboxReview, setLightboxReview] = useState<ReviewItem | null>(null);

  // Suscripción en tiempo real a la colección "combos" de Firestore
  useEffect(() => {
    try {
      const q = collection(db, 'combos');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loaded: ComboItem[] = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                title: data.title || data.nombre || '',
                description: data.description || '',
                productIds: Array.isArray(data.productIds) ? data.productIds : (data.productos || []),
                active: data.active !== false,
                totalUSD: typeof data.totalUSD === 'number' ? data.totalUSD : undefined,
                totalBS: typeof data.totalBS === 'number' ? data.totalBS : undefined,
                discountPercentage: Number(data.discountPercentage || 0),
                order: Number(data.order || 0),
                createdAt: data.createdAt,
              };
            })
            .filter((c) => c.active && c.productIds.length >= 2);

          setCombos(loaded);
        },
        (err) => {
          console.warn('Error reading combos from Firestore:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not attach combos listener:', err);
    }
  }, []);

  // Suscripción en tiempo real a la colección "reviews" de Firestore (cero mock data)
  useEffect(() => {
    try {
      const q = collection(db, 'reviews');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loaded: ReviewItem[] = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              const rawImg = data.imageUrl || data.image || data.capturaUrl || data.foto || '';
              return {
                id: docSnap.id,
                imageUrl: formatDirectImageUrl(rawImg) || rawImg,
                caption: data.caption || data.texto || data.descripcion || '',
                active: data.active !== false,
                order: Number(data.order || 0),
                badge: data.badge || '',
                rating: Number(data.rating || 5),
                date: data.date || data.fecha || '',
                createdAt: data.createdAt,
              };
            })
            .filter((r) => r.active && r.imageUrl);

          setReviews(loaded);
        },
        (err) => {
          console.warn('Error reading reviews from Firestore:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not attach reviews listener:', err);
    }
  }, []);

  // Autoplay de combos cada 5 segundos si hay más de 1 combo
  useEffect(() => {
    if (combos.length <= 1 || isComboHovered) return;

    const interval = setInterval(() => {
      setActiveComboIndex((prev) => (prev + 1) % combos.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [combos.length, isComboHovered]);

  // Autoplay de reseñas cada 4 segundos si hay más de 1 reseña real
  useEffect(() => {
    if (reviews.length <= 1 || isReviewHovered) return;

    const interval = setInterval(() => {
      setActiveReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [reviews.length, isReviewHovered]);

  const hasCombos = combos.length > 0;
  const hasReviews = reviews.length > 0;

  // Combo activo actual
  const currentCombo = combos[activeComboIndex] || combos[0];
  const currentComboProducts = useMemo<Producto[]>(() => {
    if (!currentCombo) return [];
    return currentCombo.productIds
      .map((id) => products.find((p) => p.id === id || String(p.sku) === id))
      .filter((p): p is Producto => Boolean(p));
  }, [currentCombo, products]);

  // REGLA ESTRICTA: Si no hay combos ni reseñas reales en Firestore, o si los productos aún no cargan, no renderizar nada
  if (!hasCombos && !hasReviews) {
    return null;
  }

  if (hasCombos && currentComboProducts.length < 2 && !hasReviews) {
    return null;
  }

  // Cálculo del precio total del combo en USD y Bs
  const rawSubtotalUSD = currentComboProducts.reduce(
    (acc, p) => acc + (p.precio_venta_ref || p.precio_mayor || 0),
    0
  );
  const discountMultiplier = currentCombo?.discountPercentage 
    ? (100 - currentCombo.discountPercentage) / 100 
    : 1;
  const comboTotalUSD = currentCombo?.totalUSD && currentCombo.totalUSD > 0
    ? currentCombo.totalUSD
    : Number((rawSubtotalUSD * discountMultiplier).toFixed(2));
  const comboTotalBS = Number((comboTotalUSD * (tasaBCV || 1)).toFixed(2));

  // Reseña activa actual (solo si existen reseñas reales en Firestore)
  const currentReview = hasReviews ? (reviews[activeReviewIndex] || reviews[0]) : null;

  return (
    <section 
      aria-label="Kits y productos destacados" 
      className="w-full max-w-[1720px] mx-auto px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5"
    >
      <div className={hasCombos && hasReviews ? "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4" : "w-full max-w-3xl mx-auto"}>
        
        {/* ==================================================================== */}
        {/* CUADRO 1: COMPRADOS JUNTOS CON FRECUENCIA (DISEÑO ULTRA-LIMPIO AMAZON)*/}
        {/* ==================================================================== */}
        {hasCombos && currentComboProducts.length >= 2 && (
          <div
            onMouseEnter={() => setIsComboHovered(true)}
            onMouseLeave={() => setIsComboHovered(false)}
            className="bg-transparent p-2 sm:p-3 flex flex-col justify-between"
          >
            {/* Cabecera limpia sin iconos decorativos ni badges */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-neutral-200 tracking-tight">
                  Comprados juntos con frecuencia
                </h3>
                {currentCombo?.title && (
                  <p className="text-[11px] text-neutral-400 capitalize truncate mt-0.5">
                    {currentCombo.title}
                  </p>
                )}
              </div>

              {/* Flechas de carrusel minimalistas solo si hay más de 1 combo */}
              {combos.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-neutral-400 select-none mr-1">
                    {activeComboIndex + 1}/{combos.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveComboIndex((prev) =>
                        prev === 0 ? combos.length - 1 : prev - 1
                      )
                    }
                    className="w-6 h-6 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-neutral-700/60 active:scale-95"
                    aria-label="Combo anterior"
                    title="Anterior"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveComboIndex((prev) => (prev + 1) % combos.length)
                    }
                    className="w-6 h-6 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-neutral-700/60 active:scale-95"
                    aria-label="Siguiente combo"
                    title="Siguiente"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Fila horizontal única estilo Amazon: Imagen 1 + Imagen 2 (+ Imagen 3) */}
            <div className="py-3 sm:py-3.5 my-auto flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              {currentComboProducts.map((prod, idx) => {
                const img = formatDirectImageUrl(
                  prod.variante_imagen_miniatura || prod.imagen_portada || prod.imagen_url || prod.link
                );
                return (
                  <React.Fragment key={`clean-combo-${prod.id}-${idx}`}>
                    {idx > 0 && (
                      <span className="text-neutral-500 font-bold text-base select-none px-0.5">
                        +
                      </span>
                    )}

                    <div
                      onClick={() => onOpenProductQuickView?.(prod)}
                      className="group/item relative cursor-pointer flex flex-col items-center"
                      title={`${prod.nombre} - $${(prod.precio_venta_ref || prod.precio_mayor || 0).toFixed(2)} USD`}
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-neutral-800/50 border border-neutral-700/60 group-hover/item:border-neutral-500 transition-all p-1 flex items-center justify-center overflow-hidden">
                        {img ? (
                          <img
                            src={img}
                            alt={prod.nombre}
                            className="w-full h-full object-cover rounded-lg group-hover/item:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                            🛍️
                          </div>
                        )}
                      </div>

                      {/* Precio individual debajo */}
                      <span className="mt-1 text-[10px] font-mono text-neutral-300">
                        ${(prod.precio_venta_ref || prod.precio_mayor || 0).toFixed(2)}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Total en una sola línea clara y botón compacto directo */}
            <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-left">
                <span className="text-xs sm:text-sm text-neutral-200">
                  Total: <strong className="font-mono text-white font-bold">${comboTotalUSD.toFixed(2)} USD</strong>{' '}
                  <span className="text-neutral-400 text-[11px] sm:text-xs">
                    (≈ Bs. {comboTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => onAddComboToCart(currentComboProducts)}
                className="py-2 px-3.5 bg-white hover:bg-neutral-200 active:scale-95 text-black font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <ShoppingBag size={14} className="text-black" />
                <span>Agregar kit al carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* CUADRO 2: RESEÑAS & ENTREGAS WHATSAPP (SOLO SI HAY DATOS REALES)     */}
        {/* ==================================================================== */}
        {hasReviews && currentReview && (
          <div
            onMouseEnter={() => setIsReviewHovered(true)}
            onMouseLeave={() => setIsReviewHovered(false)}
            className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between shadow-xs transition-colors hover:border-neutral-700/80"
          >
            {/* Cabecera limpia */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-neutral-200 tracking-tight">
                  Reseñas & Entregas WhatsApp
                </h3>
                {currentReview.date && (
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {currentReview.date}
                  </p>
                )}
              </div>

              {/* Flechas de carrusel solo si hay más de 1 reseña */}
              {reviews.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-neutral-400 select-none mr-1">
                    {activeReviewIndex + 1}/{reviews.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReviewIndex((prev) =>
                        prev === 0 ? reviews.length - 1 : prev - 1
                      )
                    }
                    className="w-6 h-6 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-neutral-700/60 active:scale-95"
                    aria-label="Reseña anterior"
                    title="Anterior"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReviewIndex((prev) => (prev + 1) % reviews.length)
                    }
                    className="w-6 h-6 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-neutral-700/60 active:scale-95"
                    aria-label="Siguiente reseña"
                    title="Siguiente"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Tarjeta de captura real */}
            <div className="py-2.5 my-auto">
              <div
                onClick={() => setLightboxReview(currentReview)}
                className="relative bg-neutral-950/60 rounded-xl border border-neutral-800 overflow-hidden cursor-pointer group/card transition-colors hover:border-neutral-700"
                title="Toca para ampliar"
              >
                <div className="w-full h-36 sm:h-40 overflow-hidden bg-neutral-950 flex items-center justify-center relative">
                  <img
                    src={currentReview.imageUrl}
                    alt={currentReview.caption || 'Reseña de entrega'}
                    className="w-full h-full object-cover object-center group-hover/card:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 group-hover/card:opacity-100 transition-opacity">
                    <Maximize2 size={11} />
                  </span>
                </div>

                {currentReview.caption && (
                  <div className="p-2.5 bg-neutral-950/80 border-t border-neutral-800/80 text-left">
                    <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                      {currentReview.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Paginador de puntos si hay múltiples reseñas */}
            {reviews.length > 1 && (
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-end gap-1.5">
                {reviews.map((_, dotIdx) => (
                  <button
                    key={`rev-real-dot-${dotIdx}`}
                    type="button"
                    onClick={() => setActiveReviewIndex(dotIdx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                      activeReviewIndex === dotIdx ? 'w-4 bg-white' : 'bg-neutral-700'
                    }`}
                    aria-label={`Ver captura ${dotIdx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Lightbox para ampliar captura en caso de reseñas reales */}
      {lightboxReview && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxReview(null)}
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl cursor-default"
          >
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <span className="text-xs text-neutral-300 font-medium">Captura de entrega</span>
              <button
                type="button"
                onClick={() => setLightboxReview(null)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-3 bg-neutral-950 flex items-center justify-center overflow-y-auto">
              <img
                src={lightboxReview.imageUrl}
                alt={lightboxReview.caption || 'Captura de entrega'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            {lightboxReview.caption && (
              <div className="p-3 border-t border-neutral-800 bg-neutral-950 text-left">
                <p className="text-xs text-neutral-200">{lightboxReview.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default FeaturedHomeSections;
