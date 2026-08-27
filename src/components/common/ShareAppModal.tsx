/**
 * Pure Max - Share App to Friend / Team Member Modal
 * Provides:
 * - Instant Copy URL with feedback
 * - Native Web Share API (Mobile & Desktop)
 * - WhatsApp Direct Share
 * - Email Direct Share
 * - Auto-Generated QR Code for scanning directly from mobile camera
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Send,
  Mail,
  X,
  Smartphone,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose }) => {
  const { theme, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [showQrExpanded, setShowQrExpanded] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://puremax.factory.app';
  const shareTitle = `${theme.factoryName || 'Pure Max'} - Factory Management System`;
  const shareText = `Join and access ${theme.factoryName || 'Pure Max Factory OS'} for real-time factory operations, production, sales, and messaging:`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      showToast('App link copied to clipboard!', 'success', 'Link Copied');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
        showToast('App shared successfully!', 'success', 'Shared');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${currentUrl}\n\nPure Max Factory Management System`)}`;

  // SVG QR Code generator using quick visual QR API or encoded SVG
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}&color=0284c7&bgcolor=ffffff`;

  return (
    <div
      id="share-app-modal-overlay"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="share-app-modal-container"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 p-6 text-white relative">
          <button
            id="close-share-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            Share {theme.factoryName || 'Pure Max'}
            <Sparkles className="w-4 h-4 text-amber-300" />
          </h2>
          <p className="text-xs text-sky-100 mt-1">
            Invite coworkers, drivers, and partners to connect to the factory OS on their phone or desktop.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Copy Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              System Web Address
            </label>
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate flex-1 select-all">
                {currentUrl}
              </span>
              <button
                id="copy-app-link-btn"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Direct Sharing Channels */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* WhatsApp */}
            <a
              id="share-whatsapp-btn"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 transition group text-center"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition">
                <Send className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold">WhatsApp</span>
            </a>

            {/* Email */}
            <a
              id="share-email-btn"
              href={emailUrl}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 transition group text-center"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold">Email</span>
            </a>

            {/* Native Mobile Share */}
            <button
              id="share-device-native-btn"
              onClick={handleNativeShare}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition group text-center"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold">Share Sheet</span>
            </button>
          </div>

          {/* QR Code Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-20 h-20 bg-white p-1.5 rounded-xl border border-slate-300 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={qrCodeApiUrl}
                alt="Pure Max App QR Code"
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                <span>Scan from Phone</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Point any smartphone camera at this code to open the system instantly.
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            id="close-share-dialog-btn"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
