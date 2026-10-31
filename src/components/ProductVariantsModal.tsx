import React, { useState, useMemo } from 'react';
import { 
  X, 
  Boxes, 
  Search, 
  Trash2, 
  Check, 
  Plus, 
  Star, 
  AlertCircle, 
  Image as ImageIcon, 
  Layers, 
  Package, 
  RefreshCw,
  Unlink,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Producto } from '../types';
import { formatDirectImageUrl } from '../utils/imageUrlHelper';
import { formatTitleCase } from '../utils/textUtils';

export const isValidGroupId = (gid?: string | null): boolean => {
  if (!gid || typeof gid !== 'string') return false;
  const clean = gid.trim().toLowerCase();
  return (
    clean !== '' &&
    clean !== 'sin_grupo' &&
    clean !== 'default' &&
    clean !== 'null' &&
    clean !== 'undefined' &&
    clean !== 'none' &&
    clean !== 'no_group' &&
    clean !== 'false'
  );
};

interface ProductVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Producto[];
  initialGroupId?: string | null;
}

export const ProductVariantsModal: React.FC<ProductVariantsModalProps> = ({
  isOpen,
  onClose,
  products,
  initialGroupId = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId);
  const [activeTab, setActiveTab] = useState<'groups' | 'ungrouped' | 'create'>('groups');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Formulario para crear un nuevo grupo
  const [newGroupNombre, setNewGroupNombre] = useState('');
  const [selectedProductIdsForNewGroup, setSelectedProductIdsForNewGroup] = useState<string[]>([]);
  const [newGroupHasKit, setNewGroupHasKit] = useState(false);
  const [newGroupKitNombre, setNewGroupKitNombre] = useState('Kit Completo');
  const [newGroupKitPrecio, setNewGroupKitPrecio] = useState<string>('');
  const [newGroupKitImagen, setNewGroupKitImagen] = useState('');

  // Agrupación estricta usando isValidGroupId
  const { groupsMap, ungroupedList } = useMemo(() => {
    const map = new Map<string, {
      groupId: string;
      nombre: string;
      hasKit: boolean;
      kitNombre?: string;
      kitPrecio?: number;
      kitImagen?: string;
      items: Producto[];
    }>();
    const ungrouped: Producto[] = [];

    products.forEach((p) => {
      if (isValidGroupId(p.grupo_id)) {
        const gid = p.grupo_id!.trim();
        const existing = map.get(gid);
        if (existing) {
          existing.items.push(p);
          if (!existing.kitImagen && p.grupo_kit_imagen) existing.kitImagen = p.grupo_kit_imagen;
          if (!existing.kitNombre && p.grupo_kit_nombre) existing.kitNombre = p.grupo_kit_nombre;
          if ((!existing.kitPrecio || existing.kitPrecio <= 0) && p.grupo_kit_precio) {
            existing.kitPrecio = p.grupo_kit_precio;
          }
          if (p.grupo_tiene_kit) existing.hasKit = true;
        } else {
          map.set(gid, {
            groupId: gid,
            nombre: p.grupo_nombre || p.nombre || 'Grupo sin título',
            hasKit: Boolean(p.grupo_tiene_kit || p.es_kit),
            kitNombre: p.grupo_kit_nombre || p.kit_nombre || 'Kit',
            kitPrecio: p.grupo_kit_precio || undefined,
            kitImagen: p.grupo_kit_imagen || undefined,
            items: [p]
          });
        }
      } else {
        ungrouped.push(p);
      }
    });

    return { groupsMap: map, ungroupedList: ungrouped };
  }, [products]);

  const groupsList = useMemo(() => {
    const list = Array.from(groupsMap.values());
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(g => 
      g.nombre.toLowerCase().includes(q) || 
      g.groupId.toLowerCase().includes(q) ||
      g.items.some(it => it.nombre.toLowerCase().includes(q) || (it.variante_nombre || '').toLowerCase().includes(q))
    );
  }, [groupsMap, searchQuery]);

  // Si se pasa un initialGroupId al abrir
  React.useEffect(() => {
    if (initialGroupId && isValidGroupId(initialGroupId)) {
      setSelectedGroupId(initialGroupId);
      setActiveTab('groups');
    }
  }, [initialGroupId, isOpen]);

  // Auto-limpiar mensajes de estado
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4000);
  };

  // 1. DESVINCULAR UN PRODUCTO ESPECÍFICO DEL GRUPO
  const handleUnbindProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`¿Estás seguro de desvincular "${productName}" de su grupo de variantes?\nPasará a mostrarse como producto independiente en la tienda.`)) {
      return;
    }

    try {
      setIsSaving(true);
      const prodRef = doc(db, 'productos', productId);
      
      // Remover estrictamente las propiedades de grupo y variantes
      await updateDoc(prodRef, {
        grupo_id: null,
        grupo_nombre: null,
        variante_nombre: null,
        es_principal_grupo: false,
        grupo_tiene_kit: false,
        grupo_kit_imagen: null,
        grupo_kit_nombre: null,
        grupo_kit_precio: null,
        updatedAt: new Date().toISOString()
      });

      showFeedback(`"${productName}" fue desvinculado del grupo exitosamente.`);
    } catch (err: any) {
      console.error('Error desvinculando producto:', err);
      showFeedback(`Error al desvincular: ${err.message || 'Fallo desconocido'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. ACTUALIZAR NOMBRE DE VARIANTE O DESIGNAR PRODUCTO PRINCIPAL
  const handleUpdateVariantDetails = async (
    productId: string, 
    varianteNombre: string, 
    isPrincipal: boolean,
    allGroupItemIds: string[]
  ) => {
    try {
      setIsSaving(true);
      const batch = writeBatch(db);
      
      // Si se marca como principal, desmarcar a los demás del grupo
      if (isPrincipal) {
        allGroupItemIds.forEach((id) => {
          if (id !== productId) {
            batch.update(doc(db, 'productos', id), {
              es_principal_grupo: false,
              updatedAt: new Date().toISOString()
            });
          }
        });
      }

      batch.update(doc(db, 'productos', productId), {
        variante_nombre: varianteNombre.trim() || null,
        es_principal_grupo: isPrincipal,
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
      showFeedback('Variante actualizada correctamente.');
    } catch (err: any) {
      console.error('Error actualizando variante:', err);
      showFeedback(`Error al guardar: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. ACTUALIZAR CONFIGURACIÓN GENERAL DEL GRUPO (Kit y Título)
  // SEGURIDAD: NUNCA SOBRESCRIBE imagen_url, link o imagenes DE LOS PRODUCTOS
  const handleSaveGroupSettings = async (
    groupId: string, 
    groupItems: Producto[],
    newTitle: string,
    hasKit: boolean,
    kitNombre: string,
    kitPrecio: number | undefined,
    kitImagen: string
  ) => {
    try {
      setIsSaving(true);
      const batch = writeBatch(db);

      groupItems.forEach((item) => {
        const prodRef = doc(db, 'productos', item.id);
        // Solo actualizamos campos de metadatos de grupo y Kit unificado.
        // NUNCA tocamos item.imagen_url, item.link, item.imagen_portada ni item.imagenes!
        batch.update(prodRef, {
          grupo_nombre: newTitle.trim(),
          grupo_tiene_kit: hasKit,
          grupo_kit_nombre: kitNombre.trim() || 'Kit',
          grupo_kit_precio: kitPrecio && kitPrecio > 0 ? kitPrecio : null,
          grupo_kit_imagen: kitImagen.trim() || null,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      showFeedback('Configuración del grupo guardada exitosamente.');
    } catch (err: any) {
      console.error('Error guardando configuración del grupo:', err);
      showFeedback(`Error al guardar: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. CREAR NUEVO GRUPO O ASIGNAR PRODUCTOS
  const handleCreateGroup = async () => {
    if (!newGroupNombre.trim()) {
      showFeedback('Ingresa un título para el nuevo grupo.', 'error');
      return;
    }
    if (selectedProductIdsForNewGroup.length === 0) {
      showFeedback('Selecciona al menos un producto para el grupo.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const newGroupId = `grp_${Date.now()}`;
      const batch = writeBatch(db);

      selectedProductIdsForNewGroup.forEach((pid, index) => {
        const prod = products.find(p => p.id === pid);
        if (prod) {
          const prodRef = doc(db, 'productos', pid);
          // SEGURIDAD: Solo se asignan identificadores de grupo y variante.
          // Las fotos originales del producto (imagen_url, link, imagen_portada) se mantienen 100% intactas.
          batch.update(prodRef, {
            grupo_id: newGroupId,
            grupo_nombre: newGroupNombre.trim(),
            variante_nombre: prod.variante_nombre || prod.nombre,
            es_principal_grupo: index === 0,
            grupo_tiene_kit: newGroupHasKit,
            grupo_kit_nombre: newGroupKitNombre.trim() || 'Kit Completo',
            grupo_kit_precio: Number(newGroupKitPrecio) || null,
            grupo_kit_imagen: newGroupKitImagen.trim() || null,
            updatedAt: new Date().toISOString()
          });
        }
      });

      await batch.commit();
      showFeedback(`Grupo "${newGroupNombre}" creado exitosamente con ${selectedProductIdsForNewGroup.length} variantes.`);
      setNewGroupNombre('');
      setSelectedProductIdsForNewGroup([]);
      setNewGroupKitImagen('');
      setSelectedGroupId(newGroupId);
      setActiveTab('groups');
    } catch (err: any) {
      console.error('Error creando grupo:', err);
      showFeedback(`Error: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in text-[#111111]">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#FF5200] flex items-center justify-center">
              <Boxes size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111111] leading-tight flex items-center gap-2">
                <span>Gestor de Variantes y Grupos</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Panel Admin
                </span>
              </h2>
              <p className="text-xs text-[#555555]">
                Supervisa y desvincula productos mal agrupados para asegurar fotos y miniaturas 100% exactas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-red-500 hover:text-white text-gray-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Cerrar ventana"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* FEEDBACK NOTIFICATION */}
        {statusMsg && (
          <div className={`px-5 py-2.5 text-xs font-bold flex items-center gap-2 border-b shrink-0 animate-fade-in ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {statusMsg.type === 'success' ? <Check size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* TABS & SEARCH BAR */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'groups'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-[#555555]'
              }`}
            >
              <Layers size={14} />
              <span>Grupos Existentes ({groupsMap.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ungrouped')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ungrouped'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-[#555555]'
              }`}
            >
              <Package size={14} />
              <span>Sin Grupo ({ungroupedList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-[#FF5200] text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-[#FF5200] border border-amber-200'
              }`}
            >
              <Plus size={14} />
              <span>Crear Nuevo Grupo</span>
            </button>
          </div>

          <div className="relative min-w-[220px] max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar grupo o producto..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs text-[#111111] focus:outline-none focus:border-[#FF5200] bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/50">

          {/* TAB 1: GRUPOS EXISTENTES */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              {groupsList.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
                  <Boxes size={32} className="mx-auto text-gray-400 opacity-60" />
                  <p className="text-sm font-bold text-gray-600">No se encontraron grupos con los filtros actuales.</p>
                  <p className="text-xs text-gray-400">Todos los productos sin grupo aparecen en la pestaña &quot;Sin Grupo&quot;.</p>
                </div>
              ) : (
                groupsList.map((grp) => {
                  const isExpanded = selectedGroupId === grp.groupId;
                  return (
                    <GroupCardEditor
                      key={grp.groupId}
                      group={grp}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setSelectedGroupId(isExpanded ? null : grp.groupId)}
                      onUnbindProduct={handleUnbindProduct}
                      onUpdateVariant={handleUpdateVariantDetails}
                      onSaveGroup={handleSaveGroupSettings}
                      isSaving={isSaving}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PRODUCTOS SIN GRUPO (INDEPENDIENTES) */}
          {activeTab === 'ungrouped' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p>
                  Estos productos no pertenecen a ningún grupo (su <code>grupo_id</code> es nulo o inválido). Se muestran como tarjetas independientes en el catálogo del e-commerce.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ungroupedList
                  .filter(p => !searchQuery.trim() || p.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((p) => {
                    const thumbUrl = formatDirectImageUrl(p.variante_imagen_miniatura || p.imagen_portada || p.link || p.imagen_url);
                    return (
                      <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                          {thumbUrl ? (
                            <img src={thumbUrl} alt={p.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-[#111111] truncate" title={p.nombre}>{p.nombre}</h4>
                          <p className="text-[10px] text-gray-500 font-mono">SKU: {p.sku || 'N/A'}</p>
                          <p className="text-xs font-black text-[#FF5200] font-mono mt-0.5">
                            ${(p.precio_venta_ref || p.precio_mayor || 0).toFixed(2)} USD
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 3: CREAR NUEVO GRUPO */}
          {activeTab === 'create' && (
            <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 max-w-2xl mx-auto shadow-sm">
              <h3 className="text-sm font-medium text-[#111111] border-b border-gray-100 pb-2 flex items-center gap-2">
                <Plus size={16} className="text-[#FF5200]" />
                <span>Crear nueva agrupación de variantes</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#111111] block mb-1">
                    Título general del grupo (ej: &quot;Emblema Metálico 3D Spiderman Araña&quot;)
                  </label>
                  <input
                    type="text"
                    value={newGroupNombre}
                    onChange={(e) => setNewGroupNombre(e.target.value)}
                    placeholder="Nombre que unifica las variantes en el catálogo"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#FF5200]"
                  />
                </div>

                {/* Opción Kit */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#111111]">
                    <input
                      type="checkbox"
                      checked={newGroupHasKit}
                      onChange={(e) => setNewGroupHasKit(e.target.checked)}
                      className="rounded text-[#FF5200] focus:ring-[#FF5200]"
                    />
                    <span>¿Incluye opción de kit unificado (todos los modelos en un paquete)?</span>
                  </label>

                  {newGroupHasKit && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                      <div>
                        <label className="text-[10px] font-medium text-gray-600 block mb-1">Nombre del Kit</label>
                        <input
                          type="text"
                          value={newGroupKitNombre}
                          onChange={(e) => setNewGroupKitNombre(e.target.value)}
                          placeholder="Kit Completo"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-600 block mb-1">Precio Fijo del Kit ($ USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newGroupKitPrecio}
                          onChange={(e) => setNewGroupKitPrecio(e.target.value)}
                          placeholder="Dejar vacío para suma automática"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-gray-600 block mb-1">URL de la Foto Unificada del Kit</label>
                        <input
                          type="text"
                          value={newGroupKitImagen}
                          onChange={(e) => setNewGroupKitImagen(e.target.value)}
                          placeholder="Enlace de Google Drive o URL directa de la foto del kit"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Selección de productos sin grupo */}
                <div>
                  <label className="text-xs font-medium text-[#111111] block mb-1">
                    Selecciona los productos que formarán las variantes de este grupo ({selectedProductIdsForNewGroup.length} seleccionados):
                  </label>
                  <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white custom-scrollbar">
                    {ungroupedList.map((p) => {
                      const isChecked = selectedProductIdsForNewGroup.includes(p.id);
                      const thumb = formatDirectImageUrl(p.variante_imagen_miniatura || p.imagen_portada || p.link || p.imagen_url);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIdsForNewGroup(prev => [...prev, p.id]);
                              } else {
                                setSelectedProductIdsForNewGroup(prev => prev.filter(id => id !== p.id));
                              }
                            }}
                            className="rounded text-[#FF5200] focus:ring-[#FF5200]"
                          />
                          <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt={p.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={14} className="text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-[#111111] block truncate">{p.nombre}</span>
                            <span className="text-[10px] text-gray-500 font-mono">SKU: {p.sku || 'N/A'}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={isSaving || !newGroupNombre.trim() || selectedProductIdsForNewGroup.length === 0}
                  className="w-full py-2.5 rounded-xl bg-[#000000] hover:bg-neutral-800 disabled:opacity-40 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando grupo...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Crear grupo y asignar variantes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-[#555555] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Regla de seguridad activa:</span>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
              Las fotos de cada variante nunca se mezclan ni se sobrescriben.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

// COMPONENTE DE EDICIÓN PARA CADA GRUPO INDIVIDUAL
interface GroupCardEditorProps {
  group: {
    groupId: string;
    nombre: string;
    hasKit: boolean;
    kitNombre?: string;
    kitPrecio?: number;
    kitImagen?: string;
    items: Producto[];
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUnbindProduct: (productId: string, productName: string) => Promise<void>;
  onUpdateVariant: (productId: string, name: string, isPrincipal: boolean, allIds: string[]) => Promise<void>;
  onSaveGroup: (
    groupId: string,
    items: Producto[],
    title: string,
    hasKit: boolean,
    kitNombre: string,
    kitPrecio: number | undefined,
    kitImagen: string
  ) => Promise<void>;
  isSaving: boolean;
}

const GroupCardEditor: React.FC<GroupCardEditorProps> = ({
  group,
  isExpanded,
  onToggleExpand,
  onUnbindProduct,
  onUpdateVariant,
  onSaveGroup,
  isSaving
}) => {
  const [groupTitle, setGroupTitle] = useState(group.nombre);
  const [hasKit, setHasKit] = useState(group.hasKit);
  const [kitNombre, setKitNombre] = useState(group.kitNombre || 'Kit Completo');
  const [kitPrecio, setKitPrecio] = useState<string>(group.kitPrecio ? String(group.kitPrecio) : '');
  const [kitImagen, setKitImagen] = useState(group.kitImagen || '');

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [tempVariantName, setTempVariantName] = useState('');

  const allItemIds = useMemo(() => group.items.map(it => it.id), [group.items]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs transition-all">
      {/* Group Header Row */}
      <div 
        onClick={onToggleExpand}
        className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center shrink-0">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-[#111111] truncate flex items-center gap-2">
              <span>{formatTitleCase(group.nombre)}</span>
              {group.hasKit && (
                <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-medium">
                  Kit activo
                </span>
              )}
            </h3>
            <p className="text-[10px] text-gray-500 font-mono">
              Grupo ID: <span className="text-gray-700 font-medium">{group.groupId}</span> • {group.items.length} variantes vinculadas
            </p>
          </div>
        </div>

        {/* Thumbnail preview strip */}
        <div className="flex items-center gap-1.5 shrink-0">
          {group.items.slice(0, 5).map((item) => {
            const rawThumb = item.variante_imagen_miniatura || item.imagen_portada || item.link || item.imagen_url;
            const thumbUrl = rawThumb ? formatDirectImageUrl(rawThumb) : '';
            return (
              <div
                key={item.id}
                className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center"
                title={item.variante_nombre || item.nombre}
              >
                {thumbUrl ? (
                  <img src={thumbUrl} alt={item.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-medium text-gray-400">?</span>
                )}
              </div>
            );
          })}
          {group.items.length > 5 && (
            <span className="text-[10px] font-medium text-gray-500 font-mono">+{group.items.length - 5}</span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/40 space-y-5 animate-fade-in">
          
          {/* Configuración del Título y Kit del Grupo */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-[#111111] block mb-1">
                  Título general del grupo
                </label>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#FF5200]"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-[#111111] block mb-1">
                  Opción de kit unificado
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasKit}
                    onChange={(e) => setHasKit(e.target.checked)}
                    className="rounded text-[#FF5200] focus:ring-[#FF5200]"
                  />
                  <span>Habilitar compra de Kit ({kitNombre})</span>
                </label>
              </div>
            </div>

            {hasKit && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-gray-100">
                <div>
                  <label className="text-[9.5px] font-bold text-gray-600 block mb-0.5">Nombre de Kit</label>
                  <input
                    type="text"
                    value={kitNombre}
                    onChange={(e) => setKitNombre(e.target.value)}
                    placeholder="Kit Completo"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-bold text-gray-600 block mb-0.5">Precio Kit ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kitPrecio}
                    onChange={(e) => setKitPrecio(e.target.value)}
                    placeholder="Suma automática"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-bold text-gray-600 block mb-0.5">Foto Unificada del Kit</label>
                  <input
                    type="text"
                    value={kitImagen}
                    onChange={(e) => setKitImagen(e.target.value)}
                    placeholder="URL exclusiva del Kit"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => onSaveGroup(
                  group.groupId,
                  group.items,
                  groupTitle,
                  hasKit,
                  kitNombre,
                  Number(kitPrecio) || undefined,
                  kitImagen
                )}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Check size={12} />
                <span>Actualizar Título y Kit del Grupo</span>
              </button>
            </div>
          </div>

          {/* LISTA DE VARIANTES VINCULADAS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-[#111111] flex items-center gap-1.5">
                <Package size={14} className="text-[#FF5200]" />
                <span>Productos / variantes en este grupo ({group.items.length})</span>
              </h4>
              <span className="text-[10px] text-gray-500 font-normal">
                Usa el botón rojo para sacar cualquier producto asignado por error.
              </span>
            </div>

            <div className="space-y-2 divide-y divide-gray-100 bg-white border border-gray-200 rounded-xl p-2">
              {group.items.map((prod) => {
                // EXTRACCIÓN ESTRICTA DE LA MINIATURA DEL PRODUCTO:
                // variantProduct.variante_imagen_miniatura || variantProduct.imagen_portada || variantProduct.link || variantProduct.imagen_url
                const rawThumb = prod.variante_imagen_miniatura || prod.imagen_portada || prod.link || prod.imagen_url;
                const thumbUrl = rawThumb ? formatDirectImageUrl(rawThumb) : '';

                const isEditing = editingVariantId === prod.id;
                const isPrincipal = Boolean(prod.es_principal_grupo);

                return (
                  <div key={prod.id} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    {/* Visual & Identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={prod.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                        ) : (
                          <ImageIcon size={18} className="text-gray-400" />
                        )}
                        {isPrincipal && (
                          <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white p-0.5 rounded shadow-xs" title="Producto principal / portada">
                            <Star size={9} fill="white" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-bold text-[#111111] truncate max-w-xs" title={prod.nombre}>
                            {prod.nombre}
                          </h5>
                          {isPrincipal && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-black">
                              PORTADA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                          <span>SKU: {prod.sku || 'N/A'}</span>
                          <span>•</span>
                          <span>Stock: {prod.stock_disponible || 0}</span>
                          <span>•</span>
                          <span className="text-[#FF5200] font-black">${(prod.precio_venta_ref || prod.precio_mayor || 0).toFixed(2)} USD</span>
                        </div>
                        {/* Indicador de foto propia */}
                        <p className="text-[9.5px] text-gray-400 truncate max-w-sm mt-0.5" title={rawThumb}>
                          Foto propia: <span className="font-mono">{rawThumb ? rawThumb.slice(0, 32) + '...' : 'Sin foto'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Variant Name & Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempVariantName}
                            onChange={(e) => setTempVariantName(e.target.value)}
                            placeholder="Ej: Negro, Rojo, M"
                            className="px-2 py-1 text-xs border border-[#FF5200] rounded-lg font-bold w-28 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateVariant(prod.id, tempVariantName, isPrincipal, allItemIds);
                              setEditingVariantId(null);
                            }}
                            className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            title="Guardar nombre"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingVariantId(null)}
                            className="p-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                            title="Cancelar"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVariantId(prod.id);
                            setTempVariantName(prod.variante_nombre || '');
                          }}
                          className="px-2 py-1 rounded-lg border border-gray-200 hover:border-gray-400 bg-white text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1"
                          title="Cambiar etiqueta del modelo"
                        >
                          <span className="text-[10px] text-gray-400">Variante:</span>
                          <span className="text-[#111111]">{prod.variante_nombre || 'Sin definir'}</span>
                        </button>
                      )}

                      {/* Botón para marcar como principal */}
                      {!isPrincipal && (
                        <button
                          type="button"
                          onClick={() => onUpdateVariant(prod.id, prod.variante_nombre || prod.nombre, true, allItemIds)}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold cursor-pointer transition-colors"
                          title="Hacer que este modelo sea la portada del grupo en el catálogo"
                        >
                          Hacer Portada
                        </button>
                      )}

                      {/* BOTÓN CRÍTICO SOLICITADO: DESVINCULAR DEL GRUPO */}
                      <button
                        type="button"
                        onClick={() => onUnbindProduct(prod.id, prod.nombre)}
                        disabled={isSaving}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 text-[11px] font-black cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                        title="Remover grupo_id de este producto para que deje de estar agrupado por error"
                      >
                        <Unlink size={12} className="stroke-[2.5]" />
                        <span>Desvincular</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
