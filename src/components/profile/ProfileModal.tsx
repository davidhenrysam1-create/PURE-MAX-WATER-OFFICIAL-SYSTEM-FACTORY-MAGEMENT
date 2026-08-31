/**
 * User Profile & Customization Controls
 * Allows every user to update personal details, change password, and upload profile pictures with instant success feedback.
 * Includes dedicated UI Colour theme buttons and developer branding controls.
 */

import React, { useState, useRef, useEffect } from 'react';
import PurgeRecordsPanel from '../dashboard/PurgeRecordsPanel';
import { useApp } from '../../context/AppContext';
import { requestCameraAccess, captureFrameFromVideo } from '../../utils/mediaPermissions';
import { compressImage } from '../../utils/imageCompressor';
import { idbStorage } from '../../utils/indexedDBStorage';
import {
  UserCheck,
  Sun,
  Moon,
  Palette,
  Camera,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Upload,
  Check,
  Save,
  Lock,
  PhoneCall,
  User,
  ImageIcon,
  Trash2,
  LogOut,
  Shield,
  Video,
  X,
} from 'lucide-react';

export const ProfileModal: React.FC = () => {
  const { currentUser, activeRole, theme, updateTheme, updateUserProfile, resetPasswordWithOtp, showToast, logout, localGlassTheme, setLocalGlassTheme } = useApp();

  const isSuperOrManager = ['developer', 'manager'].includes(currentUser?.role?.toLowerCase() || activeRole?.toLowerCase() || '');
  const isDeveloper = 
    currentUser?.role?.toLowerCase() === 'developer' ||
    activeRole?.toLowerCase() === 'developer' ||
    currentUser?.role?.toLowerCase() === 'super admin' ||
    currentUser?.employeeId === 'DEV-11422' ||
    currentUser?.email === 'davidhenrysam1@gmail.com';

  const isStaff = ['staff', 'operator', 'tricycle_staff', 'van_staff'].includes(currentUser?.role?.toLowerCase() || activeRole?.toLowerCase() || '');

  // Personal Info Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [altPhone, setAltPhone] = useState(currentUser?.altPhone || '');
  const [nickname, setNickname] = useState(currentUser?.nickname || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /**
   * Keep the on-screen picture in step with the saved profile.
   *
   * `avatarUrl` is seeded from `currentUser` once at mount, so navigating away
   * and back (or receiving an update from another device) used to leave the
   * form showing a stale/blank picture even though the save had succeeded.
   */
  useEffect(() => {
    const stored = currentUser?.avatarUrl;
    if (stored) setAvatarUrl(stored);
    if (currentUser?.name) setName(currentUser.name);
    if (currentUser?.phone) setPhone(currentUser.phone);
    if (currentUser?.email) setEmail(currentUser.email);
  }, [currentUser?.avatarUrl, currentUser?.id, currentUser?.name, currentUser?.phone, currentUser?.email]);
  
  // Camera live capture state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Feedback Messages
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
  const [extrasSuccess, setExtrasSuccess] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [colorSuccess, setColorSuccess] = useState<string | null>(null);
  const [themeSuccess, setThemeSuccess] = useState<string | null>(null);

  // Developer Branding State
  const loginFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [loginBgInput, setLoginBgInput] = useState(theme.loginBgUrl || '');
  const [bannerBgInput, setBannerBgInput] = useState(theme.bannerBgUrl || '');
  const [factoryNameInput, setFactoryNameInput] = useState(theme.factoryName || 'Pure Max Factory #1');
  const [loginTitleInput, setLoginTitleInput] = useState(theme.loginTitle || 'PURE MAX FACTORY OS');
  const [loginSubtitleInput, setLoginSubtitleInput] = useState(theme.loginSubtitle || 'Purified Mineral Water Plant');
  const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null);

  const startCameraCapture = async () => {
    setCameraError(null);
    const { stream, error } = await requestCameraAccess();
    if (error || !stream) {
      setCameraError(error || 'Failed to initialize device camera.');
      return;
    }
    cameraStreamRef.current = stream;
    setIsCameraActive(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, 100);
  };

  const stopCameraCapture = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const snap = captureFrameFromVideo(videoRef.current);
    if (snap) {
      setAvatarUrl(snap);
      stopCameraCapture();
      setInfoSuccess('📸 Live photo captured from camera! Click "Save Profile Updates" to apply.');
      setTimeout(() => setInfoSuccess(null), 4000);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (theme.loginBgUrl) setLoginBgInput(theme.loginBgUrl);
  }, [theme.loginBgUrl]);

  useEffect(() => {
    if (theme.bannerBgUrl) setBannerBgInput(theme.bannerBgUrl);
  }, [theme.bannerBgUrl]);

  useEffect(() => {
    if (theme.factoryName) setFactoryNameInput(theme.factoryName);
  }, [theme.factoryName]);

  useEffect(() => {
    if (theme.loginTitle) setLoginTitleInput(theme.loginTitle);
  }, [theme.loginTitle]);

  useEffect(() => {
    if (theme.loginSubtitle) setLoginSubtitleInput(theme.loginSubtitle);
  }, [theme.loginSubtitle]);

  const handleLoginPictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 2 * 1024 * 1024) {
          showToast('Large image detected: Auto-compressing...', 'info', 'Optimizing Image');
        }
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
        if (compressed) {
          setLoginBgInput(compressed);
          await idbStorage.saveMediaItem('loginBgUrl', compressed);
          updateTheme({ 
            loginBgUrl: compressed,
            watermarkIconUrl: compressed 
          });
          showToast('Login Screen background picture & Watermark icon updated across all devices', 'info', 'Image Uploaded');
          setBrandingSuccess('📸 Login Screen picture & Top Right Watermark updated!');
          setTimeout(() => setBrandingSuccess(null), 4000);
        }
      } catch (err) {
        console.warn('Login image upload error:', err);
      }
    }
  };

  const handleBannerPictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 2 * 1024 * 1024) {
          showToast('Large image detected: Auto-compressing banner...', 'info', 'Optimizing Banner');
        }
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
        if (compressed) {
          setBannerBgInput(compressed);
          await idbStorage.saveMediaItem('bannerBgUrl', compressed);
          updateTheme({ bannerBgUrl: compressed });
          showToast('Top Navigation Banner picture uploaded and updated across all devices', 'info', 'Image Uploaded');
          setBrandingSuccess('📸 Top Navigation Banner uploaded and applied!');
          setTimeout(() => setBrandingSuccess(null), 4000);
        }
      } catch (err) {
        console.warn('Banner image upload error:', err);
      }
    }
  };

  const handleSaveGlobalBranding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalLogin = loginBgInput ? loginBgInput.trim() : undefined;
    const finalBanner = bannerBgInput ? bannerBgInput.trim() : undefined;
    const finalFactory = (factoryNameInput && factoryNameInput.trim()) || 'Pure Max Factory #1';
    const finalTitle = (loginTitleInput && loginTitleInput.trim()) || 'PURE MAX FACTORY OS';
    const finalSubtitle = (loginSubtitleInput && loginSubtitleInput.trim()) || 'Purified Mineral Water Plant';

    updateTheme({
      loginBgUrl: finalLogin,
      watermarkIconUrl: finalLogin, // Sync watermark icon with login picture
      bannerBgUrl: finalBanner,
      factoryName: finalFactory,
      loginTitle: finalTitle,
      loginSubtitle: finalSubtitle,
    });
    showToast('Global Developer Branding & Watermark Updated Across All Devices', 'success', 'Developer Branding Saved');
    setBrandingSuccess('Global Developer Branding & Watermark Updated Across All Devices');
    setTimeout(() => setBrandingSuccess(null), 5000);
  };

  // Preset Avatar Options
  const avatarPresets = [
    { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', label: 'Executive' },
    { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', label: 'Manager' },
    { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', label: 'Operations' },
    { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', label: 'Sales' },
    { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', label: 'Tricycle' },
    { url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', label: 'Van Driver' },
  ];

  const colorPalettes = [
    { id: 'indigo', name: 'Royal Indigo', color: 'bg-indigo-600' },
    { id: 'emerald', name: 'Pure Emerald', color: 'bg-emerald-600' },
    { id: 'blue', name: 'Ocean Blue', color: 'bg-blue-600' },
    { id: 'gold', name: 'Sierra Leone Gold', color: 'bg-amber-500' },
    { id: 'purple', name: 'Deep Purple', color: 'bg-purple-600' },
    { id: 'cyan', name: 'Aqua Cyan', color: 'bg-cyan-500' },
    { id: 'rose', name: 'Ruby Rose', color: 'bg-rose-600' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 2 * 1024 * 1024) {
          showToast('Compressing profile avatar...', 'info', 'Avatar Optimization');
        }
        const compressed = await compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.75, mimeType: 'image/webp' });
        if (compressed) {
          setAvatarUrl(compressed);
          setInfoSuccess('📸 Profile picture uploaded & optimized! Click "Save Profile Updates" to apply.');
          setTimeout(() => setInfoSuccess(null), 4000);
        }
      } catch (err) {
        console.warn('Avatar upload error:', err);
      }
    }
  };

  const handleSelectPresetAvatar = (url: string) => {
    setAvatarUrl(url);
    setInfoSuccess('📸 Avatar picture selected! Click "Save Profile Updates" to persist.');
    setTimeout(() => setInfoSuccess(null), 3000);
  };

  const handleUpdatePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);

    const wantsPasswordChange = Boolean(oldPassword || newPassword || confirmPassword);

    if (wantsPasswordChange) {
      if (!oldPassword) {
        setInfoError('Security Verification Required: Please enter your Current (Old) Password before changing password.');
        return;
      }

      const expectedOld = currentUser?.password || 'password123';
      if (oldPassword !== expectedOld) {
        setInfoError('Security Verification Failed: Current (Old) Password entered is incorrect.');
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        setInfoError('New password must be at least 6 characters long.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setInfoError('New Password and Confirm Password do not match.');
        return;
      }
    }

    // Core profile credentials update
    updateUserProfile({
      name: isSuperOrManager ? name : undefined,
      phone: isSuperOrManager ? phone : undefined,
      email: isSuperOrManager ? email : undefined,
      altPhone,
      nickname,
      avatarUrl,
    });

    if (wantsPasswordChange && currentUser && newPassword) {
      resetPasswordWithOtp(currentUser.email, '123456', newPassword);
    }

    setInfoSuccess(
      wantsPasswordChange
        ? '🎉 SUCCESS: Profile details, profile picture, and new security password updated successfully!'
        : '🎉 SUCCESS: Profile details, contact extras, and nickname updated successfully!'
    );
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setInfoSuccess(null), 5000);
  };

  const handleApplyContactExtras = (e: React.MouseEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: isSuperOrManager ? name : undefined,
      phone: isSuperOrManager ? phone : undefined,
      email: isSuperOrManager ? email : undefined,
      altPhone,
      nickname,
      avatarUrl,
    });
    setExtrasSuccess('🎉 SUCCESS: Additional phone number and nickname applied successfully!');
    setInfoSuccess('🎉 SUCCESS: Additional phone number and nickname applied successfully!');
    setTimeout(() => setExtrasSuccess(null), 5000);
    setTimeout(() => setInfoSuccess(null), 5000);
  };

  const handleSelectColorTheme = (colorId: string, colorName: string) => {
    updateTheme({ primaryColor: colorId as any });
    setColorSuccess(`✅ SUCCESS: UI Theme Accent Colour set to "${colorName}"!`);
    setTimeout(() => setColorSuccess(null), 4000);
  };

  const handleSelectMode = (isDark: boolean) => {
    updateTheme({ darkMode: isDark });
    setColorSuccess(`✅ SUCCESS: Switched to ${isDark ? 'Dark Black Mode' : 'Crisp Light Mode'}!`);
    setTimeout(() => setColorSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white max-w-5xl mx-auto">
      {/* Global Success Notification Alert Banner */}
      {infoSuccess && (
        <div className="p-4 bg-emerald-950 text-emerald-300 border-2 border-emerald-500 rounded-2xl text-xs font-extrabold shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            <span className="text-sm">{infoSuccess}</span>
          </div>
          <button onClick={() => setInfoSuccess(null)} className="text-emerald-400 hover:text-white font-bold">
            Dismiss ✕
          </button>
        </div>
      )}

      {colorSuccess && (
        <div className="p-4 bg-purple-950 text-purple-300 border-2 border-purple-500 rounded-2xl text-xs font-extrabold shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-sm">{colorSuccess}</span>
          </div>
          <button onClick={() => setColorSuccess(null)} className="text-purple-400 hover:text-white font-bold">
            Dismiss ✕
          </button>
        </div>
      )}

      {/* Profile Top Bar Card */}
      <div className="p-6 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={currentUser?.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md ring-2 ring-indigo-400/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                {currentUser?.name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <label
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-indigo-500 transition"
              title="Change Profile Picture"
            >
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-sans">
                {currentUser?.name}
                {currentUser?.nickname ? (
                  <span className="text-indigo-400 font-normal text-sm ml-2">"{currentUser.nickname}"</span>
                ) : null}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/80 font-mono text-[10px] font-bold uppercase">
                {activeRole.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Permanent ID: {currentUser?.employeeId}</p>
            <p className="text-xs text-slate-400 mt-1">
              {currentUser?.email} • {currentUser?.phone}
              {currentUser?.altPhone ? ` • Alt: ${currentUser.altPhone}` : ''}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-right">
          <span className="text-slate-400 block text-[10px] uppercase">Base Monthly Compensation</span>
          <span className="text-lg font-bold text-emerald-400">
            SLE {currentUser?.monthlySalaryLe.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Grid Section: Personal Details & Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Personal Details & Password & Profile Picture */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              Personal Profile & Credentials
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              Official Credentials Locked
            </span>
          </div>

          {infoError && (
            <div className="p-3 bg-rose-950/80 border border-rose-700 text-rose-300 rounded-xl text-xs font-bold">
              {infoError}
            </div>
          )}

          <form onSubmit={handleUpdatePersonalInfo} className="space-y-4 text-xs">
            {/* Profile Picture Selection */}
            <div>
              <label className="block font-semibold mb-1.5 text-slate-300">
                Choose Profile Picture (Visible in Header & Chat)
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {avatarPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(preset.url)}
                    className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition relative ${
                      avatarUrl === preset.url
                        ? 'border-indigo-400 ring-2 ring-indigo-400 scale-105'
                        : 'border-slate-800 hover:border-slate-600'
                    }`}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    {avatarUrl === preset.url && (
                      <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Or paste direct image URL (https://...)"
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={startCameraCapture}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold cursor-pointer shrink-0 text-white flex items-center gap-1.5 shadow-md text-xs transition active:scale-95"
                  title="Capture live picture with device camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera</span>
                </button>
                <label className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold cursor-pointer shrink-0 text-white flex items-center gap-1.5 shadow-md text-xs transition active:scale-95">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-300 text-xs">
                  {cameraError}
                </div>
              )}

              {/* Live Camera Viewfinder Modal / Overlay */}
              {isCameraActive && (
                <div className="p-4 rounded-2xl bg-slate-900 border-2 border-emerald-500/80 shadow-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Device Camera Viewfinder
                    </span>
                    <button
                      type="button"
                      onClick={stopCameraCapture}
                      className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative aspect-video max-w-md mx-auto bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={stopCameraCapture}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleTakeSnapshot}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Official Factory Credentials Section */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  {isSuperOrManager ? (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  Official Account Credentials {isSuperOrManager ? '(Developer & Manager Full Access)' : '(Set by Manager)'}
                </span>
                {isSuperOrManager ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-800/80 flex items-center gap-1 font-bold">
                    👑 Super Admin / Manager Editable
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1 font-bold">
                    🔒 Locked for Staff
                  </span>
                )}
              </div>

              {isSuperOrManager ? (
                /* Editable credentials for Developer & Manager */
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">
                      Full Legal Name <span className="text-amber-400">* Super Admin Editable</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter legal full name..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                        Primary Mobile Phone
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +232 76 100 001"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                        Official Factory Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@puregold.sl"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Locked credentials for Staff */
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Full Legal Name</span>
                    <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-200 font-bold text-xs flex items-center justify-between">
                      <span>{currentUser?.name || 'Account Holder'}</span>
                      <span className="text-[10px] font-mono text-slate-400">Created by Manager</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Primary Mobile Phone</span>
                      <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-300 font-mono text-xs flex items-center justify-between">
                        <span>{currentUser?.phone || 'Not Specified'}</span>
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Official Factory Email</span>
                      <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-300 font-mono text-xs truncate flex items-center justify-between">
                        <span className="truncate">{currentUser?.email || 'N/A'}</span>
                        <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    * Note: Full Name, Phone Number, and Email were provisioned during account creation and can only be changed by the Factory Manager or Developer in the Staff Directory.
                  </p>
                </div>
              )}
            </div>

            {/* Staff Editable Custom Fields: Alternative Phone & Nickname */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-900/40">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Staff Contact Extras & Nickname (Editable)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  ✏️ Staff Editable
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300 flex items-center gap-1 text-[11px]">
                    <PhoneCall className="w-3 h-3 text-emerald-400" />
                    Alternative / Emergency Phone <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="e.g. +232 76 000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300 flex items-center gap-1 text-[11px]">
                    <User className="w-3 h-3 text-indigo-400" />
                    Staff Nickname / Call Sign <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Pure Champion"
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Dedicated Apply Changes Button & Instant Feedback Message */}
              <div className="pt-2 border-t border-indigo-900/30 space-y-2">
                <button
                  type="button"
                  onClick={handleApplyContactExtras}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  Apply Changes (Save Nickname & Phone)
                </button>

                {extrasSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{extrasSuccess}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Password Change Sub-section */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <label className="block font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Change Password (Old Password Verification Required)
              </label>

              <div>
                <label className="block font-semibold mb-1 text-[11px] text-slate-400">
                  Current (Old) Password <span className="text-rose-400 font-bold">* Required for Security</span>
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter your current password..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[11px] text-slate-400">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[11px] text-slate-400">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-extrabold text-white rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Profile Updates
            </button>
          </form>
        </div>

        {/* Card 2: UI Colours & Theme Customizer */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-400" />
              UI Colour & Theme Customizer
            </h3>
          </div>

          {themeSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{themeSuccess}</span>
            </div>
          )}

          {/* Theme Customization Section for ALL Users */}
          <div className="space-y-4 text-xs">
            {/* Dark Mode / Light Mode Toggle */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-200">System Theme Mode (Black / Light)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectMode(false)}
                  className={`p-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition ${
                    !theme.darkMode
                      ? 'border-indigo-500 bg-white text-slate-900 shadow-md'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  Crisp Light Mode
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode(true)}
                  className={`p-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition ${
                    theme.darkMode
                      ? 'border-indigo-500 bg-slate-950 text-white shadow-md'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Moon className="w-4 h-4 text-amber-400" />
                  Dark Black Mode
                </button>
              </div>
            </div>

            {/* Preset Reactive Glass Themes Selection (Accessible to ALL user roles) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block font-bold text-slate-200 flex items-center gap-1.5 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Glassmorphism Theme (Per-Device UI Switcher)
              </label>
              <p className="text-[10px] text-slate-400 mb-2">
                This theme is stored on your current device and applies beautiful frosted-glass layouts to your workspace.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'aqua', name: 'Aqua Cyan', desc: 'Deep Blue/Turquoise glow', color: 'bg-cyan-500 shadow-cyan-500/50' },
                  { id: 'ruby', name: 'Ruby Red', desc: 'Crimson/Magenta glow', color: 'bg-rose-600 shadow-rose-600/50' },
                  { id: 'emerald', name: 'Emerald Green', desc: 'Deep Forest/Neon Mint glow', color: 'bg-emerald-500 shadow-emerald-500/50' },
                  { id: 'golden', name: 'Golden Aura', desc: 'Warm Amber/Bronze glow', color: 'bg-amber-500 shadow-amber-500/50' },
                  { id: 'ultra_dark', name: 'Ultra Dark Glass', desc: 'Frosted Obsidian/Neon White', color: 'bg-slate-400 shadow-slate-400/50' },
                ].map((gt) => (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => {
                      setLocalGlassTheme(gt.id);
                      showToast(`Switched to ${gt.name} glass theme on this device!`, 'success', 'Theme Updated');
                    }}
                    className={`p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between font-bold text-[11px] transition text-left h-20 ${
                      localGlassTheme === gt.id
                        ? 'border-cyan-400 bg-slate-950 text-white ring-2 ring-cyan-400/40 shadow-lg'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full ${gt.color} shrink-0 shadow-md`} />
                      <span className="truncate text-xs font-bold">{gt.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-normal leading-tight line-clamp-2 block mt-1">{gt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color Themes Selection (Hidden for Staff roles) */}
            {!isStaff && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block font-bold text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-400" />
                  UI Accent Colour Palettes (Instant Switch)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {colorPalettes.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => handleSelectColorTheme(palette.id, palette.name)}
                      className={`p-2.5 rounded-xl border-2 flex items-center justify-between font-bold text-[11px] transition text-left ${
                        theme.primaryColor === palette.id
                          ? 'border-indigo-400 bg-slate-950 text-white ring-2 ring-indigo-400/40 shadow-md'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${palette.color} shrink-0 shadow-xs`} />
                        <span className="truncate">{palette.name}</span>
                      </div>
                      {theme.primaryColor === palette.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Developer Custom Backgrounds & Factory Title (VISIBLE IN DEVELOPER ACCOUNT ONLY) */}
            {isDeveloper && (
              <div id="developer-branding-card" className="developer-branding-card pt-4 border-t border-slate-800 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Developer Custom Backgrounds & Factory Title
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold uppercase tracking-wider">
                    SUPER ADMIN
                  </span>
                </div>

                {brandingSuccess && (
                  <div className="p-2.5 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{brandingSuccess}</span>
                  </div>
                )}

                {/* Hidden file inputs for login and banner images */}
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

                {/* Login Screen Background Picture Field */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
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
                      placeholder="Paste image URL (https://...) or upload..."
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
                          setLoginBgInput('');
                          updateTheme({ loginBgUrl: undefined });
                        }}
                        className="p-2 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-400 hover:bg-rose-900/60 transition cursor-pointer"
                        title="Clear login background"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Live Login Preview Box */}
                  <div className="relative h-28 rounded-xl overflow-hidden border border-slate-800 bg-[#020617] flex items-center justify-center">
                    {loginBgInput ? (
                      <img
                        src={loginBgInput}
                        alt="Login Background Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-slate-500 text-xs space-x-1">
                        <ImageIcon className="w-4 h-4 text-slate-600" />
                        <span>Default dark gradient active</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-slate-200 shadow-md">
                      Login Screen Live Preview
                    </div>
                  </div>
                </div>

                {/* Top Navigation Banner Picture Field */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
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
                      placeholder="Paste banner image URL (https://...) or upload..."
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
                          setBannerBgInput('');
                          updateTheme({ bannerBgUrl: undefined });
                        }}
                        className="p-2 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-400 hover:bg-rose-900/60 transition cursor-pointer"
                        title="Clear banner background"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Live Top Banner Preview Box */}
                  <div className="relative h-20 rounded-xl overflow-hidden border border-slate-800 bg-[#020617] flex items-center justify-center">
                    {bannerBgInput ? (
                      <img
                        src={bannerBgInput}
                        alt="Top Banner Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center opacity-85"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-slate-500 text-xs space-x-1">
                        <ImageIcon className="w-4 h-4 text-slate-600" />
                        <span>Default header banner gradient</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-slate-200 shadow-md">
                      Top Banner Live Preview
                    </div>
                  </div>
                </div>

                {/* Factory Title & Login Screen Titles Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
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

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Login Screen Main Title
                    </label>
                    <input
                      type="text"
                      value={loginTitleInput}
                      onChange={(e) => setLoginTitleInput(e.target.value)}
                      placeholder="e.g. PURE MAX FACTORY OS"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Login Screen Subtitle
                    </label>
                    <input
                      type="text"
                      value={loginSubtitleInput}
                      onChange={(e) => setLoginSubtitleInput(e.target.value)}
                      placeholder="e.g. Purified Mineral Water Plant"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Save Global Developer Branding Button */}
                <button
                  type="button"
                  onClick={handleSaveGlobalBranding}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/25 transition flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.99]"
                >
                  <Save className="w-4 h-4" />
                  Save Global Developer Branding & Watermark
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Session & Sign Out Section (Accessible to ALL Users) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Account Session & Sign Out
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Securely sign out of your account on this device. All local changes and queued data remain protected.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            showToast('Signing out of Pure Max Platform...', 'info', 'Session Terminated');
            logout();
          }}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 text-xs cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Pure Max</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------
          Danger Zone — Record Purge
          Deliberately placed LAST in Settings (Profile & Preferences), behind
          an extra "Reveal" step, so it can never be triggered by accident.
          Visible only to Manager / 2nd Manager / Developer (the panel itself
          returns null for everyone else).
         ------------------------------------------------------------------ */}
      <PurgeRecordsPanel />
    </div>
  );
};
