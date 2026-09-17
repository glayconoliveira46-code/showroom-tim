import { useEffect, useRef, useState, useCallback } from 'react';

export interface KeepAwakeStatus {
  isSupported: boolean;
  isActive: boolean;
  method: 'wake-lock' | 'video-loop' | 'both' | 'none';
  requestLock: () => Promise<void>;
}

export function useKeepAwake(): KeepAwakeStatus {
  const [isActive, setIsActive] = useState(false);
  const [method, setMethod] = useState<'wake-lock' | 'video-loop' | 'both' | 'none'>('none');
  const wakeLockRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 1. Elemento de vídeo oculto contínuo (NoSleep pattern para iOS Safari)
  useEffect(() => {
    let video = videoRef.current;
    if (!video && typeof document !== 'undefined') {
      video = document.createElement('video');
      video.setAttribute('title', 'TIM Showroom Keep Awake');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('loop', 'true');
      video.muted = true;
      video.loop = true;
      video.preload = 'auto';
      video.src = '/s24-video.mp4';
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.001';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-9999';
      document.body.appendChild(video);
      videoRef.current = video;
    }

    return () => {
      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
        videoRef.current = null;
      }
    };
  }, []);

  // 2. Requisitar bloqueio de tela via Wake Lock API + reprodução do vídeo
  const requestLock = useCallback(async () => {
    let videoPlaying = false;
    let wakeLockAcquired = false;

    // A. Aciona o vídeo de fundo contínuo (blindagem para Safari iOS)
    if (videoRef.current) {
      try {
        if (videoRef.current.paused) {
          await videoRef.current.play();
        }
        videoPlaying = true;
      } catch (err) {
        // Política de autoplay pode aguardar primeiro gesto de toque
      }
    }

    // B. Requisita a Screen Wake Lock API oficial (iOS 16.4+, Android Chrome, Edge)
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!wakeLockRef.current) {
          const lock = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = lock;
          wakeLockAcquired = true;

          lock.addEventListener('release', () => {
            wakeLockRef.current = null;
            setIsActive(false);
          });
        } else {
          wakeLockAcquired = true;
        }
      } catch (err: any) {
        console.warn('Wake Lock aguardando gesto de toque no iOS:', err?.message || err);
      }
    }

    if (wakeLockAcquired && videoPlaying) {
      setIsActive(true);
      setMethod('both');
    } else if (wakeLockAcquired) {
      setIsActive(true);
      setMethod('wake-lock');
    } else if (videoPlaying) {
      setIsActive(true);
      setMethod('video-loop');
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

    // Watchdog: reavalia a cada 20 segundos se a tela continua travada
    const watchdog = setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (!wakeLockRef.current || (videoRef.current && videoRef.current.paused)) {
          requestLock();
        }
      }
    }, 20000);

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
