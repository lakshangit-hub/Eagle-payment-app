import React from 'react';
import { Customer, Facility } from '../types';
import { formatMoney } from '../utils/format';
import { Delete, ArrowRight } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface CollectScreenProps {
  customer: Customer;
  facility: Facility;
  amount: string;
  amountError: string;
  queuedReserved: number;
  ready: boolean;
  onAmountChange: (val: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const CollectScreen: React.FC<CollectScreenProps> = ({
  customer,
  facility,
  amount,
  amountError,
  queuedReserved,
  ready,
  onAmountChange,
  onContinue,
  onBack,
}) => {
  const availableToCollect = Math.max(0, facility.balance - queuedReserved);

  const handleKeyPress = (key: string) => {
    playKeyClick();
    if (key === '⌫') {
      onAmountChange(amount.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        onAmountChange(amount ? amount + '.' : '0.');
      }
    } else {
      // Prevent entering more than 2 decimal places
      const parts = amount.split('.');
      if (parts[1] && parts[1].length >= 2) return;
      onAmountChange(amount + key);
    }
  };

  const setPreset = (val: number) => {
    playKeyClick();
    const clamped = Math.min(val, availableToCollect);
    onAmountChange(clamped > 0 ? clamped.toString() : '');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
          Field Collection
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Collect Payment</h1>
      </div>

      {/* Customer & Facility Context Card */}
      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#e9f2ff] text-[#2474e8] font-black text-lg flex items-center justify-center shrink-0">
            {customer.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base text-[#172b4d] truncate">{customer.name}</div>
            <div className="text-xs text-[#7183a3] font-mono mt-0.5">{facility.no}</div>
            <div className="text-xs text-[#2474e8] font-medium">{facility.product}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-3 pt-3 border-t border-[#f0f4fa] text-xs">
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium">Outstanding balance</div>
            <div className="font-bold text-sm text-[#172b4d] tabular-nums">
              {formatMoney(facility.balance)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium">Arrears</div>
            <div className="font-bold text-sm text-[#e34854] tabular-nums">
              {formatMoney(facility.arrears)}
            </div>
          </div>
          {queuedReserved > 0 && (
            <>
              <div>
                <div className="text-[11px] text-amber-700 font-medium">Queued payments</div>
                <div className="font-semibold text-amber-800 tabular-nums">
                  {formatMoney(queuedReserved)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-emerald-700 font-medium">Available to collect</div>
                <div className="font-bold text-emerald-700 tabular-nums">
                  {formatMoney(availableToCollect)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amount Input Card */}
      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="amt" className="text-xs font-semibold text-[#172b4d]">
              Payment amount (LKR)
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPreset(facility.installment)}
                className="text-[11px] text-[#2474e8] hover:bg-[#e9f2ff] px-2 py-0.5 rounded font-semibold transition-colors border border-[#d6e0ef] cursor-pointer"
              >
                Installment: {formatMoney(facility.installment)}
              </button>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              Rs.
            </span>
            <input
              id="amt"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full pl-11 pr-4 py-3 bg-[#f8fbff] border border-[#d6e0ef] focus:border-[#2474e8] focus:bg-white focus:ring-3 focus:ring-[#2474e8]/20 rounded-xl text-lg font-bold text-[#172b4d] outline-none transition-all tabular-nums"
            />
          </div>
        </div>

        {amountError && (
          <div
            className="text-xs text-[#e34854] font-medium bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg"
            role="alert"
          >
            {amountError}
          </div>
        )}

        <div className="text-[11px] text-[#7183a3] leading-relaxed">
          Enter the actual cash or check amount received. The amount is not pre-filled.
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={onContinue}
            disabled={!ready || !amount}
            className="w-full py-3.5 px-4 bg-[#2474e8] hover:bg-[#1c62cb] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-[#2474e8]/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => {
              playKeyClick();
              onBack();
            }}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-[#172b4d] font-semibold text-xs rounded-xl transition-all cursor-pointer text-center"
          >
            Back
          </button>
        </div>
      </div>

      {/* Tactile POS Numeric Keypad */}
      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-3 shadow-xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#7183a3] text-center mb-2">
          Terminal Numeric Keypad
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '.'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleKeyPress(k)}
              aria-label={k === '⌫' ? 'Delete last digit' : k}
              className="py-3 bg-[#fbfdff] hover:bg-[#e9f2ff] active:bg-[#d6e5fc] active:scale-[0.97] border border-[#d6e0ef] rounded-xl text-lg font-bold text-[#172b4d] transition-all cursor-pointer flex items-center justify-center min-h-[48px] select-none"
            >
              {k === '⌫' ? <Delete size={20} className="text-slate-600" /> : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
