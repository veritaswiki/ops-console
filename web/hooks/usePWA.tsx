import React from 'react';
import { Download, WifiOff } from 'lucide-react';
import { Button, ModalShell, PresenceBanner } from '../components/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal in non-HTTPS / embedded sandbox preview
    });
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void install()}
        className="w-full justify-center mt-2.5"
      >
        <Download className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
        安装桌面 / 移动值班台
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowIOSGuide(true)}
          className="w-full justify-center mt-2.5"
        >
          <Download className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
          添加到主屏幕 (iOS)
        </Button>
        <ModalShell
          open={showIOSGuide}
          onOpenChange={setShowIOSGuide}
          size="sm"
          title="安装到 iPhone / iPad 主屏幕"
        >
          <div className="p-5">
            <ol className="space-y-2 text-[13px] text-[var(--ink-muted)] leading-relaxed list-decimal pl-4">
              <li>点击 Safari 底部工具栏的「分享」图标。</li>
              <li>向下滑动并选择「添加到主屏幕」。</li>
              <li>点击右上角「添加」，即可独立全屏运行 Ops Console。</li>
            </ol>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" size="md" onClick={() => setShowIOSGuide(false)}>
                知道了
              </Button>
            </div>
          </div>
        </ModalShell>
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <PresenceBanner
      open={!isOnline}
      edge="bottom"
      role="status"
      ariaLive="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-[var(--warn-border)] bg-[var(--surface-elevated)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--warn)] shadow-[var(--shadow-modal)] select-none"
    >
      <WifiOff className="size-4 shrink-0" strokeWidth={1.75} />
      <span>离线模式 · 正在展示缓存的界面外壳</span>
    </PresenceBanner>
  );
}
