import { createHash } from "crypto";

export interface VisitorDeviceSignals {
  ip: string;
  userAgent?: string;
  headers?: Record<string, string | string[] | undefined>;
  clientTokens?: {
    webdriver?: boolean;
    outerWidth?: number;
    outerHeight?: number;
    screenWidth?: number;
    screenHeight?: number;
    colorDepth?: number;
    missingPluginsArray?: boolean;
    gpuRenderer?: string;
    untrustedEvent?: boolean;
    timezoneOffset?: number;
    hardwareConcurrency?: number;
  } | null;
}

/**
 * CleanTraffic Deterministic Device ID Synthesizer
 * 
 * Generates a stable, high-entropy device identifier without injecting invasive 
 * client-side trackers or triggering privacy alarms in Brave/Safari/Firefox.
 * 
 * Handles:
 *  - High-Entropy Client Hardware Signals (when available via passive interstitial)
 *  - Server Subnet & Client-Hints Normalization (when requests arrive without client JS)
 *  - Safe fallback for all null / undefined / bot payloads
 */
export function synthesizeDeviceId(signals: VisitorDeviceSignals): {
  deviceId: string;
  idTier: "hardware" | "header_subnet";
} {
  const ip = (signals.ip || "127.0.0.1").trim();
  const ua = (signals.userAgent || "").trim();
  const tokens = signals.clientTokens;

  // Extract /24 subnet for IPv4 (e.g., "192.168.1.0/24") or /48 for IPv6
  let subnet = ip;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  } else if (ip.includes(":")) {
    const parts = ip.split(":");
    subnet = parts.slice(0, 3).join(":") + "::/48";
  }

  // Tier 1: Hardware-backed ID (from passive screen/GPU/canvas tokens)
  if (
    tokens &&
    (tokens.gpuRenderer || (tokens.screenWidth && tokens.screenWidth > 0))
  ) {
    const screenRes = `${tokens.screenWidth || 0}x${tokens.screenHeight || 0}x${tokens.colorDepth || 0}`;
    const gpu = (tokens.gpuRenderer || "").toLowerCase().trim();
    const plugins = tokens.missingPluginsArray ? "no_plugins" : "has_plugins";
    const cores = tokens.hardwareConcurrency || 0;
    const tz = tokens.timezoneOffset || 0;

    // Combine hardware entropy with client hints/ua
    const hardwareSeed = [
      subnet,
      ua,
      screenRes,
      gpu,
      plugins,
      cores,
      tz
    ].join("|");

    const hash = createHash("sha256").update(hardwareSeed).digest("hex").slice(0, 16);
    return {
      deviceId: `dev_hw_${hash}`,
      idTier: "hardware"
    };
  }

  // Tier 2: Server-side Header & Client Hints Subnet ID (Passive, zero-latency fallback)
  const headers = signals.headers || {};
  const acceptLang = getHeaderValue(headers, "accept-language") || "";
  const accept = getHeaderValue(headers, "accept") || "";
  const secChUa = getHeaderValue(headers, "sec-ch-ua") || "";
  const secChUaPlatform = getHeaderValue(headers, "sec-ch-ua-platform") || "";

  const serverSeed = [
    subnet,
    ua,
    secChUa,
    secChUaPlatform,
    acceptLang.split(",")[0] || "",
    accept.slice(0, 30)
  ].join("|");

  const hash = createHash("sha256").update(serverSeed).digest("hex").slice(0, 16);
  return {
    deviceId: `dev_srv_${hash}`,
    idTier: "header_subnet"
  };
}

function getHeaderValue(headers: Record<string, string | string[] | undefined>, name: string): string {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      if (Array.isArray(val)) return val[0] || "";
      return String(val || "");
    }
  }
  return "";
}
