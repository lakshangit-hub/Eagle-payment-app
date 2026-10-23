import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Customer, Facility, ScreenType, Ledger, StoredPayment, Guarantor } from './types';
import {
  accessVault,
  emptyLedger,
  confirmedAmount,
  reservedAmount,
  recordAttempt,
  validatePaymentAmount,
  generateReceiptNumber,
  syncSinglePayment,
} from './services/vault';
import {
  fetchServerData,
  fetchFacilityPaymentHistory,
  logLoginRPC,
  getCurrentOfficer,
} from './services/supabase';
import { NativeBridge } from './services/nativeBridge';
import { Header } from './components/Header';
import { SearchScreen } from './components/SearchScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { FacilityScreen } from './components/FacilityScreen';
import { GuarantorsScreen } from './components/GuarantorsScreen';
import { AssetScreen } from './components/AssetScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { CollectScreen } from './components/CollectScreen';
import { ConfirmScreen } from './components/ConfirmScreen';
import { ConfirmModal } from './components/ConfirmModal';
import { ReceiptScreen } from './components/ReceiptScreen';
import { SyncStatusScreen } from './components/SyncStatusScreen';
import { PinLockModal } from './components/PinLockModal';
import { playSuccessChime, playKeyClick } from './utils/audio';
import { Smartphone, Monitor } from 'lucide-react';

