import dns from 'dns';
import type { IStorage } from './storage';

/**
 * Serializable Ad Platform Configuration (for DB storage and Admin API)
 */
export interface SerializableAdPlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
  clickTokens: string[];
  crawlerPatterns: string[];
  asns: number[];
  asnKeywords: string[];
  validHostnameRegex?: string;
  description?: string;
}

/**
 * Runtime Ad Platform Definition with compiled RegExps
 */
export interface AdPlatformConfig {
  id: string;
  name: string;
  enabled?: boolean;
  clickTokens: string[];
  crawlerPatterns: RegExp[];
  asns: number[];
  asnKeywords: string[];
  validHostnameRegex?: RegExp;
  description?: string;
}

/**
 * Factory Default Supported Ad Platforms
 */
export const DEFAULT_AD_PLATFORMS_DATA: SerializableAdPlatformConfig[] = [
  {
    id: 'google',
    name: 'Google Ads',
    enabled: true,
    clickTokens: ['gclid', 'wbraid', 'gbraid', 'gclickid', 'google_click_id'],
    crawlerPatterns: [
      'adsbot-google',
      'adsbot-google-mobile',
      'mediapartners-google',
      'google-inspectiontool',
      'googlebot',
    ],
    asns: [15169, 19527, 36040, 43515],
    asnKeywords: ['google', 'googlebot'],
    validHostnameRegex: '\\.(googlebot|google)\\.com$',
    description: 'Search, Display, YouTube, Performance Max & Shopping campaigns',
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    enabled: true,
    clickTokens: ['fbclid', 'fbclickid', 'fb_click_id', 'fb_clickid', 'fbc_id'],
    crawlerPatterns: [
      'facebookexternalhit',
      'facebot',
      'meta-externalagent',
      'facebookcatalog',
    ],
    asns: [32934, 63293],
    asnKeywords: ['facebook', 'meta platforms'],
    validHostnameRegex: '\\.fbsv\\.net$',
    description: 'Facebook, Instagram & Meta Audience Network campaigns',
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    enabled: true,
    clickTokens: ['ttclid', 'ttclickid', 'tt_click_id'],
    crawlerPatterns: [
      'tiktokbot',
      'bytespider',
      'tiktokspider',
    ],
    asns: [138699, 396986],
    asnKeywords: ['bytedance', 'tiktok'],
    description: 'TikTok Ads Manager & Spark Ads campaigns',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Ads',
    enabled: true,
    clickTokens: ['msclkid', 'msclickid', 'ms_click_id'],
    crawlerPatterns: [
      'adidxbot',
      'bingbot',
      'bingpreview',
    ],
    asns: [8075],
    asnKeywords: ['microsoft'],
    validHostnameRegex: '\\.(search\\.msn|bing)\\.com$',
    description: 'Bing Search, Microsoft Advertising & MSN Network',
  },
  {
    id: 'x',
    name: 'X (Twitter) Ads',
    enabled: true,
    clickTokens: ['twclid', 'xclid', 'twclickid', 'tw_click_id'],
    crawlerPatterns: [
      'twitterbot',
    ],
    asns: [13414],
    asnKeywords: ['twitter', 'x corp'],
    description: 'X Ads Manager & Promoted Posts campaigns',
  },
];

/**
 * Safely compile string patterns into RegExps
 */
function compilePlatform(raw: SerializableAdPlatformConfig): AdPlatformConfig {
  const crawlerPatterns: RegExp[] = [];
  for (const p of raw.crawlerPatterns || []) {
    if (!p || !p.trim()) continue;
    try {
      crawlerPatterns.push(new RegExp(p.trim(), 'i'));
    } catch (err) {
      console.warn(`[AdIntelligence] Invalid crawler regex pattern "${p}" for ${raw.id}:`, err);
    }
  }

  let validHostnameRegex: RegExp | undefined = undefined;
  if (raw.validHostnameRegex && raw.validHostnameRegex.trim()) {
    try {
      validHostnameRegex = new RegExp(raw.validHostnameRegex.trim(), 'i');
    } catch (err) {
      console.warn(`[AdIntelligence] Invalid hostname regex "${raw.validHostnameRegex}" for ${raw.id}:`, err);
    }
  }

  return {
    id: raw.id.toLowerCase().trim(),
    name: raw.name.trim(),
    enabled: raw.enabled !== false,
    clickTokens: (raw.clickTokens || []).map((t) => t.toLowerCase().trim()).filter(Boolean),
    crawlerPatterns,
    asns: (raw.asns || []).map((n) => Number(n)).filter((n) => !isNaN(n) && n > 0),
    asnKeywords: (raw.asnKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean),
    validHostnameRegex,
    description: raw.description,
  };
}

