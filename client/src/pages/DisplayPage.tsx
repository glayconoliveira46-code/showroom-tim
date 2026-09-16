import React, { useState, useEffect, useRef } from 'react';
import { AttractMode, MediaPlaylistItem } from '../components/AttractMode';
import { InteractiveHub, PlanOption } from '../components/InteractiveHub';
import { PinModal } from '../components/PinModal';
import { useInactivity } from '../hooks/useInactivity';
import { Smartphone, Maximize, Lock, ShieldCheck, Sparkles, X, CheckCircle2, ChevronRight } from 'lucide-react';

interface DeviceItem {
  id: string;
  brand: string;
  model_name: string;
}

interface StoreItem {
  id: string;
  name: string;
  city: string;
}

interface CampaignData {
  id: string;
  title: string;
  model_name: string;
  brand: string;
  tagline: string;
  video_url: string;
  media_playlist?: MediaPlaylistItem[];
  inactivity_timeout_sec: number;
  plans_pricing: PlanOption[];
  colors: Array<{ name: string; hex: string }>;
  highlights: Array<{ id: string; title: string; desc: string; icon: string }>;
  specs: Record<string, string>;
  store_pin: string;
  available_devices?: DeviceItem[];
  available_stores?: StoreItem[];
  current_store?: StoreItem | null;
}

