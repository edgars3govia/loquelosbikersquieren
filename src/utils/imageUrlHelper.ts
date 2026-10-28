/**
 * Utility to convert share links from Google Drive, Dropbox, OneDrive, etc. 
 * into direct embeddable image URLs for <img> tags.
 */

export function formatDirectImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // Fix protocol-relative URLs (e.g. //cbu01.alicdn.com/...)
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  // 0. Si ya es únicamente el ID plano del archivo (ej: 1tAu03-CaMWNdGb)
  if (!url.includes('/') && !url.includes('.') && /^[a-zA-Z0-9_-]{10,}$/.test(url)) {
    return `https://lh3.googleusercontent.com/d/${url}`;
  }

  // 1. Google Drive Links
  // Examples:
  // - https://drive.google.com/file/d/1yeiuFVrRV3Vyspoy6i-_lnMlhe6ZG2CJ/view?usp=drive_link
  // - https://drive.google.com/open?id=1yeiuFVrRV3Vyspoy6i-_lnMlhe6ZG2CJ
  // - https://drive.google.com/uc?id=1yeiuFVrRV3Vyspoy6i-_lnMlhe6ZG2CJ
  // - https://docs.google.com/uc?id=1yeiuFVrRV3Vyspoy6i-_lnMlhe6ZG2CJ
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                        url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                        url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // lh3.googleusercontent.com/d/{id} is Google's high-speed direct CDN for Drive files
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // 2. Dropbox Links
  // Examples: https://www.dropbox.com/s/xyz/photo.jpg?dl=0
  if (url.includes('dropbox.com')) {
    url = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    url = url.replace(/[?&]dl=0/, '?dl=1');
    return url;
  }

  // 3. OneDrive Links (1drv.ms or onedrive.live.com)
  if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
    // If it's a direct embed URL keep it, else return as-is or transform
    if (url.includes('download?')) {
      return url;
    }
  }

  // 4. Imgur Links without extension
  if (url.includes('imgur.com') && !url.includes('i.imgur.com') && !url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    const imgurId = url.split('/').pop()?.split('?')[0];
    if (imgurId) {
      return `https://i.imgur.com/${imgurId}.jpg`;
    }
  }

  return url;
}

/**
 * Fallback URL generator in case the primary CDN URL fails (e.g. for Google Drive)
 */
export function getFallbackImageUrl(url: string): string | null {
  if (!url) return null;
  
  if (url.includes('lh3.googleusercontent.com/d/')) {
    const fileId = url.split('/d/')[1]?.split('?')[0];
    if (fileId) {
      // Secondary fallback for Google Drive
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }

  if (url.includes('drive.google.com/thumbnail')) {
    const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  return null;
}

/**
 * Extrae únicamente el ID del archivo de Google Drive (la cadena alfanumérica
 * de caracteres que está justo después de /d/ o ?id= en la URL) y retorna
 * sólo ese código plano (ej: 1tAu03-CaMWNdGb).
 */
export function extractDriveFileId(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const url = rawUrl.trim();
  if (!url) return '';

  // 1. Extraer lo que está justo después de /d/ (ej: /file/d/1tAu03-CaMWNdGb/... o /d/1tAu03-CaMWNdGb)
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }

  // 2. Extraer de parámetros id= (ej: drive.google.com/open?id=1tAu03-CaMWNdGb)
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // 3. Si ya es una cadena alfanumérica directa (código plano de Google Drive)
  if (!url.includes('/') && !url.includes('.') && /^[a-zA-Z0-9_-]{10,}$/.test(url)) {
    return url;
  }

  return '';
}
