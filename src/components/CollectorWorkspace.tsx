import { Calendar, CheckCircle2, Plus, Receipt, Search, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { CollectorDashboardResponse } from '../types/treasury.ts';
import { formatArabicDateLabel, formatNumber, getLocalTodayISO } from '../utils/format.ts';

interface CollectorWorkspaceProps {
  data: CollectorDashboardResponse;
  activeMobileTab: 'entry' | 'history';
  onMobileTabChange: (tab: 'entry' | 'history') => void;
  onAddCollection: (payload: { customerName: string; amount: number; date: string }) => Promise<void>;
}

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

export function CollectorWorkspace({
  data,
  activeMobileTab,
  onMobileTabChange,
  onAddCollection,
}: CollectorWorkspaceProps) {
  const today = getLocalTodayISO();
  const [customerName, setCustomerName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dateInput, setDateInput] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  // Quick-pick recent customers strictly from this collector's own collections
  const recentCustomers = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of data.collections) {
      if (!seen.has(item.customerName)) {
        seen.add(item.customerName);
        list.push(item.customerName);
      }
      if (list.length >= 4) break;
    }
    return list;
  }, [data.collections]);

  const filteredCollections = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return data.collections.filter((item) => {
      const matchesName = !q || item.customerName.toLowerCase().includes(q);
      const matchesDate = !historyDateFilter || item.date === historyDateFilter;
      return matchesName && matchesDate;
    });
  }, [data.collections, historySearch, historyDateFilter]);

  const handleQuickAddAmount = (delta: number) => {
    const current = Number(amountInput) || 0;
    setAmountInput(String(current + delta));
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);

    const trimmedName = customerName.trim();
    const numericAmount = Number(amountInput);

    if (trimmedName.length < 2) {
      setFormError('يرجى إدخال اسم العميل (حرفين على الأقل).');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('يرجى إدخال مبلغ تحصيل صحيح أكبر من صفر.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddCollection({
        customerName: trimmedName,
        amount: numericAmount,
        date: dateInput || today,
      });
      setCustomerName('');
      setAmountInput('');
      setDateInput(today);
      setSuccessNotice(`تم تسجيل تحصيل بقيمة ${formatNumber(numericAmount)} ج.م من ${trimmedName}`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر حفظ التحصيل، حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const parsedPreviewAmount = Number(amountInput);

  return (
    <div className="space-y-5">
      {/* Personal Summary Anchor (Strictly personal total — NEVER shows treasury balance) */}
      <section
        aria-label="ملخص التحصيل الشخصي"
        className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              إجمالي تحصيلي الشخصي — {data.user.name}
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                {formatNumber(data.personalTotal)}
              </span>
              <span className="text-sm sm:text-base font-semibold text-teal-700">ج.م</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-slate-500">
              <span>
                تحصيل اليوم:{' '}
                <strong className="font-semibold text-slate-800 tabular-nums">
                  {formatNumber(data.todayPersonalTotal)} ج.م
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                عدد العمليات:{' '}
                <strong className="font-semibold text-slate-800 tabular-nums">
                  {formatNumber(data.recordsCount)}
                </strong>
              </span>
            </div>
          </div>

          <div className="md:hidden grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onMobileTabChange('entry')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                activeMobileTab === 'entry'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              تسجيل تحصيل جديد
            </button>
            <button
              type="button"
              onClick={() => onMobileTabChange('history')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                activeMobileTab === 'history'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              سجل تحصيلاتي ({formatNumber(data.recordsCount)})
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Fast Thumb-Friendly Entry Form */}
        {data.canRecordCollection ? (
          <section
            aria-label="نموذج تسجيل تحصيل سريع"
            className={`lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 ${
              activeMobileTab === 'entry' ? 'block' : 'hidden lg:block'
            }`}
          >
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">تسجيل تحصيل جديد</h2>
              <p className="text-xs text-slate-500 mt-0.5">إدخال سريع بيد واحدة من الميدان</p>
            </div>
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Customer Name */}
            <div>
              <label htmlFor="collector-customer" className="block text-sm font-semibold text-slate-800 mb-1.5">
                اسم العميل
              </label>
              <input
                id="collector-customer"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setFormError(null);
                }}
                placeholder="اكتب اسم العميل أو المحل..."
                autoComplete="off"
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 transition-shadow"
              />
              {recentCustomers.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">عملاء سابقون:</span>
                  {recentCustomers.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setCustomerName(name);
                        setFormError(null);
                      }}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="collector-amount" className="block text-sm font-semibold text-slate-800">
                  مبلغ التحصيل
                </label>
                {Number.isFinite(parsedPreviewAmount) && parsedPreviewAmount > 0 && (
                  <span className="text-xs font-semibold text-teal-700 tabular-nums">
                    {formatNumber(parsedPreviewAmount)} ج.م
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="collector-amount"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="any"
                  dir="ltr"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="0"
                  className="w-full min-h-[54px] pl-14 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-300 text-2xl font-bold tabular-nums text-right focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none">
                  ج.م
                </span>
              </div>

              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddAmount(val)}
                    className="min-h-[40px] px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold tabular-nums transition-colors active:scale-[0.97]"
                  >
                    +{formatNumber(val)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountInput('')}
                  className="min-h-[40px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-xs font-medium transition-colors"
                >
                  مسح
                </button>
              </div>
            </div>

            {/* Date (Defaults to Today) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="collector-date" className="block text-sm font-semibold text-slate-800">
                  التاريخ
                </label>
                {dateInput !== today ? (
                  <button
                    type="button"
                    onClick={() => setDateInput(today)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    ضبط على اليوم
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">افتراضي: تاريخ اليوم</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="collector-date"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium tabular-nums focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                />
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium"
              >
                {formError}
              </div>
            )}

            {successNotice && (
              <div
                role="status"
                className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold text-base transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              <Receipt className="w-5 h-5" />
              <span>{submitting ? 'جارٍ الحفظ...' : 'حفظ التحصيل'}</span>
            </button>
          </form>
        </section>
        ) : (
          <section
            className={`lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 text-center ${
              activeMobileTab === 'entry' ? 'block' : 'hidden lg:block'
            }`}
          >
            <p className="text-sm font-bold text-slate-800">صلاحية تسجيل التحصيل معطّلة</p>
            <p className="text-xs text-slate-500 mt-1">
              يرجى مراجعة المدير العام لتفعيل صلاحية تسجيل تحصيل جديد لهذا الحساب.
            </p>
          </section>
        )}

        {/* Personal Collections List */}
        <section
          aria-label="سجل تحصيلاتي الخاصة"
          className={`lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl overflow-hidden ${
            activeMobileTab === 'history' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">سجل تحصيلاتي</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  يعرض عمليات التحصيل المسجلة باسمك فقط
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {formatNumber(filteredCollections.length)} عملية
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-7 relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="ابحث باسم العميل..."
                  className="w-full min-h-[44px] pr-10 pl-9 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700"
                />
                {historySearch && (
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => setHistorySearch('')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="sm:col-span-5 relative flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    aria-label="تصفية بالتاريخ"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="w-full min-h-[44px] pr-9 pl-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs sm:text-sm text-slate-800 tabular-nums focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
                {historyDateFilter && (
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('')}
                    className="min-h-[44px] px-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                  >
                    الكل
                  </button>
                )}
              </div>
            </div>
          </div>

          {!data.canViewOwnCollections ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                صلاحية عرض سجل التحصيلات الشخصية غير مفعّلة
              </p>
              <p className="text-xs text-slate-500 mt-1">
                يمكن للمدير العام تفعيلها من إدارة المستخدمين.
              </p>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">لا توجد تحصيلات مطابقة</p>
              <p className="text-xs text-slate-500 mt-1">
                {data.collections.length === 0
                  ? 'ابدأ بتسجيل أول عملية تحصيل من النموذج.'
                  : 'جرّب مسح كلمات البحث أو اختيار تاريخ آخر.'}
              </p>
              {(historySearch || historyDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryDateFilter('');
                  }}
                  className="mt-3 min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                >
                  عرض كل تحصيلاتي
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredCollections.map((item) => (
                <li
                  key={item.id}
                  className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                      {item.customerName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {formatArabicDateLabel(item.date)}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                      {formatNumber(item.amount)}
                    </span>
                    <span className="text-xs font-semibold text-teal-700 mr-1">ج.م</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
