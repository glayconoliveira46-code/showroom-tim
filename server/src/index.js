import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');
const ROOT_PUBLIC_DIR = path.resolve(__dirname, '../../public');
const ROOT_UPLOAD_DIR = path.join(ROOT_PUBLIC_DIR, 'uploads');
const CLIENT_PUBLIC_DIR = path.resolve(__dirname, '../../client/public');
const CLIENT_UPLOAD_DIR = path.join(CLIENT_PUBLIC_DIR, 'uploads');

if (!process.env.VERCEL) {
  if (!fs.existsSync(ROOT_UPLOAD_DIR)) {
    fs.mkdirSync(ROOT_UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(CLIENT_UPLOAD_DIR)) {
    fs.mkdirSync(CLIENT_UPLOAD_DIR, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = process.env.VERCEL ? '/tmp' : ROOT_UPLOAD_DIR;
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `media_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150 MB max para suportar vídeos em alta resolução
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir uploads com suporte a Range requests (HTTP 206) a partir de ambos os diretórios
app.use('/uploads', express.static(ROOT_UPLOAD_DIR));
app.use('/uploads', express.static(CLIENT_UPLOAD_DIR));
if (process.env.VERCEL) {
  app.use('/uploads', express.static('/tmp'));
}
app.use('/posters', express.static(path.join(ROOT_PUBLIC_DIR, 'posters')));
app.use('/posters', express.static(path.join(CLIENT_PUBLIC_DIR, 'posters')));
app.use(express.static(ROOT_PUBLIC_DIR));
app.use(express.static(CLIENT_PUBLIC_DIR));

let sseClients = [];
let inMemoryData = null;

function loadData() {
  if (inMemoryData) return inMemoryData;
  try {
    const tmpPath = path.join('/tmp', 'data.json');
    if (process.env.VERCEL && fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, 'utf8');
      inMemoryData = JSON.parse(raw);
      return inMemoryData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    inMemoryData = JSON.parse(raw);
    return inMemoryData;
  } catch (err) {
    console.error('Erro ao ler data.json', err);
    return inMemoryData || {};
  }
}

function saveData(data) {
  inMemoryData = data;
  try {
    if (process.env.VERCEL) {
      fs.writeFileSync(path.join('/tmp', 'data.json'), JSON.stringify(data, null, 2), 'utf8');
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Erro ao gravar data.json', err);
  }
}

function calculateServerPricing(basePrice, subsidyValue, installments = 12) {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  const safeInstallments = Math.max(1, Math.min(24, Math.floor(Number(installments) || 12)));
  const discount = Math.min(safeBase, Math.max(0, Number(subsidyValue) || 0));
  const finalCash = Math.max(0, Math.round((safeBase - discount) * 100) / 100);
  const rawInstallment = finalCash / safeInstallments;
  const installmentValue = Math.round(rawInstallment * 100) / 100;
  const formattedInstallment = installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedInstallments = `${safeInstallments}x de ${formattedInstallment} sem juros`;
  const discountLabel = discount > 0 
    ? `Economia de ${discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    : 'Preço de Tabela';

  return {
    basePrice: safeBase,
    subsidyDiscount: discount,
    finalCashPrice: finalCash,
    installmentsCount: safeInstallments,
    installmentValue,
    formattedInstallments,
    discountLabel
  };
}

function broadcastSSE(event, payload) {
  console.log(`[SSE Broadcast] Disparando evento ${event} para ${sseClients.length} celulares:`, payload);
  sseClients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type: event, payload })}\n\n`);
  });
}

// Retorna dados do aparelho para o display (com suporte a device_id específico do pedestal e cluster/loja)
app.get('/api/display/campaign', (req, res) => {
  const data = loadData();
  const deviceId = req.query.device_id;
  const storeId = req.query.store_id || data.active_store_id;
  const currentStore = data.stores?.find(s => s.id === storeId);

  let activeDevice = null;

  // 1. Prioridade: Se o quiosque requisitar um aparelho específico (identidade física do pedestal)
  if (deviceId) {
    activeDevice = data.devices_catalog.find(d => d.id === deviceId);
  }

  // 2. Se não informado, verifica segmentação por loja/cluster
  if (!activeDevice && currentStore) {
    const storeSpecific = data.devices_catalog.find(d => d.target_scope === 'store' && d.target_store_id === currentStore.id);
    const clusterSpecific = data.devices_catalog.find(d => d.target_scope === 'cluster' && d.target_cluster_id === currentStore.cluster_id);
    if (storeSpecific) activeDevice = storeSpecific;
    else if (clusterSpecific) activeDevice = clusterSpecific;
  }

  // 3. Fallback: modelo ativo padrão ou primeiro do catálogo
  if (!activeDevice) {
    activeDevice = data.devices_catalog.find(d => d.id === data.active_device_id) || data.devices_catalog[0];
  }

  const activePlans = (activeDevice.plans_pricing || []).filter(p => p.is_active !== false);

  res.json({
    ...activeDevice,
    plans_pricing: activePlans,
    current_store: currentStore || null,
    store_pin: data.store_pin || '1234',
    available_devices: (data.devices_catalog || []).map(d => ({
      id: d.id,
      brand: d.brand,
      model_name: d.model_name
    })),
    available_stores: data.stores || []
  });
});

// SSE Stream para os celulares na bancada
app.get('/api/display/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  console.log(`[SSE] Celular conectado: ${clientId}. Total conectados: ${sseClients.length}`);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`[SSE] Celular desconectado: ${clientId}. Restantes: ${sseClients.length}`);
  });
});

// =========================================================================
// MÓDULO DE AUTENTICAÇÃO E SEGURANÇA CORPORATIVA TIM
// =========================================================================
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'tim@showroom2026';
const AUTH_SECRET = process.env.AUTH_SECRET || 'tim-showroom-enterprise-auth-key-2026';

function generateAuthToken(username) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(`${username}:${ADMIN_PASS}`).digest('hex');
}

function verifyAuthToken(token) {
  if (!token) return false;
  const expectedAdmin = generateAuthToken(ADMIN_USER);
  const expectedGestor = generateAuthToken('gestor@tim.com.br');
  return token === expectedAdmin || token === expectedGestor;
}

// 1. Endpoint Público de Login Administrativo
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const isUserValid = cleanUser === ADMIN_USER.toLowerCase() || cleanUser === 'gestor@tim.com.br';
  const isPassValid = cleanPass === ADMIN_PASS;

  if (!isUserValid || !isPassValid) {
    return res.status(401).json({
      success: false,
      error: 'Credenciais inválidas. Verifique seu usuário e senha institucional.'
    });
  }

  const token = generateAuthToken(cleanUser);
  return res.json({
    success: true,
    token,
    user: {
      username: cleanUser,
      name: 'Gestor TIM',
      role: 'admin'
    }
  });
});

// 2. Endpoint de Validação de Sessão Ativa
app.get('/api/admin/verify-session', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token && verifyAuthToken(token)) {
    return res.json({ success: true, valid: true, user: { name: 'Gestor TIM', role: 'admin' } });
  }
  return res.status(401).json({ success: false, valid: false, error: 'Sessão expirada' });
});

// 3. Middleware de Bloqueio para todas as outras rotas /api/admin/*
app.use('/api/admin', (req, res, next) => {
  // Rotas públicas de login e verificação
  if (req.path === '/login' || req.path === '/verify-session') {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token || !verifyAuthToken(token)) {
    return res.status(401).json({
      error: 'Acesso não autorizado. Efetue login para acessar o painel do Showroom TIM.'
    });
  }

  next();
});

// Overview completo para o Admin
app.get('/api/admin/overview', (req, res) => {
  const data = loadData();
  res.json({
    stores: data.stores || [],
    clusters: data.clusters || [],
    catalog: data.devices_catalog || [],
    global_plans: data.global_plans || [],
    media_library: data.media_library || [],
    active_device_id: data.active_device_id,
    active_store_id: data.active_store_id,
    connected_devices: sseClients.length,
    system_status: 'online'
  });
});

// SALVAR RASCUNHO OU ALTERAÇÃO (NÃO DISPARA AOS CELULARES)
app.post('/api/admin/save-device-draft', (req, res) => {
  const { device_id, base_price, plans_pricing, target_scope, target_cluster_id, target_store_id } = req.body;
  const data = loadData();
  const targetDevice = data.devices_catalog.find(d => d.id === device_id);

  if (!targetDevice) {
    return res.status(404).json({ error: 'Aparelho não encontrado' });
  }

  if (base_price !== undefined) targetDevice.base_price = Math.max(0, Number(base_price) || 0);
  if (plans_pricing) targetDevice.plans_pricing = plans_pricing;
  if (target_scope !== undefined) targetDevice.target_scope = target_scope;
  if (target_cluster_id !== undefined) targetDevice.target_cluster_id = target_cluster_id;
  if (target_store_id !== undefined) targetDevice.target_store_id = target_store_id;

  saveData(data);
  res.json({ success: true, device: targetDevice });
});

// TRANSMITIR OFERTAS E PREÇOS DE UM APARELHO
app.post('/api/admin/publish-device-offers', (req, res) => {
  const { device_id, base_price, plans_pricing, target_scope, target_cluster_id, target_store_id } = req.body;
  const data = loadData();
  const targetId = device_id || data.active_device_id;
  const targetDevice = data.devices_catalog.find(d => d.id === targetId);

  if (!targetDevice) {
    return res.status(404).json({ error: 'Aparelho não encontrado' });
  }

  if (base_price !== undefined) targetDevice.base_price = Math.max(0, Number(base_price) || 0);
  if (plans_pricing) targetDevice.plans_pricing = plans_pricing;
  if (target_scope !== undefined) targetDevice.target_scope = target_scope;
  if (target_cluster_id !== undefined) targetDevice.target_cluster_id = target_cluster_id;
  if (target_store_id !== undefined) targetDevice.target_store_id = target_store_id;
  saveData(data);
  const activePlans = (targetDevice.plans_pricing || []).filter(p => p.is_active !== false);

  // Notifica os celulares conectados com a identidade do aparelho
  broadcastSSE('CAMPAIGN_UPDATE', {
    ...targetDevice,
    plans_pricing: activePlans,
    store_pin: data.store_pin || '1234'
  });

  res.json({ success: true, device: targetDevice, plans_pricing: activePlans });
});

// BOTÃO PRINCIPAL: TRANSMITIR / PUBLICAR TUDO NA BANCADA
app.post('/api/admin/publish-all', (req, res) => {
  const { active_device_id, devices_catalog } = req.body;
  const data = loadData();

  if (devices_catalog) {
    data.devices_catalog = devices_catalog;
  }
  if (active_device_id) {
    data.active_device_id = active_device_id;
  }
  saveData(data);

  const activeDevice = data.devices_catalog.find(d => d.id === data.active_device_id) || data.devices_catalog[0];
  const activePlans = (activeDevice.plans_pricing || []).filter(p => p.is_active !== false);

  // Broadcast completo da nova campanha e ofertas
  broadcastSSE('CAMPAIGN_UPDATE', {
    ...activeDevice,
    plans_pricing: activePlans,
    store_pin: data.store_pin || '1234'
  });

  res.json({ success: true, active_device: activeDevice, catalog: data.devices_catalog });
});

// Ativar smartphone na bancada
app.post('/api/admin/set-active-device', (req, res) => {
  const { device_id } = req.body;
  const data = loadData();
  if (device_id) data.active_device_id = device_id;
  saveData(data);

  const activeDevice = data.devices_catalog.find(d => d.id === data.active_device_id) || data.devices_catalog[0];
  const activePlans = (activeDevice.plans_pricing || []).filter(p => p.is_active !== false);

  broadcastSSE('CAMPAIGN_UPDATE', {
    ...activeDevice,
    plans_pricing: activePlans,
    store_pin: data.store_pin || '1234'
  });

  res.json({ success: true, active_device: activeDevice });
});

// Cadastrar novo smartphone
app.post('/api/admin/create-device-full', upload.single('video'), (req, res) => {
  const { model_name, brand, tagline, inactivity_timeout_sec, base_price, default_cash, target_scope, target_cluster_id, target_store_id } = req.body;
  const data = loadData();

  const newId = `${brand.toLowerCase()}-${model_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
  const videoUrl = req.file ? `/uploads/${req.file.filename}` : '/s24-video.mp4';
  const finalBasePrice = Math.max(0, Number(base_price || default_cash) || 4999);

  // Geração 100% matemática e auditada das ofertas iniciais com base no valor do aparelho
  const initialPlans = (data.global_plans || []).map((p, idx) => {
    let defaultSubsidy = 0;
    if (p.category === 'Pós-Pago') {
      defaultSubsidy = Math.round(finalBasePrice * 0.30); // ~30% de subsídio TIM Black
    } else if (p.category === 'Controle') {
      defaultSubsidy = Math.round(finalBasePrice * 0.15); // ~15% de subsídio TIM Controle
    } else {
      defaultSubsidy = 0; // Desbloqueado / Avulso
    }

    const calc = calculateServerPricing(finalBasePrice, defaultSubsidy, 12);

    return {
      id: p.id,
      plan_name: p.name,
      plan_badge: p.badge || p.name,
      plan_category: p.category,
      subsidy_amount: calc.subsidyDiscount,
      installments_count: 12,
      price_cash: calc.finalCashPrice,
      price_installments: calc.formattedInstallments,
      discount_label: calc.discountLabel,
      is_featured: idx === 0,
      is_active: true
    };
  });

  const newDevice = {
    id: newId,
    model_name,
    brand,
    base_price: finalBasePrice,
    tagline: tagline || 'O melhor da tecnologia com a rede TIM 5G',
    video_url: videoUrl,
    inactivity_timeout_sec: Number(inactivity_timeout_sec) || 30,
    target_scope: target_scope || 'all',
    target_cluster_id: target_cluster_id || null,
    target_store_id: target_store_id || null,
    plans_pricing: initialPlans,
    colors: [
      { name: 'Grafite', hex: '#2B2B2B' },
      { name: 'Prata', hex: '#DCDCDC' }
    ],
    highlights: [
      { id: 'h1', title: 'Performance e 5G', desc: 'Processamento veloz e conexão ultra rápida TIM.', icon: 'Zap' },
      { id: 'h2', title: 'Câmera de Alta Resolução', desc: 'Capture detalhes incríveis em fotos e vídeos.', icon: 'Camera' },
      { id: 'h3', title: 'Bateria para o Dia Todo', desc: 'Autonomia para você não ficar na mão.', icon: 'BatteryCharging' }
    ],
    specs: {
      processador: 'Octa-Core de Última Geração',
      tela: 'Tela Imersiva AMOLED 120Hz',
      memoria: '128 GB / 256 GB',
      conectividade: '5G SA/NSA, Wi-Fi 6E, Bluetooth 5.3'
    }
  };

  data.devices_catalog.push(newDevice);
  saveData(data);

  res.json({ success: true, device: newDevice, catalog: data.devices_catalog });
});

// Cadastrar novo plano global
app.post('/api/admin/create-global-plan', (req, res) => {
  const { name, category, badge } = req.body;
  const data = loadData();

  const planId = `plan-${Date.now()}`;
  const newPlan = {
    id: planId,
    name,
    category: category || 'Pós-Pago',
    badge: badge || name
  };

  if (!data.global_plans) data.global_plans = [];
  data.global_plans.push(newPlan);

  data.devices_catalog.forEach(dev => {
    if (!dev.plans_pricing) dev.plans_pricing = [];
    dev.plans_pricing.push({
      id: planId,
      plan_name: name,
      plan_badge: badge || name,
      plan_category: category || 'Pós-Pago',
      price_cash: 4999,
      price_installments: '12x R$ 416,58',
      discount_label: 'Novo Plano',
      is_featured: false,
      is_active: false
    });
  });

  saveData(data);
  res.json({ success: true, plan: newPlan, global_plans: data.global_plans });
});

// Consultar Acervo Central de Mídias (Banco de Mídias)
app.get('/api/admin/media-library', (req, res) => {
  const data = loadData();
  res.json({ success: true, media_library: data.media_library || [] });
});

// Excluir Mídia do Acervo
app.delete('/api/admin/media-library/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  if (!data.media_library) data.media_library = [];

  const itemToDelete = data.media_library.find(m => m.id === id);
  if (!itemToDelete) {
    return res.status(404).json({ error: 'Mídia não encontrada no acervo' });
  }

  data.media_library = data.media_library.filter(m => m.id !== id);

  // Remove também das playlists dos aparelhos caso esteja vinculado
  if (data.devices_catalog) {
    data.devices_catalog.forEach(dev => {
      if (dev.media_playlist && Array.isArray(dev.media_playlist)) {
        dev.media_playlist = dev.media_playlist.filter(p => p.url !== itemToDelete.url && p.id !== id);
      }
    });
  }

  saveData(data);

  res.json({
    success: true,
    deleted_id: id,
    media_library: data.media_library,
    message: `Mídia "${itemToDelete.title}" excluída com sucesso do acervo!`
  });
});

