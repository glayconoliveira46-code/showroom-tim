import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityProps {
  timeoutSec: number;
  onTimeout: () => void;
  isActive: boolean;
}

export function useInactivity({ timeoutSec, onTimeout, isActive }: UseInactivityProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Mantém a referência da função sem reiniciar o timer a cada render
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isActive) {
      timerRef.current = setTimeout(() => {
        console.log('[Inactivity] Timeout atingido, retornando à vitrine...');
        if (onTimeoutRef.current) {
          onTimeoutRef.current();
        }
      }, Math.max(5, timeoutSec) * 1000);
    }
  }, [isActive, timeoutSec]);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Inicia o timer imediatamente quando a tela interativa fica ativa
    resetTimer();

    const events = ['pointerdown', 'touchstart', 'touchmove', 'scroll', 'click', 'keydown'];
    
    const handleUserActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isActive, timeoutSec, resetTimer]);
}
