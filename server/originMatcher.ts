/**
 * CleanTraffic Origin & Domain Whitelisting Engine
 * 
 * Protects client-side embedded JavaScript tags (protect.js) from API key theft,
 * domain spoofing, and foreign quota depletion.
 * 
 * Supports:
 * - Exact domains: "domain.com", "myshop.framer.app"
 * - Subdomain wildcards: "*.domain.com", "https://*.store.com"
 * - Full URL origins: "https://domain.com", "http://localhost:3000"
 * - IP subnets & wildcards: "23.43.136.*", "192.168.1.*"
 */

export interface OriginCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPattern?: string;
  parsedOrigin?: string;
}

/**
 * Normalizes an origin, referer, or URL to a clean hostname / origin
 */
export function extractHostname(rawUrlOrOrigin: string | null | undefined): string {
  if (!rawUrlOrOrigin || typeof rawUrlOrOrigin !== "string") return "";
  let val = rawUrlOrOrigin.trim().toLowerCase();

  try {
    if (val.startsWith("http://") || val.startsWith("https://")) {
      const parsed = new URL(val);
      return parsed.hostname.toLowerCase();
    }
  } catch {}

  // Strip path, query params, hash and port if present
  val = val.split("?")[0].split("#")[0].split("/")[0].split(":")[0];
  return val.trim();
}

/**
 * Evaluates whether an incoming HTTP request origin/referer matches the key's allowed origin rules.
 * 
 * Modes:
 * - "forbid_all_except" (Strict Whitelist): Only specifically listed domains are permitted.
 * - "allow_all_except" (Blacklist): All domains are permitted except specifically listed domains.
 * 
 * If allowedDomains is empty, all websites are allowed by default.
 */
export function isOriginAllowed(
  requestOriginOrUrl: string | null | undefined,
  allowedDomains: string[] | null | undefined,
  filterMode: string = "forbid_all_except"
): OriginCheckResult {
  // If no domains are configured, allow all websites by default
  const sanitizedList = Array.isArray(allowedDomains)
    ? allowedDomains.map(d => String(d || "").trim()).filter(Boolean)
    : [];

  if (sanitizedList.length === 0) {
    return {
      allowed: true,
      reason: "No origin rules configured (all websites allowed by default)"
    };
  }

  const incomingHost = extractHostname(requestOriginOrUrl);

  // If request has no Origin/Referer/URL (e.g. headless curl or direct CLI call)
  if (!incomingHost) {
    if (filterMode === "forbid_all_except") {
      return {
        allowed: false,
        reason: "Missing Origin or Referer header in request (strict whitelist active)",
        parsedOrigin: "unknown"
      };
    } else {
      // allow_all_except mode allows unknown headers
      return {
        allowed: true,
        reason: "Request allowed (no matching blacklist pattern)",
        parsedOrigin: "unknown"
      };
    }
  }

  let matchedPattern: string | undefined = undefined;

  for (const rawPattern of sanitizedList) {
    let pattern = rawPattern.trim().toLowerCase();
    if (!pattern) continue;

    // Normalize pattern by removing protocol and paths
    try {
      if (pattern.startsWith("http://") || pattern.startsWith("https://")) {
        const u = new URL(pattern);
        pattern = u.hostname;
      }
    } catch {}

    pattern = pattern.split("/")[0].split(":")[0];

    // 1. Exact match (e.g. "framer.app" === "framer.app")
    if (incomingHost === pattern) {
      matchedPattern = rawPattern;
      break;
    }

    // 2. Wildcard subdomain (e.g. "*.domain.com" or "https://*.domain.com")
    if (pattern.startsWith("*.")) {
      const root = pattern.slice(2);
      if (incomingHost === root || incomingHost.endsWith("." + root)) {
        matchedPattern = rawPattern;
        break;
      }
    }

    // 3. Root domain match if user typed "domain.com", also match "www.domain.com"
    if (incomingHost === `www.${pattern}`) {
      matchedPattern = rawPattern;
      break;
    }

    // 4. IP prefix wildcard (e.g. "23.43.136.*")
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2);
      if (incomingHost.startsWith(prefix)) {
        matchedPattern = rawPattern;
        break;
      }
    }
  }

  if (filterMode === "forbid_all_except") {
    // Whitelist mode: must have matched one of the allowed patterns
    if (matchedPattern) {
      return {
        allowed: true,
        matchedPattern,
        parsedOrigin: incomingHost,
        reason: `Matched allowed domain rule: ${matchedPattern}`
      };
    } else {
      return {
        allowed: false,
        parsedOrigin: incomingHost,
        reason: `Origin "${incomingHost}" is not in the allowed domains whitelist`
      };
    }
  } else {
    // Blacklist mode: if matched, it is forbidden!
    if (matchedPattern) {
      return {
        allowed: false,
        matchedPattern,
        parsedOrigin: incomingHost,
        reason: `Origin "${incomingHost}" matched forbidden blacklist rule: ${matchedPattern}`
      };
    } else {
      return {
        allowed: true,
        parsedOrigin: incomingHost,
        reason: `Origin "${incomingHost}" is not blacklisted`
      };
    }
  }
}
