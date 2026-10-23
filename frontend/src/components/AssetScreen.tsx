import React from 'react';
import { Facility } from '../types';
import { formatMoney } from '../utils/format';
import { Car, ShieldCheck } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface AssetScreenProps {
  facility: Facility;
  onBack: () => void;
}

export const AssetScreen: React.FC<AssetScreenProps> = ({ facility, onBack }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1 font-mono">
          {facility.no}
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Asset Details</h1>
      </div>

      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#e9f2ff] text-[#2474e8] flex items-center justify-center shrink-0">
            <Car size={22} />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#172b4d]">Vehicle Information</h2>
            <div className="text-xs text-[#7183a3]">Registered Collateral / Leased Asset</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pt-3 border-t border-[#f0f4fa] text-xs">
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Asset type</div>
            <div className="font-semibold text-[#172b4d]">Motorcycle / Vehicle</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Make</div>
            <div className="font-semibold text-[#172b4d]">{facility.make || 'Bajaj'}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Model</div>
            <div className="font-semibold text-[#172b4d]">{facility.model || 'Pulsar 150'}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Year of Manufacture</div>
            <div className="font-semibold text-[#172b4d]">{facility.year || '2024'}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Registration No.</div>
            <div className="font-bold text-[#172b4d] bg-slate-100 px-2 py-0.5 rounded inline-block font-mono">
              {facility.vehicle || 'WP BKL 7421'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Market value</div>
            <div className="font-bold text-[#172b4d] tabular-nums">
              {formatMoney(facility.market || 750000)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Color</div>
            <div className="font-semibold text-[#172b4d]">{facility.color || 'Black'}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Inspection Status</div>
            <div className="font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck size={13} />
              <span>Verified in field</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={() => {
            playKeyClick();
            onBack();
          }}
          className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-[#2474e8] text-[#2474e8] font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-xs text-center"
        >
          Back to Facility
        </button>
      </div>
    </div>
  );
};
