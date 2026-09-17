import React, { useState, useMemo } from 'react';
import { TimLogo } from './TimLogo';
import { Search, Smartphone, AlertTriangle, Check, ArrowRight, ShieldCheck, Filter, X } from 'lucide-react';

export interface SelectableDevice {
  id: string;
  brand: string;
  model_name: string;
  tagline?: string;
  base_price?: number;
}

interface DeviceSelectionViewProps {
  devices: SelectableDevice[];
  onSelectDevice: (deviceId: string) => void;
  rawDetectedHint?: string;
}

export const DeviceSelectionView: React.FC<DeviceSelectionViewProps> = ({
  devices = [],
  onSelectDevice,
  rawDetectedHint
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Lista única de marcas existentes no catálogo
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    devices.forEach(d => {
      if (d.brand) set.add(d.brand);
    });
    return Array.from(set);
  }, [devices]);

  // Filtro dinâmico por busca e marca
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      const matchesBrand = selectedBrand === 'all' || dev.brand.toLowerCase() === selectedBrand.toLowerCase();
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term || 
        dev.model_name.toLowerCase().includes(term) || 
        dev.brand.toLowerCase().includes(term) ||
        (dev.tagline && dev.tagline.toLowerCase().includes(term));
      return matchesBrand && matchesSearch;
    });
  }, [devices, selectedBrand, searchTerm]);

  const handleConfirm = (deviceId: string) => {
    setSelectedId(deviceId);
    setTimeout(() => {
      onSelectDevice(deviceId);
    }, 250);
  };

  return (
    <div className="min-h-screen w-full bg-[#070C18] text-white flex flex-col justify-between p-4 sm:p-6 font-sans select-none overflow-y-auto">
      
      <div className="max-w-2xl w-full mx-auto space-y-6 pt-4">
        
        {/* Header Superior Corporativo TIM */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <TimLogo className="h-7 w-auto" variant="white" />
            <div className="h-4 w-px bg-white/20" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#00B5E2]">
              Configuração de Pedestal
            </span>
          </div>
          <div className="bg-[#002B7F] px-2.5 py-1 rounded-full text-[9px] font-bold text-cyan-300 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3" />
            <span>TIM Showroom</span>
          </div>
        </div>

        {/* BULLET DE AVISO (Conforme Solicitado pelo Usuário) */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 space-y-2 shadow-xl animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-black text-amber-300">
              Identificação Automática Inconclusiva
            </h2>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed pl-9">
            Não conseguimos identificar o modelo deste aparelho automaticamente (as políticas de privacidade do navegador mascararam a telemetria do hardware).
          </p>
          <div className="pl-9 pt-1">
            <span className="text-[11px] font-bold text-[#00B5E2] block">
              👉 Selecione abaixo qual aparelho está instalado neste pedestal:
            </span>
            {rawDetectedHint && (
              <span className="text-[9px] text-gray-400 font-mono block mt-0.5">
                Telemetria bruta recebida: {rawDetectedHint}
              </span>
            )}
          </div>
        </div>

        {/* BARRA DE PESQUISA EM TEMPO REAL */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por modelo (ex: Moto G04, iPhone 16, S24 Ultra...)"
            className="w-full bg-[#0E172C] border border-white/15 focus:border-[#00B5E2] rounded-2xl pl-11 pr-10 py-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00B5E2] transition-all shadow-lg"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* FILTRO RÁPIDO POR MARCAS (CHIPS CLICÁVEIS) */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-1.5 text-gray-400 px-1">
            <Filter className="w-3 h-3 text-[#00B5E2]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Filtrar por Fabricante:</span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedBrand('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedBrand === 'all'
                  ? 'bg-[#002B7F] text-white border border-[#00B5E2]/40 shadow-md'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              Todas as Marcas ({devices.length})
            </button>

            {availableBrands.map(brand => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedBrand.toLowerCase() === brand.toLowerCase()
                    ? 'bg-[#002B7F] text-white border border-[#00B5E2]/40 shadow-md'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* LISTA / GRID DE APARELHOS DO CATÁLOGO */}
        <div className="space-y-3 pb-8">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block px-1">
            Dispositivos Homologados ({filteredDevices.length}):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredDevices.map(device => {
              const isSelected = selectedId === device.id;

              return (
                <div
                  key={device.id}
                  onClick={() => handleConfirm(device.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between space-y-3 group ${
                    isSelected
                      ? 'bg-[#002B7F]/40 border-[#00B5E2] scale-[0.98]'
                      : 'bg-[#0E172C] hover:bg-[#121E38] border-white/10 hover:border-white/25 shadow-lg'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        device.brand.toLowerCase() === 'apple'
                          ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          : device.brand.toLowerCase() === 'samsung'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {device.brand}
                      </span>
                      {device.base_price && (
                        <span className="text-[10px] font-mono text-gray-400">
                          R$ {device.base_price.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-white group-hover:text-[#00B5E2] transition-colors">
                      {device.model_name}
                    </h3>

                    {device.tagline && (
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {device.tagline}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#00B5E2]">
                      Vincular Pedestal
                    </span>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#00B5E2] text-[#001438]' : 'bg-white/5 group-hover:bg-[#002B7F] text-white'
                    }`}>
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDevices.length === 0 && (
            <div className="text-center py-12 bg-[#0E172C] rounded-3xl border border-white/10 space-y-2">
              <Smartphone className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-xs font-bold text-gray-300">Nenhum smartphone encontrado para sua busca.</p>
              <p className="text-[11px] text-gray-500">Tente buscar por outro nome ou limpe os filtros de marca.</p>
            </div>
          )}
        </div>

      </div>

      {/* Rodapé Informativo */}
      <div className="max-w-2xl w-full mx-auto border-t border-white/10 pt-4 text-center">
        <p className="text-[10px] text-gray-400">
          Esta escolha é memorizada permanentemente na memória local deste aparelho. Para redefinir no futuro, dê 3 toques no logo da TIM para acessar o menu com o PIN da loja.
        </p>
      </div>

    </div>
  );
};
