import React, { useState, useEffect } from 'react';
import { TimLogo } from './TimLogo';
import { Sparkles, Camera, Smartphone, BatteryCharging, ChevronRight, Check, ArrowLeft, ShieldCheck, Tag, CheckCircle2 } from 'lucide-react';

export interface PlanOption {
  id: string;
  plan_name: string;
  plan_badge: string;
  plan_category: string;
  price_cash: number;
  price_installments: string;
  discount_label: string;
  is_featured: boolean;
  is_active?: boolean;
}

interface Highlight {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

interface ColorOption {
  name: string;
  hex: string;
}

interface InteractiveHubProps {
  modelName: string;
  brand: string;
  tagline: string;
  plansPricing: PlanOption[];
  highlights: Highlight[];
  specs: Record<string, string>;
  colors: ColorOption[];
  onBackToAttract: () => void;
  onTripleTapLogo: () => void;
}

export const InteractiveHub: React.FC<InteractiveHubProps> = ({
  modelName,
  brand,
  tagline,
  plansPricing = [],
  highlights,
  specs,
  colors,
  onBackToAttract,
  onTripleTapLogo,
}) => {
  const [activeTab, setActiveTab] = useState<'planos' | 'recursos' | 'ficha' | 'cores'>('planos');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState(colors[0]?.name || '');
  const [selectedHighlight, setSelectedHighlight] = useState<string>(highlights[0]?.id || '');

  // Sincroniza o plano selecionado sempre que a matriz de planos for atualizada via SSE
  useEffect(() => {
    if (plansPricing.length > 0) {
      const featured = plansPricing.find(p => p.is_featured);
      setSelectedPlanId(featured ? featured.id : plansPricing[0].id);
    }
  }, [plansPricing]);

  // Plano atualmente selecionado pelo cliente para simulação
  const currentPlan = plansPricing.find(p => p.id === selectedPlanId) || plansPricing[0] || {
    plan_name: 'Oferta TIM Black',
    plan_badge: 'TIM Black',
    price_cash: 5499,
    price_installments: '12x R$ 458,25 sem juros',
    discount_label: 'Oferta Especial'
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-[#002B7F]" />;
      case 'Camera': return <Camera className="w-5 h-5 text-[#002B7F]" />;
      case 'Smartphone': return <Smartphone className="w-5 h-5 text-[#002B7F]" />;
      case 'BatteryCharging': return <BatteryCharging className="w-5 h-5 text-[#002B7F]" />;
      default: return <Sparkles className="w-5 h-5 text-[#002B7F]" />;
    }
  };

  return (
    <div className="relative w-full h-full bg-[#F4F6FB] text-gray-900 flex flex-col overflow-hidden select-none font-sans">
      
      {/* Header Superior Minimalista com Logo TIM Oficial e Safe Area Insets iOS */}
      <header 
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: '12px'
        }}
        className="px-5 bg-[#001438] text-white border-b border-white/10 shadow-md z-10 shrink-0"
      >
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={onBackToAttract}
              className="p-1.5 rounded-xl bg-white/10 active:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Voltar para a vitrine"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div onClick={onTripleTapLogo} className="cursor-pointer active:opacity-75 flex items-center">
              <TimLogo className="h-5 w-auto" variant="white" />
            </div>
          </div>

          {/* Badge Dinâmico do Plano Selecionado */}
          <div className="bg-[#002B7F] text-white px-3 py-1 rounded-full flex items-center space-x-1.5 shadow-sm border border-[#00B5E2]/40">
            <ShieldCheck className="w-3 h-3 text-[#00B5E2]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">{currentPlan.plan_badge}</span>
          </div>
        </div>
      </header>

