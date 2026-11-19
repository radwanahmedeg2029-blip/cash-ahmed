import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  sanitizePermissionsForRole,
} from '../constants/permissions.ts';
import type {
  AppUser,
  CreateUserPayload,
  PermissionKey,
  Role,
  UpdateUserPayload,
} from '../types/treasury.ts';
import { formatNumber } from '../utils/format.ts';

interface UsersManagementProps {
  currentUser: AppUser;
  users: AppUser[];
  loading: boolean;
  onCreateUser: (payload: CreateUserPayload) => Promise<void>;
  onUpdateUser: (userId: string, payload: UpdateUserPayload) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

const ROLE_OPTIONS: Role[] = ['gm', 'accountant', 'treasurer', 'collector'];

export function UsersManagement({
  currentUser,
  users,
  loading,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: UsersManagementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [role, setRole] = useState<Role>('collector');
  const [permissions, setPermissions] = useState<PermissionKey[]>([
    ...ROLE_DEFAULT_PERMISSIONS.collector,
  ]);
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setPin('');
    setShowPin(false);
    setRole('collector');
    setPermissions([...ROLE_DEFAULT_PERMISSIONS.collector]);
    setActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPin('');
    setShowPin(false);
    setRole(user.role);
    setPermissions([...user.permissions]);
    setActive(user.active);
    setFormError(null);
    setModalOpen(true);
  };

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    setPermissions([...ROLE_DEFAULT_PERMISSIONS[nextRole]]);
  };

