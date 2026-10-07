/**
 * Shared Browser Detection & Normalization Engine
 *
 * Implements strict, order-dependent browser identification to prevent
 * Chromium misclassification (Brave, Edge, Opera, Samsung Internet falsely reported as Chrome)
 * and Safari false-positives (Chromium browsers containing Safari/537.36).
 */

export type NormalizedBrowserName =
  | "Chrome"
  | "Brave"
  | "Safari"
  | "Edge"
  | "Firefox"
  | "Opera"
  | "Samsung Internet"
  | "DuckDuckGo"
  | "Vivaldi"
  | "Yandex"
  | "Arc"
  | "UC Browser"
  | "Electron"
  | "Unknown";

export type BrowserEngine = "Blink" | "WebKit" | "Gecko" | "EdgeHTML" | "Unknown";

export interface BrowserDetectionInput {
  userAgent?: string | null;
  headers?: Record<string, string | string[] | undefined> | null;
  secChUa?: string | null;
  clientTokens?: {
    isBrave?: boolean;
    brands?: Array<{ brand: string; version: string }>;
    browser?: string;
    [key: string]: any;
  } | null;
}

export interface BrowserDetectionResult {
  browser: NormalizedBrowserName | string;
  version: string | null;
  majorVersion: string | null;
  engine: BrowserEngine;
}

/**
 * Extracts normalized header string
 */
function getHeaderString(headers: Record<string, string | string[] | undefined> | null | undefined, key: string): string {
  if (!headers) return "";
  const val = headers[key] || headers[key.toLowerCase()] || "";
  return Array.isArray(val) ? val.join(", ") : String(val);
}

/**
 * Extracts version number from user agent with regex
 */
function extractVersion(ua: string, regex: RegExp): { version: string | null; majorVersion: string | null } {
  const match = ua.match(regex);
  if (!match || !match[1]) {
    return { version: null, majorVersion: null };
  }
  const version = match[1].trim();
  const majorVersion = version.split(".")[0] || version;
  return { version, majorVersion };
}

/**
 * Checks if a string or array of brands contains a given search target
 */
function matchesBrand(brandList: Array<{ brand: string; version: string }> | undefined, target: string): boolean {
  if (!brandList || !Array.isArray(brandList)) return false;
  const lower = target.toLowerCase();
  return brandList.some((b) => (b.brand || "").toLowerCase().includes(lower));
}

/**
 * Deterministic browser detection following the required precedence:
 * 1. Brave
 * 2. Edge
 * 3. Opera
 * 4. Samsung Internet
 * 5. Firefox
 * 6. Specific Chromium Browsers (Vivaldi, DuckDuckGo, Yandex, Arc, UC Browser, Electron)
 * 7. Safari (Strict isolation from Chromium Safari/537.36 tokens)
 * 8. Chrome (Excluded from other Chromium browsers; de-Googled Chromium guarded)
 * 9. Unknown
 */
