import type { DemoAccountPreset } from '../types/treasury.ts';

export const SEEDED_DEMO_ACCOUNTS: DemoAccountPreset[] = [
  {
    id: 'gm-salem',
    name: 'سالم المنصوري',
    username: 'salem',
    pin: '1111',
    role: 'gm',
    roleLabel: 'مدير عام',
    shortDesc: 'إشراف كامل على الخزينة وإدارة المستخدمين والصلاحيات',
  },
  {
    id: 'acc-nadia',
    name: 'نادية فؤاد',
    username: 'nadia',
    pin: '2222',
    role: 'accountant',
    roleLabel: 'محاسب',
    shortDesc: 'مراجعة دفتر الاستلامات والبحث والفلترة وتصدير التقارير',
  },
  {
    id: 'trs-youssef',
    name: 'يوسف الشريف',
    username: 'youssef',
    pin: '3333',
    role: 'treasurer',
    roleLabel: 'أمين خزينة',
    shortDesc: 'متابعة رصيد الخزينة الفعلي وتعديل الرصيد الافتتاحي',
  },
  {
    id: 'col-ahmed',
    name: 'أحمد محمود',
    username: 'ahmed',
    pin: '4444',
    role: 'collector',
    roleLabel: 'مندوب',
    shortDesc: 'تسجيل التحصيل السريع ومتابعة تحصيله الشخصي فقط',
  },
  {
    id: 'col-kareem',
    name: 'كريم سعيد',
    username: 'kareem',
    pin: '5555',
    role: 'collector',
    roleLabel: 'مندوب',
    shortDesc: 'تسجيل التحصيل السريع ومتابعة تحصيله الشخصي فقط',
  },
];
