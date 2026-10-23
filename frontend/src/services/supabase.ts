import { createClient } from '@supabase/supabase-js';
import { NativeBridge } from './nativeBridge';
import { Customer, Facility, Guarantor } from '../types';

// Default Supabase project credentials for Eagle Credit
// Frontend only uses the anonymous key (never the service-role key)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://kojw3ok46br7dwfst5lf2i.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_offline_and_custom_connection';

// Custom Auth Storage that stores tokens in Android Keystore-backed secure storage
const keystoreAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return await NativeBridge.getSecureItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await NativeBridge.setSecureItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await NativeBridge.removeSecureItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: keystoreAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface OfficerProfile {
  id: string;
  fullName: string;
  officerCode: string;
  role: 'officer' | 'admin';
}

export async function getCurrentOfficer(): Promise<OfficerProfile | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, officer_code, role')
      .eq('id', user.id)
      .single();

    if (profile) {
      return {
        id: profile.id,
        fullName: profile.full_name,
        officerCode: profile.officer_code,
        role: profile.role,
      };
    }

    return {
      id: user.id,
      fullName: user.email?.split('@')[0] || 'Field Officer',
      officerCode: 'OFFICER-402',
      role: 'officer',
    };
  } catch {
    return null;
  }
}

export async function fetchServerData(): Promise<{
  customers: Customer[];
  facilities: Facility[];
  guarantors: Guarantor[];
}> {
  try {
    const [custRes, facRes, guarRes] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('facilities').select('*').order('facility_no'),
      supabase.from('guarantors').select('*'),
    ]);

    if (custRes.error) throw custRes.error;
    if (facRes.error) throw facRes.error;

    const customers: Customer[] = (custRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      nic: c.nic,
      address: c.address,
      phone: c.phone,
      phone2: c.phone2,
      occupation: c.occupation,
    }));

    const facilities: Facility[] = (facRes.data || []).map((f: any) => ({
      no: f.facility_no,
      customerId: f.customer_id,
      product: f.product,
      original: Number(f.original_amount),
      balance: Number(f.balance),
      installment: Number(f.installment),
      frequency: f.frequency || 'Monthly',
      tenor: f.tenor,
      rate: f.rate,
      arrears: Number(f.arrears || 0),
      arrearsRentals: Number(f.arrears_rentals || 0),
      start: f.start_date,
      maturity: f.maturity_date,
      purpose: f.purpose,
      asset: Boolean(f.has_asset),
      vehicle: f.vehicle,
      make: f.make,
      model: f.model,
      year: f.year,
      market: f.market_value ? Number(f.market_value) : undefined,
      color: f.color,
    }));

    const guarantors: Guarantor[] = (guarRes.data || []).map((g: any) => ({
      customerId: g.customer_id,
      facilityNo: g.facility_no,
      name: g.name,
      relationship: g.relationship,
      address: g.address,
      phone: g.phone,
      nic: g.nic,
    }));

    return { customers, facilities, guarantors };
  } catch (err) {
    console.warn('Supabase fetch failed (device may be offline):', err);
    throw err;
  }
}

export async function fetchFacilityPaymentHistory(facilityNo: string): Promise<Array<{
  date: string;
  receipt: string;
  amount: number;
  status: 'Confirmed' | 'Rejected';
}>> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('receipt_no, amount, status, collected_at')
      .eq('facility_no', facilityNo)
      .order('collected_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((p: any) => {
      const d = new Date(p.collected_at);
      const dateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : p.collected_at;

      return {
        date: dateStr,
        receipt: p.receipt_no,
        amount: Number(p.amount),
        status: p.status,
      };
    });
  } catch {
    return [];
  }
}

export async function postFieldPaymentRPC(
  receiptNo: string,
  facilityNo: string,
  amount: number,
  collectedAt: string
): Promise<{
  status: 'Confirmed' | 'Rejected';
  receipt_no?: string;
  reason?: string;
  remaining_balance?: number;
}> {
  const { data, error } = await supabase.rpc('post_field_payment', {
    p_receipt_no: receiptNo,
    p_facility_no: facilityNo,
    p_amount: amount,
    p_collected_at: collectedAt,
  });

  if (error) {
    return {
      status: 'Rejected',
      reason: error.message || 'Server rejected payment',
    };
  }

  return data as any;
}

export async function logReprintRPC(receiptNo: string, reason?: string): Promise<void> {
  try {
    await supabase.rpc('log_reprint', {
      p_receipt_no: receiptNo,
      p_reason: reason || 'Sunmi V2 Thermal Duplicate Receipt Requested',
    });
  } catch (err) {
    console.warn('Reprint audit log error:', err);
  }
}

export async function logLoginRPC(officerCode: string): Promise<void> {
  try {
    await supabase.rpc('log_login_event', {
      p_officer_code: officerCode,
    });
  } catch (err) {
    console.warn('Login audit log error:', err);
  }
}
