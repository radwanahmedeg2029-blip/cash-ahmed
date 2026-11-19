import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { SEEDED_DEMO_ACCOUNTS } from './src/constants/demoUsers.ts';
import {
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  sanitizePermissionsForRole,
} from './src/constants/permissions.ts';
import type {
  AppUser,
  CollectorDashboardResponse,
  CollectorSummary,
  PermissionKey,
  Role,
  TreasuryCollectionItem,
  TreasuryDashboardResponse,
} from './src/types/treasury.ts';
import { getLocalTodayISO, getOffsetDateISO } from './src/utils/format.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoredUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  permissions: PermissionKey[];
  pinHash: string;
  active: boolean;
  createdAt: string;
}

interface TreasuryStore {
  sessionSecret: string;
  openingBalance: number;
  users: StoredUser[];
  collections: TreasuryCollectionItem[];
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'treasury-store.json');

const VALID_ROLES = new Set<Role>(['gm', 'accountant', 'treasurer', 'collector']);

function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPin(pin: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  try {
    const derived = crypto.scryptSync(pin, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

function toPublicUser(user: StoredUser): AppUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    permissions: user.permissions,
    active: user.active,
    createdAt: user.createdAt,
  };
}

function createSeedUsers(): StoredUser[] {
  const now = new Date().toISOString();
  return SEEDED_DEMO_ACCOUNTS.map((preset) => ({
    id: preset.id,
    name: preset.name,
    username: preset.username,
    role: preset.role,
    permissions: [...ROLE_DEFAULT_PERMISSIONS[preset.role]],
    pinHash: hashPin(preset.pin),
    active: true,
    createdAt: now,
  }));
}

function createSeedStore(): TreasuryStore {
  const today = getLocalTodayISO();
  const yesterday = getOffsetDateISO(1);
  const twoDaysAgo = getOffsetDateISO(2);
  const fourDaysAgo = getOffsetDateISO(4);

  const seedCollections: TreasuryCollectionItem[] = [
    {
      id: 'tx-1001',
      customerName: 'شركة النيل للتوريدات',
      collectorId: 'col-ahmed',
      collectorName: 'أحمد محمود',
      amount: 14500,
      date: today,
      createdAt: `${today}T10:15:00`,
    },
    {
      id: 'tx-1002',
      customerName: 'مؤسسة الفجر التجارية',
      collectorId: 'col-kareem',
      collectorName: 'كريم سعيد',
      amount: 9200,
      date: today,
      createdAt: `${today}T11:20:00`,
    },
    {
      id: 'tx-1003',
      customerName: 'أسواق الخير الحديثة',
      collectorId: 'col-ahmed',
      collectorName: 'أحمد محمود',
      amount: 6800,
      date: today,
      createdAt: `${today}T13:05:00`,
    },
    {
      id: 'tx-1004',
      customerName: 'مجموعة الدلتا الغذائية',
      collectorId: 'col-tarek',
      collectorName: 'طارق علي',
      amount: 18000,
      date: today,
      createdAt: `${today}T14:40:00`,
    },
    {
      id: 'tx-1005',
      customerName: 'شركة الأمل للمقاولات',
      collectorId: 'col-kareem',
      collectorName: 'كريم سعيد',
      amount: 12400,
      date: yesterday,
      createdAt: `${yesterday}T12:10:00`,
    },
    {
      id: 'tx-1006',
      customerName: 'متاجر الصفا والمروة',
      collectorId: 'col-ahmed',
      collectorName: 'أحمد محمود',
      amount: 8750,
      date: yesterday,
      createdAt: `${yesterday}T15:30:00`,
    },
    {
      id: 'tx-1007',
      customerName: 'مؤسسة الرواد الصناعية',
      collectorId: 'col-tarek',
      collectorName: 'طارق علي',
      amount: 21500,
      date: yesterday,
      createdAt: `${yesterday}T16:45:00`,
    },
    {
      id: 'tx-1008',
      customerName: 'شركة الوادي الأخضر',
      collectorId: 'col-ahmed',
      collectorName: 'أحمد محمود',
      amount: 11250,
      date: twoDaysAgo,
      createdAt: `${twoDaysAgo}T11:00:00`,
    },
    {
      id: 'tx-1009',
      customerName: 'معرض النور للأجهزة',
      collectorId: 'col-kareem',
      collectorName: 'كريم سعيد',
      amount: 7600,
      date: twoDaysAgo,
      createdAt: `${twoDaysAgo}T14:15:00`,
    },
    {
      id: 'tx-1010',
      customerName: 'مؤسسة الماسة للتوزيع',
      collectorId: 'col-tarek',
      collectorName: 'طارق علي',
      amount: 15000,
      date: fourDaysAgo,
      createdAt: `${fourDaysAgo}T10:30:00`,
    },
  ];

  return {
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    openingBalance: 150000,
    users: createSeedUsers(),
    collections: seedCollections,
  };
}

let memoryStore: TreasuryStore;

function saveStore(store: TreasuryStore): void {
  memoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Keep operating in-memory if filesystem is read-only
  }
}

