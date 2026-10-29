import React, { useState } from 'react';
import { 
  X, 
  Check, 
  RotateCcw, 
  Edit3, 
  Type, 
  SlidersHorizontal, 
  Save, 
  Sparkles, 
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { StoreCustomTexts } from '../types';

export const DEFAULT_STORE_TEXTS: Required<StoreCustomTexts> = {
  topAnnouncement: "Envíos a toda Venezuela vía MRW • Zoom • Tealca • Domesa",
  headerSubtitle: "E-Commerce Oficial • Accesorios para Motos",
  heroTitle: "LO QUE LOS BIKERS QUIEREN",
  heroSubtitle: "Equípate con lo mejor. Selecciona tus productos favoritos, agrega al carrito y recibe directamente en tu agencia de encomienda más cercana.",
  badgeProtected: "Compra Protegida",
  badgeDispatch: "Despacho en 24h",
  badgePrices: "Precios en Bs y USD",
  stepsBoxTitle: "¿CÓMO COMPRAR EN 3 PASOS?",
  step1: "Selecciona tus productos y pulsa \"Agregar al Carrito\".",
  step2: "Ingresa tu Nombre, Cédula, Teléfono y Agencia de envío.",
  step3: "Confirma y recibe tu comprobante directo a tu WhatsApp.",
  catalogTitle: "CATÁLOGO",
  catalogSubtitle: "Explora accesorios seleccionados para tu moto",
  cartDrawerTitle: "Tu Carrito Biker",
  cartDrawerSubtitle: "Revisa tus productos seleccionados",
  checkoutModalTitle: "Datos de Envío y Confirmación",
  checkoutModalSubtitle: "Lo que los bikers quieren • Despacho Seguro",
  optionWhatsappTitle: "Pagar por WhatsApp",
  optionWhatsappBadge: "Sin comprobante previo",
  optionWhatsappDesc: "Envía tu orden y coordina el pago directamente por WhatsApp. El administrador confirmará el pedido manualmente.",
  optionReceiptTitle: "Pagar Ahora y Subir Comprobante",
  optionReceiptBadge: "Confirmación Automática",
  optionReceiptDesc: "Paga de una vez y sube tu comprobante. Tu venta entra a ingresos y el stock se descuenta automáticamente.",
  btnSubmitWhatsapp: "CONFIRMAR Y CONCRETAR POR WHATSAPP",
  btnSubmitReceipt: "CONFIRMAR PAGO Y REGISTRAR VENTA AUTOMÁTICA",
  whatsappNotice: "Al confirmar, tu pedido quedará guardado como recibido para coordinar el pago por WhatsApp con el administrador.",
  receiptNotice: "Al confirmar con comprobante, la venta se registrará de una vez en ingresos y el stock se descontará automáticamente.",
  orderSuccessTitle: "¡PEDIDO RECIBIDO CON ÉXITO!",
  orderSuccessSubtitle: "Tu orden ha sido registrada en el sistema de Lo que los bikers quieren",
  footerTagline: "Pasión por las dos ruedas • Accesorios y equipamiento para motociclistas",
  searchPlaceholder: "busca aqui tus accesorios favoritos, acompañante, led, tapa suichera.."
};

interface StoreTextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTexts: StoreCustomTexts;
  onSaveTexts: (updatedTexts: StoreCustomTexts) => Promise<void>;
  initialFocusKey?: string | null;
}

interface TextGroup {
  id: string;
  name: string;
  icon: string;
  fields: {
    key: keyof StoreCustomTexts;
    label: string;
    description: string;
    isMultiline?: boolean;
  }[];
}