export function detectBrowser(input: BrowserDetectionInput): BrowserDetectionResult {
  const ua = (input.userAgent || "").trim();
  const headers = input.headers || {};
  const clientTokens = input.clientTokens || {};
  const secChUa = (
    input.secChUa ||
    getHeaderString(headers, "sec-ch-ua") ||
    getHeaderString(headers, "Sec-Ch-Ua")
  ).toLowerCase();

  const lowerUa = ua.toLowerCase();
  const brands = clientTokens.brands;
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  // =========================================================================
  // 1. BRAVE DETECTION
  // =========================================================================
  // Brave intentionally mimics Chrome UA byte-for-byte to prevent ad-block discrimination.
  // We identify Brave via:
  // - Verified client-side hardware/navigator probe (navigator.brave.isBrave())
  // - sec-ch-ua containing Brave
  // - Explicit Brave token in User-Agent (where present)
  // - Client hints brands list
  const isBraveClient = Boolean(
    clientTokens.isBrave === true ||
    clientTokens.browser?.toLowerCase() === "brave" ||
    matchesBrand(brands, "Brave") ||
    secChUa.includes("brave") ||
    /brave\//i.test(ua) ||
    / brave /i.test(ua)
  );

  if (isBraveClient) {
    const { version, majorVersion } = extractVersion(ua, /(?:brave|chrome)\/([0-9.]+)/i);
    return {
      browser: "Brave",
      version,
      majorVersion,
      engine: isIOS ? "WebKit" : "Blink",
    };
  }

  // =========================================================================
  // 2. MICROSOFT EDGE DETECTION
  // =========================================================================
  // - Modern Edge: Edg/ (Desktop & Android)
  // - Edge Android: EdgA/
  // - Edge iOS: EdgiOS/
  // - Legacy Edge: Edge/
  // - Client Hints: "Microsoft Edge" or "Edge"
  const isEdge = Boolean(
    /edg\/([0-9.]+)/i.test(ua) ||
    /edga\/([0-9.]+)/i.test(ua) ||
    /edgios\/([0-9.]+)/i.test(ua) ||
    /edge\/([0-9.]+)/i.test(ua) ||
    secChUa.includes("microsoft edge") ||
    secChUa.includes("edg") ||
    matchesBrand(brands, "Microsoft Edge") ||
    matchesBrand(brands, "Edge")
  );

  if (isEdge) {
    const { version, majorVersion } = extractVersion(ua, /(?:edg|edga|edgios|edge)\/([0-9.]+)/i);
    const isLegacyEdgeHtml = /edge\/([0-9.]+)/i.test(ua) && !/edg\//i.test(ua);
    return {
      browser: "Edge",
      version,
      majorVersion,
      engine: isIOS ? "WebKit" : isLegacyEdgeHtml ? "EdgeHTML" : "Blink",
    };
  }

  // =========================================================================
  // 3. OPERA DETECTION
  // =========================================================================
  // - Opera desktop: OPR/
  // - Opera Touch: OPT/
  // - Opera GX: OPX/
  // - Opera Mobile/Mini: Opera Mini/ or Opera Mobi/ or Opera/
  // - Client Hints: "Opera" or "OPR"
  const isOpera = Boolean(
    /opr\/([0-9.]+)/i.test(ua) ||
    /opt\/([0-9.]+)/i.test(ua) ||
    /opx\/([0-9.]+)/i.test(ua) ||
    /opera mini\/([0-9.]+)/i.test(ua) ||
    /opera mobi\/([0-9.]+)/i.test(ua) ||
    /opera\/([0-9.]+)/i.test(ua) ||
    secChUa.includes("opera") ||
    matchesBrand(brands, "Opera") ||
    matchesBrand(brands, "OPR")
  );

  if (isOpera) {
    const { version, majorVersion } = extractVersion(ua, /(?:opr|opt|opx|opera mini|opera mobi|opera)\/([0-9.]+)/i);
    return {
      browser: "Opera",
      version,
      majorVersion,
      engine: isIOS ? "WebKit" : "Blink",
    };
  }

  // =========================================================================
  // 4. SAMSUNG INTERNET DETECTION
  // =========================================================================
  // - SamsungBrowser/
  // - Client Hints: "Samsung Internet"
  const isSamsungInternet = Boolean(
    /samsungbrowser\/([0-9.]+)/i.test(ua) ||
    secChUa.includes("samsung internet") ||
    matchesBrand(brands, "Samsung Internet")
  );

  if (isSamsungInternet) {
    const { version, majorVersion } = extractVersion(ua, /samsungbrowser\/([0-9.]+)/i);
    return {
      browser: "Samsung Internet",
      version,
      majorVersion,
      engine: "Blink",
    };
  }

  // =========================================================================
  // 5. FIREFOX DETECTION
  // =========================================================================
  // - Firefox Desktop/Android: Firefox/
  // - Firefox iOS: FxiOS/
  // - Firefox Focus: Focus/
  const isFirefox = Boolean(
    /firefox\/([0-9.]+)/i.test(ua) ||
    /fxios\/([0-9.]+)/i.test(ua) ||
    /focus\/([0-9.]+)/i.test(ua)
  );

  if (isFirefox) {
    const { version, majorVersion } = extractVersion(ua, /(?:firefox|fxios|focus)\/([0-9.]+)/i);
    return {
      browser: "Firefox",
      version,
      majorVersion,
      engine: isIOS ? "WebKit" : "Gecko",
    };
  }

  // =========================================================================
  // 6. SPECIFIC CHROMIUM / SPECIALIZED BROWSERS
  // =========================================================================
  // Must be evaluated BEFORE generic Chrome & Safari
  if (/duckduckgo\/([0-9.]+)/i.test(ua) || /ddb\/([0-9.]+)/i.test(ua)) {
    const { version, majorVersion } = extractVersion(ua, /(?:duckduckgo|ddb)\/([0-9.]+)/i);
    return { browser: "DuckDuckGo", version, majorVersion, engine: isIOS ? "WebKit" : "Blink" };
  }

  if (/vivaldi\/([0-9.]+)/i.test(ua) || secChUa.includes("vivaldi") || matchesBrand(brands, "Vivaldi")) {
    const { version, majorVersion } = extractVersion(ua, /vivaldi\/([0-9.]+)/i);
    return { browser: "Vivaldi", version, majorVersion, engine: "Blink" };
  }

  if (/yabrowser\/([0-9.]+)/i.test(ua) || secChUa.includes("yandex") || matchesBrand(brands, "Yandex")) {
    const { version, majorVersion } = extractVersion(ua, /yabrowser\/([0-9.]+)/i);
    return { browser: "Yandex", version, majorVersion, engine: "Blink" };
  }

  if (/arc\/([0-9.]+)/i.test(ua) || secChUa.includes("arc") || matchesBrand(brands, "Arc")) {
    const { version, majorVersion } = extractVersion(ua, /arc\/([0-9.]+)/i);
    return { browser: "Arc", version, majorVersion, engine: "Blink" };
  }

  if (/ucbrowser\/([0-9.]+)/i.test(ua) || /ubrowser\/([0-9.]+)/i.test(ua)) {
    const { version, majorVersion } = extractVersion(ua, /(?:ucbrowser|ubrowser)\/([0-9.]+)/i);
    return { browser: "UC Browser", version, majorVersion, engine: "Blink" };
  }

  if (/electron\/([0-9.]+)/i.test(ua)) {
    const { version, majorVersion } = extractVersion(ua, /electron\/([0-9.]+)/i);
    return { browser: "Electron", version, majorVersion, engine: "Blink" };
  }

  // =========================================================================
  // 7. SAFARI DETECTION (STRICT ISOLATION)
  // =========================================================================
  // Modern Chromium browsers include "Safari/537.36" in their User-Agent.
  // Safari MUST:
  // - Contain Safari/ or MobileSafari/ or Version/
  // - NOT contain Chrome/, Chromium/, CriOS/
  // - NOT contain any Chromium client hints
  // - Be on Apple platforms (Macintosh, iPhone, iPad, iPod) or WebKit
  const hasSafariToken = /safari\/[0-9.]+/i.test(ua) || /version\/[0-9.]+/i.test(ua) || /mobilesafari/i.test(ua);
  const hasChromiumToken = /chrome\/[0-9.]+/i.test(ua) || /crios\/[0-9.]+/i.test(ua) || /chromium/i.test(ua) || secChUa.includes("chromium");

  if (hasSafariToken && !hasChromiumToken) {
    // Safari version is traditionally specified in "Version/X.Y.Z"
    let { version, majorVersion } = extractVersion(ua, /version\/([0-9.]+)/i);
    if (!version) {
      const fallback = extractVersion(ua, /safari\/([0-9.]+)/i);
      version = fallback.version;
      majorVersion = fallback.majorVersion;
    }
    return {
      browser: "Safari",
      version,
      majorVersion,
      engine: "WebKit",
    };
  }

  // =========================================================================
  // 8. GOOGLE CHROME DETECTION
  // =========================================================================
  // - Desktop/Android Chrome: Chrome/
  // - iOS Chrome: CriOS/
  // - Guard against de-Googled / unbranded Chromium:
  //   If sec-ch-ua is present and reports "Chromium" but lacks "Google Chrome",
  //   and lacks Brave confirmation, we must report "Unknown" rather than guessing Chrome.
  const hasChromeToken = /chrome\/([0-9.]+)/i.test(ua) || /crios\/([0-9.]+)/i.test(ua);

  if (hasChromeToken) {
    const hasSecChUa = Boolean(secChUa.length > 0);
    const hasGoogleBrand = secChUa.includes("google chrome") || matchesBrand(brands, "Google Chrome");
    const hasChromiumOnly = secChUa.includes("chromium") && !hasGoogleBrand;

    // Strict accuracy rule: If client hints explicitly provided Chromium brand but omitted Google Chrome brand,
    // this is a de-Googled or privacy-hardened Chromium browser (like Brave without JS probe).
    // Report Unknown rather than guessing Chrome.
    if (hasSecChUa && hasChromiumOnly) {
      return {
        browser: "Unknown",
        version: null,
        majorVersion: null,
        engine: "Blink",
      };
    }

    const { version, majorVersion } = extractVersion(ua, /(?:chrome|crios)\/([0-9.]+)/i);
    return {
      browser: "Chrome",
      version,
      majorVersion,
      engine: isIOS ? "WebKit" : "Blink",
    };
  }

  // =========================================================================
  // 9. UNKNOWN / UNIDENTIFIABLE BROWSER
  // =========================================================================
  // Never guess, never fall back to Chrome.
  return {
    browser: "Unknown",
    version: null,
    majorVersion: null,
    engine: "Unknown",
  };
}

