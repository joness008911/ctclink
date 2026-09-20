/**
 * Forensic Security & Risk Scoring Helpers
 * Shared between Dashboard Overview and Visitor Logs
 */

export interface ThreatScoreInfo {
  score: number;
  level: "clean" | "low" | "medium" | "high" | "critical";
  label: string;
  badgeClass: string;
  dotClass: string;
}

export function computeThreatScore(item: any): ThreatScoreInfo {
  const isHuman = item.visitorType === "Human";
  const method = (item.detectionMethod || "").toLowerCase();
  const usageType = (item.usageType || "").toUpperCase();

  const isConsumerPrivacy = method.includes("consumer privacy") || method.includes("relay");
  const isVerifiedConsumerVpn = method.includes("verified consumer vpn") || method.includes("clean consumer vpn");
  const isDeviceRestricted = method.includes("device restricted");
  const isOsRestricted = method.includes("os restricted");
  const isGeoRestricted = method.includes("geo") || method.includes("country");
  const isPolicyFilter = isDeviceRestricted || isOsRestricted || isGeoRestricted;
  const isTor = method.includes("tor") || usageType === "TOR";
  const isBotnet = method.includes("botnet") || method.includes("scanner") || method.includes("spammer") || method.includes("bogon");
  const isResidentialProxyPool = method.includes("residential proxy") || method.includes("scraping pool");
  const isDatacenter = method.includes("datacenter") || method.includes("dch") || method.includes("cloud") || usageType === "DCH";
  const isRateLimit = method.includes("rate limit") || method.includes("subscription") || method.includes("velocity");
  const isVpn = method.includes("vpn") || usageType === "VPN";
  const isProxy = method.includes("proxy");
  const isBotCrawler = method.includes("crawler") || method.includes("bot") || method.includes("synthetic") || method.includes("header") || method.includes("client hints");
  const isIpBlocklist = method.includes("blocklist") || method.includes("cidr");

  let score: number;
  if (item.riskScore !== undefined && item.riskScore !== null) {
    score = Number(item.riskScore);
  } else if (isHuman) {
    score = (isConsumerPrivacy || isVerifiedConsumerVpn) ? 14 : 6;
  } else if (isBotnet) {
    score = 99;
  } else if (isTor) {
    score = 98;
  } else if (method.includes("client hints")) {
    score = 96; // Spoofed OS/Client Hints mismatch is definitive scraper
  } else if (method.includes("headless")) {
    score = 97; // Explicit automated headless browser engine
  } else if (isResidentialProxyPool) {
    score = 88;
  } else if (isDeviceRestricted || isOsRestricted) {
    score = 18; // Policy restriction, not an attacking threat
  } else if (isGeoRestricted) {
    score = 22; // Out of target geography
  } else if (isRateLimit) {
    score = 65;
  } else if (isVpn) {
    score = 72;
  } else if (isProxy) {
    score = 78;
  } else if (isDatacenter) {
    score = 88;
  } else if (isBotCrawler) {
    score = 94;
  } else if (isIpBlocklist) {
    score = 95;
  } else {
    score = 80;
  }

  // Determine threat level & styling
  if (score <= 15) {
    return {
      score,
      level: "clean",
      label: "Clean Human",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
      dotClass: "bg-emerald-500",
    };
  }
  if (score <= 35) {
    return {
      score,
      level: "low",
      label: "Policy Deflected",
      badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80",
      dotClass: "bg-sky-500",
    };
  }
  if (score <= 70) {
    return {
      score,
      level: "medium",
      label: "Suspicious",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
      dotClass: "bg-amber-500",
    };
  }
  if (score <= 89) {
    return {
      score,
      level: "high",
      label: "High Risk",
      badgeClass: "bg-orange-50 text-orange-800 border-orange-200/80",
      dotClass: "bg-orange-500",
    };
  }
  return {
    score,
    level: "critical",
    label: "Critical Bot",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200/80",
    dotClass: "bg-rose-500",
  };
}

/**
 * Extract or format ASN identifier (e.g. AS7922, AS16509, AS13335)
 */
export function formatAsnDisplay(item: any): { asnBadge: string; org: string } {
  const isHuman = item.visitorType === "Human";
  const isp = item.isp || "";
  const rawAsn = item.asn || "";

  // Check if asn is already in standard format like AS12345 or contains number
  if (rawAsn && rawAsn.toUpperCase().startsWith("AS")) {
    return {
      asnBadge: rawAsn.toUpperCase(),
      org: isp || "Registered ASN",
    };
  }

  if (rawAsn && /^\d+$/.test(String(rawAsn).trim())) {
    return {
      asnBadge: `AS${rawAsn}`,
      org: isp || "Registered ASN",
    };
  }

  // Heuristic ASN mapping for common carriers if raw asn field wasn't populated
  const ispLower = isp.toLowerCase();
  if (ispLower.includes("amazon") || ispLower.includes("aws")) return { asnBadge: "AS16509", org: isp || "Amazon AWS" };
  if (ispLower.includes("google cloud") || ispLower.includes("google llc")) return { asnBadge: "AS15169", org: isp || "Google Cloud" };
  if (ispLower.includes("microsoft") || ispLower.includes("azure")) return { asnBadge: "AS8075", org: isp || "Microsoft Azure" };
  if (ispLower.includes("cloudflare")) return { asnBadge: "AS13335", org: isp || "Cloudflare" };
  if (ispLower.includes("digitalocean")) return { asnBadge: "AS14061", org: isp || "DigitalOcean" };
  if (ispLower.includes("hetzner")) return { asnBadge: "AS24940", org: isp || "Hetzner Online" };
  if (ispLower.includes("ovh")) return { asnBadge: "AS16276", org: isp || "OVH SAS" };
  if (ispLower.includes("comcast")) return { asnBadge: "AS7922", org: isp || "Comcast Cable" };
  if (ispLower.includes("verizon")) return { asnBadge: "AS701", org: isp || "Verizon" };
  if (ispLower.includes("at&t") || ispLower.includes("att")) return { asnBadge: "AS7018", org: isp || "AT&T Services" };
  if (ispLower.includes("charter") || ispLower.includes("spectrum")) return { asnBadge: "AS20115", org: isp || "Charter Spectrum" };
  if (ispLower.includes("t-mobile")) return { asnBadge: "AS21928", org: isp || "T-Mobile USA" };
  if (ispLower.includes("vodafone")) return { asnBadge: "AS1273", org: isp || "Vodafone Group" };

  if (isp && isp !== "Filtered by Rule" && isp !== "Unknown") {
    return {
      asnBadge: "AS-ORG",
      org: isp,
    };
  }

  return {
    asnBadge: isHuman ? "AS-RES" : "AS-DCH",
    org: isHuman ? "Residential Broadband" : "Datacenter Hosting",
  };
}
