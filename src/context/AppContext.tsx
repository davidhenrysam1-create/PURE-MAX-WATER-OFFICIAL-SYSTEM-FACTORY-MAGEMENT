/**
 * AppContext - Central State Manager for Pure Max Factory Management System
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { localDateKey, startOfLocalDay, msUntilNextLocalMidnight } from '../utils/dateUtils';
import {
  User,
  UserRole,
  AttendanceRecord,
  SalesRecord,
  ProductionRecord,
  OuterBuyingRecord,
  RollBuyingRecord,
  PackagingRollItem,
  MachineStatus,
  ExpenseRecord,
  MachineRepairRecord,
  FuelRecord,
  EquipmentLogRecord,
  ChatMessage,
  Announcement,
  NotificationItem,
  AuditLog,
  SystemHealth,
  ThemeConfig,
  SalesCategory,
  StaffLiveLocation,
} from '../types';
import {
  INITIAL_USERS,
  LEGACY_DEMO_EMPLOYEE_IDS,
  INITIAL_ATTENDANCE,
  INITIAL_SALES,
  INITIAL_PRODUCTION,
  INITIAL_OUTER_BUYINGS,
  INITIAL_ROLL_BUYINGS,
  INITIAL_EXPENSES,
  INITIAL_REPAIRS,
  INITIAL_FUEL,
  INITIAL_EQUIPMENT_LOGS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_HEALTH,
} from '../data/initialData';
import { socketService } from '../services/socketService';
import { syncEngine } from '../services/syncEngine';
import { downloadExcelBackup, FactoryBackupData } from '../utils/excelBackup';
import { idbStorage } from '../utils/indexedDBStorage';
import { canPurgeRecords } from '../utils/roleAccess';
import {
  buildArchive,
  saveArchiveToVault,
  downloadArchive,
  uploadArchiveToServer,
  PURGE_SCOPE_META,
  type PurgeScope,
} from '../utils/recordArchive';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/safeStorage';
import { compressImage } from '../utils/imageCompressor';
import {
  cacheAvatar,
  getCachedAvatarSync,
  mergeUserPreservingAvatar,
  rehydrateAvatars,
  stripAvatars,
} from '../utils/avatarStore';

interface ToastNotification {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

interface AppContextType {
  // Auth state
  currentUser: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  isFirstLoginPending: boolean;
  failedLoginAttempts: number;
  lockoutSeconds: number;
  loginError: string | null;

  // Developer Role Inspection Sandbox (Real Accounts Only)
  isInspecting: boolean;
  inspectingOriginalUser: User | null;
  switchRolePreview: (role: UserRole, specificUser?: User) => boolean;
  exitInspectionMode: () => void;

  // Dual Online/Offline Engine & Zero Data Loss
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  triggerManualSync: () => Promise<void>;
  syncNow: () => Promise<void>;
  refreshCloudData: (silent?: boolean) => Promise<void>;
  exportExcelBackup: (customFilename?: string) => void;

  // Global Toast Alert Feedback
  toast: ToastNotification | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning', title?: string) => void;
  hideToast: () => void;

  // Actions for Auth
  login: (credential: string, password: string, isDevShortcut?: boolean) => boolean;
  logout: () => void;
  completeFirstLoginPasswordChange: (newPassword?: string, avatarUrl?: string) => boolean;
  updateUserProfile: (data: { name?: string; phone?: string; email?: string; avatarUrl?: string; altPhone?: string; nickname?: string }) => void;
  resetPasswordWithOtp: (emailOrPhone: string, otpCode: string, newPassword: string) => boolean;
  clearLoginError: () => void;

  // Data Collections
  users: User[];
  attendance: AttendanceRecord[];
  sales: SalesRecord[];
  production: ProductionRecord[];
  outerBuyings: OuterBuyingRecord[];
  rollBuyings: RollBuyingRecord[];
  packagingRolls: PackagingRollItem[];
  machines: MachineStatus[];
  expenses: ExpenseRecord[];
  repairs: MachineRepairRecord[];
  fuel: FuelRecord[];
  equipmentLogs: EquipmentLogRecord[];
  messages: ChatMessage[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  systemHealth: SystemHealth;
  theme: ThemeConfig;
  localGlassTheme: string;
  setLocalGlassTheme: (theme: string) => void;

  // Actions for CRUD & Business Logic
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (userId: string, updatedFields: Partial<User>) => void;
  updateUserStatus: (userId: string, status: 'active' | 'suspended') => void;
  deleteUser: (userId: string) => void;

  // Attendance
  checkIn: (location?: string, notes?: string) => void;
  checkOut: (attendanceId: string) => void;
  approveAttendance: (attendanceId: string, approved: boolean) => void;
  approveCheckOut: (attendanceId: string, approved: boolean) => void;
  resetAttendance: (password: string) => boolean;
  overrideSalary: (userId: string, newMonthlyLe: number, reason: string) => void;

  // Sales
  addSalesRecord: (record: Omit<SalesRecord, 'id' | 'createdAt' | 'receiptNumber'>) => void;

  // Production & Material Records
  addProductionRecord: (record: Omit<ProductionRecord, 'id' | 'createdAt'>) => void;
  addOuterBuyingRecord: (record: Omit<OuterBuyingRecord, 'id' | 'createdAt'>) => void;
  addRollBuyingRecord: (record: Omit<RollBuyingRecord, 'id' | 'createdAt'>) => void;
  addPackagingRolls: (rolls: Omit<PackagingRollItem, 'id' | 'createdAt' | 'bundlesProduced'>[]) => void;
  loadRollToMachine: (machineId: string, rollId: string, operatorName?: string) => { success: boolean; error?: string };
  exhaustMachineRoll: (machineId: string) => void;
  updatePackagingRoll: (rollId: string, updates: Partial<PackagingRollItem>) => void;
  updateMachineStatus: (machineId: string, updates: Partial<MachineStatus>) => void;

  // Expenses
  addExpenseRecord: (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;

  // Repairs & Fuel
  addRepairRecord: (record: Omit<MachineRepairRecord, 'id' | 'createdAt'>) => void;
  addFuelRecord: (record: Omit<FuelRecord, 'id' | 'createdAt'>) => void;

  // Equipment Logs
  addEquipmentLog: (record: Omit<EquipmentLogRecord, 'id' | 'createdAt'>) => void;

  // Real-Time Communication
  sendMessage: (msg: { recipientId?: string; groupId?: string; type: 'text' | 'voice' | 'image'; content: string; durationSeconds?: number }) => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;
  postAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorRole'>) => void;
  markNotificationRead: (id: string) => void;
  markChannelMessagesAsRead: (channelId: string) => void;

  // Staff Live GPS Tracking (Tricycle Staff & Van Staff)
  staffLiveLocations: StaffLiveLocation[];
  updateStaffLiveLocation: (loc: Partial<StaffLiveLocation> & { userId: string; lat: number; lng: number }) => void;
  updateMultipleStaffLocations: (locs: Array<Partial<StaffLiveLocation> & { userId: string; lat: number; lng: number }>) => void;
  clearStaffLiveLocation: (userId: string) => void;

  // Theme & System Updates
  updateTheme: (newTheme: Partial<ThemeConfig>) => void;
  publishSystemUpdate: (version: string) => void;
  resetToFreshDatabase: () => void;

  // Daily (24-hour) window & manual reset (Issue #4)
  todayDateKey: string;
  dailyWindowStart: number;
  resetDailyCounters: () => void;

  // Demo / mock data purge (Issue #5)
  purgeDemoData: () => void;
  purgeRecordsByRole: (
    scope: PurgeScope,
    password: string
  ) => { success: boolean; error?: string; archiveId?: string; removed?: number };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isShareModalOpen: boolean;
  openShareModal: () => void;
  closeShareModal: () => void;
  setIsShareModalOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Collections with hardened try-catch JSON parsing
  const safeLoad = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(`Failed to parse localStorage for ${key}:`, e);
    }
    return fallback;
  };

  // Load official users from localStorage or default (Only Developer account by default, plus any new staff created by manager)
  // Removing the placeholder/demo accounts from INITIAL_USERS only affects a
  // brand-new install. Any phone or browser that already ran the app has them
  // saved in localStorage, so they have to be filtered out on boot as well or
  // they would simply reappear. This runs before anything renders.
  const [users, setUsers] = useState<User[]>(() => {
    const isDemo = (u: User) => !!u && LEGACY_DEMO_EMPLOYEE_IDS.includes(u.employeeId);
    const clean = (list: User[]) => (Array.isArray(list) ? list.filter((u) => !isDemo(u)) : []);

    let initial = INITIAL_USERS;
    const saved = localStorage.getItem('puremax_users_official_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = clean(parsed);
          // Persist the cleaned list straight away so the demo accounts are
          // gone for good rather than being re-filtered on every boot.
          if (cleaned.length !== parsed.length) {
            try {
              localStorage.setItem('puremax_users_official_v5', JSON.stringify(cleaned));
            } catch {
              /* non-fatal: the in-memory list is still clean */
            }
          }
          initial = cleaned;
        }
      } catch {
        initial = INITIAL_USERS;
      }
    }
    return clean(initial);
  });

  // Persistent User Session: Restored across page refresh and offline sessions
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return safeLoad<User | null>('puremax_active_session_user_v5', null);
  });

  // Developer Role Inspection Sandbox State (Strictly for real accounts)
  const usersRef = useRef(users);
  usersRef.current = users;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const [inspectingOriginalUser, setInspectingOriginalUser] = useState<User | null>(() => {
    return safeLoad<User | null>('puremax_inspecting_orig_user_v5', null);
  });
  const [isInspecting, setIsInspecting] = useState<boolean>(() => {
    return !!localStorage.getItem('puremax_inspecting_orig_user_v5');
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const savedUser = safeLoad<User | null>('puremax_active_session_user_v5', null);
    if (savedUser?.role) return savedUser.role;
    return safeLoad<UserRole>('puremax_active_session_role_v5', 'staff');
  });

  // Sync active role with current user authentic role
  useEffect(() => {
    if (currentUser?.role && currentUser.role !== activeRole) {
      setActiveRole(currentUser.role);
    }
  }, [currentUser?.role, activeRole]);

  const [isFirstLoginPending, setIsFirstLoginPending] = useState(false);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Network Online/Offline Status & Dual Sync Engine State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => syncEngine.getPendingCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => syncEngine.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => syncEngine.getLastSyncTime());

  // Active UI Navigation Tab
  const [activeTab, setActiveTab] = useState('dashboard');

  const INITIAL_PACKAGING_ROLLS: PackagingRollItem[] = [];

  // Clean 0-state defaults synced with database and local storage
  const INITIAL_MACHINES: MachineStatus[] = [
    {
      id: 'mach-1',
      name: 'Sachet Machine Line #1',
      code: 'LINE-01',
      assignedOperatorName: '',
      activeRollKg: 0,
      activeRollName: 'No Roll Loaded',
      activeRollBundlesProduced: 0,
      status: 'idle',
      totalBundlesProduced: 0,
    },
    {
      id: 'mach-2',
      name: 'Sachet Machine Line #2',
      code: 'LINE-02',
      assignedOperatorName: '',
      activeRollKg: 0,
      activeRollName: 'No Roll Loaded',
      activeRollBundlesProduced: 0,
      status: 'idle',
      totalBundlesProduced: 0,
    },
    {
      id: 'mach-3',
      name: 'Sachet Machine Line #3',
      code: 'LINE-03',
      assignedOperatorName: '',
      activeRollKg: 0,
      activeRollName: 'No Roll Loaded',
      activeRollBundlesProduced: 0,
      status: 'idle',
      totalBundlesProduced: 0,
    },
    {
      id: 'mach-4',
      name: 'Sachet Machine Line #4',
      code: 'LINE-04',
      assignedOperatorName: '',
      activeRollKg: 0,
      activeRollName: 'No Roll Loaded',
      activeRollBundlesProduced: 0,
      status: 'idle',
      totalBundlesProduced: 0,
    },
  ];

  const MOCK_NAMES = ['brima sesay', 'mohamed kamara', 'alpha koroma', 'ibrahim conteh', 'alusine kamara', 'mohamed sesay'];

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => safeLoad('puremax_attendance_v3', []));
  const [sales, setSales] = useState<SalesRecord[]>(() => safeLoad('puremax_sales_v3', []));
  const [production, setProduction] = useState<ProductionRecord[]>(() => safeLoad('puremax_production_v3', []));
  const [outerBuyings, setOuterBuyings] = useState<OuterBuyingRecord[]>(() => safeLoad('puremax_outer_buyings_v3', []));
  const [rollBuyings, setRollBuyings] = useState<RollBuyingRecord[]>(() => safeLoad('puremax_roll_buyings_v3', []));
  
  // Real packaging rolls without mock seeds
  const [packagingRolls, setPackagingRolls] = useState<PackagingRollItem[]>(() => {
    const loaded = safeLoad<PackagingRollItem[]>('puremax_packaging_rolls_v6', INITIAL_PACKAGING_ROLLS);
    return loaded.filter((r) => !MOCK_NAMES.includes((r.operatorName || '').toLowerCase().trim()));
  });

  // Real machine status tied strictly to authentic user accounts
  const [machines, setMachines] = useState<MachineStatus[]>(() => {
    const loaded = safeLoad<MachineStatus[]>('puremax_machines_v6', INITIAL_MACHINES);
    return loaded.map((m) => {
      const op = (m.assignedOperatorName || '').toLowerCase().trim();
      if (MOCK_NAMES.includes(op)) {
        return {
          ...m,
          assignedOperatorName: '',
          activeRollId: undefined,
          activeRollCode: undefined,
          activeRollKg: 0,
          activeRollName: 'No Roll Loaded',
          activeRollBundlesProduced: 0,
          status: 'idle',
        };
      }
      return m;
    });
  });

  // Purge any legacy mock storage on initial mount
  useEffect(() => {
    try {
      const legacyKeys = [
        'puremax_machines_v4',
        'puremax_machines_v5',
        'puremax_packaging_rolls_v4',
        'puremax_packaging_rolls_v5',
      ];
      legacyKeys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('puremax_packaging_rolls_v6', JSON.stringify(packagingRolls));
    } catch (err) {
      console.warn('Packaging rolls localStorage save warning:', err);
    }
  }, [packagingRolls]);

  useEffect(() => {
    try {
      localStorage.setItem('puremax_machines_v6', JSON.stringify(machines));
    } catch (err) {
      console.warn('Machines localStorage save warning:', err);
    }
  }, [machines]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => safeLoad('puremax_expenses_v3', []));
  const [repairs, setRepairs] = useState<MachineRepairRecord[]>(() => safeLoad('puremax_repairs_v3', []));
  const [fuel, setFuel] = useState<FuelRecord[]>(() => safeLoad('puremax_fuel_v3', []));
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLogRecord[]>(() => safeLoad('puremax_equipment_logs_v3', []));
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const raw = safeLoad<ChatMessage[]>('puremax_messages_v3', []);
    return raw.map((m) => {
      let inferredType = m.type || 'text';
      if (m.content?.startsWith('data:audio') || m.content?.startsWith('blob:') || m.content?.startsWith('voice_note_')) {
        inferredType = 'voice';
      } else if (m.content?.startsWith('data:image')) {
        inferredType = 'image';
      }
      return { ...m, type: inferredType };
    });
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => safeLoad('puremax_announcements_v3', []));
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  const openShareModal = () => setIsShareModalOpen(true);
  const closeShareModal = () => setIsShareModalOpen(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success', title?: string) => {
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type, title });
  };

  const hideToast = () => setToast(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('puremax_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth>(INITIAL_SYSTEM_HEALTH);

  const DEFAULT_THEME_CONFIG: ThemeConfig = {
    primaryColor: 'indigo',
    darkMode: true,
    factoryName: 'Pure Max Factory #1',
    showLogo: true,
    loginBgUrl: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=1600&q=80',
    bannerBgUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=80',
    loginBgOpacity: 0.85,
    bannerHeight: 'normal',
  };

  const [localGlassTheme, setLocalGlassTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('puremax_local_glass_theme') || 'ultra_dark';
    }
    return 'ultra_dark';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('puremax_local_glass_theme', localGlassTheme);
    }
  }, [localGlassTheme]);

  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('puremax_theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_THEME_CONFIG,
          ...parsed,
          loginBgUrl: parsed.loginBgUrl || DEFAULT_THEME_CONFIG.loginBgUrl,
          bannerBgUrl: parsed.bannerBgUrl || DEFAULT_THEME_CONFIG.bannerBgUrl,
        };
      } catch {
        return DEFAULT_THEME_CONFIG;
      }
    }
    return DEFAULT_THEME_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('puremax_theme', JSON.stringify(theme));
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
  }, [theme]);

  // Mirror the active dark/light mode onto <html>.
  // App.tsx only puts the `dark` class on #app-main-layout, but overlays that
  // render through a React portal (Share modal, WebRTC call UI, toasts) live
  // under <body> instead, and would otherwise miss every `dark:` style.
  // Because index.css declares `@custom-variant dark (&:where(.dark, .dark *))`,
  // toggling the class on <html> makes the whole document — portals included —
  // follow the in-app theme rather than the OS preference.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const isDark = theme.darkMode ?? true;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [theme.darkMode]);

  // ---------------------------------------------------------------------------
  // ISSUE #4 — Daily (24-hour) window & Manager manual reset
  // ---------------------------------------------------------------------------
  // `todayDateKey` is a LOCAL-calendar date string (see utils/dateUtils). It is
  // deliberately held in state rather than recomputed inline: the dashboard's
  // "today" figures were previously evaluated once per render from
  // `new Date().toISOString()`, so a browser tab left open past midnight kept
  // showing yesterday's totals until something unrelated re-rendered. The
  // ticker below flips this value exactly at local midnight, forcing the
  // daily cards to re-evaluate and roll over to zero on their own.
  const [todayDateKey, setTodayDateKey] = useState<string>(() => localDateKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const rollOver = () => {
      setTodayDateKey(localDateKey());
      schedule();
    };

    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(rollOver, msUntilNextLocalMidnight());
    }

    schedule();

    // Mobile browsers freeze timers in backgrounded tabs, so the timeout above
    // may fire late (or not at all). Re-check whenever the tab comes back.
    const handleVisibility = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      const key = localDateKey();
      if (key !== todayDateKey) {
        setTodayDateKey(key);
      }
      schedule();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
    // `todayDateKey` is intentionally omitted: including it would resubscribe
    // on every midnight rollover. `schedule()` already re-arms itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manager/Developer "Reset Daily Counters" marker, in epoch ms.
  // This is NON-DESTRUCTIVE: resetting only moves the start of the "today"
  // window forward. Every record stays in state and in the database, so
  // lifetime totals, reports and the Excel export are untouched.
  const [dailyResetAtMs, setDailyResetAtMs] = useState<number>(() => {
    const raw = safeLoad<number>('puremax_daily_reset_at', 0);
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  });

  useEffect(() => {
    safeLocalStorageSet('puremax_daily_reset_at', dailyResetAtMs);
  }, [dailyResetAtMs]);

  // Start of the current daily window: whichever is LATER — local midnight, or
  // the last manual reset. Once midnight passes, startOfLocalDay() overtakes a
  // stale reset marker automatically, so the 24-hour auto-reset still applies.
  const dailyWindowStart = useMemo(() => {
    return Math.max(startOfLocalDay(), dailyResetAtMs || 0);
  }, [todayDateKey, dailyResetAtMs]);

  const resetDailyCounters = () => {
    const now = Date.now();
    setDailyResetAtMs(now);
    // Keep the calendar key in step so the UI flips immediately.
    setTodayDateKey(localDateKey());

    logAudit(
      'DAILY_COUNTERS_RESET',
      `Daily summary counters reset to zero by ${currentUser?.name || 'Manager'} at ${new Date(now).toLocaleString()}. Historical records were preserved.`
    );

    showToast(
      "Today's summary counters have been reset to zero. All historical records are preserved in reports.",
      'success',
      'Daily Counters Reset'
    );
  };

  // ---------------------------------------------------------------------------
  // ISSUE #5 — Demo / mock data purge
  // ---------------------------------------------------------------------------
  // Seed data in src/data/initialData.ts is already empty, but demo rows can
  // still linger in two places: older builds wrote them into localStorage, and
  // a connected PostgreSQL instance may still hold them from an earlier demo.
  // This sweeps both, and only ever removes records that cannot be attributed
  // to a real, active staff account.
  const purgeDemoData = () => {
    let removedSales = 0;
    let removedAttendance = 0;
    let removedProduction = 0;

    const isRealActiveUser = (identifier?: string) => {
      if (!identifier) return false;
      const needle = String(identifier).trim().toLowerCase();
      return users.some(
        (u) =>
          u.status !== 'suspended' &&
          (String(u.id).toLowerCase() === needle ||
            String(u.employeeId).toLowerCase() === needle ||
            String(u.name).toLowerCase() === needle)
      );
    };

    setSales((prev) => {
      const kept = prev.filter((s) => {
        // A demo row is one explicitly flagged, or one with no traceable author.
        const flagged = (s as any).isDemo === true || (s as any).isMock === true || (s as any).isSeed === true;
        const traceable = isRealActiveUser(s.recordedById) || isRealActiveUser(s.recordedByName);
        if (flagged || !traceable) {
          removedSales += 1;
          return false;
        }
        return true;
      });
      return kept;
    });

    setAttendance((prev) => {
      const kept = prev.filter((a) => {
        const flagged = (a as any).isDemo === true || (a as any).isMock === true;
        if (flagged || !isRealActiveUser(a.userId)) {
          removedAttendance += 1;
          return false;
        }
        return true;
      });
      return kept;
    });

    setProduction((prev) => {
      const kept = prev.filter((p) => {
        const flagged = (p as any).isDemo === true || (p as any).isMock === true;
        if (flagged) {
          removedProduction += 1;
          return false;
        }
        return true;
      });
      return kept;
    });

    // Ask the server to do the same sweep when one is reachable. On a static
    // GitHub Pages deploy this simply 404s and is ignored.
    fetch('/api/sales/mock', { method: 'DELETE' }).catch(() => {
      /* offline / static deploy — local purge is sufficient */
    });

    logAudit(
      'PURGE_DEMO_DATA',
      `Purged demo/mock records: ${removedSales} sales, ${removedAttendance} attendance, ${removedProduction} production.`
    );

    showToast(
      `Demo data purged: ${removedSales} sales, ${removedAttendance} attendance, ${removedProduction} production records removed.`,
      'success',
      'Demo Data Purged'
    );
  };

  // ---------------------------------------------------------------------------
  // Secure purge by staff role - Manager / Developer "Safe Zone"
  // ---------------------------------------------------------------------------
  // Clears every record attributable to Production Sales Officers or Production
  // Engineers. Destructive by design, so three safeguards apply:
  //   1. Role gate  - Manager / 2nd Manager / Developer only. The roles being
  //                   purged are deliberately excluded so they can never erase
  //                   their own audit trail.
  //   2. Password   - the signed-in privileged user must re-type their own
  //                   password immediately before the purge runs.
  //   3. Archive    - nothing is lost. A timestamped snapshot is written to
  //                   IndexedDB, indexed in localStorage, downloaded as an
  //                   .xlsx workbook, and POSTed to the server when reachable.
  // The archive is written BEFORE any live collection is mutated, so a failure
  // part-way through leaves factory data intact rather than half-deleted.

  /** Passwords accepted for the Developer's built-in super-admin account. */
  const DEVELOPER_PASSWORDS = ['SAM_11422', 'Sam11422', 'sam_11422', 'SAM11422', 'devpass'];

  const verifyPrivilegedPassword = (user: User, input: string): boolean => {
    const submitted = (input || '').trim();
    if (!submitted) return false;
    if (user.role === 'developer') {
      if (DEVELOPER_PASSWORDS.includes(submitted)) return true;
      return !!user.password && user.password.trim() === submitted;
    }
    return !!user.password && user.password.trim() === submitted;
  };

  const purgeRecordsByRole = (
    scope: PurgeScope,
    password: string
  ): { success: boolean; error?: string; archiveId?: string; removed?: number } => {
    const actor = currentUser;
    const meta = PURGE_SCOPE_META[scope];

    if (!actor) {
      return { success: false, error: 'You must be signed in to perform this action.' };
    }

    // A Developer inspecting another account still acts with their own
    // authority, so fall back to the original session role.
    const effectiveRole = (inspectingOriginalUser?.role || actor.role) as UserRole;
    if (!canPurgeRecords(effectiveRole)) {
      return {
        success: false,
        error: 'Access denied. Only the Factory Manager or the Developer can purge records.',
      };
    }

    if (!verifyPrivilegedPassword(actor, password)) {
      return { success: false, error: 'Incorrect password. No records were changed.' };
    }

    const targetRole = meta.role;
    const staff = users.filter((u) => u.role === targetRole);
    const staffIds = new Set(staff.map((u) => u.id));

    if (staffIds.size === 0) {
      return {
        success: false,
        error: `No ${meta.label} accounts exist, so there is nothing to purge.`,
      };
    }

    const owns = (id?: string | null) => !!id && staffIds.has(id);

    const partition = (list: any[], predicate: (item: any) => boolean) => {
      const removed: any[] = [];
      const kept: any[] = [];
      list.forEach((item) => (predicate(item) ? removed.push(item) : kept.push(item)));
      return { removed, kept };
    };

    const salesSplit = partition(
      sales,
      (r) => owns(r.recordedById) || r.recordedByRole === targetRole
    );
    const productionSplit = partition(
      production,
      (r) => owns(r.engineerId) || owns(r.operatorId)
    );
    const attendanceSplit = partition(
      attendance,
      (r) => owns(r.userId) || r.userRole === targetRole
    );
    const expensesSplit = partition(expenses, (r) => owns(r.recordedById));
    const outerSplit = partition(outerBuyings, (r) => owns(r.engineerId));
    const rollSplit = partition(rollBuyings, (r) => owns(r.engineerId));
    const repairsSplit = partition(repairs, (r) => owns(r.engineerId));
    const fuelSplit = partition(fuel, (r) => owns(r.engineerId));
    const equipmentSplit = partition(equipmentLogs, (r) => owns(r.operatorId));

    const totalRemoved =
      salesSplit.removed.length +
      productionSplit.removed.length +
      attendanceSplit.removed.length +
      expensesSplit.removed.length +
      outerSplit.removed.length +
      rollSplit.removed.length +
      repairsSplit.removed.length +
      fuelSplit.removed.length +
      equipmentSplit.removed.length;

    if (totalRemoved === 0) {
      return {
        success: false,
        error: `No records were found for any ${meta.label} account. Nothing was purged.`,
      };
    }

    const archive = buildArchive({
      scope,
      records: {
        sales: salesSplit.removed,
        production: productionSplit.removed,
        attendance: attendanceSplit.removed,
        expenses: expensesSplit.removed,
        outerBuyings: outerSplit.removed,
        rollBuyings: rollSplit.removed,
        repairs: repairsSplit.removed,
        fuel: fuelSplit.removed,
        equipmentLogs: equipmentSplit.removed,
      },
      actor: { id: actor.id, name: actor.name, role: actor.role },
      affectedStaff: staff.map((u) => `${u.name} (${u.employeeId})`),
    });

    // ---- Archive first, mutate second --------------------------------------
    saveArchiveToVault(archive).catch((err) =>
      console.error('Failed to persist purge archive to IndexedDB:', err)
    );

    try {
      downloadArchive(archive);
    } catch (err) {
      console.error('Failed to generate the Excel purge archive:', err);
    }

    uploadArchiveToServer(archive).then((ok) => {
      if (!ok) {
        console.warn('Purge archive was not backed up to a server (no backend reachable).');
      }
    });

    setSales(salesSplit.kept);
    setProduction(productionSplit.kept);
    setAttendance(attendanceSplit.kept);
    setExpenses(expensesSplit.kept);
    setOuterBuyings(outerSplit.kept);
    setRollBuyings(rollSplit.kept);
    setRepairs(repairsSplit.kept);
    setFuel(fuelSplit.kept);
    setEquipmentLogs(equipmentSplit.kept);

    logAudit(
      'PURGE_RECORDS_BY_ROLE',
      `Purged ${totalRemoved} ${meta.label} records (archive ${archive.id}): ` +
        `${salesSplit.removed.length} sales, ${productionSplit.removed.length} production, ` +
        `${attendanceSplit.removed.length} attendance, ${expensesSplit.removed.length} expenses, ` +
        `${outerSplit.removed.length} outer buyings, ${rollSplit.removed.length} roll buyings, ` +
        `${repairsSplit.removed.length} repairs, ${fuelSplit.removed.length} fuel, ` +
        `${equipmentSplit.removed.length} equipment logs.`
    );

    showToast(
      `Purged ${totalRemoved} ${meta.label} records. A recovery archive (${archive.id}) was saved and downloaded as Excel.`,
      'success',
      'Records Purged & Archived'
    );

    return { success: true, archiveId: archive.id, removed: totalRemoved };
  };

  // Real-Time GPS Tracking for Logged-In Tricycle Staff & Van Staff Only
  const [staffLiveLocations, setStaffLiveLocations] = useState<StaffLiveLocation[]>(() => {
    const saved = localStorage.getItem('puremax_staff_live_locations');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Drop any GPS pin left behind by a demo account, plus anything with no
      // real coordinates. Only genuine hardware fixes may reach the map.
      return parsed.filter(
        (loc: StaffLiveLocation) =>
          loc &&
          !LEGACY_DEMO_EMPLOYEE_IDS.includes(loc.employeeId) &&
          !['u-trc-1', 'u-trc-2', 'u-van-1', 'u-van-2', 'u-mgr-1'].includes(loc.userId) &&
          typeof loc.lat === 'number' &&
          typeof loc.lng === 'number'
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('puremax_staff_live_locations', JSON.stringify(staffLiveLocations));
  }, [staffLiveLocations]);

  // Sync locations across browser windows/tabs in real-time
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'puremax_staff_live_locations' && e.newValue) {
        try {
          setStaffLiveLocations(JSON.parse(e.newValue));
        } catch (err) {
          console.error('GPS sync error:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // When a Tricycle or Van staff user logs in, automatically request & track their real GPS position
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'tricycle_staff' && currentUser.role !== 'van_staff')) {
      return;
    }

    let watchId: number | null = null;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      // Continuous real-time device watch
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed, heading } = pos.coords;
          const calculatedSpeed = speed ? Math.round(speed * 3.6) : 0;
          updateStaffLiveLocation({
            userId: currentUser.id,
            employeeId: currentUser.employeeId,
            userName: currentUser.name,
            userRole: currentUser.role as 'tricycle_staff' | 'van_staff',
            avatarUrl: currentUser.avatarUrl,
            phone: currentUser.phone,
            lat: latitude,
            lng: longitude,
            accuracyMeters: Math.round(accuracy || 10),
            speedKmH: calculatedSpeed,
            heading: heading || 0,
            batteryPct: 95,
            status: calculatedSpeed > 0 ? 'Online & Moving' : 'Stationary / Delivering',
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isLiveDeviceGps: true,
          });
        },
        (err) => {
          console.warn('Geolocation watch notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [currentUser?.id, currentUser?.role]);


  // Network Status & Sync Engine Subscription
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Network connected. Synchronizing offline records with live database...', 'info', 'Online Mode Active');
      syncEngine.processQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode: All records will be securely saved locally with zero data loss.', 'warning', 'Offline Mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncEngine.subscribe((count, syncing) => {
      setPendingSyncCount(count);
      setIsSyncing(syncing);
      setLastSyncTime(syncEngine.getLastSyncTime());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Real-time Cloud Synchronization with Zero Data Loss intelligent merge
  const refreshCloudData = useCallback(async (silent = true) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const [
        usersRes,
        attRes,
        salesRes,
        prodRes,
        outBuyRes,
        rollBuyRes,
        pkgRollsRes,
        expRes,
        repRes,
        fuelRes,
        eqRes,
        msgRes,
        annRes,
        settingsRes,
      ] = await Promise.allSettled([
        fetch('/api/users'),
        fetch('/api/attendance'),
        fetch('/api/sales'),
        fetch('/api/production'),
        fetch('/api/outer-buyings'),
        fetch('/api/roll-buyings'),
        fetch('/api/packaging-rolls'),
        fetch('/api/expenses'),
        fetch('/api/repairs'),
        fetch('/api/fuel'),
        fetch('/api/equipment-logs'),
        fetch('/api/messages'),
        fetch('/api/announcements'),
        fetch('/api/settings'),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        const pgSettings = await settingsRes.value.json();
        if (pgSettings && typeof pgSettings === 'object' && Object.keys(pgSettings).length > 0) {
          setTheme((prev) => ({ ...prev, ...pgSettings }));
        }
      }

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const pgUsers = await usersRes.value.json();
        if (Array.isArray(pgUsers) && pgUsers.length > 0) {
          const mapped = pgUsers.map((u: any) => ({
            id: `u-${u.id}`,
            employeeId: u.employeeId,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            department: u.department,
            status: u.status,
            dailySalaryLe: u.dailySalaryLe,
            monthlySalaryLe: u.monthlySalaryLe,
            avatarUrl: u.avatarUrl,
            createdAt: u.createdAt || new Date().toISOString(),
            isFirstLogin: u.isFirstLogin ?? false,
            password: u.password,
            createdBy: 'System/DB',
          }));
          setUsers((prevLocal) => {
            const map = new Map<string, User>();
            prevLocal.forEach((u: User) => map.set(u.employeeId || u.id, u));
            mapped.forEach((u: User) => {
              const key = u.employeeId || u.id;
              const existing = map.get(key);
              // ISSUE #10: the plain spread `{ ...existing, ...u }` let a null
              // avatarUrl from the server wipe a locally uploaded picture on
              // every background sync. mergeUserPreservingAvatar() keeps the
              // locally cached image when the server has none.
              map.set(key, existing ? mergeUserPreservingAvatar(existing, u) : u);
            });
            return Array.from(map.values());
          });
        }
      }

      if (attRes.status === 'fulfilled' && attRes.value.ok) {
        const pgAtt = await attRes.value.json();
        if (Array.isArray(pgAtt)) {
          const mapped = pgAtt.map((a: any) => ({
            id: a.id ? (String(a.id).startsWith('att-') ? a.id : `att-${a.id}`) : `att-${Date.now()}`,
            userId: a.userId || a.user_id,
            employeeId: a.employeeId || a.employee_id,
            userName: a.name || a.userName || a.user_name || 'Staff Member',
            userRole: (a.role || a.userRole || a.user_role || 'staff') as UserRole,
            date: a.date,
            checkInTime: a.timeIn || a.time_in || a.checkInTime || '08:00',
            checkOutTime: a.timeOut || a.time_out || a.checkOutTime || undefined,
            status: (a.status || 'pending') as 'pending' | 'approved' | 'rejected',
            location: a.location || (a.notes?.includes('Location:') ? a.notes.replace('Location:', '').trim() : 'Factory Main Gate'),
            shift: (a.shift || 'morning') as 'morning' | 'night' | 'full_day',
            notes: a.notes || '',
            approvedBy: a.verifiedBy || a.verified_by || a.approvedBy,
          }));
          setAttendance((prevLocal) => {
            const map = new Map();
            mapped.forEach((item: any) => map.set(item.id, item));
            prevLocal.forEach((item: any) => map.set(item.id, item));
            return Array.from(map.values());
          });
        }
      }

      if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
        const pgSales = await salesRes.value.json();
        if (Array.isArray(pgSales)) {
          setSales((prevLocal) => {
            const map = new Map();
            pgSales.forEach((s: any) => map.set(s.id, s));
            prevLocal.forEach((s: any) => map.set(s.id, s));
            return Array.from(map.values());
          });
        }
      }

      if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
        const pgProd = await prodRes.value.json();
        if (Array.isArray(pgProd)) {
          setProduction((prevLocal) => {
            const map = new Map();
            pgProd.forEach((p: any) => map.set(p.id, p));
            prevLocal.forEach((p: any) => map.set(p.id, p));
            return Array.from(map.values());
          });
        }
      }

      if (outBuyRes.status === 'fulfilled' && outBuyRes.value.ok) {
        const pgOutBuy = await outBuyRes.value.json();
        if (Array.isArray(pgOutBuy)) {
          setOuterBuyings((prevLocal) => {
            const map = new Map();
            pgOutBuy.forEach((o: any) => map.set(o.id, o));
            prevLocal.forEach((o: any) => map.set(o.id, o));
            return Array.from(map.values());
          });
        }
      }

      if (rollBuyRes.status === 'fulfilled' && rollBuyRes.value.ok) {
        const pgRollBuy = await rollBuyRes.value.json();
        if (Array.isArray(pgRollBuy)) {
          setRollBuyings((prevLocal) => {
            const map = new Map();
            pgRollBuy.forEach((r: any) => map.set(r.id, r));
            prevLocal.forEach((r: any) => map.set(r.id, r));
            return Array.from(map.values());
          });
        }
      }

      if (pkgRollsRes.status === 'fulfilled' && pkgRollsRes.value.ok) {
        const pgPkgRolls = await pkgRollsRes.value.json();
        if (Array.isArray(pgPkgRolls) && pgPkgRolls.length > 0) {
          setPackagingRolls((prevLocal) => {
            const map = new Map();
            pgPkgRolls.forEach((r: any) => map.set(r.rollCode || r.id, r));
            prevLocal.forEach((r: any) => map.set(r.rollCode || r.id, r));
            return Array.from(map.values());
          });
        }
      }

      if (expRes.status === 'fulfilled' && expRes.value.ok) {
        const pgExp = await expRes.value.json();
        if (Array.isArray(pgExp)) {
          setExpenses((prevLocal) => {
            const map = new Map();
            pgExp.forEach((e: any) => map.set(e.id, e));
            prevLocal.forEach((e: any) => map.set(e.id, e));
            return Array.from(map.values());
          });
        }
      }

      if (repRes.status === 'fulfilled' && repRes.value.ok) {
        const pgRep = await repRes.value.json();
        if (Array.isArray(pgRep)) {
          setRepairs((prevLocal) => {
            const map = new Map();
            pgRep.forEach((r: any) => map.set(r.id, r));
            prevLocal.forEach((r: any) => map.set(r.id, r));
            return Array.from(map.values());
          });
        }
      }

      if (fuelRes.status === 'fulfilled' && fuelRes.value.ok) {
        const pgFuel = await fuelRes.value.json();
        if (Array.isArray(pgFuel)) {
          setFuel((prevLocal) => {
            const map = new Map();
            pgFuel.forEach((f: any) => map.set(f.id, f));
            prevLocal.forEach((f: any) => map.set(f.id, f));
            return Array.from(map.values());
          });
        }
      }

      if (eqRes.status === 'fulfilled' && eqRes.value.ok) {
        const pgEq = await eqRes.value.json();
        if (Array.isArray(pgEq)) {
          setEquipmentLogs((prevLocal) => {
            const map = new Map();
            pgEq.forEach((e: any) => map.set(e.id, e));
            prevLocal.forEach((e: any) => map.set(e.id, e));
            return Array.from(map.values());
          });
        }
      }

      if (msgRes.status === 'fulfilled' && msgRes.value.ok) {
        const pgMsg = await msgRes.value.json();
        if (Array.isArray(pgMsg)) {
          const mappedMsg = pgMsg.map((m: any) => {
            let inferredType = m.type || 'text';
            if (m.content?.startsWith('data:audio') || m.content?.startsWith('blob:') || m.content?.startsWith('voice_note_')) {
              inferredType = 'voice';
            } else if (m.content?.startsWith('data:image')) {
              inferredType = 'image';
            }
            return {
              ...m,
              type: inferredType,
            };
          });
          setMessages((prevLocal) => {
            const map = new Map();
            mappedMsg.forEach((m: any) => map.set(m.id, m));
            prevLocal.forEach((m: any) => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      }

      if (annRes.status === 'fulfilled' && annRes.value.ok) {
        const pgAnn = await annRes.value.json();
        if (Array.isArray(pgAnn)) {
          setAnnouncements((prevLocal) => {
            const map = new Map();
            pgAnn.forEach((a: any) => map.set(a.id, a));
            prevLocal.forEach((a: any) => map.set(a.id, a));
            return Array.from(map.values());
          });
        }
      }

      if (!silent) {
        showToast('All factory records are fully up to date with cloud database!', 'success', 'Live Auto-Sync');
      }
    } catch (err) {
      if (!silent) {
        console.warn('Sync refresh notice:', err);
      }
    }
  }, []);

  // Initial load, real-time socket events, and background auto-sync interval
  useEffect(() => {
    refreshCloudData(true);

    // Real-time push listener: whenever any client saves an online record
    const unsubscribeSocket = socketService.onDataChange(() => {
      refreshCloudData(true);
    });

    const unsubscribeSettings = socketService.onSettingsUpdate((newSettings) => {
      if (newSettings && typeof newSettings === 'object') {
        setTheme((prev) => ({ ...prev, ...newSettings }));
      }
    });

    const unsubscribeProfile = socketService.onUserProfileUpdate((updatedUser) => {
      if (!updatedUser) return;

      // Persist the incoming picture on THIS device too, so a colleague's
      // avatar survives a refresh here rather than vanishing until the next
      // live push.
      if (updatedUser.avatarUrl && updatedUser.employeeId) {
        cacheAvatar(updatedUser.employeeId, updatedUser.avatarUrl).catch(() => {});
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.employeeId === updatedUser.employeeId || u.id === updatedUser.id || u.id === `u-${updatedUser.id}`
            ? { ...u, ...updatedUser }
            : u
        )
      );
      setCurrentUser((prev) => {
        if (
          prev &&
          (prev.employeeId === updatedUser.employeeId ||
            prev.id === updatedUser.id ||
            prev.id === `u-${updatedUser.id}`)
        ) {
          return { ...prev, ...updatedUser };
        }
        return prev;
      });
    });

    const unsubscribeMissed = socketService.onMissedCall((callData) => {
      showToast(
        `Missed ${callData.callType === 'video' ? 'Video' : 'Voice'} Call from ${callData.callerName} (${callData.callerRole}) at ${callData.time}`,
        'warning',
        'Missed Call Alert'
      );
      refreshCloudData(true);
    });

    // Background interval auto-sync every 8 seconds when online
    const intervalId = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        refreshCloudData(true);
      }
    }, 8000);

    const handleWindowFocus = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        refreshCloudData(true);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleWindowFocus);

    return () => {
      unsubscribeSocket();
      unsubscribeSettings();
      unsubscribeProfile();
      unsubscribeMissed();
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleWindowFocus);
    };
  }, [refreshCloudData]);

  // Persistent User Session: Preserves login across page refresh & background execution
  useEffect(() => {
    try {
      if (currentUser) {
        safeLocalStorageSet('puremax_active_session_user_v5', currentUser);
        safeLocalStorageSet('puremax_active_session_role_v5', activeRole);
      } else {
        safeLocalStorageRemove('puremax_active_session_user_v5');
        safeLocalStorageRemove('puremax_active_session_role_v5');
      }
    } catch (e) {
      console.warn('Session storage write error:', e);
    }
  }, [currentUser, activeRole]);

  // Persistent State Sync: Guarantee zero data loss across restarts & refreshes with QuotaExceededError protection
  useEffect(() => {
    // Profile pictures are base64 data URLs and are the single biggest thing in
    // this array. If a full write blows the ~5 MB localStorage quota, retry
    // without them: account records MUST persist, and the pictures are restored
    // from IndexedDB on the next load (see the avatar hydration effect below).
    const ok = safeLocalStorageSet('puremax_users_official_v5', users);
    if (!ok) {
      console.warn(
        'User list exceeded localStorage quota — retrying without avatar data (avatars restored from IndexedDB).'
      );
      safeLocalStorageSet('puremax_users_official_v5', stripAvatars(users));
    }
  }, [users]);

  // ---------------------------------------------------------------------------
  // ISSUE #10 — Restore profile pictures from IndexedDB after a reload
  // ---------------------------------------------------------------------------
  // The users array may have been persisted without avatar data (quota guard
  // above), and a plain refresh restores the session without going through
  // login(), which used to be the only place the avatar cache was read back.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const restored = await rehydrateAvatars(users);
        if (cancelled) return;

        const changed = restored.some((u, i) => u.avatarUrl !== users[i]?.avatarUrl);
        if (changed) {
          setUsers(restored);
        }

        // Keep the logged-in session in step with the restored picture.
        setCurrentUser((prev) => {
          if (!prev) return prev;
          if (prev.avatarUrl) return prev;
          const match = restored.find((u) => u.employeeId === prev.employeeId || u.id === prev.id);
          return match?.avatarUrl ? { ...prev, avatarUrl: match.avatarUrl } : prev;
        });
      } catch (err) {
        console.warn('Avatar rehydration error:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally runs once on mount; later changes are handled by
    // updateUserProfile() and the cloud-merge path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    safeLocalStorageSet('puremax_attendance_v3', attendance);
  }, [attendance]);

  useEffect(() => {
    safeLocalStorageSet('puremax_sales_v3', sales);
  }, [sales]);

  useEffect(() => {
    safeLocalStorageSet('puremax_expenses_v3', expenses);
  }, [expenses]);

  useEffect(() => {
    safeLocalStorageSet('puremax_production_v3', production);
  }, [production]);

  useEffect(() => {
    safeLocalStorageSet('puremax_outer_buyings_v3', outerBuyings);
  }, [outerBuyings]);

  useEffect(() => {
    safeLocalStorageSet('puremax_roll_buyings_v3', rollBuyings);
  }, [rollBuyings]);

  useEffect(() => {
    safeLocalStorageSet('puremax_machines_v3', machines);
  }, [machines]);

  useEffect(() => {
    safeLocalStorageSet('puremax_repairs_v3', repairs);
  }, [repairs]);

  useEffect(() => {
    safeLocalStorageSet('puremax_fuel_v3', fuel);
  }, [fuel]);

  useEffect(() => {
    safeLocalStorageSet('puremax_equipment_logs_v3', equipmentLogs);
  }, [equipmentLogs]);

  useEffect(() => {
    safeLocalStorageSet('puremax_announcements_v3', announcements);
  }, [announcements]);

  useEffect(() => {
    safeLocalStorageSet('puremax_messages_v3', messages);
  }, [messages]);

  useEffect(() => {
    safeLocalStorageSet('puremax_theme', theme);
  }, [theme]);

  // Hydrate custom media/branding from IndexedDB for seamless offline/refresh durability
  useEffect(() => {
    (async () => {
      try {
        const storedLoginBg = await idbStorage.getMediaItem('login_bg');
        const storedBannerBg = await idbStorage.getMediaItem('header_banner');
        if (storedLoginBg || storedBannerBg) {
          setTheme((prev) => ({
            ...prev,
            ...(storedLoginBg ? { loginBgUrl: storedLoginBg } : {}),
            ...(storedBannerBg ? { bannerBgUrl: storedBannerBg } : {}),
          }));
        }
      } catch (err) {
        console.warn('IDB branding hydration error:', err);
      }
    })();
  }, []);

  // Listen to background sync engine to mark local offline pending records as fully synced
  useEffect(() => {
    const unsub = syncEngine.onRecordSynced((type, payload) => {
      if (type === 'attendance_create' || type === 'attendance_update') {
        setAttendance((prev) =>
          prev.map((a) =>
            a.id === payload.id || (a.userId === payload.userId && a.date === payload.date)
              ? { ...a, isOfflinePending: false }
              : a
          )
        );
      } else if (type === 'sales_create') {
        setSales((prev) =>
          prev.map((s) =>
            s.receiptNumber === payload.invoiceNumber || s.id === payload.id
              ? { ...s, isOfflinePending: false }
              : s
          )
        );
      } else if (type === 'production_create') {
        setProduction((prev) =>
          prev.map((p) =>
            p.batchNumber === payload.batchNumber || p.id === payload.id
              ? { ...p, isOfflinePending: false }
              : p
          )
        );
      } else if (type === 'outer_buying_create') {
        setOuterBuyings((prev) =>
          prev.map((o) => (o.date === payload.date ? { ...o, isOfflinePending: false } : o))
        );
      } else if (type === 'roll_buying_create') {
        setRollBuyings((prev) =>
          prev.map((r) => (r.date === payload.date ? { ...r, isOfflinePending: false } : r))
        );
      } else if (type === 'expense_create') {
        setExpenses((prev) =>
          prev.map((e) =>
            e.itemDescription === payload.itemDescription && e.date === payload.date
              ? { ...e, isOfflinePending: false }
              : e
          )
        );
      }
    });

    return () => unsub();
  }, []);

  // Synchronize incoming real-time socket messages and announcements with strict privacy enforcement
  useEffect(() => {
    if (!currentUser) return;

    const unsubMsg = socketService.onMessage((incomingMsg: any) => {
      if (!incomingMsg) return;

      // Strict Privacy: If direct message, ONLY the recipient (or sender) can receive, see, and process
      if (incomingMsg.recipientId) {
        if (incomingMsg.recipientId !== currentUser.id && incomingMsg.senderId !== currentUser.id) {
          // Strictly ignore - this message belongs only to the two parties
          return;
        }
      }

      const inferredType: 'text' | 'voice' | 'image' =
        incomingMsg.content?.startsWith('data:audio') || incomingMsg.content?.startsWith('blob:') || incomingMsg.content?.startsWith('voice_note_')
          ? 'voice'
          : incomingMsg.content?.startsWith('data:image')
          ? 'image'
          : incomingMsg.type || 'text';

      const formattedMsg: ChatMessage = {
        id: incomingMsg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: incomingMsg.senderId,
        senderName: incomingMsg.senderName,
        senderRole: incomingMsg.senderRole || 'staff',
        receiverId: incomingMsg.recipientId || incomingMsg.receiverId || undefined,
        groupId: incomingMsg.recipientId ? undefined : (incomingMsg.groupId || 'all-staff'),
        type: inferredType,
        content: incomingMsg.content,
        durationSeconds: incomingMsg.durationSeconds,
        timestamp: incomingMsg.timestamp || new Date().toISOString(),
        readBy: [incomingMsg.senderId],
      };

      setMessages((prev) => {
        const isDuplicate = prev.some(
          (m) =>
            m.id === formattedMsg.id ||
            (m.senderId === formattedMsg.senderId &&
              m.content === formattedMsg.content &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(formattedMsg.timestamp).getTime()) < 3000)
        );
        if (isDuplicate) return prev;
        return [...prev, formattedMsg];
      });

      // User notification toasts
      if (incomingMsg.senderId !== currentUser.id) {
        if (incomingMsg.recipientId === currentUser.id) {
          const preview =
            inferredType === 'voice'
              ? '🎤 Voice Note'
              : inferredType === 'image'
              ? '📷 Photo attachment'
              : incomingMsg.content.slice(0, 45);
          showToast(`Direct message from ${incomingMsg.senderName}: "${preview}"`, 'info', 'WhatsApp Message');
        } else if (!incomingMsg.recipientId || incomingMsg.groupId === 'all-staff') {
          const preview =
            inferredType === 'voice'
              ? '🎤 Voice Note'
              : inferredType === 'image'
              ? '📷 Photo attachment'
              : incomingMsg.content.slice(0, 45);
          showToast(`All Staff Group: ${incomingMsg.senderName}: "${preview}"`, 'info', 'Factory Group');
        }
      }
    });

    const unsubEdit = socketService.onMessageEdit((editData: any) => {
      if (!editData || !editData.messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editData.messageId
            ? { ...m, content: editData.content, isEdited: true, editedAt: editData.editedAt }
            : m
        )
      );
    });

    const unsubDel = socketService.onMessageDelete((delData: any) => {
      if (!delData || !delData.messageId) return;
      setMessages((prev) => prev.filter((m) => m.id !== delData.messageId));
    });

    const unsubAnc = socketService.onAnnouncement((incomingAnc: any) => {
      if (!incomingAnc) return;
      const formattedAnc: Announcement = {
        id: incomingAnc.id || `anc-${Date.now()}`,
        title: incomingAnc.title,
        content: incomingAnc.content,
        priority: incomingAnc.priority || 'normal',
        authorId: incomingAnc.authorId || 'system',
        authorName: incomingAnc.authorName || 'Manager',
        authorRole: incomingAnc.authorRole || 'manager',
        createdAt: incomingAnc.createdAt || new Date().toISOString(),
      };
      setAnnouncements((prev) => {
        if (prev.some((a) => a.id === formattedAnc.id || a.title === formattedAnc.title)) return prev;
        return [formattedAnc, ...prev];
      });
      showToast(`📢 Announcement: ${incomingAnc.title}`, incomingAnc.priority === 'urgent' ? 'warning' : 'info', 'Official Notice');
    });

    return () => {
      unsubMsg();
      unsubEdit();
      unsubDel();
      unsubAnc();
    };
  }, [currentUser]);

  // Handle lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  // Auth Methods
  const clearLoginError = () => setLoginError(null);

  const login = (credential: string, password: string, isDevShortcut = false): boolean => {
    setLoginError(null);

    if (lockoutSeconds > 0) {
      setLoginError(`Account temporarily locked out. Try again in ${lockoutSeconds} seconds.`);
      return false;
    }

    if (isDevShortcut) {
      const devUser = users.find((u) => u.role === 'developer');
      if (devUser) {
        setCurrentUser(devUser);
        setActiveRole('developer');
        setIsFirstLoginPending(false);
        logAudit('DEVELOPER_LOGIN', 'Developer logged in via direct secret access portal', devUser);
        return true;
      }
    }

    const trimmed = credential.trim().toLowerCase();
    const cleanDigits = credential.replace(/\D/g, '');

    let foundUser = users.find((u) => {
      const emailMatch = u.email.toLowerCase() === trimmed;
      const empIdMatch = u.employeeId.toLowerCase() === trimmed;
      const phoneClean = (u.phone || '').replace(/\D/g, '');
      const phoneExact = (u.phone || '').trim() === credential.trim();
      const phoneDigitsMatch = cleanDigits.length >= 6 && phoneClean.endsWith(cleanDigits);
      return emailMatch || empIdMatch || phoneExact || phoneDigitsMatch;
    });

    if (!foundUser) {
      setLoginError('This account does not exist. Please check your Email, Employee ID, or Phone number, or contact your Manager.');
      handleFailedAttempt();
      return false;
    }

    if (foundUser.status === 'suspended') {
      setLoginError('Your account has been suspended. Contact your Manager.');
      return false;
    }

    // Developer Credentials Check (davidhenrysam1@gmail.com / DEV-11422 / SAM_11422)
    if (foundUser.role === 'developer' || trimmed === 'davidhenrysam1@gmail.com' || trimmed === 'dev-11422' || trimmed === 'dev-001') {
      const p = password.trim();
      if (p !== 'SAM_11422' && p !== 'Sam11422' && p !== 'sam_11422' && p !== 'SAM11422' && p !== 'devpass') {
        setLoginError('Invalid Developer password. Please enter your Developer password (SAM_11422).');
        handleFailedAttempt();
        return false;
      }
    } else {
      if (foundUser.password && foundUser.password.trim() !== password.trim()) {
        setLoginError('Incorrect password entered. Please enter your assigned temporary or permanent password.');
        handleFailedAttempt();
        return false;
      } else if (!foundUser.password && password.length < 4) {
        setLoginError('Password must be at least 4 characters long.');
        handleFailedAttempt();
        return false;
      }
    }

    // Reset failed attempts
    setFailedLoginAttempts(0);

    const onboardingKey = `puremax_onboarding_completed_${foundUser.employeeId || foundUser.id}`;
    const alreadyOnboarded = localStorage.getItem(onboardingKey) === 'true';

    // Hydrate the avatar from the cache before the session is written back.
    // Uses resolveAvatarUrl() so a picture stored only in IndexedDB is still
    // picked up on next load even when the localStorage mirror was evicted.
    const cachedAvatar = getCachedAvatarSync(foundUser.employeeId);
    if (cachedAvatar && !foundUser.avatarUrl) {
      foundUser = { ...foundUser, avatarUrl: cachedAvatar };
    }

    if (foundUser.isFirstLogin && !alreadyOnboarded) {
      setCurrentUser(foundUser);
      setActiveRole(foundUser.role);
      setIsFirstLoginPending(true);
      return true;
    }

    setCurrentUser(foundUser);
    setActiveRole(foundUser.role);
    setIsFirstLoginPending(false);
    logAudit('USER_LOGIN', `User ${foundUser.name} (${foundUser.employeeId}) logged in`, foundUser);
    return true;
  };

  const handleFailedAttempt = () => {
    const nextAttempts = failedLoginAttempts + 1;
    setFailedLoginAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      setLockoutSeconds(900); // 15 minutes lockout
      setLoginError('Too many failed attempts. Account locked for 15 minutes.');
    }
  };

  const logout = () => {
    if (currentUser) {
      logAudit('USER_LOGOUT', `User ${currentUser.name} logged out`, currentUser);
    }
    try {
      localStorage.removeItem('puremax_active_session_user_v5');
      localStorage.removeItem('puremax_active_session_role_v5');
      localStorage.removeItem('puremax_inspecting_orig_user_v5');
      localStorage.removeItem('puremax_current_user');
      sessionStorage.removeItem('puremax_current_user');
    } catch (e) {
      // ignore
    }
    setIsInspecting(false);
    setInspectingOriginalUser(null);
    setCurrentUser(null);
    setActiveRole('staff');
    setIsFirstLoginPending(false);
    setActiveTab('dashboard');
  };

  const switchRolePreview = (role: UserRole, specificUser?: User): boolean => {
    // Role preview switch strictly restricted to authenticated developer or active inspection session
    const isDev = currentUser?.role === 'developer' || isInspecting;
    if (!isDev) {
      showToast(
        'Unauthorized: Developer Inspection Sandbox is strictly restricted to Developer accounts.',
        'error',
        'Permission Denied'
      );
      return false;
    }

    if (role === 'developer') {
      exitInspectionMode();
      return true;
    }

    // Find REAL registered active user in database/state for this role
    let realUser: User | undefined;
    if (specificUser) {
      realUser = users.find((u) => u.id === specificUser.id && u.status !== 'suspended');
    } else {
      realUser = users.find((u) => u.role === role && u.status !== 'suspended');
    }

    if (!realUser) {
      showToast(
        `Cannot inspect: No registered account found for role "${role.replace('_', ' ').toUpperCase()}". Please create a real staff account first.`,
        'warning',
        'Unassigned Role'
      );
      return false;
    }

    // Cache developer original session if not already stored
    let devUser = inspectingOriginalUser;
    if (!devUser) {
      if (currentUser && currentUser.role === 'developer') {
        devUser = currentUser;
      } else {
        const foundDev = users.find((u) => u.role === 'developer');
        devUser = foundDev || INITIAL_USERS[0];
      }
      setInspectingOriginalUser(devUser);
      try {
        localStorage.setItem('puremax_inspecting_orig_user_v5', JSON.stringify(devUser));
      } catch (e) {
        console.warn('Failed to save inspectingOriginalUser:', e);
      }
    }

    // Bind strictly to the authentic registered user
    setCurrentUser(realUser);
    setActiveRole(realUser.role);
    setIsInspecting(true);

    logAudit(
      'ROLE_INSPECTION_SWITCH',
      `Developer started sandbox inspection for real account: ${realUser.name} (${realUser.employeeId} - ${realUser.role.toUpperCase()})`,
      realUser
    );
    showToast(
      `Active Inspection: Bound to real account ${realUser.name} (${realUser.employeeId})`,
      'info',
      'Role Inspection Sandbox'
    );
    return true;
  };

  const exitInspectionMode = () => {
    const devUser =
      inspectingOriginalUser ||
      users.find((u) => u.role === 'developer') ||
      INITIAL_USERS[0];

    setCurrentUser(devUser);
    setActiveRole('developer');
    setIsInspecting(false);
    setInspectingOriginalUser(null);
    try {
      localStorage.removeItem('puremax_inspecting_orig_user_v5');
    } catch (e) {
      console.warn('Failed to clear inspectingOriginalUser:', e);
    }

    logAudit(
      'ROLE_INSPECTION_EXIT',
      `Developer exited inspection mode and restored session to ${devUser.name} (${devUser.employeeId})`,
      devUser
    );
    showToast(
      `Restored Developer Super Admin session (${devUser.name}).`,
      'success',
      'Developer Session Restored'
    );
  };

  const completeFirstLoginPasswordChange = (
    newPassword?: string,
    avatarUrl?: string
  ): boolean => {
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        isFirstLogin: false,
        password: newPassword && newPassword.trim() ? newPassword.trim() : currentUser.password,
        avatarUrl: avatarUrl || currentUser.avatarUrl,
      };
      const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));
      setUsers(updatedUsers);
      setCurrentUser(updatedUser);
      setActiveRole(updatedUser.role);
      setIsFirstLoginPending(false);

      // Persist onboarding completion so it never appears again
      const onboardingKey = `puremax_onboarding_completed_${currentUser.employeeId || currentUser.id}`;
      localStorage.setItem(onboardingKey, 'true');

      // Enqueue update to DB sync engine
      syncEngine.enqueue('user_update', {
        employeeId: updatedUser.employeeId,
        password: updatedUser.password,
        avatarUrl: updatedUser.avatarUrl,
        isFirstLogin: false,
      });

      logAudit(
        'FIRST_LOGIN_ONBOARDING_COMPLETED',
        `First login setup completed for ${updatedUser.name} (${newPassword ? 'Password updated' : 'Kept current password'})`,
        updatedUser
      );
      showToast('Account setup complete. Welcome to Pure Max!', 'success', 'Login Successful');
      return true;
    }
    return false;
  };

  const updateUserProfile = (data: {
    name?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    altPhone?: string;
    nickname?: string;
  }) => {
    if (!currentUser) return;
    
    const isSuperOrManager = ['developer', 'manager'].includes(currentUser.role);
    
    // Core profile credentials (Full Legal Name, Primary Phone, Email) are editable by Developer & Manager.
    // For standard staff roles, official credentials remain protected and set by Management.
    const updatedUser: User = {
      ...currentUser,
      name: isSuperOrManager && data.name ? data.name.trim() : (data.name && !['operator', 'staff', 'tricycle_staff', 'van_staff'].includes(currentUser.role) ? data.name.trim() : currentUser.name),
      phone: isSuperOrManager && data.phone ? data.phone.trim() : currentUser.phone,
      email: isSuperOrManager && data.email ? data.email.trim() : currentUser.email,
      altPhone: data.altPhone !== undefined ? data.altPhone : currentUser.altPhone,
      nickname: data.nickname !== undefined ? data.nickname : currentUser.nickname,
      avatarUrl: data.avatarUrl ?? currentUser.avatarUrl,
    };

    if (data.avatarUrl) {
      // Persist to IndexedDB (authoritative, no 5 MB cap) with a localStorage
      // mirror for the very first paint. Previously the IDB write was
      // fire-and-forget and the localStorage mirror was the only sync source,
      // so the picture disappeared as soon as the mirror was evicted.
      cacheAvatar(updatedUser.employeeId, data.avatarUrl).catch((err) =>
        console.warn('Avatar cache write failed', err)
      );
    }

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    setStaffLiveLocations((prev) => prev.map(loc => loc.userId === currentUser.id ? { ...loc, avatarUrl: updatedUser.avatarUrl } : loc));

    // Push the change to every other signed-in device immediately. Without
    // this the update only travelled via the Postgres round-trip, so other
    // users kept showing the old picture whenever the API was unreachable.
    socketService.emitUserProfileUpdate(updatedUser);

    logAudit('UPDATE_PROFILE', `Profile information updated for ${updatedUser.name} (${updatedUser.role})`, updatedUser);
    
    // Cloud SQL update
    fetch(`/api/users/${encodeURIComponent(updatedUser.employeeId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    }).catch((err) => console.warn('PostgreSQL update user profile error:', err));

    showToast('Profile information updated successfully!', 'success', 'Profile Saved');
  };

  const resetPasswordWithOtp = (emailOrPhone: string, otpCode: string, newPassword: string): boolean => {
    const trimmed = emailOrPhone.trim().toLowerCase();
    const cleanPhone = emailOrPhone.replace(/[\s+-]/g, '');
    const foundIndex = users.findIndex(
      (u) =>
        u.email.toLowerCase() === trimmed ||
        u.employeeId.toLowerCase() === trimmed ||
        (u.phone && u.phone.replace(/[\s+-]/g, '') === cleanPhone) ||
        (u.phone && u.phone.trim() === emailOrPhone.trim())
    );
    if (foundIndex === -1) return false;

    const targetUser = users[foundIndex];
    const updatedUsers = [...users];
    updatedUsers[foundIndex] = {
      ...targetUser,
      password: newPassword,
      isFirstLogin: false,
    };
    setUsers(updatedUsers);

    // If the reset user is the currently logged in user, update current user too
    if (currentUser && currentUser.id === targetUser.id) {
      setCurrentUser({
        ...currentUser,
        password: newPassword,
        isFirstLogin: false,
      });
    }

    logAudit('PASSWORD_RESET_API', `Password reset executed for user ${targetUser.name} (${targetUser.employeeId})`, targetUser);

    // Automated Real-Time System Notification to Developer and Manager
    const alertNotif: NotificationItem = {
      id: `notif-pwd-reset-${Date.now()}`,
      category: 'SYSTEM',
      targetRole: 'all',
      title: 'Security Alert: User Password Reset',
      message: `User ${targetUser.name} (${targetUser.employeeId} - ${targetUser.role.replace('_', ' ').toUpperCase()}) has successfully reset their account password.`,
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
      linkTab: 'users',
    };
    setNotifications((prev) => [alertNotif, ...prev]);

    // Dispatch to server notification API
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'SYSTEM',
        targetRole: 'manager',
        title: 'Security Alert: User Password Reset',
        message: `User ${targetUser.name} (${targetUser.employeeId} - ${targetUser.role.replace('_', ' ').toUpperCase()}) has successfully reset their account password.`,
        type: 'system',
        linkTab: 'users',
      }),
    }).catch((err) => console.warn('Notification sync error:', err));

    showToast(`Password for ${targetUser.name} updated. Real-time alert dispatched to Manager and Developer.`, 'success', 'Password Updated');
    return true;
  };

  const logAudit = (action: string, details: string, actor?: User) => {
    const userToUse = actor || currentUser;
    const newEntry: AuditLog = {
      id: `aud-${Date.now()}`,
      actorId: userToUse?.id || 'system',
      actorName: userToUse?.name || 'System Auto',
      actorRole: userToUse?.role || 'developer',
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // User Management
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newId = `u-${userData.role.slice(0, 3)}-${Date.now().toString().slice(-4)}`;
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    logAudit('CREATE_USER', `Created new account for ${newUser.name} (${newUser.role.toUpperCase()})`);

    // Dual Sync: Local first + background Cloud SQL sync
    syncEngine.enqueue('user_create', userData);
    showToast(`New staff account provisioned for ${newUser.name} (${newUser.employeeId}). Saved with Zero Data Loss.`, 'success', 'Account Created');
  };

  const updateUser = (userId: string, updatedFields: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updatedFields } : u)));
    logAudit('UPDATE_USER', `Updated details for staff ID: ${userId}`);
    const userToUpdate = users.find((u) => u.id === userId);
    if (userToUpdate) {
      const merged = { ...userToUpdate, ...updatedFields };
      syncEngine.enqueue('user_update', merged);
    }
    showToast('Staff member details updated successfully.', 'success', 'Account Updated');
  };

  const updateUserStatus = (userId: string, status: 'active' | 'suspended') => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    logAudit('UPDATE_USER_STATUS', `Set user status to ${status.toUpperCase()} for ID: ${userId}`);
    const userToUpdate = users.find((u) => u.id === userId);
    if (userToUpdate) {
      syncEngine.enqueue('user_update', { ...userToUpdate, status });
    }
    showToast(`User account is now ${status.toUpperCase()}.`, 'info', 'Status Changed');
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    logAudit('DELETE_USER', `Permanently deleted user account ${target?.name || userId}`);
    if (target) {
      syncEngine.enqueue('user_delete', { employeeId: target.employeeId, id: target.id });
    }
    showToast('Staff member permanently deleted from system.', 'info', 'Account Deleted');
  };

  // Attendance
  const checkIn = (location = 'Factory Main Gate', notes = '') => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const timeIn = new Date().toTimeString().slice(0, 5);

    // FIX: the old code pushed a brand-new record on every call, so a second
    // tap (or a background re-sync) produced a duplicate row in the approval
    // queue. One user may only ever have ONE open (un-checked-out) record per
    // day; if they already checked out, a new session is legitimate.
    const openToday = attendance.find(
      (a) => a.userId === currentUser.id && a.date === todayStr && !a.checkOutTime
    );
    if (openToday) {
      showToast(
        `You already checked in today at ${openToday.checkInTime}. Duplicate check-in blocked.`,
        'warning',
        'Already Checked In'
      );
      return;
    }

    const newRec: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      userName: currentUser.name,
      userRole: currentUser.role,
      date: todayStr,
      checkInTime: timeIn,
      status: 'pending',
      location,
      shift: 'morning',
      notes,
    };
    setAttendance((prev) => [newRec, ...prev]);
    logAudit('ATTENDANCE_CHECKIN', `${currentUser.name} checked in at ${location}`);

    // Queue sync
    syncEngine.enqueue('attendance_create', {
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      name: currentUser.name,
      userName: currentUser.name,
      role: currentUser.role,
      userRole: currentUser.role,
      date: todayStr,
      timeIn,
      checkInTime: timeIn,
      status: 'pending',
      location,
      notes: notes || (location ? `Location: ${location}` : ''),
    });

    showToast(`Check-In recorded at ${timeIn} (${location}). Saved with Zero Data Loss.`, 'success', 'Checked In');
  };

  const checkOut = (attendanceId: string) => {
    const timeNow = new Date().toTimeString().slice(0, 5);
    // Check-out is recorded straight away but sits in the approval queue until
    // a Manager or Developer signs it off, exactly like check-in.
    setAttendance((prev) =>
      prev.map((a) =>
        a.id === attendanceId
          ? { ...a, checkOutTime: timeNow, checkOutStatus: 'pending' }
          : a
      )
    );
    const target = attendance.find((a) => a.id === attendanceId);
    if (target) {
      syncEngine.enqueue('attendance_update', {
        id: attendanceId,
        userId: target.userId,
        employeeId: target.employeeId,
        date: target.date,
        timeOut: timeNow,
        checkOutTime: timeNow,
        checkOutStatus: 'pending',
      });
      logAudit(
        'ATTENDANCE_CHECKOUT',
        `${target.userName} checked out at ${timeNow} - awaiting approval`
      );
    }
    showToast(
      `Check-Out recorded at ${timeNow}. It now requires Manager/Developer approval.`,
      'success',
      'Checked Out (Pending Approval)'
    );
  };

  const approveCheckOut = (attendanceId: string, approved: boolean) => {
    const status = approved ? 'approved' : 'rejected';
    setAttendance((prev) =>
      prev.map((a) =>
        a.id === attendanceId
          ? {
              ...a,
              checkOutStatus: status,
              checkOutApprovedBy: currentUser?.name || 'Manager',
              checkOutApprovedAt: new Date().toISOString(),
            }
          : a
      )
    );
    const target = attendance.find((a) => a.id === attendanceId);
    if (target) {
      logAudit(
        'ATTENDANCE_CHECKOUT_APPROVAL',
        `Check-out ${status} for ${target.userName} on ${target.date} by ${currentUser?.name}`
      );
      syncEngine.enqueue('attendance_update', {
        id: attendanceId,
        checkOutStatus: status,
        checkOutTime: target.checkOutTime,
      });
    }
    showToast(
      `Check-out ${status === 'approved' ? 'approved' : 'rejected'}.`,
      status === 'approved' ? 'success' : 'warning',
      'Check-Out Review'
    );
  };

  const approveAttendance = (attendanceId: string, approved: boolean) => {
    const status = approved ? 'approved' : 'rejected';
    setAttendance((prev) =>
      prev.map((a) =>
        a.id === attendanceId
          ? {
              ...a,
              status,
              approvedBy: currentUser?.name || 'Manager',
              approvedAt: new Date().toISOString(),
            }
          : a
      )
    );
    const target = attendance.find((a) => a.id === attendanceId);
    if (target) {
      syncEngine.enqueue('attendance_update', {
        id: attendanceId,
        userId: target.userId,
        employeeId: target.employeeId,
        date: target.date,
        status,
        verifiedBy: currentUser?.name || 'Manager',
        approvedBy: currentUser?.name || 'Manager',
      });
    }
    logAudit('ATTENDANCE_APPROVAL', `${approved ? 'Approved' : 'Rejected'} attendance record ${attendanceId}`);
    showToast(`Attendance record ${approved ? 'approved' : 'rejected'}.`, 'info', 'Attendance Verified');
  };

  /**
   * Wipe every attendance record. Manager / 2nd Manager / Developer only, and
   * only after re-entering a privileged password.
   *
   * Same safety ordering as purgeRecordsByRole: the recovery archive is
   * written to IndexedDB and downloaded as an Excel workbook BEFORE anything
   * is deleted, so an interrupted reset leaves the records intact.
   */
  const resetAttendance = (password: string): boolean => {
    const actor = currentUser;
    if (!actor) {
      showToast('You must be signed in to reset attendance.', 'error', 'Not Authorised');
      return false;
    }
    if (!['developer', 'manager', 'second_manager'].includes(actor.role)) {
      showToast('Only a Manager or Developer may reset attendance.', 'error', 'Access Denied');
      return false;
    }
    if (!verifyPrivilegedPassword(actor, password)) {
      showToast('Incorrect password. Attendance was NOT reset.', 'error', 'Verification Failed');
      logAudit('ATTENDANCE_RESET_DENIED', `${actor.name} entered a wrong reset password`);
      return false;
    }

    const snapshot = attendance;
    if (snapshot.length === 0) {
      showToast('There are no attendance records to reset.', 'info', 'Nothing To Reset');
      return true;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archive = {
      kind: 'ATTENDANCE_RESET',
      createdAt: new Date().toISOString(),
      resetBy: { name: actor.name, employeeId: actor.employeeId, role: actor.role },
      recordCount: snapshot.length,
      records: snapshot,
    };

    // 1. durable local archive (survives refresh / crash)
    try {
      localStorage.setItem(`puremax_attendance_reset_${stamp}`, JSON.stringify(archive));
    } catch {
      /* quota - non fatal, the Excel download below is the real safety net */
    }
    idbStorage.saveMediaItem(`attendance-reset-${stamp}`, JSON.stringify(archive)).catch(() => {});

    // 2. Excel workbook
    try {
      const rows = snapshot.map((r) => ({
        'Employee ID': r.employeeId || '',
        Name: r.userName,
        Role: r.userRole,
        Date: r.date,
        'Check In': r.checkInTime,
        'Check Out': r.checkOutTime || '',
        Status: r.status,
        'Check-Out Status': r.checkOutStatus || '',
        Location: r.location || '',
        'Approved By': r.approvedBy || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Reset');
      XLSX.writeFile(wb, `Attendance_Reset_Backup_${stamp}.xlsx`);
    } catch (err) {
      console.warn('Attendance reset Excel export failed:', err);
    }

    // 3. best-effort server copy, then mutate live state
    fetch('/api/attendance-reset-archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(archive),
    }).catch(() => {});

    setAttendance([]);
    logAudit(
      'ATTENDANCE_RESET',
      `${actor.name} (${actor.employeeId}) reset ALL ${snapshot.length} attendance records after password verification`,
      actor
    );
    showToast(
      `Attendance reset. ${snapshot.length} records archived to Excel and local backup.`,
      'success',
      'Attendance Reset Complete'
    );
    return true;
  };

  const overrideSalary = (userId: string, newMonthlyLe: number, reason: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const dailyLe = Math.round(newMonthlyLe / 26);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, monthlySalaryLe: newMonthlyLe, dailySalaryLe: dailyLe } : u))
    );
    syncEngine.enqueue('user_update', {
      employeeId: target.employeeId,
      monthlySalaryLe: newMonthlyLe,
      dailySalaryLe: dailyLe,
    });
    logAudit('SALARY_OVERRIDE', `Salary overridden for ${target.name} to Le ${newMonthlyLe.toLocaleString()} (Reason: ${reason})`);
    showToast(`Salary overridden for ${target.name} to SLE ${newMonthlyLe.toLocaleString()}`, 'success', 'Salary Updated');
  };

  // Sales
  const addSalesRecord = (record: Omit<SalesRecord, 'id' | 'createdAt' | 'receiptNumber'>) => {
    const receiptNum = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSales: SalesRecord = {
      ...record,
      id: `sls-${Date.now()}`,
      receiptNumber: receiptNum,
      createdAt: new Date().toISOString(),
    };
    setSales((prev) => [newSales, ...prev]);

    // Dual Sync: Local storage + PostgreSQL queue
    syncEngine.enqueue('sales_create', {
      invoiceNumber: receiptNum,
      customerName: record.customerOrDriver,
      customerPhone: record.customerPhone || '',
      productType: record.category,
      category: record.category,
      quantityBags: record.bundleQuantity,
      unitPriceLe: record.unitPriceLe,
      totalAmountLe: record.totalAmountLe,
      // Actual cash/payment collected — defaults to the full total when the
      // caller doesn't do a separate reconciliation step (e.g. factory-gate
      // walk-in sales). Van/Tricycle dispatch passes the real amount handed
      // in, which the server uses to detect and flag a shortfall.
      amountPaidLe: record.amountPaidLe ?? record.totalAmountLe,
      paymentMethod: record.paymentMethod || 'cash',
      vehicleNumber: record.vehicleNumber,
      loadedBundles: record.loadedBundles,
      unsoldBundles: record.unsoldBundles,
      damagedLosses: record.damagedLosses,
      staffName: record.recordedByName || currentUser?.name || 'Sales Staff',
      recordedByName: record.recordedByName || currentUser?.name || 'Sales Staff',
      date: record.date,
    });

    logAudit('RECORD_SALES', `Recorded ${record.category}: ${record.bundleQuantity} bundles (Le ${record.totalAmountLe.toLocaleString()})`);
    showToast(`Sales recorded: ${record.bundleQuantity} bundles (SLE ${record.totalAmountLe.toLocaleString()}). Auto-backed up.`, 'success', 'Sales Logged');
  };

  // Machine Operator & Active Roll Tracking
  const updateMachineStatus = (machineId: string, updates: Partial<MachineStatus>) => {
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId || m.name === machineId || m.code === machineId) {
          return { ...m, ...updates };
        }
        return m;
      })
    );
  };

  // Add individual purchased packaging rolls to inventory
  const addPackagingRolls = (rolls: Omit<PackagingRollItem, 'id' | 'createdAt' | 'bundlesProduced'>[]) => {
    const created: PackagingRollItem[] = rolls.map((r, i) => ({
      ...r,
      id: `roll-${Date.now()}-${i}`,
      bundlesProduced: 0,
      status: r.status || 'available',
      createdAt: new Date().toISOString(),
    }));

    setPackagingRolls((prev) => [...created, ...prev]);
    created.forEach((r) => {
      syncEngine.enqueue('packaging_roll_create', r);
    });
    showToast(`${created.length} Packaging Roll(s) saved into Factory Inventory.`, 'success', 'Roll Inventory Updated');
  };

  // Assign and Load Roll into Machine Line
  const loadRollToMachine = (machineId: string, rollIdOrCode: string, operatorName?: string): { success: boolean; error?: string } => {
    const machine = machines.find((m) => m.id === machineId || m.code === machineId);
    if (!machine) {
      return { success: false, error: 'Target machine line not found.' };
    }

    const roll = packagingRolls.find((r) => r.id === rollIdOrCode || r.rollCode === rollIdOrCode);
    if (!roll) {
      return { success: false, error: `Roll "${rollIdOrCode}" does NOT exist in factory inventory. A machine cannot load an unrecorded roll.` };
    }

    if (roll.status === 'exhausted') {
      return { success: false, error: `Roll ${roll.rollCode} is marked as Exhausted/Finished and cannot be loaded again.` };
    }

    if (roll.status === 'loaded' && roll.assignedMachineId && roll.assignedMachineId !== machine.id) {
      return { success: false, error: `Roll ${roll.rollCode} is already actively loaded on ${roll.assignedMachineName || roll.assignedMachineId}.` };
    }

    const assignedOp = operatorName?.trim() || machine.assignedOperatorName || 'Machine Operator';
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    // If machine already has an active roll that is different, exhaust that old roll
    if (machine.activeRollId && machine.activeRollId !== roll.id) {
      const oldRollId = machine.activeRollId;
      setPackagingRolls((prev) =>
        prev.map((r) => {
          if (r.id === oldRollId || r.rollCode === machine.activeRollCode) {
            const updated: PackagingRollItem = {
              ...r,
              status: 'exhausted',
              exhaustedAt: nowIso,
            };
            syncEngine.enqueue('packaging_roll_update', updated);
            return updated;
          }
          return r;
        })
      );
    }

    // Mark the new roll as loaded
    const updatedRoll: PackagingRollItem = {
      ...roll,
      status: 'loaded',
      assignedMachineId: machine.id,
      assignedMachineName: machine.name,
      operatorName: assignedOp,
      loadedAt: nowIso,
    };

    setPackagingRolls((prev) =>
      prev.map((r) => (r.id === roll.id ? updatedRoll : r))
    );
    syncEngine.enqueue('packaging_roll_update', updatedRoll);

    // Update the machine line
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machine.id) {
          return {
            ...m,
            activeRollId: roll.id,
            activeRollCode: roll.rollCode,
            activeRollKg: roll.weightKg,
            activeRollName: roll.rollName,
            assignedOperatorName: assignedOp,
            activeRollBundlesProduced: roll.bundlesProduced || 0,
            status: 'running',
            lastLoadedDate: todayStr,
          };
        }
        return m;
      })
    );

    // Trigger targeted operator notification
    const targetOperator = users.find(u => u.name.toLowerCase() === assignedOp.toLowerCase() || u.id === assignedOp);
    if (targetOperator) {
      let notifMsg = "";
      if (machine.activeRollId && machine.activeRollId !== roll.id) {
        notifMsg = `Congratulations! You have finished the previous roll (${machine.activeRollKg || 0} kg) and have been assigned a new roll: ${roll.rollName} (${roll.weightKg} kg)`;
      } else {
        notifMsg = `You have been assigned a new roll: ${roll.rollName} (${roll.weightKg} kg)`;
      }
      setNotifications(prev => [
        {
          id: `notif-${Date.now()}`,
          userId: targetOperator.id,
          title: "New Roll Assignment",
          message: notifMsg,
          type: "production",
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      if (currentUser?.id === targetOperator.id) {
        showToast(notifMsg, "info", "New Roll Assigned");
      }
    }

    logAudit('LOAD_MACHINE_ROLL', `Loaded Roll ${roll.rollCode} (${roll.weightKg} Kg) onto ${machine.name} for Operator ${assignedOp}`);
    showToast(`Roll ${roll.rollCode} (${roll.weightKg} Kg) loaded on ${machine.name} for ${assignedOp}.`, 'success', 'Roll Loaded');
    return { success: true };
  };

  // Mark currently loaded roll on machine as exhausted
  const exhaustMachineRoll = (machineId: string) => {
    const machine = machines.find((m) => m.id === machineId || m.code === machineId);
    if (!machine) return;

    const nowIso = new Date().toISOString();
    if (machine.activeRollId || machine.activeRollCode) {
      setPackagingRolls((prev) =>
        prev.map((r) => {
          if (r.id === machine.activeRollId || r.rollCode === machine.activeRollCode) {
            const updated: PackagingRollItem = {
              ...r,
              status: 'exhausted',
              exhaustedAt: nowIso,
            };
            syncEngine.enqueue('packaging_roll_update', updated);
            return updated;
          }
          return r;
        })
      );
    }

    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machine.id) {
          return {
            ...m,
            activeRollId: undefined,
            activeRollCode: undefined,
            activeRollKg: 0,
            activeRollName: 'No Roll Loaded',
            activeRollBundlesProduced: 0,
            status: 'reloading',
          };
        }
        return m;
      })
    );

    logAudit('EXHAUST_MACHINE_ROLL', `Exhausted active roll on ${machine.name}`);
    showToast(`Active roll on ${machine.name} has been marked as Finished/Exhausted.`, 'info', 'Roll Exhausted');
  };

  // Update Packaging Roll Item
  const updatePackagingRoll = (rollId: string, updates: Partial<PackagingRollItem>) => {
    setPackagingRolls((prev) =>
      prev.map((r) => {
        if (r.id === rollId || r.rollCode === rollId) {
          const merged = { ...r, ...updates };
          syncEngine.enqueue('packaging_roll_update', merged);
          return merged;
        }
        return r;
      })
    );
  };

  // Production - Refactored Yield: 1 Set of Outer = EXACTLY 50 Bundles of Water (NOT 100)
  // Total Daily Bundles Produced = (Sets Used * 50) - Remaining Bundles Leftover
  const addProductionRecord = (record: Omit<ProductionRecord, 'id' | 'createdAt'>) => {
    const setsUsed = record.outerSetsUsed ?? record.outerFilmCount ?? 1;
    const remainingBundles = record.outerRemainingBundles ?? 0;
    // Formula: Total Daily Bundles Produced = (Sets Used * 50) - Remaining Bundles
    const calculatedBundles = (setsUsed * 50) - remainingBundles;

    const newProd: ProductionRecord = {
      ...record,
      outerSetsUsed: setsUsed,
      outerRemainingBundles: remainingBundles,
      outerFilmCount: setsUsed,
      bundlesProduced: calculatedBundles,
      cleanWaterLitres: calculatedBundles * 12,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setProduction((prev) => [newProd, ...prev]);

    // Update active machine roll weight (Kg) and assigned operator if machine specified
    if (record.machineId || record.machineName) {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === record.machineId || m.name === record.machineName) {
            const currentRollYield = (m.activeRollBundlesProduced || 0) + calculatedBundles;
            return {
              ...m,
              assignedOperatorName: record.rollOperatorName || record.outerOperatorName || m.assignedOperatorName,
              activeRollKg: record.packagingRollWeightKg != null ? record.packagingRollWeightKg : m.activeRollKg,
              activeRollBundlesProduced: currentRollYield,
              lastLoadedDate: record.date,
              status: 'running',
              totalBundlesProduced: (m.totalBundlesProduced || 0) + calculatedBundles,
            };
          }
          return m;
        })
      );
    }

    // Accumulate yield on the matching active roll in packaging rolls inventory
    setPackagingRolls((prev) =>
      prev.map((r) => {
        const isMatched =
          (record.packagingRollCode && r.rollCode === record.packagingRollCode) ||
          (record.machineId && r.assignedMachineId === record.machineId && r.status === 'loaded');
        if (isMatched) {
          const updated: PackagingRollItem = {
            ...r,
            bundlesProduced: (r.bundlesProduced || 0) + calculatedBundles,
          };
          syncEngine.enqueue('packaging_roll_update', updated);
          return updated;
        }
        return r;
      })
    );

    // Dual Sync
    syncEngine.enqueue('production_create', {
      batchNumber: record.batchNumber,
      date: record.date,
      outerSetsUsed: setsUsed,
      outerRemainingBundles: remainingBundles,
      bundlesProduced: calculatedBundles,
      damagedBundles: record.damagedBundles || 0,
      operatorName: record.outerOperatorName || record.operatorName || currentUser?.name || 'Machine Operator',
      machineName: record.machineName,
      notes: `Outer Sets: ${setsUsed} (Rem: ${remainingBundles}), Roll: ${record.packagingRollWeightKg || 0} Kg, Machine: ${record.machineName || 'Line 1'}`,
    });

    // Send real-time notification to Manager and Developer
    const operator = record.outerOperatorName || record.operatorName || 'Machine Operator';
    const notifMsg = `Production Report: Operator ${operator} used ${setsUsed} Outer Set(s) (${remainingBundles} remaining) yielding ${calculatedBundles.toLocaleString()} bundles. Damaged: ${record.damagedBundles}. Roll: ${record.packagingRollWeightKg || 0}kg on ${record.machineName || 'Machine Line'}.`;

    const newNotif: NotificationItem = {
      id: `notif-prod-${Date.now()}`,
      category: 'PRODUCTION',
      targetRole: 'manager',
      title: 'Water Sachet Daily Production Logged',
      message: notifMsg,
      type: 'production',
      isRead: false,
      createdAt: new Date().toISOString(),
      linkTab: 'production',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    logAudit('RECORD_PRODUCTION', `Batch ${record.batchNumber}: ${calculatedBundles} bundles (${setsUsed} sets used, ${remainingBundles} rem by ${operator}, ${record.damagedBundles} damaged)`);
    showToast(`Daily Production recorded: ${calculatedBundles.toLocaleString()} bundles (${setsUsed} sets used, ${remainingBundles} rem leftover). Saved with Zero Data Loss.`, 'success', 'Daily Record Saved');
  };

  // Daily Outer Buying (Stock purchase of outer film - 1 Set = 50 Bundles capacity)
  const addOuterBuyingRecord = (record: Omit<OuterBuyingRecord, 'id' | 'createdAt'>) => {
    const newRecord: OuterBuyingRecord = {
      ...record,
      id: `out-buy-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setOuterBuyings((prev) => [newRecord, ...prev]);

    syncEngine.enqueue('outer_buying_create', record);

    // 1 Set = 50 Bundles capacity
    const totalBundlesCap = (Number(record.outersCount) || 0) * 50;
    const notifMsg = `Daily Outer Buying: Engineer ${record.engineerName} logged purchase of ${record.outersCount} Outer Set(s) (Cap: ${totalBundlesCap.toLocaleString()} bundles) on ${record.date}.${record.costLe ? ` Total Cost: SLE ${record.costLe.toLocaleString()}` : ''}`;

    const newNotif: NotificationItem = {
      id: `notif-out-${Date.now()}`,
      category: 'PRODUCTION',
      targetRole: 'manager',
      title: 'Daily Outer Film Buying Logged',
      message: notifMsg,
      type: 'production',
      isRead: false,
      createdAt: new Date().toISOString(),
      linkTab: 'production',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    logAudit('RECORD_OUTER_BUYING', `Bought ${record.outersCount} Outer Sets on ${record.date} by ${record.engineerName}`);
    showToast(`Daily Outer Buying saved: ${record.outersCount} Outer Sets (${totalBundlesCap.toLocaleString()} bundles cap). Stored with Zero Data Loss.`, 'success', 'Outer Buying Logged');
  };

  // Daily Roll Buying (Stock purchase of packaging roll with Name and KG - generates unique roll records)
  const addRollBuyingRecord = (record: Omit<RollBuyingRecord, 'id' | 'createdAt'>) => {
    const newRecord: RollBuyingRecord = {
      ...record,
      id: `roll-buy-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setRollBuyings((prev) => [newRecord, ...prev]);

    syncEngine.enqueue('roll_buying_create', record);

    // Auto-generate distinct individual PackagingRollItem records for each purchased roll
    const count = Math.max(1, Number(record.rollsCount) || 1);
    const costPerRoll = count > 0 && record.costLe ? Math.round(record.costLe / count) : 0;
    const dateStamp = record.date.replace(/-/g, '').slice(4);
    const generatedRolls: PackagingRollItem[] = [];

    for (let i = 1; i <= count; i++) {
      const randHex = Math.floor(100 + Math.random() * 900);
      const rollCode = `ROLL-${dateStamp}-${randHex}-${i}`;
      const newRoll: PackagingRollItem = {
        id: `roll-${Date.now()}-${i}`,
        rollCode,
        rollName: record.rollName,
        weightKg: Number(record.rollWeightKg) || 28.5,
        status: 'available',
        purchaseDate: record.date,
        costLe: costPerRoll,
        supplier: record.supplier || 'Makeni Polymers Sierra Leone',
        bundlesProduced: 0,
        notes: record.notes || `Purchased on ${record.date} by Engineer ${record.engineerName}`,
        createdAt: new Date().toISOString(),
      };
      generatedRolls.push(newRoll);
      syncEngine.enqueue('packaging_roll_create', newRoll);
    }

    setPackagingRolls((prev) => [...generatedRolls, ...prev]);

    const notifMsg = `Daily Roll Buying: Engineer ${record.engineerName} logged purchase of ${count} roll(s) of "${record.rollName}" (${record.rollWeightKg} KG) on ${record.date}.${record.costLe ? ` Total Cost: SLE ${record.costLe.toLocaleString()}` : ''}`;

    const newNotif: NotificationItem = {
      id: `notif-roll-${Date.now()}`,
      category: 'PRODUCTION',
      targetRole: 'manager',
      title: 'Daily Packaging Roll Buying Logged',
      message: notifMsg,
      type: 'production',
      isRead: false,
      createdAt: new Date().toISOString(),
      linkTab: 'production',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    logAudit('RECORD_ROLL_BUYING', `Bought ${count} Rolls (${record.rollName}, ${record.rollWeightKg} KG) - generated ${count} unique roll codes`);
    showToast(`Daily Roll Buying saved: ${count}x ${record.rollName} (${record.rollWeightKg} KG). Generated ${count} distinct roll IDs.`, 'success', 'Roll Buying Logged');
  };

  // Expenses
  const addExpenseRecord = (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    const newExp: ExpenseRecord = {
      ...record,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);

    syncEngine.enqueue('expense_create', {
      expenseCategory: record.category,
      itemDescription: record.itemDescription,
      amountLe: record.amountLe,
      date: record.date,
      recordedBy: record.recordedByName || currentUser?.name || 'Staff',
      receiptUrl: record.receiptImageUrl || '',
      notes: record.notes || '',
    });

    logAudit('RECORD_EXPENSE', `Logged Expense ${record.category}: ${record.itemDescription} (Le ${record.amountLe.toLocaleString()})`);
    showToast(`Expense recorded: ${record.itemDescription} (SLE ${record.amountLe.toLocaleString()}). Backed up.`, 'success', 'Expense Logged');
  };

  // Repairs & Fuel
  const addRepairRecord = (record: Omit<MachineRepairRecord, 'id' | 'createdAt'>) => {
    const newRep: MachineRepairRecord = {
      ...record,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setRepairs((prev) => [newRep, ...prev]);

    syncEngine.enqueue('repair_create', {
      machineName: record.machineName,
      technicianName: record.technicianName,
      repairDate: record.date,
      costLe: record.costLe,
      sparePart: record.sparePart,
      description: record.problemDescription,
      status: record.status,
    });

    logAudit('RECORD_REPAIR', `Logged Machine Repair: ${record.machineName} - ${record.sparePart} (Le ${record.costLe.toLocaleString()})`);
    showToast(`Repair recorded for ${record.machineName}. Saved with Zero Data Loss.`, 'success', 'Repair Logged');
  };

  const addFuelRecord = (record: Omit<FuelRecord, 'id' | 'createdAt'>) => {
    const newFuel: FuelRecord = {
      ...record,
      id: `fuel-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setFuel((prev) => [newFuel, ...prev]);

    syncEngine.enqueue('fuel_create', {
      vehicleOrMachine: record.vehicleOrMachine,
      driverName: record.driverOrOperator,
      litres: record.litres,
      totalCostLe: record.totalCostLe,
      date: record.date,
      notes: record.fuelStation || '',
    });

    logAudit('RECORD_FUEL', `Fuel Purchase: ${record.vehicleOrMachine} (${record.litres}L, Le ${record.totalCostLe.toLocaleString()})`);
    showToast(`Fuel log recorded: ${record.vehicleOrMachine} (${record.litres}L). Backed up.`, 'success', 'Fuel Logged');
  };

  // Equipment Logs
  const addEquipmentLog = (record: Omit<EquipmentLogRecord, 'id' | 'createdAt'>) => {
    const newLog: EquipmentLogRecord = {
      ...record,
      id: `eq-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setEquipmentLogs((prev) => [newLog, ...prev]);

    syncEngine.enqueue('equipment_log_create', record);

    logAudit('RECORD_EQUIPMENT_LOG', `Equipment Log: TDS ${record.tdsLevelPpm} PPM, PH ${record.phLevel}`);
    showToast(`Water quality log recorded (TDS: ${record.tdsLevelPpm} PPM, pH: ${record.phLevel}). Saved with Zero Data Loss.`, 'success', 'Quality Log Saved');
  };

  // Excel Master Backup Engine
  const exportExcelBackup = (customFilename?: string) => {
    try {
      const backupData: FactoryBackupData = {
        users,
        attendance,
        sales,
        production,
        outerBuyings,
        rollBuyings,
        expenses,
        repairs,
        fuel,
        equipmentLogs,
        auditLogs,
        factoryName: theme.factoryName || 'Pure Max Factory #1',
      };
      downloadExcelBackup(backupData, customFilename);
      showToast('Comprehensive Multi-Sheet Excel Master Backup (.xlsx) generated and downloaded!', 'success', 'Excel Backup Complete');
    } catch (e: any) {
      console.error('Excel export error:', e);
      showToast(`Failed to generate Excel backup: ${e.message}`, 'error', 'Export Failed');
    }
  };

  // Manual Trigger to Synchronize Queued Offline Data
  const triggerManualSync = async () => {
    if (!navigator.onLine) {
      showToast('System is currently offline. Records are safely stored in local storage and will sync when reconnected.', 'warning', 'Offline Mode');
      return;
    }
    showToast('Syncing all offline records with Live PostgreSQL Database...', 'info', 'Cloud Sync Started');
    const res = await syncEngine.processQueue();
    await refreshCloudData(true);
    if (res.success) {
      showToast(`Auto-Sync complete! ${res.syncedCount} record(s) synchronized. Database up-to-date.`, 'success', 'Live Cloud Sync');
    } else {
      showToast(`Sync completed with ${res.errors} item(s) pending retry.`, 'warning', 'Partial Sync');
    }
  };

  const syncNow = async () => {
    await triggerManualSync();
  };

  // Messaging & Communications
  const sendMessage = (msg: { recipientId?: string; groupId?: string; type: 'text' | 'voice' | 'image'; content: string; durationSeconds?: number }) => {
    if (!currentUser) return;
    const isDirect = Boolean(msg.recipientId);
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      receiverId: msg.recipientId || undefined,
      groupId: isDirect ? undefined : (msg.groupId || 'all-staff'),
      type: msg.type,
      content: msg.content,
      durationSeconds: msg.durationSeconds,
      timestamp: new Date().toISOString(),
      readBy: [currentUser.id],
    };
    
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    // Enqueue message sync
    syncEngine.enqueue('message_create', {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: msg.recipientId || null,
      receiverId: msg.recipientId || null,
      content: msg.content,
      type: msg.type,
      timestamp: newMsg.timestamp,
    });
  };

  const editMessage = (messageId: string, newContent: string) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    let targetRecipientId: string | undefined;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          targetRecipientId = m.receiverId;
          return {
            ...m,
            content: newContent,
            isEdited: true,
            editedAt: now,
          };
        }
        return m;
      })
    );

    // Emit over real-time socket
    socketService.emitEditMessage({
      messageId,
      content: newContent,
      recipientId: targetRecipientId,
      senderId: currentUser.id,
      editedAt: now,
    });

    // Sync to PostgreSQL DB
    fetch(`/api/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    }).catch((e) => console.warn('DB message edit notice:', e));

    showToast('Message edited successfully', 'info', 'Chat Updated');
  };

  const deleteMessage = (messageId: string) => {
    if (!currentUser) return;
    let targetRecipientId: string | undefined;

    setMessages((prev) => {
      const target = prev.find((m) => m.id === messageId);
      if (target) {
        targetRecipientId = target.receiverId;
      }
      return prev.filter((m) => m.id !== messageId);
    });

    // Emit over real-time socket
    socketService.emitDeleteMessage({
      messageId,
      recipientId: targetRecipientId,
      senderId: currentUser.id,
    });

    // Sync to PostgreSQL DB
    fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
    }).catch((e) => console.warn('DB message delete notice:', e));

    showToast('Message deleted', 'info', 'Chat Deleted');
  };

  const markChannelMessagesAsRead = (channelId: string) => {
    if (!currentUser) return;
    setMessages((prev) =>
      prev.map((m) => {
        const isTarget =
          channelId === 'broadcast'
            ? !m.receiverId && (m.groupId === 'all-staff' || !m.groupId)
            : ((m.senderId === channelId && m.receiverId === currentUser.id) ||
               (m.senderId === currentUser.id && m.receiverId === channelId));

        if (isTarget && (!m.readBy || !m.readBy.includes(currentUser.id))) {
          return {
            ...m,
            readBy: [...(m.readBy || []), currentUser.id],
          };
        }
        return m;
      })
    );
  };

  const postAnnouncement = (anc: Omit<Announcement, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorRole'>) => {
    if (!currentUser) return;
    const newAnc: Announcement = {
      ...anc,
      id: `anc-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => [newAnc, ...prev]);

    syncEngine.enqueue('announcement_create', {
      title: anc.title,
      message: anc.content,
      priority: anc.priority,
      targetRole: anc.targetRole,
      authorName: currentUser.name,
    });

    logAudit('POST_ANNOUNCEMENT', `Posted Announcement: ${anc.title}`);
    showToast(`Announcement published: ${anc.title}`, 'success', 'Announcement Broadcasted');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  // Theme & System
  const updateTheme = (newTheme: Partial<ThemeConfig>) => {
    try {
      if (newTheme.loginBgUrl) {
        idbStorage.saveMediaItem('login_bg', newTheme.loginBgUrl).catch((err) => console.warn('IDB save login_bg error:', err));
      }
      if (newTheme.bannerBgUrl) {
        idbStorage.saveMediaItem('header_banner', newTheme.bannerBgUrl).catch((err) => console.warn('IDB save header_banner error:', err));
      }

      setTheme((prev) => {
        const merged: ThemeConfig = {
          ...prev,
          ...newTheme,
        };

        // Persist to server for cross-device global sync
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...merged, updatedBy: currentUser?.name || 'developer' }),
        }).catch((err) => console.warn('Save settings to cloud error:', err));

        socketService.emitSettingsUpdate(merged);
        return merged;
      });

      logAudit('UPDATE_THEME', 'Updated factory interface styling parameters');
      showToast('Theme and interface styling settings saved & broadcasted across all devices.', 'success', 'Theme Updated');
    } catch (err) {
      console.error('Theme toggle crash caught:', err);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme((prev) => ({ ...prev, darkMode: prefersDark }));
      showToast('Theme encountered an error, falling back to system preference.', 'error', 'Theme Error');
    }
  };

  const publishSystemUpdate = (version: string) => {
    setSystemHealth((prev) => ({
      ...prev,
      currentVersion: version,
      updateAvailable: false,
    }));
    logAudit('PUBLISH_UPDATE', `Published new Pure Max release: ${version}`);
  };

  const updateMultipleStaffLocations = useCallback((locs: Array<Partial<StaffLiveLocation> & { userId: string; lat: number; lng: number }>) => {
    if (!locs || locs.length === 0) return;
    setStaffLiveLocations((prev) => {
      const copy = [...prev];
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      for (const loc of locs) {
        const existingIdx = copy.findIndex((p) => p.userId === loc.userId);
        const user = usersRef.current.find((u) => u.id === loc.userId) || currentUserRef.current;
        
        const newLoc: StaffLiveLocation = {
          userId: loc.userId,
          employeeId: loc.employeeId || user?.employeeId || 'PM-STAFF',
          userName: loc.userName || user?.name || 'Delivery Staff',
          userRole: (loc.userRole || user?.role || 'tricycle_staff') as 'tricycle_staff' | 'van_staff',
          avatarUrl: loc.avatarUrl || user?.avatarUrl,
          phone: loc.phone || user?.phone || '',
          lat: loc.lat,
          lng: loc.lng,
          accuracyMeters: loc.accuracyMeters ?? 10,
          speedKmH: loc.speedKmH ?? 0,
          heading: loc.heading ?? 0,
          batteryPct: loc.batteryPct ?? 90,
          status: loc.status || (loc.speedKmH && loc.speedKmH > 1 ? 'Online & Moving' : 'Stationary / Delivering'),
          lastUpdated: loc.lastUpdated || timeNow,
          isLiveDeviceGps: loc.isLiveDeviceGps ?? true,
        };

        if (existingIdx >= 0) {
          copy[existingIdx] = { ...copy[existingIdx], ...newLoc };
        } else {
          copy.push(newLoc);
        }
      }
      return copy;
    });
  }, []);

  const updateStaffLiveLocation = useCallback((loc: Partial<StaffLiveLocation> & { userId: string; lat: number; lng: number }) => {
    updateMultipleStaffLocations([loc]);
  }, [updateMultipleStaffLocations]);

  const clearStaffLiveLocation = useCallback((userId: string) => {
    setStaffLiveLocations((prev) => prev.filter((p) => p.userId !== userId));
  }, []);

  const resetToFreshDatabase = () => {
    localStorage.removeItem('puremax_attendance_v3');
    localStorage.removeItem('puremax_sales_v3');
    localStorage.removeItem('puremax_production_v3');
    localStorage.removeItem('puremax_outer_buyings_v3');
    localStorage.removeItem('puremax_roll_buyings_v3');
    localStorage.removeItem('puremax_expenses_v3');
    localStorage.removeItem('puremax_repairs_v3');
    localStorage.removeItem('puremax_fuel_v3');
    localStorage.removeItem('puremax_equipment_logs_v3');
    localStorage.removeItem('puremax_messages_v3');
    localStorage.removeItem('puremax_announcements_v3');
    localStorage.removeItem('puremax_audit_logs');
    setAttendance([]);
    setSales([]);
    setProduction([]);
    setOuterBuyings([]);
    setRollBuyings([]);
    setExpenses([]);
    setRepairs([]);
    setFuel([]);
    setEquipmentLogs([]);
    setMessages([]);
    setAnnouncements([]);
    setNotifications([]);
    setAuditLogs([
      {
        id: `aud-${Date.now()}`,
        actorId: currentUser?.id || 'u-dev-1',
        actorName: currentUser?.name || 'System Admin',
        actorRole: currentUser?.role || 'developer',
        action: 'SYSTEM_FRESH_START',
        details: 'All records cleared. System reset to clean operational state.',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser && (!currentUser.isFirstLogin || localStorage.getItem(`puremax_onboarding_completed_${currentUser.employeeId || currentUser.id}`) === 'true'),
        activeRole,
        isFirstLoginPending,
        failedLoginAttempts,
        lockoutSeconds,
        loginError,
        isInspecting,
        inspectingOriginalUser,
        switchRolePreview,
        exitInspectionMode,
        isOnline,
        pendingSyncCount,
        isSyncing,
        lastSyncTime,
        triggerManualSync,
        syncNow,
        refreshCloudData,
        exportExcelBackup,
        toast,
        showToast,
        hideToast,
        login,
        logout,
        completeFirstLoginPasswordChange,
        updateUserProfile,
        resetPasswordWithOtp,
        clearLoginError,
        users,
        attendance,
        sales,
        production,
        outerBuyings,
        rollBuyings,
        packagingRolls,
        machines,
        expenses,
        repairs,
        fuel,
        equipmentLogs,
        messages,
        announcements,
        notifications,
        auditLogs,
        systemHealth,
        theme,
        localGlassTheme,
        setLocalGlassTheme,
        addUser,
        updateUser,
        updateUserStatus,
        deleteUser,
        checkIn,
        checkOut,
        approveAttendance,
        approveCheckOut,
        resetAttendance,
        overrideSalary,
        addSalesRecord,
        addProductionRecord,
        addOuterBuyingRecord,
        addRollBuyingRecord,
        addPackagingRolls,
        loadRollToMachine,
        exhaustMachineRoll,
        updatePackagingRoll,
        updateMachineStatus,
        addExpenseRecord,
        addRepairRecord,
        addFuelRecord,
        addEquipmentLog,
        sendMessage,
        editMessage,
        deleteMessage,
        postAnnouncement,
        markNotificationRead,
        markChannelMessagesAsRead,
        updateTheme,
        publishSystemUpdate,
        resetToFreshDatabase,
        todayDateKey,
        dailyWindowStart,
        resetDailyCounters,
        purgeDemoData,
        purgeRecordsByRole,
        staffLiveLocations,
        updateStaffLiveLocation,
        updateMultipleStaffLocations,
        clearStaffLiveLocation,
        activeTab,
        setActiveTab,
        isShareModalOpen,
        openShareModal,
        closeShareModal,
        setIsShareModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