app.post('/api/admin/media-library/delete', (req, res) => {
  const { id } = req.body;
  const data = loadData();
  if (!data.media_library) data.media_library = [];

  const itemToDelete = data.media_library.find(m => m.id === id);
  if (!itemToDelete) {
    return res.status(404).json({ error: 'Mídia não encontrada no acervo' });
  }

  data.media_library = data.media_library.filter(m => m.id !== id);

  if (data.devices_catalog) {
    data.devices_catalog.forEach(dev => {
      if (dev.media_playlist && Array.isArray(dev.media_playlist)) {
        dev.media_playlist = dev.media_playlist.filter(p => p.url !== itemToDelete.url && p.id !== id);
      }
    });
  }

  saveData(data);

  res.json({
    success: true,
    deleted_id: id,
    media_library: data.media_library,
    message: `Mídia "${itemToDelete.title}" excluída com sucesso do acervo!`
  });
});

// Upload de nova mídia para o Acervo (e opcionalmente adicionar a um aparelho)
app.post('/api/admin/media-library/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo de mídia enviado' });
  }

  const data = loadData();
  if (!data.media_library) data.media_library = [];

  const isVideo = req.file.mimetype.startsWith('video');
  const mediaId = `med-${Date.now()}`;
  const mediaUrl = `/uploads/${req.file.filename}`;
  const title = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, "");
  const durationSec = Number(req.body.duration_sec) || (isVideo ? 15 : 7);

  const newMedia = {
    id: mediaId,
    title,
    type: isVideo ? 'video' : 'image',
    url: mediaUrl,
    format: req.file.mimetype,
    duration_sec: durationSec,
    object_fit: req.body.object_fit || 'cover',
    position_x: Number(req.body.position_x) || 50,
    position_y: Number(req.body.position_y) || 50,
    scale: Number(req.body.scale) || 1,
    created_at: new Date().toISOString()
  };

  data.media_library.unshift(newMedia);

  // Se veio atrelado a um aparelho específico, inclui na playlist dele
  if (req.body.device_id) {
    const dev = data.devices_catalog.find(d => d.id === req.body.device_id);
    if (dev) {
      if (!dev.media_playlist) dev.media_playlist = [];
      dev.media_playlist.push({
        id: `pl-${Date.now()}`,
        title: newMedia.title,
        type: newMedia.type,
        url: newMedia.url,
        duration_sec: newMedia.duration_sec,
        object_fit: newMedia.object_fit,
        position_x: newMedia.position_x,
        position_y: newMedia.position_y,
        scale: newMedia.scale,
        is_active: true
      });
      if (isVideo && !dev.video_url) {
        dev.video_url = newMedia.url;
      }
    }
  }

  // Espelha arquivo entre public/uploads e client/public/uploads
  try {
    const dest = path.join(CLIENT_UPLOAD_DIR, req.file.filename);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(req.file.path, dest);
    }
  } catch (err) {
    console.warn('Erro ao espelhar upload:', err);
  }

  saveData(data);

  res.json({
    success: true,
    media: newMedia,
    media_library: data.media_library,
    catalog: data.devices_catalog
  });
});

