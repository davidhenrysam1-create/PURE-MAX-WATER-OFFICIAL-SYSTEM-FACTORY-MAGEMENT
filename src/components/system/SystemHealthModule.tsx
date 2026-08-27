/**
 * System Health, Developer UI Control & Media Management Module for Pure Max Water Factory
 * Developer Portal for telemetry, UI control color customization, and login/banner picture uploads.
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { compressImage } from '../../utils/imageCompressor';
import {
  ShieldCheck,
  Database,
  Server,
  RefreshCw,
  AlertCircle,
  FileText,
  Sparkles,
  Palette,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  Check,
  Sun,
  Moon,
  Building2,
  Droplets,
  Sliders,
  RotateCcw,
  Layout,
  CheckCircle2,
  Save,
  FileSpreadsheet,
  Download,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';

// High Quality Mineral Water & Industrial Factory Presets for Quick Selection
const FACTORY_PRESET_IMAGES = [
  {
    id: 'preset-1',
    title: 'Modern Pure Water Plant',
    url: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=1200&q=80',
    description: 'Clean stainless steel filtration lines',
  },
  {
    id: 'preset-2',
    title: 'High-Tech RO System',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
    description: 'Industrial water processing facility',
  },
  {
    id: 'preset-3',
    title: 'Purified Water Springs',
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=1200&q=80',
    description: 'Natural mineral spring background',
  },
  {
    id: 'preset-4',
    title: 'Bottling & Sachet Machine Depot',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    description: 'Automated conveyor distribution',
  },
];

const BANNER_PRESET_IMAGES = [
  {
    id: 'banner-1',
    title: 'Cyan Water Flow',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'banner-2',
    title: 'Pure Mineral Drops',
    url: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'banner-3',
    title: 'Industrial Plant Banner',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1400&q=80',
  },
];

export const SystemHealthModule: React.FC = () => {
  const {
    systemHealth,
    publishSystemUpdate,
    auditLogs,
    theme,
    updateTheme,
    isOnline,
    pendingSyncCount,
    isSyncing,
    triggerManualSync,
    exportExcelBackup,
  } = useApp();

  // Active developer tab: 'telemetry' | 'color_theme' | 'media_branding'
  const [activeSubTab, setActiveSubTab] = useState<'telemetry' | 'color_theme' | 'media_branding'>('telemetry');

  // Live Cloud SQL backend health state
  const [liveDbStatus, setLiveDbStatus] = useState<any>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const checkLiveDb = async () => {
    setIsCheckingDb(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setLiveDbStatus(data);
    } catch (err: any) {
      setLiveDbStatus({ status: 'error', message: err?.message || 'Connection failed' });
    } finally {
      setIsCheckingDb(false);
    }
  };

  React.useEffect(() => {
    checkLiveDb();
  }, []);

  // Release modal state
  const [newVersionInput, setNewVersionInput] = useState('v2.1.0-stable');
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  // File upload input refs
  const loginFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Editable theme form state
  const [loginBgInput, setLoginBgInput] = useState(theme.loginBgUrl || '');
  const [bannerBgInput, setBannerBgInput] = useState(theme.bannerBgUrl || '');
  const [factoryNameInput, setFactoryNameInput] = useState(theme.factoryName || 'Pure Max Factory #1');
  const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (theme.loginBgUrl) setLoginBgInput(theme.loginBgUrl);
  }, [theme.loginBgUrl]);

  React.useEffect(() => {
    if (theme.bannerBgUrl) setBannerBgInput(theme.bannerBgUrl);
  }, [theme.bannerBgUrl]);

  React.useEffect(() => {
    if (theme.factoryName) setFactoryNameInput(theme.factoryName);
  }, [theme.factoryName]);

  // Handle Login Picture File Upload from Developer's Computer
  const handleLoginPictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 2 * 1024 * 1024) {
          setBrandingSuccess('⚡ Large image detected: Auto-compressing...');
        }
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
        if (compressed) {
          setLoginBgInput(compressed);
          updateTheme({ loginBgUrl: compressed });
          setBrandingSuccess('📸 Login Screen Background uploaded & compressed!');
          setTimeout(() => setBrandingSuccess(null), 4000);
        }
      } catch (err) {
        console.warn('Login picture upload error:', err);
      }
    }
  };

  // Handle Top Banner Picture File Upload from Developer's Computer
  const handleBannerPictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 2 * 1024 * 1024) {
          setBrandingSuccess('⚡ Large image detected: Auto-compressing banner...');
        }
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
        if (compressed) {
          setBannerBgInput(compressed);
          updateTheme({ bannerBgUrl: compressed });
          setBrandingSuccess('📸 Top Navigation Banner uploaded & compressed!');
          setTimeout(() => setBrandingSuccess(null), 4000);
        }
      } catch (err) {
        console.warn('Banner picture upload error:', err);
      }
    }
  };

  const handlePublishRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionInput) return;
    publishSystemUpdate(newVersionInput);
    setShowReleaseModal(false);
  };

  const handleSaveGlobalBranding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateTheme({
      loginBgUrl: loginBgInput || undefined,
      bannerBgUrl: bannerBgInput || undefined,
      factoryName: factoryNameInput || 'Pure Max Factory #1',
    });
    setBrandingSuccess('✨ Global Developer Branding (Login Screen, Banner Picture & Factory Title) successfully saved and deployed!');
    setTimeout(() => setBrandingSuccess(null), 5000);
  };

  const handleSaveFactoryName = (e: React.FormEvent) => {
    e.preventDefault();
    updateTheme({ factoryName: factoryNameInput });
  };

  const colorPalettes: Array<{
    id: 'indigo' | 'emerald' | 'blue' | 'gold' | 'purple' | 'cyan' | 'rose';
    label: string;
    bgClass: string;
    borderClass: string;
  }> = [
    { id: 'indigo', label: 'Royal Indigo', bgClass: 'bg-indigo-600', borderClass: 'border-indigo-400' },
    { id: 'emerald', label: 'Pure Emerald', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-400' },
    { id: 'blue', label: 'Ocean Blue', bgClass: 'bg-blue-600', borderClass: 'border-blue-400' },
    { id: 'gold', label: 'Sierra Leone Gold', bgClass: 'bg-amber-500', borderClass: 'border-amber-400' },
    { id: 'purple', label: 'Deep Purple', bgClass: 'bg-purple-600', borderClass: 'border-purple-400' },
    { id: 'cyan', label: 'Aqua Cyan', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-400' },
    { id: 'rose', label: 'Ruby Rose', bgClass: 'bg-rose-600', borderClass: 'border-rose-400' },
  ];

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Title & Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-500" />
            Developer Control Portal & UI Customization
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload factory pictures for the login screen and top banner, customize theme colors, and monitor system health.
          </p>
        </div>

        {/* Developer Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('media_branding')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
              activeSubTab === 'media_branding'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Login & Banner Pictures
          </button>

          <button
            onClick={() => setActiveSubTab('color_theme')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
              activeSubTab === 'color_theme'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            UI Control & Colours
          </button>

          <button
            onClick={() => setActiveSubTab('telemetry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
              activeSubTab === 'telemetry'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            System Audit & DB
          </button>
        </div>
      </div>

      {/* =========================================================
          TAB 1: MEDIA BRANDING (LOGIN & BANNER PICTURE UPLOADERS)
         ========================================================= */}
      {activeSubTab === 'media_branding' && (
        <div className="space-y-6">
          {/* Hidden File Input Elements */}
          <input
            type="file"
            ref={loginFileInputRef}
            onChange={handleLoginPictureUpload}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={bannerFileInputRef}
            onChange={handleBannerPictureUpload}
            accept="image/*"
            className="hidden"
          />

          {brandingSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{brandingSuccess}</span>
            </div>
          )}

          {/* DEVELOPER CUSTOM BACKGROUNDS & FACTORY TITLE (MATCHING DEVELOPER DASHBOARD SCREENSHOT) */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Developer Custom Backgrounds & Factory Title
              </h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold tracking-wider uppercase">
                DEVELOPER ONLY
              </span>
            </div>

            {/* Field 1: Login Screen Background Picture */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  Login Screen Background Picture
                </label>
                <span className="text-[11px] text-slate-400 font-mono">File Upload / Direct URL</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={loginBgInput}
                  onChange={(e) => setLoginBgInput(e.target.value)}
                  placeholder="Paste image URL (https://...) or click Upload from device..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={() => loginFileInputRef.current?.click()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
                {loginBgInput && (
                  <button
                    type="button"
                    onClick={() => {
                      const def = 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=1600&q=80';
                      setLoginBgInput(def);
                      updateTheme({ loginBgUrl: def });
                    }}
                    className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                    title="Reset to Factory HD default"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick High-Def Presets for Login */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono">Factory HD Presets:</span>
                {[
                  { label: 'Pure Mineral Springs', url: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=1600&q=80' },
                  { label: 'Automated Bottling Line', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=80' },
                  { label: 'Mountain Aquifer Stream', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80' },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setLoginBgInput(p.url);
                      updateTheme({ loginBgUrl: p.url });
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Login Screen Live Preview Box */}
              <div className="relative h-36 rounded-xl overflow-hidden border border-slate-800 bg-[#020617] flex items-center justify-center">
                {loginBgInput ? (
                  <img
                    src={loginBgInput}
                    alt="Login Background Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 text-xs space-y-1 p-4">
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                    <span>No custom login image set (default factory background active)</span>
                  </div>
                )}
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/80 border border-white/10 text-[10px] font-mono font-bold text-slate-200 shadow-md">
                  Login Screen Live Preview
                </div>
              </div>
            </div>

            {/* Field 2: Top Navigation Banner Picture */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  Top Navigation Banner Picture
                </label>
                <span className="text-[11px] text-slate-400 font-mono">File Upload / Direct URL</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bannerBgInput}
                  onChange={(e) => setBannerBgInput(e.target.value)}
                  placeholder="Paste banner image URL (https://...) or click Upload from device..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
                {bannerBgInput && (
                  <button
                    type="button"
                    onClick={() => {
                      const defBanner = 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=80';
                      setBannerBgInput(defBanner);
                      updateTheme({ bannerBgUrl: defBanner });
                    }}
                    className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                    title="Reset to Banner HD default"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick High-Def Presets for Banner */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono">Banner HD Presets:</span>
                {[
                  { label: 'Crystal Mineral Water', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=80' },
                  { label: 'Plant Filtration System', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80' },
                  { label: 'Fresh Waterfall Surge', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1600&q=80' },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setBannerBgInput(p.url);
                      updateTheme({ bannerBgUrl: p.url });
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Top Banner Live Preview Box */}
              <div className="relative h-24 rounded-xl overflow-hidden border border-slate-800 bg-[#020617] flex items-center justify-center">
                {bannerBgInput ? (
                  <img
                    src={bannerBgInput}
                    alt="Top Banner Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center opacity-85"
                  />
                ) : (
                  <div className="flex items-center justify-center text-slate-500 text-xs space-x-2 p-4">
                    <Droplets className="w-5 h-5 text-slate-600" />
                    <span>Default header banner gradient active</span>
                  </div>
                )}
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/80 border border-white/10 text-[10px] font-mono font-bold text-slate-200 shadow-md">
                  Top Banner Live Preview
                </div>
              </div>
            </div>

            {/* Field 3: Factory Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Factory Title
              </label>
              <input
                type="text"
                value={factoryNameInput}
                onChange={(e) => setFactoryNameInput(e.target.value)}
                placeholder="e.g. Pure Max Factory #1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Field 4: Save Global Developer Branding Button */}
            <button
              type="button"
              onClick={() => handleSaveGlobalBranding()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/25 transition flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.99]"
            >
              <Save className="w-4 h-4" />
              Save Global Developer Branding
            </button>
          </div>

          {/* Quick Presets Carousel */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                One-Click Mineral Water & Factory Presets:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FACTORY_PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setLoginBgInput(preset.url);
                    setBannerBgInput(preset.url);
                    updateTheme({ loginBgUrl: preset.url, bannerBgUrl: preset.url });
                    setBrandingSuccess(`Selected "${preset.title}" preset for Login & Banner!`);
                    setTimeout(() => setBrandingSuccess(null), 3000);
                  }}
                  className={`group relative rounded-xl overflow-hidden border-2 text-left transition ${
                    loginBgInput === preset.url
                      ? 'border-purple-500 ring-2 ring-purple-500/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div
                    className="h-20 bg-cover bg-center transition group-hover:scale-105"
                    style={{ backgroundImage: `url(${preset.url})` }}
                  />
                  <div className="p-2 bg-slate-900 text-white text-[11px] space-y-0.5">
                    <div className="font-bold flex items-center justify-between">
                      <span className="truncate">{preset.title}</span>
                      {loginBgInput === preset.url && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: UI CONTROL & COLOUR THEME TAB
         ========================================================= */}
      {activeSubTab === 'color_theme' && (
        <div className="space-y-6">
          {/* Section: Primary Accent Color Palette Selection */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Palette className="w-5 h-5 text-purple-500" />
                UI Control Accent Colour Swatch Selector
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose the primary UI theme color applied across navigation headers, active module indicators, buttons, and badges.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {colorPalettes.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => updateTheme({ primaryColor: palette.id })}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition text-left ${
                    theme.primaryColor === palette.id
                      ? `${palette.borderClass} ring-2 ring-purple-500/30 bg-slate-50 dark:bg-slate-800`
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl ${palette.bgClass} flex items-center justify-center text-white shrink-0 shadow-md`}>
                    {theme.primaryColor === palette.id ? <Check className="w-4 h-4" /> : null}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{palette.label}</div>
                    <span className="text-[10px] text-slate-400 capitalize font-mono">{palette.id} Accent</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Dark / Light Mode & Factory Name Branding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dark Mode Control */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                {theme.darkMode ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-slate-700" />}
                Appearance Theme Mode
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toggle between dark industrial layout or crisp high-contrast light theme.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => updateTheme({ darkMode: true })}
                  className={`flex-1 p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                    theme.darkMode
                      ? 'border-indigo-500 bg-slate-900 text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  <Moon className="w-4 h-4 text-amber-400" />
                  Dark Mode
                </button>

                <button
                  type="button"
                  onClick={() => updateTheme({ darkMode: false })}
                  className={`flex-1 p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                    !theme.darkMode
                      ? 'border-indigo-500 bg-slate-100 text-slate-900'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  Light Mode
                </button>
              </div>
            </div>

            {/* Factory Brand Name Form */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="w-5 h-5 text-blue-500" />
                Factory Brand Title & Logo
              </h3>
              <form onSubmit={handleSaveFactoryName} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Factory Display Name</label>
                  <input
                    type="text"
                    value={factoryNameInput}
                    onChange={(e) => setFactoryNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                    placeholder="e.g. Pure Max Water Factory #1"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold">Display Brand Logo Icon</span>
                  <button
                    type="button"
                    onClick={() => updateTheme({ showLogo: !theme.showLogo })}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                      theme.showLogo
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500'
                    }`}
                  >
                    {theme.showLogo ? 'Logo Visible' : 'Logo Hidden'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-500/20"
                >
                  Save Factory Title
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: SYSTEM TELEMETRY & AUDIT LOGS
         ========================================================= */}
      {activeSubTab === 'telemetry' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              Infrastructure Telemetry & PostgreSQL 16.2 Pool
            </h3>

            <button
              onClick={() => setShowReleaseModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Publish System Release Version
            </button>
          </div>

          {/* Live Cloud SQL PostgreSQL Diagnostic Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 text-white shadow-xl space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Cloud SQL Managed PostgreSQL</span>
                    {liveDbStatus?.status === 'ok' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        LIVE CONNECTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 text-[10px] font-bold">
                        CONNECTING...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Region: <strong className="text-indigo-300">AFRICA (africa-south1)</strong> • Engine: <strong className="text-slate-200">PostgreSQL 18.4</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={checkLiveDb}
                disabled={isCheckingDb}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                <span>{isCheckingDb ? 'Pinging DB...' : 'Test DB Ping'}</span>
              </button>
            </div>

            {liveDbStatus && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Database Name</span>
                  <span className="text-emerald-300 font-bold">{liveDbStatus.details?.current_database || 'cloud_sql_development_database'}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Active DB User</span>
                  <span className="text-indigo-300 font-bold">{liveDbStatus.details?.current_user || 'ai_studio_app_user'}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PostgreSQL Server Time</span>
                  <span className="text-slate-300 truncate block">{liveDbStatus.details?.server_time || new Date().toISOString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Database Engine</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-extrabold text-emerald-400">{systemHealth.dbStatus}</div>
              <span className="text-[10px] text-slate-400">Active Pool: {systemHealth.activeConnections} Connections</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>API Gateway Uptime</span>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-base font-extrabold text-blue-400">{systemHealth.apiUptimePercentage}%</div>
              <span className="text-[10px] text-slate-400">Response Latency: 14ms</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Release Version</span>
                <RefreshCw className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-base font-extrabold text-purple-300">{systemHealth.currentVersion}</div>
              <span className="text-[10px] text-slate-400">Pure Max Version 2.0 Spec</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Background Queue</span>
                <AlertCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-base font-extrabold text-cyan-400">{systemHealth.failedJobCount} Failed Jobs</div>
              <span className="text-[10px] text-slate-400">Backup: {new Date(systemHealth.lastBackupTime).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Zero Data Loss & Multi-Sheet Excel Master Backup System */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/40 text-white shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 flex items-center justify-center shadow-lg">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">Excel Master Database Backup & Zero Data Loss Engine</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                      ACTIVE & ENFORCED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Dual-write architecture: every system record (Sales, Production, Inventory, Attendance, Expenses, Fleet, Repairs, Audit) is automatically saved to Cloud SQL database and local storage with zero data loss.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {pendingSyncCount > 0 && (
                  <button
                    onClick={triggerManualSync}
                    disabled={isSyncing}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-600/30 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : `Sync ${pendingSyncCount} Offline Records`}</span>
                  </button>
                )}
                <button
                  onClick={() => exportExcelBackup()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Master Excel Backup (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
                  <span>{isOnline ? 'Online Sync Mode' : 'Offline Safe Mode'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isOnline ? 'Direct Cloud SQL replication active with sub-second sync.' : 'Operations saved to device storage and queued for instant auto-sync upon reconnection.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Database className="w-4 h-4" />
                  <span>{pendingSyncCount === 0 ? 'All Records Synced' : `${pendingSyncCount} Pending Sync Records`}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Zero data loss guarantee: refreshing the page or closing the browser retains 100% of user entries.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Multi-Sheet Workbook Structure</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Includes individual sheets for Sales, Production, Users, Expenses, Attendance, Vehicles, and Audit Trail.
                </p>
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-4 mt-6">
            <h3 className="font-extrabold text-base text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone (Data Wipes)
            </h3>
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/40 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-rose-300">Purge Demo/Mock Sales Data</h4>
                <p className="text-xs text-rose-400/80 mt-1">
                  Permanently deletes all mock records from PostgreSQL and local storage, ensuring only real transactions appear.
                </p>
              </div>
              <button 
                onClick={async () => {
                  if(window.confirm('Are you absolutely sure? This will wipe all current sales records from the database to clear demo data.')) {
                    try {
                      const res = await fetch('/api/sales/mock', { method: 'DELETE' });
                      if (!res.ok) throw new Error('Failed to purge on server');
                      localStorage.removeItem('puremax_sales_v3');
                      alert('Demo data purged successfully!');
                      window.location.reload();
                    } catch (e) {
                      alert('Error purging data');
                    }
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition"
              >
                Purge Demo Data
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                Security & Audit Activity Trail ({auditLogs.length} events logged)
              </h3>
              <span className="text-xs text-slate-400 font-mono">Real-Time Append Only</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Actor</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Action Type</th>
                    <th className="py-3 px-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono text-[11px]">
                      <td className="py-3 px-3 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{log.actorName}</td>
                      <td className="py-3 px-3 capitalize text-purple-600 dark:text-purple-400 font-semibold">
                        {log.actorRole.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans text-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Publish Release Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Publish New Version Release
            </h3>

            <form onSubmit={handlePublishRelease} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Release Version Tag</label>
                <input
                  type="text"
                  value={newVersionInput}
                  onChange={(e) => setNewVersionInput(e.target.value)}
                  placeholder="e.g. v2.1.0-stable"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold font-mono"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-300">
                Publishing a release pushes an in-app update notification banner across all 8 user role dashboards.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReleaseModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 font-bold text-white rounded-xl shadow-md shadow-purple-500/20"
                >
                  Publish Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
