/**
 * Pre-seeded Data for Pure Max Purified Mineral Water Factory Management System
 */

import {
  User,
  UserRole,
  AttendanceRecord,
  SalesRecord,
  ProductionRecord,
  OuterBuyingRecord,
  RollBuyingRecord,
  ExpenseRecord,
  MachineRepairRecord,
  FuelRecord,
  EquipmentLogRecord,
  ChatMessage,
  Announcement,
  AuditLog,
  SystemHealth,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-dev-1',
    employeeId: 'DEV-11422',
    name: 'David Henry Sam',
    email: 'davidhenrysam1@gmail.com',
    phone: '+232 76 100 001',
    role: 'developer',
    department: 'Executive System Administration',
    status: 'active',
    dailySalaryLe: 350000,
    monthlySalaryLe: 9100000,
    isFirstLogin: false,
    createdBy: 'SYSTEM_BUILTIN',
    createdAt: '2026-01-01T08:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-trc-1',
    employeeId: 'PM-TRC-001',
    name: 'Brima Sesay',
    email: 'brima.sesay@puremax.sl',
    phone: '+232 76 440 101',
    role: 'tricycle_staff',
    department: 'Makeni Tricycle Sales & Distribution',
    status: 'active',
    dailySalaryLe: 140000,
    monthlySalaryLe: 3640000,
    isFirstLogin: false,
    createdBy: 'u-dev-1',
    createdAt: '2026-01-10T08:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-van-1',
    employeeId: 'PM-VAN-001',
    name: 'Mohamed Kamara',
    email: 'mohamed.kamara@puremax.sl',
    phone: '+232 78 550 202',
    role: 'van_staff',
    department: 'Makeni Bulk Commercial Van Logistics',
    status: 'active',
    dailySalaryLe: 175000,
    monthlySalaryLe: 4550000,
    isFirstLogin: false,
    createdBy: 'u-dev-1',
    createdAt: '2026-01-10T08:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-trc-2',
    employeeId: 'PM-TRC-002',
    name: 'Alpha Koroma',
    email: 'alpha.koroma@puremax.sl',
    phone: '+232 77 660 303',
    role: 'tricycle_staff',
    department: 'Makeni Sachet Water Retail Dispatch',
    status: 'active',
    dailySalaryLe: 140000,
    monthlySalaryLe: 3640000,
    isFirstLogin: false,
    createdBy: 'u-dev-1',
    createdAt: '2026-01-12T08:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-van-2',
    employeeId: 'PM-VAN-002',
    name: 'Ibrahim Conteh',
    email: 'ibrahim.conteh@puremax.sl',
    phone: '+232 79 770 404',
    role: 'van_staff',
    department: 'Makeni Outer District Van Delivery',
    status: 'active',
    dailySalaryLe: 175000,
    monthlySalaryLe: 4550000,
    isFirstLogin: false,
    createdBy: 'u-dev-1',
    createdAt: '2026-01-12T08:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-mgr-1',
    employeeId: 'PM-MGR-001',
    name: 'Alusine Kamara',
    email: 'manager@puremax.sl',
    phone: '+232 76 220 002',
    role: 'manager',
    department: 'General Plant Administration & Operations',
    status: 'active',
    dailySalaryLe: 300000,
    monthlySalaryLe: 7800000,
    isFirstLogin: false,
    createdBy: 'u-dev-1',
    createdAt: '2026-01-05T08:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_SALES: SalesRecord[] = [];

export const INITIAL_PRODUCTION: ProductionRecord[] = [];

export const INITIAL_OUTER_BUYINGS: OuterBuyingRecord[] = [];

export const INITIAL_ROLL_BUYINGS: RollBuyingRecord[] = [];

export const INITIAL_EXPENSES: ExpenseRecord[] = [];

export const INITIAL_REPAIRS: MachineRepairRecord[] = [];

export const INITIAL_FUEL: FuelRecord[] = [];

export const INITIAL_EQUIPMENT_LOGS: EquipmentLogRecord[] = [];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-init',
    actorId: 'u-dev-1',
    actorName: 'David Henry Sam',
    actorRole: 'developer',
    action: 'SYSTEM_FRESH_START',
    details: 'Pure Max Factory OS initialized with clean database tables and secure role access',
    timestamp: new Date().toISOString(),
  },
];

export const INITIAL_SYSTEM_HEALTH: SystemHealth = {
  apiUptimePercentage: 100.0,
  dbStatus: 'Connected (PostgreSQL 16.2)',
  activeConnections: 1,
  failedJobCount: 0,
  lastBackupTime: new Date().toISOString(),
  currentVersion: 'v2.1.0-clean',
  updateAvailable: false,
  errorLogs: [],
};

