/**
 * Pure Max - Purified Mineral Water Factory Management System
 * Core Data Models & TypeScript Interfaces
 */

export type UserRole =
  | 'developer'
  | 'ceo'
  | 'manager'
  | 'second_manager'
  | 'sales_manager'
  | 'operator'
  | 'engineer'
  | 'staff'
  | 'tricycle_staff'
  | 'van_staff';

export type UIColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple';

export interface User {
  id: string;
  employeeId: string; // Permanent e.g. PM-001
  name: string;
  email: string;
  phone: string;
  altPhone?: string; // Optional alternative/emergency phone editable by staff
  nickname?: string; // Optional preferred name/call sign editable by staff
  role: UserRole;
  department: string;
  status: 'active' | 'suspended';
  dailySalaryLe: number; // Daily rate in Sierra Leone Leones
  monthlySalaryLe: number;
  isFirstLogin: boolean;
  createdBy: string; // User ID who created this account
  createdAt: string;
  avatarUrl?: string;
  branch?: string;
  password?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  employeeId?: string;
  userName: string;
  userRole: UserRole;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm
  checkOutTime?: string; // HH:mm
  status: 'pending' | 'approved' | 'rejected';
  location?: string;
  geotag?: { lat: number; lng: number };
  shift: 'morning' | 'night' | 'full_day';
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  durationHours?: number;
  isOfflinePending?: boolean;
}

export type SalesCategory = 'Factory Sales' | 'Van Sales' | 'Tricycle Sales' | 'Wholesale Orders' | 'Damaged Bundles';