function loadStore(): TreasuryStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<TreasuryStore>;
      if (
        parsed &&
        typeof parsed.openingBalance === 'number' &&
        Array.isArray(parsed.collections)
      ) {
        const migrated: TreasuryStore = {
          sessionSecret:
            typeof parsed.sessionSecret === 'string' && parsed.sessionSecret.length >= 16
              ? parsed.sessionSecret
              : crypto.randomBytes(32).toString('hex'),
          openingBalance: parsed.openingBalance,
          users:
            Array.isArray(parsed.users) && parsed.users.length > 0
              ? parsed.users
              : createSeedUsers(),
          collections: parsed.collections,
        };
        saveStore(migrated);
        return migrated;
      }
    }
  } catch {
    // Fallback to seed store
  }
  const seed = createSeedStore();
  saveStore(seed);
  return seed;
}

memoryStore = loadStore();

function signToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', memoryStore.sessionSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  try {
    const expectedSig = crypto
      .createHmac('sha256', memoryStore.sessionSecret)
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub?: string;
      exp?: number;
    };
    if (!decoded?.sub || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return decoded.sub;
  } catch {
    return null;
  }
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.header('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول للمتابعة.' });
    return;
  }

  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'انتهت جلسة الدخول، يرجى تسجيل الدخول مجدداً.' });
    return;
  }

  const user = memoryStore.users.find((u) => u.id === userId);
  if (!user || !user.active) {
    res.status(401).json({ error: 'الحساب غير موجود أو تم تعطيله.' });
    return;
  }

  req.authUser = user;
  next();
}

