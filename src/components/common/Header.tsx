/**
 * Header Topbar Component for Pure Max Factory Management System
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ShareAppModal } from './ShareAppModal';
import { Portal } from './Portal';
import { canViewGpsMap } from '../../utils/roleAccess';
import {
  Droplets,
  Bell,
  MessageSquare,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  CheckCircle2,
  Clock,
  Settings,
  Palette,
  Navigation,
  Check,
  Menu,
  X,
  MoreVertical,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Database,
  Share2,
  ShieldCheck,
  Crown,
} from 'lucide-react';

export interface HeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const {
    currentUser,
    activeRole,
    logout,
    theme,
    updateTheme,
    notifications,
    markNotificationRead,
    messages,
    activeTab,
    setActiveTab,
    systemHealth,
    isOnline,
    pendingSyncCount,
    isSyncing,
    triggerManualSync,
    exportExcelBackup,
    isShareModalOpen,
    openShareModal,
    closeShareModal,
  } = useApp();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [colorSuccessMsg, setColorSuccessMsg] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);

  // Calculate unread direct messages and group broadcasts for active user
  const unreadMessageCount = messages.filter((m) => {
    if (!currentUser) return false;
    if (m.senderId === currentUser.id) return false;
    const isRead = m.readBy && m.readBy.includes(currentUser.id);
    if (isRead) return false;
    if (m.receiverId) {
      return m.receiverId === currentUser.id;
    }
    return true;
  }).length;

  // Role-Based Notification Filtering
  const roleFilteredNotifs = notifications.filter((n) => {
    if (activeRole === 'developer' || activeRole === 'ceo') return true;

    if (activeRole === 'manager' || activeRole === 'second_manager') {
      return (
        n.category === 'MANAGER' ||
        n.category === 'SYSTEM' ||
        n.category === 'PRODUCTION' ||
        n.category === 'STAFF' ||
        n.type === 'attendance' ||
        n.type === 'expense' ||
        n.type === 'repair' ||
        n.type === 'fuel' ||
        n.type === 'announcement' ||
        n.targetRole === 'all' ||
        n.targetRole === 'manager' ||
        (n.userId && n.userId === currentUser?.id)
      );
    }

    if (activeRole === 'sales_manager') {
      return (
        n.category === 'SALES' ||
        n.type === 'sales' ||
        n.type === 'announcement' ||
        n.targetRole === 'all' ||
        n.targetRole === 'sales_manager' ||
        (n.userId && n.userId === currentUser?.id)
      );
    }

    if (activeRole === 'engineer') {
      return (
        n.category === 'PRODUCTION' ||
        n.type === 'repair' ||
        n.type === 'fuel' ||
        n.type === 'equipment' ||
        n.type === 'announcement' ||
        n.targetRole === 'all' ||
        n.targetRole === 'engineer' ||
        (n.userId && n.userId === currentUser?.id)
      );
    }

    // Staff tiers
    return (
      n.category === 'STAFF' ||
      n.type === 'announcement' ||
      n.targetRole === 'all' ||
      n.targetRole === 'staff' ||
      (n.userId && n.userId === currentUser?.id)
    );
  });

  const unreadNotifs = roleFilteredNotifs.filter((n) => !n.isRead);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (colorRef.current && !colorRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (mobileMoreRef.current && !mobileMoreRef.current.contains(event.target as Node)) {
        setShowMobileMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colorOptions = [
    { id: 'indigo', label: 'Indigo Royal', bg: 'bg-indigo-600' },
    { id: 'emerald', label: 'Emerald Mint', bg: 'bg-emerald-600' },
    { id: 'blue', label: 'Ocean Blue', bg: 'bg-blue-600' },
    { id: 'gold', label: 'Amber Gold', bg: 'bg-amber-500' },
    { id: 'purple', label: 'Deep Purple', bg: 'bg-purple-600' },
    { id: 'cyan', label: 'Aqua Cyan', bg: 'bg-cyan-500' },
    { id: 'rose', label: 'Ruby Rose', bg: 'bg-rose-600' },
  ];

  const handleSelectColor = (colorId: string, label: string) => {
    updateTheme({ primaryColor: colorId as any });
    setColorSuccessMsg(`✅ UI Colour set to ${label}!`);
    setTimeout(() => setColorSuccessMsg(null), 3000);
    setShowColorPicker(false);
    setShowMobileMoreMenu(false);
  };

  return (
    /* ---------------------------------------------------------------------
     * z-index: 50 (top navigation) — see the layering contract in index.css.
     *
     * CLIPPING FIX: this header previously carried `overflow-x-hidden` (and its
     * inner bar `overflow-hidden`) to crop the full-bleed banner image. That
     * clipped every overflowing child — the notifications panel, the colour
     * picker and the mobile "more" menu all lost everything below the header's
     * bottom edge. The banner <div> below already has its own `overflow-hidden`,
     * so removing the clipping here is safe and lets the dropdowns breathe.
     * ------------------------------------------------------------------- */
    <header
      id="app-top-navigation"
      className="sticky top-0 z-50 w-full max-w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10 shadow-md transition-colors duration-200 relative"
    >
      {/* Main Bar */}
      <div className="relative max-w-7xl w-full max-w-full mx-auto px-3 sm:px-5 md:px-6 lg:px-8 pr-4 sm:pr-6 md:pr-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Banner Backdrop Picture */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={theme.bannerBgUrl || 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=80'}
            alt="Pure Max Factory Banner Backdrop"
            className="w-full h-full object-cover object-center opacity-30 dark:opacity-35 transform scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-950/90" />
        </div>

        {/* Brand Logo & Name */}
        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
          {/* Mobile Navigation Drawer Toggle (☰) */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-1.5 -ml-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
              title="Open Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-indigo-500" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {theme.showLogo !== false && (
            <div className="relative w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30 overflow-hidden group shrink-0">
              {theme.loginBgUrl ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-110"
                    style={{ backgroundImage: `url(${theme.loginBgUrl})` }}
                  />
                  <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-[1px]" />
                  <Droplets className="relative z-10 w-3.5 h-3.5 sm:w-5 sm:h-5 text-cyan-300 drop-shadow-md" />
                </>
              ) : (
                <Droplets className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-indigo-100" />
              )}
            </div>
          )}
          <div className="truncate min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 truncate">
              <h1 className="font-extrabold text-xs sm:text-base md:text-lg text-slate-900 dark:text-white tracking-tight leading-tight font-sans uppercase truncate max-w-[105px] xs:max-w-[170px] sm:max-w-none">
                {theme.factoryName || 'PURE MAX'}
              </h1>
              <span className="text-[8px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hidden xs:inline-block">
                SL WATER
              </span>
            </div>
            <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400 hidden xs:block truncate">
              {theme.loginSubtitle || 'Purified Mineral Water OS'}
            </p>
          </div>
        </div>

        {/* Right Action Icons & Utility Controls (Generous padding, scroll-free layout) */}
        <div className="relative z-10 flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 min-w-0 pr-1 sm:pr-2">
          {/* Top auto-sync status badge is hidden while sync runs silently in the background */}

          {/* Desktop-Only Action Buttons (Privileged & Secondary tools) */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* Excel Master Backup Button */}
            {!['operator', 'staff', 'tricycle_staff', 'van_staff'].includes(activeRole) && (
              <button
                onClick={() => exportExcelBackup()}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                title="Download Master Excel Backup (.xlsx) containing all factory collections"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden xl:inline whitespace-nowrap">Excel</span>
              </button>
            )}

            {/* Real-time Makeni GPS Map Button
                Gated on the shared allow-list: this previously used a different
                (broader) list than the route guard, so CEO and Machine Operator
                saw a button that either bounced them back to the dashboard or
                opened a module reserved for operations staff. */}
            {canViewGpsMap(activeRole) && (
              <button
                onClick={() => setActiveTab('map')}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Open Real-Time Makeni Map Tracking"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="whitespace-nowrap">GPS Map</span>
              </button>
            )}

            {/* UI COLOUR & Theme Palette Button */}
            {!['operator', 'staff', 'tricycle_staff', 'van_staff'].includes(activeRole) && (
              <div className="relative" ref={colorRef}>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Update UI Colors & Accent Themes"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">Colour</span>
                </button>

                {/* UI Color Palette Dropdown */}
                {showColorPicker && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xl z-[100] space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-amber-500" />
                        Select UI Theme Colour
                      </span>
                      <button onClick={() => setShowColorPicker(false)} className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer">
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {colorOptions.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectColor(c.id, c.label)}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                            theme.primaryColor === c.id
                              ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full ${c.bg} shadow-xs`} />
                            <span>{c.label}</span>
                          </div>
                          {theme.primaryColor === c.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme Dark/Light Quick Toggle */}
            <button
              onClick={() => updateTheme({ darkMode: !theme.darkMode })}
              className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Toggle Light / Dark mode"
            >
              {theme.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>

          {/* Color Success Notification Toast */}
          {colorSuccessMsg && (
            <div className="fixed top-20 right-4 z-[400] bg-emerald-900 text-emerald-100 border border-emerald-500 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{colorSuccessMsg}</span>
            </div>
          )}

          {/* Chat Quick Drawer with Red Unread Badge */}
          <button
            onClick={() => setActiveTab('chat')}
            className="relative p-1.5 sm:p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Real-Time Messaging & Announcements"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] sm:text-[10px] font-black shadow-md border-2 border-white dark:border-slate-900 animate-pulse">
                {unreadMessageCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-1.5 sm:p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Factory System Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] sm:text-[10px] font-black shadow-md border-2 border-white dark:border-slate-900">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-[420px] max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2 font-extrabold text-xs">
                    <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Notifications ({unreadNotifs.length})</span>
                  </div>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={() => {
                        unreadNotifs.forEach((n) => markNotificationRead(n.id));
                      }}
                      className="text-[10px] text-emerald-400 hover:underline font-bold px-2 py-0.5 rounded bg-slate-800 cursor-pointer shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
                  {roleFilteredNotifs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">No active notifications for your role</div>
                  ) : (
                    roleFilteredNotifs.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          if (n.linkTab) setActiveTab(n.linkTab);
                          setShowNotifDropdown(false);
                        }}
                        className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition rounded-xl my-1 border ${
                          !n.isRead
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 font-medium'
                            : 'bg-white dark:bg-slate-900 border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                !n.isRead ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            <span className="leading-snug">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed pl-3.5 mb-2">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between pl-3.5 pt-1 text-[10px]">
                          <span className="px-2 py-0.5 rounded-md font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {n.type} Alert
                          </span>
                          {n.linkTab && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                              Open →
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Share App Button (Top Accessible on all screens) */}
          <button
            id="top-share-app-btn"
            onClick={() => openShareModal()}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0 active:scale-95"
            title="Share Pure Max System to Friend / Coworker"
          >
            <Share2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Share</span>
          </button>

          {/* Desktop-Only Settings & Log Out Buttons (Visible on md+) */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              id="top-settings-btn"
              onClick={() => setActiveTab('profile')}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
              title="Settings & Profile Preferences"
            >
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">Settings</span>
            </button>

            <button
              id="top-logout-btn"
              onClick={logout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0 active:scale-95"
              title="Log Out of Pure Max Session"
            >
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">Logout</span>
            </button>
          </div>

          {/* Mobile Secondary Menu Dropdown (Screen < md) */}
          <div className="relative md:hidden" ref={mobileMoreRef}>
            <button
              onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
              className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMobileMoreMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-2xl z-[100] space-y-1 text-xs">
                {!['operator', 'staff', 'tricycle_staff', 'van_staff'].includes(activeRole) && (
                  <button
                    onClick={() => {
                      exportExcelBackup();
                      setShowMobileMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 transition font-bold"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Download Excel Backup</span>
                  </button>
                )}

                {pendingSyncCount > 0 && (
                  <button
                    onClick={() => {
                      triggerManualSync();
                      setShowMobileMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-400 transition font-bold"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                    <span>Sync Offline Records ({pendingSyncCount})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    updateTheme({ darkMode: !theme.darkMode });
                    setShowMobileMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-medium"
                >
                  {theme.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                  <span>{theme.darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                </button>

                {!['operator', 'staff', 'tricycle_staff', 'van_staff'].includes(activeRole) && (
                  <button
                    onClick={() => {
                      setShowColorPicker(true);
                      setShowMobileMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-medium"
                  >
                    <Palette className="w-4 h-4 text-amber-500" />
                    <span>UI Accent Colour</span>
                  </button>
                )}

                {canViewGpsMap(activeRole) && (
                  <button
                    onClick={() => {
                      setActiveTab('map');
                      setShowMobileMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-medium"
                  >
                    <Navigation className="w-4 h-4 text-indigo-500" />
                    <span>Makeni Live GPS</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    openShareModal();
                    setShowMobileMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-700 dark:text-sky-300 transition font-medium"
                >
                  <Share2 className="w-4 h-4 text-sky-500" />
                  <span>Share App with Team</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setShowMobileMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-medium"
                >
                  <Settings className="w-4 h-4 text-indigo-400" />
                  <span>Profile & Settings</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setShowMobileMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition font-bold"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
            <div className="hidden xl:block text-right">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[90px]">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {currentUser?.employeeId || 'PM-EMP-000'}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md hover:ring-2 hover:ring-indigo-400 transition overflow-hidden border-2 border-indigo-500 shrink-0 cursor-pointer"
              title="Click to Open Profile & Settings"
              aria-label="Settings & Profile Preferences"
            >
              <img
                src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=4f46e5&color=fff&bold=true`}
                alt={currentUser?.name || 'User'}
                className="w-full h-full object-cover"
              />
            </button>
          </div>

          {/* Top-Right Watermark Icon - Automatically syncs with Developer Login Picture & Theme */}
          <div
            id="top-right-watermark-icon"
            className="hidden xs:flex relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-indigo-400/40 bg-slate-900/60 backdrop-blur-xs items-center justify-center overflow-hidden shadow-xs shrink-0 group ml-0.5 sm:ml-1"
            title={`Factory Watermark Logo (Syncs with Login Picture: ${theme.loginTitle || 'Pure Max'})`}
          >
            <img
              src={theme.watermarkIconUrl || theme.loginBgUrl || 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=1600&q=80'}
              alt="System Watermark"
              className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-indigo-950/30 ring-1 ring-inset ring-white/10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Share App Modal Component
          Rendered through a portal into <body> on purpose: the header's
          `backdrop-blur-md` makes it a containing block for `position: fixed`
          children, which trapped this dialog inside the 4rem-tall header box
          and made it look clipped / hidden behind the top navigation. */}
      <Portal>
        <ShareAppModal isOpen={isShareModalOpen} onClose={closeShareModal} />
      </Portal>
    </header>
  );
};

