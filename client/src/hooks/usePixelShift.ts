import { useState, useEffect } from 'react';

interface PixelShiftConfig {
  intervalMs?: number; // Padrão: 60s (60.000ms)
  maxOffsetPx?: number; // Padrão: 3px (imperceptível ao olho humano)
  enabled?: boolean;
}

/**
 * Hook de proteção de tela contra Burn-in e Retenção de Imagem para displays AMOLED / OLED / LCD.
 * Desloca imperceptivelmente os elementos estáticos em uma órbita elíptica contínua,
 * revezando a carga elétrica dos subpixels e impedindo o desgaste pontual permanente.
 */
export function usePixelShift({
  intervalMs = 60000,
  maxOffsetPx = 3,
  enabled = true,
}: PixelShiftConfig = {}) {
  const [shift, setShift] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setShift({ x: 0, y: 0 });
      return;
    }

    // Órbita elíptica de 8 pontos para distribuir o desgaste uniformemente em todas as direções
    const points = [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 3, y: -1 },
      { x: 1, y: -3 },
      { x: -2, y: -2 },
      { x: -3, y: 1 },
      { x: -1, y: 3 },
      { x: 2, y: -2 },
    ];

    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % points.length;
      const point = points[currentIndex];
      const scale = maxOffsetPx / 3;
      setShift({
        x: Math.round(point.x * scale),
        y: Math.round(point.y * scale),
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, maxOffsetPx, enabled]);

  const shiftStyle: React.CSSProperties = {
    transform: `translate(${shift.x}px, ${shift.y}px)`,
    transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform',
  };

  return {
    shiftX: shift.x,
    shiftY: shift.y,
    shiftStyle,
  };
}