// Salvar Rascunho da Playlist (Sem transmitir para a bancada / sem SSE)
app.post('/api/admin/device-playlist/draft', (req, res) => {
  const { device_id, playlist } = req.body;
  if (!device_id || !Array.isArray(playlist)) {
    return res.status(400).json({ error: 'device_id e playlist (array) são obrigatórios' });
  }

  const data = loadData();
  const targetDevice = data.devices_catalog.find(d => d.id === device_id);

  if (!targetDevice) {
    return res.status(404).json({ error: 'Smartphone não encontrado' });
  }

  targetDevice.media_playlist = playlist;
  const firstVideo = playlist.find(p => p.type === 'video' && p.is_active);
  if (firstVideo) {
    targetDevice.video_url = firstVideo.url;
  }

  saveData(data);

  res.json({
    success: true,
    device: targetDevice,
    message: `Rascunho de playlist do ${targetDevice.model_name} salvo no servidor (não transmitido ainda).`
  });
});

// Transmitir e Publicar Playlist de Mídias de um Aparelho (com SSE para os pedestais físicos)
app.post('/api/admin/device-playlist/update', (req, res) => {
  const { device_id, playlist } = req.body;
  if (!device_id || !Array.isArray(playlist)) {
    return res.status(400).json({ error: 'device_id e playlist (array) são obrigatórios' });
  }

  const data = loadData();
  const targetDevice = data.devices_catalog.find(d => d.id === device_id);

  if (!targetDevice) {
    return res.status(404).json({ error: 'Smartphone não encontrado' });
  }

  targetDevice.media_playlist = playlist;
  const firstVideo = playlist.find(p => p.type === 'video' && p.is_active);
  if (firstVideo) {
    targetDevice.video_url = firstVideo.url;
  }

  saveData(data);

  const activePlans = (targetDevice.plans_pricing || []).filter(p => p.is_active !== false);

  broadcastSSE('CAMPAIGN_UPDATE', {
    ...targetDevice,
    plans_pricing: activePlans,
    store_pin: data.store_pin || '1234'
  });

  res.json({
    success: true,
    device: targetDevice,
    message: `Playlist do ${targetDevice.model_name} transmitida aos pedestais em tempo real!`
  });
});

