import React from 'react';
import { ScreenType, Ledger } from '../types';
import { formatMoney } from '../utils/format';
import { List, RefreshCw, ChevronLeft, Wifi, WifiOff, Lock } from 'lucide-react';
import { NativeBridge } from '../services/nativeBridge';

interface HeaderProps {
  screen: ScreenType;
  onBack: () => void;
  ledger: Ledger;
  connected: boolean;
  ready: boolean;
  syncing: boolean;
  onToggleOffline: (checked: boolean) => void;
  onOpenSyncStatus: () => void;
  onTriggerSync: () => void;
  onLockScreen: () => void;
  saveError: string;
}

export const Header: React.FC<HeaderProps> = ({
  screen,
  onBack,
  ledger,
  connected,
  ready,
  syncing,
  onToggleOffline,
  onOpenSyncStatus,
  onTriggerSync,
  onLockScreen,
  saveError,
}) => {
  const isOffline = ledger.manualOffline || !connected;
  const pendingPayments = ledger.payments.filter((p) => p.status === 'Pending Sync');
  const pendingTotal = pendingPayments.reduce((s, p) => s + p.amount, 0);

  const statusText = !ready
    ? 'Loading device vault…'
    : syncing
    ? 'Checking connection & syncing…'
    : pendingPayments.length > 0
    ? `${pendingPayments.length} payment${
        pendingPayments.length === 1 ? '' : 's'
      } pending sync · ${formatMoney(pendingTotal)}`
    : isOffline
    ? 'Offline · No queued payments'
    : 'All payments synced';

  return (
    <header className="no-print select-none">
      {/* Main Top Bar */}
      <div className="bg-[#14233d] text-white px-4 py-3 flex items-center justify-between min-h-[54px] shadow-sm">
        <div className="flex items-center gap-2">
          {screen !== 'search' && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="p-1 -ml-1 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2474e8] text-white flex items-center justify-center text-xs font-black shadow-inner">
              ◈
            </div>
            <div className="font-extrabold tracking-tight text-[15px]">Eagle Credit (PVT) LTD</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Lock Button */}
          <button
            onClick={onLockScreen}
            title="Lock terminal now"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <Lock size={15} />
          </button>

          {/* Live Network Status Pill */}
          <div
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              isOffline
                ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60'
                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
            }`}
          >
            {isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
            <span>{isOffline ? 'Offline' : 'Online'}</span>
          </div>
        </div>
      </div>

      {/* Operation bar - Offline mode toggle switch */}
      <div className="bg-white border-b border-[#e3eaf4] px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[#172b4d]">
        <label htmlFor="offline-mode-switch" className="cursor-pointer flex items-center gap-2">
          <span>Offline mode</span>
          <span className="text-[10px] font-normal text-slate-500">(Stores in encrypted vault)</span>
        </label>
        <div className="relative inline-flex items-center cursor-pointer">
          <input
            id="offline-mode-switch"
            type="checkbox"
            role="switch"
            aria-checked={ledger.manualOffline}
            checked={ledger.manualOffline}
            disabled={!ready}
            onChange={(e) => onToggleOffline(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2474e8]"></div>
        </div>
      </div>

      {/* Queue Status Notification Bar */}
      <div className="bg-[#e9f2ff] text-[#172b4d] px-4 py-2 flex items-center justify-between min-h-[40px] text-xs border-b border-[#d6e4f9]">
        <div className="flex items-center gap-2 truncate pr-2">
          {syncing ? (
            <RefreshCw size={14} className="animate-spin text-[#2474e8] shrink-0" />
          ) : pendingPayments.length > 0 ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          )}
          <span className="truncate font-medium text-[11px] text-[#2058a5]">{statusText}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenSyncStatus}
            aria-label="Review payment sync status"
            title="Review payment sync status"
            className="w-8 h-8 rounded-lg text-[#172b4d] hover:bg-[#d5e6ff] flex items-center justify-center transition-colors cursor-pointer"
          >
            <List size={16} />
          </button>
          {pendingPayments.length > 0 && (
            <button
              onClick={onTriggerSync}
              disabled={!ready || syncing || ledger.manualOffline}
              aria-label="Sync queued payments"
              title="Sync queued payments now"
              className="w-8 h-8 rounded-lg text-[#172b4d] hover:bg-[#d5e6ff] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Network notes or save error banner */}
      {!connected && !ledger.manualOffline && (
        <div className="bg-amber-50 text-amber-900 border-b border-amber-200 px-4 py-2 text-xs flex items-center gap-2">
          <span className="text-amber-600 font-bold">⚠</span>
          <span>No internet connection · Payments stay securely queued on this device.</span>
        </div>
      )}

      {saveError && (
        <div
          className="bg-rose-50 text-rose-800 border-b border-rose-200 px-4 py-2 text-xs flex items-center gap-2"
          role="alert"
        >
          <span className="text-rose-600 font-bold">⛔</span>
          <span>{saveError}</span>
        </div>
      )}
    </header>
  );
};
