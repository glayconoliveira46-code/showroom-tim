import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimLogo } from './TimLogo';
import { Sparkles, ArrowRight, Film, Image as ImageIcon, Clock } from 'lucide-react';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

    // Duração configurada da foto em segundos (padrão 1 hora se não especificado)
    const duration = (currentItem.duration_sec || 7) * 1000;
    const timer = setTimeout(() => {
      advanceNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [safeIndex, currentItem, activeItems.length]);

  // Configurações de Enquadramento e Dimensionamento Visual da Mídia
  const posX = currentItem?.position_x ?? 50;
  const posY = currentItem?.position_y ?? 50;
  const scale = currentItem?.scale ?? 1;
  const fitMode = currentItem?.object_fit || 'cover';
  const isBlurFill = fitMode === 'blur_fill';

  const mediaStyle: React.CSSProperties = {
    objectFit: isBlurFill ? 'contain' : (fitMode === 'contain' ? 'contain' : 'cover'),
    objectPosition: `${posX}% ${posY}%`,
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: `${posX}% ${posY}%`
  };

  return (
    <div 
      className="relative w-full h-full bg-[#001233] text-white overflow-hidden cursor-pointer select-none font-sans flex flex-col justify-between"
      onClick={onScreenTouch}
      onTouchStart={onScreenTouch}
    >
      {/* 1. MÍDIA ATIVA (VÍDEO OU IMAGEM) COM TRANSIÇÃO SUAVE & ENQUADRAMENTO */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        {/* Fundo com Efeito Ambiental Borrado (Para vídeos horizontais na tela vertical) */}
        {isBlurFill && currentItem && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {currentItem.type === 'video' ? (
              <video
                key={`blur-${currentItem.id}-${currentItem.url}`}
                src={currentItem.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover filter blur-2xl scale-125 opacity-60"
              />
            ) : (
              <img
                key={`blur-img-${currentItem.id}-${currentItem.url}`}
                src={currentItem.url}
                alt=""
                className="w-full h-full object-cover filter blur-2xl scale-125 opacity-60"
              />
            )}
          </div>
        )}

        {currentItem?.type === 'video' ? (
          <video
            ref={videoRef}
            key={`vid-${currentItem.id}-${currentItem.url}`}
            src={currentItem.url}
            autoPlay
            loop={activeItems.length === 1}
            muted
            playsInline
            preload="auto"
            style={mediaStyle}
            onCanPlay={() => setMediaLoaded(true)}
            onLoadedData={() => setMediaLoaded(true)}
            onPlay={() => setMediaLoaded(true)}
            onError={(e) => {
              console.warn('Erro ao reproduzir vídeo na bancada:', e);
              setMediaLoaded(true);
              if (activeItems.length > 1) {
                setTimeout(() => advanceNext(), 3000);
              }
            }}
            onEnded={() => {
              // Respeita estritamente a duração real integral do vídeo antes de trocar
              if (activeItems.length > 1) {
                advanceNext();
              }
            }}
            onTimeUpdate={(e) => {
              // Fallback de segurança caso o navegador trave o evento onEnded no último frame
              const v = e.currentTarget;
              if (activeItems.length > 1 && v.duration > 0 && v.currentTime >= v.duration - 0.15) {
                advanceNext();
              }
            }}
            className={`w-full h-full relative z-10 transition-opacity duration-700 ${
              mediaLoaded ? 'opacity-90' : 'opacity-30'
            }`}
          />
        ) : (
          <div className="w-full h-full relative z-10 overflow-hidden flex items-center justify-center">
            <img
              key={`img-${currentItem.id}-${currentItem.url}`}
              src={currentItem.url}
              alt={currentItem.title}
              style={mediaStyle}
              onLoad={() => setMediaLoaded(true)}
              className={`w-full h-full transition-all duration-1000 transform ${
                mediaLoaded ? 'opacity-95' : 'opacity-0'
              }`}
            />
          </div>
        )}
        
        {/* Degradê nos Extremos para Garantir Alto Contraste e Leitura dos Textos */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00102E] via-transparent to-[#001438]/85 pointer-events-none" />
      </div>

      {/* 2. HEADER MINIMALISTA COM LOGO OFICIAL TIM & BARRAS DE PROGRESSO DA PLAYLIST */}
      <header className="relative z-10 px-6 pt-6 pb-2 pointer-events-none space-y-3">
        {/* Indicador de Múltiplas Mídias em Formato de Histórias / Slides */}
        {activeItems.length > 1 && (
          <div className="flex items-center space-x-1.5 w-full">
            {activeItems.map((item, idx) => (
              <div 
                key={item.id || idx}
                className="h-1 flex-1 rounded-full overflow-hidden bg-white/20 backdrop-blur-md"
              >
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    idx === safeIndex 
                      ? 'bg-[#00B5E2] w-full shadow-[0_0_8px_#00B5E2]' 
                      : idx < safeIndex 
                        ? 'bg-white/80 w-full' 
                        : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TimLogo className="h-5 w-auto" variant="white" />
          </div>

          <div className="flex items-center space-x-2">
            {/* Tag discreta com tipo de mídia e tempo */}
            {activeItems.length > 1 && (
              <div className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center space-x-1.5 text-[9px] text-gray-300">
                {currentItem?.type === 'video' ? (
                  <>
                    <Film className="w-2.5 h-2.5 text-[#00B5E2]" />
                    <span>Vídeo ({safeIndex + 1}/{activeItems.length})</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-2.5 h-2.5 text-amber-400" />
                    <span>{formatMediaDuration(currentItem.duration_sec)} ({safeIndex + 1}/{activeItems.length})</span>
                  </>
                )}
              </div>
            )}

            <div className="bg-[#002B7F]/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center space-x-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B5E2] animate-ping" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-white">
                {planBadge}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. ESPAÇO CENTRAL LIVRE PARA O VÍDEO / PÔSTER */}
      <div className="relative z-10 flex-1 pointer-events-none" />

      {/* 4. RODAPÉ DE ALTO IMPACTO (OFERTA + BOTÃO ENCARTE) */}
      <footer className="relative z-10 px-6 pb-6 pt-3 pointer-events-none">
        
        {/* Nome do Aparelho & Tagline */}
        <div className="mb-3 text-left">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00B5E2] block">
            Samsung Flagship
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
            {modelName}
          </h1>
          <p className="text-xs text-blue-100 font-medium drop-shadow max-w-[300px]">
            {tagline}
          </p>
        </div>

        {/* Card de Preço em Glassmorphism */}
        <div className="bg-black/55 backdrop-blur-xl rounded-2xl p-3.5 border border-white/20 mb-3 flex items-center justify-between shadow-2xl">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-blue-200 block">
              Oferta TIM Black
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
        <div className="w-full bg-[#00B5E2] hover:bg-[#00c8f8] text-[#001438] py-3.5 px-6 rounded-2xl shadow-[0_0_25px_rgba(0,181,226,0.4)] flex items-center justify-center space-x-2 transition-all">
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
