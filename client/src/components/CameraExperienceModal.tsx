import React, { useState, useEffect, useRef } from 'react';
import { Camera, SwitchCamera, X, Sparkles, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { PlanOption } from './InteractiveHub';

interface CameraExperienceModalProps {
  isOpen: boolean;
  modelName: string;
  brand: string;
  currentPlan: PlanOption;
  onClose: () => void;
  onTimeoutReturnToAttract: () => void;
}

export const CameraExperienceModal: React.FC<CameraExperienceModalProps> = ({
  isOpen,
  modelName,
  brand,
  currentPlan,
  onClose,
  onTimeoutReturnToAttract,
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);

  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer de Inatividade PROCON (15 segundos sem toque desliga a câmera e volta à vitrine)
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      console.log('[CameraExperience] Inatividade atingida no visor. Retornando à vitrine...');
      stopCameraStream();
      onTimeoutReturnToAttract();
    }, 15000);
  };

  // Encerra streaming de hardware da câmera
  const stopCameraStream = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      videoStreamRef.current = null;
    }
  };

  // Inicializa o fluxo de vídeo da câmera via WebRTC
  const startCamera = async (mode: 'environment' | 'user') => {
    stopCameraStream();
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      setErrorMessage('Este navegador não suporta acesso direto à câmera.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoStreamRef.current = stream;
      setHasCameraPermission(true);

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play().catch(e => console.warn('Erro ao dar play no visor:', e));
      }
    } catch (err: any) {
      console.warn('[CameraExperience] Erro ao acessar câmera:', err);
      setHasCameraPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Permissão de câmera necessária para testar os sensores do aparelho.'
          : 'Não foi possível inicializar o sensor de câmera do dispositivo.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
      resetInactivityTimer();

      const handleUserTouch = () => {
        resetInactivityTimer();
      };

      window.addEventListener('touchstart', handleUserTouch, { passive: true });
      window.addEventListener('click', handleUserTouch, { passive: true });

      return () => {
        stopCameraStream();
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        window.removeEventListener('touchstart', handleUserTouch);
        window.removeEventListener('click', handleUserTouch);
      };
    } else {
      stopCameraStream();
    }
  }, [isOpen, facingMode]);

  // Alterna entre lente traseira e frontal
  const handleToggleFacingMode = () => {
    resetInactivityTimer();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Disparo de foto com animação de flash e captura de snapshot
  const handleTakePhoto = () => {
    resetInactivityTimer();
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const video = videoElementRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedThumbnail(dataUrl);
        } catch (_) {}
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-fadeIn select-none font-sans">
      
      {/* 1. TOPO: BOTÃO FECHAR + IDENTIFICAÇÃO DO APARELHO */}
      <header 
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)'
        }}
        className="relative z-20 px-4 pb-2 flex items-center justify-between text-white bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      >
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-[#00B5E2] text-[#001438]">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#00B5E2] block">
              Degustação de Câmera
            </span>
            <h2 className="text-sm font-black text-white leading-tight">
              {modelName}
            </h2>
          </div>
        </div>

        <button 
          onClick={() => {
            stopCameraStream();
            onClose();
          }}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
          aria-label="Fechar visor da câmera"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* 2. VISOR DA CÂMERA (WEBRTC) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-neutral-950">
        
        {/* Flash Effect na Captura */}
        {isFlashActive && (
          <div className="absolute inset-0 z-30 bg-white opacity-95 transition-opacity duration-200 pointer-events-none" />
        )}

        {hasCameraPermission ? (
          <video
            ref={videoElementRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-300 ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />
        ) : (
          <div className="p-6 text-center text-white max-w-xs space-y-3 z-10">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold">Acesso à Câmera</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              {errorMessage || 'Toque em "Permitir" quando o navegador solicitar acesso à câmera.'}
            </p>
            <button
              onClick={() => startCamera(facingMode)}
              className="bg-[#00B5E2] text-[#001438] font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        )}

        {/* Retículo de Foco Central */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-24 h-24 border border-white/30 rounded-2xl flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* 3. BARRA DE CONTROLES DA CÂMERA */}
      <div className="relative z-20 px-6 py-3 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between">
        
        {/* Miniatura da Última Foto Capturada */}
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
          {capturedThumbnail ? (
            <img src={capturedThumbnail} alt="Foto" className="w-full h-full object-cover animate-scaleIn" />
          ) : (
            <Sparkles className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Botão Obturador Central */}
        <button
          onClick={handleTakePhoto}
          className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-2xl"
          aria-label="Tirar foto de teste"
        >
          <div className="w-full h-full rounded-full bg-white active:bg-gray-200 transition-colors" />
        </button>

        {/* Botão Alternar Câmera (Traseira / Frontal) */}
        <button
          onClick={handleToggleFacingMode}
          className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          aria-label="Alternar câmera frontal ou traseira"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      {/* 4. TARJA OBRIGATÓRIA PROCON (PREÇO OSTENSIVO QUE NUNCA SOME) */}
      <footer 
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)'
        }}
        className="relative z-20 bg-[#001438] border-t border-[#00B5E2]/40 px-4 py-2.5 shadow-2xl text-white"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3 h-3 text-[#00B5E2]" />
              <span className="text-[9px] uppercase font-bold text-cyan-300 tracking-wider">
                {currentPlan.plan_badge || 'Oferta TIM'}
              </span>
              <span className="text-[8px] text-gray-400 bg-white/10 px-1.5 py-0.2 rounded font-medium">
                Conformidade PROCON
              </span>
            </div>
            <div className="text-base font-black text-[#00B5E2] tracking-tight leading-none">
              {currentPlan.price_installments}
            </div>
            <div className="text-[10px] text-gray-300 font-medium">
              ou R$ {currentPlan.price_cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} à vista
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="bg-[#002B7F] hover:bg-[#0038A8] text-white text-[11px] font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Ver Mais Ofertas
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
