/**
 * Login Screen & Authentication Controls for Pure Max Factory Management System
 * Supports standard login, 2-step initial setup, secret developer login, and forgot password.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { compressImage } from '../../utils/imageCompressor';
import {
  Droplets,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Mail,
  Smartphone,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    login,
    isFirstLoginPending,
    completeFirstLoginPasswordChange,
    resetPasswordWithOtp,
    lockoutSeconds,
    loginError,
    clearLoginError,
    users,
    currentUser,
    theme,
  } = useApp();

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // First Login Password & Profile Setup State
  const [wantToUpdatePassword, setWantToUpdatePassword] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupAvatar, setSetupAvatar] = useState('');
  const [firstLoginError, setFirstLoginError] = useState<string | null>(null);

  // Password Reset API modal state for Manager-Created Accounts
  const [resetChannel, setResetChannel] = useState<'email' | 'phone'>('email');
  const [resetAccountInput, setResetAccountInput] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(credential, password, false);
  };

  const handleFirstLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFirstLoginError(null);

    if (wantToUpdatePassword === true) {
      if (newPassword.length < 6) {
        setFirstLoginError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setFirstLoginError('Passwords do not match.');
        return;
      }
      completeFirstLoginPasswordChange(newPassword, setupAvatar || currentUser?.avatarUrl);
    } else {
      // User opted to keep current assigned password
      completeFirstLoginPasswordChange(undefined, setupAvatar || currentUser?.avatarUrl);
    }
  };

  const handleSendResetOtp = async () => {
    if (!resetAccountInput.trim()) {
      setResetMsg('Please enter your registered Email address or Mobile Phone number.');
      return;
    }
    setResetLoading(true);
    setResetMsg('');
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIdentifier: resetAccountInput.trim(),
          channel: resetChannel,
        }),
      });
      const data = await res.json();
      setResetLoading(false);
      if (res.ok && data.success) {
        setResetOtpSent(true);
        setResetMsg(data.message);
      } else {
        setResetOtpSent(false);
        setResetMsg(data.error || 'Account verification failed. Please check your credentials.');
      }
    } catch (err: any) {
      setResetLoading(false);
      setResetMsg('Network error connecting to verification engine. Please try again.');
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode || resetOtpCode.trim().length !== 6) {
      setResetMsg('Please enter the 6-digit verification code sent to your registered account.');
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetMsg('Password must be at least 6 characters.');
      return;
    }

    setResetLoading(true);
    setResetMsg('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIdentifier: resetAccountInput.trim(),
          code: resetOtpCode.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      setResetLoading(false);
      if (res.ok && data.success) {
        setResetSuccess(true);
        setCredential(resetAccountInput.trim());
        setPassword(resetNewPassword);
        setResetMsg(data.message || 'Password updated successfully! You can now log in.');
        resetPasswordWithOtp(resetAccountInput.trim(), resetOtpCode.trim(), resetNewPassword);
      } else {
        setResetMsg(data.error || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setResetLoading(false);
      setResetMsg('Network error verifying code. Please try again.');
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.75 });
        if (compressed) {
          setSetupAvatar(compressed);
        }
      } catch (err) {
        console.warn('Avatar compression error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-slate-950 flex flex-col justify-start sm:justify-center items-center py-4 sm:py-8 px-3 sm:px-6">
      {/* Full-bleed background image — dvh-based so it always fills the real
          visible viewport (no dark gap when the mobile browser address bar
          shows/hides), edge-to-edge with no dark overlay on top of it. */}
      <div className="fixed inset-0 pointer-events-none z-0 w-[100dvw] h-[100dvh]">
        <img
          src={theme.loginBgUrl || 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=1600&q=80'}
          alt="Pure Max Water Plant Backdrop"
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Mandatory First-Time Setup Screen */}
      {isFirstLoginPending ? (
        <div className="relative w-full max-w-lg my-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden p-4 sm:p-6 text-slate-100 z-10 space-y-4">
          <div className="text-center">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto mb-2 border border-indigo-400/30">
              <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-sans">First Login Account Onboarding</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Set permanent credentials, update personal details, and upload your official profile picture.
            </p>
          </div>

          {firstLoginError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{firstLoginError}</span>
            </div>
          )}

          <form onSubmit={handleFirstLoginSubmit} className="space-y-3.5 sm:space-y-4 text-xs">
            {/* Read-only Name and Contact (Preset by Administration) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block font-medium mb-1 text-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={currentUser?.name || ''}
                  disabled
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950/70 text-slate-300 font-semibold cursor-not-allowed opacity-90 text-sm sm:text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Preset by Management</span>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Registered Phone / ID
                </label>
                <input
                  type="text"
                  value={currentUser?.phone || currentUser?.employeeId || ''}
                  disabled
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950/70 text-slate-300 font-mono cursor-not-allowed opacity-90 text-sm sm:text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Registered with Plant Directory</span>
              </div>
            </div>

            {/* Optional Profile Photo */}
            <div>
              <label className="block font-medium mb-1 text-slate-300">Profile Picture Upload (Optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={setupAvatar}
                  onChange={(e) => setSetupAvatar(e.target.value)}
                  placeholder="Enter image URL or select photo"
                  className="w-full px-3 py-2 rounded-xl border border-white/15 bg-slate-950/50 backdrop-blur-sm text-slate-100 text-sm sm:text-xs"
                />
                <label className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer shrink-0 shadow-sm text-xs">
                  Upload
                  <input type="file" accept="image/*" onChange={handleAvatarFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* User Choice: Update Password or Keep Current */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs">
                  Do you want to update your password?
                </span>
                <span className="text-[10px] font-mono text-indigo-300">Optional</span>
              </div>
              <p className="text-[11px] text-slate-400">
                You can keep the temporary password assigned by the Manager or set a custom new password now.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setWantToUpdatePassword(false)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    wantToUpdatePassword === false
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Keep Current Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWantToUpdatePassword(true)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    wantToUpdatePassword === true
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </div>

            {/* If Yes: Show New Password inputs */}
            {wantToUpdatePassword === true && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 animate-in fade-in duration-200">
                <div>
                  <label className="block font-medium mb-1 text-slate-200">New Password <span className="text-rose-400">*</span></label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 rounded-xl border border-white/20 bg-slate-950/70 text-slate-100 font-mono text-base sm:text-xs"
                    required={wantToUpdatePassword === true}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-slate-200">Confirm Password <span className="text-rose-400">*</span></label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 rounded-xl border border-white/20 bg-slate-950/70 text-slate-100 font-mono text-base sm:text-xs"
                    required={wantToUpdatePassword === true}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 transition text-sm cursor-pointer"
            >
              {wantToUpdatePassword === true
                ? 'Save New Password & Enter Dashboard'
                : 'Confirm Onboarding & Access Dashboard'}
            </button>
          </form>
        </div>
      ) : (
        /* Standard Login Window with High Contrast, Resilient Card Design */
        <div className="relative w-full max-w-md my-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100 z-10 transition-all duration-300">
          {/* Header Graphic */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-900 text-white relative overflow-hidden border-b border-slate-800">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-500/25 border border-indigo-300/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight font-sans text-white drop-shadow-sm uppercase">
                    {theme.loginTitle || 'PURE MAX WATER'}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-indigo-200/90 font-mono">
                    {theme.loginSubtitle || 'Purified Mineral Water Factory OS'}
                  </p>
                </div>
              </div>

              {/* Secure Portal Security Badge */}
              <div
                className="text-[9px] sm:text-[10px] font-mono px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-950 text-slate-300 border border-slate-700 flex items-center gap-1 sm:gap-1.5 shrink-0"
                title="Strict End-to-End Encrypted Authentication Active"
              >
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Secure Auth</span>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
            {/* Lockout Warning */}
            {lockoutSeconds > 0 && (
              <div className="p-3 bg-amber-950/80 border border-amber-600/80 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 animate-spin" />
                <span>Too many failed login attempts. Try again in {lockoutSeconds} seconds.</span>
              </div>
            )}

            {/* Error Message Display */}
            {loginError && (
              <div className="p-3 bg-rose-950/80 border border-rose-600/80 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleStandardLogin} className="space-y-3.5 sm:space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 sm:mb-1.5 text-slate-200 text-xs">
                  Employee ID, Email Address, or Phone Number
                </label>
                <input
                  type="text"
                  value={credential}
                  onChange={(e) => {
                    setCredential(e.target.value);
                    clearLoginError();
                  }}
                  placeholder="e.g. manager@puremaxwater.com, PM-MGR-001, or +232 78..."
                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 font-mono focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400/50 transition outline-none text-base sm:text-xs"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                  <label className="font-semibold text-slate-200 text-xs">Account Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-indigo-300 hover:text-indigo-200 underline font-medium text-[11px] cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearLoginError();
                    }}
                    placeholder="Enter your account password"
                    className="w-full px-3.5 py-2.5 sm:py-3 pr-10 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400/50 transition outline-none text-base sm:text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={lockoutSeconds > 0}
                className="w-full py-3 sm:py-3.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 cursor-pointer"
              >
                <span>Sign In to Pure Max Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset API Modal for Manager-Created Accounts */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-slate-950/90 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center py-6 px-3 sm:px-6">
          <div className="relative w-full max-w-md my-auto bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Password API Reset</h3>
                  <p className="text-[10px] text-slate-400">For accounts created by Manager or Admin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setResetOtpSent(false);
                  setResetSuccess(false);
                  setResetMsg('');
                }}
                className="text-slate-400 hover:text-white font-bold text-base px-2"
              >
                ✕
              </button>
            </div>

            {/* Channel Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetChannel('email');
                  setResetOtpSent(false);
                  setResetMsg('');
                }}
                className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  resetChannel === 'email'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                Email API OTP
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetChannel('phone');
                  setResetOtpSent(false);
                  setResetMsg('');
                }}
                className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  resetChannel === 'phone'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                WhatsApp / SMS API
              </button>
            </div>

            {resetMsg && (
              <div
                className={`p-3 rounded-xl font-semibold text-[11px] leading-relaxed border ${
                  resetSuccess
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : 'bg-indigo-950/80 text-indigo-200 border-indigo-800'
                }`}
              >
                {resetMsg}
              </div>
            )}

            {!resetSuccess ? (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Employee ID, Registered Email, or Phone Number
                  </label>
                  <input
                    type="text"
                    value={resetAccountInput}
                    onChange={(e) => setResetAccountInput(e.target.value)}
                    placeholder="e.g. MGR-001, STAFF-001, or fatima.turay@puremaxwater.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 text-base sm:text-xs"
                    autoCapitalize="none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Lookup matches any user created by Manager or System Administrator.
                  </p>
                </div>

                {!resetOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={resetLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    {resetLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Dispatch 6-Digit Verification Code via {resetChannel === 'email' ? 'Email' : 'WhatsApp'}</span>
                  </button>
                ) : (
                  <form onSubmit={handleConfirmResetPassword} className="space-y-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        6-Digit Verification Code (Demo Code: 582914 or 123456)
                      </label>
                      <input
                        type="text"
                        value={resetOtpCode}
                        onChange={(e) => setResetOtpCode(e.target.value)}
                        placeholder="582914"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-emerald-400 font-mono text-center font-black tracking-widest text-lg"
                        maxLength={6}
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Enter New Permanent Password</label>
                      <input
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Choose new password..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-indigo-500 text-base sm:text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      {resetLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>Verify Code & Confirm Password Reset</span>
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="font-extrabold text-sm text-emerald-200">Password Reset Completed!</p>
                <p className="text-[11px] text-slate-300">
                  Your credentials have been updated in the system. Credentials pre-filled on login screen.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSuccess(false);
                    setResetOtpSent(false);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition"
                >
                  Return to Login Screen & Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
