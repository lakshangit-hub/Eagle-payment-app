import React from 'react';
import { Facility, StoredPayment } from '../types';
import { formatMoney } from '../utils/format';
import { Receipt, CreditCard } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface HistoryScreenProps {
  facility: Facility;
  storedPayments: StoredPayment[];
  initialHistory: Array<{ date: string; receipt: string; amount: number; status: 'Confirmed' | 'Rejected' }>;
  onViewReceipt: (receiptNo: string) => void;
  onStartPayment: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  facility,
  storedPayments,
  initialHistory,
  onViewReceipt,
  onStartPayment,
}) => {
  // Merge locally stored payments and server history
  const facilityStored = storedPayments
    .filter((p) => p.facilityNo === facility.no)
    .slice()
    .reverse()
    .map((p) => ({
      date: p.historyDate,
      receipt: p.no,
      amount: p.amount,
      status: p.status,
      isStored: true,
    }));

  // Deduplicate by receipt number
  const seenReceipts = new Set(facilityStored.map((p) => p.receipt));
  const serverRows = initialHistory
    .filter((h) => !seenReceipts.has(h.receipt))
    .map((h) => ({ ...h, isStored: false }));

  const allRows = [...facilityStored, ...serverRows];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1 font-mono">
          {facility.no}
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Payment History</h1>
      </div>

      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs">
        {allRows.length > 0 ? (
          <div className="divide-y divide-[#f0f4fa]">
            {allRows.map((row, idx) => (
              <div
                key={row.receipt + idx}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#172b4d]">{row.date}</div>
                  <div className="text-xs text-[#7183a3] font-mono truncate mt-0.5 max-w-[190px]">
                    {row.receipt}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'Confirmed'
                          ? 'bg-[#e2f7ef] text-[#07845f]'
                          : row.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-[#fff2d9] text-[#9b6100]'
                      }`}
                    >
                      {row.status}
                    </span>
                    <button
                      onClick={() => {
                        playKeyClick();
                        onViewReceipt(row.receipt);
                      }}
                      className="text-[11px] text-[#2474e8] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Receipt size={12} />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-extrabold text-[#172b4d] tabular-nums">
                    {formatMoney(row.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-[#7183a3]">
            No previous payments found for this facility.
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={() => {
            playKeyClick();
            onStartPayment();
          }}
          className="w-full py-3.5 px-4 bg-[#2474e8] hover:bg-[#1c62cb] active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-[#2474e8]/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
        >
          <CreditCard size={18} />
          <span>Collect Payment</span>
        </button>
      </div>
    </div>
  );
};
