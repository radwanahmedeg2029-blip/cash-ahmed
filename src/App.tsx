import {
  ListOrdered,
  PlusCircle,
  RefreshCw,
  Shield,
  UserCog,
  Users,
  Vault,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CollectorWorkspace } from './components/CollectorWorkspace.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { AccountSwitchModal } from './components/MobileRoleSheet.tsx';
import { TreasuryWorkspace } from './components/TreasuryWorkspace.tsx';
import { UsersManagement } from './components/UsersManagement.tsx';
import type {
  AppUser,
  CreateUserPayload,
  DashboardResponse,
  UpdateUserPayload,
} from './types/treasury.ts';

const TOKEN_STORAGE_KEY = 'treasury_auth_token';

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(readStoredToken()));
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<'workspace' | 'users'>('workspace');
  const [collectorTab, setCollectorTab] = useState<'entry' | 'history'>('entry');
  const [treasuryTab, setTreasuryTab] = useState<'ledger' | 'collectors'>('ledger');
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);

  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);

  const fetchDashboard = useCallback(async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.status === 401) {
        writeStoredToken(null);
        setToken(null);
        setDashboard(null);
        return;
      }
      if (!res.ok) {
        throw new Error('تعذر تحميل بيانات النظام.');
      }
      const data = (await res.json()) as DashboardResponse;
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (authToken: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const body = (await res.json()) as { users: AppUser[] };
        setUsersList(body.users);
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchDashboard(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchDashboard]);

  useEffect(() => {
    if (
      token &&
      activeSection === 'users' &&
      dashboard?.viewType === 'treasury' &&
      dashboard.canManageUsers
    ) {
      fetchUsers(token);
    }
  }, [token, activeSection, dashboard, fetchUsers]);

  const handleLogin = async (username: string, pin: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, pin }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || 'تعذر تسجيل الدخول.');
    }
    const nextToken = body.token as string;
    writeStoredToken(nextToken);
    setToken(nextToken);
    setDashboard(body.dashboard as DashboardResponse);
    setActiveSection('workspace');
    setCollectorTab('entry');
    setTreasuryTab('ledger');
    setError(null);
  };

  const handleLogout = () => {
    writeStoredToken(null);
    setToken(null);
    setDashboard(null);
    setUsersList([]);
    setActiveSection('workspace');
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/demo/reset', {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('تعذر استعادة البيانات الافتراضية.');
    }
  };

  const handleAddCollection = async (payload: {
    customerName: string;
    amount: number;
    date: string;
  }) => {
    if (!token) throw new Error('يرجى تسجيل الدخول.');
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || 'تعذر تسجيل التحصيل.');
    }
    if (body?.dashboard) {
      setDashboard(body.dashboard as DashboardResponse);
    } else {
      await fetchDashboard(token);
    }
  };

  const handleUpdateOpeningBalance = async (openingBalance: number) => {
    if (!token) throw new Error('يرجى تسجيل الدخول.');
    const res = await fetch('/api/treasury/opening-balance', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ openingBalance }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || 'تعذر تحديث الرصيد الافتتاحي.');
    }
    setDashboard(body as DashboardResponse);
  };

  const handleCreateUser = async (payload: CreateUserPayload) => {
    if (!token) throw new Error('يرجى تسجيل الدخول.');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || 'تعذر إنشاء المستخدم.');
    }
    if (Array.isArray(body.users)) {
      setUsersList(body.users);
    }
  };

  const handleUpdateUser = async (userId: string, payload: UpdateUserPayload) => {
    if (!token) throw new Error('يرجى تسجيل الدخول.');
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || 'تعذر تحديث المستخدم.');
    }
    if (Array.isArray(body.users)) {
      setUsersList(body.users);
    }
    // Refresh dashboard in case current user's own name/permissions changed
    if (dashboard && userId === dashboard.user.id) {
      await fetchDashboard(token);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!token) throw new Error('يرجى تسجيل الدخول.');
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || 'تعذر حذف المستخدم.');
    }
    if (Array.isArray(body.users)) {
      setUsersList(body.users);
    }
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} onResetDemo={handleResetDemo} />;
  }

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">جارٍ التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fetchDashboard(token)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return <LoginScreen onLogin={handleLogin} onResetDemo={handleResetDemo} />;
  }

  const currentUser = dashboard.user;
  const canManageUsers = dashboard.viewType === 'treasury' && dashboard.canManageUsers;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-slate-900">
      {/* Compact 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('workspace');
            }}
            className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap shrink-0"
          >
            دفتر الخزينة
          </a>

          <nav
            aria-label="التنقل الرئيسي"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            {dashboard.viewType === 'collector' ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSection('workspace')}
                  className="text-slate-900 font-semibold whitespace-nowrap shrink-0"
                >
                  التحصيل الشخصي
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSection('workspace')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    activeSection === 'workspace'
                      ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  الخزينة والاستلامات
                </button>
                {canManageUsers && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('users')}
                    className={`transition-colors whitespace-nowrap shrink-0 ${
                      activeSection === 'users'
                        ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-teal-700'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    المستخدمون والصلاحيات
                  </button>
                )}
              </>
            )}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {currentUser.name} · {currentUser.roleLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main
        id="top"
        className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20 md:pb-12 space-y-5"
      >
        {canManageUsers && (
          <div className="md:hidden grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('workspace')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === 'workspace'
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              <Vault className="w-4 h-4" />
              <span>الخزينة والاستلامات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('users')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === 'users'
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              <UserCog className="w-4 h-4" />
              <span>المستخدمون والصلاحيات</span>
            </button>
          </div>
        )}

        {activeSection === 'users' && canManageUsers ? (
          <UsersManagement
            currentUser={currentUser}
            users={usersList}
            loading={usersLoading}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        ) : dashboard.viewType === 'collector' ? (
          <CollectorWorkspace
            data={dashboard}
            activeMobileTab={collectorTab}
            onMobileTabChange={setCollectorTab}
            onAddCollection={handleAddCollection}
          />
        ) : (
          <TreasuryWorkspace
            data={dashboard}
            activeMobileTab={treasuryTab}
            onMobileTabChange={setTreasuryTab}
            onUpdateOpeningBalance={handleUpdateOpeningBalance}
          />
        )}
      </main>

      {/* Mobile Fixed Thumb Navigation Bar (56px height) */}
      <nav
        aria-label="شريط التنقل السريع للهاتف"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        {dashboard.viewType === 'collector' ? (
          <div className="grid grid-cols-3 h-full">
            <button
              type="button"
              onClick={() => {
                setActiveSection('workspace');
                setCollectorTab('entry');
              }}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                collectorTab === 'entry' ? 'text-teal-700 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span className="text-[11px] leading-none">تسجيل تحصيل</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('workspace');
                setCollectorTab('history');
              }}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                collectorTab === 'history' ? 'text-teal-700 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <ListOrdered className="w-5 h-5" />
              <span className="text-[11px] leading-none">سجل تحصيلاتي</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-slate-600 font-medium hover:text-slate-900"
            >
              <Shield className="w-5 h-5" />
              <span className="text-[11px] leading-none">تبديل الحساب</span>
            </button>
          </div>
        ) : canManageUsers ? (
          <div className="grid grid-cols-3 h-full">
            <button
              type="button"
              onClick={() => {
                setActiveSection('workspace');
                setTreasuryTab('ledger');
              }}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeSection === 'workspace'
                  ? 'text-teal-700 font-bold'
                  : 'text-slate-500 font-medium'
              }`}
            >
              <ListOrdered className="w-5 h-5" />
              <span className="text-[11px] leading-none">الخزينة</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('users')}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeSection === 'users'
                  ? 'text-teal-700 font-bold'
                  : 'text-slate-500 font-medium'
              }`}
            >
              <UserCog className="w-5 h-5" />
              <span className="text-[11px] leading-none">المستخدمون</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-slate-600 font-medium hover:text-slate-900"
            >
              <Shield className="w-5 h-5" />
              <span className="text-[11px] leading-none">تبديل الحساب</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 h-full">
            <button
              type="button"
              onClick={() => setTreasuryTab('ledger')}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                treasuryTab === 'ledger' ? 'text-teal-700 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <ListOrdered className="w-5 h-5" />
              <span className="text-[11px] leading-none">سجل الاستلامات</span>
            </button>
            <button
              type="button"
              onClick={() => setTreasuryTab('collectors')}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                treasuryTab === 'collectors' ? 'text-teal-700 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[11px] leading-none">ملخص المناديب</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-slate-600 font-medium hover:text-slate-900"
            >
              <Shield className="w-5 h-5" />
              <span className="text-[11px] leading-none">تبديل الحساب</span>
            </button>
          </div>
        )}
      </nav>

      {/* Account Switcher & PIN Login Modal */}
      <AccountSwitchModal
        open={accountModalOpen}
        currentUser={currentUser}
        onClose={() => setAccountModalOpen(false)}
        onSwitchLogin={handleLogin}
        onLogout={handleLogout}
      />
    </div>
  );
}
