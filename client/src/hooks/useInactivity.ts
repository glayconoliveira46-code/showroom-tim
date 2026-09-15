import { useEffect, useRef } from 'react';

interface UseInactivityProps {
  timeoutSec: number;
  onTimeout: () => void;
  isActive: boolean;
}

export function useInactivity({ timeoutSec, onTimeout, isActive }: UseInactivityProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isActive) {
      timerRef.current = setTimeout(() => {
        onTimeout();
      }, timeoutSec * 1000);
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['pointerdown', 'touchstart', 'scroll', 'click', 'keydown'];
    
    // Inicia o timer
    resetTimer();

    const handleUserActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [timeoutSec, isActive, onTimeout]);
}
