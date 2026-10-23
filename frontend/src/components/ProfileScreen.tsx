import React from 'react';
import { Customer, Facility } from '../types';
import { formatMoney } from '../utils/format';
import { ChevronRight } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface ProfileScreenProps {
  customer: Customer;
  facilities: Facility[];
  onSelectFacility: (facility: Facility) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  customer,
  facilities,
  onSelectFacility,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
          Field Collection
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Customer Profile</h1>
      </div>

      {/* Customer Information Card */}
      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#e9f2ff] text-[#2474e8] font-black text-xl flex items-center justify-center shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="font-extrabold text-lg text-[#172b4d] tracking-tight">
                {customer.name}
              </div>
              <div className="text-xs text-[#7183a3] font-medium">{customer.id}</div>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e2f7ef] text-[#07845f]">
            Active
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-3 border-t border-[#f0f4fa] text-xs">
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">NIC</div>
            <div className="font-semibold text-[#172b4d] select-all">{customer.nic}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Occupation</div>
            <div className="font-semibold text-[#172b4d]">{customer.occupation}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Address</div>
            <div className="font-semibold text-[#172b4d] leading-relaxed break-words [overflow-wrap:anywhere]">
              {customer.address}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Primary phone</div>
            <a
              href={`tel:${customer.phone.replace(/\s+/g, '')}`}
              className="font-semibold text-[#2474e8] hover:underline"
            >
              {customer.phone}
            </a>
          </div>
          {customer.phone2 && (
            <div>
              <div className="text-[11px] text-[#7183a3] mb-0.5 font-medium">Secondary phone</div>
              <a
                href={`tel:${customer.phone2.replace(/\s+/g, '')}`}
                className="font-semibold text-[#2474e8] hover:underline"
              >
                {customer.phone2}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Active Loans Section */}
      <div className="pt-2">
        <h2 className="text-base font-bold text-[#172b4d] mb-3">
          Active Loans ({facilities.length})
        </h2>
        <div className="space-y-3">
          {facilities.map((fac) => (
            <div
              key={fac.no}
              role="button"
              tabIndex={0}
              onClick={() => {
                playKeyClick();
                onSelectFacility(fac);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  playKeyClick();
                  onSelectFacility(fac);
                }
              }}
              className="w-full text-left bg-white border border-[#e3eaf4] hover:border-[#b9cce6] hover:shadow-md active:bg-[#f8fbff] rounded-2xl p-4 transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#2474e8]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-[15px] text-[#172b4d]">{fac.product}</div>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 border border-[#b9c8e0] rounded-md bg-[#fbfdff] text-[#172b4d] font-mono text-xs font-bold tracking-tight">
                      {fac.no}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e2f7ef] text-[#07845f]">
                    Active
                  </span>
                  {fac.arrears > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#e34854] border border-rose-200">
                      Arrears: {formatMoney(fac.arrears)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-3 pt-3 border-t border-[#f4f7fc] text-xs">
                <div>
                  <div className="text-[11px] text-[#7183a3] font-medium">Outstanding balance</div>
                  <div className="font-bold text-sm text-[#172b4d] tabular-nums">
                    {formatMoney(fac.balance)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7183a3] font-medium">Installment</div>
                  <div className="font-bold text-sm text-[#2474e8] tabular-nums">
                    {formatMoney(fac.installment)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7183a3] font-medium">Tenor</div>
                  <div className="font-semibold text-[#172b4d]">
                    <span className="font-mono tabular-nums">{fac.tenor}</span>
                    <span className="text-[#8c9cb8] font-normal text-[11px] ml-1.5">
                      ({fac.frequency})
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7183a3] font-medium">Facility amount</div>
                  <div className="font-semibold text-[#172b4d] tabular-nums">
                    {formatMoney(fac.original)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#7183a3] mt-3 pt-2 border-t border-[#f4f7fc]">
                <span className="text-[11px] font-medium text-[#7183a3]">View facility details</span>
                <span className="text-[#2474e8] font-bold flex items-center">
                  <ChevronRight size={18} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
