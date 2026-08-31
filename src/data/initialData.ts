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
];

/**
 * Accounts that were shipped as placeholder/demo seed data. They must never
 * come back: a migration in AppContext strips them out of any device that
 * still has them stored from an earlier version, and they are excluded from
 * re-seeding. DEV-11422 is deliberately NOT in this list - it is the owner's
 * real developer account.
 */
export const LEGACY_DEMO_EMPLOYEE_IDS: string[] = [
  'PM-TRC-001',
  'PM-TRC-002',
  'PM-VAN-001',
  'PM-VAN-002',
  'PM-MGR-001',
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

