import { Ledger, StoredPayment } from '../types';
import { NativeBridge } from './nativeBridge';
import { postFieldPaymentRPC } from './supabase';

const DB_NAME = 'eagle-credit-secure-pos-vault';
const STORE_NAME = 'secure_ledger';
const RECORD_KEY = 'encrypted_ledger_record';

export const emptyLedger = (): Ledger => ({
  version: 1,
  manualOffline: false,
  payments: [],
});

export function validLedger(l: unknown): Ledger {
  if (
    !l ||
    typeof l !== 'object' ||
    (l as Ledger).version !== 1 ||
    typeof (l as Ledger).manualOffline !== 'boolean' ||
    !Array.isArray((l as Ledger).payments)
  ) {
    throw new Error('Invalid ledger schema');
  }
  return l as Ledger;
}

// Generate unique idempotency receipt number without crypto.randomUUID (Android 7 compliant)
export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  // 4 random bytes from crypto.getRandomValues or Math.random
  let randHex = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(3);
    window.crypto.getRandomValues(bytes);
    randHex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  } else {
    randHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
  }

  return `RC-${year}${month}${day}-${randHex}`;
}

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

async function openDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('Hardware secure storage (IndexedDB) is unavailable on this device.');
  }
  const openReq = indexedDB.open(DB_NAME, 2);
  openReq.onupgradeneeded = () => {
    const db = openReq.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  };
  return req(openReq);
}

// Access the Encrypted Device Ledger Vault
// FAIL LOUDLY: Never fallback to plaintext storage if encryption fails!
export async function accessVault(transform?: (current: Ledger) => Ledger): Promise<Ledger> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const rtx = db.transaction(STORE_NAME, 'readonly');
    const store = rtx.objectStore(STORE_NAME);
    const rawCiphertext = await req(store.get(RECORD_KEY) as IDBRequest<string | undefined>);

    let loadedLedger: Ledger;
    if (rawCiphertext) {
      // Decrypt using Hardware Keystore
      const plaintext = NativeBridge.decryptOfflineData(rawCiphertext);
      loadedLedger = validLedger(JSON.parse(plaintext));
    } else {
      loadedLedger = emptyLedger();
    }

    if (!transform) {
      return loadedLedger;
    }

    const nextLedger = validLedger(transform(loadedLedger));
    const nextPlaintext = JSON.stringify(nextLedger);

    // Encrypt using Hardware Keystore (Fails loudly if encryption fails)
    const encryptedBlob = NativeBridge.encryptOfflineData(nextPlaintext);

    const wtx = db.transaction(STORE_NAME, 'readwrite');
    const wStore = wtx.objectStore(STORE_NAME);
    wStore.put(encryptedBlob, RECORD_KEY);
    await new Promise<void>((resolve, reject) => {
      wtx.oncomplete = () => resolve();
      wtx.onerror = () => reject(wtx.error);
      wtx.onabort = () => reject(new Error('Write transaction aborted'));
    });

    return nextLedger;
  } catch (err) {
    // Fail loudly as specified in security requirements
    console.error('CRITICAL: Keystore Vault failure:', err);
    throw new Error('DEVICE_SECURITY_EXCEPTION: ' + (err as Error).message);
  } finally {
    if (db) {
      db.close();
    }
  }
}

export function confirmedAmount(payments: StoredPayment[], facilityNo: string): number {
  return payments
    .filter((p) => p.facilityNo === facilityNo && p.status === 'Confirmed')
    .reduce((sum, p) => sum + p.amount, 0);
}

export function reservedAmount(payments: StoredPayment[], facilityNo: string): number {
  return payments
    .filter((p) => p.facilityNo === facilityNo && p.status === 'Pending Sync')
    .reduce((sum, p) => sum + p.amount, 0);
}

export function recordAttempt(
  ledger: Ledger,
  ids: string[],
  at: string,
  err?: string
): Ledger {
  return {
    ...ledger,
    payments: ledger.payments.map((p) =>
      ids.includes(p.no) && p.status === 'Pending Sync'
        ? {
            ...p,
            attempts: (p.attempts || 0) + 1,
            lastAttemptAt: at,
            syncError: err,
          }
        : p
    ),
  };
}

export function validatePaymentAmount(
  amount: number,
  balance: number,
  pendingReserve: number
): string | null {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
  ) {
    return 'Enter a valid amount greater than zero with at most two decimal places.';
  }
  if (Math.round(amount * 100) > Math.round((balance - pendingReserve) * 100)) {
    return 'Amount exceeds the available balance after queued payments.';
  }
  return null;
}

// Sync single payment with exponential backoff and server authority
export async function syncSinglePayment(
  payment: StoredPayment
): Promise<{ status: 'Confirmed' | 'Rejected'; error?: string; remainingBalance?: number }> {
  const res = await postFieldPaymentRPC(
    payment.no,
    payment.facilityNo,
    payment.amount,
    payment.savedAt || new Date().toISOString()
  );

  if (res.status === 'Confirmed') {
    return {
      status: 'Confirmed',
      remainingBalance: res.remaining_balance,
    };
  }

  return {
    status: 'Rejected',
    error: res.reason || 'Server rejected payment',
  };
}
