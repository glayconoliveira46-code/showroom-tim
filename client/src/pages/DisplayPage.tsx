import React, { useState, useEffect, useRef } from 'react';
import { AttractMode, MediaPlaylistItem } from '../components/AttractMode';
import { InteractiveHub, PlanOption } from '../components/InteractiveHub';
import { PinModal } from '../components/PinModal';
import { useInactivity } from '../hooks/useInactivity';
import { Smartphone } from 'lucide-react';

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
        setCampaign(data);
        campaignRef.current = data;
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
    if (animState !== 'idle') return;
    setAnimState('closing');

    setTimeout(() => {
      setMode('attract');
      setAnimState('idle');
    }, 600);
  };

  useInactivity({
    timeoutSec: campaign?.inactivity_timeout_sec || 30,
    isActive: mode === 'interactive' && !isPinOpen && !isUnlocked && animState === 'idle',
    onTimeout: () => {
      handleBackToAttract();
    },
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
    </div>
  );
};