const TEXT_GROUPS: TextGroup[] = [
  {
    id: 'header_hero',
    name: 'Encabezado y Portada (Hero)',
    icon: '🏍️',
    fields: [
      {
        key: 'topAnnouncement',
        label: 'Cintillo Superior de Envíos',
        description: 'Texto que se muestra arriba en la barra de anuncios'
      },
      {
        key: 'headerSubtitle',
        label: 'Subtítulo del Logo',
        description: 'Texto que acompaña al logo en el encabezado'
      },
      {
        key: 'searchPlaceholder',
        label: 'Texto Interno del Buscador (Placeholder)',
        description: 'Texto de sugerencia dentro de la barra de búsqueda'
      },
      {
        key: 'heroTitle',
        label: 'Título Principal de la Portada',
        description: 'El título grande del banner principal'
      },
      {
        key: 'heroSubtitle',
        label: 'Descripción o Lema de la Portada',
        description: 'Párrafo explicativo debajo del título principal',
        isMultiline: true
      },
      {
        key: 'badgeProtected',
        label: 'Insignia 1',
        description: 'Primera viñeta con icono de verificación'
      },
      {
        key: 'badgeDispatch',
        label: 'Insignia 2',
        description: 'Segunda viñeta con icono de camión'
      },
      {
        key: 'badgePrices',
        label: 'Insignia 3',
        description: 'Tercera viñeta con icono de moneda'
      }
    ]
  },
  {
    id: 'steps',
    name: 'Caja de 3 Pasos de Compra',
    icon: '📦',
    fields: [
      {
        key: 'stepsBoxTitle',
        label: 'Título de la Caja de Pasos',
        description: 'Título superior de la caja amarilla de instrucciones'
      },
      {
        key: 'step1',
        label: 'Paso 1',
        description: 'Instrucción del primer paso'
      },
      {
        key: 'step2',
        label: 'Paso 2',
        description: 'Instrucción del segundo paso'
      },
      {
        key: 'step3',
        label: 'Paso 3',
        description: 'Instrucción del tercer paso'
      }
    ]
  },
  {
    id: 'catalog_cart',
    name: 'Catálogo y Carrito',
    icon: '🛒',
    fields: [
      {
        key: 'catalogTitle',
        label: 'Título de la Sección Catálogo',
        description: 'Título que antecede a la lista de productos'
      },
      {
        key: 'catalogSubtitle',
        label: 'Subtítulo del Catálogo',
        description: 'Breve texto explicativo'
      },
      {
        key: 'cartDrawerTitle',
        label: 'Título de la Ventana del Carrito',
        description: 'Encabezado cuando el cliente abre el carrito'
      },
      {
        key: 'cartDrawerSubtitle',
        label: 'Subtítulo del Carrito',
        description: 'Texto debajo del título en el carrito'
      }
    ]
  },
  {
    id: 'checkout_notices',
    name: 'Finalización, Aclaratorias y Éxito',
    icon: '💳',
    fields: [
      {
        key: 'checkoutModalTitle',
        label: 'Título de Ventana de Envío (Checkout)',
        description: 'Título del formulario de datos del cliente'
      },
      {
        key: 'checkoutModalSubtitle',
        label: 'Subtítulo de Ventana de Envío',
        description: 'Texto secundario en el formulario de envío'
      },
      {
        key: 'optionReceiptTitle',
        label: 'Tarjeta Pagar Ahora: Título',
        description: 'Título de la opción de pago inmediato con comprobante'
      },
      {
        key: 'optionReceiptBadge',
        label: 'Tarjeta Pagar Ahora: Insignia',
        description: 'Texto de la pequeña insignia (ej: Confirmación Automática)'
      },
      {
        key: 'optionReceiptDesc',
        label: 'Tarjeta Pagar Ahora: Descripción / Texto explicativo',
        description: 'Texto explicativo dentro de la tarjeta de Pagar Ahora',
        isMultiline: true
      },
      {
        key: 'optionWhatsappTitle',
        label: 'Tarjeta Pagar por WhatsApp: Título',
        description: 'Título de la opción de coordinar por WhatsApp'
      },
      {
        key: 'optionWhatsappBadge',
        label: 'Tarjeta Pagar por WhatsApp: Insignia',
        description: 'Texto de la pequeña insignia (ej: Sin comprobante previo)'
      },
      {
        key: 'optionWhatsappDesc',
        label: 'Tarjeta Pagar por WhatsApp: Descripción / Texto explicativo',
        description: 'Texto explicativo dentro de la tarjeta de WhatsApp',
        isMultiline: true
      },
      {
        key: 'btnSubmitReceipt',
        label: 'Botón de Confirmar con Comprobante',
        description: 'Texto del botón principal al subir comprobante'
      },
      {
        key: 'btnSubmitWhatsapp',
        label: 'Botón de Confirmar por WhatsApp',
        description: 'Texto del botón principal al concretar por WhatsApp'
      },
      {
        key: 'whatsappNotice',
        label: 'Aclaratoria para Modalidad WhatsApp',
        description: 'Texto que aclara cómo se concreta el pedido por WhatsApp',
        isMultiline: true
      },
      {
        key: 'receiptNotice',
        label: 'Aclaratoria para Modalidad Comprobante',
        description: 'Texto que aclara la reserva y registro automático al subir pago',
        isMultiline: true
      },
      {
        key: 'orderSuccessTitle',
        label: 'Título de Pantalla de Pedido Exitoso',
        description: 'Mensaje que ve el cliente una vez completada la orden'
      },
      {
        key: 'orderSuccessSubtitle',
        label: 'Subtítulo de Pantalla de Pedido Exitoso',
        description: 'Mensaje de agradecimiento o confirmación de recepción'
      },
      {
        key: 'footerTagline',
        label: 'Texto del Pie de Página (Footer)',
        description: 'Texto que aparece al final de la tienda'
      }
    ]
  }
];

