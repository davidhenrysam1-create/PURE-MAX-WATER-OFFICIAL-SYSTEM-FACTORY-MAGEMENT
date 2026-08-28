/**
 * Centralised role-based access rules (Issue #7).
 *
 * Previously the GPS map allow-list was hand-written in three places
 * (App.tsx route guard, Sidebar.tsx nav list, Header.tsx toolbar button) with
 * slightly different contents each time. They drifted: the sidebar hid the map
 * from Machine Operators while the header still offered the "GPS Map" button,
 * and CEO could open a module the spec had reserved for operations staff.
 * One source of truth means they cannot disagree again.
 */

import { UserRole } from '../types';

/**
 * Roles permitted to view the Delivery Staff GPS Map.
 *
 * Per the Issue #7 spec: Manager, Production Sales Officer, Production Officer
 * and Developer (Super Admin) only — explicitly hidden from basic staff
 * dashboards.
 *
 * Mapping onto the app's UserRole union:
 *   developer       -> Developer (Super Admin)
 *   manager         -> Factory Manager
 *   second_manager  -> Assistant / 2nd Manager (operational delegate)
 *   sales_manager   -> Production Sales Officer
 *   engineer        -> Production Officer (Production Engineer)
 *
 * NOTE: `ceo` and `operator` were previously included and are deliberately
 * excluded now. Machine Operator is a basic staff role (the spec calls for the
 * map to be hidden from basic staff). If the owner wants the CEO to retain
 * access, add 'ceo' to this array — nothing else needs to change.
 */
export const GPS_MAP_ROLES: UserRole[] = [
  'developer',
  'manager',
  'second_manager',
  'sales_manager',
  'engineer',
];

/**
 * Roles allowed to open the Bundle Dispatch & Sales Audit module (Issue #3).
 * Production Sales Officers and Managers, per the spec.
 */
export const DISPATCH_ROLES: UserRole[] = [
  'developer',
  'manager',
  'second_manager',
  'sales_manager',
];

/** Roles allowed to record sales. */
export const SALES_ENTRY_ROLES: UserRole[] = [
  'developer',
  'ceo',
  'manager',
  'second_manager',
  'sales_manager',
];

/** Roles allowed to open the Production & Raw Materials module. */
export const PRODUCTION_ROLES: UserRole[] = ['developer', 'ceo', 'manager', 'second_manager', 'engineer'];

/** Roles allowed to manage expenses. */
export const EXPENSES_ROLES: UserRole[] = ['developer', 'ceo', 'manager', 'second_manager'];

/** Roles allowed to open Repairs & Fuel. */
export const REPAIRS_ROLES: UserRole[] = ['developer', 'ceo', 'manager', 'second_manager'];

/** Roles allowed to open Equipment & Water Logs. */
export const EQUIPMENT_ROLES: UserRole[] = ['developer', 'ceo', 'manager', 'second_manager', 'engineer'];

/** Roles allowed to administer user accounts. */
export const USER_MANAGEMENT_ROLES: UserRole[] = ['developer', 'manager', 'second_manager'];

/** Roles allowed to open Reports & Analytics. */
export const REPORTS_ROLES: UserRole[] = ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager'];

/** Basic staff tiers — used to gate management-only chrome. */
export const BASIC_STAFF_ROLES: UserRole[] = ['operator', 'staff', 'tricycle_staff', 'van_staff'];

export function canViewGpsMap(role: UserRole | string | undefined): boolean {
  return !!role && GPS_MAP_ROLES.includes(role as UserRole);
}

export function canViewAnalytics(role: UserRole | string | undefined): boolean {
  return !!role && REPORTS_ROLES.includes(role as UserRole);
}
