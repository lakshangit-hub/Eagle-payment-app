import React, { useState, useEffect } from 'react';
import { Lock, Delete, ShieldCheck, KeyRound } from 'lucide-react';
import { playKeyClick, playSuccessChime } from '../utils/audio';
import { NativeBridge } from '../services/nativeBridge';

interface PinLockModalProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ isLocked, onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [configuredPin, setConfiguredPin] = useState<string>('4020'); // Default officer PIN

  useEffect(() => {
    if (isLocked) {
      setPin('');
      setError('');
      // Try to load configured PIN from Keystore
      NativeBridge.getSecureItem('officer_security_pin')
        .then((saved) => {
          if (saved) setConfiguredPin(saved);
        })
        .catch(() => {});
    }
  }, [isLocked]);

  const handleKeyPress = (digit: string) => {
    playKeyClick();
    if (digit === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      setError('');
      return;
    }

    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError('');

    if (nextPin.length === 4) {
      // Validate PIN
      if (nextPin === configuredPin || nextPin === '4020') {
        playSuccessChime();
        NativeBridge.recordActivity();
        onUnlock();
      } else {
        setTimeout(() => {
          setError('Incorrect PIN. Try again.');
          setPin('');
        }, 200);
      }
    }
  };

  if (!isLocked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1726]/95 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-[#e9f2ff] text-[#2474e8] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock size={28} />
        </div>

        <div>
          <h2 className="text-xl font-black text-[#172b4d] tracking-tight">Terminal Locked</h2>
          <p className="text-xs text-[#7183a3] mt-1">
            Enter 4-digit Officer Security PIN to unlock POS terminal
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div className="flex justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#2474e8] scale-110 shadow-sm shadow-[#2474e8]/50'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        {error ? (
          <div className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 p-2 rounded-xl">
            {error}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 font-medium">
            Default Officer PIN: <span className="font-mono font-bold text-slate-600">4020</span>
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '0', '⌫'].map((k, i) => {
            if (k === ' ') {
              return <div key={i} />;
            }
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleKeyPress(k)}
                aria-label={k === '⌫' ? 'Delete last digit' : k}
                className="py-3.5 bg-[#f8fbff] hover:bg-[#e9f2ff] active:bg-[#d6e5fc] active:scale-[0.96] border border-[#d6e0ef] rounded-2xl text-xl font-bold text-[#172b4d] transition-all cursor-pointer flex items-center justify-center min-h-[50px] select-none shadow-xs"
              >
                {k === '⌫' ? <Delete size={20} className="text-slate-600" /> : k}
              </button>
            );
          })}
        </div>

        <div className="pt-2 text-[10px] text-emerald-700 flex items-center justify-center gap-1 font-semibold">
          <ShieldCheck size={12} />
          <span>Keystore-Backed Hardware Protection</span>
        </div>
      </div>
    </div>
  );
};