/**
 * Normalizes any existing raw browser string (e.g. from historical database entries)
 * into standard canonical browser names.
 */
export function normalizeBrowserName(rawBrowser: string | null | undefined): NormalizedBrowserName {
  if (!rawBrowser || typeof rawBrowser !== "string") return "Unknown";
  const trimmed = rawBrowser.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "unknown") return "Unknown";

  const lower = trimmed.toLowerCase();

  if (lower.startsWith("brave") || lower.includes("brave")) return "Brave";
  if (lower.startsWith("edge") || lower.includes("edg")) return "Edge";
  if (lower.startsWith("opera") || lower.includes("opr") || lower.includes("opt")) return "Opera";
  if (lower.startsWith("samsung") || lower.includes("samsung")) return "Samsung Internet";
  if (lower.startsWith("firefox") || lower.includes("fxios")) return "Firefox";
  if (lower.startsWith("safari") || (lower.includes("safari") && !lower.includes("chrome"))) return "Safari";
  if (lower.startsWith("chrome") || lower.startsWith("crios")) return "Chrome";
  if (lower.includes("duckduckgo")) return "DuckDuckGo";
  if (lower.includes("vivaldi")) return "Vivaldi";
  if (lower.includes("yandex") || lower.includes("yabrowser")) return "Yandex";
  if (lower.includes("arc")) return "Arc";
  if (lower.includes("ucbrowser")) return "UC Browser";
  if (lower.includes("electron")) return "Electron";

  return "Unknown";
}
