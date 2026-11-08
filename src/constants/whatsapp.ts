/**
 * Constantes y funciones de enlaces oficiales de WhatsApp para la tienda
 * "Lo que los bikers quieren".
 *
 * Utilizado de manera centralizada en Navbar, Footer, Checkout y la página puente /whatsapp.
 */

export const STORE_WHATSAPP_PHONE = '584128276786';
export const STORE_WHATSAPP_DISPLAY = '0412-8276786';
export const STORE_WHATSAPP_VIP_CHANNEL = 'https://whatsapp.com/channel/0029Vb8OHq784OmKSOFskY3A';

export const STORE_DEFAULT_WHATSAPP_MESSAGE = '¡Hola! Me gustaría hacer una consulta sobre la tienda.';

/**
 * Genera el enlace oficial a la API de WhatsApp con mensaje personalizado o por defecto
 */
export function getWhatsAppDirectUrl(customText?: string): string {
  const text = (customText && customText.trim()) || STORE_DEFAULT_WHATSAPP_MESSAGE;
  return `https://api.whatsapp.com/send?phone=${STORE_WHATSAPP_PHONE}&text=${encodeURIComponent(text)}`;
}

export const STORE_WHATSAPP_DIRECT_URL = getWhatsAppDirectUrl();

/**
 * Resuelve la URL de destino de WhatsApp analizando parámetros de búsqueda (ej. canal VIP o texto personalizado)
 */
export function resolveWhatsAppTargetUrl(searchQuery?: string): string {
  if (!searchQuery) return STORE_WHATSAPP_DIRECT_URL;

  try {
    const params = new URLSearchParams(searchQuery);
    if (params.get('canal') === 'vip' || params.get('channel') === 'vip') {
      return STORE_WHATSAPP_VIP_CHANNEL;
    }
    const customText = params.get('text') || params.get('mensaje');
    if (customText) {
      return getWhatsAppDirectUrl(customText);
    }
  } catch {}

  return STORE_WHATSAPP_DIRECT_URL;
}
