import type { PermissionKey, Role } from '../types/treasury.ts';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  forbiddenForCollector?: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  gm: 'مدير عام',
  accountant: 'محاسب',
  treasurer: 'أمين خزينة',
  collector: 'مندوب',
};

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'view_treasury_balance',
    label: 'عرض رصيد الخزينة وإجمالي الاستلامات',
    description: 'الاطلاع على الرصيد الفعلي للخزينة والرصيد الافتتاحي وإجمالي الوارد.',
    forbiddenForCollector: true,
  },
  {
    key: 'view_all_receipts',
    label: 'عرض سجل الاستلامات الكامل',
    description: 'الاطلاع على تحصيلات جميع المناديب والبحث والفلترة فيها.',
    forbiddenForCollector: true,
  },
  {
    key: 'edit_opening_balance',
    label: 'تعديل الرصيد الافتتاحي للخزينة',
    description: 'إمكانية تحديث قيمة الرصيد الافتتاحي للخزينة.',
    forbiddenForCollector: true,
  },
  {
    key: 'export_reports',
    label: 'تصدير التقارير (CSV)',
    description: 'تنزيل سجل الاستلامات المصفّى كملف جدول بيانات.',
    forbiddenForCollector: true,
  },
  {
    key: 'manage_users',
    label: 'إدارة المستخدمين والصلاحيات',
    description: 'إضافة مستخدمين جدد وتحديد أدوارهم وصلاحياتهم وأرقامهم السرية.',
    forbiddenForCollector: true,
  },
  {
    key: 'record_collection',
    label: 'تسجيل تحصيل جديد',
    description: 'إدخال عمليات التحصيل الميداني (اسم العميل والمبلغ والتاريخ).',
  },
  {
    key: 'view_own_collections',
    label: 'عرض التحصيلات الشخصية فقط',
    description: 'الاطلاع على سجل التحصيلات المسجلة باسم المستخدم نفسه وإجماليه الشخصي.',
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, PermissionKey[]> = {
  gm: [
    'view_treasury_balance',
    'view_all_receipts',
    'edit_opening_balance',
    'export_reports',
    'manage_users',
  ],
  accountant: [
    'view_treasury_balance',
    'view_all_receipts',
    'export_reports',
  ],
  treasurer: [
    'view_treasury_balance',
    'view_all_receipts',
    'edit_opening_balance',
    'export_reports',
  ],
  collector: [
    'record_collection',
    'view_own_collections',
  ],
};

const COLLECTOR_ALLOWED_SET = new Set<PermissionKey>([
  'record_collection',
  'view_own_collections',
]);

const VALID_PERMISSIONS = new Set<PermissionKey>(ALL_PERMISSIONS.map((p) => p.key));

export function sanitizePermissionsForRole(role: Role, rawPermissions: PermissionKey[]): PermissionKey[] {
  const unique = Array.from(new Set(rawPermissions)).filter((p) => VALID_PERMISSIONS.has(p));

  if (role === 'collector') {
    // Enforce strict collector isolation: never grant treasury balance, all receipts, or user admin.
    const filtered = unique.filter((p) => COLLECTOR_ALLOWED_SET.has(p));
    return filtered.length > 0 ? filtered : [...ROLE_DEFAULT_PERMISSIONS.collector];
  }

  return unique;
}
