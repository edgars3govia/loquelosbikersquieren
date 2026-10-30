import React, { useState, useMemo } from 'react';
import { 
  X, 
  Check, 
  Eye, 
  EyeOff, 
  Search, 
  SlidersHorizontal, 
  Store, 
  Boxes, 
  AlertCircle, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { Producto } from '../types';
import { getCategoryKey, formatCategoryDisplay, getProductCategoryKeys, getProductCategoryNames } from '../utils/textUtils';

interface StoreCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Producto[];
  hiddenCategories: string[];
  onUpdateHiddenCategories: (newHidden: string[]) => void;
}

export const StoreCategoriesModal: React.FC<StoreCategoriesModalProps> = ({
  isOpen,
  onClose,
  products,
  hiddenCategories,
  onUpdateHiddenCategories
}) => {
  const [search, setSearch] = useState('');
  const [saveToast, setSaveToast] = useState(false);

  // Group all products by normalized category key (supports multiple categories per product)
  const categoryStats = useMemo(() => {
    const map = new Map<string, { key: string; displayName: string; count: number; inStockCount: number }>();
    
    products.forEach((p) => {
      const keys = getProductCategoryKeys(p);
      const names = getProductCategoryNames(p);
      keys.forEach((key, idx) => {
        if (!key || key === 'sin categoria') return;

        if (!map.has(key)) {
          map.set(key, {
            key,
            displayName: names[idx] || formatCategoryDisplay(key) || key,
            count: 0,
            inStockCount: 0
          });
        }
        const entry = map.get(key)!;
        entry.count += 1;
        if ((p.stock_disponible || 0) > 0) {
          entry.inStockCount += 1;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [products]);

  // Filtered categories according to user search
  const filteredList = useMemo(() => {
    if (!search.trim()) return categoryStats;
    const q = getCategoryKey(search);
    return categoryStats.filter((c) => c.key.includes(q) || c.displayName.toLowerCase().includes(q));
  }, [categoryStats, search]);

  if (!isOpen) return null;

  const handleToggleCategory = (key: string) => {
    const isCurrentlyHidden = hiddenCategories.includes(key);
    let updated: string[];
    if (isCurrentlyHidden) {
      // Unhide
      updated = hiddenCategories.filter((k) => k !== key);
    } else {
      // Hide
      updated = [...hiddenCategories, key];
    }
    onUpdateHiddenCategories(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleEnableAll = () => {
    onUpdateHiddenCategories([]);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleHideNonCommercial = () => {
    // Automatically hide known internal categories like 'embalaje', 'herramientas', etc.
    const internalKeys = categoryStats
      .filter((c) => c.key.includes('embalaje') || c.key.includes('herramienta') || c.key.includes('insumo') || c.key.includes('taller'))
      .map((c) => c.key);
    
    const combined = Array.from(new Set([...hiddenCategories, ...internalKeys]));
    onUpdateHiddenCategories(combined);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const totalVisibleCount = categoryStats.filter((c) => !hiddenCategories.includes(c.key)).length;
  const totalHiddenCount = categoryStats.filter((c) => hiddenCategories.includes(c.key)).length;

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0e121b] border-2 border-amber-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up cursor-default"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#121622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Store size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl uppercase tracking-tight text-white flex items-center gap-2">
                <span>Categorías de la Tienda Online</span>
                {saveToast && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full animate-fade-in flex items-center gap-1">
                    <CheckCircle2 size={10} /> Guardado
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Selecciona qué categorías se muestran a los clientes en el e-commerce
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500/60 hover:border-red-600 flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md shadow-red-500/20 shrink-0"
            title="Cerrar ventana"
            aria-label="Cerrar ventana"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-200/90">
          <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            Las categorías <strong>desactivadas</strong> (como <em>Embalaje</em> o herramientas internas) se mantendrán registradas en tu <strong>inventario contable</strong>, pero quedarán ocultas en la tienda pública para que los clientes solo vean accesorios disponibles para la venta.
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0a0d14]">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 outline-none font-medium"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnableAll}
              className="text-[10px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-2.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Mostrar Todas
            </button>
            <button
              type="button"
              onClick={handleHideNonCommercial}
              className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              title="Oculta automáticamente categorías como Embalaje, Herramientas, etc."
            >
              Ocultar Embalaje / Internos
            </button>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="px-4 py-2 bg-[#0d1017] border-b border-white/5 flex items-center justify-between text-[10px] font-bold">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <Eye size={12} /> {totalVisibleCount} Visibles en tienda
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400 flex items-center gap-1 font-mono">
              <EyeOff size={12} /> {totalHiddenCount} Ocultas
            </span>
          </div>
          <span className="text-slate-400">{categoryStats.length} categorías en total</span>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Boxes size={32} className="mx-auto text-slate-600" />
              <p className="text-xs">No se encontraron categorías con ese criterio.</p>
            </div>
          ) : (
            filteredList.map((cat) => {
              const isHidden = hiddenCategories.includes(cat.key);
              return (
                <div
                  key={cat.key}
                  onClick={() => handleToggleCategory(cat.key)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isHidden
                      ? 'bg-rose-950/15 border-rose-500/20 text-slate-400 hover:border-rose-500/40'
                      : 'bg-[#141926] border-emerald-500/30 text-white hover:border-emerald-400/60 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                      isHidden ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </div>

                    <div className="overflow-hidden">
                      <span className={`font-bold text-xs sm:text-sm block truncate ${isHidden ? 'text-slate-400 line-through decoration-rose-500/60' : 'text-white'}`}>
                        {cat.displayName}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>{cat.count} productos</span>
                        <span>•</span>
                        <span className={cat.inStockCount > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {cat.inStockCount} con stock
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border font-mono ${
                      isHidden
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {isHidden ? 'Oculta en Tienda' : 'Visible en Tienda'}
                    </span>

                    {/* Toggle button visual indicator */}
                    <div className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center ${
                      isHidden ? 'bg-slate-700 justify-start' : 'bg-emerald-500 justify-end'
                    }`}>
                      <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0a0d14] flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
            Los cambios se aplican al instante en la tienda online.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase text-xs rounded-xl cursor-pointer transition-all ml-auto"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
