import { pgTable, text, serial, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID or system user ID
  employeeId: text('employee_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  role: text('role').notNull(),
  department: text('department').notNull(),
  status: text('status').notNull().default('active'),
  password: text('password'),
  isFirstLogin: boolean('is_first_login').default(false),
  dailySalaryLe: doublePrecision('daily_salary_le').default(0),
  monthlySalaryLe: doublePrecision('monthly_salary_le').default(0),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Attendance Table
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  employeeId: text('employee_id').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  date: text('date').notNull(),
  timeIn: text('time_in'),
  timeOut: text('time_out'),
  status: text('status').notNull(),
  notes: text('notes'),
  verifiedBy: text('verified_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Production Batches
export const productionBatches = pgTable('production_batches', {
  id: serial('id').primaryKey(),
  batchNumber: text('batch_number').notNull().unique(),
  date: text('date').notNull(),
  machineLine: text('machine_line').notNull(),
  unitsProduced: integer('units_produced').notNull(),
  damagedUnits: integer('damaged_units').default(0),
  waterQualityPh: doublePrecision('water_quality_ph').default(7.2),
  tdsPpm: doublePrecision('tds_ppm').default(45),
  status: text('status').notNull(),
  operatorName: text('operator_name').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Sales Records
export const salesRecords = pgTable('sales_records', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address').notNull(),
  productType: text('product_type').notNull(),
  category: text('category'), // Factory Sales | Van Sales | Tricycle Sales | Wholesale Orders | Damaged Bundles
  quantityBags: integer('quantity_bags').notNull(),
  unitPriceLe: doublePrecision('unit_price_le').notNull(),
  totalAmountLe: doublePrecision('total_amount_le').notNull(),
  amountPaidLe: doublePrecision('amount_paid_le').notNull(), // actual cash/payment collected
  balanceLe: doublePrecision('balance_le').notNull(),        // totalAmountLe - amountPaidLe (>0 = shortfall/credit owed)
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull(),
  deliveryType: text('delivery_type').notNull(),
  vehicleNumber: text('vehicle_number'),   // e.g. PM-TRC-002, for Van/Tricycle dispatch
  loadedBundles: integer('loaded_bundles'), // bundles loaded at factory before dispatch
  unsoldBundles: integer('unsold_bundles'), // bundles returned unsold
  damagedLosses: integer('damaged_losses'), // bundles damaged/lost in transit
  staffName: text('staff_name').notNull(),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Expenses
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amountLe: doublePrecision('amount_le').notNull(),
  recordedBy: text('recorded_by').notNull(),
  date: text('date').notNull(),
  receiptRef: text('receipt_ref'),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('approved'),
  approvedBy: text('approved_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Repairs & Maintenance
export const repairs = pgTable('repairs', {
  id: serial('id').primaryKey(),
  equipmentName: text('equipment_name').notNull(),
  issueDescription: text('issue_description').notNull(),
  reportedBy: text('reported_by').notNull(),
  technicianName: text('technician_name'),
  costLe: doublePrecision('cost_le').default(0),
  partsReplaced: text('parts_replaced'),
  status: text('status').notNull(),
  dateReported: text('date_reported').notNull(),
  dateCompleted: text('date_completed'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Fuel Tracking
export const fuelLogs = pgTable('fuel_logs', {
  id: serial('id').primaryKey(),
  vehicleType: text('vehicle_type').notNull(),
  vehiclePlate: text('vehicle_plate').notNull(),
  driverName: text('driver_name').notNull(),
  liters: doublePrecision('liters').notNull(),
  costLe: doublePrecision('cost_le').notNull(),
  fuelStation: text('fuel_station').notNull(),
  mileageKm: doublePrecision('mileage_km').default(0),
  date: text('date').notNull(),
  receiptRef: text('receipt_ref'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Equipment Registry
export const equipment = pgTable('equipment', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull(),
  serialNumber: text('serial_number'),
  location: text('location').notNull(),
  lastServicedDate: text('last_serviced_date'),
  nextServiceDue: text('next_service_due'),
  conditionNotes: text('condition_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Inter-Staff Messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(),
  recipientId: text('recipient_id'),
  recipientName: text('recipient_name'),
  message: text('message').notNull(),
  timestamp: text('timestamp').notNull(),
  read: boolean('read').default(false),
  isEmergency: boolean('is_emergency').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Factory Announcements
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  priority: text('priority').notNull(),
  targetAudience: text('target_audience').notNull(),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull(),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// System Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Real-Time Delivery Staff Live Locations
export const staffLiveLocations = pgTable('staff_live_locations', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  employeeId: text('employee_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  accuracyMeters: integer('accuracy_meters').default(10),
  speedKmH: integer('speed_kmh').default(0),
  heading: integer('heading').default(0),
  batteryPct: integer('battery_pct').default(90),
  status: text('status').notNull(),
  lastUpdated: text('last_updated').notNull(),
  isLiveDeviceGps: boolean('is_live_device_gps').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Notifications Table with Role Filtering and Categories
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  category: text('category').notNull().default('SYSTEM'), // 'SYSTEM' | 'PRODUCTION' | 'SALES' | 'MANAGER' | 'STAFF'
  targetRole: text('target_role').default('all'), // 'all' | 'staff' | 'manager' | 'sales_manager' | 'developer' | 'ceo'
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'attendance' | 'sales' | 'announcement' | 'system' | 'expense' | 'repair' | 'production' | 'fuel'
  isRead: boolean('is_read').default(false),
  linkTab: text('link_tab'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Password Resets & 6-Digit OTP Table (15-minute expiration)
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  phone: text('phone'),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Daily Outer Buying (Stock purchase of outer film)
export const outerBuyings = pgTable('outer_buyings', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  outersCount: integer('outers_count').notNull(),
  engineerId: text('engineer_id'),
  engineerName: text('engineer_name').notNull(),
  costLe: doublePrecision('cost_le').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Daily Roll Buying (Stock purchase of packaging roll)
export const rollBuyings = pgTable('roll_buyings', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  rollName: text('roll_name').notNull(),
  rollWeightKg: doublePrecision('roll_weight_kg').notNull(),
  engineerId: text('engineer_id'),
  engineerName: text('engineer_name').notNull(),
  costLe: doublePrecision('cost_le').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Packaging Rolls Inventory & Lifecycle Ledger
export const packagingRolls = pgTable('packaging_rolls', {
  id: serial('id').primaryKey(),
  rollCode: text('roll_code').notNull().unique(), // e.g. "ROLL-0825-01"
  rollName: text('roll_name').notNull(),
  weightKg: doublePrecision('weight_kg').notNull(),
  status: text('status').notNull().default('available'), // 'available' | 'loaded' | 'exhausted'
  purchaseDate: text('purchase_date').notNull(),
  costLe: doublePrecision('cost_le').default(0),
  supplier: text('supplier'),
  invoiceOrReceipt: text('invoice_or_receipt'),
  assignedMachineId: text('assigned_machine_id'),
  assignedMachineName: text('assigned_machine_name'),
  operatorId: text('operator_id'),
  operatorName: text('operator_name'),
  loadedAt: text('loaded_at'),
  exhaustedAt: text('exhausted_at'),
  bundlesProduced: integer('bundles_produced').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Water Quality & Equipment Telemetry Logs
export const equipmentLogs = pgTable('equipment_logs', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  tdsLevelPpm: doublePrecision('tds_level_ppm').default(0),
  phLevel: doublePrecision('ph_level').default(7.0),
  filtrationPressurePsi: doublePrecision('filtration_pressure_psi').default(0),
  uvSterilizerStatus: text('uv_sterilizer_status').default('optimal'),
  ozoneGeneratorLevel: doublePrecision('ozone_generator_level').default(0),
  operatorId: text('operator_id'),
  operatorName: text('operator_name').notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// System Settings & UI Themes (Global Cross-Device Persistence)
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique().default('puremax_global_theme'),
  settingsJson: text('settings_json').notNull(),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
});


