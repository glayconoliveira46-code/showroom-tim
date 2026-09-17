export interface DeviceDetectionResult {
  matchedDeviceId: string | null;
  detectedModelName: string | null;
  detectedBrand: string | null;
  confidence: 'high' | 'medium' | 'none';
  rawIdentifier: string;
}

export async function detectHardwareDevice(): Promise<DeviceDetectionResult> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const screenW = typeof window !== 'undefined' ? window.screen.width : 0;
  const screenH = typeof window !== 'undefined' ? window.screen.height : 0;

  // Resolução física em pixels (orientação portrait)
  const physicalW = Math.round(Math.min(screenW, screenH) * dpr);
  const physicalH = Math.round(Math.max(screenW, screenH) * dpr);

  let rawModel = '';

  // 1. TENTATIVA VIA CLIENT HINTS API (Disponível no Chrome Android)
  if (typeof navigator !== 'undefined' && (navigator as any).userAgentData?.getHighEntropyValues) {
    try {
      const hints = await (navigator as any).userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
      if (hints && hints.model) {
        rawModel = hints.model.trim();
      }
    } catch (e) {
      console.warn('Client Hints não permitiu leitura de modelo:', e);
    }
  }

  // Se não obteve via Client Hints, busca por padrões no User-Agent
  if (!rawModel && ua) {
    const androidModelMatch = ua.match(/;\s*([A-Za-z0-9\-_]+(?:\s+[A-Za-z0-9\-_]+)*)\s+Build\//i);
    if (androidModelMatch && androidModelMatch[1]) {
      rawModel = androidModelMatch[1].trim();
    }
  }

  const normalizedModel = rawModel.toLowerCase();
  const normalizedUa = ua.toLowerCase();

  // 2. CORRELAÇÃO DE MODELOS ANDROID
  // Motorola Moto G04
  if (
    normalizedModel.includes('moto g04') || 
    normalizedModel.includes('xt2421') || 
    normalizedModel.includes('xt2423') ||
    normalizedUa.includes('moto g04') ||
    normalizedUa.includes('xt2421')
  ) {
    return {
      matchedDeviceId: 'motorola-moto-g04',
      detectedModelName: 'Moto G04',
      detectedBrand: 'Motorola',
      confidence: 'high',
      rawIdentifier: rawModel || 'Motorola Moto G04'
    };
  }

  // Samsung Galaxy S24 Ultra
  if (
    normalizedModel.includes('sm-s928') || 
    normalizedModel.includes('s24 ultra') || 
    normalizedModel.includes('galaxy s24 ultra') ||
    normalizedUa.includes('sm-s928')
  ) {
    return {
      matchedDeviceId: 'samsung-s24-ultra',
      detectedModelName: 'Galaxy S24 Ultra',
      detectedBrand: 'Samsung',
      confidence: 'high',
      rawIdentifier: rawModel || 'Samsung Galaxy S24 Ultra (SM-S928)'
    };
  }

  // Samsung Galaxy Z Fold
  if (
    normalizedModel.includes('sm-f946') || 
    normalizedModel.includes('sm-f956') || 
    normalizedModel.includes('z fold') ||
    normalizedUa.includes('sm-f946') ||
    normalizedUa.includes('sm-f956')
  ) {
    return {
      matchedDeviceId: 'samsung-galaxy-z-fold-1789502172848',
      detectedModelName: 'Galaxy Z Fold',
      detectedBrand: 'Samsung',
      confidence: 'high',
      rawIdentifier: rawModel || 'Samsung Galaxy Z Fold'
    };
  }

  // Samsung Galaxy Tab A9+ 5G (SM-X216B / SM-X210 / SM-X216)
  if (
    normalizedModel.includes('sm-x216') ||
    normalizedModel.includes('sm-x210') ||
    normalizedModel.includes('sm-x218') ||
    normalizedModel.includes('tab a9+') ||
    normalizedModel.includes('tab a9 plus') ||
    normalizedUa.includes('sm-x216') ||
    normalizedUa.includes('sm-x210')
  ) {
    return {
      matchedDeviceId: 'samsung-galaxy-tab-a9-plus',
      detectedModelName: 'Galaxy Tab A9+ 5G',
      detectedBrand: 'Samsung',
      confidence: 'high',
      rawIdentifier: rawModel || 'Samsung Galaxy Tab A9+ 5G (SM-X216B)'
    };
  }

  // 3. CORRELAÇÃO DE MODELOS APPLE (iOS Safari / WebKit)
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'iPhone');

  if (isIOS) {
    // iPhone 16 Pro: 1206 x 2622 px @ 3x (ou logical 402 x 874)
    if (
      (physicalW === 1206 && physicalH === 2622) ||
      (screenW === 402 && screenH === 874)
    ) {
      return {
        matchedDeviceId: 'apple-iphone-16-pro',
        detectedModelName: 'iPhone 16 Pro',
        detectedBrand: 'Apple',
        confidence: 'high',
        rawIdentifier: 'Apple iPhone 16 Pro (Display Metric Match)'
      };
    }

    // iPhone 15 Pro / 14 Pro: 1179 x 2556 px @ 3x (ou logical 393 x 852)
    if (
      (physicalW === 1179 && physicalH === 2556) ||
      (screenW === 393 && screenH === 852)
    ) {
      return {
        matchedDeviceId: 'apple-iphone-16-pro',
        detectedModelName: 'iPhone Pro',
        detectedBrand: 'Apple',
        confidence: 'medium',
        rawIdentifier: 'Apple iPhone Pro Retina XDR'
      };
    }

    // Qualquer outro iPhone com tela moderna
    return {
      matchedDeviceId: 'apple-iphone-16-pro',
      detectedModelName: 'Apple iPhone',
      detectedBrand: 'Apple',
      confidence: 'medium',
      rawIdentifier: 'Apple iPhone genérico'
    };
  }

  // 4. NÃO FOI POSSÍVEL IDENTIFICAR COM CERTEZA
  return {
    matchedDeviceId: null,
    detectedModelName: null,
    detectedBrand: null,
    confidence: 'none',
    rawIdentifier: rawModel || 'Dispositivo não catalogado'
  };
}