function sortCollectionsNewestFirst(items: TreasuryCollectionItem[]): TreasuryCollectionItem[] {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function buildScopedDashboard(
  user: StoredUser,
): CollectorDashboardResponse | TreasuryDashboardResponse {
  const today = getLocalTodayISO();
  const sorted = sortCollectionsNewestFirst(memoryStore.collections);
  const publicUser = toPublicUser(user);

  // Strict RBAC isolation for Collector:
  // Never expose treasuryBalance, openingBalance, totalReceipts, or other collectors' data.
  if (user.role === 'collector') {
    const canViewOwn = user.permissions.includes('view_own_collections');
    const canRecord = user.permissions.includes('record_collection');
    const myItems = canViewOwn
      ? sorted
          .filter((item) => item.collectorId === user.id)
          .map((item) => ({
            id: item.id,
            customerName: item.customerName,
            amount: item.amount,
            date: item.date,
            createdAt: item.createdAt,
          }))
      : [];

    const personalTotal = myItems.reduce((sum, item) => sum + item.amount, 0);
    const todayPersonalTotal = myItems
      .filter((item) => item.date === today)
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      viewType: 'collector',
      user: publicUser,
      canRecordCollection: canRecord,
      canViewOwnCollections: canViewOwn,
      personalTotal,
      todayPersonalTotal,
      recordsCount: myItems.length,
      collections: myItems,
    };
  }

  // Management & Finance roles: gm, accountant, treasurer (permission-gated)
  const canViewTreasuryBalance = user.permissions.includes('view_treasury_balance');
  const canViewAllReceipts = user.permissions.includes('view_all_receipts');
  const canEditOpeningBalance = user.permissions.includes('edit_opening_balance');
  const canExportReports = user.permissions.includes('export_reports');
  const canManageUsers = user.permissions.includes('manage_users');

  const totalReceipts = sorted.reduce((sum, item) => sum + item.amount, 0);
  const todayReceipts = sorted
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + item.amount, 0);
  const treasuryBalance = memoryStore.openingBalance + totalReceipts;

  const summaryMap = new Map<string, CollectorSummary>();
  if (canViewAllReceipts) {
    for (const item of sorted) {
      const existing = summaryMap.get(item.collectorId);
      if (existing) {
        existing.totalAmount += item.amount;
        existing.count += 1;
        if (item.date === today) {
          existing.todayAmount += item.amount;
        }
      } else {
        summaryMap.set(item.collectorId, {
          collectorId: item.collectorId,
          collectorName: item.collectorName,
          totalAmount: item.amount,
          todayAmount: item.date === today ? item.amount : 0,
          count: 1,
        });
      }
    }
  }

  const collectorsSummary = Array.from(summaryMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount,
  );

  return {
    viewType: 'treasury',
    user: publicUser,
    canViewTreasuryBalance,
    canViewAllReceipts,
    canEditOpeningBalance,
    canExportReports,
    canManageUsers,
    treasuryBalance: canViewTreasuryBalance ? treasuryBalance : null,
    openingBalance: canViewTreasuryBalance ? memoryStore.openingBalance : null,
    totalReceipts: canViewTreasuryBalance ? totalReceipts : null,
    todayReceipts: canViewTreasuryBalance ? todayReceipts : null,
    recordsCount: canViewAllReceipts ? sorted.length : 0,
    collections: canViewAllReceipts ? sorted : [],
    collectorsSummary,
  };
}

