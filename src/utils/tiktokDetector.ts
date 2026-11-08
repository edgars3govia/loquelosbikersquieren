/**
 * Detección centralizada de navegadores internos (WebViews) de TikTok,
 * Instagram / Facebook / ByteDance y WebViews móviles sin navegación libre.
 */

export function isTikTokOrInAppBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = (navigator.userAgent || '').toLowerCase();
  const ref = (document.referrer || '').toLowerCase();
  const isTikTokUA = /musical_ly|bytedance|tiktok|trill|bytefull/.test(ua);
  const isTikTokRef = ref.includes('tiktok') || ref.includes('tiktoklinksafety');
  const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isIOSWebView = /(iphone|ipod|ipad)/.test(ua) && !ua.includes('safari');
  const isTestMode = typeof window.location !== 'undefined' && window.location.search.includes('tiktok_test=1');

  return Boolean(isTikTokUA || isTikTokRef || isAndroidWebView || isIOSWebView || isTestMode);
}