export const DisplayPage: React.FC = () => {
  const [mode, setMode] = useState<'attract' | 'interactive'>('attract');
  const [animState, setAnimState] = useState<'idle' | 'opening' | 'closing'>('idle');
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const campaignRef = useRef<CampaignData | null>(null);

  // Identidade fixa do pedestal (Query param > LocalStorage > Default)
  const getInitialDeviceId = () => {
    const params = new URLSearchParams(window.location.search);
    const paramDev = params.get('device');
    if (paramDev) {
      localStorage.setItem('showroom_device_id', paramDev);
      return paramDev;
    }
    return localStorage.getItem('showroom_device_id') || 'samsung-s24-ultra';
  };

  const getInitialStoreId = () => {
    const params = new URLSearchParams(window.location.search);
    const paramStore = params.get('store');
    if (paramStore) {
      localStorage.setItem('showroom_store_id', paramStore);
      return paramStore;
    }
    return localStorage.getItem('showroom_store_id') || '';
  };

  const [pedestalDeviceId, setPedestalDeviceId] = useState<string>(getInitialDeviceId);
  const [pedestalStoreId, setPedestalStoreId] = useState<string>(getInitialStoreId);

  const loadCampaign = async (devId = pedestalDeviceId, storeId = pedestalStoreId) => {
    try {
      const url = `/api/display/campaign?device_id=${encodeURIComponent(devId)}&store_id=${encodeURIComponent(storeId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const prev = JSON.stringify(campaignRef.current);
        const next = JSON.stringify(data);
        if (prev !== next) {
          setCampaign(data);
          campaignRef.current = data;
        }
      }
    } catch (err) {
      console.warn('Usando dados offline', err);
    }
  };

  const handleSavePedestalConfig = (newDeviceId: string, newStoreId: string) => {
    setPedestalDeviceId(newDeviceId);
    setPedestalStoreId(newStoreId);
    localStorage.setItem('showroom_device_id', newDeviceId);
    if (newStoreId) localStorage.setItem('showroom_store_id', newStoreId);
    else localStorage.removeItem('showroom_store_id');
    loadCampaign(newDeviceId, newStoreId);
    showToast(`Pedestal configurado: ${newDeviceId}`);
  };

  useEffect(() => {
    loadCampaign();

    const eventSource = new EventSource('/api/display/stream');

    eventSource.onmessage = (e) => {
      try {
        const eventData = JSON.parse(e.data);
        const currentId = campaignRef.current?.id;

        // IMPORTANTE: Só atualiza se a transmissão for especificamente para ESTE smartphone!
        if (eventData.type === 'CAMPAIGN_UPDATE') {
          if (eventData.payload.id === currentId) {
            setCampaign(eventData.payload);
            campaignRef.current = eventData.payload;
            showToast(`Ofertas de vitrine do ${eventData.payload.model_name} atualizadas pelo Admin TIM!`);
          }
        } else if (eventData.type === 'PLANS_UPDATE') {
          if (!eventData.payload.device_id || eventData.payload.device_id === currentId) {
            setCampaign(prev => {
              if (!prev) return null;
              const updated = {
                ...prev,
                plans_pricing: eventData.payload.plans_pricing
              };
              campaignRef.current = updated;
              return updated;
            });
            showToast('Tabela de planos deste smartphone atualizada pelo Admin TIM!');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Polling resiliente a cada 6 segundos para garantir sincronização no Vercel Serverless
    const pollInterval = setInterval(() => {
      loadCampaign();
    }, 6000);

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
    };
  }, [pedestalDeviceId, pedestalStoreId]);

  // Screen Wake Lock para manter a tela do celular sempre acesa no pedestal da loja
  useEffect(() => {
    let wakeLock: any = null;
    const acquireWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Screen Wake Lock ativo: tela não apagará na loja');
        } catch (e) {
          console.warn('Wake lock não disponível:', e);
        }
      }
    };
    acquireWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') acquireWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Se veio via escaneamento de QR Code (?auto=1), abre o assistente de vitrine
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === '1') {
      setShowKioskModal(true);
    }

    const handleFsChange = () => {
      setIsFullscreenActive(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFsChange);
      if (wakeLock) {
        try { wakeLock.release(); } catch (_) {}
      }
    };
  }, []);

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );

  const handleTriggerFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreenActive(true);
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
        setIsFullscreenActive(true);
      }
    } catch (err) {
      console.warn('Erro ao entrar em fullscreen:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenHub = () => {
    if (animState !== 'idle') return;
    setAnimState('opening');

    setTimeout(() => {
      setMode('interactive');
      setAnimState('idle');
    }, 700);
  };

  const handleBackToAttract = () => {
    setAnimState('closing');

    setTimeout(() => {
      setMode('attract');
      setAnimState('idle');
    }, 600);
  };

  useInactivity({
    timeoutSec: campaign?.inactivity_timeout_sec || 15,
    isActive: mode === 'interactive' && !isPinOpen && !isUnlocked,
    onTimeout: handleBackToAttract,
  });

  const handleTripleTapLogo = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      setIsPinOpen(true);
      tapCountRef.current = 0;
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 1500);
    }
  };

  if (!campaign) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#001438] text-white p-6 text-center">
        <Smartphone className="w-10 h-10 text-[#00B5E2] animate-pulse mb-3" />
        <h2 className="text-base font-bold">Iniciando Showroom TIM...</h2>
      </div>
    );
  }

  // Plano em destaque para exibir na capa (Attract Mode)
  const featuredPlan = campaign.plans_pricing?.find(p => p.is_featured) || campaign.plans_pricing?.[0] || {
    plan_badge: 'Oferta Especial TIM Black',
    price_installments: '12x R$ 458,25 sem juros',
    price_cash: 5499
  };

  const showInteractive = mode === 'interactive' || animState === 'opening' || animState === 'closing';
  const showAttract = mode === 'attract' || animState === 'opening' || animState === 'closing';

  return (
    <div className="relative w-full h-full bg-[#001438] overflow-hidden select-none perspective-kiosk">
      
      {toastMessage && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-[#002B7F] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-center space-x-2 animate-bounce border border-white/20">
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {isUnlocked && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-400 text-black px-4 py-2 flex items-center justify-between text-xs font-bold shadow-md">
          <span>🔓 MODO PROMOTOR ATIVO</span>
          <button 
            onClick={() => { setIsUnlocked(false); handleBackToAttract(); }}
            className="bg-[#002B7F] text-white px-2.5 py-1 rounded-lg text-[10px]"
          >
            Bloquear
          </button>
        </div>
      )}

      <div className="relative w-full h-full">
        {/* MIOLO (Interactive Hub com Simulador de Planos) */}
        {showInteractive && (
          <div 
            className={`absolute inset-0 w-full h-full z-10 ${
              animState === 'opening' ? 'animate-page-flip-in' : ''
            }`}
          >
            <InteractiveHub
              modelName={campaign.model_name}
              brand={campaign.brand}
              tagline={campaign.tagline}
              plansPricing={campaign.plans_pricing || []}
              highlights={campaign.highlights}
              specs={campaign.specs}
              colors={campaign.colors}
              onBackToAttract={handleBackToAttract}
              onTripleTapLogo={handleTripleTapLogo}
            />
          </div>
        )}

        {/* CAPA (Attract Mode com Oferta em Destaque) */}
        {showAttract && (
          <div 
            className={`absolute inset-0 w-full h-full z-20 ${
              animState === 'opening' ? 'animate-page-flip-out' : ''
            } ${
              animState === 'closing' ? 'animate-page-flip-back' : ''
            }`}
          >
            <AttractMode
              modelName={campaign.model_name}
              tagline={campaign.tagline}
              planBadge={featuredPlan.plan_badge}
              priceInstallments={featuredPlan.price_installments}
              priceCash={featuredPlan.price_cash}
              videoUrl={campaign.video_url}
              mediaPlaylist={campaign.media_playlist}
              onScreenTouch={handleOpenHub}
            />
          </div>
        )}
      </div>

      <PinModal
        isOpen={isPinOpen}
        correctPin={campaign.store_pin || '1234'}
        currentDeviceId={campaign.id}
        currentStoreId={campaign.current_store?.id || ''}
        availableDevices={campaign.available_devices || []}
        availableStores={campaign.available_stores || []}
        onClose={() => setIsPinOpen(false)}
        onSavePedestalConfig={handleSavePedestalConfig}
        onSuccess={() => {
          setIsPinOpen(false);
          setIsUnlocked(true);
          setTimeout(() => {
            setIsUnlocked(false);
            handleBackToAttract();
          }, 5 * 60 * 1000);
        }}
      />

      {/* BOTÃO FLUTUANTE DISCRETO PARA ATIVAR TELA CHEIA / AJUSTAR PEDESTAL SE NÃO ESTIVER EM FULLSCREEN */}
      {!isFullscreenActive && !isStandalone && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowKioskModal(true)}
            className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-md hover:bg-black/80 border border-white/20 text-white/90 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg transition-transform active:scale-95"
          >
            <Maximize className="w-3.5 h-3.5 text-[#00B5E2]" />
            <span>Blindar Vitrine / Tela Cheia</span>
          </button>
        </div>
      )}

      {/* MODAL DE ASSISTENTE DE PROVISIONAMENTO E BLINDAGEM (KIOSK ASSISTANT) */}
      {showKioskModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-[#00B5E2]/40 w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#002B7F] flex items-center justify-center text-[#00B5E2] shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide text-white uppercase">Provisionamento TIM</h3>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                    <span>Pedestal Vinculado</span>
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowKioskModal(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações da Identidade da Bancada */}
            <div className="bg-[#0E1B33] p-3.5 rounded-2xl border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Smartphone:</span>
                <span className="font-bold text-white">{campaign.brand} {campaign.model_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Loja / Ponto:</span>
                <span className="font-bold text-[#00B5E2]">{campaign.current_store?.name || 'Flagship TIM'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tela Sempre Acesa:</span>
                <span className="font-bold text-emerald-400">Wake Lock Ativo ✅</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Proteção de Tela:</span>
                <span className="font-bold text-emerald-400">Anti-Burn-in & Pixel Shift Ativo 🛡️</span>
              </div>
            </div>

            {/* Instruções Dinâmicas para Android vs iOS */}
            {isIOS ? (
              <div className="space-y-3 bg-[#112244]/60 p-4 rounded-2xl border border-blue-500/20 text-xs">
                <div className="flex items-center space-x-2 text-[#00B5E2] font-black uppercase text-[11px]">
                  <span>🍏 Blindagem no iPhone (iOS)</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  1. Toque em <strong>Compartilhar (ícone do meio)</strong> no Safari e escolha <strong>"Adicionar à Tela de Início"</strong>.
                </p>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  2. Abra pelo ícone e aperte <strong>3 vezes o botão lateral</strong> para ativar o <strong>Acesso Guiado</strong> com senha. O cliente não conseguirá sair!
                </p>
              </div>
            ) : (
              <div className="space-y-3 bg-[#112244]/60 p-4 rounded-2xl border border-blue-500/20 text-xs">
                <div className="flex items-center space-x-2 text-[#00B5E2] font-black uppercase text-[11px]">
                  <span>🤖 Blindagem no Android (Motorola / Samsung)</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  1. Toque no botão azul abaixo para <strong>entrar em Tela Cheia</strong>.
                </p>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  2. Para impedir que clientes fechem o app: Abra os <strong>apps recentes</strong>, toque no ícone do aplicativo e escolha <strong>"Fixar app 📌"</strong>.
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="space-y-2 pt-2">
              <button
                onClick={async () => {
                  await handleTriggerFullscreen();
                  setShowKioskModal(false);
                }}
                className="w-full py-3 bg-[#00B5E2] hover:bg-[#009dc4] text-[#001438] font-black text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <Maximize className="w-4 h-4" />
                <span>Ativar Modo Vitrine (Tela Cheia)</span>
              </button>

              <button
                onClick={() => setShowKioskModal(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-2xl transition-colors"
              >
                Fechar Assistente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