export const StoreTextEditorModal: React.FC<StoreTextEditorModalProps> = ({
  isOpen,
  onClose,
  customTexts,
  onSaveTexts,
  initialFocusKey
}) => {
  const [formData, setFormData] = useState<StoreCustomTexts>(() => ({ ...customTexts }));
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (initialFocusKey) {
      const foundGroup = TEXT_GROUPS.find(g => g.fields.some(f => f.key === initialFocusKey));
      if (foundGroup) return foundGroup.id;
    }
    return 'header_hero';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if initialFocusKey changes or modal reopens
  React.useEffect(() => {
    setFormData({ ...customTexts });
    if (initialFocusKey) {
      const foundGroup = TEXT_GROUPS.find(g => g.fields.some(f => f.key === initialFocusKey));
      if (foundGroup) setActiveTabId(foundGroup.id);
    }
  }, [isOpen, initialFocusKey, customTexts]);

  if (!isOpen) return null;

  const handleChange = (key: keyof StoreCustomTexts, val: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleResetField = (key: keyof StoreCustomTexts) => {
    setFormData(prev => ({
      ...prev,
      [key]: DEFAULT_STORE_TEXTS[key]
    }));
  };

  const handleResetAll = () => {
    if (window.confirm("¿Deseas restablecer todos los textos a sus valores predeterminados de fábrica?")) {
      setFormData({ ...DEFAULT_STORE_TEXTS });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveTexts(formData);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar los textos de la tienda.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentGroup = TEXT_GROUPS.find(g => g.id === activeTabId) || TEXT_GROUPS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0e121b] border-2 border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl animate-scale-up my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0a0d14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl uppercase tracking-tight text-white leading-none">
                Editor de Textos y Aclaratorias de la Tienda
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5">
                Modifica, resume o quita cualquier texto fijo visible en el e-commerce (Solo Administrador)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 rounded-xl text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
              title="Restablecer todos los textos al diseño original"
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">Restablecer Todo</span>
            </button>
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
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#080a10] border-b border-white/5 px-3 sm:px-5 py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar">
          {TEXT_GROUPS.map((group) => {
            const isActive = group.id === activeTabId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveTabId(group.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                    : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                }`}
              >
                <span>{group.icon}</span>
                <span>{group.name}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block text-white text-[11px]">Personalización en tiempo real:</span>
              Puedes editar cualquier casilla para cambiar los títulos, lemas o aclaratorias que aparecen en tu e-commerce. Los cambios se guardan de inmediato en la base de datos y se reflejarán para todos los clientes.
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {currentGroup.fields.map((field) => {
              const currentValue = formData[field.key] !== undefined ? formData[field.key] : DEFAULT_STORE_TEXTS[field.key];
              const isModified = currentValue !== DEFAULT_STORE_TEXTS[field.key];

              return (
                <div 
                  key={field.key} 
                  id={`field-row-${field.key}`}
                  className={`bg-[#0a0d14] border rounded-2xl p-3.5 sm:p-4 space-y-2 transition-all ${
                    initialFocusKey === field.key 
                      ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="text-xs sm:text-[13px] font-bold text-white flex items-center gap-1.5">
                        <span>{field.label}</span>
                        {isModified && (
                          <span className="text-[8px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                            Personalizado
                          </span>
                        )}
                      </label>
                      <p className="text-[10px] text-slate-400">{field.description}</p>
                    </div>

                    {isModified && (
                      <button
                        type="button"
                        onClick={() => handleResetField(field.key)}
                        className="text-[9px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors p-1"
                        title="Restablecer al texto original"
                      >
                        <RotateCcw size={10} />
                        <span>Restablecer</span>
                      </button>
                    )}
                  </div>

                  {field.isMultiline ? (
                    <textarea
                      rows={3}
                      value={currentValue || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={DEFAULT_STORE_TEXTS[field.key]}
                      className="w-full bg-[#121622] border border-white/15 focus:border-amber-400 rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-slate-600 outline-none transition-all resize-y font-sans leading-relaxed"
                    />
                  ) : (
                    <input
                      type="text"
                      value={currentValue || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={DEFAULT_STORE_TEXTS[field.key]}
                      className="w-full bg-[#121622] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 outline-none transition-all font-sans"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-[#0e121b] py-2">
            <span className="text-[10px] text-slate-400">
              💡 Tip: Deja el campo como prefieras o resúmelo para adaptarlo al estilo de tu marca.
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black uppercase text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check size={14} className="stroke-[3]" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{isSaving ? 'Guardando...' : 'Guardar Todos los Textos'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
