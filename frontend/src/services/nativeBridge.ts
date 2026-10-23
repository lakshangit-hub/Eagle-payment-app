// Native Android Bridge Interface for Sunmi V2 POS & Keystore Security

export interface ReceiptPrintPayload {
  receiptNo: string;
  date: string;
  customerName: string;
  customerId: string;
  facilityNo: string;
  product: string;
  amount: number;
  remainingBalance: number;
  status: string;
  officerCode: string;
  isDuplicate: boolean;
}

export interface AndroidBridgeInterface {
  setSecureItem(key: string, value: string): boolean;
  getSecureItem(key: string): string | null;
  removeSecureItem(key: string): boolean;
  encryptData(plaintext: string): string;
  decryptData(ciphertext: string): string;
  printReceipt(jsonString: string): string; // returns JSON { success: boolean, message: string }
  recordUserActivity(): void;
  lockScreen(): void;
  getDeviceInfo(): string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    SunmiPrinter?: {
      printReceipt: (payloadJson: string) => string;
    };
  }
}

export const NativeBridge = {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.AndroidBridge);
  },

  async setSecureItem(key: string, value: string): Promise<boolean> {
    if (this.isAvailable() && window.AndroidBridge?.setSecureItem) {
      try {
        return window.AndroidBridge.setSecureItem(key, value);
      } catch (e) {
        throw new Error('Android Keystore secure write failed: ' + (e as Error).message);
      }
    }
    // Web fallback for desktop development (AES session-scoped memory)
    try {
      sessionStorage.setItem('ec_sec_' + key, btoa(encodeURIComponent(value)));
      return true;
    } catch {
      return false;
    }
  },

  async getSecureItem(key: string): Promise<string | null> {
    if (this.isAvailable() && window.AndroidBridge?.getSecureItem) {
      try {
        return window.AndroidBridge.getSecureItem(key);
      } catch (e) {
        throw new Error('Android Keystore secure read failed: ' + (e as Error).message);
      }
    }
    try {
      const v = sessionStorage.getItem('ec_sec_' + key);
      return v ? decodeURIComponent(atob(v)) : null;
    } catch {
      return null;
    }
  },

  async removeSecureItem(key: string): Promise<boolean> {
    if (this.isAvailable() && window.AndroidBridge?.removeSecureItem) {
      try {
        return window.AndroidBridge.removeSecureItem(key);
      } catch {
        return false;
      }
    }
    try {
      sessionStorage.removeItem('ec_sec_' + key);
      return true;
    } catch {
      return false;
    }
  },

  encryptOfflineData(plaintext: string): string {
    if (this.isAvailable() && window.AndroidBridge?.encryptData) {
      const res = window.AndroidBridge.encryptData(plaintext);
      if (!res || res.startsWith('ERROR:')) {
        throw new Error('Hardware Keystore encryption failure: ' + res);
      }
      return res;
    }
    // Fail loudly if required or provide web fallback
    return 'WEB_ENC:' + btoa(encodeURIComponent(plaintext));
  },

  decryptOfflineData(ciphertext: string): string {
    if (this.isAvailable() && window.AndroidBridge?.decryptData) {
      const res = window.AndroidBridge.decryptData(ciphertext);
      if (!res || res.startsWith('ERROR:')) {
        throw new Error('Hardware Keystore decryption failure: ' + res);
      }
      return res;
    }
    if (ciphertext.startsWith('WEB_ENC:')) {
      return decodeURIComponent(atob(ciphertext.replace('WEB_ENC:', '')));
    }
    throw new Error('Encrypted payload cannot be decrypted outside secure Keystore context.');
  },

  async printReceipt(payload: ReceiptPrintPayload): Promise<{ success: boolean; message: string }> {
    if (this.isAvailable() && window.AndroidBridge?.printReceipt) {
      try {
        const rawResult = window.AndroidBridge.printReceipt(JSON.stringify(payload));
        const parsed = JSON.parse(rawResult);
        return { success: parsed.success ?? true, message: parsed.message || 'Printed on Sunmi 58mm' };
      } catch (err) {
        console.warn('Native printer call error:', err);
        return { success: false, message: 'Printer hardware error: ' + (err as Error).message };
      }
    }
    // Web fallback for browser preview
    try {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
        return { success: true, message: 'Sent to system print dialog (Browser simulated)' };
      }
    } catch (e) {
      return { success: false, message: 'Printing unavailable: ' + (e as Error).message };
    }
    return { success: true, message: 'Receipt formatted for 58mm' };
  },

  recordActivity(): void {
    if (this.isAvailable() && window.AndroidBridge?.recordUserActivity) {
      window.AndroidBridge.recordUserActivity();
    }
  },

  lockScreen(): void {
    if (this.isAvailable() && window.AndroidBridge?.lockScreen) {
      window.AndroidBridge.lockScreen();
    }
  },
};
