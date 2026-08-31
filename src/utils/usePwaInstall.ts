/**
 * Install-as-app support for Pure Max Factory OS.
 *
 * The app already ships a web app manifest (`display: standalone`), a service
 * worker and 192/512 icons, so a supported browser can install it as a real,
 * chrome-less application with its own launcher icon — not a browser bookmark.
 *
 * Chrome/Edge/Android expose a `beforeinstallprompt` event we can replay when
 * the user asks to install. iOS Safari does NOT expose it, so there we can only
 * show the manual Share → Add to Home Screen path.
 */

import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'puremax_app_install_dismissed_v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const isIosDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac with touch support
  const iPadOS = navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
  return iOS || iPadOS;
};

/** True when the app is already running as an installed app. */
export const isRunningInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if ((navigator as any).standalone === true) return true;
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return true;
  } catch {
    /* ignore */
  }
  return false;
};

export interface PwaInstallState {
  /** Already installed and running as an app — hide install prompts. */
  installed: boolean;
  /** Install is currently offerable. */
  canInstall: boolean;
  /** iOS cannot install programmatically; show manual instructions instead. */
  needsManualInstructions: boolean;
  /** Trigger the native install flow. */
  install: () => Promise<void>;
  /** Permanently hide the install button on this device. */
  dismiss: () => void;
}

export function usePwaInstall(): PwaInstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isRunningInstalled());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Stop the browser's own mini-infobar so we control the moment.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, 'true');
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    let mq: MediaQueryList | null = null;
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setInstalled(true);
        setDeferred(null);
      }
    };
    try {
      mq = window.matchMedia('(display-mode: standalone)');
      mq.addEventListener?.('change', onChange);
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      try {
        mq?.removeEventListener?.('change', onChange);
      } catch {
        /* ignore */
      }
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        try {
          localStorage.setItem(DISMISS_KEY, 'true');
        } catch {
          /* ignore */
        }
      }
      setDeferred(null);
    } catch (err) {
      console.warn('App install prompt failed:', err);
    }
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const manual = isIosDevice();

  return {
    installed: installed || dismissed,
    canInstall: !installed && !dismissed && (!!deferred || manual),
    needsManualInstructions: manual,
    install,
    dismiss,
  };
}
