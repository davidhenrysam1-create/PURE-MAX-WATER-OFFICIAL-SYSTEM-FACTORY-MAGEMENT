/**
 * Sidebar Navigation Component for Pure Max Factory Management System
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Clock,
  Banknote,
  Wrench,
  Gauge,
  MessageSquare,
  Users,
  BarChart3,
  ShieldCheck,
  Database,
  Settings,
  UserCheck,
  ChevronRight,
  MapPin,
  Navigation,
  ClipboardList,
  X,
  Menu,
  Share2,
  LogOut,
} from 'lucide-react';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeRole, activeTab, setActiveTab, currentUser, openShareModal, logout } = useApp();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home Dashboard',
      icon: LayoutDashboard,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager', 'operator', 'engineer', 'staff', 'tricycle_staff', 'van_staff'],
    },
    {
      id: 'map',
      label: 'Delivery Staff GPS Map',
      icon: Navigation,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager', 'operator', 'engineer'],
    },
    {
      id: 'sales',
      label: 'Sales Module',
      icon: ShoppingCart,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager'],
    },
    {
      id: 'production',
      label:
        activeRole === 'engineer'
          ? 'Daily Record'
          : activeRole === 'sales_manager'
          ? 'Daily Sales Records'
          : 'Daily Records & Production',
      icon: activeRole === 'sales_manager' ? ClipboardList : Factory,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager', 'engineer'],
    },
    {
      id: 'attendance',
      label: 'Attendance & Salary',
      icon: Clock,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager', 'operator', 'engineer', 'staff', 'tricycle_staff', 'van_staff'],
    },
    {
      id: 'expenses',
      label: 'Expenses Module',
      icon: Banknote,
      roles: ['developer', 'ceo', 'manager', 'second_manager'],
    },
    {
      id: 'repairs',
      label: 'Repairs & Fuel',
      icon: Wrench,
      roles: ['developer', 'ceo', 'manager', 'second_manager'],
    },
    {
      id: 'equipment',
      label: 'Equipment & Water Logs',
      icon: Gauge,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'engineer'],
    },
    {
      id: 'chat',
      label: 'Messaging & Broadcasts',
      icon: MessageSquare,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager', 'operator', 'engineer', 'staff', 'tricycle_staff', 'van_staff'],
    },
    {
      id: 'users',
      label: 'User Account Hierarchy',
      icon: Users,
      roles: ['developer', 'manager', 'second_manager'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager'],
    },
    {
      id: 'system',
      label: 'System Health & Audit',
      icon: ShieldCheck,
      roles: ['developer'],
    },
    {
      id: 'pgadmin',
      label: 'pgAdmin SQL Queries',
      icon: Database,
      roles: ['developer'],
    },
    {
      id: 'profile',
      label: 'Profile & Preferences',
      icon: Settings,
      roles: ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager', 'operator', 'engineer', 'staff', 'tricycle_staff', 'van_staff'],
    },
  ];

  const allowedNavs = navItems.filter((item) => item.roles.includes(activeRole));

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full py-4 text-slate-300">
      <div className="px-3 space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            Navigation Menu
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1 custom-scrollbar">
          {allowedNavs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group border ${
                  isActive
                    ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-500/40'
                    : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-300 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Role Summary Widget & Quick System Actions in Sidebar Footer */}
      <div className="mx-3 space-y-2">
        {/* Quick Actions: Share & Logout */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            id="sidebar-share-app-btn"
            onClick={() => {
              openShareModal();
              if (onClose) onClose();
            }}
            className="px-2.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
            title="Share Pure Max System Link with Coworkers"
          >
            <Share2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Share App</span>
          </button>

          <button
            id="sidebar-logout-btn"
            onClick={() => {
              if (onClose) onClose();
              logout();
            }}
            className="px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
            title="Log Out of Pure Max Session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>

        {/* Account Info Card */}
        <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              Active Account
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              {currentUser?.employeeId || 'PM-EMP-000'}
            </span>
          </div>
          <div className="text-slate-100 font-semibold truncate text-xs">{currentUser?.name}</div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Role:</span>
            <span className="text-emerald-400 font-medium capitalize truncate max-w-[120px]">
              {activeRole === 'sales_manager' ? 'Sales Officer' : activeRole.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop & Tablet Sidebar (Screen width >= md: 768px) */}
      <aside className="hidden md:flex w-60 lg:w-64 shrink-0 bg-[#020617] min-h-[calc(100vh-4rem)] border-r border-slate-800/80 flex-col justify-between">
        {navContent}
      </aside>

      {/* 2. Mobile Drawer Overlay (Screen width < md: 768px) */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] md:hidden flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Slide-out Sidebar Content */}
          <div className="relative w-72 max-w-[85vw] bg-[#020617] h-full shadow-2xl border-r border-slate-800 z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}

      {/* 3. Mobile Bottom Navigation Bar - Optimized for phones */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition min-w-[50px] ${
            activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'dashboard' ? 'text-indigo-400 scale-110' : ''}`} />
          <span className="text-[9px] sm:text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => {
            if (['staff', 'operator', 'tricycle_staff', 'van_staff'].includes(activeRole)) {
              setActiveTab('attendance');
            } else if (activeRole === 'engineer') {
              setActiveTab('production');
            } else {
              setActiveTab('sales');
            }
          }}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition min-w-[50px] ${
            ['sales', 'production', 'attendance'].includes(activeTab) ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Factory className={`w-4 h-4 sm:w-5 sm:h-5 ${['sales', 'production', 'attendance'].includes(activeTab) ? 'text-indigo-400 scale-110' : ''}`} />
          <span className="text-[9px] sm:text-[10px] mt-0.5">
            {['staff', 'operator', 'tricycle_staff', 'van_staff'].includes(activeRole) ? 'Clock-In' : activeRole === 'engineer' ? 'Plant' : 'Sales'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition min-w-[50px] relative ${
            activeTab === 'chat' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'chat' ? 'text-indigo-400 scale-110' : ''}`} />
          <span className="text-[9px] sm:text-[10px] mt-0.5">Chat</span>
        </button>

        {/* Dedicated 1-Tap Share Button on Mobile Bottom Navigation */}
        <button
          id="mobile-bottom-share-btn"
          onClick={() => openShareModal()}
          className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-sky-400 hover:text-sky-300 min-w-[50px] transition active:scale-95"
          title="Share App"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
          <span className="text-[9px] sm:text-[10px] mt-0.5 font-bold">Share</span>
        </button>

        {/* Menu & Logout Drawer Toggle Button */}
        <button
          onClick={() => {
            const drawerBtn = document.querySelector('button[aria-label="Toggle navigation menu"]') as HTMLButtonElement;
            if (drawerBtn) drawerBtn.click();
          }}
          className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-slate-400 hover:text-slate-200 min-w-[50px]"
          title="Open Menu & All Modules"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[9px] sm:text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>
    </>
  );
};
