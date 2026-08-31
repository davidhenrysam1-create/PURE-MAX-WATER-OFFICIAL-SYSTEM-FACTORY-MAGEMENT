/**
 * User Account Hierarchy & Staff Management Module for Pure Max Water Factory
 * Manager Account Creation (by Developer/Super Admin) and Staff Provisioning (by Manager/Developer).
 * Live PostgreSQL Persistence with custom Employee IDs, Temporary Passwords, and credentials copy.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, User } from '../../types';
import {
  Users,
  Plus,
  ShieldCheck,
  UserPlus,
  UserX,
  KeyRound,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Truck,
  Zap,
  Edit2,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Building2,
  Phone,
  Mail,
  UserCheck,
  RotateCw,
  Lock,
  Ban,
  Unlock,
  BadgeAlert,
  SlidersHorizontal,
} from 'lucide-react';

export const UserManagementModule: React.FC = () => {
  const { users, addUser, updateUser, updateUserStatus, deleteUser, activeRole, currentUser, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Action Modals State (Custom React confirmation modals to bypass iframe confirm() blocks)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);
  const [userToActivate, setUserToActivate] = useState<User | null>(null);

  // Form State for User Provisioning
  const [role, setRole] = useState<UserRole>('tricycle_staff');
  const [employeeId, setEmployeeId] = useState('PM-TRC-101');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Makeni Tricycle Distribution Fleet');
  const [stationLocation, setStationLocation] = useState('Makeni Production Plant & Sachet Depot');
  const [monthlySalaryLe, setMonthlySalaryLe] = useState<number>(3640000);
  const [tempPassword, setTempPassword] = useState('PureMax@TRC2026');
  const [showPassword, setShowPassword] = useState(false);

  // Edit Form State
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editSalaryLe, setEditSalaryLe] = useState<number>(0);
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Success Created Account State
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{
    name: string;
    employeeId: string;
    tempPassword: string;
    role: UserRole;
    email: string;
    phone: string;
    department: string;
    monthlySalaryLe: number;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const isDeveloper = activeRole === 'developer';
  const isManager = activeRole === 'manager' || activeRole === 'second_manager';

  // Allowed Roles to Create:
  // Developer creates: Manager, 2nd Manager, CEO, and all operational staff.
  // Manager creates: Operational Staff (Tricycle, Van, Factory Operations, Operator, Engineer, Sales).
  const allowedRolesToCreate: {
    role: UserRole;
    label: string;
    prefix: string;
    defaultDept: string;
    defaultStation: string;
    defaultSalary: number;
    defaultPasswordPrefix: string;
    category: 'management' | 'operational';
  }[] = isDeveloper
    ? [
        {
          role: 'manager',
          label: 'FACTORY HEAD MANAGER (Full Plant Operations & Authorization)',
          prefix: 'PM-MGR',
          defaultDept: 'General Plant Administration & Operations',
          defaultStation: 'Freetown Head Plant & Operations Depot',
          defaultSalary: 8000000,
          defaultPasswordPrefix: 'PureMax@MGR',
          category: 'management',
        },
        {
          role: 'second_manager',
          label: '2ND SHIFT MANAGER (Shift Supervision & Compliance)',
          prefix: 'PM-2MG',
          defaultDept: 'Shift Operations & Inventory Supervision',
          defaultStation: 'Makeni Production Plant',
          defaultSalary: 6500000,
          defaultPasswordPrefix: 'PureMax@2MG',
          category: 'management',
        },
        {
          role: 'ceo',
          label: 'CHIEF EXECUTIVE OFFICER (CEO / Executive Board)',
          prefix: 'PM-CEO',
          defaultDept: 'Executive Board & Strategic Oversight',
          defaultStation: 'Freetown Executive Office',
          defaultSalary: 12000000,
          defaultPasswordPrefix: 'PureMax@CEO',
          category: 'management',
        },
        {
          role: 'tricycle_staff',
          label: 'TRICYCLE DRIVER / STAFF (Makeni Retail & Sachet Delivery)',
          prefix: 'PM-TRC',
          defaultDept: 'Makeni Tricycle Distribution Fleet',
          defaultStation: 'Makeni Central Depot',
          defaultSalary: 3640000,
          defaultPasswordPrefix: 'PureMax@TRC',
          category: 'operational',
        },
        {
          role: 'van_staff',
          label: 'VAN DRIVER / STAFF (Heavy Distribution & Wholesale Route)',
          prefix: 'PM-VAN',
          defaultDept: 'Regional Van Distribution Fleet',
          defaultStation: 'Makeni Heavy Transport Hub',
          defaultSalary: 4160000,
          defaultPasswordPrefix: 'PureMax@VAN',
          category: 'operational',
        },
        {
          role: 'operator',
          label: 'MACHINE OPERATOR (Sachet Packing & RO Water Filtration)',
          prefix: 'PM-OPR',
          defaultDept: 'Water Treatment & Automatic Packaging Line',
          defaultStation: 'Makeni Production Hall 1',
          defaultSalary: 4500000,
          defaultPasswordPrefix: 'PureMax@OPR',
          category: 'operational',
        },
        {
          role: 'engineer',
          label: 'PRODUCTION ENGINEER (Mechanical, Electrical & Generator Maintenance)',
          prefix: 'PM-ENG',
          defaultDept: 'Engineering & Heavy Machinery Maintenance',
          defaultStation: 'Makeni Technical Workshop',
          defaultSalary: 5500000,
          defaultPasswordPrefix: 'PureMax@ENG',
          category: 'operational',
        },
        {
          role: 'sales_manager',
          label: 'SALES PRODUCTION OFFICER (Gate Sales, Invoicing & Field Sales)',
          prefix: 'PM-SLS',
          defaultDept: 'Sales, Billing & Field Invoicing',
          defaultStation: 'Factory Main Sales Gate',
          defaultSalary: 5200000,
          defaultPasswordPrefix: 'PureMax@SLS',
          category: 'operational',
        },
        {
          role: 'staff',
          label: 'FACTORY STAFF (Sachet Bundling, Packaging & Logistics)',
          prefix: 'PM-STF',
          defaultDept: 'Packaging, Loading & Warehouse Logistics',
          defaultStation: 'Makeni Finished Goods Warehouse',
          defaultSalary: 3120000,
          defaultPasswordPrefix: 'PureMax@STF',
          category: 'operational',
        },
      ]
    : [
        {
          role: 'tricycle_staff',
          label: 'TRICYCLE DRIVER / STAFF (Makeni Retail & Sachet Delivery)',
          prefix: 'PM-TRC',
          defaultDept: 'Makeni Tricycle Distribution Fleet',
          defaultStation: 'Makeni Central Depot',
          defaultSalary: 3640000,
          defaultPasswordPrefix: 'PureMax@TRC',
          category: 'operational',
        },
        {
          role: 'van_staff',
          label: 'VAN DRIVER / STAFF (Heavy Distribution & Wholesale Route)',
          prefix: 'PM-VAN',
          defaultDept: 'Regional Van Distribution Fleet',
          defaultStation: 'Makeni Heavy Transport Hub',
          defaultSalary: 4160000,
          defaultPasswordPrefix: 'PureMax@VAN',
          category: 'operational',
        },
        {
          role: 'operator',
          label: 'MACHINE OPERATOR (Sachet Packing & RO Water Filtration)',
          prefix: 'PM-OPR',
          defaultDept: 'Water Treatment & Automatic Packaging Line',
          defaultStation: 'Makeni Production Hall 1',
          defaultSalary: 4500000,
          defaultPasswordPrefix: 'PureMax@OPR',
          category: 'operational',
        },
        {
          role: 'engineer',
          label: 'PRODUCTION ENGINEER (Mechanical, Electrical & Generator Maintenance)',
          prefix: 'PM-ENG',
          defaultDept: 'Engineering & Heavy Machinery Maintenance',
          defaultStation: 'Makeni Technical Workshop',
          defaultSalary: 5500000,
          defaultPasswordPrefix: 'PureMax@ENG',
          category: 'operational',
        },
        {
          role: 'sales_manager',
          label: 'SALES PRODUCTION OFFICER (Gate Sales, Invoicing & Field Sales)',
          prefix: 'PM-SLS',
          defaultDept: 'Sales, Billing & Field Invoicing',
          defaultStation: 'Factory Main Sales Gate',
          defaultSalary: 5200000,
          defaultPasswordPrefix: 'PureMax@SLS',
          category: 'operational',
        },
        {
          role: 'staff',
          label: 'FACTORY STAFF (Sachet Bundling, Packaging & Logistics)',
          prefix: 'PM-STF',
          defaultDept: 'Packaging, Loading & Warehouse Logistics',
          defaultStation: 'Makeni Finished Goods Warehouse',
          defaultSalary: 3120000,
          defaultPasswordPrefix: 'PureMax@STF',
          category: 'operational',
        },
      ];

  const [emailError, setEmailError] = useState<string | null>(null);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|puremax\.com|puremaxwater\.com|yahoo\.com|outlook\.com|hotmail\.com)$/i;

  const validateOfficialEmail = (emailToCheck: string) => {
    if (!emailRegex.test(emailToCheck)) {
      return { valid: false, error: "Enter a valid email (e.g. name@gmail.com or name@puremax.com)" };
    }
    return { valid: true };
  };

  const generateNextEmployeeId = (targetRole: UserRole) => {
    const config = allowedRolesToCreate.find((r) => r.role === targetRole) || allowedRolesToCreate[0];
    const prefix = config.prefix;
    // Count existing users with matching prefix
    const existingCount = users.filter((u) => u.employeeId.startsWith(prefix)).length;
    const nextNum = String(existingCount + 1).padStart(3, '0');
    return `${prefix}-${nextNum}`;
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    const config = allowedRolesToCreate.find((r) => r.role === newRole);
    if (config) {
      setDepartment(config.defaultDept);
      setStationLocation(config.defaultStation);
      setMonthlySalaryLe(config.defaultSalary);
      setEmployeeId(generateNextEmployeeId(newRole));
      setTempPassword(`${config.defaultPasswordPrefix}2026`);
    }
  };

  const openAddUserModal = (defaultTargetRole?: UserRole) => {
    const initialRole = defaultTargetRole || (isDeveloper ? 'manager' : 'tricycle_staff');
    setRole(initialRole);
    const config = allowedRolesToCreate.find((r) => r.role === initialRole) || allowedRolesToCreate[0];
    setDepartment(config.defaultDept);
    setStationLocation(config.defaultStation);
    setMonthlySalaryLe(config.defaultSalary);
    setEmployeeId(generateNextEmployeeId(initialRole));
    setTempPassword(`${config.defaultPasswordPrefix}2026`);
    setName('');
    setEmail('');
    setPhone('');
    setEmailError(null);
    setShowPassword(false);
    setShowAddUserModal(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !employeeId.trim()) return;

    const emailCheck = validateOfficialEmail(email.trim().toLowerCase());
    if (!emailCheck.valid) {
      setEmailError(emailCheck.error || 'Invalid email format.');
      return;
    }
    setEmailError(null);

    const trimmedEmpId = employeeId.trim().toUpperCase();
    const finalPassword = tempPassword.trim() || 'PureMax@2026';
    const finalPhone = phone.trim() || '+232 78 000 000';
    const fullDepartment = stationLocation.trim()
      ? `${department.trim()} • ${stationLocation.trim()}`
      : department.trim();
    const dailyLe = Math.round(Number(monthlySalaryLe) / 26);

    addUser({
      employeeId: trimmedEmpId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: finalPhone,
      role,
      department: fullDepartment,
      status: 'active',
      dailySalaryLe: dailyLe,
      monthlySalaryLe: Number(monthlySalaryLe),
      isFirstLogin: true,
      createdBy: currentUser?.id || (isDeveloper ? 'Developer Admin' : 'Manager'),
      password: finalPassword,
    });

    setCreatedAccountInfo({
      name: name.trim(),
      employeeId: trimmedEmpId,
      tempPassword: finalPassword,
      role,
      email: email.trim().toLowerCase(),
      phone: finalPhone,
      department: fullDepartment,
      monthlySalaryLe: Number(monthlySalaryLe),
    });

    setShowAddUserModal(false);
    setName('');
    setEmail('');
    setPhone('');
  };

  const handleOpenEditUser = (u: User) => {
    if (u.role === 'developer' && !isDeveloper) {
      alert('Access Restricted: Only Developer/Super Admin can edit developer accounts.');
      return;
    }
    setEditingUser(u);
    setEditEmployeeId(u.employeeId);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditDepartment(u.department || '');
    setEditSalaryLe(u.monthlySalaryLe || 0);
    setEditRole(u.role);
    setEditPassword(u.password || '');
    setEmailError(null);
    setShowEditPassword(false);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const emailCheck = validateOfficialEmail(editEmail.trim().toLowerCase());
    if (!emailCheck.valid) {
      setEmailError(emailCheck.error || 'Invalid email format.');
      return;
    }
    setEmailError(null);

    const updatedData: Partial<User> = {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      phone: editPhone.trim(),
      department: editDepartment.trim(),
      monthlySalaryLe: Number(editSalaryLe),
      dailySalaryLe: Math.round(Number(editSalaryLe) / 26),
      role: editRole,
    };

    if (editPassword.trim()) {
      updatedData.password = editPassword.trim();
    }

    updateUser(editingUser.id, updatedData);
    setEditingUser(null);
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAllCredentials = () => {
    if (!createdAccountInfo) return;
    const credText = `PURE MAX WATER FACTORY - ACCOUNT CREDENTIALS
--------------------------------------------
Staff Name: ${createdAccountInfo.name}
Assigned Role: ${createdAccountInfo.role.replace('_', ' ').toUpperCase()}
Permanent Employee ID: ${createdAccountInfo.employeeId}
Login Email: ${createdAccountInfo.email}
Registered Phone: ${createdAccountInfo.phone}
Temporary Password: ${createdAccountInfo.tempPassword}
Department / Station: ${createdAccountInfo.department}
Monthly Base: SL Le ${createdAccountInfo.monthlySalaryLe.toLocaleString()}
--------------------------------------------
You can log in at Pure Max Factory Management System using your Email, Employee ID, or Phone Number along with the temporary password.`;

    navigator.clipboard.writeText(credText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const isManagementRole = (r: string) => r === 'manager' || r === 'second_manager' || r === 'ceo';

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Header & Provisioning Trigger Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-500" />
            Account Management & User Provisioning
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, manage, and provision credentials for Plant Managers, Operations Staff, and Distribution Fleets with live PostgreSQL database persistence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDeveloper && (
            <button
              onClick={() => openAddUserModal('manager')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              Provision Manager Account (PM-MGR)
            </button>
          )}

          {(isDeveloper || isManager) && (
            <button
              onClick={() => openAddUserModal('tricycle_staff')}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Provision Staff Account (Tricycle / Van / Factory)
            </button>
          )}
        </div>
      </div>

      {/* Success Modal / Banner for Newly Provisioned Account */}
      {createdAccountInfo && (
        <div className="p-5 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase tracking-wider">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Account Provisioned & Saved to PostgreSQL Database!</span>
            </div>
            <button
              onClick={() => setCreatedAccountInfo(null)}
              className="text-xs text-emerald-300 hover:text-white bg-emerald-900/80 px-3 py-1 rounded-lg font-bold transition cursor-pointer"
            >
              Dismiss ✕
            </button>
          </div>

          <p className="text-xs text-slate-200">
            Official credentials created for <strong className="text-white font-bold">{createdAccountInfo.name}</strong> ({createdAccountInfo.role.replace('_', ' ').toUpperCase()}). These credentials can be used immediately to log in.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Employee ID */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Permanent Employee ID</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{createdAccountInfo.employeeId}</span>
              </div>
              <button
                onClick={() => handleCopyText(createdAccountInfo.employeeId, 'empId')}
                className="p-2 bg-emerald-900/70 hover:bg-emerald-800 rounded-lg text-emerald-300 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                title="Copy Permanent ID"
              >
                {copiedField === 'empId' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedField === 'empId' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Email */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-800 flex items-center justify-between">
              <div className="overflow-hidden pr-1">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Login Email</span>
                <span className="text-xs font-bold text-white font-mono truncate block">{createdAccountInfo.email}</span>
              </div>
              <button
                onClick={() => handleCopyText(createdAccountInfo.email, 'email')}
                className="p-2 bg-emerald-900/70 hover:bg-emerald-800 rounded-lg text-emerald-300 transition flex items-center gap-1 text-[11px] font-bold shrink-0 cursor-pointer"
                title="Copy Email"
              >
                {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedField === 'email' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Temporary Password */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Temporary Password</span>
                <span className="text-sm font-black text-amber-300 font-mono">{createdAccountInfo.tempPassword}</span>
              </div>
              <button
                onClick={() => handleCopyText(createdAccountInfo.tempPassword, 'pass')}
                className="p-2 bg-amber-900/70 hover:bg-amber-800 rounded-lg text-amber-300 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                title="Copy Password"
              >
                {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedField === 'pass' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-emerald-800/80">
            <div className="text-[11px] text-emerald-300 flex items-center gap-2">
              <span className="font-mono">Station: {createdAccountInfo.department}</span>
              <span>•</span>
              <span className="font-mono">Phone: {createdAccountInfo.phone}</span>
            </div>

            <button
              onClick={handleCopyAllCredentials}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? 'All Credentials Copied!' : 'Copy Full Staff Welcome Summary'}
            </button>
          </div>
        </div>
      )}

      {/* Scope & Role Level Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
          <span>
            <strong>Access & Provisioning Authority:</strong> Developer/Super Admin can provision Managers (<code>PM-MGR-xxx</code>), Executives, and Staff. Authorized Managers can provision Tricycle Staff (<code>PM-TRC-xxx</code>), Van Staff (<code>PM-VAN-xxx</code>), Operators, Engineers, and Sales Officers.
          </span>
        </div>
        <span className="font-mono text-[11px] text-purple-300 bg-purple-950 px-3 py-1.5 rounded-lg border border-purple-800 font-bold">
          Active Operator: {isDeveloper ? 'Developer (Full Authority)' : 'Manager (Operations Authority)'}
        </span>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Employee ID (e.g. PM-MGR-001, PM-TRC-101), Name, Email, or Phone..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 font-medium text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="manager">Head Managers</option>
            <option value="second_manager">2nd Shift Managers</option>
            <option value="tricycle_staff">Tricycle Staff</option>
            <option value="van_staff">Van Staff</option>
            <option value="operator">Machine Operators</option>
            <option value="engineer">Engineers</option>
            <option value="sales_manager">Sales Production Officers</option>
            <option value="staff">Factory Staff</option>
          </select>
        </div>
      </div>

      {/* Users Database Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Registered Users in Live PostgreSQL Database ({filteredUsers.length} total)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Employee ID</th>
                <th className="py-3 px-3">Staff Name & Contact</th>
                <th className="py-3 px-3">Assigned Role</th>
                <th className="py-3 px-3">Station / Fleet Department</th>
                <th className="py-3 px-3 font-mono text-right">Monthly Base (SL Le)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const isTricycle = u.role === 'tricycle_staff';
                const isVan = u.role === 'van_staff';
                const isMgr = isManagementRole(u.role);
                const isDev = u.role === 'developer';

                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-xs ${
                          isDev
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : isMgr
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : isTricycle
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isVan
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {u.employeeId}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {isTricycle && <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {isVan && <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        {isMgr && <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        <span>{u.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {u.email} • {u.phone || 'No phone'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          isDev
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                            : isMgr
                            ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                            : isTricycle
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            : isVan
                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {u.role === 'sales_manager' ? 'Sales Production Officer' : u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-[220px] truncate" title={u.department}>
                      {u.department}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-blue-600 dark:text-blue-400">
                      SL Le {u.monthlySalaryLe ? u.monthlySalaryLe.toLocaleString() : '0'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(u.role === 'developer' || isManagementRole(u.role)) && !isDeveloper ? (
                          <span
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed flex items-center gap-1 text-[10px] font-mono whitespace-nowrap"
                            title="This Account is protected and cannot be edited by Manager"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Edit User Credentials & Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(isDeveloper || (isManager && !isManagementRole(u.role))) && u.role !== 'developer' && (
                          <>
                            {u.status === 'suspended' ? (
                              <button
                                onClick={() => setUserToActivate(u)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                                title="Restore User Access"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setUserToSuspend(u)}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 transition cursor-pointer"
                                title="Suspend User Access"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                              title="Delete User Permanently"
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

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No users found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Provisioning Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-500" />
                  {isManagementRole(role) ? 'Provision Plant Manager Account' : 'Provision Staff & Operational Account'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Fill in credentials to save directly to the PostgreSQL database table.
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white font-bold text-base px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Assigned Account Role & Authority Scope <span className="text-rose-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-purple-600 dark:text-purple-400 cursor-pointer"
                >
                  {allowedRolesToCreate.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee ID & Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Custom Employee ID <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEmployeeId(generateNextEmployeeId(role))}
                      className="text-[10px] text-purple-500 hover:text-purple-400 font-bold flex items-center gap-1 cursor-pointer"
                      title="Regenerate suggested ID"
                    >
                      <RotateCw className="w-3 h-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    placeholder={role === 'manager' ? 'PM-MGR-001' : 'PM-TRC-101'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'manager' ? 'e.g. Alhajie Sesay' : 'e.g. Momoh Koroma'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Work Email & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Email Address (For Login) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={(e) => {
                      if (e.target.value) {
                        const check = validateOfficialEmail(e.target.value.trim().toLowerCase());
                        if (!check.valid) setEmailError(check.error || 'Invalid email format.');
                      }
                    }}
                    placeholder={role === 'manager' ? 'manager@puremaxwater.com' : 'worker@puremaxwater.com'}
                    className={`w-full px-3 py-2 rounded-xl border ${emailError ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'} text-xs text-slate-900 dark:text-white`}
                    required
                  />
                  {emailError && <p className="text-[10px] text-rose-500 mt-1 font-bold">{emailError}</p>}
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Phone Number (SMS / OTP Login) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+232 78 555 123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Department & Station Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Department / Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Assigned Station / Plant Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={stationLocation}
                    onChange={(e) => setStationLocation(e.target.value)}
                    placeholder="e.g. Freetown Main Plant / Makeni Depot"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Password & Monthly Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-amber-500 dark:text-amber-400">
                    Temporary / Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-9 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-amber-500 dark:text-amber-400 text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Monthly Base Salary (SL Le) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="100000"
                    value={monthlySalaryLe}
                    onChange={(e) => setMonthlySalaryLe(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-blue-600 dark:text-blue-400 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              {/* Notice Box */}
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  Direct Database Integration:
                </div>
                <p>
                  Upon saving, this account is instantly created in the live PostgreSQL <code>users</code> table. The user can immediately log in with their Email, Employee ID, or Phone number using this temporary password.
                </p>
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 font-bold text-white rounded-xl shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  {isManagementRole(role) ? 'Create Manager Account' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff/Manager Account Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-500" />
                  Edit Account Credentials & Role
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Permanent ID: <span className="font-mono text-indigo-400 font-bold">{editingUser.employeeId}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white font-bold text-base px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Work Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={(e) => {
                      if (e.target.value) {
                        const check = validateOfficialEmail(e.target.value.trim().toLowerCase());
                        if (!check.valid) setEmailError(check.error || 'Invalid email format.');
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border ${emailError ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'} text-xs text-slate-900 dark:text-white`}
                    required
                  />
                  {emailError && <p className="text-[10px] text-rose-500 mt-1 font-bold">{emailError}</p>}
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Department / Station</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Monthly Base (SL Le)</label>
                  <input
                    type="number"
                    value={editSalaryLe}
                    onChange={(e) => setEditSalaryLe(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password Reset Option */}
              <div>
                <label className="block font-bold mb-1 text-amber-500 dark:text-amber-400">
                  Update / Reset Password
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave unchanged or enter new password"
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-amber-500 dark:text-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {isDeveloper && editingUser.role !== 'developer' && (
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Role Permission Level</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-purple-400 cursor-pointer"
                  >
                    {allowedRolesToCreate.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  Save Changes to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ Custom Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Confirm Account Deletion</h3>
                <p className="text-[11px] text-rose-400">This action cannot be undone.</p>
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <p className="text-slate-500">Are you sure you want to permanently delete this user account?</p>
              <div className="pt-2 font-bold text-slate-700 dark:text-slate-300">
                <span className="text-[10px] text-slate-400 block">Staff Member:</span>
                {userToDelete.name} ({userToDelete.employeeId})
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteUser(userToDelete.id);
                  setUserToDelete(null);
                  showToast(`Account for ${userToDelete.name} deleted successfully!`, 'success', 'Account Deleted');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 font-bold text-white rounded-xl shadow-md shadow-rose-500/20 cursor-pointer text-xs"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚫 Custom Suspend User Modal */}
      {userToSuspend && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Suspend User Account</h3>
                <p className="text-[11px] text-amber-400">Access will be blocked immediately.</p>
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <p className="text-slate-500">Are you sure you want to suspend this staff member? They will be unable to log in on any device.</p>
              <div className="pt-2 font-bold text-slate-700 dark:text-slate-300">
                <span className="text-[10px] text-slate-400 block">Staff Member:</span>
                {userToSuspend.name} ({userToSuspend.employeeId})
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToSuspend(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateUserStatus(userToSuspend.id, 'suspended');
                  setUserToSuspend(null);
                  showToast(`Account ${userToSuspend.name} suspended successfully.`, 'warning', 'Account Suspended');
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 font-bold text-white rounded-xl shadow-md shadow-amber-500/20 cursor-pointer text-xs"
              >
                Yes, Suspend Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ❇️ Custom Activate User Modal */}
      {userToActivate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Restore User Access</h3>
                <p className="text-[11px] text-emerald-400">Account will be fully reactivated.</p>
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <p className="text-slate-500">Are you sure you want to restore system access for this staff member?</p>
              <div className="pt-2 font-bold text-slate-700 dark:text-slate-300">
                <span className="text-[10px] text-slate-400 block">Staff Member:</span>
                {userToActivate.name} ({userToActivate.employeeId})
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToActivate(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateUserStatus(userToActivate.id, 'active');
                  setUserToActivate(null);
                  showToast(`Account for ${userToActivate.name} reactivated successfully.`, 'success', 'Account Activated');
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer text-xs"
              >
                Yes, Restore Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