export default function App() {
  // Navigation
  const [screen, setScreen] = useState<ScreenType>('search');
  const [stack, setStack] = useState<ScreenType[]>([]);

  // Server Data (Supabase authenticated)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [serverHistory, setServerHistory] = useState<
    Record<string, Array<{ date: string; receipt: string; amount: number; status: 'Confirmed' | 'Rejected' }>>
  >({});

  // Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedFacilityNo, setSelectedFacilityNo] = useState<string>('');
  const [activeReceiptNo, setActiveReceiptNo] = useState<string | null>(null);

  // Form input
  const [amount, setAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Device Ledger Vault & Sync State
  const [ledger, setLedger] = useState<Ledger>(emptyLedger());
  const [ready, setReady] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [syncFilter, setSyncFilter] = useState<'all' | 'pending' | 'synced'>('all');

  // Presentation: phone frame or responsive container
  const [phoneFrame, setPhoneFrame] = useState<boolean>(true);

  // Security: PIN lock & 5-minute Inactivity Timer
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  // Record user interaction for inactivity timer & Android Keystore session
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    NativeBridge.recordActivity();
  }, []);

  useEffect(() => {
    const handleGlobalInteraction = () => {
      handleUserActivity();
    };

    window.addEventListener('touchstart', handleGlobalInteraction, { passive: true });
    window.addEventListener('mousedown', handleGlobalInteraction, { passive: true });
    window.addEventListener('keydown', handleGlobalInteraction, { passive: true });

    // Check inactivity every 10 seconds (Auto-lock after 5 minutes of inactivity)
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > 5 * 60 * 1000 && !isLocked) {
        setIsLocked(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('touchstart', handleGlobalInteraction);
      window.removeEventListener('mousedown', handleGlobalInteraction);
      window.removeEventListener('keydown', handleGlobalInteraction);
      clearInterval(interval);
    };
  }, [handleUserActivity, isLocked]);

  // Load server data from Supabase
  const loadDataFromServer = useCallback(async () => {
    try {
      const data = await fetchServerData();
      if (data.customers.length > 0) {
        setCustomers(data.customers);
        setFacilities(data.facilities);
        setGuarantors(data.guarantors);
        setSelectedCustomerId((prev) => prev || data.customers[0]?.id || '');
        setSelectedFacilityNo((prev) => prev || data.facilities[0]?.no || '');
        setDataLoaded(true);
      }
    } catch (err) {
      console.warn('Could not load live Supabase data, checking local storage cache:', err);
    }
  }, []);

  // Synchronize dynamic balances after confirmed payments
  const currentFacilities = useMemo(() => {
    return facilities.map((f) => ({
      ...f,
      balance: Math.max(0, f.balance - confirmedAmount(ledger.payments, f.no)),
    }));
  }, [facilities, ledger.payments]);

  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0] || {
      id: 'EC-000124',
      name: 'Kasun Perera',
      nic: '200012345678',
      address: 'Kurunegala',
      phone: '077 123 4567',
      occupation: 'Customer',
    };
  }, [customers, selectedCustomerId]);

  const currentFacility = useMemo(() => {
    return (
      currentFacilities.find((f) => f.no === selectedFacilityNo) ||
      currentFacilities.find((f) => f.customerId === currentCustomer.id) ||
      currentFacilities[0] || {
        no: 'E26-10-02ACPL',
        customerId: currentCustomer.id,
        product: 'Personal Loan',
        original: 60000,
        balance: 45000,
        installment: 5000,
        frequency: 'Monthly',
        tenor: '1 / 12',
        rate: '18%',
        arrears: 0,
        arrearsRentals: 0,
        start: '15/10/2026',
        maturity: '15/10/2027',
        purpose: 'Loan',
        asset: false,
      }
    );
  }, [currentFacilities, selectedFacilityNo, currentCustomer.id]);

  const currentGuarantors = useMemo(() => {
    return guarantors.filter((g) => g.customerId === currentCustomer.id);
  }, [guarantors, currentCustomer.id]);

  // Push new screen to stack
  const navigateTo = useCallback(
    (nextScreen: ScreenType) => {
      handleUserActivity();
      setStack((prev) => [...prev, screen]);
      setScreen(nextScreen);
      window.scrollTo(0, 0);
    },
    [screen, handleUserActivity]
  );

  // Go back one screen
  const navigateBack = useCallback(() => {
    handleUserActivity();
    setStack((prev) => {
      if (prev.length === 0) {
        setScreen('search');
        return [];
      }
      const nextStack = [...prev];
      const previousScreen = nextStack.pop() || 'search';
      setScreen(previousScreen);
      return nextStack;
    });
    window.scrollTo(0, 0);
  }, [handleUserActivity]);

  // Save changes to encrypted device vault
  const saveToVault = useCallback(
    async (transform?: (curr: Ledger) => Ledger): Promise<boolean> => {
      try {
        const updated = await accessVault(transform);
        setLedger(updated);
        setSaveError('');
        return true;
      } catch (err) {
        console.error('Vault access failed:', err);
        setSaveError('Secure save failed. Hardware Keystore protection active.');
        return false;
      }
    },
    []
  );

  // Sync queued payments with server / Supabase Postgres RPC
  const triggerSync = useCallback(async () => {
    if (!ready || syncing || ledger.manualOffline || !navigator.onLine) return;

    const pending = ledger.payments.filter((p) => p.status === 'Pending Sync');
    const ids = pending.map((p) => p.no);
    if (ids.length === 0) return;

    setSyncing(true);
    setSyncingIds(ids);
    const at = new Date().toISOString();

    try {
      // Step 1: Record attempt timestamp
      const ok = await saveToVault((c) => recordAttempt(c, ids, at));
      if (!ok) return;

      // Step 2: Post each payment to server RPC sequentially
      for (const payment of pending) {
        try {
          const result = await syncSinglePayment(payment);

          if (result.status === 'Confirmed') {
            await saveToVault((c) => ({
              ...c,
              payments: c.payments.map((p) =>
                p.no === payment.no
                  ? {
                      ...p,
                      status: 'Confirmed',
                      syncedAt: new Date().toISOString(),
                      syncError: undefined,
                    }
                  : p
              ),
            }));

            // Refresh live balances from server
            void loadDataFromServer();
          } else {
            // Server rejected
            await saveToVault((c) => ({
              ...c,
              payments: c.payments.map((p) =>
                p.no === payment.no
                  ? {
                      ...p,
                      status: 'Rejected',
                      syncError: result.error || 'Server rejected payment',
                    }
                  : p
              ),
            }));
          }
        } catch (postErr) {
          console.warn('Payment sync transit failed for ' + payment.no, postErr);
          await saveToVault((c) => ({
            ...c,
            payments: c.payments.map((p) =>
              p.no === payment.no
                ? {
                    ...p,
                    attempts: (p.attempts || 0) + 1,
                    lastAttemptAt: new Date().toISOString(),
                    syncError: 'Network transit error. Queued for automatic retry.',
                  }
                : p
            ),
          }));
        }
      }
      setConnected(true);
    } catch (err) {
      console.warn('Sync failed:', err);
      setConnected(false);
    } finally {
      setSyncing(false);
      setSyncingIds([]);
    }
  }, [ready, syncing, ledger.manualOffline, ledger.payments, saveToVault, loadDataFromServer]);

  // Initial load from IndexedDB AES-GCM vault & Supabase
  useEffect(() => {
    accessVault()
      .then((loaded) => {
        setLedger(loaded);
        setReady(true);
        // Load live data from server
        void loadDataFromServer();

        // Log login audit event
        getCurrentOfficer()
          .then((officer) => {
            if (officer) {
              void logLoginRPC(officer.officerCode);
            }
          })
          .catch(() => {});

        if (!loaded.manualOffline && navigator.onLine) {
          setTimeout(() => {
            void triggerSync();
          }, 300);
        }
      })
      .catch((err) => {
        console.error('Initial vault load error:', err);
        setSaveError('Saved payments could not be decrypted. Security lock active.');
      });
  }, [loadDataFromServer, triggerSync]);

  // Online / offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setConnected(true);
      void loadDataFromServer();
      if (!ledger.manualOffline) {
        void triggerSync();
      }
    };
    const handleOffline = () => {
      setConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-sync heartbeat every 20 seconds
    const interval = setInterval(() => {
      if (navigator.onLine && !ledger.manualOffline) {
        void triggerSync();
      }
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [ledger.manualOffline, triggerSync, loadDataFromServer]);

  // Toggle offline mode manual switch
  const handleToggleOffline = async (checked: boolean) => {
    playKeyClick();
    handleUserActivity();
    const ok = await saveToVault((c) => ({ ...c, manualOffline: checked }));
    if (ok && !checked && connected) {
      setTimeout(() => {
        void triggerSync();
      }, 300);
    }
  };

  // Start payment flow
  const handleStartPayment = () => {
    playKeyClick();
    handleUserActivity();
    setAmount('');
    setAmountError('');
    navigateTo('collect');
  };

  // Validate amount on collect screen
  const handleContinuePayment = () => {
    handleUserActivity();
    const num = Number(amount);
    const pendingReserve = reservedAmount(ledger.payments, currentFacility.no);
    const err = validatePaymentAmount(num, currentFacility.balance, pendingReserve);

    if (err) {
      setAmountError(err);
      return;
    }
    setAmountError('');
    // Direct continue to confirm screen
    navigateTo('confirm');
  };

  // Confirm payment & store in encrypted device vault first
  const handleConfirmPayment = async () => {
    handleUserActivity();
    if (saving || !ready) return;
    const num = Number(amount);
    const pendingReserve = reservedAmount(ledger.payments, currentFacility.no);
    const err = validatePaymentAmount(num, currentFacility.balance, pendingReserve);

    if (err) {
      setAmountError(err);
      setShowConfirmModal(false);
      return;
    }

    setSaving(true);
    // Generate unique idempotency receipt number
    const newReceiptId = generateReceiptNumber();
    const now = new Date();

    const newPayment: StoredPayment = {
      no: newReceiptId,
      facilityNo: currentFacility.no,
      customerId: currentCustomer.id,
      date: now.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      historyDate: now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      amount: num,
      status: 'Pending Sync', // Never mark confirmed locally!
      savedAt: now.toISOString(),
      attempts: 0,
    };

    const ok = await saveToVault((c) => ({
      ...c,
      payments: [...c.payments, newPayment],
    }));

    setSaving(false);
    if (ok) {
      setShowConfirmModal(false);
      playSuccessChime();
      setActiveReceiptNo(newReceiptId);
      navigateTo('receipt');

      // Attempt immediate background sync if online
      if (connected && !ledger.manualOffline) {
        setTimeout(() => {
          void triggerSync();
        }, 600);
      }
    }
  };

  // Find active receipt object
  const activePayment = useMemo(() => {
    return ledger.payments.find((p) => p.no === activeReceiptNo);
  }, [ledger.payments, activeReceiptNo]);

  // Calculate remaining balance for active receipt
  const activeReceiptRemaining = useMemo(() => {
    if (!activePayment) return currentFacility.balance;
    const fac = facilities.find((x) => x.no === activePayment.facilityNo);
    const baseBalance = fac ? fac.balance : currentFacility.balance;
    const pIdx = ledger.payments.findIndex((p) => p.no === activePayment.no);
    const paymentsPriorAndCurrent = ledger.payments.slice(0, pIdx + 1);
    const alreadyConfirmed = confirmedAmount(paymentsPriorAndCurrent, activePayment.facilityNo);
    return Math.max(0, baseBalance - alreadyConfirmed);
  }, [activePayment, ledger.payments, currentFacility.balance, facilities]);

  const isOfflineMode = ledger.manualOffline || !connected;

  return (
    <div className="min-h-screen bg-[#e9eef6] text-[#172b4d] flex flex-col justify-between selection:bg-[#2474e8] selection:text-white">
      {/* Top Desktop Helper Toolbar (Hidden on mobile / print) */}
      <div className="no-print hidden sm:flex items-center justify-between px-6 py-2 bg-[#14233d] text-white/80 text-xs border-b border-[#20375e]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white tracking-wide">◈ EAGLE CREDIT (PVT) LTD</span>
          <span className="text-slate-400">|</span>
          <span>Field Collection &amp; POS Mobile Terminal (Sunmi V2)</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded text-[11px]">
            <span>Vault:</span>
            <span className="text-emerald-400 font-semibold">Keystore AES-GCM-256</span>
          </div>
          <button
            onClick={() => setPhoneFrame((p) => !p)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded text-white font-medium transition-colors cursor-pointer"
          >
            {phoneFrame ? <Monitor size={13} /> : <Smartphone size={13} />}
            <span>{phoneFrame ? 'Expand Layout' : 'Handheld Frame'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Browser Direct APK Download Banner (Hidden inside native Android app) */}
      {!NativeBridge.isAvailable() && (
        <aside aria-label="Download Android APK" className="no-print bg-[#101d33] text-white px-4 py-2.5 border-b border-[#20375e] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📲</span>
            <div>
              <span className="font-bold text-white">Using a mobile phone?</span>
              <span className="text-slate-300 ml-1.5">Test the native Android app on your device.</span>
            </div>
          </div>
          <a
            href="./download/eagle-credit.apk"
            download="eagle-credit.apk"
            className="inline-flex items-center gap-1.5 bg-[#2474e8] hover:bg-[#1c62cb] active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all text-xs"
          >
            <span>Download APK (22 MB)</span>
          </a>
        </aside>
      )}

      {/* Main Terminal Frame */}
      <div
        className={`w-full mx-auto my-0 transition-all ${
          phoneFrame
            ? 'sm:my-6 sm:max-w-[430px] sm:rounded-3xl sm:shadow-2xl sm:border sm:border-slate-300 sm:overflow-hidden bg-[#f5f8fc]'
            : 'max-w-2xl sm:my-6 sm:rounded-2xl sm:shadow-xl sm:border sm:border-slate-300 bg-[#f5f8fc]'
        }`}
      >
        <Header
          screen={screen}
          onBack={navigateBack}
          ledger={ledger}
          connected={connected}
          ready={ready}
          syncing={syncing}
          onToggleOffline={handleToggleOffline}
          onOpenSyncStatus={() => navigateTo('sync-status')}
          onTriggerSync={triggerSync}
          onLockScreen={() => setIsLocked(true)}
          saveError={saveError}
        />

        <main className="p-4 sm:p-5 min-h-[580px]">
          {screen === 'search' && (
            <SearchScreen
              customers={customers}
              facilities={currentFacilities}
              onSelectCustomer={(c) => {
                setSelectedCustomerId(c.id);
                navigateTo('profile');
              }}
            />
          )}

          {screen === 'profile' && (
            <ProfileScreen
              customer={currentCustomer}
              facilities={currentFacilities.filter((f) => f.customerId === currentCustomer.id)}
              onSelectFacility={(f) => {
                setSelectedFacilityNo(f.no);
                navigateTo('facility');
              }}
            />
          )}

          {screen === 'facility' && (
            <FacilityScreen
              facility={currentFacility}
              onViewGuarantors={() => navigateTo('guarantors')}
              onViewAsset={() => navigateTo('asset')}
              onViewHistory={() => navigateTo('history')}
              onStartPayment={handleStartPayment}
            />
          )}

          {screen === 'guarantors' && (
            <GuarantorsScreen
              facility={currentFacility}
              guarantors={currentGuarantors}
              onBack={navigateBack}
            />
          )}

          {screen === 'asset' && <AssetScreen facility={currentFacility} onBack={navigateBack} />}

          {screen === 'history' && (
            <HistoryScreen
              facility={currentFacility}
              storedPayments={ledger.payments}
              initialHistory={serverHistory[currentFacility.no] || []}
              onViewReceipt={(rcId) => {
                setActiveReceiptNo(rcId);
                navigateTo('receipt');
              }}
              onStartPayment={handleStartPayment}
            />
          )}

          {screen === 'collect' && (
            <CollectScreen
              customer={currentCustomer}
              facility={currentFacility}
              amount={amount}
              amountError={amountError}
              queuedReserved={reservedAmount(ledger.payments, currentFacility.no)}
              ready={ready}
              onAmountChange={(val) => {
                setAmount(val);
                setAmountError('');
              }}
              onContinue={handleContinuePayment}
              onBack={navigateBack}
            />
          )}

          {screen === 'confirm' && (
            <ConfirmScreen
              customer={currentCustomer}
              facility={currentFacility}
              amount={Number(amount)}
              isOffline={isOfflineMode}
              saving={saving}
              ready={ready}
              onConfirm={handleConfirmPayment}
              onCancel={navigateBack}
            />
          )}

          {screen === 'receipt' && activePayment && (
            <ReceiptScreen
              payment={activePayment}
              customer={
                customers.find((c) => c.id === activePayment.customerId) || currentCustomer
              }
              facility={
                currentFacilities.find((f) => f.no === activePayment.facilityNo) ||
                currentFacility
              }
              remainingBalance={activeReceiptRemaining}
              isReprint={activePayment.status === 'Confirmed'}
              onReturnToProfile={() => {
                setStack([]);
                setScreen('profile');
              }}
              onCollectAnother={handleStartPayment}
            />
          )}

          {screen === 'sync-status' && (
            <SyncStatusScreen
              payments={ledger.payments}
              customers={customers}
              facilities={currentFacilities}
              filter={syncFilter}
              ready={ready}
              syncing={syncing}
              syncingIds={syncingIds}
              isOffline={isOfflineMode}
              onFilterChange={setSyncFilter}
              onRetrySync={triggerSync}
              onViewReceipt={(facNo, rcNo) => {
                setSelectedFacilityNo(facNo);
                setActiveReceiptNo(rcNo);
                navigateTo('receipt');
              }}
            />
          )}
        </main>

        {/* Payment Confirmation Popup Modal */}
        <ConfirmModal
          isOpen={showConfirmModal}
          customer={currentCustomer}
          facility={currentFacility}
          amount={Number(amount)}
          isOffline={isOfflineMode}
          saving={saving}
          ready={ready}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowConfirmModal(false)}
        />

        {/* PIN Security Modal for Inactivity & Device Lock */}
        <PinLockModal isLocked={isLocked} onUnlock={() => setIsLocked(false)} />
      </div>

      {/* Footer copyright note */}
      <footer className="no-print py-4 text-center text-xs text-[#7183a3]">
        Eagle Credit (PVT) LTD · Secure Field Operations POS (Sunmi V2)
      </footer>
    </div>
  );
}
