import { PaymentMethodConfig } from '../types';

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'pago_movil',
    nombre: 'Pago Móvil',
    activo: true,
    moneda: 'BS',
    instrucciones: 'Realiza el pago al cambio oficial BCV e ingresa los últimos dígitos de la referencia.',
    campos: [
      { id: 'f1', etiqueta: 'Banco:', valor: 'Banesco (0134) / Bco de Venezuela (0102)', copiable: false },
      { id: 'f2', etiqueta: 'Teléfono:', valor: '0412-1234567', copiable: true },
      { id: 'f3', etiqueta: 'Cédula / RIF:', valor: 'V-12.345.678', copiable: true },
      { id: 'f4', etiqueta: 'Titular:', valor: 'Lo Que Los Bikers Quieren', copiable: false }
    ]
  },
  {
    id: 'transferencia',
    nombre: 'Transferencia',
    activo: true,
    moneda: 'BS',
    instrucciones: 'Transferencia bancaria directa en Bolívares a la tasa oficial.',
    campos: [
      { id: 'f1', etiqueta: 'Banco:', valor: 'Banesco', copiable: false },
      { id: 'f2', etiqueta: 'Cta Banesco:', valor: '0134-0123-45-0123456789', copiable: true },
      { id: 'f3', etiqueta: 'Beneficiario:', valor: 'Lo Que Los Bikers Quieren', copiable: false },
      { id: 'f4', etiqueta: 'RIF:', valor: 'J-50000000-0', copiable: true }
    ]
  },
  {
    id: 'zinli',
    nombre: 'Zinli',
    activo: true,
    moneda: 'USD',
    instrucciones: 'Envía el monto exacto en USD a través de tu billetera Zinli sin comisiones.',
    campos: [
      { id: 'f1', etiqueta: 'Correo Zinli:', valor: 'pagos@loquelosbikersquieren.com', copiable: true },
      { id: 'f2', etiqueta: 'Titular:', valor: 'Lo Que Los Bikers Quieren', copiable: false },
      { id: 'f3', etiqueta: 'Moneda:', valor: 'Dólares (USD)', copiable: false }
    ]
  },
  {
    id: 'usdt',
    nombre: 'USDT',
    activo: true,
    moneda: 'USD',
    instrucciones: 'Envía USDT en red TRC-20 o BEP-20 y adjunta el Hash / ID o captura de pantalla.',
    campos: [
      { id: 'f1', etiqueta: 'Red Cripto:', valor: 'TRC-20 (Tron) / BEP-20 (BSC)', copiable: false },
      { id: 'f2', etiqueta: 'Dirección Billetera:', valor: 'TYsD3k8xG9Q1Lp4mZ2nW6vB7cX0qR5eT1A', copiable: true },
      { id: 'f3', etiqueta: 'Moneda / Token:', valor: 'USDT (Tether USD)', copiable: false }
    ]
  }
];
