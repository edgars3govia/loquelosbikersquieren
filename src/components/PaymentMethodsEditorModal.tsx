import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Check, 
  CreditCard, 
  AlertCircle,
  CheckCircle2,
  MoveDown,
  MoveUp,
  Copy,
  DollarSign
} from 'lucide-react';
import { PaymentMethodConfig, PaymentField } from '../types';
import { DEFAULT_PAYMENT_METHODS } from '../constants/defaultPaymentMethods';

interface PaymentMethodsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  methods: PaymentMethodConfig[];
  onSaveMethods: (updatedMethods: PaymentMethodConfig[]) => Promise<void>;
}

export const PaymentMethodsEditorModal: React.FC<PaymentMethodsEditorModalProps> = ({
  isOpen,
  onClose,
  methods,
  onSaveMethods
}) => {
  const [editingMethods, setEditingMethods] = useState<PaymentMethodConfig[]>(() => 
    methods && methods.length > 0 ? JSON.parse(JSON.stringify(methods)) : JSON.parse(JSON.stringify(DEFAULT_PAYMENT_METHODS))
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string>(() => 
    (methods && methods.length > 0 ? methods[0].id : DEFAULT_PAYMENT_METHODS[0].id)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const initial = methods && methods.length > 0 
        ? JSON.parse(JSON.stringify(methods)) 
        : JSON.parse(JSON.stringify(DEFAULT_PAYMENT_METHODS));
      setEditingMethods(initial);
      if (initial.length > 0 && !initial.some((m: PaymentMethodConfig) => m.id === selectedMethodId)) {
        setSelectedMethodId(initial[0].id);
      }
      setSavedSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, methods]);

  if (!isOpen) return null;

  const currentMethod = editingMethods.find(m => m.id === selectedMethodId) || editingMethods[0];

  const handleUpdateCurrentMethod = (field: keyof PaymentMethodConfig, value: any) => {
    setEditingMethods(prev => prev.map(m => {
      if (m.id === selectedMethodId) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const handleUpdateField = (fieldId: string, prop: keyof PaymentField, value: any) => {
    setEditingMethods(prev => prev.map(m => {
      if (m.id === selectedMethodId) {
        return {
          ...m,
          campos: m.campos.map(c => c.id === fieldId ? { ...c, [prop]: value } : c)
        };
      }
      return m;
    }));
  };

  const handleAddField = () => {
    if (!currentMethod) return;
    const newField: PaymentField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      etiqueta: 'Nuevo Dato:',
      valor: '',
      copiable: true
    };
    setEditingMethods(prev => prev.map(m => {
      if (m.id === selectedMethodId) {
        return { ...m, campos: [...m.campos, newField] };
      }
      return m;
    }));
  };

  const handleRemoveField = (fieldId: string) => {
    setEditingMethods(prev => prev.map(m => {
      if (m.id === selectedMethodId) {
        return { ...m, campos: m.campos.filter(c => c.id !== fieldId) };
      }
      return m;
    }));
  };

  const handleAddNewMethod = () => {
    const newId = `metodo_${Date.now()}`;
    const newMethod: PaymentMethodConfig = {
      id: newId,
      nombre: 'Nuevo Método',
      activo: true,
      moneda: 'BS',
      instrucciones: 'Datos para concretar tu pago.',
      campos: [
        { id: `f_${Date.now()}_1`, etiqueta: 'Dato / Cuenta:', valor: '', copiable: true }
      ]
    };
    setEditingMethods(prev => [...prev, newMethod]);
    setSelectedMethodId(newId);
  };

  const handleDeleteMethod = (idToDelete: string) => {
    if (editingMethods.length <= 1) {
      alert("Debes mantener al menos un método de pago disponible.");
      return;
    }
    if (window.confirm("¿Estás seguro de eliminar este método de pago?")) {
      const remaining = editingMethods.filter(m => m.id !== idToDelete);
      setEditingMethods(remaining);
      if (selectedMethodId === idToDelete && remaining.length > 0) {
        setSelectedMethodId(remaining[0].id);
      }
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm("¿Restablecer los métodos de pago a los 4 métodos originales (Pago Móvil, Transferencia, Zinli, USDT)?")) {
      const cloned = JSON.parse(JSON.stringify(DEFAULT_PAYMENT_METHODS));
      setEditingMethods(cloned);
      setSelectedMethodId(cloned[0].id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      // Validate that all methods have a non-empty name
      for (const m of editingMethods) {
        if (!m.nombre.trim()) {
          throw new Error("Todos los métodos de pago deben tener un nombre.");
        }
      }
      await onSaveMethods(editingMethods);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error al guardar los métodos de pago");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0e121b] border-2 border-amber-500/50 rounded-3xl w-full max-w-3xl max-h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden shadow-2xl animate-scale-up my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0a0d14] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-xl uppercase tracking-tight text-white leading-none">
                Configurar Métodos y Datos de Pago
              </h3>
              <p className="text-[10px] sm:text-xs text-amber-300 font-bold uppercase mt-0.5">
                Edita manualmente tus cuentas de Pago Móvil, Transferencia, Zinli, USDT y más
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

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar: Methods List */}
          <div className="w-full md:w-56 bg-[#07090e] border-b md:border-b-0 md:border-r border-white/10 p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto custom-scrollbar shrink-0">
            <div className="hidden md:flex items-center justify-between px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
              <span>Métodos de Pago</span>
              <span>{editingMethods.length}</span>
            </div>

            {editingMethods.map((m) => {
              const isSelected = m.id === selectedMethodId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethodId(m.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-400 text-white shadow-md'
                      : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
                    <span className="truncate">{m.nombre || 'Sin nombre'}</span>
                  </div>
                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-black ${
                    m.moneda === 'BS' ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'
                  }`}>
                    {m.moneda}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleAddNewMethod}
              className="w-full p-2.5 rounded-xl border border-dashed border-amber-400/40 text-amber-300 hover:bg-amber-500/10 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors mt-1 whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>Agregar Método</span>
            </button>
          </div>

          {/* Main Form for Selected Method */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar">
            {errorMessage && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {currentMethod ? (
              <div className="space-y-4">
                {/* Method Name & Currency Header */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#141926] p-3.5 rounded-2xl border border-white/10">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Nombre del Método *
                    </label>
                    <input
                      type="text"
                      value={currentMethod.nombre}
                      onChange={(e) => handleUpdateCurrentMethod('nombre', e.target.value)}
                      placeholder="Ej: Pago Móvil, Zinli, USDT..."
                      className="w-full bg-[#0a0d14] border border-white/15 focus:border-amber-400 p-2.5 rounded-xl text-white text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      Moneda
                    </label>
                    <select
                      value={currentMethod.moneda}
                      onChange={(e) => handleUpdateCurrentMethod('moneda', e.target.value as any)}
                      className="w-full bg-[#0a0d14] border border-white/15 focus:border-amber-400 p-2.5 rounded-xl text-white text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="BS">Bolívares (Bs)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="AMBAS">Ambas Monedas</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteMethod(currentMethod.id)}
                      className="w-full py-2.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      title="Eliminar este método de pago"
                    >
                      <Trash2 size={13} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

                {/* Instructions / Note */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Instrucciones Breves para el Cliente (Opcional):</span>
                    <span className="text-[9px] text-slate-500">Aparece antes de los datos</span>
                  </label>
                  <input
                    type="text"
                    value={currentMethod.instrucciones || ''}
                    onChange={(e) => handleUpdateCurrentMethod('instrucciones', e.target.value)}
                    placeholder="Ej: Realiza el pago e ingresa la referencia o adjunta captura"
                    className="w-full bg-[#141926] border border-white/15 focus:border-amber-400 p-2.5 rounded-xl text-white text-xs outline-none"
                  />
                </div>

                {/* Data Fields Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <CreditCard size={13} />
                      <span>Datos de la Cuenta / Billetera ({currentMethod.campos.length})</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleAddField}
                      className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-lg font-black uppercase flex items-center gap-1 cursor-pointer hover:bg-amber-300 transition-colors shadow-sm"
                    >
                      <Plus size={11} />
                      <span>Agregar Dato</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentMethod.campos.map((campo, idx) => (
                      <div 
                        key={campo.id || idx}
                        className="bg-[#141926] border border-white/10 rounded-xl p-2.5 flex items-center gap-2 flex-wrap sm:flex-nowrap"
                      >
                        {/* Etiqueta / Label */}
                        <div className="w-full sm:w-1/3">
                          <input
                            type="text"
                            value={campo.etiqueta}
                            onChange={(e) => handleUpdateField(campo.id, 'etiqueta', e.target.value)}
                            placeholder="Ej: Banco, Teléfono, Correo..."
                            className="w-full bg-[#0a0d14] border border-white/15 focus:border-amber-400 p-2 rounded-lg text-amber-300 text-xs font-bold outline-none"
                          />
                        </div>

                        {/* Valor / Value */}
                        <div className="w-full sm:flex-1">
                          <input
                            type="text"
                            value={campo.valor}
                            onChange={(e) => handleUpdateField(campo.id, 'valor', e.target.value)}
                            placeholder="Ej: 0412-1234567, V-12345678, correo@ejemplo.com..."
                            className="w-full bg-[#0a0d14] border border-white/15 focus:border-amber-400 p-2 rounded-lg text-white font-mono text-xs font-bold outline-none"
                          />
                        </div>

                        {/* Botón Copiable Toggle & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleUpdateField(campo.id, 'copiable', !campo.copiable)}
                            className={`p-2 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              campo.copiable !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/5 text-slate-500 border border-white/10'
                            }`}
                            title={campo.copiable !== false ? "Tiene botón Copiar para el cliente" : "Solo texto (no copiable)"}
                          >
                            <Copy size={12} />
                            <span className="hidden sm:inline">{campo.copiable !== false ? 'Copiable' : 'Fijo'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveField(campo.id)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer transition-colors"
                            title="Eliminar este dato"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs font-bold">
                Selecciona un método de pago de la lista o agrega uno nuevo.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0a0d14] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Restablecer Métodos Originales</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold uppercase text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 transition-all"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>¡Guardado con Éxito!</span>
                </>
              ) : isSaving ? (
                <>
                  <RotateCcw size={15} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Guardar Métodos y Cuentas</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
