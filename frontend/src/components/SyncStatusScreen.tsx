import React from 'react';
import { Customer, Facility, StoredPayment } from '../types';
import { formatMoney, formatDateGB } from '../utils/format';
import { Shield, RefreshCw, AlertCircle, Clock, Receipt } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface SyncStatusScreenProps {
  payments: StoredPayment[];
  customers: Customer[];
  facilities: Facility[];
  filter: 'all' | 'pending' | 'synced';
  ready: boolean;
  syncing: boolean;
  syncingIds: string[];
  isOffline: boolean;
  onFilterChange: (f: 'all' | 'pending' | 'synced') => void;
  onRetrySync: () => void;
  onViewReceipt: (facilityNo: string, receiptNo: string) => void;
}

export const SyncStatusScreen: React.FC<SyncStatusScreenProps> = ({
  payments,
  customers,
  facilities,
  filter,
  ready,
  syncing,
  syncingIds,
  isOffline,
  onFilterChange,
  onRetrySync,
  onViewReceipt,
}) => {
  const filteredRows = payments
    .slice()
    .reverse()
    .filter((p) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return p.status === 'Pending Sync';
      return p.status === 'Confirmed';
    });

  const pendingCount = payments.filter((p) => p.status === 'Pending Sync').length;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
          Device ledger
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Payment Sync Status</h1>
      </div>

      {/* Vault Status summary */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#079b70] bg-[#e2f7ef] border border-emerald-200 px-3.5 py-2.5 rounded-xl">
        <Shield size={16} className="text-[#079b70] shrink-0" />
        <span>
          {ready
            ? 'AES-GCM 256-bit encrypted via Android Keystore'
            : 'Secure device storage loading…'}
        </span>
      </div>

      {/* Filter Segmented Control */}
      <div
        className="flex gap-1.5 p-1 bg-white border border-[#e3eaf4] rounded-xl shadow-xs"
        role="group"
        aria-label="Payment status filter"
      >
        {(['all', 'pending', 'synced'] as const).map((k) => {
          const labels = { all: 'All', pending: 'Pending', synced: 'Synced' };
          const active = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                playKeyClick();
                onFilterChange(k);
              }}
              aria-pressed={active}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                active
                  ? 'bg-[#14233d] text-white shadow-xs'
                  : 'text-[#7183a3] hover:text-[#172b4d] hover:bg-slate-50'
              }`}
            >
              {labels[k]}
            </button>
          );
        })}
      </div>

      {/* List of Payments */}
      <div className="space-y-3">
        {filteredRows.length > 0 ? (
          filteredRows.map((payment) => {
            const customer = customers.find((c) => c.id === payment.customerId) || customers[0] || {
              id: payment.customerId,
              name: 'Customer',
            };
            const isSyncing = syncingIds.includes(payment.no);
            let statusLabel = 'Pending Sync';
            let pillClass = 'bg-[#fff2d9] text-[#9b6100]';

            if (isSyncing) {
              statusLabel = 'Syncing…';
              pillClass = 'bg-[#e9f2ff] text-[#2474e8]';
            } else if (payment.status === 'Confirmed') {
              statusLabel = 'Synced';
              pillClass = 'bg-[#e2f7ef] text-[#07845f]';
            } else if (payment.status === 'Rejected') {
              statusLabel = 'Rejected';
              pillClass = 'bg-rose-100 text-rose-800';
            } else if (payment.syncError) {
              statusLabel = 'Retry pending';
              pillClass = 'bg-rose-100 text-rose-800';
            }

            return (
              <article
                key={payment.no}
                className="bg-white border border-[#e3eaf4] rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-black text-[#172b4d] tabular-nums">
                      {formatMoney(payment.amount)}
                    </div>
                    <div className="text-xs text-[#7183a3] mt-0.5 font-medium">
                      {payment.facilityNo} · {customer.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                      {payment.no}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${pillClass}`}
                  >
                    {isSyncing && <RefreshCw size={10} className="animate-spin" />}
                    <span>{statusLabel}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#f0f4fa] text-xs">
                  <div>
                    <div className="text-[11px] text-[#7183a3] font-medium">Saved locally</div>
                    <div className="font-semibold text-[#172b4d]">
                      {payment.savedAt ? formatDateGB(payment.savedAt) : payment.date}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#7183a3] font-medium">Sync attempts</div>
                    <div className="font-semibold text-[#172b4d]">{payment.attempts || 0}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#7183a3] font-medium">Last attempt</div>
                    <div className="font-semibold text-[#172b4d]">
                      {payment.lastAttemptAt ? formatDateGB(payment.lastAttemptAt) : 'Not yet attempted'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#7183a3] font-medium">Synced at</div>
                    <div className="font-semibold text-[#172b4d]">
                      {payment.syncedAt
                        ? formatDateGB(payment.syncedAt)
                        : payment.status === 'Confirmed'
                        ? 'Confirmed on server'
                        : 'Awaiting connection'}
                    </div>
                  </div>
                </div>

                {payment.syncError && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{payment.syncError}</span>
                  </div>
                )}

                {payment.status === 'Pending Sync' && !payment.syncError && (
                  <div className="text-[11px] text-[#7183a3] flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                    <Clock size={12} className="text-amber-500" />
                    <span>
                      {isOffline
                        ? 'Offline mode · Queued safely in encrypted storage'
                        : 'Ready to sync · Awaiting network confirmation'}
                    </span>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    onClick={() => {
                      playKeyClick();
                      onViewReceipt(payment.facilityNo, payment.no);
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-[#2474e8] text-[#2474e8] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Receipt size={14} />
                    <span>View Receipt</span>
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="bg-white border border-[#e3eaf4] rounded-2xl p-8 text-center text-sm text-[#7183a3] shadow-xs">
            {ready ? 'No payments found matching this view.' : 'Saved payments are unavailable.'}
          </div>
        )}
      </div>

      {/* Manual Retry Sync Button */}
      {pendingCount > 0 && (
        <div className="pt-2">
          <button
            onClick={onRetrySync}
            disabled={!ready || syncing || isOffline}
            className="w-full py-3.5 px-4 bg-[#2474e8] hover:bg-[#1c62cb] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-[#2474e8]/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>Retry Sync ({pendingCount} pending)</span>
          </button>
        </div>
      )}

      <div className="text-[10px] text-[#7183a3] text-center pt-2 leading-relaxed">
        Vault records are bound to Android hardware Keystore. Clearing app data resets local cached ledger without losing server records.
      </div>
    </div>
  );
};
