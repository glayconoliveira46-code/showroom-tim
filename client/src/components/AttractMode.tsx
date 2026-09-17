import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, ArrowRight, Film, Image as ImageIcon, Clock } from 'lucide-react';
import { usePixelShift } from '../hooks/usePixelShift';

export interface MediaPlaylistItem {
  id: string;
  title: string;
  type: 'video' | 'image';
  url: string;
  duration_sec?: number;
  is_active?: boolean;
  object_fit?: 'cover' | 'contain' | 'blur_fill';
  position_x?: number; // 0 - 100% (default 50)
  position_y?: number; // 0 - 100% (default 50)
  scale?: number; // 1.0 - 2.5 (default 1.0)
}

function formatMediaDuration(sec?: number): string {
  const s = sec || 7;
  return `${s}s`;
}

interface AttractModeProps {
  modelName: string;
  tagline: string;
  planBadge: string;
  priceInstallments: string;
  priceCash?: number;
  videoUrl?: string;
  mediaPlaylist?: MediaPlaylistItem[];
  onScreenTouch: () => void;
}

export const AttractMode: React.FC<AttractModeProps> = ({
  modelName,
  tagline,
  planBadge,
  priceInstallments,
  priceCash = 6499,
  videoUrl = '/s24-video.mp4',
  mediaPlaylist = [],
  onScreenTouch,
}) => {
  // Filtra itens ativos da playlist. Se vazia, fallback para o vídeo padrão
  const activeItems = useMemo(() => {
    const active = (mediaPlaylist || []).filter(item => item.is_active !== false);
    if (active.length > 0) return active;
    return [
      {
        id: 'fallback-video',
        title: modelName,
        type: 'video' as const,
        url: videoUrl || '/s24-video.mp4',
        duration_sec: 15,
        is_active: true
      }
    ];
  }, [mediaPlaylist, videoUrl, modelName]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const videoRefs = useRef<{ [id: string]: HTMLVideoElement | null }>({});

  // Motor Anti-Burn-in (Pixel Shift contínuo para displays AMOLED/OLED/LCD)
  const { shiftStyle } = usePixelShift({ intervalMs: 60000, maxOffsetPx: 3 });

  // Garante que o índice não fique fora dos limites se a playlist mudar
  const safeIndex = currentIndex < activeItems.length ? currentIndex : 0;
  const currentItem = activeItems[safeIndex];

  // Função para avançar suavemente para a próxima mídia da playlist
  const advanceNext = () => {
    if (activeItems.length <= 1) return;
    setMediaLoaded(false);
    setCurrentIndex(prev => (prev + 1) % activeItems.length);
  };

  // Timer para mídias do tipo 'image' (pôsteres/fotos)
  // Suporta segundos, minutos e HORAS (ex: 3600s = 1 hora)
  useEffect(() => {
    if (!currentItem || currentItem.type !== 'image' || activeItems.length <= 1) {
      return;
    }

    const duration = (currentItem.duration_sec || 7) * 1000;
    const timer = setTimeout(() => {
      advanceNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [safeIndex, currentItem, activeItems.length]);

  // Controle de ativação e reprodução sem destruir o decoder de hardware do Android
  useEffect(() => {
    activeItems.forEach((item, idx) => {
      if (item.type === 'video') {
        const v = videoRefs.current[item.id];
        if (v) {
          v.defaultMuted = true;
          v.muted = true;
          v.playsInline = true;
          v.setAttribute('muted', '');
          v.setAttribute('playsinline', '');
          v.setAttribute('webkit-playsinline', 'true');

          if (idx === safeIndex) {
            // Reinicia o cursor e dá play no item ativo
            if (v.duration > 0 && v.currentTime >= v.duration - 0.2) {
              v.currentTime = 0;
            }
            const p = v.play();
            if (p !== undefined) {
              p.then(() => setIsVideoPlaying(true)).catch(() => {
                setIsVideoPlaying(false);
              });
            }
          } else {
            // Pausa vídeos em background para economizar GPU/Decoder
            v.pause();
          }
        }
      }
    });
  }, [safeIndex, activeItems]);

  // Desbloqueio global no primeiro toque (requisito de PWA/Standalone no iOS e Chrome Android)
  useEffect(() => {
    const handleGlobalUnlock = () => {
      const active = activeItems[safeIndex];
      if (active?.type === 'video') {
        const v = videoRefs.current[active.id];
        if (v && v.paused) {
          v.defaultMuted = true;
          v.muted = true;
          v.play().then(() => setIsVideoPlaying(true)).catch(() => {});
        }
      }
    };

    window.addEventListener('touchstart', handleGlobalUnlock, { passive: true, once: true });
    window.addEventListener('click', handleGlobalUnlock, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', handleGlobalUnlock);
      window.removeEventListener('click', handleGlobalUnlock);
    };
  }, [safeIndex, activeItems]);

  // Watchdog Ativo Anti-Congelamento (Recupera automaticamente se o Android/iOS travar o vídeo)
  const lastTimeRef = useRef<number>(-1);
  const stallCountRef = useRef<number>(0);

  useEffect(() => {
    const active = activeItems[safeIndex];
    if (active?.type !== 'video') return;

    const v = videoRefs.current[active.id];
    if (!v) return;

    const watchdogTimer = setInterval(() => {
      if (document.hidden) return;

      const isAtEnd = v.duration > 0 && v.currentTime >= v.duration - 0.2;

      // 1. Se estiver pausado ou no fim, reinicia o cursor e retoma a reprodução
      if (v.paused || isAtEnd || v.ended) {
        if (isAtEnd || v.ended) {
          if (activeItems.length > 1) {
            advanceNext();
            return;
          } else {
            v.currentTime = 0;
          }
        }
        v.defaultMuted = true;
        v.muted = true;
        v.play()
          .then(() => setIsVideoPlaying(true))
          .catch(() => {});
        return;
      }

      // 2. Detecção de estagnação de cursor (congelamento de hardware)
      if (Math.abs(v.currentTime - lastTimeRef.current) < 0.05) {
        stallCountRef.current += 1;
        // Se ficar parado por 2 verificações (2 segundos)
        if (stallCountRef.current >= 2) {
          console.warn('[VideoWatchdog] Estagnação detectada no player. Forçando retomada...');
          stallCountRef.current = 0;
          if (isAtEnd) {
            v.currentTime = 0;
          }
          v.play()
            .then(() => setIsVideoPlaying(true))
            .catch(() => {
              v.currentTime = 0;
              v.play().catch(() => {});
            });
        }
      } else {
        stallCountRef.current = 0;
        lastTimeRef.current = v.currentTime;
        if (!isVideoPlaying) {
          setIsVideoPlaying(true);
        }
      }
    }, 1000);

    return () => clearInterval(watchdogTimer);
  }, [safeIndex, activeItems, isVideoPlaying]);

  // Função auxiliar para calcular enquadramento de cada mídia
  const getMediaStyle = (item: MediaPlaylistItem): React.CSSProperties => {
    const posX = item?.position_x ?? 50;
    const posY = item?.position_y ?? 50;
    const scale = item?.scale ?? 1;
    const fitMode = item?.object_fit || 'cover';
    const isBlur = fitMode === 'blur_fill';

    return {
      objectFit: isBlur ? 'contain' : (fitMode === 'contain' ? 'contain' : 'cover'),
      objectPosition: `${posX}% ${posY}%`,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: `${posX}% ${posY}%`,
      pointerEvents: 'none'
    };
  };

  const handleScreenInteraction = () => {
    const active = activeItems[safeIndex];
    if (active?.type === 'video') {
      const v = videoRefs.current[active.id];
      if (v && v.paused) {
        v.defaultMuted = true;
        v.muted = true;
        v.play().then(() => setIsVideoPlaying(true)).catch(() => {});
        return;
      }
    }

    onScreenTouch();
  };

  return (
    <div 
      className="relative w-full h-full bg-[#001233] text-white overflow-hidden cursor-pointer select-none font-sans flex flex-col justify-between"
      onClick={handleScreenInteraction}
    >
      {/* 1. MÍDIAS ATIVAS (VÍDEO E IMAGENS) COM CAMADAS PERSISTENTES EM GPU & TRANSIÇÃO SUAVE */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden bg-black transform-gpu"
        style={{ transform: 'translateZ(0)' }}
      >
        {activeItems.map((item, idx) => {
          const isActive = idx === safeIndex;
          const mediaStyle = getMediaStyle(item);
          const isBlurFill = (item.object_fit || 'cover') === 'blur_fill';

          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Efeito Ambiental Borrado Otimizado para GPU */}
              {isBlurFill && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                  {item.type === 'video' ? (
                    <video
                      src={item.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover filter blur-lg scale-110 opacity-50"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover filter blur-lg scale-110 opacity-50"
                    />
                  )}
                </div>
              )}

              {item.type === 'video' ? (
                <video
                  ref={(el) => {
                    videoRefs.current[item.id] = el;
                  }}
                  src={item.url}
                  autoPlay
                  loop={activeItems.length === 1}
                  muted
                  playsInline
                  // @ts-ignore
                  webkit-playsinline="true"
                  preload="auto"
                  style={mediaStyle}
                  onCanPlay={(e) => {
                    setMediaLoaded(true);
                    if (isActive) {
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  onLoadedData={(e) => {
                    setMediaLoaded(true);
                    if (isActive) {
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  onPlay={() => {
                    setMediaLoaded(true);
                    if (isActive) {
                      setIsVideoPlaying(true);
                    }
                  }}
                  onPause={(e) => {
                    if (!isActive) return;
                    const v = e.currentTarget;
                    if (!v || document.hidden) return;

                    // Se pausou na fronteira do fim
                    if (v.duration > 0 && v.currentTime >= v.duration - 0.2) {
                      if (activeItems.length > 1) {
                        advanceNext();
                      } else {
                        v.currentTime = 0;
                        v.play().then(() => setIsVideoPlaying(true)).catch(() => {});
                      }
                    } else {
                      setIsVideoPlaying(false);
                      // Retomada resiliente
                      v.play().then(() => setIsVideoPlaying(true)).catch(() => {});
                    }
                  }}
                  onStalled={(e) => {
                    if (isActive) {
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  onError={(e) => {
                    console.warn('Erro ao reproduzir vídeo na bancada:', e);
                    setMediaLoaded(true);
                    if (activeItems.length > 1) {
                      setTimeout(() => advanceNext(), 2000);
                    }
                  }}
                  onEnded={(e) => {
                    const v = e.currentTarget;
                    if (activeItems.length > 1) {
                      advanceNext();
                    } else {
                      v.currentTime = 0;
                      v.play().catch(() => {});
                    }
                  }}
                  onTimeUpdate={(e) => {
                    if (!isActive) return;
                    const v = e.currentTarget;
                    // Se tiver mais de 1 item, avança antes do fim para crossfade imperceptível
                    if (activeItems.length > 1 && v.duration > 0 && v.currentTime >= v.duration - 0.2) {
                      advanceNext();
                    }
                  }}
                  className="w-full h-full relative z-10"
                />
              ) : (
                <div className="w-full h-full relative z-10 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.url}
                    alt={item.title}
                    style={mediaStyle}
                    onLoad={() => setMediaLoaded(true)}
                    onError={(e) => {
                      console.warn('Erro ao carregar imagem na vitrine:', item.url);
                      setMediaLoaded(true);
                      if (activeItems.length > 1) {
                        advanceNext();
                      } else {
                        (e.currentTarget as HTMLImageElement).src = '/posters/tim-5g-standalone.svg';
                      }
                    }}
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>
          );
        })}
        
        {/* Degradê nos Extremos para Garantir Alto Contraste e Leitura dos Textos */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00102E] via-transparent to-[#001438]/85 pointer-events-none z-10" />
      </div>

      {/* 2. HEADER ULTRA-MINIMALISTA COM MOTOR ANTI-BURN-IN (PIXEL SHIFT) E SAFE AREA */}
      <header 
        style={{
          ...shiftStyle,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)'
        }}
        className="relative z-10 px-6 pb-2 pointer-events-none flex items-center justify-end"
      >
        {planBadge && (
          <div className="bg-[#002B7F]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 flex items-center space-x-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B5E2] animate-ping" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-white">
              {planBadge}
            </span>
          </div>
        )}
      </header>

      {/* 3. ESPAÇO CENTRAL LIVRE PARA O VÍDEO / PÔSTER COM INDICADOR SE ESTIVER PAUSADO PELO IOS */}
      <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none">
        {!isVideoPlaying && currentItem?.type === 'video' && (
          <div className="bg-[#001438]/85 backdrop-blur-md px-5 py-3 rounded-2xl border border-[#00B5E2]/40 flex items-center space-x-2.5 animate-pulse shadow-2xl pointer-events-auto cursor-pointer">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00B5E2] animate-ping" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Toque na tela para iniciar a vitrine
            </span>
          </div>
        )}
      </div>

      {/* 4. RODAPÉ DE ALTO IMPACTO (OFERTA + BOTÃO ENCARTE COM PIXEL SHIFT E SAFE AREA) */}
      <footer 
        style={{
          ...shiftStyle,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)'
        }}
        className="relative z-10 px-6 pt-3 pointer-events-none max-w-2xl mx-auto w-full"
      >
        
        {/* Nome do Aparelho & Tagline */}
        <div className="mb-3 text-left">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00B5E2] block">
            Destaque em Loja
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
            {modelName}
          </h1>
          <p className="text-xs md:text-sm text-blue-100 font-medium drop-shadow max-w-[340px] md:max-w-[480px]">
            {tagline}
          </p>
        </div>

        {/* Card de Preço em Glassmorphism Otimizado para GPU */}
        <div className="bg-black/75 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 mb-3 flex items-center justify-between shadow-2xl">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-blue-200 block">
              {planBadge || 'Oferta em Destaque'}
            </span>
            <div className="text-2xl font-black text-[#00B5E2] tracking-tight leading-none mt-0.5">
              {priceInstallments}
            </div>
            <span className="text-[10px] text-gray-300 font-medium mt-0.5 block">
              ou R$ {priceCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} à vista
            </span>
          </div>

          <div className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 text-right">
            <span className="text-[9px] font-bold text-white block">Sem juros</span>
            <span className="text-[8px] text-blue-200 block">no cartão</span>
          </div>
        </div>

        {/* Botão Chamativo de Toque com Efeito Encarte */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onScreenTouch();
          }}
          className="w-full bg-[#00B5E2] hover:bg-[#00c8f8] active:scale-98 text-[#001438] py-3.5 px-6 rounded-2xl shadow-[0_0_25px_rgba(0,181,226,0.4)] flex items-center justify-center space-x-2 transition-all cursor-pointer pointer-events-auto"
        >
          <Sparkles className="w-4 h-4 text-[#001438] fill-[#001438]" />
          <span className="text-xs font-black uppercase tracking-wider">
            Toque para experimentar
          </span>
          <ArrowRight className="w-4 h-4 text-[#001438]" />
        </div>

        <span className="text-[9px] text-blue-200/80 text-center block mt-2 font-medium drop-shadow">
          Toque para folhear a ficha técnica e os recursos completos
        </span>
      </footer>
    </div>
  );
};
