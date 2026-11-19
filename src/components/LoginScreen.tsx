import { Eye, EyeOff, KeyRound, Lock, LogIn, RotateCcw, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { SEEDED_DEMO_ACCOUNTS } from '../constants/demoUsers.ts';

interface LoginScreenProps {
  onLogin: (username: string, pin: string) => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export function LoginScreen({ onLogin, onResetDemo }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quickLoadingId, setQuickLoadingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!username.trim() || !pin.trim()) {
      setError('يرجى إدخال اسم المستخدم والرقم السري.');
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(username.trim(), pin.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (presetId: string, presetUsername: string, presetPin: string) => {
    setError(null);
    setNotice(null);
    setUsername(presetUsername);
    setPin(presetPin);
    setQuickLoadingId(presetId);
    try {
      await onLogin(presetUsername, presetPin);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر الدخول بهذا الحساب. يمكنك استعادة البيانات الافتراضية.',
      );
    } finally {
      setQuickLoadingId(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    try {
      await onResetDemo();
      setNotice('تمت استعادة الحسابات والبيانات الافتراضية بنجاح.');
    } catch {
      setError('تعذر استعادة البيانات الافتراضية.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Login Form Card */}
        <section
          aria-label="تسجيل الدخول إلى نظام الخزينة"
          className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-100">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                  دفتر الخزينة
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  نظام التحصيل الميداني ومتابعة الخزينة والصلاحيات
                </p>
              </div>
              <span className="w-11 h-11 rounded-xl bg-slate-900 text-teal-300 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </span>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  اسم المستخدم
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    dir="ltr"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    placeholder="salem / ahmed"
                    className="w-full min-h-[48px] pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-right placeholder:text-slate-400 text-base focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-pin"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  الرقم السري
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-pin"
                    type={showPin ? 'text' : 'password'}
                    dir="ltr"
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••"
                    className="w-full min-h-[48px] pr-10 pl-12 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-right placeholder:text-slate-400 text-lg font-bold tracking-widest focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    aria-label={showPin ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium"
                >
                  {error}
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm font-medium"
                >
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <LogIn className="w-5 h-5 text-teal-300" />
                <span>{submitting ? 'جارٍ التحقق...' : 'تسجيل الدخول'}</span>
              </button>
            </form>
          </div>

          <p className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            يمكن للمدير العام إضافة مستخدمين جدد وتحديد أدوارهم وصلاحياتهم وأرقامهم السرية من داخل لوحة التحكم.
          </p>
        </section>

        {/* Quick Demo Accounts Reference */}
        <section
          aria-label="حسابات تجريبية للاختبار السريع"
          className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  الدخول السريع للحسابات التجريبية
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  اضغط على أي حساب لتسجيل الدخول المباشر واختبار الصلاحيات
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>استعادة الافتراضي</span>
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {SEEDED_DEMO_ACCOUNTS.map((acc) => {
                const isLoading = quickLoadingId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={submitting || quickLoadingId !== null}
                    onClick={() => handleQuickLogin(acc.id, acc.username, acc.pin)}
                    className="w-full min-h-[64px] p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 text-right transition-colors flex items-center justify-between gap-3 disabled:opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-slate-900">
                        <span>{acc.name}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-teal-700">{acc.roleLabel}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{acc.shortDesc}</p>
                    </div>
                    <div className="text-left shrink-0 tabular-nums">
                      <span className="block text-xs font-bold text-slate-800" dir="ltr">
                        {acc.username}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5" dir="ltr">
                        {isLoading ? '...' : `PIN: ${acc.pin}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
