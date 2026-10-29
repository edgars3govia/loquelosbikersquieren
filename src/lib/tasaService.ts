import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface TasaBCVResponse {
  tasa: number;
  fuente?: string;
  fechaActualizacion?: string;
  origen: 'api' | 'cache' | 'fallback';
}

const STORAGE_KEY_TASA = 'biker_store_tasa_bcv';
const STORAGE_KEY_TIMESTAMP = 'biker_store_tasa_bcv_timestamp';
const STORAGE_KEY_FECHA = 'biker_store_tasa_bcv_fecha';

// Fallback razonable si la red o la API falla por completo
export const DEFAULT_TASA_FALLBACK = 45.0;

/**
 * Obtiene la tasa BCV guardada previamente en caché local
 */
export const getCachedTasaBCV = (): number => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TASA);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 1) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error al leer tasa BCV desde caché:', err);
  }
  return 0;
};

/**
 * Guarda la tasa BCV en el almacenamiento local y opcionalmente en Firestore
 */
export const persistTasaBCV = async (tasa: number, fechaActualizacion?: string) => {
  if (!tasa || isNaN(tasa) || tasa <= 1) return;
  
  try {
    localStorage.setItem(STORAGE_KEY_TASA, String(tasa));
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, String(Date.now()));
    if (fechaActualizacion) {
      localStorage.setItem(STORAGE_KEY_FECHA, fechaActualizacion);
    }
  } catch (err) {
    console.warn('Error al guardar tasa BCV en localStorage:', err);
  }

  // Guardar en Firestore para que el historial y configuración del sistema queden actualizados
  try {
    const ref = doc(db, 'configuracion', 'financiera');
    await setDoc(
      ref,
      {
        tasaBCV: tasa,
        fechaActualizacionBCV: fechaActualizacion || new Date().toISOString(),
        ultimaSincronizacion: new Date().toISOString(),
        fuenteTasa: 'https://ve.dolarapi.com/v1/dolares/oficial'
      },
      { merge: true }
    );
  } catch (err) {
    // Si no tiene permisos de escritura o no hay conexión, solo registrar aviso sin romper la app
    console.warn('No se pudo persistir la tasa en Firestore (modo offline/cliente):', err);
  }
};

/**
 * Consulta la tasa oficial del BCV en tiempo real desde DolarAPI
 */
export async function fetchTasaOficialBCV(): Promise<TasaBCVResponse> {
  const cached = getCachedTasaBCV();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // DolarAPI retorna { promedio: number, fechaActualizacion: string, ... }
    const rawVal = data.promedio ?? data.precio ?? data.valor ?? data.monto;
    const tasa = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);

    if (!tasa || isNaN(tasa) || tasa <= 1) {
      throw new Error('Tasa recibida no válida');
    }

    // Persistir tasa
    await persistTasaBCV(tasa, data.fechaActualizacion);

    return {
      tasa,
      fuente: data.nombre || 'Oficial BCV',
      fechaActualizacion: data.fechaActualizacion,
      origen: 'api'
    };
  } catch (error) {
    console.warn('Error al consultar DolarAPI Oficial, usando valor en caché/fallback:', error);

    if (cached > 1) {
      return {
        tasa: cached,
        fuente: 'Caché local',
        origen: 'cache'
      };
    }

    return {
      tasa: DEFAULT_TASA_FALLBACK,
      fuente: 'Respaldo',
      origen: 'fallback'
    };
  }
}
