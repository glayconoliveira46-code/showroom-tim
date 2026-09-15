import React, { useState } from 'react';
import { X, Lock, KeyRound, AlertCircle, Smartphone, Store, Check, Settings2, Play } from 'lucide-react';

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

interface PinModalProps {
  isOpen: boolean;
  correctPin: string;
  currentDeviceId?: string;
  currentStoreId?: string;
  availableDevices?: DeviceItem[];
  availableStores?: StoreItem[];
  onClose: () => void;
  onSuccess: () => void;
  onSavePedestalConfig?: (deviceId: string, storeId: string) => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  correctPin,
  currentDeviceId,
  currentStoreId,
  availableDevices = [],
  availableStores = [],
  onClose,
  onSuccess,
  onSavePedestalConfig,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pedestalDevice, setPedestalDevice] = useState(currentDeviceId || '');
  const [pedestalStore, setPedestalStore] = useState(currentStoreId || '');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === correctPin) {
        setIsUnlocked(true);
        setPin('');
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleSaveConfig = () => {
    if (onSavePedestalConfig && pedestalDevice) {
      onSavePedestalConfig(pedestalDevice, pedestalStore);
    }
    setIsUnlocked(false);
    onClose();
  };

  const handleStartDemo = () => {
    setIsUnlocked(false);
    onSuccess();
    onClose();
  };

  const handleCloseAll = () => {
    setIsUnlocked(false);
    setPin('');
    setError(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fadeIn">
      <button 
        onClick={handleCloseAll}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* CASO 1: TELA DE PIN (PROTEÇÃO DE ACESSO) */}
      {!isUnlocked ? (
        <div className="w-full max-w-xs flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#002B7F]/40 border border-[#00B5E2]/40 flex items-center justify-center mb-4 text-[#00B5E2] shadow-lg">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-black text-white mb-1 tracking-tight">Acesso Promotor TIM</h2>
          <p className="text-xs text-gray-400 text-center mb-6">
            Insira o PIN de 4 dígitos para liberar o celular ou configurar o pedestal da bancada
          </p>

          {/* Indicadores do PIN (bolinhas) */}
          <div className="flex space-x-4 mb-8">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pin.length > idx
                    ? error 
                      ? 'bg-red-500 scale-110' 
                      : 'bg-[#00B5E2] scale-110 shadow-lg shadow-[#00B5E2]/50'
                    : 'border-2 border-white/20'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center space-x-1.5 text-red-400 text-xs mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>PIN incorreto. Tente novamente.</span>
            </div>
          )}

          {/* Teclado Numérico */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                className="w-16 h-16 rounded-2xl bg-white/10 active:bg-white/30 text-2xl font-black text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="w-16 h-16 rounded-2xl bg-white/5 active:bg-white/20 text-xs font-bold text-gray-400 flex items-center justify-center cursor-pointer"
            >
              Limpar
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="w-16 h-16 rounded-2xl bg-white/10 active:bg-white/30 text-2xl font-black text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              0
            </button>
            <div className="w-16 h-16 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-white/20" />
            </div>
          </div>
        </div>
      ) : (
        /* CASO 2: MENU DESBLOQUEADO DO PROMOTOR (LIBERAR APRELHO OU CONFIGURAR PEDESTAL) */
        <div className="w-full max-w-sm bg-[#0E172C] border border-white/15 rounded-3xl p-6 space-y-6 shadow-2xl animate-fadeIn">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#002B7F] flex items-center justify-center text-[#00B5E2]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Menu do Promotor</h3>
              <p className="text-[11px] text-gray-400">Defina o comportamento deste quiosque físico</p>
            </div>
          </div>

          {/* Opção 1: Liberar Demonstração */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#00B5E2] block">Uso com Cliente</span>
            <h4 className="text-xs font-black text-white">Liberar Smartphone para Teste (5 minutos)</h4>
            <p className="text-[11px] text-gray-400">
              Desativa temporariamente o vídeo em loop para o cliente testar aplicativos, câmera e recursos do aparelho.
            </p>
            <button
              type="button"
              onClick={handleStartDemo}
              className="w-full bg-[#00B5E2] hover:bg-cyan-400 text-[#001438] py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all mt-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-[#001438]" />
              <span>Liberar Aparelho Agora</span>
            </button>
          </div>

          {/* Opção 2: Configurar Identidade deste Pedestal Físico */}
          <div className="bg-[#070C18] p-4 rounded-2xl border border-[#00B5E2]/30 space-y-3">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-[#00B5E2]" />
              <span className="text-xs font-black text-white">Identidade deste Pedestal Físico</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Fixe qual smartphone do catálogo este aparelho representa. Ele manterá esta programação independente do que o Admin editar.
            </p>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Modelo do Aparelho</label>
              <select
                value={pedestalDevice}
                onChange={(e) => setPedestalDevice(e.target.value)}
                className="w-full bg-[#0E172C] border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#00B5E2] cursor-pointer"
              >
                {availableDevices.map(d => (
                  <option key={d.id} value={d.id} className="bg-[#0E172C] text-white">
                    {d.brand} - {d.model_name}
                  </option>
                ))}
              </select>
            </div>

            {availableStores.length > 0 && (
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Loja Alocada</label>
                <select
                  value={pedestalStore}
                  onChange={(e) => setPedestalStore(e.target.value)}
                  className="w-full bg-[#0E172C] border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#00B5E2] cursor-pointer"
                >
                  <option value="" className="bg-[#0E172C] text-white">Padrão Nacional (Todas)</option>
                  {availableStores.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#0E172C] text-white">
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveConfig}
              className="w-full bg-[#002B7F] hover:bg-[#0038A8] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all mt-2 cursor-pointer shadow-md"
            >
              <Check className="w-3.5 h-3.5 text-[#00B5E2]" />
              <span>Salvar e Fixar neste Quiosque</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

