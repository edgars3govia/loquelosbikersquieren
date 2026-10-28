import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-c0bff50d-0bf4-4cb2-83dc-2712ee3eb530';

// Using initializeFirestore instead of getFirestore to enable experimentalForceLongPolling
// which is more reliable in some sandboxed environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firestoreDbId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Preconfigurar login_hint para que Google seleccione automáticamente la cuenta del usuario sin preguntar "¿Con qué cuenta deseas iniciar sesión?"
googleProvider.setCustomParameters({
  login_hint: 'edgars3govia@gmail.com'
});

// Google Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];
WORKSPACE_SCOPES.forEach(scope => googleProvider.addScope(scope));

const GOOGLE_TOKEN_STORAGE_KEY = 'sys_google_workspace_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'sys_google_workspace_token_exp';

// In-memory access token cache with persistent storage fallback
let cachedGoogleAccessToken: string | null = null;

export const setGoogleAccessToken = (token: string | null, _expiresInSeconds?: number) => {
  cachedGoogleAccessToken = token;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, token);
        sessionStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
        localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
        sessionStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
      }
    }
  } catch (e) {
    console.warn("Storage error for Google token:", e);
  }
};

export const getGoogleAccessToken = (): string | null => {
  if (cachedGoogleAccessToken) {
    return cachedGoogleAccessToken;
  }
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY) || sessionStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
      if (stored && typeof stored === 'string' && stored.length > 10) {
        cachedGoogleAccessToken = stored;
        return stored;
      }
    }
  } catch (e) {
    console.warn("Error reading stored Google token:", e);
  }
  return null;
};

// Force LocalStorage persistence to handle browser restrictions on third-party cookies (iOS/ITP)
setPersistence(auth, browserLocalPersistence).catch(console.error);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown error',
    operationType,
    path,
    authInfo: user ? {
      userId: user.uid,
      email: user.email || '',
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerInfo: user.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || '',
      }))
    } : {
      userId: 'unauthenticated',
      email: '',
      emailVerified: false,
      isAnonymous: true,
      providerInfo: []
    }
  };
  throw new Error(JSON.stringify(errorInfo));
}

/**
 * Recursively removes undefined fields from an object so Firestore operations never throw
 * "Function WriteBatch.set() / update() called with invalid data. Unsupported field value: undefined"
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      result[key] = cleanForFirestore(val);
    }
  }
  return result as T;
}
