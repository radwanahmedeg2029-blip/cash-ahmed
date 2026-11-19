export type Role = 'gm' | 'accountant' | 'treasurer' | 'collector';

export type PermissionKey =
  | 'record_collection'
  | 'view_own_collections'
  | 'view_treasury_balance'
  | 'view_all_receipts'
  | 'edit_opening_balance'
  | 'export_reports'
  | 'manage_users';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  roleLabel: string;
  permissions: PermissionKey[];
  active: boolean;
  createdAt: string;
}

export interface DemoAccountPreset {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: Role;
  roleLabel: string;
  shortDesc: string;
}

export interface CollectorCollectionItem {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface TreasuryCollectionItem {
  id: string;
  customerName: string;
  collectorId: string;
  collectorName: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface CollectorSummary {
  collectorId: string;
  collectorName: string;
  totalAmount: number;
  todayAmount: number;
  count: number;
}

export interface CollectorDashboardResponse {
  viewType: 'collector';
  user: AppUser;
  canRecordCollection: boolean;
  canViewOwnCollections: boolean;
  personalTotal: number;
  todayPersonalTotal: number;
  recordsCount: number;
  collections: CollectorCollectionItem[];
}

export interface TreasuryDashboardResponse {
  viewType: 'treasury';
  user: AppUser;
  canViewTreasuryBalance: boolean;
  canViewAllReceipts: boolean;
  canEditOpeningBalance: boolean;
  canExportReports: boolean;
  canManageUsers: boolean;
  treasuryBalance: number | null;
  openingBalance: number | null;
  totalReceipts: number | null;
  todayReceipts: number | null;
  recordsCount: number;
  collections: TreasuryCollectionItem[];
  collectorsSummary: CollectorSummary[];
}

export type DashboardResponse = CollectorDashboardResponse | TreasuryDashboardResponse;

export interface CreateUserPayload {
  name: string;
  username: string;
  pin: string;
  role: Role;
  permissions: PermissionKey[];
}

export interface UpdateUserPayload {
  name?: string;
  username?: string;
  pin?: string;
  role?: Role;
  permissions?: PermissionKey[];
  active?: boolean;
}