/**
 * In-Memory Map of Loaded Ad Platforms
 */
export let SUPPORTED_AD_PLATFORMS: Record<string, AdPlatformConfig> = {};
let serializablePlatformsCache: SerializableAdPlatformConfig[] = [];

// Initialize default platforms in memory
function loadDefaults() {
  const map: Record<string, AdPlatformConfig> = {};
  for (const d of DEFAULT_AD_PLATFORMS_DATA) {
    map[d.id] = compilePlatform(d);
  }
  SUPPORTED_AD_PLATFORMS = map;
  serializablePlatformsCache = DEFAULT_AD_PLATFORMS_DATA;
}
loadDefaults();

/**
 * Initialize ad platforms from persistent storage
 */
export async function initAdIntelligence(storage: IStorage): Promise<void> {
  try {
    const rawSetting = await storage.getSetting('supported_ad_platforms');
    if (rawSetting && rawSetting.trim()) {
      const parsed = JSON.parse(rawSetting);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map: Record<string, AdPlatformConfig> = {};
        for (const item of parsed) {
          if (item && item.id && item.name) {
            map[item.id.toLowerCase()] = compilePlatform(item);
          }
        }
        SUPPORTED_AD_PLATFORMS = map;
        serializablePlatformsCache = parsed;
        console.log(`🎯 [AdIntelligence] Loaded ${Object.keys(map).length} ad platforms from storage.`);
        return;
      }
    }
  } catch (err) {
    console.error('[AdIntelligence] Error loading ad platforms from storage, using defaults:', err);
  }
  loadDefaults();
}

/**
 * Get current ad platforms in serializable JSON format
 */
export function getSerializableAdPlatforms(): SerializableAdPlatformConfig[] {
  return serializablePlatformsCache;
}

/**
 * Save updated ad platforms to storage and apply to runtime
 */
export async function saveAdPlatforms(
  storage: IStorage,
  platforms: SerializableAdPlatformConfig[]
): Promise<void> {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    throw new Error('Platforms list must not be empty.');
  }

  const map: Record<string, AdPlatformConfig> = {};
  const cleanedList: SerializableAdPlatformConfig[] = [];

  for (const p of platforms) {
    if (!p.id || !p.name) {
      throw new Error('Each ad platform must have a valid id and name.');
    }
    const cleanId = p.id.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    if (!cleanId) {
      throw new Error(`Invalid platform ID: ${p.id}`);
    }

    const cleaned: SerializableAdPlatformConfig = {
      id: cleanId,
      name: p.name.trim(),
      enabled: p.enabled !== false,
      clickTokens: (p.clickTokens || []).map((t) => t.toLowerCase().trim()).filter(Boolean),
      crawlerPatterns: (p.crawlerPatterns || []).map((cp) => cp.trim()).filter(Boolean),
      asns: (p.asns || []).map((n) => Number(n)).filter((n) => !isNaN(n) && n > 0),
      asnKeywords: (p.asnKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean),
      validHostnameRegex: p.validHostnameRegex ? p.validHostnameRegex.trim() : undefined,
      description: p.description ? p.description.trim() : undefined,
    };

    map[cleanId] = compilePlatform(cleaned);
    cleanedList.push(cleaned);
  }

  SUPPORTED_AD_PLATFORMS = map;
  serializablePlatformsCache = cleanedList;
  await storage.setSetting('supported_ad_platforms', JSON.stringify(cleanedList));
  console.log(`🎯 [AdIntelligence] Saved & updated ${cleanedList.length} ad platforms.`);
}

/**
 * Reset ad platforms in storage to default definitions
 */
export async function resetAdPlatforms(storage: IStorage): Promise<void> {
  loadDefaults();
  await storage.setSetting('supported_ad_platforms', JSON.stringify(DEFAULT_AD_PLATFORMS_DATA));
  console.log('🎯 [AdIntelligence] Reset ad platforms to factory defaults.');
}

/**
 * Parsed Ad Click Attribution
 */
