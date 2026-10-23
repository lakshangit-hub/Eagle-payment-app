export interface Customer {
  id: string;
  name: string;
  nic: string;
  address: string;
  phone: string;
  phone2?: string;
  occupation: string;
}

export interface Facility {
  no: string;
  customerId: string;
  product: string;
  original: number;
  balance: number;
  installment: number;
  frequency: string;
  tenor: string;
  rate: string;
  arrears: number;
  arrearsRentals: number;
  start: string;
  maturity: string;
  purpose: string;
  asset: boolean;
  vehicle?: string;
  make?: string;
  model?: string;
  year?: string;
  market?: number;
  color?: string;
}

export interface Guarantor {
  customerId: string;
  facilityNo?: string;
  name: string;
  relationship: string;
  address: string;
  phone: string;
  nic: string;
}

export interface StoredPayment {
  no: string;
  facilityNo: string;
  customerId: string;
  date: string;
  historyDate: string;
  amount: number;
  status: 'Pending Sync' | 'Confirmed' | 'Rejected';
  savedAt?: string;
  syncedAt?: string;
  attempts?: number;
  lastAttemptAt?: string;
  syncError?: string;
}

export interface Ledger {
  version: number;
  manualOffline: boolean;
  payments: StoredPayment[];
}

export type ScreenType =
  | 'search'
  | 'profile'
  | 'facility'
  | 'guarantors'
  | 'asset'
  | 'history'
  | 'collect'
  | 'confirm'
  | 'receipt'
  | 'sync-status';