export interface SalesRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: SalesCategory;
  bundleQuantity: number;
  unsoldBundles?: number;
  damagedLosses?: number;
  loadedBundles?: number;
  unitPriceLe: number;
  totalAmountLe: number;
  // Actual cash/payment collected for this sale. For Van/Tricycle dispatch this
  // can be less than totalAmountLe if the driver came back short. Defaults to
  // totalAmountLe for record types with no separate reconciliation step.
  amountPaidLe?: number;
  // totalAmountLe - amountPaidLe. Positive = cash shortfall / credit owed.
  balanceLe?: number;
  paymentStatus?: 'Paid in Full' | 'Cash Shortfall' | 'Partial / Credit Outstanding' | 'Overpaid' | string;
  recordedById: string;
  recordedByName: string;
  recordedByRole: UserRole;
  paymentMethod?: 'cash' | 'orange_money' | 'bank_transfer' | 'credit';
  customerOrDriver?: string;
  customerPhone?: string;
  vehicleNumber?: string;
  deliveryRoute?: string;
  receiptNumber: string;
  notes?: string;
  clientPhone?: string;
  clientAddress?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface PackagingRollItem {
  id: string; // e.g. "ROLL-0825-01" or unique DB string
  rollCode: string; // formatted e.g. "ROLL-0825-01"
  rollName: string; // e.g. "Pure Max 500ml Heavy Sachet Film"
  weightKg: number; // e.g. 28.5
  status: 'available' | 'loaded' | 'exhausted';
  purchaseDate: string;
  costLe?: number;
  supplier?: string;
  invoiceOrReceipt?: string;
  assignedMachineId?: string;
  assignedMachineName?: string;
  operatorId?: string;
  operatorName?: string;
  loadedAt?: string;
  exhaustedAt?: string;
  bundlesProduced: number; // running cumulative yield counter
  notes?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface MachineStatus {
  id: string; // e.g. "mach-1"
  name: string; // e.g. "Sachet Machine Line #1"
  code: string; // e.g. "LINE-01"
  assignedOperatorId?: string;
  assignedOperatorName: string;
  activeRollId?: string; // Unique Roll ID currently loaded
  activeRollCode?: string; // Formatted Roll Code e.g. ROLL-0825-01
  activeRollKg?: number; // Active Roll Weight (Kg) currently loaded
  activeRollName?: string;
  activeRollBundlesProduced?: number; // Cumulative bundles produced on this roll
  lastLoadedDate?: string;
  status: 'running' | 'idle' | 'maintenance' | 'reloading';
  totalBundlesProduced?: number;
  notes?: string;
}

export interface ProductionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'night';
  outerSetsUsed?: number; // Sets of Outer Film Used (1 Set = 50 Bundles of Water)
  outerRemainingBundles?: number; // Remaining Bundles Leftover (subtracted from sets * 50)
  outerFilmCount?: number; // Sets Used (1 Set = 50 Bundles)
  outerOperatorName?: string; // Operator staff who used the outer film
  machineId?: string; // Machine assigned
  machineName?: string; // e.g. Machine #1 (Line A)
  activeRollId?: string; // Active Roll ID used
  activeRollCode?: string; // Active Roll Code (e.g. ROLL-0825-01)
  packagingRollCode?: string; // Formatted Packaging Roll Code
  packagingRollWeightKg?: number; // Active Roll ID / Weight in Kg loaded into operator's machine
  rollOperatorName?: string; // Operator staff assigned to this machine
  bundlesProduced: number; // calculated as: (Sets Used * 50) - Remaining Bundles Leftover
  damagedBundles: number; // Damaged bundles recorded by Engineer
  cleanWaterLitres: number;
  batchNumber: string;
  engineerId?: string;
  engineerName?: string;
  operatorId: string;
  operatorName: string;
  notes?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface OuterBuyingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  outersCount: number; // Sets of Outer Film Bought (1 Set = 50 Bundles capacity)
  costLe?: number;
  supplier?: string;
  invoiceOrReceipt?: string;
  engineerId?: string;
  engineerName: string;
  notes?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface RollBuyingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  rollName: string; // Name / Brand of the packaging roll
  rollWeightKg: number; // Weight in KG
  rollsCount: number; // Number of rolls purchased
  costLe?: number;
  supplier?: string;
  invoiceOrReceipt?: string;
  engineerId?: string;
  engineerName: string;
  notes?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export type ExpenseCategory =
  | 'Raw Materials'
  | 'Packaging & Plastics'
  | 'Utilities & Electricity'
  | 'Maintenance & Spare Parts'
  | 'Logistics & Fuel'
  | 'Salaries & Wages'
  | 'Miscellaneous';

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  itemDescription: string;
  amountLe: number;
  vendor?: string;
  receiptNumber?: string;
  recordedById: string;
  recordedByName: string;
  receiptPhotoUrl?: string;
  receiptImageUrl?: string;
  notes?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface MachineRepairRecord {
  id: string;
  date: string;
  machineName: string; // e.g., "Ozone Generator #1", "Reverse Osmosis Pump", "Automatic Sachet Packing Machine #2"
  sparePart: string;
  costLe: number;
  engineerId: string;
  engineerName: string;
  technicianName?: string;
  issueDescription: string;
  problemDescription?: string;
  resolutionStatus: 'completed' | 'in_progress' | 'pending_parts';
  status?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface FuelRecord {
  id: string;
  date: string;
  vehicleOrMachine: string; // e.g. "Delivery Van #1", "Factory Heavy Generator", "Distribution Tricycle #3"
  litres: number;
  costPerLitreLe: number;
  totalCostLe: number;
  engineerId: string;
  engineerName: string;
  driverOrOperator?: string;
  fuelStation?: string;
  receiptNumber?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface EquipmentLogRecord {
  id: string;
  date: string;
  time: string;
  tdsLevelPpm: number; // Target < 50 ppm for pure mineral water
  phLevel: number; // Target 6.8 - 7.5
  filtrationPressurePsi: number;
  uvSterilizerStatus: 'optimal' | 'warning' | 'needs_maintenance';
  ozoneGeneratorLevel: number;
  operatorId: string;
  operatorName: string;
  notes?: string;
  createdAt: string;
  isOfflinePending?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  receiverId?: string; // empty if group / broadcast
  isBroadcast?: boolean;
  groupId?: string; // 'all-staff' | 'sales-team' | 'engineering'
  type: 'text' | 'voice' | 'image' | 'announcement';
  content: string; // Text content or Audio/Image URL
  durationSeconds?: number; // for voice notes
  timestamp: string;
  readBy: string[]; // list of user IDs
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent' | 'critical';
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  targetRole?: UserRole | 'all';
}

export interface NotificationItem {
  id: string;
  userId?: string;
  category?: 'SYSTEM' | 'PRODUCTION' | 'SALES' | 'MANAGER' | 'STAFF';
  targetRole?: string;
  title: string;
  message: string;
  type: 'attendance' | 'sales' | 'announcement' | 'system' | 'expense' | 'repair' | 'production' | 'fuel';
  isRead: boolean;
  createdAt: string;
  linkTab?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string; // e.g., "OVERRODE_SALARY", "CREATED_ACCOUNT", "EDITED_SALES", "SUSPENDED_USER", "THEME_UPDATED"
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemHealth {
  apiUptimePercentage: number;
  dbStatus: 'Connected (PostgreSQL 16.2)' | 'Degraded' | 'Offline';
  activeConnections: number;
  failedJobCount: number;
  lastBackupTime: string;
  currentVersion: string;
  updateAvailable: boolean;
  newVersionNumber?: string;
  errorLogs: { id: string; time: string; source: string; message: string }[];
}

export interface ThemeConfig {
  primaryColor: 'blue' | 'gold' | 'emerald' | 'slate' | 'indigo' | 'purple' | 'cyan' | 'rose';
  darkMode: boolean;
  factoryName: string;
  showLogo: boolean;
  loginBgUrl?: string;
  bannerBgUrl?: string;
  watermarkIconUrl?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  appLogoUrl?: string;
  loginBgOpacity?: number;
  bannerHeight?: 'compact' | 'normal' | 'tall';
}

export interface StaffLiveLocation {
  userId: string;
  employeeId: string;
  userName: string;
  userRole: 'tricycle_staff' | 'van_staff';
  avatarUrl?: string;
  phone: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  speedKmH?: number;
  heading?: number;
  batteryPct?: number;
  status: 'Online & Moving' | 'Stationary / Delivering' | 'Off-Duty';
  lastUpdated: string;
  isLiveDeviceGps: boolean;
}
