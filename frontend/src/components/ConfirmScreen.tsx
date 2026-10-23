import React from 'react';
import { Customer, Facility } from '../types';
import { formatMoney } from '../utils/format';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface ConfirmScreenProps {
  customer: Customer;
  facility: Facility;
  amount: number;
  isOffline: boolean;
  saving: boolean;
  ready: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmScreen: React.FC<ConfirmScreenProps> = ({
  customer,
  facility,
  amount,
  isOffline,
  saving,
  ready,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
          Review before proceeding
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Confirm Payment</h1>
      </div>

      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-5 shadow-xs space-y-4">
        {/* Customer snippet */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#e9f2ff] text-[#2474e8] font-black text-lg flex items-center justify-center shrink-0">
            {customer.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-base text-[#172b4d]">{customer.name}</div>
            <div className="text-xs text-[#7183a3] font-medium">{customer.id}</div>
          </div>
        </div>

        {/* Facility metadata */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#f0f4fa] text-xs">
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium">Facility No.</div>
            <div className="font-mono font-bold text-[#172b4d] mt-0.5">{facility.no}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium">Product</div>
            <div className="font-semibold text-[#172b4d] mt-0.5">{facility.product}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium">Current outstanding</div>
            <div className="font-semibold text-[#172b4d] tabular-nums mt-0.5">
              {formatMoney(facility.balance)}
            </div>
          </div>
          {facility.arrears > 0 ? (
            <div>
              <div className="text-[11px] text-[#e34854] font-semibold">Arrears</div>
              <div className="font-bold text-sm text-[#e34854] tabular-nums mt-0.5">
                {formatMoney(facility.arrears)}
                {facility.arrearsRentals > 0 && (
                  <span className="text-[10px] font-normal text-rose-500 ml-1">
                    ({facility.arrearsRentals} {facility.arrearsRentals === 1 ? 'rental' : 'rentals'})
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] text-[#7183a3] font-medium">Installment</div>
              <div className="font-semibold text-[#2474e8] tabular-nums mt-0.5">
                {formatMoney(facility.installment)}
              </div>
            </div>
          )}
        </div>

        {/* Big highlighted amount */}
        <div className="pt-3 border-t border-[#e3eaf4]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
            Amount to collect
          </div>
          <div className="text-3xl font-black text-[#172b4d] tracking-tight tabular-nums">
            {formatMoney(amount)}
          </div>
        </div>

        {/* Status Notice */}
        <div
          className={`p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 ${
            isOffline
              ? 'bg-[#fff2d9] text-[#9b6100] border border-amber-200'
              : 'bg-[#e9f2ff] text-[#2058a5] border border-[#d6e4f9]'
          }`}
        >
          {isOffline ? (
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          )}
          <div>
            {isOffline
              ? 'Offline mode active · Payment will be sealed with AES-GCM on this device as "Pending Sync". It will automatically sync once online.'
              : 'Online connection active · Payment will be saved and confirmed when device connectivity check completes.'}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onConfirm}
            disabled={!ready || saving}
            className="w-full py-3.5 px-4 bg-[#2474e8] hover:bg-[#1c62cb] disabled:opacity-50 active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-[#2474e8]/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
          >
            {saving ? (
              <span>Saving securely to device vault…</span>
            ) : isOffline ? (
              <span>Save Offline Payment</span>
            ) : (
              <span>Confirm Payment</span>
            )}
          </button>
          <button
            onClick={() => {
              playKeyClick();
              onCancel();
            }}
            disabled={saving}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-[#172b4d] font-semibold text-xs rounded-xl transition-all cursor-pointer text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