function normalizeUsername(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Authentication Routes
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const username = normalizeUsername(req.body?.username);
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';

    if (!username || !pin) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم والرقم السري.' });
      return;
    }

    const user = memoryStore.users.find((u) => u.username.toLowerCase() === username);
    if (!user || !verifyPin(pin, user.pinHash)) {
      res.status(401).json({ error: 'اسم المستخدم أو الرقم السري غير صحيح.' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ error: 'تم تعطيل هذا الحساب. يرجى مراجعة المدير العام.' });
      return;
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: toPublicUser(user),
      dashboard: buildScopedDashboard(user),
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  // Dashboard Route
  app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json(buildScopedDashboard(req.authUser!));
  });

  // Record Collection Route
  app.post('/api/collections', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;

    if (!user.permissions.includes('record_collection')) {
      res.status(403).json({
        error: 'ليست لديك صلاحية تسجيل تحصيل جديد.',
      });
      return;
    }

    const rawCustomerName =
      typeof req.body?.customerName === 'string' ? req.body.customerName.trim() : '';
    const rawAmount = Number(req.body?.amount);
    const rawDate =
      typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
        ? req.body.date
        : getLocalTodayISO();

    if (!rawCustomerName || rawCustomerName.length < 2) {
      res.status(400).json({ error: 'يرجى إدخال اسم العميل بشكل صحيح.' });
      return;
    }

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      res.status(400).json({ error: 'يرجى إدخال مبلغ تحصيل أكبر من صفر.' });
      return;
    }

    const newItem: TreasuryCollectionItem = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerName: rawCustomerName,
      collectorId: user.id,
      collectorName: user.name,
      amount: Math.round(rawAmount * 100) / 100,
      date: rawDate,
      createdAt: new Date().toISOString(),
    };

    saveStore({
      ...memoryStore,
      collections: [newItem, ...memoryStore.collections],
    });

    res.status(201).json({
      created: {
        id: newItem.id,
        customerName: newItem.customerName,
        amount: newItem.amount,
        date: newItem.date,
        createdAt: newItem.createdAt,
      },
      dashboard: buildScopedDashboard(user),
    });
  });

  // Update Opening Balance Route
  app.patch(
    '/api/treasury/opening-balance',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      if (user.role === 'collector' || !user.permissions.includes('edit_opening_balance')) {
        res.status(403).json({
          error: 'ليست لديك صلاحية تعديل الرصيد الافتتاحي للخزينة.',
        });
        return;
      }

      const nextOpening = Number(req.body?.openingBalance);
      if (!Number.isFinite(nextOpening) || nextOpening < 0) {
        res.status(400).json({ error: 'يرجى إدخال رصيد افتتاحي صالح.' });
        return;
      }

      saveStore({
        ...memoryStore,
        openingBalance: Math.round(nextOpening * 100) / 100,
      });

      res.json(buildScopedDashboard(user));
    },
  );

  // User Management Routes
  app.get('/api/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    if (actor.role === 'collector' || !actor.permissions.includes('manage_users')) {
      res.status(403).json({ error: 'ليست لديك صلاحية إدارة المستخدمين.' });
      return;
    }

    res.json({
      users: memoryStore.users.map(toPublicUser),
    });
  });

  app.post('/api/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    if (actor.role === 'collector' || !actor.permissions.includes('manage_users')) {
      res.status(403).json({ error: 'ليست لديك صلاحية إضافة مستخدمين.' });
      return;
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const username = normalizeUsername(req.body?.username);
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const role = req.body?.role as Role;
    const rawPermissions = Array.isArray(req.body?.permissions)
      ? (req.body.permissions as PermissionKey[])
      : [];

    if (name.length < 2) {
      res.status(400).json({ error: 'يرجى إدخال الاسم الكامل للمستخدم (حرفين على الأقل).' });
      return;
    }

    if (username.length < 2 || /\s/.test(username)) {
      res.status(400).json({
        error: 'يرجى إدخال اسم مستخدم صالح بدون مسافات (حرفين على الأقل).',
      });
      return;
    }

    if (memoryStore.users.some((u) => u.username.toLowerCase() === username)) {
      res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل، اختر اسماً آخر.' });
      return;
    }

    if (pin.length < 4) {
      res.status(400).json({ error: 'يجب أن يتكون الرقم السري من 4 خانات على الأقل.' });
      return;
    }

    if (!VALID_ROLES.has(role)) {
      res.status(400).json({ error: 'الدور الوظيفي المحدد غير صالح.' });
      return;
    }

    const sanitizedPermissions = sanitizePermissionsForRole(
      role,
      rawPermissions.length > 0 ? rawPermissions : ROLE_DEFAULT_PERMISSIONS[role],
    );

    const prefix =
      role === 'gm'
        ? 'gm'
        : role === 'accountant'
          ? 'acc'
          : role === 'treasurer'
            ? 'trs'
            : 'col';

    const newUser: StoredUser = {
      id: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      username,
      role,
      permissions: sanitizedPermissions,
      pinHash: hashPin(pin),
      active: true,
      createdAt: new Date().toISOString(),
    };

    saveStore({
      ...memoryStore,
      users: [...memoryStore.users, newUser],
    });

    res.status(201).json({
      user: toPublicUser(newUser),
      users: memoryStore.users.map(toPublicUser),
    });
  });

  app.patch('/api/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    if (actor.role === 'collector' || !actor.permissions.includes('manage_users')) {
      res.status(403).json({ error: 'ليست لديك صلاحية تعديل المستخدمين.' });
      return;
    }

    const targetId = req.params.id;
    const targetIndex = memoryStore.users.findIndex((u) => u.id === targetId);
    if (targetIndex === -1) {
      res.status(404).json({ error: 'المستخدم غير موجود.' });
      return;
    }

    const existing = memoryStore.users[targetIndex];
    const nextName =
      typeof req.body?.name === 'string' ? req.body.name.trim() : existing.name;
    const nextUsername =
      req.body?.username !== undefined
        ? normalizeUsername(req.body.username)
        : existing.username;
    const nextRole =
      req.body?.role !== undefined ? (req.body.role as Role) : existing.role;
    const nextActive =
      typeof req.body?.active === 'boolean' ? req.body.active : existing.active;
    const nextPin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';

    if (nextName.length < 2) {
      res.status(400).json({ error: 'يرجى إدخال اسم صحيح للمستخدم.' });
      return;
    }
    if (nextUsername.length < 2 || /\s/.test(nextUsername)) {
      res.status(400).json({ error: 'يرجى إدخال اسم مستخدم صالح بدون مسافات.' });
      return;
    }
    if (
      memoryStore.users.some(
        (u) => u.id !== targetId && u.username.toLowerCase() === nextUsername,
      )
    ) {
      res.status(409).json({ error: 'اسم المستخدم مسجل لحساب آخر.' });
      return;
    }
    if (!VALID_ROLES.has(nextRole)) {
      res.status(400).json({ error: 'الدور الوظيفي غير صالح.' });
      return;
    }
    if (nextPin && nextPin.length < 4) {
      res.status(400).json({ error: 'يجب أن يتكون الرقم السري الجديد من 4 خانات على الأقل.' });
      return;
    }

    if (targetId === actor.id && !nextActive) {
      res.status(400).json({ error: 'لا يمكنك تعطيل حسابك الحالي أثناء تسجيل الدخول.' });
      return;
    }

    const nextPermissions = Array.isArray(req.body?.permissions)
      ? sanitizePermissionsForRole(nextRole, req.body.permissions as PermissionKey[])
      : sanitizePermissionsForRole(nextRole, existing.permissions);

    if (targetId === actor.id && !nextPermissions.includes('manage_users')) {
      res.status(400).json({ error: 'لا يمكنك سحب صلاحية إدارة المستخدمين من حسابك الحالي.' });
      return;
    }

    const updatedUser: StoredUser = {
      ...existing,
      name: nextName,
      username: nextUsername,
      role: nextRole,
      permissions: nextPermissions,
      active: nextActive,
      pinHash: nextPin ? hashPin(nextPin) : existing.pinHash,
    };

    const nextUsers = [...memoryStore.users];
    nextUsers[targetIndex] = updatedUser;

    // Update collectorName in existing collections if name changed
    const nextCollections =
      nextName !== existing.name
        ? memoryStore.collections.map((c) =>
            c.collectorId === targetId ? { ...c, collectorName: nextName } : c,
          )
        : memoryStore.collections;

    saveStore({
      ...memoryStore,
      users: nextUsers,
      collections: nextCollections,
    });

    res.json({
      user: toPublicUser(updatedUser),
      users: nextUsers.map(toPublicUser),
    });
  });

  app.delete('/api/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    if (actor.role === 'collector' || !actor.permissions.includes('manage_users')) {
      res.status(403).json({ error: 'ليست لديك صلاحية حذف المستخدمين.' });
      return;
    }

    const targetId = req.params.id;
    if (targetId === actor.id) {
      res.status(400).json({ error: 'لا يمكنك حذف الحساب المسجل الدخول به حالياً.' });
      return;
    }

    const exists = memoryStore.users.some((u) => u.id === targetId);
    if (!exists) {
      res.status(404).json({ error: 'المستخدم غير موجود.' });
      return;
    }

    const nextUsers = memoryStore.users.filter((u) => u.id !== targetId);
    saveStore({
      ...memoryStore,
      users: nextUsers,
    });

    res.json({
      ok: true,
      users: nextUsers.map(toPublicUser),
    });
  });

  // Demo Reset Route
  app.post('/api/demo/reset', (_req: Request, res: Response) => {
    const seed = createSeedStore();
    saveStore(seed);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: { server: httpServer },
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: disableHmr ? false : true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
