import { useEffect, useState } from 'react';

// Captures Chrome's "install this app" offer (it fires before React starts, so listen at import time).
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isInFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Register the offline service worker (not inside the Claude Artifact frame) */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || isInFrame() || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Cache what this first visit already downloaded so the next launch works offline
        const urls = [location.href.split('#')[0], ...performance.getEntriesByType('resource').map((e) => e.name)];
        reg.active?.postMessage({ type: 'cache', urls });
      })
      .catch(() => {});
  });
}

export interface PwaInstall {
  /** Show an Install button at all */
  available: boolean;
  /** iPhone/iPad: no install popup exists, show how to add it manually */
  manualIos: boolean;
  install: () => Promise<void>;
}

export function usePwaInstall(): PwaInstall {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  const hidden = isStandalone() || isInFrame();
  const manualIos = !hidden && !deferred && isIos();
  return {
    available: !hidden && (deferred !== null || manualIos),
    manualIos,
    install: async () => {
      if (!deferred) return;
      const ev = deferred;
      try {
        await ev.prompt();
        await ev.userChoice;
      } catch {
        // ignored
      }
      deferred = null;
      notify();
    },
  };
}

/** Notices when a newer build is online (compares version.json with this build). */
export function useUpdateAvailable(): { latest: string | null; reload: () => void } {
  const [latest, setLatest] = useState<string | null>(null);
  useEffect(() => {
    if (isInFrame() || typeof window === 'undefined') return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (alive && data.version && data.version !== __APP_VERSION__) setLatest(data.version);
      } catch {
        // offline: nothing to do
      }
    };
    void check();
    const id = window.setInterval(check, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  const reload = () => {
    const done = () => window.location.reload();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((r) => r?.update())
        .catch(() => {})
        .finally(done);
    } else done();
  };
  return { latest, reload };
}
