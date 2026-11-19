import { Calendar, Download, Edit3, Lock, Search, Users, Vault, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { TreasuryDashboardResponse } from '../types/treasury.ts';
import {
  formatArabicDateLabel,
  formatNumber,
  getLocalTodayISO,
  getOffsetDateISO,
} from '../utils/format.ts';

interface TreasuryWorkspaceProps {
  data: TreasuryDashboardResponse;
  activeMobileTab: 'ledger' | 'collectors';
  onMobileTabChange: (tab: 'ledger' | 'collectors') => void;
  onUpdateOpeningBalance: (openingBalance: number) => Promise<void>;
}

export function TreasuryWorkspace({
  data,
  activeMobileTab,
  onMobileTabChange,
  onUpdateOpeningBalance,
}: TreasuryWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  const [editingOpening, setEditingOpening] = useState(false);
  const [openingInput, setOpeningInput] = useState(String(data.openingBalance ?? 0));
  const [savingOpening, setSavingOpening] = useState(false);

  const today = getLocalTodayISO();
  const yesterday = getOffsetDateISO(1);

  const canEditOpening = data.canEditOpeningBalance;

  const collectorOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of data.collections) {
      names.add(item.collectorName);
    }
    return Array.from(names);
  }, [data.collections]);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.collections.filter((item) => {
      const matchesSearch =
        !q ||
        item.customerName.toLowerCase().includes(q) ||
        item.collectorName.toLowerCase().includes(q);
      const matchesCollector =
        selectedCollector === 'all' || item.collectorName === selectedCollector;
      const matchesDate = !selectedDate || item.date === selectedDate;
      return matchesSearch && matchesCollector && matchesDate;
    });
  }, [data.collections, searchQuery, selectedCollector, selectedDate]);

  const filteredTotal = useMemo(
    () => filteredReceipts.reduce((sum, item) => sum + item.amount, 0),
    [filteredReceipts],
  );

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCollector !== 'all' || selectedDate);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCollector('all');
    setSelectedDate('');
  };

  const handleSaveOpening = async (e: FormEvent) => {
    e.preventDefault();
    const val = Number(openingInput);
    if (!Number.isFinite(val) || val < 0) return;
    setSavingOpening(true);
    try {
      await onUpdateOpeningBalance(val);
      setEditingOpening(false);
    } finally {
      setSavingOpening(false);
    }
  };

  const handleExportCSV = () => {
    if (!data.canExportReports) return;
    const headers = ['اسم العميل', 'اسم المندوب', 'المبلغ (ج.م)', 'التاريخ'];
    const rows = filteredReceipts.map((r) => [
      `"${r.customerName.replace(/"/g, '""')}"`,
      `"${r.collectorName.replace(/"/g, '""')}"`,
      String(r.amount),
      r.date,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `سجل-الاستلامات-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Primary Financial Anchor: Treasury Balance & Total Receipts */}
      {data.canViewTreasuryBalance ? (
        <section aria-label="ملخص الخزينة والاستلامات" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Treasury Balance */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-300">رصيد الخزينة</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight">
                    {formatNumber(data.treasuryBalance ?? 0)}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-teal-300">ج.م</span>
                </div>
              </div>
              <span className="w-10 h-10 rounded-xl bg-white/10 text-teal-300 flex items-center justify-center shrink-0">
                <Vault className="w-5 h-5" />
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  رصيد افتتاحي:{' '}
                  <strong className="text-white tabular-nums">
                    {formatNumber(data.openingBalance ?? 0)} ج.م
                  </strong>
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span>
                  الاستلامات:{' '}
                  <strong className="text-teal-300 tabular-nums">
                    +{formatNumber(data.totalReceipts ?? 0)} ج.م
                  </strong>
                </span>
              </div>

              {canEditOpening && !editingOpening && (
                <button
                  type="button"
                  onClick={() => {
                    setOpeningInput(String(data.openingBalance ?? 0));
                    setEditingOpening(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل الافتتاحي</span>
                </button>
              )}
            </div>

            {canEditOpening && editingOpening && (
              <form
                onSubmit={handleSaveOpening}
                className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2"
              >
                <input
                  type="number"
                  min="0"
                  step="any"
                  dir="ltr"
                  value={openingInput}
                  onChange={(e) => setOpeningInput(e.target.value)}
                  aria-label="الرصيد الافتتاحي للخزينة"
                  className="flex-1 min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-bold tabular-nums text-right focus:outline-none focus:border-teal-400"
                />
                <button
                  type="submit"
                  disabled={savingOpening}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold whitespace-nowrap"
                >
                  {savingOpening ? 'حفظ...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOpening(false)}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium whitespace-nowrap"
                >
                  إلغاء
                </button>
              </form>
            )}
          </div>

          {/* Card 2: Total Receipts */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500">إجمالي الاستلامات</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                    {formatNumber(data.totalReceipts ?? 0)}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-teal-700">ج.م</span>
                </div>
              </div>
              <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
              <span>
                استلامات اليوم:{' '}
                <strong className="text-slate-900 font-semibold tabular-nums">
                  {formatNumber(data.todayReceipts ?? 0)} ج.م
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                إجمالي السجلات:{' '}
                <strong className="text-slate-900 font-semibold tabular-nums">
                  {formatNumber(data.recordsCount)} عملية
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                المناديب النشطون:{' '}
                <strong className="text-slate-900 font-semibold tabular-nums">
                  {formatNumber(data.collectorsSummary.length)}
                </strong>
              </span>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">عرض رصيد الخزينة غير مفعّل لهذا الحساب</p>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكن للمدير العام تفعيل صلاحية «عرض رصيد الخزينة وإجمالي الاستلامات» من إدارة المستخدمين.
            </p>
          </div>
        </section>
      )}

      {data.canViewAllReceipts ? (
        <>
          {/* Mobile Sub-Navigation Switch */}
          <div className="md:hidden grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onMobileTabChange('ledger')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeMobileTab === 'ledger'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              سجل الاستلامات ({formatNumber(filteredReceipts.length)})
            </button>
            <button
              type="button"
              onClick={() => onMobileTabChange('collectors')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeMobileTab === 'collectors'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              ملخص المناديب ({formatNumber(data.collectorsSummary.length)})
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Detailed Receipts Ledger + Search & Filters */}
            <section
              aria-label="سجل الاستلامات التفصيلي"
              className={`lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl overflow-hidden ${
                activeMobileTab === 'ledger' ? 'block' : 'hidden md:block'
              }`}
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      سجل الاستلامات التفصيلي
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      عرض جميع الاستلامات الواردة للخزينة مع البحث والفلترة الفورية
                    </p>
                  </div>
                  {data.canExportReports && (
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={filteredReceipts.length === 0}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
                    >
                      <Download className="w-4 h-4 text-teal-700" />
                      <span>تصدير CSV</span>
                    </button>
                  )}
                </div>

                {/* Search + Collector + Date Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث باسم العميل أو المندوب..."
                      className="w-full min-h-[44px] pr-10 pl-9 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="مسح البحث"
                        onClick={() => setSearchQuery('')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      aria-label="تصفية حسب المندوب"
                      value={selectedCollector}
                      onChange={(e) => setSelectedCollector(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-teal-700"
                    >
                      <option value="all">كل المناديب</option>
                      {collectorOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4 relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      aria-label="تصفية حسب التاريخ"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full min-h-[44px] pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-800 tabular-nums focus:bg-white focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>

                {/* Quick Date Chips + Filter Totals */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedDate('')}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        selectedDate === ''
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                      }`}
                    >
                      كل التواريخ
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(today)}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        selectedDate === today
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                      }`}
                    >
                      اليوم
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(yesterday)}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        selectedDate === yesterday
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                      }`}
                    >
                      أمس
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>
                      المعروض:{' '}
                      <strong className="text-slate-900 tabular-nums">
                        {formatNumber(filteredReceipts.length)}
                      </strong>{' '}
                      عملية
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span>
                      الإجمالي:{' '}
                      <strong className="text-teal-800 font-bold tabular-nums">
                        {formatNumber(filteredTotal)} ج.م
                      </strong>
                    </span>
                    {hasActiveFilters && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="text-xs font-semibold text-rose-700 hover:text-rose-800 whitespace-nowrap"
                        >
                          مسح الفلاتر
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {filteredReceipts.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    لا توجد نتائج مطابقة لخيارات البحث
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    جرّب تغيير اسم العميل أو المندوب أو إعادة ضبط التاريخ.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    إعادة ضبط البحث والفلاتر
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Ledger Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-5">اسم العميل</th>
                          <th className="py-3 px-4">اسم المندوب</th>
                          <th className="py-3 px-4">المبلغ</th>
                          <th className="py-3 px-5">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredReceipts.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5 font-semibold text-slate-900">
                              {item.customerName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">{item.collectorName}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {formatNumber(item.amount)}{' '}
                              <span className="text-xs font-semibold text-teal-700">ج.م</span>
                            </td>
                            <td className="py-3.5 px-5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                              {formatArabicDateLabel(item.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Thumb-Optimized List Rows */}
                  <ul className="md:hidden divide-y divide-slate-100">
                    {filteredReceipts.map((item) => (
                      <li key={item.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {item.customerName}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">
                              المندوب: {item.collectorName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{formatArabicDateLabel(item.date)}</span>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-base font-extrabold text-slate-900 tabular-nums">
                            {formatNumber(item.amount)}
                          </span>
                          <span className="text-xs font-semibold text-teal-700 mr-1">ج.م</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* Collector Summary Breakdown */}
            <aside
              aria-label="ملخص استلامات المناديب"
              className={`lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl overflow-hidden ${
                activeMobileTab === 'collectors' ? 'block' : 'hidden md:block'
              }`}
            >
              <div className="p-4 sm:p-5 border-b border-slate-100">
                <h2 className="font-display text-lg font-bold text-slate-900">ملخص المناديب</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  اضغط على أي مندوب لتصفية سجل الاستلامات باسمه
                </p>
              </div>

              <ul className="divide-y divide-slate-100">
                {data.collectorsSummary.map((col) => {
                  const isSelected = selectedCollector === col.collectorName;
                  const share =
                    data.totalReceipts && data.totalReceipts > 0
                      ? Math.round((col.totalAmount / data.totalReceipts) * 100)
                      : 0;
                  return (
                    <li key={col.collectorId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCollector(isSelected ? 'all' : col.collectorName);
                          onMobileTabChange('ledger');
                        }}
                        className={`w-full text-right p-4 transition-colors flex items-center justify-between gap-3 ${
                          isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {col.collectorName}
                            </span>
                            {isSelected && (
                              <span className="text-[11px] font-semibold text-teal-700">مفعّل</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 tabular-nums">
                            <span>{formatNumber(col.count)} عمليات</span>
                            <span aria-hidden="true">·</span>
                            <span>اليوم: {formatNumber(col.todayAmount)} ج.م</span>
                            {data.totalReceipts !== null && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{share}%</span>
                              </>
                            )}
                          </div>
                          {data.totalReceipts !== null && (
                            <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-700 rounded-full transition-all"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-base font-bold text-slate-900 tabular-nums">
                            {formatNumber(col.totalAmount)}
                          </span>
                          <span className="block text-[11px] font-semibold text-teal-700">ج.م</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </>
      ) : (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-slate-800">عرض سجل الاستلامات غير مفعّل لهذا الحساب</p>
          <p className="text-xs text-slate-500 mt-1">
            يمكن للمدير العام منح صلاحية «عرض سجل الاستلامات الكامل» من إدارة المستخدمين.
          </p>
        </section>
      )}
    </div>
  );
}