// Atualizar Enxoval de Mídia (Legado / Substituição Rápida de Vídeo)
app.post('/api/admin/update-device-media', upload.single('video'), (req, res) => {
  const { device_id } = req.body;
  const data = loadData();
  const targetDevice = data.devices_catalog.find(d => d.id === device_id);

  if (!targetDevice) {
    return res.status(404).json({ error: 'Smartphone não encontrado' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo de vídeo foi enviado' });
  }

  const newUrl = `/uploads/${req.file.filename}`;
  targetDevice.video_url = newUrl;

  if (!targetDevice.media_playlist) targetDevice.media_playlist = [];
  targetDevice.media_playlist.unshift({
    id: `pl-${Date.now()}`,
    title: req.file.originalname,
    type: 'video',
    url: newUrl,
    duration_sec: 15,
    is_active: true
  });

  if (!data.media_library) data.media_library = [];
  data.media_library.unshift({
    id: `med-${Date.now()}`,
    title: req.file.originalname,
    type: 'video',
    url: newUrl,
    format: req.file.mimetype,
    duration_sec: 15,
    created_at: new Date().toISOString()
  });

  try {
    const dest = path.join(CLIENT_UPLOAD_DIR, req.file.filename);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(req.file.path, dest);
    }
  } catch (err) {
    console.warn('Erro ao espelhar upload:', err);
  }

  saveData(data);

  const activePlans = (targetDevice.plans_pricing || []).filter(p => p.is_active !== false);

  broadcastSSE('CAMPAIGN_UPDATE', {
    ...targetDevice,
    plans_pricing: activePlans,
    store_pin: data.store_pin || '1234'
  });

  res.json({
    success: true,
    device: targetDevice,
    video_url: targetDevice.video_url,
    media_playlist: targetDevice.media_playlist,
    message: `Enxoval de mídia do ${targetDevice.model_name} atualizado com sucesso!`
  });
});

// Criar Novo Cluster Regional de Lojas
app.post('/api/admin/create-cluster', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do cluster é obrigatório' });

  const data = loadData();
  if (!data.clusters) data.clusters = [];

  const clusterId = `cluster-${Date.now()}`;
  const newCluster = {
    id: clusterId,
    name,
    description: description || 'Cluster de lojas homologado'
  };

  data.clusters.push(newCluster);
  saveData(data);

  res.json({ success: true, cluster: newCluster, clusters: data.clusters });
});

// Criar Nova Loja Física
app.post('/api/admin/create-store', (req, res) => {
  const { name, city, code, cluster_id } = req.body;
  if (!name || !city) return res.status(400).json({ error: 'Nome e cidade da loja são obrigatórios' });

  const data = loadData();
  if (!data.stores) data.stores = [];

  const storeId = `loja-${Date.now()}`;
  const newStore = {
    id: storeId,
    name,
    city,
    code: code || `LJ-${Date.now().toString().slice(-4)}`,
    cluster_id: cluster_id || (data.clusters?.[0]?.id || 'cluster-sp')
  };

  data.stores.push(newStore);
  saveData(data);

  res.json({ success: true, store: newStore, stores: data.stores });
});

// Middleware de tratamento amigável de erros de upload (incluindo limite de tamanho)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Arquivo muito grande! O limite máximo suportado pelo sistema é de 150 MB. Recomendamos comprimir em 1080x1920.'
      });
    }
    return res.status(400).json({ error: `Erro no upload do arquivo: ${err.message}` });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
  next();
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Showroom Hub ativo na porta ${PORT}`);
  });
}