export interface AdClickInfo {
  isAdClick: boolean;
  platform: string | null;
  platformName: string | null;
  clickToken: string | null;
  clickId: string | null;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Ad Reviewer Bot Verification Result
 */
export interface AdReviewerVerificationResult {
  isReviewer: boolean;
  platform: string | null;
  platformName: string | null;
  botName: string | null;
  isVerified: boolean;
  isSpoofed: boolean;
  verificationMethod: 'rdns' | 'asn' | 'none';
  resolvedHost?: string;
  allowedByScope: boolean;
  reason: string;
}

/**
 * 24-Hour LRU Cache for Reverse DNS Verification Results
 */
interface CacheEntry {
  hostname: string | null;
  timestamp: number;
}

const RDNS_CACHE = new Map<string, CacheEntry>();
const RDNS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RDNS_TIMEOUT_MS = 50; // 50ms strict safety timeout guard

/**
 * Extract Ad Click Token & Campaign Info from query parameters or URL
 */
export function extractAdClickInfo(
  queryParams?: Record<string, any> | string,
  referer?: string,
): AdClickInfo {
  let params: Record<string, string> = {};

  if (typeof queryParams === 'string') {
    let cleanQuery = queryParams.trim();
    if (cleanQuery.includes('?')) {
      cleanQuery = cleanQuery.slice(cleanQuery.indexOf('?') + 1);
    }
    try {
      const searchParams = new URLSearchParams(cleanQuery);
      searchParams.forEach((val, key) => {
        params[key.toLowerCase()] = val;
      });
      // If query was a bare key without '=' e.g. "fbclickid" or "gclid"
      if (Object.keys(params).length === 0 && cleanQuery && !cleanQuery.includes('=')) {
        params[cleanQuery.toLowerCase()] = '';
      }
    } catch {
      if (cleanQuery && !cleanQuery.includes('=')) {
        params[cleanQuery.toLowerCase()] = '';
      }
    }
  } else if (queryParams && typeof queryParams === 'object') {
    Object.keys(queryParams).forEach((k) => {
      params[k.toLowerCase()] = queryParams[k] !== undefined && queryParams[k] !== null ? String(queryParams[k]) : '';
    });
  }

  // Also check referer for click tokens if not in direct query
  if (referer && (!params['gclid'] && !params['fbclid'] && !params['fbclickid'] && !params['ttclid'] && !params['msclkid'] && !params['twclid'])) {
    try {
      const refUrl = new URL(referer);
      refUrl.searchParams.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (!params[lowerKey]) {
          params[lowerKey] = val;
        }
      });
    } catch {
      // ignore invalid referer URLs
    }
  }

  // Match against supported platforms (both key=value and key-present)
  for (const platformKey of Object.keys(SUPPORTED_AD_PLATFORMS)) {
    const config = SUPPORTED_AD_PLATFORMS[platformKey];
    if (config.enabled === false) continue;
    for (const token of config.clickTokens) {
      if (params[token] !== undefined && params[token] !== null) {
        const rawVal = params[token]?.trim();
        const clickIdVal = (rawVal && rawVal !== 'true' && rawVal !== '1') ? rawVal : `${token}_detected`;
        return {
          isAdClick: true,
          platform: config.id,
          platformName: config.name,
          clickToken: token,
          clickId: clickIdVal,
          utmSource: params['utm_source'],
          utmMedium: params['utm_medium'],
          utmCampaign: params['utm_campaign'],
        };
      }
    }
  }

  // Fallback regex search on raw query string if passed as string
  if (typeof queryParams === 'string') {
    const lowerQuery = queryParams.toLowerCase();
    for (const platformKey of Object.keys(SUPPORTED_AD_PLATFORMS)) {
      const config = SUPPORTED_AD_PLATFORMS[platformKey];
      if (config.enabled === false) continue;
      for (const token of config.clickTokens) {
        if (lowerQuery.includes(token)) {
          const match = lowerQuery.match(new RegExp(`${token}(?:=([^&#\\s]*))?`, 'i'));
          const tokenVal = match && match[1] ? decodeURIComponent(match[1]) : `${token}_detected`;
          return {
            isAdClick: true,
            platform: config.id,
            platformName: config.name,
            clickToken: token,
            clickId: tokenVal,
            utmSource: params['utm_source'],
            utmMedium: params['utm_medium'],
            utmCampaign: params['utm_campaign'],
          };
        }
      }
    }
  }

  // Check for general UTM paid tags (e.g., utm_medium=cpc)
  if (params['utm_medium'] && /cpc|ppc|paid/i.test(params['utm_medium'])) {
    const source = params['utm_source']?.toLowerCase() || '';
    let matchedPlatform: string | null = null;
    let matchedPlatformName: string | null = null;

    if (source.includes('google')) {
      matchedPlatform = 'google';
      matchedPlatformName = 'Google Ads';
    } else if (source.includes('facebook') || source.includes('meta') || source.includes('instagram')) {
      matchedPlatform = 'meta';
      matchedPlatformName = 'Meta Ads';
    } else if (source.includes('tiktok')) {
      matchedPlatform = 'tiktok';
      matchedPlatformName = 'TikTok Ads';
    } else if (source.includes('bing') || source.includes('microsoft')) {
      matchedPlatform = 'microsoft';
      matchedPlatformName = 'Microsoft Ads';
    } else if (source.includes('twitter') || source === 'x') {
      matchedPlatform = 'x';
      matchedPlatformName = 'X (Twitter) Ads';
    }

    return {
      isAdClick: true,
      platform: matchedPlatform,
      platformName: matchedPlatformName || 'Paid Campaign',
      clickToken: 'utm_medium',
      clickId: params['utm_medium'],
      utmSource: params['utm_source'],
      utmMedium: params['utm_medium'],
      utmCampaign: params['utm_campaign'],
    };
  }

  return {
    isAdClick: false,
    platform: null,
    platformName: null,
    clickToken: null,
    clickId: null,
  };
}

