import React from 'react';
import { Guarantor, Facility } from '../types';
import { Phone, MapPin, CreditCard } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface GuarantorsScreenProps {
  facility: Facility;
  guarantors: Guarantor[];
  onBack: () => void;
}

export const GuarantorsScreen: React.FC<GuarantorsScreenProps> = ({
  facility,
  guarantors,
  onBack,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1 font-mono">
          {facility.no}
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Guarantors</h1>
      </div>

      <div className="space-y-3">
        {guarantors.map((g, idx) => (
          <div key={idx} className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e9f2ff] text-[#2474e8] font-bold text-base flex items-center justify-center shrink-0">
                {g.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-base text-[#172b4d]">{g.name}</h2>
                <div className="text-xs text-[#7183a3] font-medium">{g.relationship}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-3 pt-3 border-t border-[#f0f4fa] text-xs">
              <div className="col-span-2">
                <div className="text-[11px] text-[#7183a3] mb-0.5 flex items-center gap-1">
                  <MapPin size={12} />
                  <span>Address</span>
                </div>
                <div className="font-semibold text-[#172b4d]">{g.address}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#7183a3] mb-0.5 flex items-center gap-1">
                  <Phone size={12} />
                  <span>Phone</span>
                </div>
                <a
                  href={`tel:${g.phone.replace(/\s+/g, '')}`}
                  className="font-semibold text-[#2474e8] hover:underline"
                >
                  {g.phone}
                </a>
              </div>
              <div>
                <div className="text-[11px] text-[#7183a3] mb-0.5 flex items-center gap-1">
                  <CreditCard size={12} />
                  <span>NIC</span>
                </div>
                <div className="font-semibold text-[#172b4d] select-all">{g.nic}</div>
              </div>
            </div>
          </div>
        ))}
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
