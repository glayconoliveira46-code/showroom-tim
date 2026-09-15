import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, Smartphone, Sliders, Maximize2, Move, ZoomIn, Crop, ShieldCheck, Radio, CheckCircle2, DollarSign, 
  Upload, Plus, Store, Layers, Video, Sparkles, Check, Edit3, Tag,
  Eye, EyeOff, Save, AlertTriangle, ArrowRight, RotateCcw, Building2,
  MapPin, Globe, CheckCircle, Percent, Info, ShieldAlert, Cpu,
  LayoutDashboard, Film, Clock, Settings, ExternalLink, ArrowLeft, Play,
  Tv, MonitorSmartphone, HelpCircle, FileVideo, PlusCircle,
  Search, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, ChevronLeft,
  ChevronRight, X, FolderOpen, Database, RefreshCw
} from 'lucide-react';
import { TimLogo } from '../components/TimLogo';
import { calculateTelecomPricing, PricingCalculationResult } from '../utils/pricingEngine';

type AdminView = 'dashboard' | 'pricing' | 'media' | 'devices' | 'plans' | 'clusters' | 'simulators';

export const AdminPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [overview, setOverview] = useState<any>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Rascunho local do Módulo de Precificação (Power BI style)
  const [localBasePrice, setLocalBasePrice] = useState<number>(7999);
  const [localPlans, setLocalPlans] = useState<any[]>([]);
  const [localTargetScope, setLocalTargetScope] = useState<'all' | 'cluster' | 'store'>('all');
  const [localClusterId, setLocalClusterId] = useState<string>('');
  const [localStoreId, setLocalStoreId] = useState<string>('');

  // Snapshot do que está salvo no servidor para comparação e descarte
  const [savedSnapshot, setSavedSnapshot] = useState<any>(null);

  // Estados de controle de publicação e rascunho
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [pendingSync, setPendingSync] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Formulário de Novo Aparelho + Enxoval
  const [devModelName, setDevModelName] = useState('');
  const [devBrand, setDevBrand] = useState('Samsung');
  const [devTagline, setDevTagline] = useState('');
  const [devBasePrice, setDevBasePrice] = useState('4999');
  const [devTargetScope, setDevTargetScope] = useState<'all' | 'cluster' | 'store'>('all');
  const [devClusterId, setDevClusterId] = useState('');
  const [devStoreId, setDevStoreId] = useState('');
  const [devVideoFile, setDevVideoFile] = useState<File | null>(null);
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);

  // Formulário de Novo Plano Global
  const [planName, setPlanName] = useState('');
  const [planCategory, setPlanCategory] = useState('Pós-Pago');
  const [planBadge, setPlanBadge] = useState('');
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // Mídia: Gestão Multi-Mídia, Busca, Acervo e Rascunho (Staging)
  const [mediaSelectedDevId, setMediaSelectedDevId] = useState('');
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaBrandFilter, setMediaBrandFilter] = useState('TODOS');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaDurationSec, setMediaDurationSec] = useState(7);

  // Estados do Editor de Enquadramento & Dimensionamento
  const [framingItem, setFramingItem] = useState<any | null>(null);
  const [framingFit, setFramingFit] = useState<'cover' | 'contain' | 'blur_fill'>('cover');
  const [framingPosX, setFramingPosX] = useState<number>(50);
  const [framingPosY, setFramingPosY] = useState<number>(50);
  const [framingScale, setFramingScale] = useState<number>(1.0);

  // Estados de Validação de Tamanho de Upload
  const [uploadSizeWarning, setUploadSizeWarning] = useState<string | null>(null);
  const [uploadFileSizeMB, setUploadFileSizeMB] = useState<number | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isMediaLibraryModalOpen, setIsMediaLibraryModalOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<'ALL' | 'video' | 'image'>('ALL');
  const [localMediaPlaylists, setLocalMediaPlaylists] = useState<Record<string, any[]>>({});
  const [isSavingMediaDraft, setIsSavingMediaDraft] = useState(false);
  const [isPublishingMedia, setIsPublishingMedia] = useState(false);
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);

  // Cluster & Lojas
  const [newClusterName, setNewClusterName] = useState('');
  const [newClusterDesc, setNewClusterDesc] = useState('');
  const [isCreatingCluster, setIsCreatingCluster] = useState(false);

  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreClusterId, setNewStoreClusterId] = useState('');
  const [isCreatingStore, setIsCreatingStore] = useState(false);

  // Notificações Toast
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Carrega visão inicial da API
  const fetchOverview = async (targetIdToSelect?: string) => {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);

        const targetId = targetIdToSelect || selectedDeviceId || data.active_device_id || data.catalog?.[0]?.id;
        if (targetId) {
          setSelectedDeviceId(targetId);
          if (!mediaSelectedDevId) setMediaSelectedDevId(targetId);
          const dev = data.catalog.find((d: any) => d.id === targetId);
          if (dev) {
            initDeviceState(dev);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar overview', err);
    }
  };

  const initDeviceState = (device: any) => {
    const base = Number(device.base_price) || (device.plans_pricing?.[0]?.price_cash ? Number(device.plans_pricing[0].price_cash) : 4999);
    setLocalBasePrice(base);
    
    const initializedPlans = (device.plans_pricing || []).map((p: any) => {
      const subsidy = Number(p.subsidy_amount) !== undefined ? Number(p.subsidy_amount) : Math.max(0, base - (Number(p.price_cash) || base));
      const installments = Number(p.installments_count) || 12;
      const calc = calculateTelecomPricing(base, subsidy, installments);

      return {
        ...p,
        subsidy_amount: calc.subsidyDiscount,
        installments_count: calc.installmentsCount,
        price_cash: calc.finalCashPrice,
        price_installments: calc.formattedInstallments,
        discount_label: calc.discountLabel,
        is_featured: !!p.is_featured,
        is_active: p.is_active !== false
      };
    });

    setLocalPlans(initializedPlans);
    setLocalTargetScope(device.target_scope || 'all');
    setLocalClusterId(device.target_cluster_id || overview?.clusters?.[0]?.id || '');
    setLocalStoreId(device.target_store_id || overview?.stores?.[0]?.id || '');

    setSavedSnapshot({
      base_price: base,
      target_scope: device.target_scope || 'all',
      target_cluster_id: device.target_cluster_id || null,
      target_store_id: device.target_store_id || null,
      plans_pricing: JSON.parse(JSON.stringify(initializedPlans))
    });

    setIsDirty(false);
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Selecionar aparelho com auto-save em rascunho
  const handleSelectDevice = async (nextDeviceId: string) => {
    if (nextDeviceId === selectedDeviceId) return;

    if (isDirty) {
      await handleSaveDraftSilently();
      showToast('Rascunho anterior salvo no servidor automaticamente.', 'info');
    }

    setSelectedDeviceId(nextDeviceId);
    const targetDev = overview?.catalog?.find((d: any) => d.id === nextDeviceId);
    if (targetDev) {
      initDeviceState(targetDev);
    }
  };

  // Alteração do Preço Base de Tabela do Smartphone
  const handleBasePriceChange = (newBasePrice: number) => {
    const safeBase = Math.max(0, Number(newBasePrice) || 0);
    setLocalBasePrice(safeBase);

    setLocalPlans(prev => prev.map(plan => {
      const calc = calculateTelecomPricing(safeBase, plan.subsidy_amount, plan.installments_count);
      return {
        ...plan,
        subsidy_amount: calc.subsidyDiscount,
        price_cash: calc.finalCashPrice,
        price_installments: calc.formattedInstallments,
        discount_label: calc.discountLabel
      };
    }));

    setIsDirty(true);
  };

  // Alteração de Subsídio
  const handlePlanSubsidyChange = (planId: string, newSubsidy: number) => {
    setLocalPlans(prev => prev.map(plan => {
      if (plan.id === planId) {
        const calc = calculateTelecomPricing(localBasePrice, newSubsidy, plan.installments_count);
        return {
          ...plan,
          subsidy_amount: calc.subsidyDiscount,
          price_cash: calc.finalCashPrice,
          price_installments: calc.formattedInstallments,
          discount_label: calc.discountLabel
        };
      }
      return plan;
    }));
    setIsDirty(true);
  };

  // Alteração de Parcelas
  const handlePlanInstallmentsChange = (planId: string, newInstallments: number) => {
    setLocalPlans(prev => prev.map(plan => {
      if (plan.id === planId) {
        const calc = calculateTelecomPricing(localBasePrice, plan.subsidy_amount, newInstallments);
        return {
          ...plan,
          installments_count: calc.installmentsCount,
          price_cash: calc.finalCashPrice,
          price_installments: calc.formattedInstallments,
          discount_label: calc.discountLabel
        };
      }
      return plan;
    }));
    setIsDirty(true);
  };

  // Alternar Visibilidade
  const handleTogglePlanActive = (planId: string) => {
    setLocalPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return { ...p, is_active: !p.is_active };
      }
      return p;
    }));
    setIsDirty(true);
  };

  // Destaque de Capa
  const handleSetFeatured = (planId: string) => {
    setLocalPlans(prev => prev.map(p => ({
      ...p,
      is_featured: p.id === planId
    })));
    setIsDirty(true);
  };

  // Descartar Alterações (Power BI)
  const handleDiscardChanges = () => {
    if (!savedSnapshot) return;
    setLocalBasePrice(savedSnapshot.base_price);
    setLocalPlans(JSON.parse(JSON.stringify(savedSnapshot.plans_pricing)));
    setLocalTargetScope(savedSnapshot.target_scope);
    setLocalClusterId(savedSnapshot.target_cluster_id);
    setLocalStoreId(savedSnapshot.target_store_id);
    setIsDirty(false);
    showToast('Alterações descartadas. Retornado à versão salva.', 'info');
  };

  // Salvar Rascunho
  const handleSaveDraftSilently = async () => {
    try {
      await fetch('/api/admin/save-device-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceId,
          base_price: localBasePrice,
          plans_pricing: localPlans,
          target_scope: localTargetScope,
          target_cluster_id: localClusterId || null,
          target_store_id: localStoreId || null
        })
      });
      setSavedSnapshot({
        base_price: localBasePrice,
        target_scope: localTargetScope,
        target_cluster_id: localClusterId || null,
        target_store_id: localStoreId || null,
        plans_pricing: JSON.parse(JSON.stringify(localPlans))
      });
      setIsDirty(false);
      setPendingSync(true);
    } catch (err) {
      console.error('Erro ao salvar rascunho', err);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await handleSaveDraftSilently();
      showToast('Rascunho salvo no servidor! Suas edições estão preservadas.', 'success');
      await fetchOverview();
    } catch (err) {
      alert('Erro ao salvar rascunho');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Transmitir Ofertas
  const handlePublishOffers = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch('/api/admin/publish-device-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceId,
          base_price: localBasePrice,
          plans_pricing: localPlans,
          target_scope: localTargetScope,
          target_cluster_id: localClusterId || null,
          target_store_id: localStoreId || null
        })
      });

      if (res.ok) {
        setSavedSnapshot({
          base_price: localBasePrice,
          target_scope: localTargetScope,
          target_cluster_id: localClusterId || null,
          target_store_id: localStoreId || null,
          plans_pricing: JSON.parse(JSON.stringify(localPlans))
        });
        setIsDirty(false);
        setPendingSync(false);
        showToast('🎉 Ofertas transmitidas aos smartphones da bancada em tempo real!', 'success');
        await fetchOverview();
      } else {
        alert('Erro ao transmitir ofertas para a vitrine');
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor');
    } finally {
      setIsPublishing(false);
    }
  };

  // Cadastrar Novo Aparelho
  
  // ==========================================
  // HELPERS & HANDLERS: GESTÃO MULTI-MÍDIA, ACERVO & RASCUNHO (STAGING)
  // ==========================================
    const formatDurationLabel = (sec?: number) => {
    const s = sec || 7;
    return `${s}s`;
  };

  const currentMediaDevice = useMemo(() => {
    if (!overview?.catalog || overview.catalog.length === 0) return null;
    return overview.catalog.find((d: any) => d.id === mediaSelectedDevId) || overview.catalog[0];
  }, [overview?.catalog, mediaSelectedDevId]);

  const filteredMediaDevices = useMemo(() => {
    if (!overview?.catalog) return [];
    return overview.catalog.filter((d: any) => {
      const matchesBrand = mediaBrandFilter === 'TODOS' || d.brand?.toLowerCase() === mediaBrandFilter.toLowerCase();
      const matchesSearch = !mediaSearch.trim() || 
        d.model_name?.toLowerCase().includes(mediaSearch.toLowerCase()) || 
        d.brand?.toLowerCase().includes(mediaSearch.toLowerCase());
      return matchesBrand && matchesSearch;
    });
  }, [overview?.catalog, mediaBrandFilter, mediaSearch]);

  // Playlist salva no servidor para o aparelho em foco
  const serverMediaPlaylist = useMemo(() => {
    if (!currentMediaDevice) return [];
    if (currentMediaDevice.media_playlist && Array.isArray(currentMediaDevice.media_playlist) && currentMediaDevice.media_playlist.length > 0) {
      return currentMediaDevice.media_playlist;
    }
    return [
      {
        id: `pl-${currentMediaDevice.id}-default`,
        title: `Vídeo Vitrine ${currentMediaDevice.model_name}`,
        type: 'video',
        url: currentMediaDevice.video_url || '/s24-video.mp4',
        duration_sec: 15,
        is_active: true
      }
    ];
  }, [currentMediaDevice]);

  // Playlist em modo de rascunho local (edições não transmitidas)
  const currentPlaylist = useMemo(() => {
    if (!currentMediaDevice) return [];
    if (localMediaPlaylists[currentMediaDevice.id]) {
      return localMediaPlaylists[currentMediaDevice.id];
    }
    return serverMediaPlaylist;
  }, [currentMediaDevice, localMediaPlaylists, serverMediaPlaylist]);

  // Detecta se há modificações locais pendentes de transmissão
  const isMediaDirty = useMemo(() => {
    if (!currentMediaDevice || !localMediaPlaylists[currentMediaDevice.id]) return false;
    return JSON.stringify(localMediaPlaylists[currentMediaDevice.id]) !== JSON.stringify(serverMediaPlaylist);
  }, [currentMediaDevice, localMediaPlaylists, serverMediaPlaylist]);

  const activePlaylistItems = useMemo(() => {
    return currentPlaylist.filter((item: any) => item.is_active !== false);
  }, [currentPlaylist]);

  const safePreviewIndex = previewMediaIndex < activePlaylistItems.length ? previewMediaIndex : 0;
  const currentPreviewItem = activePlaylistItems[safePreviewIndex] || activePlaylistItems[0] || null;

  // Atualiza apenas o rascunho local (SEM TRANSMITIR PARA A BANCADA)
  const updateLocalPlaylist = (updated: any[], feedbackMsg = 'Rascunho local atualizado.') => {
    if (!currentMediaDevice) return;
    setLocalMediaPlaylists(prev => ({
      ...prev,
      [currentMediaDevice.id]: updated
    }));
    showToast(feedbackMsg, 'info');
  };

  // Alterna ativação de uma mídia (Apenas no Rascunho)
  const handleTogglePlaylistItem = (itemId: string) => {
    const next = currentPlaylist.map((item: any) => {
      if (item.id === itemId) {
        return { ...item, is_active: item.is_active === false };
      }
      return item;
    });
    updateLocalPlaylist(next, 'Visibilidade alterada no rascunho (não transmitida).');
  };

  // Abrir modal de enquadramento
  const handleOpenFramingModal = (item: any) => {
    setFramingItem(item);
    setFramingFit(item.object_fit || 'cover');
    setFramingPosX(item.position_x ?? 50);
    setFramingPosY(item.position_y ?? 50);
    setFramingScale(item.scale ?? 1.0);
  };

  // Salvar enquadramento no rascunho
  const handleSaveFraming = () => {
    if (!framingItem || !currentMediaDevice) return;
    const next = currentPlaylist.map((item: any) => {
      if (item.id === framingItem.id) {
        return {
          ...item,
          object_fit: framingFit,
          position_x: framingPosX,
          position_y: framingPosY,
          scale: framingScale
        };
      }
      return item;
    });
    updateLocalPlaylist(next, `Enquadramento de "${framingItem.title}" atualizado no rascunho!`);
    setFramingItem(null);
  };

  // Altera tempo de foto (Apenas no Rascunho)
  const handleUpdateItemDuration = (itemId: string, durationSec: number) => {
    const next = currentPlaylist.map((item: any) => {
      if (item.id === itemId) {
        return { ...item, duration_sec: durationSec };
      }
      return item;
    });
    updateLocalPlaylist(next, `Tempo ajustado para ${durationSec}s no rascunho.`);
  };

  // Move item na ordem (Apenas no Rascunho)
  const handleMovePlaylistItem = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= currentPlaylist.length) return;
    const next = [...currentPlaylist];
    const [moved] = next.splice(index, 1);
    next.splice(newIdx, 0, moved);
    updateLocalPlaylist(next, 'Ordem alterada no rascunho.');
  };

  // Remove item (Apenas no Rascunho)
  const handleRemovePlaylistItem = (itemId: string) => {
    if (currentPlaylist.length <= 1) {
      alert('O smartphone deve possuir ao menos uma mídia cadastrada.');
      return;
    }
    const next = currentPlaylist.filter((i: any) => i.id !== itemId);
    updateLocalPlaylist(next, 'Mídia removida do rascunho local.');
  };

  // Adiciona do acervo (Apenas no Rascunho)
  const handleAddMediaFromLibrary = (libItem: any) => {
    if (!currentMediaDevice) return;
    const exists = currentPlaylist.some((p: any) => p.url === libItem.url);
    if (exists) {
      showToast('Esta mídia já está na playlist deste aparelho.', 'info');
      return;
    }
    const newItem = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: libItem.title,
      type: libItem.type,
      url: libItem.url,
      duration_sec: libItem.duration_sec || (libItem.type === 'video' ? 15 : 7),
      is_active: true
    };
    const next = [...currentPlaylist, newItem];
    updateLocalPlaylist(next, `"${libItem.title}" adicionada ao rascunho!`);
    setIsMediaLibraryModalOpen(false);
  };

  // Upload direto de nova mídia (Envia arquivo para o acervo e adiciona ao rascunho)
  const handleUploadMediaDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMediaDevice || !mediaFile) {
      alert('Selecione um arquivo de mídia para enviar');
      return;
    }
    setIsUploadingMedia(true);
    const formData = new FormData();
    formData.append('media', mediaFile);
    formData.append('device_id', currentMediaDevice.id);
    formData.append('title', mediaTitle || mediaFile.name.replace(/\.[^/.]+$/, ""));
    formData.append('duration_sec', String(mediaDurationSec || 7));

    try {
      const res = await fetch('/api/admin/media-library/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        if (result.media) {
          const newItem = {
            id: `pl-${Date.now()}`,
            title: result.media.title,
            type: result.media.type,
            url: result.media.url,
            duration_sec: result.media.duration_sec,
            is_active: true
          };
          updateLocalPlaylist([...currentPlaylist, newItem], 'Mídia enviada e adicionada ao rascunho local!');
        }
        setMediaFile(null);
        setMediaTitle('');
        await fetchOverview(currentMediaDevice.id);
      } else {
        alert('Erro ao fazer upload da mídia');
      }
    } catch (err) {
      alert('Erro de conexão ao enviar mídia');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Descartar alterações de mídia
  const handleDiscardMediaChanges = () => {
    if (!currentMediaDevice) return;
    setLocalMediaPlaylists(prev => {
      const copy = { ...prev };
      delete copy[currentMediaDevice.id];
      return copy;
    });
    setPreviewMediaIndex(0);
    showToast('Alterações descartadas. Retornado à versão oficial salva.', 'info');
  };

  // Salvar Rascunho no Servidor (Sem disparar SSE para a bancada)
  const handleSaveMediaDraft = async () => {
    if (!currentMediaDevice) return;
    setIsSavingMediaDraft(true);
    try {
      const res = await fetch('/api/admin/device-playlist/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: currentMediaDevice.id,
          playlist: currentPlaylist
        })
      });
      if (res.ok) {
        setLocalMediaPlaylists(prev => {
          const copy = { ...prev };
          delete copy[currentMediaDevice.id];
          return copy;
        });
        showToast('Rascunho salvo no servidor (não transmitido ainda à bancada).', 'success');
        await fetchOverview(currentMediaDevice.id);
      } else {
        alert('Erro ao salvar rascunho de mídia');
      }
    } catch (err) {
      alert('Erro de conexão ao salvar rascunho');
    } finally {
      setIsSavingMediaDraft(false);
    }
  };

  // Excluir mídia do acervo
  const handleDeleteFromLibrary = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir a mídia "${title}" do acervo?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/media-library/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Mídia "${title}" excluída do acervo com sucesso!`, 'success');
        if (currentMediaDevice && localMediaPlaylists[currentMediaDevice.id]) {
          setLocalMediaPlaylists(prev => ({
            ...prev,
            [currentMediaDevice.id]: prev[currentMediaDevice.id].filter((i: any) => i.id !== id && i.url !== id)
          }));
        }
        await fetchOverview();
      } else {
        alert('Erro ao excluir mídia do acervo');
      }
    } catch (err) {
      alert('Erro de conexão ao excluir mídia');
    }
  };

  const filteredLibraryItems = useMemo(() => {
    if (!overview?.media_library) return [];
    return overview.media_library.filter((med: any) => {
      const matchesType = libraryTypeFilter === 'ALL' || med.type === libraryTypeFilter;
      const matchesSearch = !librarySearch.trim() || 
        med.title?.toLowerCase().includes(librarySearch.toLowerCase()) || 
        med.format?.toLowerCase().includes(librarySearch.toLowerCase()) ||
        med.url?.toLowerCase().includes(librarySearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [overview?.media_library, libraryTypeFilter, librarySearch]);

    // TRANSMITIR ENXOVAL DE FATO (Salva + Dispara SSE para os celulares da bancada)
  const handlePublishMediaPlaylist = async () => {
    if (!currentMediaDevice) return;
    setIsPublishingMedia(true);
    try {
      const res = await fetch('/api/admin/device-playlist/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: currentMediaDevice.id,
          playlist: currentPlaylist
        })
      });
      if (res.ok) {
        setLocalMediaPlaylists(prev => {
          const copy = { ...prev };
          delete copy[currentMediaDevice.id];
          return copy;
        });
        showToast(`🎉 Enxoval de mídia do ${currentMediaDevice.model_name} transmitido aos pedestais em tempo real!`, 'success');
        await fetchOverview(currentMediaDevice.id);
      } else {
        alert('Erro ao transmitir enxoval para os pedestais');
      }
    } catch (err) {
      alert('Erro de conexão ao transmitir enxoval');
    } finally {
      setIsPublishingMedia(false);
    }
  };

  const handleCreateDeviceWithMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingDevice(true);

    const formData = new FormData();
    formData.append('model_name', devModelName);
    formData.append('brand', devBrand);
    formData.append('tagline', devTagline);
    formData.append('base_price', devBasePrice);
    formData.append('target_scope', devTargetScope);
    if (devClusterId) formData.append('target_cluster_id', devClusterId);
    if (devStoreId) formData.append('target_store_id', devStoreId);
    if (devVideoFile) formData.append('video', devVideoFile);

    try {
      const res = await fetch('/api/admin/create-device-full', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        showToast(`Smartphone "${devModelName}" cadastrado com sucesso!`);
        setDevModelName('');
        setDevTagline('');
        setDevVideoFile(null);
        await fetchOverview(result.device?.id);
        setCurrentView('pricing');
      } else {
        alert('Erro ao cadastrar aparelho');
      }
    } catch (err) {
      alert('Erro de conexão ao cadastrar aparelho');
    } finally {
      setIsCreatingDevice(false);
    }
  };

  // Upload de Enxoval de Mídia (Vídeo)
  const handleUpdateDeviceMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaSelectedDevId || !mediaFile) {
      alert('Selecione um aparelho e o arquivo de vídeo .mp4');
      return;
    }
    setIsUploadingMedia(true);

    const formData = new FormData();
    formData.append('device_id', mediaSelectedDevId);
    formData.append('video', mediaFile);

    try {
      const res = await fetch('/api/admin/update-device-media', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        showToast(result.message || 'Vídeo de campanha atualizado com sucesso!');
        setMediaFile(null);
        await fetchOverview();
      } else {
        alert('Erro ao enviar vídeo');
      }
    } catch (err) {
      alert('Erro de conexão ao enviar mídia');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Criar Novo Plano Global
  const handleCreateGlobalPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPlan(true);

    try {
      const res = await fetch('/api/admin/create-global-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planName,
          category: planCategory,
          badge: planBadge || planName
        })
      });

      if (res.ok) {
        showToast(`Plano comercial "${planName}" adicionado ao catálogo nacional!`);
        setPlanName('');
        setPlanBadge('');
        await fetchOverview();
      }
    } catch (err) {
      alert('Erro ao cadastrar plano');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  // Criar Cluster
  const handleCreateCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClusterName) return;
    setIsCreatingCluster(true);
    try {
      const res = await fetch('/api/admin/create-cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClusterName, description: newClusterDesc })
      });
      if (res.ok) {
        showToast(`Cluster "${newClusterName}" criado com sucesso!`);
        setNewClusterName('');
        setNewClusterDesc('');
        await fetchOverview();
      }
    } catch (err) {
      alert('Erro ao criar cluster');
    } finally {
      setIsCreatingCluster(false);
    }
  };

  // Criar Loja
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreCity) return;
    setIsCreatingStore(true);
    try {
      const res = await fetch('/api/admin/create-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStoreName,
          city: newStoreCity,
          code: newStoreCode,
          cluster_id: newStoreClusterId || overview?.clusters?.[0]?.id
        })
      });
      if (res.ok) {
        showToast(`Loja "${newStoreName}" cadastrada com sucesso!`);
        setNewStoreName('');
        setNewStoreCity('');
        setNewStoreCode('');
        await fetchOverview();
      }
    } catch (err) {
      alert('Erro ao criar loja');
    } finally {
      setIsCreatingStore(false);
    }
  };

  const selectedDevice = overview?.catalog?.find((d: any) => d.id === selectedDeviceId);

  return (
    <div className="min-h-screen bg-[#070C18] text-white p-4 sm:p-6 md:p-8 font-sans selection:bg-[#00B5E2] selection:text-[#001438]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER CORPORATIVO TIM */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-5 gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <TimLogo className="h-6 w-auto" variant="white" />
              <span className="text-[10px] bg-[#002B7F] px-3 py-1 rounded-full font-black text-[#00B5E2] uppercase tracking-wider border border-[#00B5E2]/40 shadow-sm">
                Showroom Retail Hub Enterprise
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <h1 className="text-2xl font-black text-gray-100 tracking-tight">Central de Gestão de Vitrine & Showroom</h1>
              {currentView !== 'dashboard' && (
                <span className="text-xs bg-white/10 text-[#00B5E2] font-black px-2.5 py-0.5 rounded-lg">
                  {currentView === 'pricing' && '• Precificação & Ofertas'}
                  {currentView === 'media' && '• Enxovais de Mídia'}
                  {currentView === 'devices' && '• Cadastro de Smartphones'}
                  {currentView === 'plans' && '• Catálogo de Planos'}
                  {currentView === 'clusters' && '• Clusterização & Lojas'}
                  {currentView === 'simulators' && '• Simuladores de Vitrine'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Plataforma in-house de degustação e precificação regulada para smartphones em loja física</p>
          </div>

          <div className="flex items-center space-x-3">
            {currentView !== 'dashboard' && (
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Dashboard</span>
              </button>
            )}

            <div className="bg-[#0E172C] border border-white/10 px-4 py-2 rounded-2xl flex items-center space-x-3 shadow-xl">
              <div className="relative">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Bancada Conectada</span>
                <span className="text-xs font-black text-white">
                  {overview ? `${overview.connected_devices} quiosque(s) online` : 'Conectando...'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* TOAST FEEDBACK */}
        {toast && (
          <div className={`p-4 rounded-2xl flex items-center space-x-3 animate-fadeIn shadow-xl border ${
            toast.type === 'info' 
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' 
              : toast.type === 'warning'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold">{toast.msg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 0: DASHBOARD INICIAL (HUB DE MÓDULOS & VISÃO EXECUTIVA) */}
        {/* ========================================================================= */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* LINHA DE KPIS EM TEMPO REAL */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0E172C] border border-white/10 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Quiosques na Bancada</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{overview?.connected_devices || 0}</div>
                <span className="text-[11px] text-emerald-400 font-bold block mt-1">Conectados via SSE em tempo real</span>
              </div>

              <div className="bg-[#0E172C] border border-white/10 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Smartphones Homologados</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#00B5E2] flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{overview?.catalog?.length || 0}</div>
                <span className="text-[11px] text-gray-400 block mt-1">Modelos no catálogo com enxoval</span>
              </div>

              <div className="bg-[#0E172C] border border-white/10 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Planos Comerciais</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{overview?.global_plans?.length || 0}</div>
                <span className="text-[11px] text-gray-400 block mt-1">TIM Black, Controle e Avulso</span>
              </div>

              <div className="bg-[#0E172C] border border-white/10 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Cobertura Regional</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">
                  {overview?.clusters?.length || 0} <span className="text-sm font-normal text-gray-400">clusters /</span> {overview?.stores?.length || 0} <span className="text-sm font-normal text-gray-400">lojas</span>
                </div>
                <span className="text-[11px] text-purple-300 block mt-1">Segmentação de praça homologada</span>
              </div>
            </div>

            {/* GRID DOS 6 MÓDULOS OPERACIONAIS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base font-black text-white">Módulos de Gestão do Showroom</h2>
                  <p className="text-xs text-gray-400">Selecione o módulo operacional que deseja gerenciar</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Módulo 1: Precificação CDC */}
                <div 
                  onClick={() => setCurrentView('pricing')}
                  className="bg-[#0E172C] hover:bg-[#131E38] border border-white/10 hover:border-[#00B5E2]/50 p-6 rounded-3xl transition-all cursor-pointer shadow-xl group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#002B7F] text-[#00B5E2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <Tag className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
                        Motor CDC Auditado
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-[#00B5E2] transition-colors">1. Precificação & Matriz de Ofertas</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Cálculo automático de parcelas sem digitação manual, subsídios TIM, rascunhos Power BI e transmissão para bancada.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#00B5E2]">
                    <span>Acessar Precificação</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Módulo 2: Gestão de Enxovais */}
                <div 
                  onClick={() => setCurrentView('media')}
                  className="bg-[#0E172C] hover:bg-[#131E38] border border-white/10 hover:border-[#00B5E2]/50 p-6 rounded-3xl transition-all cursor-pointer shadow-xl group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#002B7F] text-[#00B5E2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <Film className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/30">
                        Vídeos 9:16
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-[#00B5E2] transition-colors">2. Gestão de Enxovais de Mídia</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Audite os vídeos verticais em loop, substitua campanhas publicitárias MP4 e pré-visualize na proporção da vitrine.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#00B5E2]">
                    <span>Gerenciar Enxovais</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Módulo 3: Cadastro de Smartphones */}
                <div 
                  onClick={() => setCurrentView('devices')}
                  className="bg-[#0E172C] hover:bg-[#131E38] border border-white/10 hover:border-[#00B5E2]/50 p-6 rounded-3xl transition-all cursor-pointer shadow-xl group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#002B7F] text-[#00B5E2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30">
                        Catálogo de Aparelhos
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-[#00B5E2] transition-colors">3. Cadastro de Smartphones</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Cadastre novos modelos com Preço Base Oficial (MSRP), ficha técnica, cores disponíveis e upload de vídeo de lançamento.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#00B5E2]">
                    <span>Novo Aparelho</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Módulo 4: Catálogo de Planos */}
                <div 
                  onClick={() => setCurrentView('plans')}
                  className="bg-[#0E172C] hover:bg-[#131E38] border border-white/10 hover:border-[#00B5E2]/50 p-6 rounded-3xl transition-all cursor-pointer shadow-xl group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#002B7F] text-[#00B5E2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <Layers className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
                        Portfólio TIM
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-[#00B5E2] transition-colors">4. Catálogo de Planos Comerciais</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Cadastre e padronize os planos globais da operadora (TIM Black Família, Individual, Controle e Desbloqueado).
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#00B5E2]">
                    <span>Ver Catálogo</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Módulo 5: Clusterização de Lojas */}
                <div 
                  onClick={() => setCurrentView('clusters')}
                  className="bg-[#0E172C] hover:bg-[#131E38] border border-white/10 hover:border-[#00B5E2]/50 p-6 rounded-3xl transition-all cursor-pointer shadow-xl group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#002B7F] text-[#00B5E2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/30">
                        Rede de Lojas
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-[#00B5E2] transition-colors">5. Clusterização & Nichos de Lojas</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Segmentação de ofertas por perfil de loja (Flagships, Litoral, Interior, Franquias) ou lojas individuais da rede.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#00B5E2]">
                    <span>Gerenciar Praças</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Módulo 6: Central de Simuladores */}
                <div 
                  onClick={() => setCurrentView('simulators')}
                  className="bg-[#0E172C] hover:bg-[#131E38] border border-white/10 hover:border-[#00B5E2]/50 p-6 rounded-3xl transition-all cursor-pointer shadow-xl group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#002B7F] text-[#00B5E2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <MonitorSmartphone className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-500/30">
                        Vitrine em Tempo Real
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-[#00B5E2] transition-colors">6. Central de Simuladores de Vitrine</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Abra telas simuladas de pedestais individuais (Galaxy S24, iPhone 16, etc.) e teste a experiência do cliente ao vivo.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#00B5E2]">
                    <span>Abrir Simuladores</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: PRECIFICAÇÃO & MATRIZ DE OFERTAS (MOTOR CDC + POWER BI BAR) */}
        {/* ========================================================================= */}
        {currentView === 'pricing' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* BARRA SUPERIOR POWER BI: STATUS DE RASCUNHO & TRANSAÇÃO */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
              isDirty 
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : pendingSync
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                  : 'bg-[#0E172C] border-white/10 text-gray-300'
            }`}>
              <div className="flex items-center space-x-3">
                {isDirty ? (
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
                ) : pendingSync ? (
                  <div className="w-3 h-3 rounded-full bg-[#00B5E2] shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
                )}
                
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isDirty 
                        ? 'Modo Rascunho - Edições locais não salvas' 
                        : pendingSync 
                          ? 'Rascunho Salvo no Servidor - Aguardando Transmissão' 
                          : 'Vitrine da Loja 100% Sincronizada'}
                    </span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md font-mono">
                      {selectedDevice?.model_name || 'Nenhum'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isDirty 
                      ? 'Você pode descartar ou salvar o rascunho para continuar editando. A loja só atualiza ao clicar em Transmitir.' 
                      : pendingSync
                        ? 'As alterações estão salvas no banco. Clique em "Transmitir Ofertas" para atualizar a tela dos clientes.'
                        : 'Os clientes na bancada da loja estão vendo exatamente estes valores agora.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {isDirty && (
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="bg-white/10 hover:bg-white/20 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Descartar</span>
                  </button>
                )}

                {isDirty && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="bg-[#002B7F] hover:bg-[#0038A8] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 text-[#00B5E2]" />
                    <span>{isSavingDraft ? 'Salvando...' : 'Salvar Rascunho'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePublishOffers}
                  disabled={isPublishing || (!isDirty && !pendingSync)}
                  className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all shadow-lg cursor-pointer ${
                    isDirty || pendingSync
                      ? 'bg-[#00B5E2] hover:bg-cyan-400 text-[#001438] shadow-cyan-500/20'
                      : 'bg-white/10 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPublishing ? 'Transmitindo...' : 'Transmitir Ofertas'}</span>
                </button>
              </div>
            </div>

            {/* CABEÇALHO DO APARELHO EM CONFIGURAÇÃO */}
            <div className="bg-[#0E172C] p-6 rounded-3xl border border-white/10 space-y-6 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                
                {/* Seletor de Aparelho */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#002B7F] flex items-center justify-center text-[#00B5E2] shrink-0 border border-[#00B5E2]/30">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Smartphone em Precificação</span>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleSelectDevice(e.target.value)}
                      className="bg-[#070C18] border border-white/15 rounded-xl px-4 py-2 text-sm font-black text-white focus:outline-none focus:border-[#00B5E2] mt-1 cursor-pointer"
                    >
                      {overview?.catalog?.map((d: any) => (
                        <option key={d.id} value={d.id} className="bg-[#0E172C] text-white">
                          {d.brand} - {d.model_name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-400 block mt-1">
                      Aparelhos na bancada mantêm seus modelos fixos e independentes
                    </span>
                  </div>
                </div>

                {/* Preço Base Oficial de Tabela */}
                <div className="bg-[#070C18] border border-[#00B5E2]/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#00B5E2]" />
                      <label className="text-[10px] uppercase font-black text-[#00B5E2] tracking-wider block">
                        Preço Base Oficial de Tabela (MSRP)
                      </label>
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Base matemática para o cálculo automático de descontos e parcelas
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      min={0}
                      step="50"
                      value={localBasePrice}
                      onChange={(e) => handleBasePriceChange(Number(e.target.value))}
                      className="bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-sm font-black text-white focus:outline-none focus:border-[#00B5E2] w-36 text-right"
                    />
                  </div>
                </div>

                {/* Simulador da Vitrine */}
                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.open(`/display?device=${selectedDeviceId}`, '_blank')}
                    className="bg-[#002B7F] hover:bg-[#0038A8] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md cursor-pointer border border-[#00B5E2]/20"
                  >
                    <ExternalLink className="w-4 h-4 text-[#00B5E2]" />
                    <span>Abrir Simulador deste Modelo</span>
                  </button>
                </div>
              </div>

              {/* Segmentação de Lojas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#070C18]/60 p-4 rounded-2xl border border-white/5">
                <div className="md:col-span-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Building2 className="w-4 h-4 text-[#00B5E2]" />
                    <span className="text-xs font-black uppercase text-gray-200 tracking-wider">Clusterização de Lojas</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Defina se as ofertas deste smartphone são válidas nacionalmente, em um cluster regional ou em uma loja específica.
                  </p>
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setLocalTargetScope('all'); setIsDirty(true); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        localTargetScope === 'all' ? 'bg-[#002B7F] text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Toda a Rede</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setLocalTargetScope('cluster'); setIsDirty(true); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        localTargetScope === 'cluster' ? 'bg-[#002B7F] text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Por Cluster</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setLocalTargetScope('store'); setIsDirty(true); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        localTargetScope === 'store' ? 'bg-[#002B7F] text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Loja Única</span>
                    </button>
                  </div>

                  {localTargetScope === 'cluster' && (
                    <select
                      value={localClusterId}
                      onChange={(e) => { setLocalClusterId(e.target.value); setIsDirty(true); }}
                      className="bg-[#070C18] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00B5E2] cursor-pointer"
                    >
                      {overview?.clusters?.map((c: any) => (
                        <option key={c.id} value={c.id} className="bg-[#0E172C] text-white">{c.name}</option>
                      ))}
                    </select>
                  )}

                  {localTargetScope === 'store' && (
                    <select
                      value={localStoreId}
                      onChange={(e) => { setLocalStoreId(e.target.value); setIsDirty(true); }}
                      className="bg-[#070C18] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00B5E2] cursor-pointer"
                    >
                      {overview?.stores?.map((s: any) => (
                        <option key={s.id} value={s.id} className="bg-[#0E172C] text-white">{s.name} ({s.city})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

            </div>

            {/* GRADE DE OFERTAS AUDITADAS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-2">
                <div>
                  <h3 className="text-sm font-black text-gray-100 flex items-center space-x-2">
                    <span>Matriz Comercial de Planos TIM</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                      Cálculo Automático & Auditado
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Informe apenas o valor do subsídio (desconto comercial). As parcelas e textos de vitrine são gerados matematicamente.
                  </p>
                </div>

                <div className="text-[11px] text-gray-400 bg-[#0E172C] px-3 py-1 rounded-xl border border-white/10 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-[#00B5E2]" />
                  <span>Preço Base de Cálculo: <strong>{localBasePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localPlans.map((plan: any) => {
                  const isActive = plan.is_active !== false;
                  const subsidy = Number(plan.subsidy_amount) || 0;
                  const installments = Number(plan.installments_count) || 12;

                  return (
                    <div
                      key={plan.id}
                      className={`p-5 rounded-3xl border transition-all relative ${
                        isActive
                          ? 'bg-[#0E172C] border-white/15 shadow-xl'
                          : 'bg-white/5 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePlanActive(plan.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{isActive ? 'Ativo na Vitrine' : 'Oculto'}</span>
                          </button>

                          <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                            {plan.plan_category}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSetFeatured(plan.id)}
                          className={`text-[10px] font-black px-3 py-1 rounded-full transition-all cursor-pointer ${
                            plan.is_featured 
                              ? 'bg-amber-400 text-black shadow-md ring-2 ring-amber-400/40' 
                              : 'bg-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          {plan.is_featured ? '★ Capa da Vitrine' : 'Tornar Capa'}
                        </button>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-black text-white">{plan.plan_name}</h4>
                        <span className="text-[10px] text-gray-400">{plan.plan_badge}</span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] uppercase font-black text-gray-300 flex items-center space-x-1">
                              <DollarSign className="w-3 h-3 text-[#00B5E2]" />
                              <span>Subsídio / Desconto Operadora (R$)</span>
                            </label>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              {localBasePrice > 0 ? `${Math.round((subsidy / localBasePrice) * 100)}% de desconto` : '0%'}
                            </span>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                            <input
                              type="number"
                              min={0}
                              max={localBasePrice}
                              step="50"
                              value={subsidy}
                              onChange={(e) => handlePlanSubsidyChange(plan.id, Number(e.target.value))}
                              className="w-full bg-[#070C18] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-white focus:outline-none focus:border-[#00B5E2]"
                            />
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {[0, 500, 1000, 1500, 2000, 2500].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handlePlanSubsidyChange(plan.id, val)}
                                className={`text-[9px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                  subsidy === val ? 'bg-[#00B5E2] text-[#001438]' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                              >
                                {val === 0 ? 'Sem Desconto' : `R$ ${val}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-black text-gray-300 block mb-1">
                            Condição de Parcelamento Sem Juros
                          </label>
                          <select
                            value={installments}
                            onChange={(e) => handlePlanInstallmentsChange(plan.id, Number(e.target.value))}
                            className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#00B5E2] cursor-pointer"
                          >
                            <option value={1} className="bg-[#0E172C] text-white">1x (À vista no cartão)</option>
                            <option value={6} className="bg-[#0E172C] text-white">6x sem juros</option>
                            <option value={10} className="bg-[#0E172C] text-white">10x sem juros</option>
                            <option value={12} className="bg-[#0E172C] text-white">12x sem juros (Padrão TIM)</option>
                            <option value={18} className="bg-[#0E172C] text-white">18x sem juros (Cartão TIM Itaú / C6)</option>
                            <option value={24} className="bg-[#0E172C] text-white">24x sem juros (Especial)</option>
                          </select>
                        </div>

                        <div className="bg-[#070C18] p-3.5 rounded-2xl border border-white/10 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-400 uppercase font-bold">À Vista no Cartão:</span>
                            <span className="font-black text-white">
                              {plan.price_cash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 uppercase font-bold text-[10px]">Parcelamento:</span>
                            <span className="font-black text-[#00B5E2]">
                              {plan.price_installments}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5">
                            <span className="text-gray-400 uppercase font-bold">Selo de Vitrine:</span>
                            <span className="font-bold text-emerald-400">
                              {plan.discount_label}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: GESTÃO DE ENXOVAIS DE MÍDIA (MULTI-MÍDIA, BUSCA, PREVIEW & ACERVO) */}
        {/* ========================================================================= */}
        {currentView === 'media' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Bar: Título & Botão para Acessar Acervo Geral */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E172C] p-6 rounded-3xl border border-white/10 shadow-xl">
              <div>
                <div className="flex items-center space-x-2">
                  <Film className="w-5 h-5 text-[#00B5E2]" />
                  <h3 className="text-lg font-black text-white">Enxovais de Mídia & Vitrine Digital</h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Configure playlists sequenciais de vídeos e pôsteres para reprodução no modo de espera (Attract Mode)
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsMediaLibraryModalOpen(true)}
                  className="bg-gradient-to-r from-[#002B7F] to-[#001F5C] hover:from-[#0038A8] hover:to-[#002B7F] text-white px-4 py-2.5 rounded-2xl text-xs font-black border border-white/15 flex items-center space-x-2 transition-all shadow-lg cursor-pointer"
                >
                  <Database className="w-4 h-4 text-[#00B5E2]" />
                  <span>Banco de Mídias / Acervo</span>
                  <span className="bg-[#00B5E2] text-[#001438] text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {overview?.media_library?.length || 0}
                  </span>
                </button>
              </div>
            </div>

            {/* BARRA DE BUSCA E FILTRO DE MARCAS (Elimina a poluição de múltiplos vídeos simultâneos) */}
            <div className="bg-[#0E172C] p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Input de Busca */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder="Buscar smartphone por modelo ou fabricante (ex: S24, iPhone, Samsung)..."
                    className="w-full bg-[#070C18] border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B5E2]"
                  />
                  {mediaSearch && (
                    <button 
                      onClick={() => setMediaSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filtros por Marca */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
                  {['TODOS', 'Samsung', 'Apple', 'Motorola', 'Xiaomi'].map((brand) => {
                    const isSelected = mediaBrandFilter.toLowerCase() === brand.toLowerCase();
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => setMediaBrandFilter(brand)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#00B5E2] text-[#001438] shadow-md shadow-cyan-500/20'
                            : 'bg-[#070C18] text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {brand}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor Compacto de Aparelhos (Cards Limpos sem Vídeo Tocando ao Mesmo Tempo) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {filteredMediaDevices.map((dev: any) => {
                  const isCurrent = currentMediaDevice?.id === dev.id;
                  const playlistCount = dev.media_playlist?.length || (dev.video_url ? 1 : 0);
                  const activeCount = dev.media_playlist ? dev.media_playlist.filter((p: any) => p.is_active !== false).length : 1;

                  return (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => {
                        setMediaSelectedDevId(dev.id);
                        setPreviewMediaIndex(0);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#002B7F]/40 border-[#00B5E2] ring-2 ring-[#00B5E2]/30 shadow-lg'
                          : 'bg-[#070C18] border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] uppercase font-black tracking-wider text-[#00B5E2] block truncate">
                          {dev.brand}
                        </span>
                        <h4 className="text-xs font-black text-white truncate mt-0.5">
                          {dev.model_name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10 text-[10px]">
                        <span className="text-gray-400 font-bold">
                          {activeCount} {activeCount === 1 ? 'mídia' : 'mídias'}
                        </span>
                        {isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-[#00B5E2] animate-ping" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredMediaDevices.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-xs">
                  Nenhum smartphone encontrado para a busca "{mediaSearch}".
                </div>
              )}
            </div>

            {/* ÁREA PRINCIPAL DO APARELHO SELECIONADO: PREVIEW 9:16 + PLAYLIST MANAGER */}
            {currentMediaDevice && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUNA 1: PREVIEW 9:16 REALISTA AO VIVO (Apenas o aparelho focado) */}
                <div className="lg:col-span-5 bg-[#0E172C] p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] uppercase font-black text-[#00B5E2] tracking-wider block">
                        Simulação do Pedestal TIM
                      </span>
                      <h4 className="text-sm font-black text-white">{currentMediaDevice.model_name}</h4>
                    </div>

                    <div className="bg-white/10 px-2.5 py-1 rounded-full text-[10px] text-gray-300 font-mono">
                      9:16 Vertical
                    </div>
                  </div>

                  {/* Mockup Vertical do Smartphone */}
                  <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-3xl overflow-hidden bg-black border-4 border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between">
                    
                    {/* Mídia em Exibição com Enquadramento & Fundo Borrado */}
                    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                      {/* Efeito Fundo Borrado (Ambient Blur) */}
                      {currentPreviewItem?.object_fit === 'blur_fill' && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                          {currentPreviewItem.type === 'video' ? (
                            <video
                              key={`blur-${currentPreviewItem.url}`}
                              src={currentPreviewItem.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover filter blur-2xl scale-125 opacity-60"
                            />
                          ) : (
                            <img
                              key={`blur-${currentPreviewItem.url}`}
                              src={currentPreviewItem.url}
                              alt=""
                              className="w-full h-full object-cover filter blur-2xl scale-125 opacity-60"
                            />
                          )}
                        </div>
                      )}

                      {currentPreviewItem?.type === 'video' ? (
                        <video
                          key={currentPreviewItem.url}
                          src={currentPreviewItem.url}
                          autoPlay
                          loop={activePlaylistItems.length === 1}
                          muted
                          playsInline
                          preload="auto"
                          style={{
                            objectFit: currentPreviewItem.object_fit === 'blur_fill' ? 'contain' : (currentPreviewItem.object_fit === 'contain' ? 'contain' : 'cover'),
                            objectPosition: `${currentPreviewItem.position_x ?? 50}% ${currentPreviewItem.position_y ?? 50}%`,
                            transform: currentPreviewItem.scale && currentPreviewItem.scale !== 1 ? `scale(${currentPreviewItem.scale})` : undefined,
                            transformOrigin: `${currentPreviewItem.position_x ?? 50}% ${currentPreviewItem.position_y ?? 50}%`
                          }}
                          onEnded={() => {
                            if (activePlaylistItems.length > 1) {
                              setPreviewMediaIndex(prev => (prev + 1) % activePlaylistItems.length);
                            }
                          }}
                          className="w-full h-full relative z-10"
                        />
                      ) : currentPreviewItem?.type === 'image' ? (
                        <img
                          key={currentPreviewItem.url}
                          src={currentPreviewItem.url}
                          alt={currentPreviewItem.title}
                          style={{
                            objectFit: currentPreviewItem.object_fit === 'blur_fill' ? 'contain' : (currentPreviewItem.object_fit === 'contain' ? 'contain' : 'cover'),
                            objectPosition: `${currentPreviewItem.position_x ?? 50}% ${currentPreviewItem.position_y ?? 50}%`,
                            transform: currentPreviewItem.scale && currentPreviewItem.scale !== 1 ? `scale(${currentPreviewItem.scale})` : undefined,
                            transformOrigin: `${currentPreviewItem.position_x ?? 50}% ${currentPreviewItem.position_y ?? 50}%`
                          }}
                          className="w-full h-full relative z-10 animate-pulse"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          Sem mídia ativa
                        </div>
                      )}
                      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />
                    </div>

                    {/* Header Mockup */}
                    <div className="relative z-10 p-3 flex items-center justify-between">
                      <TimLogo className="h-3 w-auto" variant="white" />
                      <span className="text-[8px] font-black uppercase tracking-wider bg-[#002B7F] px-2 py-0.5 rounded-full text-white border border-white/20">
                        {currentMediaDevice.plans_pricing?.[0]?.plan_badge || 'Oferta TIM'}
                      </span>
                    </div>

                    {/* Footer Mockup com Preço */}
                    <div className="relative z-10 p-3 space-y-1.5">
                      <div className="text-left">
                        <span className="text-[8px] uppercase font-bold text-[#00B5E2] block">
                          {currentMediaDevice.brand}
                        </span>
                        <div className="text-xs font-black text-white drop-shadow leading-tight">
                          {currentMediaDevice.model_name}
                        </div>
                      </div>

                      <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/20 flex items-center justify-between">
                        <div>
                          <span className="text-[7px] text-gray-300 uppercase font-bold block">A partir de</span>
                          <span className="text-[11px] font-black text-[#00B5E2] block">
                            {currentMediaDevice.plans_pricing?.[0]?.price_installments || '12x sem juros'}
                          </span>
                        </div>
                        <span className="text-[7px] bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">
                          Sem juros
                        </span>
                      </div>
                    </div>

                    {/* Tag com Nome da Mídia sendo Testada */}
                    {currentPreviewItem && (
                      <div className="absolute top-10 left-3 right-3 z-20 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[9px] text-gray-200 flex items-center justify-between">
                        <div className="flex items-center space-x-1 truncate">
                          {currentPreviewItem.type === 'video' ? (
                            <Film className="w-3 h-3 text-[#00B5E2] flex-shrink-0" />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{currentPreviewItem.title}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0 ml-1">
                          <span className="text-[9px] text-cyan-300 font-mono font-black bg-white/10 px-1.5 py-0.5 rounded">
                            {currentPreviewItem.type === 'video' ? 'Vídeo Real' : `${currentPreviewItem.duration_sec || 7}s`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenFramingModal(currentPreviewItem)}
                            className="p-1 rounded bg-[#00B5E2]/25 hover:bg-[#00B5E2]/40 text-[#00B5E2] flex items-center space-x-0.5 text-[8px] font-black border border-[#00B5E2]/40 cursor-pointer transition-all"
                            title="Ajustar posição Y, enquadramento ou fundo borrado"
                          >
                            <Sliders className="w-2.5 h-2.5" />
                            <span>Ajustar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controles do Preview (Avançar / Retroceder Slides) */}
                  {activePlaylistItems.length > 1 && (
                    <div className="flex items-center space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setPreviewMediaIndex(prev => (prev - 1 + activePlaylistItems.length) % activePlaylistItems.length)}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="text-xs font-mono font-bold text-gray-300">
                        {safePreviewIndex + 1} de {activePlaylistItems.length}
                      </span>

                      <button
                        type="button"
                        onClick={() => setPreviewMediaIndex(prev => (prev + 1) % activePlaylistItems.length)}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* COLUNA 2: GERENCIADOR DA PLAYLIST & ADIÇÃO DE MÍDIAS */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Card da Playlist Atual */}
                  <div className="bg-[#0E172C] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                    {/* BANNER DE MODIFICAÇÕES PENDENTES / RASCUNHO */}
                    {isMediaDirty && (
                      <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
                        <div className="flex items-center space-x-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                          <div>
                            <span className="text-xs font-black text-amber-300 block">
                              Alterações não transmitidas no enxoval
                            </span>
                            <span className="text-[11px] text-gray-300">
                              As modificações estão ativas apenas no rascunho/preview. Clique em <strong>Transmitir Enxoval</strong> para publicar nos pedestais.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleDiscardMediaChanges}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Descartar</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveMediaDraft}
                            disabled={isSavingMediaDraft}
                            className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSavingMediaDraft ? 'Salvando...' : 'Salvar Rascunho'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-black text-white">Playlist de Mídia deste Smartphone</h4>
                          <span className="bg-[#002B7F] text-[#00B5E2] text-[10px] font-black px-2 py-0.5 rounded-full border border-cyan-500/20">
                            {currentPlaylist.length} {currentPlaylist.length === 1 ? 'item' : 'itens'}
                          </span>
                          {isMediaDirty && (
                            <span className="bg-amber-400 text-[#001438] text-[9px] font-black px-2 py-0.5 rounded-full">
                              Rascunho Pendente
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Edite a sequência, tempos e visibilidade. A bancada só atualizará quando você clicar em Transmitir.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isPublishingMedia}
                        onClick={handlePublishMediaPlaylist}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer disabled:opacity-50 ${
                          isMediaDirty
                            ? 'bg-[#00B5E2] hover:bg-cyan-400 text-[#001438] shadow-cyan-500/30 ring-2 ring-cyan-400/50 animate-pulse'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        <Radio className="w-4 h-4" />
                        <span>
                          {isPublishingMedia 
                            ? 'Transmitindo...' 
                            : isMediaDirty 
                              ? 'Transmitir Enxoval para Pedestais' 
                              : 'Transmitir Enxoval'}
                        </span>
                      </button>
                    </div>

                    {/* Lista de Itens da Playlist */}
                    <div className="space-y-3">
                      {currentPlaylist.map((item: any, idx: number) => {
                        const isActive = item.is_active !== false;

                        return (
                          <div
                            key={item.id || idx}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isActive 
                                ? 'bg-[#070C18] border-white/10 hover:border-white/20' 
                                : 'bg-[#070C18]/40 border-dashed border-white/5 opacity-60'
                            }`}
                          >
                            {/* Miniatura & Informações */}
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10 flex items-center justify-center">
                                {item.type === 'video' ? (
                                  <>
                                    <video
                                      src={`${item.url}#t=0.001`}
                                      muted
                                      preload="metadata"
                                      playsInline
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                                      <Play className="w-3.5 h-3.5 text-white/90 drop-shadow" />
                                    </div>
                                  </>
                                ) : (
                                  <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-center font-bold text-gray-300">
                                  {item.type === 'video' ? 'VÍDEO' : 'FOTO'}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    item.type === 'video' 
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {item.type === 'video' ? 'Vídeo 9:16' : 'Pôster Foto'}
                                  </span>

                                  {idx === 0 && (
                                    <span className="text-[9px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-bold">
                                      Início da Fila
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 mt-1">
                                  <h5 className="text-xs font-black text-white truncate">{item.title}</h5>
                                  {item.object_fit === 'blur_fill' && (
                                    <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                      Fundo Borrado
                                    </span>
                                  )}
                                  {item.object_fit !== 'blur_fill' && (item.position_y !== undefined && item.position_y !== 50) && (
                                    <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                      Y: {item.position_y}%
                                    </span>
                                  )}
                                  {item.scale && item.scale !== 1 && (
                                    <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                      {item.scale}x
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 block truncate font-mono mt-0.5">
                                  {item.url}
                                </span>
                              </div>
                            </div>

                            {/* Controles de Tempo & Ações */}
                            <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                              {/* Indicador para Vídeos (Respeita tamanho integral) */}
                              {item.type === 'video' && (
                                <div className="flex items-center space-x-1.5 bg-cyan-500/10 px-2.5 py-1.5 rounded-xl border border-cyan-500/20 text-[10px] text-cyan-300 font-bold">
                                  <Film className="w-3.5 h-3.5 text-[#00B5E2] shrink-0" />
                                  <span>Duração Real do Vídeo</span>
                                </div>
                              )}

                              {/* Campo Livre de Segundos para Fotos e Pôsteres */}
                              {item.type === 'image' && (
                                <div className="flex items-center space-x-1.5 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/25">
                                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="text-[10px] text-gray-300 font-bold">Tempo em tela:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={3600}
                                    value={item.duration_sec ?? 7}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      handleUpdateItemDuration(item.id, val);
                                    }}
                                    className="w-14 bg-[#070C18] border border-amber-500/40 rounded-lg px-1.5 py-0.5 text-xs font-black text-amber-300 text-center focus:outline-none focus:border-[#00B5E2]"
                                  />
                                  <span className="text-[10px] text-amber-300/90 font-bold">segundos</span>
                                </div>
                              )}

                              {/* Botão de Enquadramento & Posição */}
                              <button
                                type="button"
                                onClick={() => handleOpenFramingModal(item)}
                                className="px-2 py-1.5 rounded-xl bg-[#00B5E2]/15 hover:bg-[#00B5E2]/30 text-[#00B5E2] border border-[#00B5E2]/30 flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
                                title="Editar posição vertical (Y), zoom ou modo de tela"
                              >
                                <Sliders className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[10px] font-black">Enquadrar</span>
                              </button>

                              {/* Reordenar */}
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMovePlaylistItem(idx, 'up')}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 cursor-pointer"
                                  title="Mover para Cima"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === currentPlaylist.length - 1}
                                  onClick={() => handleMovePlaylistItem(idx, 'down')}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 cursor-pointer"
                                  title="Mover para Baixo"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Ativar/Desativar */}
                              <button
                                type="button"
                                onClick={() => handleTogglePlaylistItem(item.id)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-white/5 text-gray-400 border-white/10'
                                }`}
                                title={isActive ? 'Desativar desta vitrine' : 'Ativar na vitrine'}
                              >
                                {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </button>

                              {/* Remover */}
                              <button
                                type="button"
                                onClick={() => handleRemovePlaylistItem(item.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 cursor-pointer"
                                title="Remover da Playlist"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botões de Ação para Adicionar Conteúdo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsMediaLibraryModalOpen(true)}
                        className="w-full bg-[#002B7F] hover:bg-[#0038A8] text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center space-x-2 transition-all border border-cyan-500/30 cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4 text-[#00B5E2]" />
                        <span>Escolher do Acervo (Banco de Mídias)</span>
                      </button>

                      <label 
                        htmlFor="direct-media-upload" 
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-200 py-3 rounded-2xl text-xs font-black flex items-center justify-center space-x-2 transition-all border border-white/15 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-400" />
                        <span>Upload Direto (Vídeo / Foto)</span>
                      </label>
                    </div>
                  </div>

                  {/* Painel de Upload Rápido de Novo Arquivo (Vídeo ou Foto) */}
                  <div className="bg-[#0E172C] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                    <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                      <Upload className="w-4 h-4 text-[#00B5E2]" />
                      <h4 className="text-sm font-black text-white">Adicionar Novo Arquivo de Mídia</h4>
                    </div>

                    <form onSubmit={handleUploadMediaDirectly} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                            Título da Mídia / Campanha
                          </label>
                          <input
                            type="text"
                            value={mediaTitle}
                            onChange={(e) => setMediaTitle(e.target.value)}
                            placeholder="Ex: Campanha Dia das Mães TIM Black..."
                            className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B5E2]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                            Tempo em Tela (se foto/pôster)
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={1}
                              max={3600}
                              value={mediaDurationSec}
                              onChange={(e) => setMediaDurationSec(Math.max(1, parseInt(e.target.value) || 1))}
                              placeholder="Ex: 7"
                              className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 pr-16 text-xs font-black text-white focus:outline-none focus:border-[#00B5E2]"
                            />
                            <span className="absolute right-3 text-[10px] font-bold text-gray-400 pointer-events-none">
                              segundos
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <input
                          type="file"
                          accept="video/*,image/*"
                          id="direct-media-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setMediaFile(file);
                            if (file) {
                              const sizeMB = file.size / (1024 * 1024);
                              setUploadFileSizeMB(sizeMB);
                              if (!mediaTitle) {
                                setMediaTitle(file.name.replace(/\.[^/.]+$/, ""));
                              }
                              if (sizeMB > 150) {
                                setUploadSizeWarning(`Arquivo excede o limite máximo suportado de 150 MB (${sizeMB.toFixed(1)} MB). Por favor, comprima o arquivo antes de enviar.`);
                              } else if (sizeMB > 55) {
                                setUploadSizeWarning(`⚠️ Arquivo de alta resolução com ${sizeMB.toFixed(1)} MB detectado (acima do recomendado de 55 MB). O upload funcionará normalmente via streaming por blocos HTTP 206, mas vídeos pesados exigem maior estabilidade da rede Wi-Fi da loja física.`);
                              } else {
                                setUploadSizeWarning(null);
                              }
                            } else {
                              setUploadFileSizeMB(null);
                              setUploadSizeWarning(null);
                            }
                          }}
                          className="hidden"
                        />
                        {/* Banner de Recomendações Técnicas */}
                      <div className="bg-[#002B7F]/20 border border-cyan-500/30 rounded-2xl p-3 flex items-start space-x-2.5 text-xs mb-3">
                        <Info className="w-4 h-4 text-[#00B5E2] shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-gray-300 text-[11px] leading-relaxed">
                          <div className="font-bold text-white flex items-center space-x-2">
                            <span>Recomendações Técnicas para o Pedestal:</span>
                            <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full text-[9px] font-mono">
                              Vertical 9:16 (1080x1920)
                            </span>
                          </div>
                          <p>
                            • <strong>Tamanho ideal:</strong> até <strong>55 MB</strong> por arquivo para carregamento ágil na loja.<br />
                            • <strong>Alta Resolução:</strong> Suportado até <strong>150 MB</strong> com streaming HTTP 206.<br />
                            • <strong>Ajuste de Posição:</strong> Vídeos horizontais ou com enquadramento a corrigir podem ser ajustados no botão <em>"Enquadrar"</em> após o envio!
                          </p>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-white/20 hover:border-[#00B5E2] rounded-2xl p-4 text-center cursor-pointer bg-white/5 transition-all">
                          <label htmlFor="direct-media-upload" className="cursor-pointer flex flex-col items-center">
                            <FileVideo className="w-6 h-6 text-[#00B5E2] mb-1" />
                            <span className="text-xs font-bold text-white">
                              {mediaFile ? mediaFile.name : 'Clique para escolher arquivo MP4, WEBM, PNG ou JPG'}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">
                              Formatos aceitos: Vídeos verticais e Imagens promocionais de alta resolução
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Feedback de Tamanho de Arquivo */}
                      {uploadFileSizeMB !== null && (
                        <div className="flex items-center justify-between text-xs px-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400 font-bold text-[10px]">Tamanho do Arquivo:</span>
                            <span className={`font-mono font-bold text-[11px] ${
                              uploadFileSizeMB > 150 
                                ? 'text-rose-400' 
                                : uploadFileSizeMB > 55 
                                  ? 'text-amber-300' 
                                  : 'text-emerald-400'
                            }`}>
                              {uploadFileSizeMB.toFixed(2)} MB
                            </span>
                            {uploadFileSizeMB <= 55 && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                Excelente para Loja
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Alerta Amarelo ou Vermelho */}
                      {uploadSizeWarning && (
                        <div className={`p-3 rounded-2xl border text-xs flex items-start space-x-2.5 ${
                          uploadFileSizeMB && uploadFileSizeMB > 150
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        }`}>
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                            uploadFileSizeMB && uploadFileSizeMB > 150 ? 'text-rose-400' : 'text-amber-400'
                          }`} />
                          <span className="text-[11px] leading-relaxed font-medium">{uploadSizeWarning}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isUploadingMedia || !mediaFile || (uploadFileSizeMB !== null && uploadFileSizeMB > 150)}
                        className="w-full bg-[#00B5E2] hover:bg-cyan-400 text-[#001438] font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingMedia ? 'Processando Upload...' : 'Enviar e Adicionar à Playlist'}</span>
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            )}

            {/* MODAL DE ENQUADRAMENTO E DIMENSIONAMENTO DE VÍDEO / MÍDIA */}
            {framingItem && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                <div className="bg-[#0B132B] border border-white/20 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
                  {/* Modal Header */}
                  <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#070C18]/80">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-[#00B5E2]/20 border border-[#00B5E2]/40 rounded-2xl">
                        <Sliders className="w-5 h-5 text-[#00B5E2]" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white flex items-center space-x-2">
                          <span>Ajuste de Enquadramento 9:16</span>
                          <span className="text-[10px] uppercase font-bold bg-[#002B7F] px-2.5 py-0.5 rounded-full text-cyan-300 border border-cyan-500/30">
                            {framingItem.type === 'video' ? 'Vídeo' : 'Imagem'}
                          </span>
                        </h3>
                        <p className="text-xs text-gray-400">
                          Mídia: <strong className="text-white">{framingItem.title}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFramingItem(null)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body: Split View (Mockup Preview à esquerda, Controles à direita) */}
                  <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Coluna Esquerda: Mockup 9:16 com Visualização em Tempo Real */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center">
                      <div className="text-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Preview em Tempo Real (Pedestal 9:16)
                        </span>
                      </div>

                      <div className="relative aspect-[9/16] w-56 sm:w-60 rounded-3xl overflow-hidden border-2 border-white/25 bg-black shadow-2xl flex items-center justify-center">
                        {/* Fundo com Efeito Fundo Borrado (Ambient Blur) */}
                        {framingFit === 'blur_fill' && (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                            {framingItem.type === 'video' ? (
                              <video
                                src={framingItem.url}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover filter blur-2xl scale-125 opacity-60"
                              />
                            ) : (
                              <img
                                src={framingItem.url}
                                alt=""
                                className="w-full h-full object-cover filter blur-2xl scale-125 opacity-60"
                              />
                            )}
                          </div>
                        )}

                        {/* Mídia Principal com estilos dinâmicos aplicados */}
                        {framingItem.type === 'video' ? (
                          <video
                            key={`modal-preview-${framingItem.url}`}
                            src={framingItem.url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{
                              objectFit: framingFit === 'blur_fill' ? 'contain' : (framingFit === 'contain' ? 'contain' : 'cover'),
                              objectPosition: `${framingPosX}% ${framingPosY}%`,
                              transform: framingScale !== 1 ? `scale(${framingScale})` : undefined,
                              transformOrigin: `${framingPosX}% ${framingPosY}%`
                            }}
                            className="w-full h-full relative z-10"
                          />
                        ) : (
                          <img
                            key={`modal-preview-img-${framingItem.url}`}
                            src={framingItem.url}
                            alt={framingItem.title}
                            style={{
                              objectFit: framingFit === 'blur_fill' ? 'contain' : (framingFit === 'contain' ? 'contain' : 'cover'),
                              objectPosition: `${framingPosX}% ${framingPosY}%`,
                              transform: framingScale !== 1 ? `scale(${framingScale})` : undefined,
                              transformOrigin: `${framingPosX}% ${framingPosY}%`
                            }}
                            className="w-full h-full relative z-10"
                          />
                        )}

                        {/* Overlays de Interface para verificar se o preço encobre */}
                        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
                          <TimLogo className="h-3 w-auto" variant="white" />
                          <span className="text-[7px] bg-[#002B7F] px-1.5 py-0.5 rounded text-white font-bold">
                            TIM Black
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 z-20 bg-black/75 backdrop-blur-md p-2 rounded-xl border border-white/20 pointer-events-none">
                          <span className="text-[7px] text-gray-300 block">Preço de Referência</span>
                          <span className="text-[10px] font-black text-[#00B5E2] block">12x R$ 458,25 sem juros</span>
                        </div>

                        {/* Guia de Enquadramento Suave */}
                        <div className="absolute inset-0 border border-cyan-500/20 pointer-events-none z-30" />
                      </div>
                    </div>

                    {/* Coluna Direita: Controles Interativos */}
                    <div className="md:col-span-7 space-y-4">
                      {/* 1. Modo de Exibição */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-wider text-gray-300 block">
                          Modo de Ajuste na Tela Vertical
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'cover', label: 'Preencher (Cover)', desc: '100% da tela sem bordas' },
                            { id: 'blur_fill', label: 'Fundo Borrado', desc: 'Ideal p/ vídeos 16:9 horizontais' },
                            { id: 'contain', label: 'Conter Inteiro', desc: 'Com barras pretas limpas' }
                          ].map(mode => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setFramingFit(mode.id as any)}
                              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                framingFit === mode.id
                                  ? 'bg-[#002B7F] border-[#00B5E2] text-white shadow-lg'
                                  : 'bg-[#070C18] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                              }`}
                            >
                              <span className="text-xs font-black block">{mode.label}</span>
                              <span className="text-[9px] text-gray-300 block mt-0.5">{mode.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Posição Vertical (Eixo Y) */}
                      <div className="bg-[#070C18] p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-white flex items-center space-x-1.5">
                            <Move className="w-3.5 h-3.5 text-[#00B5E2]" />
                            <span>Posição Vertical (Eixo Y - Subir / Descer)</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            {framingPosY}%
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={framingPosY}
                          onChange={(e) => setFramingPosY(Number(e.target.value))}
                          className="w-full accent-[#00B5E2] cursor-pointer"
                        />

                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>0% (Foco no Topo / Rosto)</span>
                          <span>50% (Centro)</span>
                          <span>100% (Foco na Base)</span>
                        </div>

                        {/* Botões Rápidos de Posição Y */}
                        <div className="flex items-center space-x-2 pt-0.5">
                          {[
                            { label: 'Topo (20%)', val: 20 },
                            { label: 'Centro (50%)', val: 50 },
                            { label: 'Base (80%)', val: 80 }
                          ].map(b => (
                            <button
                              key={b.val}
                              type="button"
                              onClick={() => setFramingPosY(b.val)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                framingPosY === b.val
                                  ? 'bg-[#00B5E2]/30 border-[#00B5E2] text-cyan-300'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Posição Horizontal (Eixo X) */}
                      <div className="bg-[#070C18] p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-white flex items-center space-x-1.5">
                            <Move className="w-3.5 h-3.5 text-[#00B5E2] rotate-90" />
                            <span>Posição Horizontal (Eixo X - Esquerda / Direita)</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            {framingPosX}%
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={framingPosX}
                          onChange={(e) => setFramingPosX(Number(e.target.value))}
                          className="w-full accent-[#00B5E2] cursor-pointer"
                        />

                        <div className="flex items-center space-x-2 pt-0.5">
                          {[
                            { label: 'Esquerda (20%)', val: 20 },
                            { label: 'Centro (50%)', val: 50 },
                            { label: 'Direita (80%)', val: 80 }
                          ].map(b => (
                            <button
                              key={b.val}
                              type="button"
                              onClick={() => setFramingPosX(b.val)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                framingPosX === b.val
                                  ? 'bg-[#00B5E2]/30 border-[#00B5E2] text-cyan-300'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Zoom / Escala */}
                      <div className="bg-[#070C18] p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-white flex items-center space-x-1.5">
                            <ZoomIn className="w-3.5 h-3.5 text-[#00B5E2]" />
                            <span>Zoom / Aproximação (Escala)</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            {framingScale.toFixed(2)}x
                          </span>
                        </div>

                        <input
                          type="range"
                          min="1.0"
                          max="2.0"
                          step="0.05"
                          value={framingScale}
                          onChange={(e) => setFramingScale(Number(e.target.value))}
                          className="w-full accent-[#00B5E2] cursor-pointer"
                        />

                        <div className="flex items-center space-x-2 pt-0.5">
                          {[
                            { label: '1.0x (Padrão)', val: 1.0 },
                            { label: '1.25x', val: 1.25 },
                            { label: '1.5x', val: 1.5 },
                            { label: '1.8x', val: 1.8 }
                          ].map(b => (
                            <button
                              key={b.val}
                              type="button"
                              onClick={() => setFramingScale(b.val)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                framingScale === b.val
                                  ? 'bg-[#00B5E2]/30 border-[#00B5E2] text-cyan-300'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Botão de Redefinir */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setFramingFit('cover');
                            setFramingPosX(50);
                            setFramingPosY(50);
                            setFramingScale(1.0);
                          }}
                          className="text-[11px] text-gray-400 hover:text-white flex items-center space-x-1 cursor-pointer transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Redefinir para Padrão Central</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-white/10 bg-[#070C18] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setFramingItem(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveFraming}
                      className="bg-[#00B5E2] hover:bg-cyan-400 text-[#001438] font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aplicar Enquadramento ao Rascunho</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: BANCO DE MÍDIAS / ACERVO COMPARTILHADO */}
            {isMediaLibraryModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-[#0E172C] border border-white/20 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#002B7F] text-[#00B5E2] flex items-center justify-center shadow-md">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-black text-white">Banco de Mídias & Acervo Digital</h3>
                          <span className="bg-[#00B5E2] text-[#001438] text-[10px] px-2 py-0.5 rounded-full font-black">
                            {filteredLibraryItems.length} {filteredLibraryItems.length === 1 ? 'mídia' : 'mídias'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Vincule mídias existentes ao <strong>{currentMediaDevice?.model_name}</strong> ou exclua itens obsoletos do acervo.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMediaLibraryModalOpen(false);
                        setLibrarySearch('');
                      }}
                      className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* BARRA DE PESQUISA & FILTROS DE TIPO DO ACERVO */}
                  <div className="px-6 py-3.5 bg-[#070C18] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Campo de Busca */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        placeholder="Buscar mídia no acervo por título, formato ou arquivo..."
                        className="w-full bg-[#0E172C] border border-white/15 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B5E2]"
                      />
                      {librarySearch && (
                        <button 
                          type="button"
                          onClick={() => setLibrarySearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtros de Tipo */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {[
                        { id: 'ALL', label: 'Todas' },
                        { id: 'video', label: 'Vídeos' },
                        { id: 'image', label: 'Fotos/Pôsteres' }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setLibraryTypeFilter(f.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            libraryTypeFilter === f.id
                              ? 'bg-[#00B5E2] text-[#001438] font-black shadow-md'
                              : 'bg-[#0E172C] text-gray-400 hover:text-white border border-white/10'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modal Body: Grid de Mídias do Acervo */}
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredLibraryItems.map((med: any) => {
                        const isAlreadyInPlaylist = currentPlaylist.some((p: any) => p.url === med.url);

                        return (
                          <div
                            key={med.id}
                            className="bg-[#070C18] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-[#00B5E2] transition-all shadow-lg group relative"
                          >
                            {/* Card Header com Badge de Tipo e Botão Excluir */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                med.type === 'video' 
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {med.type === 'video' ? 'VÍDEO 9:16' : 'IMAGEM'}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFromLibrary(med.id, med.title);
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-200 border border-rose-500/20 transition-all cursor-pointer"
                                title="Excluir mídia permanentemente do acervo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Miniatura da Mídia */}
                            <div className="relative aspect-[9/16] w-full max-h-48 rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                              {med.type === 'video' ? (
                                <>
                                  <video
                                    src={`${med.url}#t=0.001`}
                                    muted
                                    preload="metadata"
                                    playsInline
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                                    <Play className="w-6 h-6 text-white/90 drop-shadow" />
                                  </div>
                                </>
                              ) : (
                                <img 
                                  src={med.url} 
                                  alt={med.title} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.opacity = '0.3';
                                  }}
                                />
                              )}
                              
                              <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-gray-200 font-mono">
                                {med.duration_sec || 7}s
                              </div>
                            </div>

                            <div>
                              <h5 className="text-xs font-black text-white truncate" title={med.title}>
                                {med.title}
                              </h5>
                              <span className="text-[10px] text-gray-400 block truncate font-mono mt-0.5">
                                {med.format || '9:16 vertical'}
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={isAlreadyInPlaylist}
                              onClick={() => handleAddMediaFromLibrary(med)}
                              className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                isAlreadyInPlaylist
                                  ? 'bg-white/5 text-gray-400 border border-white/5 cursor-not-allowed'
                                  : 'bg-[#002B7F] hover:bg-[#0038A8] text-white shadow-md'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 text-[#00B5E2]" />
                              <span>{isAlreadyInPlaylist ? 'Já na Playlist' : 'Adicionar a este Aparelho'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {filteredLibraryItems.length === 0 && (
                      <div className="text-center py-12 text-gray-400 text-xs space-y-2">
                        <Database className="w-8 h-8 text-gray-600 mx-auto" />
                        <p className="font-bold">Nenhuma mídia encontrada no acervo.</p>
                        {librarySearch && (
                          <p className="text-[11px] text-gray-500">
                            Tente buscar com outro termo ou limpe a busca.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-[#070C18] border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Total no acervo: <strong className="text-white">{overview?.media_library?.length || 0}</strong> ativos
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMediaLibraryModalOpen(false);
                        setLibrarySearch('');
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: CADASTRO DE NOVOS SMARTPHONES */}
        {/* ========================================================================= */}
        {currentView === 'devices' && (
          <div className="max-w-3xl mx-auto bg-[#0E172C] border border-white/10 rounded-3xl p-8 space-y-6 shadow-xl animate-fadeIn">
            <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
              <PlusCircle className="w-7 h-7 text-[#00B5E2]" />
              <div>
                <h2 className="text-lg font-black text-white">Cadastrar Novo Smartphone no Catálogo</h2>
                <p className="text-xs text-gray-400">
                  Informe os dados comerciais. As ofertas de vitrine serão calculadas automaticamente a partir do preço base.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateDeviceWithMedia} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Fabricante / Marca</label>
                  <select
                    value={devBrand}
                    onChange={(e) => setDevBrand(e.target.value)}
                    className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Samsung" className="bg-[#0E172C] text-white">Samsung</option>
                    <option value="Apple" className="bg-[#0E172C] text-white">Apple</option>
                    <option value="Motorola" className="bg-[#0E172C] text-white">Motorola</option>
                    <option value="Xiaomi" className="bg-[#0E172C] text-white">Xiaomi</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Modelo do Smartphone</label>
                  <input
                    type="text"
                    value={devModelName}
                    onChange={(e) => setDevModelName(e.target.value)}
                    className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B5E2]"
                    placeholder="Ex: Galaxy Z Fold 6 ou iPhone 16"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Tagline Promocional</label>
                <input
                  type="text"
                  value={devTagline}
                  onChange={(e) => setDevTagline(e.target.value)}
                  className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B5E2]"
                  placeholder="Ex: O smartphone dobrável definitivo com Galaxy AI"
                />
              </div>

              {/* Preço Base de Tabela */}
              <div className="bg-[#070C18] p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-[#00B5E2] uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00B5E2]" />
                    <span>Preço Base de Tabela Oficial (R$) *</span>
                  </label>
                  <span className="text-[10px] text-gray-400">Validação matemática sem digitação de parcelas</span>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                  <input
                    type="number"
                    min={1}
                    step="50"
                    value={devBasePrice}
                    onChange={(e) => setDevBasePrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black text-white focus:outline-none focus:border-[#00B5E2]"
                    placeholder="Ex: 5999"
                    required
                  />
                </div>
                <span className="text-[10px] text-gray-400 block mt-1.5">
                  Ao cadastrar, o sistema gerará automaticamente os planos padrão da operadora com os descontos recomendados.
                </span>
              </div>

              {/* Upload de Vídeo */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-2">
                  Enxoval de Mídia: Vídeo Vertical da Campanha (.mp4)
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center hover:border-[#00B5E2] transition-colors cursor-pointer bg-white/5">
                  <input
                    type="file"
                    accept="video/mp4,video/*"
                    onChange={(e) => setDevVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="new-dev-video"
                  />
                  <label htmlFor="new-dev-video" className="cursor-pointer flex flex-col items-center">
                    <Video className="w-10 h-10 text-[#00B5E2] mb-2" />
                    <span className="text-sm font-bold text-white block">
                      {devVideoFile ? devVideoFile.name : 'Clique para selecionar o arquivo de vídeo MP4 vertical'}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Recomendado: 1080x1920 (9:16 vertical)
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingDevice}
                className="w-full bg-[#002B7F] hover:bg-[#0038A8] text-white font-black py-4 px-6 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-900/40 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreatingDevice ? 'Processando e Gerando Ofertas...' : 'Cadastrar Smartphone & Gerar Ofertas'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: CATÁLOGO DE PLANOS COMERCIAIS */}
        {/* ========================================================================= */}
        {currentView === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Lista dos Planos Existentes */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-base font-black text-gray-100">Catálogo Global de Planos Comerciais TIM</h3>
              <p className="text-xs text-gray-400">
                Planos cadastrados ficam disponíveis automaticamente para todos os smartphones no sistema.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overview?.global_plans?.map((p: any) => (
                  <div key={p.id} className="bg-[#0E172C] border border-white/10 rounded-2xl p-4 space-y-1.5 shadow-md">
                    <span className="text-[10px] uppercase font-black text-[#00B5E2] block">{p.category}</span>
                    <h4 className="text-sm font-black text-white">{p.name}</h4>
                    <span className="text-xs text-gray-400 block">Selo Promocional: {p.badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário de Novo Plano */}
            <div className="bg-[#0E172C] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl h-fit">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                <Tag className="w-5 h-5 text-[#00B5E2]" />
                <h3 className="text-sm font-black text-white">Criar Novo Plano TIM</h3>
              </div>

              <form onSubmit={handleCreateGlobalPlan} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-300 block mb-1">Categoria Comercial</label>
                  <select
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value)}
                    className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Pós-Pago" className="bg-[#0E172C] text-white">Pós-Pago (TIM Black)</option>
                    <option value="Controle" className="bg-[#0E172C] text-white">Controle (TIM Controle)</option>
                    <option value="Pré-Pago" className="bg-[#0E172C] text-white">Pré-Pago (TIM Pré)</option>
                    <option value="Avulso" className="bg-[#0E172C] text-white">Avulso (Desbloqueado)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-300 block mb-1">Nome Comercial do Plano</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B5E2]"
                    placeholder="Ex: TIM Black Ultra 200GB"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-300 block mb-1">Selo de Vitrine (Badge)</label>
                  <input
                    type="text"
                    value={planBadge}
                    onChange={(e) => setPlanBadge(e.target.value)}
                    className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B5E2]"
                    placeholder="Ex: TIM Black Ultra"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingPlan}
                  className="w-full bg-[#002B7F] hover:bg-[#0038A8] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md mt-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingPlan ? 'Salvando...' : 'Adicionar ao Catálogo'}</span>
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: CLUSTERIZAÇÃO & NICHOS DE LOJAS */}
        {/* ========================================================================= */}
        {currentView === 'clusters' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Clusters Regionais */}
              <div className="bg-[#0E172C] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-[#00B5E2]" />
                    <h3 className="text-sm font-black text-white">Clusters Regionais Ativos</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{overview?.clusters?.length || 0} clusters</span>
                </div>

                <div className="space-y-3">
                  {overview?.clusters?.map((c: any) => {
                    const storesInCluster = overview?.stores?.filter((s: any) => s.cluster_id === c.id) || [];
                    return (
                      <div key={c.id} className="bg-[#070C18] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-white">{c.name}</h4>
                          <span className="text-[10px] text-gray-400">{c.description || 'Cluster de lojas homologado'}</span>
                        </div>
                        <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-[#00B5E2] font-bold">
                          {storesInCluster.length} loja(s)
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Formulário Novo Cluster */}
                <form onSubmit={handleCreateCluster} className="pt-3 border-t border-white/10 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-300">Adicionar Novo Cluster Regional</h4>
                  <input
                    type="text"
                    value={newClusterName}
                    onChange={(e) => setNewClusterName(e.target.value)}
                    placeholder="Nome do Cluster (ex: Cluster Sul Flagships)"
                    className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B5E2]"
                    required
                  />
                  <input
                    type="text"
                    value={newClusterDesc}
                    onChange={(e) => setNewClusterDesc(e.target.value)}
                    placeholder="Descrição / Região de atendimento"
                    className="w-full bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingCluster || !newClusterName}
                    className="w-full bg-[#002B7F] hover:bg-[#0038A8] text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingCluster ? 'Criando...' : '+ Criar Cluster'}
                  </button>
                </form>
              </div>

              {/* Lojas Físicas Cadastradas */}
              <div className="bg-[#0E172C] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-[#00B5E2]" />
                    <h3 className="text-sm font-black text-white">Lojas Físicas da Rede</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{overview?.stores?.length || 0} lojas</span>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {overview?.stores?.map((s: any) => {
                    const cluster = overview?.clusters?.find((c: any) => c.id === s.cluster_id);
                    return (
                      <div key={s.id} className="bg-[#070C18] p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-white">{s.name}</h4>
                          <span className="text-[10px] text-gray-400">{s.city} • Cód: {s.code}</span>
                        </div>
                        <span className="text-[9px] bg-[#002B7F] text-white px-2 py-0.5 rounded-md font-bold">
                          {cluster?.name || 'Geral'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Formulário Nova Loja */}
                <form onSubmit={handleCreateStore} className="pt-3 border-t border-white/10 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-300">Cadastrar Nova Loja Física</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="Nome da Loja (ex: Shopping Morumbi)"
                      className="bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B5E2]"
                      required
                    />
                    <input
                      type="text"
                      value={newStoreCity}
                      onChange={(e) => setNewStoreCity(e.target.value)}
                      placeholder="Cidade / UF"
                      className="bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newStoreCode}
                      onChange={(e) => setNewStoreCode(e.target.value)}
                      placeholder="Código PDV (ex: SP-MOR-01)"
                      className="bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <select
                      value={newStoreClusterId}
                      onChange={(e) => setNewStoreClusterId(e.target.value)}
                      className="bg-[#070C18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      {overview?.clusters?.map((c: any) => (
                        <option key={c.id} value={c.id} className="bg-[#0E172C] text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingStore || !newStoreName}
                    className="w-full bg-[#002B7F] hover:bg-[#0038A8] text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingStore ? 'Salvando...' : '+ Cadastrar Loja'}
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: CENTRAL DE SIMULADORES DE VITRINE */}
        {/* ========================================================================= */}
        {currentView === 'simulators' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-base font-black text-white">Central de Simuladores de Vitrine</h3>
              <p className="text-xs text-gray-400">
                Abra a simulação individual de qualquer pedestal de bancada para testar em tempo real a experiência do cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {overview?.catalog?.map((dev: any) => (
                <div key={dev.id} className="bg-[#0E172C] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-[#00B5E2] block">{dev.brand}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        Pedestal Ativo
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-white">{dev.model_name}</h4>
                    <p className="text-xs text-gray-400">{dev.tagline}</p>
                    <div className="text-xs text-gray-300 font-mono pt-1">
                      Preço Base: {Number(dev.base_price || 4999).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => window.open(`/display?device=${dev.id}`, '_blank')}
                      className="w-full bg-[#00B5E2] hover:bg-cyan-400 text-[#001438] py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Simulador em Nova Aba</span>
                    </button>
                    <span className="text-[10px] text-gray-400 text-center block">
                      URL: /display?device={dev.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
