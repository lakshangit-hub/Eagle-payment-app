import React, { useEffect } from 'react';
import { Customer, Facility } from '../types';
import { formatMoney } from '../utils/format';
import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface ConfirmModalProps {
  isOpen: boolean;
  customer: Customer;
  facility: Facility;
  amount: number;
  isOffline: boolean;
  saving: boolean;
  ready: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  customer,
  facility,
  amount,
  isOffline,
  saving,
  ready,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          playKeyClick();
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-4 bg-[#14233d] text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Review before proceeding
            </div>
            <h2 id="confirm-modal-title" className="text-lg font-bold text-white tracking-tight">
              Confirm Payment
            </h2>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onCancel();
            }}
            disabled={saving}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Customer snippet */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#e9f2ff] text-[#2474e8] font-black text-lg flex items-center justify-center shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-[#172b4d] truncate">{customer.name}</div>
              <div className="text-xs text-[#7183a3] font-medium">{customer.id}</div>
            </div>
          </div>

          {/* Facility metadata */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#f0f4fa]">
            <div>
              <div className="text-[11px] text-[#7183a3] font-medium">Facility No.</div>
              <div className="font-mono font-bold text-[#172b4d] mt-0.5">{facility.no}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#7183a3] font-medium">Product</div>
              <div className="font-semibold text-[#172b4d] mt-0.5 truncate">{facility.product}</div>
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

          {/* Amount Highlight Box */}
          <div className="p-3.5 bg-[#f8fbff] rounded-2xl border border-[#d6e0ef]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#7183a3] mb-0.5">
              Amount to collect
            </div>
            <div className="text-3xl font-black text-[#172b4d] tracking-tight tabular-nums">
              {formatMoney(amount)}
            </div>
          </div>

          {/* Status Notice */}
          <div
            className={`p-3 rounded-xl leading-relaxed flex items-start gap-2.5 ${
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
            <div className="text-[11px]">
              {isOffline
                ? 'Offline mode active · Payment will be sealed with AES-GCM on this device as "Pending Sync". It will sync once online.'
                : 'Online connection active · Payment will be saved and confirmed when connectivity check completes.'}
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
    </div>
  );
};