/**
 * Reverse DNS with 50ms Timeout Guard and In-Memory 24h LRU Cache
 */
async function resolveHostnameWithTimeout(ip: string): Promise<string | null> {
  const now = Date.now();
  const cached = RDNS_CACHE.get(ip);
  if (cached && now - cached.timestamp < RDNS_CACHE_TTL_MS) {
    return cached.hostname;
  }

  try {
    const lookupPromise = dns.promises.reverse(ip);
    const timeoutPromise = new Promise<string[]>((_, reject) =>
      setTimeout(() => reject(new Error('DNS Timeout')), RDNS_TIMEOUT_MS)
    );

    const hostnames = await Promise.race([lookupPromise, timeoutPromise]);
    const host = hostnames && hostnames.length > 0 ? hostnames[0] : null;

    RDNS_CACHE.set(ip, { hostname: host, timestamp: now });
    if (RDNS_CACHE.size > 10000) {
      // Evict oldest entries
      const oldestKey = RDNS_CACHE.keys().next().value;
      if (oldestKey) RDNS_CACHE.delete(oldestKey);
    }
    return host;
  } catch {
    RDNS_CACHE.set(ip, { hostname: null, timestamp: now });
    return null;
  }
}

/**
 * Two-Tier Verification Engine for Ad Reviewers
 *
 * @param ip Visitor IP address
 * @param userAgent Visitor User-Agent string
 * @param asn Visitor Autonomous System Number (optional)
 * @param asnOrg Visitor ASN Organization / ISP (optional)
 * @param activePlatforms List of platform IDs enabled by user (defaults to all)
 */
