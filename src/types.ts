export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  peso_g: number;
  precio_rmb: number;
  stock_disponible: number;
  costo_fob_usd?: number;
  costo_flete_aereo?: number;
  costo_flete_barco?: number;
  costo_aereo_base?: number;
  costo_aereo_brecha?: number;
  costo_barco_base?: number;
  costo_barco_brecha?: number;
  costo_landed_aereo: number;
  costo_landed_barco: number;
  costo_real_unitario?: number;
  metodo_envio_ultimo_pedido?: 'aereo' | 'barco';
  es_costo_real_confirmado?: boolean;
  fecha_ultimo_pedido?: string;
  ultimo_pedido_unidades?: number;
  ultimo_pedido_id?: string;
  precio_venta_ref?: number;
  precio_mayor?: number;
  precio_gran_mayor?: number;
  ml_precio_sugerido?: number;
  link_1688?: string;
  imagen_url?: string; // Enlace original de la foto/imagen del producto
  imagen_portada?: string; // Enlace adicional específico para la foto de portada
  imagenes_secundarias?: string[]; // Galería de fotos adicionales del producto
  imagenes?: string[]; // Lista completa de imágenes del producto
  imagen_grupo?: string; // Columna manual F en hoja de cálculo (no sobreescrita por inventario)
  estilo?: string; // Columna manual G en hoja de cálculo: estilo (no sobreescrita)
  palabras_clave?: string; // Columna manual H en hoja de cálculo: palabras clave (descripcion) (no sobreescrita)
  link?: string; // Compatible con enlace original
  categoria?: string;
  categorias?: string[];
  notas?: string;
  grupo_id?: string; // ID del grupo de variantes al que pertenece
  grupo_nombre?: string; // Título general común para todas las variantes (ej: "Casco Integral Pro Venom")
  grupo_imagen_portada?: string; // Enlace adicional de portada para el grupo de variantes
  variante_nombre?: string; // Nombre específico de la variante (ej: "Negro Mate / M", "Rojo / L")
  variante_imagen_miniatura?: string; // Imagen miniatura asociada para el selector visual
  variante_imagen_hd?: string; // Imagen principal en alta resolución
  es_principal_grupo?: boolean; // Define si este producto es la portada/principal del grupo en el catálogo
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GrupoVarianteDef {
  id: string;
  titulo_general: string;
  categoria?: string;
  grupo_imagen_portada?: string; // Enlace adicional de foto de portada para el grupo en el e-commerce
  producto_principal_id?: string;
  variantes: {
    producto_id: string;
    variante_nombre: string;
    es_principal?: boolean;
    imagen_url?: string;
    variante_imagen_miniatura?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalFinancialSettings {
  tarifaAereaGramo: number; // Ej: 0.020
  factorImpuestoAereo: number; // Ej: 1.42
  tasaYuanUSD: number; // Ej: 7.00
  tasaBCV: number; // Sincronizada automáticamente con tasa oficial BCV del día
  tasaSubasta: number; // Tasa de subasta o paralelo
  factorComisionBarco: number; // Ej: 1.07
  tasaEurUSD?: number; // Ej: 1.08
  tipoFleteNacional?: 'asiaven' | 'mrw' | 'ninguno';
  fleteMRW_USD?: number;
}

// Backward compatibility alias
export type GlobalImportVariables = GlobalFinancialSettings;

export interface PedidoHistorialItem {
  productId: string;
  sku: string;
  nombre: string;
  quantity: number;
  peso_g: number;
  unitFobUSD: number;
  unitEnvioUSD: number;
  unitLandedUSD: number;
  subtotalFobUSD: number;
  subtotalEnvioUSD: number;
  subtotalLandedUSD: number;
}

export interface PedidoHistorial {
  id: string;
  userId?: string;
  orderNumber?: string;
  fecha: string;
  shippingMode: 'aereo' | 'barco';
  totalUnits: number;
  totalWeightKg?: number;
  totalFobUSD: number;
  totalEnvioUSD: number;
  totalLandedUSD: number;
  isRealQuotation: boolean;
  realCostoProductosInput?: string;
  realCostoEnvioInput?: string;
  notes?: string;
  items: PedidoHistorialItem[];
  createdAt?: string;
}

export type TipoCotizacionModalidad = 'detal' | 'mayor' | 'gran_mayor' | 'todas';

export interface CotizacionItem {
  productId: string;
  sku: string;
  nombre: string;
  imagen_url?: string;
  categoria?: string;
  cantidad: number;
  precio_detal?: number;
  precio_mayor?: number;
  precio_gran_mayor?: number;
  precio_unitario_aplicado?: number;
  subtotal_detal?: number;
  subtotal_mayor?: number;
  subtotal_gran_mayor?: number;
  subtotal_aplicado?: number;
  notas?: string;
}

export interface Cotizacion {
  id: string;
  userId: string;
  numero_cotizacion: string;
  fecha: string;
  fecha_vencimiento?: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_documento?: string;
  cliente_email?: string;
  cliente_empresa?: string;
  modalidad_precio: TipoCotizacionModalidad;
  items: CotizacionItem[];
  tasaBCV?: number;
  total_detal?: number;
  total_mayor?: number;
  total_gran_mayor?: number;
  total_general: number;
  descuento_porcentaje?: number;
  descuento_monto?: number;
  notas?: string;
  terminos_condiciones?: string;
  estado?: 'borrador' | 'enviada' | 'aprobada' | 'rechazada';
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Producto;
  quantity: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PedidoTiendaItem {
  productId: string;
  sku: string;
  nombre: string;
  imagen_url?: string;
  categoria?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PedidoTienda {
  id: string;
  numero_pedido: string;
  fecha: string;
  cliente_nombre: string;
  cliente_cedula: string;
  cliente_telefono: string;
  direccion_agencia_envio: string;
  items: PedidoTiendaItem[];
  tasaBCV: number;
  totalUSD: number;
  totalBS: number;
  metodo_pago?: string;
  notas_cliente?: string;
  estado: 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';
  origen: 'web_ecommerce';
  createdAt: string;
  updatedAt?: string;
  tipo_confirmacion?: 'whatsapp_manual' | 'comprobante_automatico';
  pago_estado?: 'pendiente_por_whatsapp' | 'pagado_con_comprobante';
  comprobante_url?: string;
  referencia_pago?: string;
  descontado_inventario?: boolean;
  incomeTransactionId?: string;
  confirmedAt?: string;
}

export interface StoreCustomTexts {
  topAnnouncement?: string;
  headerSubtitle?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  badgeProtected?: string;
  badgeDispatch?: string;
  badgePrices?: string;
  stepsBoxTitle?: string;
  step1?: string;
  step2?: string;
  step3?: string;
  catalogTitle?: string;
  catalogSubtitle?: string;
  cartDrawerTitle?: string;
  cartDrawerSubtitle?: string;
  checkoutModalTitle?: string;
  checkoutModalSubtitle?: string;
  optionWhatsappTitle?: string;
  optionWhatsappBadge?: string;
  optionWhatsappDesc?: string;
  optionReceiptTitle?: string;
  optionReceiptBadge?: string;
  optionReceiptDesc?: string;
  btnSubmitWhatsapp?: string;
  btnSubmitReceipt?: string;
  whatsappNotice?: string;
  receiptNotice?: string;
  orderSuccessTitle?: string;
  orderSuccessSubtitle?: string;
  footerTagline?: string;
  [key: string]: string | undefined;
}

export interface PaymentField {
  id: string;
  etiqueta: string;
  valor: string;
  copiable?: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  nombre: string;
  activo: boolean;
  moneda: 'BS' | 'USD' | 'AMBAS';
  instrucciones?: string;
  campos: PaymentField[];
}


