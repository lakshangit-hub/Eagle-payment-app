import React, { useState } from 'react';
import { Customer, Facility, StoredPayment } from '../types';
import { formatMoney } from '../utils/format';
import { Printer, UserCheck, Check, Copy, CheckCircle2 } from 'lucide-react';
import { playKeyClick, playPrintWhirr } from '../utils/audio';
import { NativeBridge } from '../services/nativeBridge';
import { logReprintRPC } from '../services/supabase';

interface ReceiptScreenProps {
  payment: StoredPayment;
  customer: Customer;
  facility: Facility;
  remainingBalance: number;
  isReprint?: boolean;
  onReturnToProfile: () => void;
  onCollectAnother: () => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({
  payment,
  customer,
  facility,
  remainingBalance,
  isReprint = false,
  onReturnToProfile,
  onCollectAnother,
}) => {
  const [copied, setCopied] = useState(false);
  const [printStatus, setPrintStatus] = useState<string>('');
  const [hasPrinted, setHasPrinted] = useState<boolean>(isReprint);

  const handlePrint = async () => {
    playPrintWhirr();
    setPrintStatus('Printing on 58mm thermal…');

    const duplicateFlag = hasPrinted || isReprint;

    try {
      const result = await NativeBridge.printReceipt({
        receiptNo: payment.no,
        date: payment.date,
        customerName: customer.name,
        customerId: customer.id,
        facilityNo: facility.no,
        product: facility.product,
        amount: payment.amount,
        remainingBalance: remainingBalance,
        status: payment.status,
        officerCode: 'Field Officer #402',
        isDuplicate: duplicateFlag,
      });

      if (result.success) {
        setPrintStatus(duplicateFlag ? 'Printed (DUPLICATE COPY)' : 'Printed successfully');
        if (duplicateFlag) {
          // Log reprint in audit log
          void logReprintRPC(payment.no, 'Customer or officer requested duplicate copy');
        }
        setHasPrinted(true);
      } else {
        setPrintStatus(result.message || 'Printer busy or out of paper');
      }
    } catch (err) {
      setPrintStatus('Printer notification: Print offline');
    }

    setTimeout(() => {
      setPrintStatus('');
    }, 4000);
  };

  const handleCopy = () => {
    playKeyClick();
    const duplicateTag = (hasPrinted || isReprint) ? ' [DUPLICATE]' : '';
    const text = `EAGLE CREDIT (PVT) LTD - PAYMENT RECEIPT${duplicateTag}
Receipt No: ${payment.no}
Date: ${payment.date}
Customer: ${customer.name} (${customer.id})
Facility: ${facility.no} - ${facility.product}
Maturity Date: ${facility.maturity}
Amount: ${formatMoney(payment.amount)}
Status: ${payment.status}
Remaining Balance: ${formatMoney(remainingBalance)}`;

    // Android 7 compatible clipboard copy fallback
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (str: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = str;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="no-print">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
          58 mm Thermal Receipt
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Receipt Preview</h1>
      </div>

      {printStatus && (
        <div className="no-print bg-[#e9f2ff] border border-[#2474e8]/30 text-[#172b4d] p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 size={16} className="text-[#2474e8] shrink-0" />
          <span>{printStatus}</span>
        </div>
      )}

      {/* 58mm Thermal Printable Canvas (Centered for POS display & printer feed) */}
      <div className="bg-white border border-[#e3eaf4] rounded-2xl p-5 shadow-xs flex justify-center">
        <div
          id="sunmi-receipt-view"
          className="print-receipt-container font-mono text-[11px] leading-tight text-[#172b4d] bg-white w-full max-w-[320px] p-4 border border-dashed border-slate-300 rounded-lg shadow-inner select-text"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-2">
            <div className="font-extrabold text-sm tracking-tight text-[#111]">
              EAGLE CREDIT (PVT) LTD
            </div>
            <div className="text-[10px] text-[#444]">Field Collection &amp; Microfinance</div>
            <div className="text-[9px] text-[#666]">Tel: 011 234 5678 · Reg: PB-8924</div>
            <div className="text-[10px] font-bold text-[#222] pt-0.5 uppercase tracking-wide">
              Official Payment Receipt
            </div>
            {(hasPrinted || isReprint) && (
              <div className="inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-slate-100 mt-1">
                *** DUPLICATE RECEIPT ***
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-[#555] my-2"></div>

          {/* Metadata */}
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-[#444]">Receipt No:</span>
              <span className="font-bold text-right select-all">{payment.no}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#444]">Date &amp; Time:</span>
              <span className="text-right">{payment.date}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-[#555] my-2"></div>

          {/* Customer & Facility */}
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-[#444]">Customer:</span>
              <span className="font-bold text-right truncate max-w-[170px]">{customer.name}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#444]">Customer ID:</span>
              <span className="text-right font-mono">{customer.id}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#444]">Loan No:</span>
              <span className="font-bold text-right font-mono">{facility.no}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#444]">Product:</span>
              <span className="text-right truncate max-w-[160px]">{facility.product}</span>
            </div>
            {facility.vehicle && (
              <div className="flex justify-between gap-2">
                <span className="text-[#444]">Asset Reg:</span>
                <span className="text-right font-mono font-bold">{facility.vehicle}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-[#555] my-2"></div>

          {/* Payment */}
          <div className="font-bold text-[10px] tracking-wide text-[#333] mb-1 uppercase">
            Payment Details
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-2 text-sm font-black pt-0.5">
              <span>Amount Received:</span>
              <span className="text-right">{formatMoney(payment.amount)}</span>
            </div>

            {payment.status === 'Pending Sync' ? (
              <div className="border border-black p-1.5 my-1 text-center font-bold text-[10px] uppercase leading-tight bg-slate-50">
                PENDING SYNC
                <br />
                <span className="text-[9px] font-normal">Stored securely on device</span>
              </div>
            ) : payment.status === 'Rejected' ? (
              <div className="border border-rose-600 text-rose-700 p-1.5 my-1 text-center font-bold text-[10px] uppercase leading-tight bg-rose-50">
                REJECTED
                <br />
                <span className="text-[9px] font-normal">{payment.syncError || 'Server rejected'}</span>
              </div>
            ) : (
              <div className="flex justify-between gap-2 pt-0.5">
                <span className="text-[#444]">Remaining Balance:</span>
                <span className="font-bold text-right">{formatMoney(remainingBalance)}</span>
              </div>
            )}

            <div className="flex justify-between gap-2 text-[10px] text-[#555] pt-1">
              <span>Collected by:</span>
              <span>Field Officer #402</span>
            </div>
          </div>

          <div className="border-t border-dashed border-[#555] my-2"></div>

          {/* Footer note */}
          <div className="text-center space-y-0.5 text-[9.5px] text-[#444] pt-1">
            <div className="font-bold text-[#111]">Thank you for your payment.</div>
            <div>Please keep this receipt for your records.</div>
            <div className="text-[9px] text-[#666] pt-1 font-semibold uppercase tracking-wider">
              Eagle Credit (PVT) LTD — Customer Copy
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="no-print space-y-2.5 pt-2">
        <button
          onClick={handlePrint}
          className="w-full py-3.5 px-4 bg-[#2474e8] hover:bg-[#1c62cb] active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-[#2474e8]/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
        >
          <Printer size={18} />
          <span>{hasPrinted || isReprint ? 'Print Duplicate Receipt' : 'Print Receipt (Sunmi 58mm)'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-[#172b4d] font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              onReturnToProfile();
            }}
            className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-[#172b4d] font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <UserCheck size={14} />
            <span>Customer Profile</span>
          </button>
        </div>

        <div className="text-[10px] text-[#7183a3] text-center pt-1 leading-relaxed">
          Integrated directly with Sunmi V2 built-in 58mm thermal ESC-POS printer hardware. Printing is decoupled from transaction persistence.
        </div>
      </div>
    </div>
  );
};
