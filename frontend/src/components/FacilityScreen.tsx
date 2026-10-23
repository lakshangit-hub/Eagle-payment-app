import React from 'react';
import { Facility } from '../types';
import { formatMoney } from '../utils/format';
import { ChevronRight, ShieldCheck, Car, History, CreditCard } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface FacilityScreenProps {
  facility: Facility;
  onViewGuarantors: () => void;
  onViewAsset: () => void;
  onViewHistory: () => void;
  onStartPayment: () => void;
}

export const FacilityScreen: React.FC<FacilityScreenProps> = ({
  facility,
  onViewGuarantors,
  onViewAsset,
  onViewHistory,
  onStartPayment,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
          Field Collection
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Facility Details</h1>
      </div>

      {/* Main Facility Details Card */}
      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-extrabold text-lg text-[#172b4d]">{facility.product}</div>
            <div className="mt-1">
              <span className="inline-block px-2.5 py-0.5 border border-[#b9c8e0] rounded-md bg-[#fbfdff] text-[#172b4d] font-mono text-xs font-bold">
                {facility.no}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e2f7ef] text-[#07845f]">
              Active
            </span>
            {facility.arrears > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#e34854] border border-rose-200">
                Arrears: {formatMoney(facility.arrears)}
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mt-4 pt-3 border-t border-[#f0f4fa] text-xs">
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Original amount</div>
            <div className="font-semibold text-[#172b4d] tabular-nums">
              {formatMoney(facility.original)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Outstanding balance</div>
            <div className="font-bold text-sm text-[#172b4d] tabular-nums">
              {formatMoney(facility.balance)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Installment</div>
            <div className="font-bold text-sm text-[#2474e8] tabular-nums">
              {formatMoney(facility.installment)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Rental frequency</div>
            <div className="font-semibold text-[#172b4d]">{facility.frequency}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Tenor</div>
            <div className="font-semibold text-[#172b4d] font-mono">{facility.tenor}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Interest rate</div>
            <div className="font-semibold text-[#172b4d]">{facility.rate}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Arrears</div>
            <div className="font-semibold text-[#e34854]">
              {formatMoney(facility.arrears)} / {facility.arrearsRentals} rentals
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Activation date</div>
            <div className="font-semibold text-[#172b4d]">{facility.start}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Maturity date</div>
            <div className="font-semibold text-[#172b4d]">{facility.maturity}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] font-medium mb-0.5">Purpose</div>
            <div className="font-semibold text-[#172b4d] truncate">{facility.purpose}</div>
          </div>
        </div>
      </div>

      {/* Sub-navigation link buttons */}
      <div className="space-y-2">
        <button
          onClick={() => {
            playKeyClick();
            onViewGuarantors();
          }}
          className="w-full flex items-center justify-between p-3.5 bg-white border border-[#e3eaf4] hover:border-[#b9cce6] hover:bg-[#fbfdff] rounded-xl text-left font-semibold text-sm text-[#172b4d] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-[#2474e8]" />
            <span>View Guarantors</span>
          </div>
          <ChevronRight size={18} className="text-[#2474e8]" />
        </button>

        {facility.asset && (
          <button
            onClick={() => {
              playKeyClick();
              onViewAsset();
            }}
            className="w-full flex items-center justify-between p-3.5 bg-white border border-[#e3eaf4] hover:border-[#b9cce6] hover:bg-[#fbfdff] rounded-xl text-left font-semibold text-sm text-[#172b4d] transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Car size={18} className="text-[#2474e8]" />
              <span>View Financed Asset</span>
            </div>
            <ChevronRight size={18} className="text-[#2474e8]" />
          </button>
        )}

        <button
          onClick={() => {
            playKeyClick();
            onViewHistory();
          }}
          className="w-full flex items-center justify-between p-3.5 bg-white border border-[#e3eaf4] hover:border-[#b9cce6] hover:bg-[#fbfdff] rounded-xl text-left font-semibold text-sm text-[#172b4d] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-[#2474e8]" />
            <span>Payment History</span>
          </div>
          <ChevronRight size={18} className="text-[#2474e8]" />
        </button>
      </div>

      {/* Primary Action Button */}
      <div className="pt-2">
        <button
          onClick={() => {
            playKeyClick();
            onStartPayment();
          }}
          className="w-full py-3.5 px-4 bg-[#2474e8] hover:bg-[#1c62cb] active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-[#2474e8]/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-[15px]"
        >
          <CreditCard size={18} />
          <span>Collect Payment</span>
        </button>
      </div>
    </div>
  );
};