      {/* Conteúdo com Rolagem Suave */}
      <div 
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)'
        }}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full"
      >
        
        {/* Banner do Aparelho TIM */}
        <div className="bg-gradient-to-r from-[#002B7F] to-[#0054A6] p-5 rounded-3xl text-white shadow-md relative overflow-hidden">
          <span className="text-[10px] font-extrabold text-[#00B5E2] uppercase tracking-widest block mb-1">{brand}</span>
          <h1 className="text-2xl font-black tracking-tight leading-tight">{modelName}</h1>
          <p className="text-xs text-blue-100 mt-1">{tagline}</p>
        </div>

        {/* Seletor de Abas com "Planos & Ofertas" em Primeiro Lugar */}
        <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('planos')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'planos' ? 'bg-[#002B7F] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Ofertas & Planos
          </button>
          <button
            onClick={() => setActiveTab('recursos')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'recursos' ? 'bg-[#002B7F] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Destaques
          </button>
          <button
            onClick={() => setActiveTab('ficha')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'ficha' ? 'bg-[#002B7F] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Ficha
          </button>
          <button
            onClick={() => setActiveTab('cores')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'cores' ? 'bg-[#002B7F] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Cores
          </button>
        </div>

        {/* ABA 1: MATRIZ DE OFERTAS & PLANOS DA OPERADORA */}
        {activeTab === 'planos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                Simule com o seu plano:
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                Descontos de fidelidade
              </span>
            </div>

            {plansPricing.map(plan => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white relative overflow-hidden ${
                    isSelected 
                      ? 'border-[#002B7F] ring-2 ring-[#002B7F]/20 shadow-md bg-blue-50/20' 
                      : 'border-gray-200 shadow-sm hover:border-gray-300'
                  }`}
                >
                  {/* Selo de Oferta em Destaque */}
                  {plan.is_featured && (
                    <div className="absolute top-0 right-0 bg-[#002B7F] text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl tracking-wider">
                      Melhor Oferta
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <div className="pr-4">
                      <span className="text-[9px] uppercase font-extrabold text-gray-400 block tracking-wider">
                        {plan.plan_category}
                      </span>
                      <h3 className="text-sm font-black text-gray-900 leading-tight">
                        {plan.plan_name}
                      </h3>
                      <span className="inline-block text-[10px] font-bold text-emerald-600 mt-0.5">
                        {plan.discount_label}
                      </span>
                    </div>

                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all">
                      {isSelected ? (
                        <div className="w-3 h-3 rounded-full bg-[#002B7F]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border-gray-300" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase">No cartão de crédito:</span>
                      <span className="text-base font-black text-[#002B7F]">
                        {plan.price_installments}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 font-medium">
                        R$ {plan.price_cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA 2: DESTAQUES / RECURSOS */}
        {activeTab === 'recursos' && (
          <div className="space-y-3">
            {highlights.map(item => {
              const isSelected = selectedHighlight === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedHighlight(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white ${
                    isSelected 
                      ? 'border-[#002B7F] ring-2 ring-[#002B7F]/20 shadow-md' 
                      : 'border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-blue-50 shrink-0">
                      {renderIcon(item.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-900">{item.title}</h3>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90 text-[#002B7F]' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-[11px] text-gray-600 mt-0.5 transition-all leading-relaxed ${isSelected ? 'line-clamp-none' : 'line-clamp-1'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA 3: FICHA TÉCNICA */}
        {activeTab === 'ficha' && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
            {Object.entries(specs).map(([key, value]) => (
              <div key={key} className="flex flex-col border-b border-gray-100 pb-2.5 last:border-b-0 last:pb-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold text-gray-800 mt-0.5">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ABA 4: CORES */}
        {activeTab === 'cores' && (
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col items-center">
            <span className="text-xs text-gray-500 font-semibold mb-4">Escolha a cor para comparar</span>
            <div className="flex space-x-4 mb-4">
              {colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  style={{ backgroundColor: color.hex }}
                  className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                    selectedColor === color.name 
                      ? 'border-[#002B7F] scale-110 shadow-lg' 
                      : 'border-gray-300'
                  }`}
                >
                  {selectedColor === color.name && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-semibold text-gray-400 block">Acabamento:</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5 block">{selectedColor}</span>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER FIXO DE VAREJO COM O VALOR DO PLANO SIMULADO E SAFE AREA INSET */}
      <footer 
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          paddingTop: '14px'
        }}
        className="absolute bottom-0 left-0 right-0 px-5 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20"
      >
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider">
              Com {currentPlan.plan_name}
            </span>
            <div className="text-lg font-black text-[#002B7F] tracking-tight leading-none mt-0.5">
              {currentPlan.price_installments}
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              ou R$ {currentPlan.price_cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} à vista
            </span>
          </div>

          <button 
            onClick={onBackToAttract}
            className="bg-[#002B7F] active:bg-[#001F5C] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-900/20 transition-all cursor-pointer"
          >
            Voltar ao Vídeo
          </button>
        </div>
      </footer>

    </div>
  );
};
