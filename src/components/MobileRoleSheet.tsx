import { KeyRound, LogIn, LogOut, User, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { SEEDED_DEMO_ACCOUNTS } from '../constants/demoUsers.ts';
import type { AppUser } from '../types/treasury.ts';

interface AccountSwitchModalProps {
  open: boolean;
  currentUser: AppUser;
  onClose: () => void;
  onSwitchLogin: (username: string, pin: string) => Promise<void>;
  onLogout: () => void;
}

export function AccountSwitchModal({
  open,
  currentUser,
  onClose,
  onSwitchLogin,
  onLogout,
}: AccountSwitchModalProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !pin.trim()) {
      setError('يرجى إدخال اسم المستخدم والرقم السري.');
      return;
    }
    setSubmitting(true);
    try {
      await onSwitchLogin(username.trim(), pin.trim());
      setUsername('');
      setPin('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (presetUsername: string, presetPin: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await onSwitchLogin(presetUsername, presetPin);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التبديل لهذا الحساب.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="تبديل الحساب أو تسجيل الخروج"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              الحساب النشط: {currentUser.name}
            </h2>
            <p className="text-xs text-slate-500">
              {currentUser.roleLabel} · @{currentUser.username}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direct Login Switch Form (supports any newly created user + PIN) */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700">
            تسجيل الدخول بحساب آخر (بالرقم السري)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اسم المستخدم"
                className="w-full min-h-[44px] pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-sm text-right focus:outline-none focus:border-teal-700"
              />
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                dir="ltr"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="الرقم السري"
                className="w-full min-h-[44px] pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-sm text-right focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'جارٍ التبديل...' : 'دخول بالحساب'}</span>
          </button>
        </form>

        {/* Quick Demo Presets */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
          <p className="text-xs font-semibold text-slate-600">تبديل سريع للحسابات التجريبية</p>
          <div className="grid grid-cols-1 gap-1.5">
            {SEEDED_DEMO_ACCOUNTS.map((acc) => {
              const active = acc.username === currentUser.username;
              return (
                <button
                  key={acc.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickDemo(acc.username, acc.pin)}
                  className={`min-h-[46px] px-3.5 py-2 rounded-xl border text-right flex items-center justify-between gap-2 transition-colors ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold">
                    {acc.name} ·{' '}
                    <span className={active ? 'text-teal-300' : 'text-teal-700'}>
                      {acc.roleLabel}
                    </span>
                  </span>
                  <span className="text-[11px] opacity-75 tabular-nums" dir="ltr">
                    {acc.username} / {acc.pin}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="mt-4 w-full min-h-[44px] px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
