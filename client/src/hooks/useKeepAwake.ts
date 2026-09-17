import { useEffect, useRef, useState, useCallback } from 'react';

export interface KeepAwakeStatus {
  isSupported: boolean;
  isActive: boolean;
  method: 'wake-lock' | 'none';
  requestLock: () => Promise<void>;
}

export function useKeepAwake(): KeepAwakeStatus {
  const [isActive, setIsActive] = useState(false);
  const [method, setMethod] = useState<'wake-lock' | 'none'>('none');
  const wakeLockRef = useRef<any>(null);

  // Requisitar bloqueio de tela via Screen Wake Lock API oficial (iOS 16.4+, Android Chrome, Edge)
  const requestLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    try {
      if (!wakeLockRef.current) {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = lock;
        setIsActive(true);
        setMethod('wake-lock');
        console.log('[WakeLock] Tela travada com sucesso via Screen Wake Lock API');

        lock.addEventListener('release', () => {
          console.log('[WakeLock] Trava de tela liberada pelo sistema');
          wakeLockRef.current = null;
          setIsActive(false);
        });
      } else {
        setIsActive(true);
        setMethod('wake-lock');
      }
    } catch (err: any) {
      // No iOS Safari, a primeira chamada no load pode falhar até o usuário tocar na tela
      console.warn('[WakeLock] Aguardando interação de toque no iOS:', err?.message || err);
    }
  }, []);

  // 3. Gerenciamento ativo de eventos (Touch, Visibilidade e Watchdog)
  useEffect(() => {
    // Tenta ativar imediatamente no carregamento da tela
    requestLock();

    // No iOS Safari, o Wake Lock e o vídeo exigem interação de toque do usuário
    const handleInteraction = () => {
      requestLock();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('touchend', handleInteraction, { passive: true });
    window.addEventListener('click', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleVisibility);

    // Watchdog: reavalia a cada 15 segundos se a tela continua travada
    const watchdog = setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (!wakeLockRef.current) {
          requestLock();
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('touchend', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleVisibility);
      clearInterval(watchdog);

      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (_) {}
        wakeLockRef.current = null;
      }
    };
  }, [requestLock]);

  return {
    isSupported: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    isActive,
    method,
    requestLock
  };
}