  const togglePermission = (key: PermissionKey) => {
    if (role === 'collector') {
      const def = ALL_PERMISSIONS.find((p) => p.key === key);
      if (def?.forbiddenForCollector) return;
    }
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (name.trim().length < 2) {
      setFormError('يرجى إدخال الاسم الكامل للمستخدم.');
      return;
    }
    if (username.trim().length < 2 || /\s/.test(username.trim())) {
      setFormError('يرجى إدخال اسم مستخدم صالح بدون مسافات.');
      return;
    }
    if (!editingUser && pin.trim().length < 4) {
      setFormError('يجب إدخال رقم سري مكون من 4 خانات على الأقل.');
      return;
    }
    if (editingUser && pin.trim() && pin.trim().length < 4) {
      setFormError('يجب أن يتكون الرقم السري الجديد من 4 خانات على الأقل.');
      return;
    }

    const sanitized = sanitizePermissionsForRole(role, permissions);

    setSaving(true);
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, {
          name: name.trim(),
          username: username.trim().toLowerCase(),
          role,
          permissions: sanitized,
          active,
          ...(pin.trim() ? { pin: pin.trim() } : {}),
        });
        setActionSuccess(`تم تحديث بيانات وصلاحيات "${name.trim()}" بنجاح.`);
      } else {
        await onCreateUser({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          pin: pin.trim(),
          role,
          permissions: sanitized,
        });
        setActionSuccess(
          `تم إضافة المستخدم "${name.trim()}" (${ROLE_LABELS[role]}) باسم دخول "${username.trim().toLowerCase()}".`,
        );
      }
      setModalOpen(false);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر حفظ بيانات المستخدم.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    setActionError(null);
    try {
      await onUpdateUser(user.id, { active: !user.active });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر تغيير حالة الحساب.');
    }
  };

  const handleDelete = async (user: AppUser) => {
    setActionError(null);
    try {
      await onDeleteUser(user.id);
      setActionSuccess(`تم حذف الحساب "${user.name}".`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر حذف المستخدم.');
    }
  };

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-5">
      {/* Header Summary Card */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <Shield className="w-4 h-4" />
            <span>إدارة الصلاحيات والحسابات</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            المستخدمون والأدوار الوظيفية
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إجمالي الحسابات:{' '}
            <strong className="text-slate-900 tabular-nums">{formatNumber(users.length)}</strong>
            <span aria-hidden="true" className="mx-2">·</span>
            النشطة:{' '}
            <strong className="text-teal-700 tabular-nums">{formatNumber(activeCount)}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </section>

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium"
        >
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-teal-700 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Users List */}
      <section className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">جارٍ تحميل المستخدمين...</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-5">المستخدم</th>
                    <th className="py-3 px-4">اسم الدخول</th>
                    <th className="py-3 px-4">الدور الوظيفي</th>
                    <th className="py-3 px-4">الصلاحيات</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-5">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {u.name}
                          {isSelf && (
                            <span className="mr-2 text-xs font-medium text-teal-700">(الحالي)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs" dir="ltr">
                          @{u.username}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{u.roleLabel}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {formatNumber(u.permissions.length)} صلاحيات مفعّلة
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold">
                          <span className={u.active ? 'text-teal-700' : 'text-rose-700'}>
                            {u.active ? 'نشط' : 'معطّل'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                            {!isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(u)}
                                  className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-600"
                                >
                                  {u.active ? 'تعطيل' : 'تفعيل'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(u)}
                                  aria-label={`حذف ${u.name}`}
                                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List */}
            <ul className="md:hidden divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <li key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {u.name}
                          {isSelf && (
                            <span className="mr-1.5 text-xs font-medium text-teal-700">(الحالي)</span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{u.roleLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span dir="ltr">@{u.username}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatNumber(u.permissions.length)} صلاحيات</span>
                          <span aria-hidden="true">·</span>
                          <span className={u.active ? 'text-teal-700 font-semibold' : 'text-rose-700 font-semibold'}>
                            {u.active ? 'نشط' : 'معطّل'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="flex-1 min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل الدور والصلاحيات</span>
                      </button>
                      {!isSelf && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                          >
                            {u.active ? 'تعطيل' : 'تفعيل'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            aria-label={`حذف ${u.name}`}
                            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-rose-200 text-rose-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 px-5 pt-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {editingUser ? `تعديل حساب: ${editingUser.name}` : 'إضافة مستخدم جديد'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    حدد الدور الوظيفي، الصلاحيات، والرقم السري لتسجيل الدخول
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="إغلاق"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="user-name" className="block text-xs font-semibold text-slate-800 mb-1.5">
                    الاسم الكامل
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: سعيد إبراهيم"
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label htmlFor="user-username" className="block text-xs font-semibold text-slate-800 mb-1.5">
                    اسم المستخدم للدخول
                  </label>
                  <input
                    id="user-username"
                    type="text"
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="saeed"
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 text-right focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="user-pin" className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {editingUser ? 'الرقم السري الجديد (اختياري)' : 'الرقم السري لتسجيل الدخول'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="user-pin"
                    type={showPin ? 'text' : 'password'}
                    dir="ltr"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={editingUser ? 'اتركه فارغاً للإبقاء على الحالي' : 'أدخل 4 أرقام أو أحرف على الأقل'}
                    className="w-full min-h-[46px] pr-10 pl-11 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 text-right focus:outline-none focus:border-teal-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((p) => !p)}
                    aria-label={showPin ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                  الدور الوظيفي
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const selected = role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Permissions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800">الصلاحيات الممنوحة</span>
                  {role === 'collector' && (
                    <span className="text-[11px] text-amber-700 font-medium">
                      بيانات الخزينة والمناديب الآخرين محظورة تلقائياً للمندوب
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {ALL_PERMISSIONS.map((perm) => {
                    const lockedOff = role === 'collector' && Boolean(perm.forbiddenForCollector);
                    const checked = !lockedOff && permissions.includes(perm.key);

                    return (
                      <label
                        key={perm.key}
                        className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                          lockedOff
                            ? 'bg-slate-50/70 opacity-60 cursor-not-allowed'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={lockedOff}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-0.5 w-4 h-4 accent-teal-700 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900">
                            <span>{perm.label}</span>
                            {lockedOff && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {editingUser && editingUser.id !== currentUser.id && (
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                    تفعيل الحساب للسماح بتسجيل الدخول
                  </span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 accent-teal-700"
                  />
                </label>
              )}

              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
                >
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  <span>{saving ? 'جارٍ الحفظ...' : editingUser ? 'حفظ التعديلات' : 'إنشاء المستخدم'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