export async function verifyAdReviewer(
  ip: string,
  userAgent: string,
  asn?: number,
  asnOrg?: string,
  activePlatforms?: string[],
): Promise<AdReviewerVerificationResult> {
  const ua = userAgent || '';
  let candidatePlatform: AdPlatformConfig | null = null;
  let matchedBotName: string | null = null;

  // Find candidate platform from User-Agent pattern
  for (const platformKey of Object.keys(SUPPORTED_AD_PLATFORMS)) {
    const config = SUPPORTED_AD_PLATFORMS[platformKey];
    if (config.enabled === false) continue;
    for (const pattern of config.crawlerPatterns) {
      if (pattern.test(ua)) {
        candidatePlatform = config;
        const match = ua.match(pattern);
        matchedBotName = match ? match[0] : config.name;
        break;
      }
    }
    if (candidatePlatform) break;
  }

  // Not claiming to be an ad reviewer
  if (!candidatePlatform) {
    return {
      isReviewer: false,
      platform: null,
      platformName: null,
      botName: null,
      isVerified: false,
      isSpoofed: false,
      verificationMethod: 'none',
      allowedByScope: false,
      reason: 'Not an ad compliance crawler',
    };
  }

  // Check if this platform is allowed by user's campaign scope
  const isPlatformAllowedByScope =
    !activePlatforms ||
    activePlatforms.length === 0 ||
    activePlatforms.includes(candidatePlatform.id);

  const orgLower = (asnOrg || '').toLowerCase();
  const matchesAsn =
    (asn && candidatePlatform.asns.includes(asn)) ||
    candidatePlatform.asnKeywords.some((kw) => orgLower.includes(kw));

  // Step 1: Pre-screen against ASN (Instant memory lookup <0.001ms)
  // If ASN does not match platform (e.g. from Hetzner, DigitalOcean, OVH, residential ISP)
  if (asn && !matchesAsn) {
    return {
      isReviewer: true,
      platform: candidatePlatform.id,
      platformName: candidatePlatform.name,
      botName: matchedBotName,
      isVerified: false,
      isSpoofed: true,
      verificationMethod: 'asn',
      allowedByScope: false,
      reason: `Spoofed ad crawler: claims to be ${candidatePlatform.name} but originates from unauthorized network (${asnOrg || 'ASN ' + asn})`,
    };
  }

  // Step 2: Reverse DNS check for platforms with strict hostname patterns (e.g., Google, Meta, Bing)
  if (candidatePlatform.validHostnameRegex) {
    const hostname = await resolveHostnameWithTimeout(ip);

    if (hostname && candidatePlatform.validHostnameRegex.test(hostname)) {
      return {
        isReviewer: true,
        platform: candidatePlatform.id,
        platformName: candidatePlatform.name,
        botName: matchedBotName,
        isVerified: true,
        isSpoofed: false,
        verificationMethod: 'rdns',
        resolvedHost: hostname,
        allowedByScope: isPlatformAllowedByScope,
        reason: isPlatformAllowedByScope
          ? `Verified ${candidatePlatform.name} reviewer (rDNS: ${hostname})`
          : `Verified ${candidatePlatform.name} reviewer, but platform is not enabled in active campaign settings`,
      };
    }

    // If ASN matched Google or Meta, but rDNS resolved to a public customer cloud VM (e.g. googleusercontent.com)
    if (hostname && !candidatePlatform.validHostnameRegex.test(hostname)) {
      return {
        isReviewer: true,
        platform: candidatePlatform.id,
        platformName: candidatePlatform.name,
        botName: matchedBotName,
        isVerified: false,
        isSpoofed: true,
        verificationMethod: 'rdns',
        resolvedHost: hostname,
        allowedByScope: false,
        reason: `Impersonation detected: IP belongs to cloud provider network but hostname (${hostname}) is not an official ${candidatePlatform.name} crawler`,
      };
    }

    // If rDNS timed out or had no PTR, but ASN is authentic
    if (!hostname && matchesAsn) {
      return {
        isReviewer: true,
        platform: candidatePlatform.id,
        platformName: candidatePlatform.name,
        botName: matchedBotName,
        isVerified: true,
        isSpoofed: false,
        verificationMethod: 'asn',
        allowedByScope: isPlatformAllowedByScope,
        reason: isPlatformAllowedByScope
          ? `Verified ${candidatePlatform.name} reviewer via official ASN (${asnOrg || 'AS' + asn})`
          : `Verified ${candidatePlatform.name} reviewer via ASN, but platform is not enabled in active campaign settings`,
      };
    }
  }

  // Platforms without strict rDNS (TikTok, X) rely on ASN & Network validation
  if (matchesAsn) {
    return {
      isReviewer: true,
      platform: candidatePlatform.id,
      platformName: candidatePlatform.name,
      botName: matchedBotName,
      isVerified: true,
      isSpoofed: false,
      verificationMethod: 'asn',
      allowedByScope: isPlatformAllowedByScope,
      reason: isPlatformAllowedByScope
        ? `Verified ${candidatePlatform.name} reviewer via official network (${asnOrg || 'AS' + asn})`
        : `Verified ${candidatePlatform.name} reviewer, but platform is not enabled in active campaign settings`,
    };
  }

  // Claimed bot pattern but neither ASN nor rDNS could verify it
  return {
    isReviewer: true,
    platform: candidatePlatform.id,
    platformName: candidatePlatform.name,
    botName: matchedBotName,
    isVerified: false,
    isSpoofed: true,
    verificationMethod: 'none',
    allowedByScope: false,
    reason: `Unverified / spoofed ad crawler: claims to be ${candidatePlatform.name} without valid network credentials`,
  };
}

/**
 * Headless Browser Exemption Helper
 * Only officially verified compliance reviewers that are in-scope are allowed to run headless Chromium.
 */
export function isExemptFromHeadlessBlock(verification: AdReviewerVerificationResult): boolean {
  return verification.isReviewer && verification.isVerified && !verification.isSpoofed && verification.allowedByScope;
}

/**
 * Admin Sandbox Test Engine for Ad Bot Verification & Click Token Extraction
 */
export async function testAdVerification(
  ip: string,
  userAgent: string,
  asn?: number,
  asnOrg?: string,
  urlOrQuery?: string,
  activePlatforms?: string[]
): Promise<{
  clickInfo: AdClickInfo;
  reviewerInfo: AdReviewerVerificationResult;
}> {
  const clickInfo = extractAdClickInfo(urlOrQuery || {});
  const reviewerInfo = await verifyAdReviewer(ip, userAgent, asn, asnOrg, activePlatforms);
  return { clickInfo, reviewerInfo };
}

