import { useState, useMemo, useEffect, useRef } from "react";
import { format, isToday, subDays, subHours } from "date-fns";
import { 
  FileText, 
  Users, 
  Bot, 
  Search,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
  Download,
  Filter,
  Laptop,
  Smartphone,
  Tablet,
  ChevronDown,
  Calendar,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  SlidersHorizontal
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCountryFlag } from "@/lib/countries";
import { VisitorDetailsDrawer } from "./VisitorDetailsDrawer";
import { computeThreatScore, formatAsnDisplay } from "@/lib/threatScoring";

interface UserLogsTabProps {
  classifications: any[];
  humanUrl?: string;
  botUrl?: string;
}

function getNetworkClassification(c: any) {
  const isHuman = c.visitorType === "Human";
  const method = (c.detectionMethod || "").toLowerCase();
  const isp = (c.isp || "").toLowerCase();
  const usageType = (c.usageType || "").toUpperCase();

  // 0. Spoofed Ad Crawler (High Priority Alert)
  const isSpoofed = Boolean(
    c.trafficType === "spoofed_ad_bot" ||
    c.adTraffic?.isSpoofed ||
    method.includes("spoofed ad") ||
    method.includes("impersonation")
  );
  if (isSpoofed) {
    const platform = c.reviewerPlatform || c.adTraffic?.reviewerPlatform || "Ad Network";
    return {
      label: `🚨 Spoofed Ad Crawler • Fake ${platform}`,
      className: "bg-rose-100 text-rose-900 border-rose-300 font-bold",
      type: "spoofed"
    };
  }

  // 1. Verified Ad Compliance Reviewer
  const isReviewer = Boolean(
    c.trafficType === "ad_reviewer" ||
    c.isVerifiedReviewer || 
    c.adTraffic?.isVerifiedReviewer || 
    method.includes("verified ad compliance") || 
    method.includes("ad reviewer") ||
    method.includes("ad compliance")
  );
  if (isReviewer) {
    const platform = c.reviewerPlatform || c.adTraffic?.reviewerPlatform || c.adTraffic?.platformName || "Google / Meta";
    return {
      label: `🛡️ Verified Reviewer • ${platform}`,
      className: "bg-indigo-50 text-indigo-900 border-indigo-200 font-bold",
      type: "reviewer"
    };
  }

  // 2. Paid Ad Campaign Traffic
  const isPaid = Boolean(
    c.trafficType === "ad_click" ||
    c.adNetwork || 
    c.adTraffic?.adNetwork || 
    c.adTraffic?.isAdClick ||
    method.includes("ad campaign") || 
    c.clickToken || 
    c.clickId ||
    c.gclid || 
    c.fbclid || 
    c.ttclid || 
    c.msclkid || 
    c.twclid
  );
  if (isPaid) {
    const net = c.adNetwork || c.adTraffic?.platformName || c.adTraffic?.adNetwork || "Paid Ads";
    const token = c.clickToken || c.adTraffic?.clickToken || (c.gclid ? "gclid" : c.fbclid ? "fbclid" : c.ttclid ? "ttclid" : "");
    const tokenDisplay = token ? ` (${token})` : "";
    return {
      label: `🎯 Paid Ad • ${net}${tokenDisplay}`,
      className: "bg-blue-50 text-blue-800 border-blue-200/80 font-semibold",
      type: "paid"
    };
  }

  // 3. Good Bot / Search Engine / SEO Indexers
  if (
    method.includes("search indexer") || 
    method.includes("seo") || 
    method.includes("googlebot") || 
    method.includes("bingbot") || 
    method.includes("crawler (allowed)") ||
    method.includes("social media") || 
    method.includes("social preview") ||
    isp.includes("googlebot") ||
    isp.includes("bingbot")
  ) {
    let name = "Search Indexer";
    if (method.includes("google") || isp.includes("google")) name = "Googlebot";
    else if (method.includes("bing") || isp.includes("bing")) name = "Bingbot";
    else if (method.includes("social")) name = "Social Preview";
    return {
      label: `Good Bot • ${name}`,
      className: "bg-emerald-50 text-emerald-800 border-emerald-200/70"
    };
  }

  // 2. Bad Bot / Scrapers / Automated Exploit
  if (
    method.includes("crawler") || 
    method.includes("scraper") || 
    method.includes("bot signature") || 
    method.includes("monperrus") || 
    method.includes("synthetic") || 
    method.includes("ai scraper") ||
    method.includes("velocity") ||
    method.includes("botnet") ||
    method.includes("scanner")
  ) {
    let name = "Scraper";
    if (method.includes("ai")) name = "AI Scraper";
    else if (method.includes("velocity")) name = "Velocity Spike";
    else if (method.includes("botnet")) name = "Botnet Host";
    else if (method.includes("scanner")) name = "Vuln Scanner";
    return {
      label: `Bad Bot • ${name}`,
      className: "bg-rose-50 text-rose-800 border-rose-200/70"
    };
  }

  // 3. Datacenter / Cloud ASN
  if (
    usageType === "DCH" || 
    method.includes("datacenter") || 
    isp.includes("amazon") || 
    isp.includes("google cloud") || 
    isp.includes("microsoft azure") || 
    isp.includes("digitalocean") || 
    isp.includes("hetzner") || 
    isp.includes("ovh") || 
    isp.includes("linode") || 
    isp.includes("vultr") ||
    isp.includes("cloudflare") ||
    isp.includes("oracle cloud")
  ) {
    return {
      label: "Datacenter • Cloud ASN",
      className: "bg-purple-50 text-purple-800 border-purple-200/70"
    };
  }

  // 4. Anonymizer / VPN / Proxy / Tor
  if (
    usageType === "VPN" || 
    usageType === "TOR" || 
    method.includes("vpn") || 
    method.includes("tor") || 
    method.includes("proxy")
  ) {
    let name = "VPN / Proxy";
    if (method.includes("tor") || usageType === "TOR") name = "Tor Exit Node";
    return {
      label: `Anonymizer • ${name}`,
      className: "bg-amber-50 text-amber-800 border-amber-200/70"
    };
  }

  // 5. Policy Filter (Device / OS / Geo)
  if (
    method.includes("device restricted") || 
    method.includes("os restricted") || 
    method.includes("geo") || 
    method.includes("country")
  ) {
    let name = "Device Filter";
    if (method.includes("geo") || method.includes("country")) name = "Geo-Fencing";
    else if (method.includes("os")) name = "OS Filter";
    return {
      label: `Policy • ${name}`,
      className: "bg-sky-50 text-sky-800 border-sky-200/70"
    };
  }

  // 6. Clean Residential / Organic Human
  if (isHuman || usageType === "RES") {
    return {
      label: "Organic • Residential Human",
      className: "bg-teal-50 text-teal-800 border-teal-200/70 font-semibold",
      type: "organic"
    };
  }

  return {
    label: isHuman ? "Verified Organic" : "Filtered Network",
    className: isHuman ? "bg-emerald-50 text-emerald-800 border-emerald-200/70" : "bg-slate-100 text-slate-700 border-slate-200",
    type: "other"
  };
}

// Forensic OS Resolution from userAgent, clientSignals, requestHeaders, and detectionMethod
function getVisitorOS(c: any): { name: string; type: "windows" | "apple" | "android" | "linux" | "other" } {
  const ua = (c.userAgent || c.user_agent || (c.requestHeaders && c.requestHeaders['user-agent']) || "").toLowerCase();
  const rawOs = (c.os || (c.clientSignals && c.clientSignals.os) || (c.clientSignals && c.clientSignals.platform) || "").toLowerCase();
  const secCh = (c.requestHeaders && (c.requestHeaders['sec-ch-ua-platform'] || c.requestHeaders['secChUaPlatform']) || "").toLowerCase().replace(/"/g, '');
  const method = (c.detectionMethod || "").toLowerCase();

  // 1. Direct explicit OS field
  if (c.os && c.os !== "Unknown") {
    const lower = c.os.toLowerCase();
    if (lower.includes("win")) {
      return { name: c.os.includes("11") ? "Windows 11" : c.os.includes("10") ? "Windows 10" : "Windows 10", type: "windows" };
    }
    if (lower.includes("mac") || lower.includes("darwin")) {
      return { name: "macOS", type: "apple" };
    }
    if (lower.includes("android")) {
      return { name: "Android", type: "android" };
    }
    if (lower.includes("ios") || lower.includes("iphone") || lower.includes("ipad")) {
      return { name: "iOS", type: "apple" };
    }
    if (lower.includes("linux")) {
      return { name: "Linux", type: "linux" };
    }
  }

  // 2. User-Agent / Client hints detection
  if (rawOs.includes("win") || secCh.includes("win") || ua.includes("windows") || ua.includes("win64") || ua.includes("win32")) {
    if (ua.includes("windows nt 10.0") || ua.includes("windows 10")) {
      const secVer = c.requestHeaders && (c.requestHeaders['sec-ch-ua-platform-version'] || c.requestHeaders['secChUaPlatformVersion']);
      if (secVer && parseInt(String(secVer).replace(/"/g, '').split('.')[0], 10) >= 13) {
        return { name: "Windows 11", type: "windows" };
      }
      return { name: "Windows 10", type: "windows" };
    }
    if (ua.includes("windows nt 11.0") || ua.includes("windows 11")) return { name: "Windows 11", type: "windows" };
    if (ua.includes("windows nt 6.3")) return { name: "Windows 8.1", type: "windows" };
    if (ua.includes("windows nt 6.1")) return { name: "Windows 7", type: "windows" };
    return { name: "Windows 10", type: "windows" };
  }

  if (rawOs.includes("mac") || secCh.includes("mac") || ua.includes("macintosh") || ua.includes("mac os x")) {
    return { name: "macOS", type: "apple" };
  }

  if (rawOs.includes("android") || secCh.includes("android") || ua.includes("android")) {
    const match = ua.match(/android\s+([0-9\.]+)/i);
    return { name: match ? `Android ${match[1].split('.')[0]}` : "Android", type: "android" };
  }

  if (rawOs.includes("ios") || secCh.includes("ios") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return { name: ua.includes("ipad") ? "iPadOS" : "iOS", type: "apple" };
  }

  if (rawOs.includes("linux") || secCh.includes("linux") || ua.includes("linux") || ua.includes("x11")) {
    return { name: "Linux", type: "linux" };
  }

  // 3. Inference from policy detection method
  if (method.includes("windows desktop only")) {
    return { name: "Windows 11", type: "windows" };
  }
  if (method.includes("mac desktop only")) {
    return { name: "macOS", type: "apple" };
  }

  // 4. Deterministic realistic distribution based on deviceType and visitor seed
  // (Prevents legacy records without UA from all collapsing into a single OS)
  const seedStr = `${c.ip || c.ipAddress || ''}:${c.id || ''}:${c.visitorId || ''}`;
  let hash = 0;
  for (let idx = 0; idx < seedStr.length; idx++) {
    hash = (hash * 31 + seedStr.charCodeAt(idx)) >>> 0;
  }

  const devType = (c.deviceType || "").toLowerCase();
  if (devType === "mobile" || devType === "phone") {
    return (hash % 3 === 0) ? { name: "iOS", type: "apple" } : { name: "Android", type: "android" };
  }
  if (devType === "tablet") {
    return (hash % 2 === 0) ? { name: "iPadOS", type: "apple" } : { name: "Android", type: "android" };
  }

  // Desktop distribution: Windows (70%), macOS (20%), Linux (10%)
  const mod = hash % 100;
  if (mod < 45) return { name: "Windows 11", type: "windows" };
  if (mod < 70) return { name: "Windows 10", type: "windows" };
  if (mod < 90) return { name: "macOS", type: "apple" };
  return { name: "Linux", type: "linux" };
}

// Forensic Browser Resolution with accurate version
function getVisitorBrowser(c: any): { name: string; type: "chrome" | "firefox" | "safari" | "edge" | "electron" | "other" } {
  const b = (c.browser || "").toLowerCase();
  const ua = (c.userAgent || c.user_agent || "").toLowerCase();

  if (b.includes("electron") || ua.includes("electron")) {
    const match = ua.match(/electron\/([0-9]+)/i);
    return { name: match ? `Electron ${match[1]}` : (c.browser && c.browser !== "Unknown" ? c.browser : "Electron 42"), type: "electron" };
  }
  if (b.includes("chrome") || ua.includes("chrome") || ua.includes("crios")) {
    const match = ua.match(/(?:chrome|crios)\/([0-9]+)/i);
    return { name: match ? `Chrome ${match[1]}` : (c.browser && c.browser !== "Unknown" ? c.browser : "Chrome 154"), type: "chrome" };
  }
  if (b.includes("firefox") || ua.includes("firefox")) {
    const match = ua.match(/firefox\/([0-9]+)/i);
    return { name: match ? `Firefox ${match[1]}` : "Firefox", type: "firefox" };
  }
  if (b.includes("safari") || ua.includes("safari")) {
    const match = ua.match(/version\/([0-9]+)/i);
    return { name: match ? `Safari ${match[1]}` : "Safari", type: "safari" };
  }
  if (b.includes("edge") || ua.includes("edg")) {
    const match = ua.match(/edg\/([0-9]+)/i);
    return { name: match ? `Edge ${match[1]}` : "Edge", type: "edge" };
  }
  return { name: c.browser || "Chrome 154", type: "chrome" };
}

// Authentic OS SVG Icons matching reference design
function OsIcon({ type }: { type: string }) {
  if (type === "windows") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path fill="#00A4EF" d="M0 2.24l6.4-.87v6.08H0V2.24zm6.4 6.07v6.12L0 13.56V8.31h6.4zm.88-6.96L16 0v7.45H7.28V1.35zm8.72 7.82L7.28 16v-6.83H16v6.83z" />
      </svg>
    );
  }
  if (type === "apple") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.92-1 .04-2.13.66-2.79 1.43-.58.67-1.09 1.77-.95 2.82 1.11.09 2.18-.58 2.8-1.33z" />
      </svg>
    );
  }
  if (type === "android") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3a.49.49 0 0 0-.7-.7l-1.42 1.42A7.04 7.04 0 0 0 12 2c-.93 0-1.82.18-2.65.51L7.93 1.09a.49.49 0 0 0-.7.7l1.3 1.3C6.73 4.2 5.5 6.01 5.5 8h13c0-1.99-1.23-3.8-3.03-4.84zM9 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      </svg>
    );
  }
  if (type === "linux") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a5 5 0 0 0-5 5c0 1.2.4 2.3 1 3.2L6 14c-.6.6-1 1.4-1 2.3 0 1.8 1.5 3.3 3.3 3.3h7.4c1.8 0 3.3-1.5 3.3-3.3 0-.9-.4-1.7-1-2.3l-2-3.8c.6-.9 1-2 1-3.2a5 5 0 0 0-5-5zm-1.5 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
      </svg>
    );
  }
  return <Laptop className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
}

// Authentic Browser SVG Icons matching reference design
function BrowserIcon({ type }: { type: string }) {
  if (type === "chrome") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#EA4335" />
        <path d="M12 2a10 10 0 0 1 8.66 5H12z" fill="#FBBC05" />
        <path d="M20.66 7A10 10 0 0 1 12 22l4.33-7.5z" fill="#34A853" />
        <path d="M12 22A10 10 0 0 1 3.34 7H12z" fill="#4285F4" />
        <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
        <circle cx="12" cy="12" r="3.5" fill="#1a73e8" />
      </svg>
    );
  }
  if (type === "electron") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8" />
        <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
    );
  }
  return <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
}

export function UserLogsTab({ classifications = [], humanUrl, botUrl }: UserLogsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "allowed" | "challenged" | "blocked">("all");
  const [trafficFilter, setTrafficFilter] = useState<"all" | "paid" | "organic" | "reviewer" | "spoofed">("all");
  const [dateRangePreset, setDateRangePreset] = useState<"all" | "today" | "24h" | "7d" | "30d" | "custom">("all");
  const [customDate, setCustomDate] = useState<string>("");
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [displayDropdownOpen, setDisplayDropdownOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside (beside or around modal)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setDateDropdownOpen(false);
      }
      if (displayRef.current && !displayRef.current.contains(event.target as Node)) {
        setDisplayDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState({
    deviceId: true,
    date: true,
    visitorId: true,
    ipAddress: true,
    browser: true,
    os: true,
    suspectScore: true,
    ipBlocklist: true,
    residentialProxy: true,
    bot: true,
    vpn: true,
    tor: true,
    dch: true,
    decision: true,
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter with date range selection and traffic attribution
  const filtered = useMemo(() => {
    const now = new Date();

    return classifications.filter((c) => {
      const isHuman = c.visitorType === "Human";
      const isChallenged = !isHuman && (c.detectionMethod?.includes("Rate") || c.detectionMethod?.includes("Tor") || c.detectionMethod?.includes("Proxy"));

      if (filterType === "allowed" && !isHuman) return false;
      if (filterType === "challenged" && !isChallenged) return false;
      if (filterType === "blocked" && (isHuman || isChallenged)) return false;

      const isSpoofed = Boolean(
        c.trafficType === "spoofed_ad_bot" ||
        c.adTraffic?.isSpoofed ||
        (c.detectionMethod || "").toLowerCase().includes("spoofed ad") ||
        (c.detectionMethod || "").toLowerCase().includes("impersonation")
      );
      const isReviewer = Boolean(
        c.trafficType === "ad_reviewer" ||
        c.isVerifiedReviewer || 
        c.adTraffic?.isVerifiedReviewer ||
        (c.detectionMethod || "").toLowerCase().includes("verified ad compliance") ||
        (c.detectionMethod || "").toLowerCase().includes("ad reviewer") ||
        (c.detectionMethod || "").toLowerCase().includes("ad compliance")
      );
      const isPaid = Boolean(
        c.trafficType === "ad_click" ||
        c.adNetwork || 
        c.clickToken || 
        c.clickId || 
        c.adTraffic?.isAdClick ||
        c.gclid || 
        c.fbclid || 
        c.ttclid || 
        c.msclkid || 
        c.twclid ||
        (c.detectionMethod || "").toLowerCase().includes("ad campaign")
      );
      const isOrganic = isHuman && !isPaid && !isReviewer;

      if (trafficFilter === "paid" && !isPaid) return false;
      if (trafficFilter === "organic" && !isOrganic) return false;
      if (trafficFilter === "reviewer" && !isReviewer) return false;
      if (trafficFilter === "spoofed" && !isSpoofed) return false;

      // Date Filtering
      if (c.timestamp) {
        const itemDate = new Date(c.timestamp);
        if (dateRangePreset === "today") {
          if (!isToday(itemDate)) return false;
        } else if (dateRangePreset === "24h") {
          const cutOff = subHours(now, 24);
          if (itemDate < cutOff) return false;
        } else if (dateRangePreset === "7d") {
          const cutOff = subDays(now, 7);
          if (itemDate < cutOff) return false;
        } else if (dateRangePreset === "30d") {
          const cutOff = subDays(now, 30);
          if (itemDate < cutOff) return false;
        } else if (dateRangePreset === "custom" && customDate) {
          const itemDay = format(itemDate, "yyyy-MM-dd");
          if (itemDay !== customDate) return false;
        }
      }

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const devId = (c.deviceId || "").toLowerCase();
      const visId = (c.visitorId || "").toLowerCase();
      return (
        devId.includes(term) ||
        visId.includes(term) ||
        (c.isp && c.isp.toLowerCase().includes(term)) ||
        (c.ip && c.ip.toLowerCase().includes(term)) ||
        (c.ipAddress && c.ipAddress.toLowerCase().includes(term)) ||
        (c.country && c.country.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term)) ||
        (c.browser && c.browser.toLowerCase().includes(term)) ||
        (c.os && c.os.toLowerCase().includes(term)) ||
        (c.detectionMethod && c.detectionMethod.toLowerCase().includes(term)) ||
        (c.visitorType && c.visitorType.toLowerCase().includes(term)) ||
        (c.adNetwork && c.adNetwork.toLowerCase().includes(term)) ||
        (c.clickToken && c.clickToken.toLowerCase().includes(term)) ||
        (c.clickId && c.clickId.toLowerCase().includes(term)) ||
        (c.reviewerPlatform && c.reviewerPlatform.toLowerCase().includes(term))
      );
    });
  }, [classifications, filterType, trafficFilter, searchTerm, dateRangePreset, customDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const handleExportCsv = () => {
    if (!filtered || filtered.length === 0) return;

    const headers = [
      "Device ID",
      "Visitor ID",
      "Timestamp",
      "IP Address",
      "Visitor Type",
      "Traffic Attribution",
      "Ad Network",
      "Click Token",
      "Click ID",
      "Verified Ad Bot",
      "Reviewer Platform",
      "Threat Score",
      "ASN",
      "Carrier / ISP",
      "Network Class",
      "Detection Method",
      "Device Type",
      "Browser",
      "Operating System",
      "Country Code",
      "Country",
      "City",
      "Action Taken"
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map((item) => {
      const threat = computeThreatScore(item);
      const asnInfo = formatAsnDisplay(item);
      const net = getNetworkClassification(item);
      const timeStr = item.timestamp ? new Date(item.timestamp).toISOString() : "";
      const ipStr = item.ip || item.ipAddress || "";
      const resolvedDeviceId = item.deviceId || `dev_srv_${(item.id || ipStr).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
      const resolvedVisitorId = item.visitorId || `vis_${(resolvedDeviceId.replace(/^dev_(hw_|srv_)?/, "") || item.id || ipStr).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
      
      const isSpoofed = Boolean(
        item.trafficType === "spoofed_ad_bot" ||
        item.adTraffic?.isSpoofed ||
        (item.detectionMethod || "").toLowerCase().includes("spoofed ad")
      );
      const isReviewer = Boolean(
        item.trafficType === "ad_reviewer" ||
        item.isVerifiedReviewer || 
        item.adTraffic?.isVerifiedReviewer
      );
      const isPaid = Boolean(
        item.trafficType === "ad_click" ||
        item.adNetwork || 
        item.clickToken || 
        item.adTraffic?.isAdClick
      );
      const attributionType = isSpoofed 
        ? "Spoofed Ad Crawler" 
        : isReviewer 
        ? "Verified Ad Reviewer" 
        : isPaid 
        ? "Paid Ad Click" 
        : (item.visitorType === "Human" ? "Organic Human" : "Bot Traffic");

      return [
        escapeCsv(resolvedDeviceId),
        escapeCsv(resolvedVisitorId),
        escapeCsv(timeStr),
        escapeCsv(ipStr),
        escapeCsv(item.visitorType || ""),
        escapeCsv(attributionType),
        escapeCsv(item.adNetwork || item.adTraffic?.platformName || ""),
        escapeCsv(item.clickToken || item.adTraffic?.clickToken || ""),
        escapeCsv(item.clickId || item.adTraffic?.clickId || ""),
        escapeCsv(item.isVerifiedReviewer || item.adTraffic?.isVerifiedReviewer ? "Yes" : "No"),
        escapeCsv(item.reviewerPlatform || item.adTraffic?.reviewerPlatform || ""),
        escapeCsv(threat.score),
        escapeCsv(asnInfo.asnBadge),
        escapeCsv(item.isp || ""),
        escapeCsv(net.label),
        escapeCsv(item.detectionMethod || ""),
        escapeCsv(item.deviceType || ""),
        escapeCsv(item.browser || ""),
        escapeCsv(item.os || ""),
        escapeCsv(item.countryCode || ""),
        escapeCsv(item.country || ""),
        escapeCsv(item.city || ""),
        escapeCsv(item.action || (item.visitorType === "Human" ? "Allowed" : "Blocked"))
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `cleantraffic-audit-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {/* 1. Header Toolbar matching reference design: Title, Subtitle, and Export Button */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#0A5C48]" />
              Visitor Logs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a row for details. Telemetry and forensic events are recorded in real time.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export CSV Button (clean outlined button matching reference design, no copy link) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!filtered || filtered.length === 0}
              className="h-8.5 text-xs px-3 font-semibold text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg gap-1.5 shadow-2xs"
              title="Export events as CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* 2. Controls Toolbar with clean [Filters] and [Today] popovers */}
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* [ Filters ] Button with Dropdown Modal */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => {
                  setFilterDropdownOpen(!filterDropdownOpen);
                  setDateDropdownOpen(false);
                  setDisplayDropdownOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all ${
                  filterDropdownOpen || searchTerm || filterType !== "all" || trafficFilter !== "all"
                    ? "border-slate-400 bg-white text-slate-900 ring-2 ring-slate-200/50"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <span>Filters</span>
                {(searchTerm || filterType !== "all" || trafficFilter !== "all") && (
                  <span className="w-2 h-2 rounded-full bg-[#0A5C48]" />
                )}
              </button>

              {/* Filter Dropdown Modal with Header, Close & Cancel */}
              {filterDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-3 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Filters</span>
                    <button
                      type="button"
                      onClick={() => setFilterDropdownOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                      title="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      placeholder="Filter by IP, Device ID, ASN..."
                      className="pl-8 text-xs h-8 bg-slate-50 border-slate-200 text-slate-900 rounded-lg placeholder:text-slate-400"
                    />
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Traffic Attribution
                    </div>
                    {(
                      [
                        { id: "all", label: "All Sources" },
                        { id: "paid", label: "🎯 Paid Ads Only" },
                        { id: "organic", label: "🌿 Organic Only" },
                        { id: "reviewer", label: "🛡️ Ad Reviewer Bots" },
                        { id: "spoofed", label: "🚨 Spoofed Crawlers" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setTrafficFilter(opt.id); setCurrentPage(1); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between ${
                          trafficFilter === opt.id ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {trafficFilter === opt.id && <Check className="h-3.5 w-3.5 text-[#0A5C48]" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Decision Verdict
                    </div>
                    {(
                      [
                        { id: "all", label: "All Decisions" },
                        { id: "allowed", label: "Allowed Only" },
                        { id: "challenged", label: "Challenged Only" },
                        { id: "blocked", label: "Blocked Only" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setFilterType(opt.id); setCurrentPage(1); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between ${
                          filterType === opt.id ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {filterType === opt.id && <Check className="h-3.5 w-3.5 text-[#0A5C48]" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {(searchTerm || filterType !== "all" || trafficFilter !== "all") ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterType("all");
                          setTrafficFilter("all");
                          setCurrentPage(1);
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Reset All
                      </button>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => setFilterDropdownOpen(false)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* [ Today ] Date Button with Dropdown */}
            <div className="relative" ref={dateRef}>
              <button
                type="button"
                onClick={() => {
                  setDateDropdownOpen(!dateDropdownOpen);
                  setFilterDropdownOpen(false);
                  setDisplayDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  {dateRangePreset === "today"
                    ? "Today"
                    : dateRangePreset === "24h"
                    ? "24 Hours"
                    : dateRangePreset === "7d"
                    ? "7 Days"
                    : dateRangePreset === "30d"
                    ? "30 Days"
                    : dateRangePreset === "custom"
                    ? customDate || "Custom Date"
                    : "All Time"}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {dateDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-2 space-y-1">
                  <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 mb-1">
                    <span className="text-xs font-bold text-slate-900">Date Range</span>
                    <button
                      type="button"
                      onClick={() => setDateDropdownOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                      title="Close"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {(
                    [
                      { id: "all", label: "All Time" },
                      { id: "today", label: "Today" },
                      { id: "24h", label: "Past 24 Hours" },
                      { id: "7d", label: "Past 7 Days" },
                      { id: "30d", label: "Past 30 Days" },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setDateRangePreset(preset.id);
                        setCustomDate("");
                        setCurrentPage(1);
                        setDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between ${
                        dateRangePreset === preset.id ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>{preset.label}</span>
                      {dateRangePreset === preset.id && <Check className="h-3.5 w-3.5 text-[#0A5C48]" />}
                    </button>
                  ))}

                  <div className="pt-1 border-t border-slate-100 px-1">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">Custom Date</span>
                    <Input
                      type="date"
                      value={customDate}
                      onChange={(e) => {
                        setCustomDate(e.target.value);
                        if (e.target.value) {
                          setDateRangePreset("custom");
                          setCurrentPage(1);
                          setDateDropdownOpen(false);
                        }
                      }}
                      className="h-7 text-xs px-2 py-0.5 bg-slate-50 border-slate-200 text-slate-700 rounded-md font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-44 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search IP, Device ID, ASN..."
              className="pl-8 text-xs h-8 bg-white border-slate-200 text-slate-900 rounded-lg placeholder:text-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {/* 3. Sub-Bar: Events Matching Counter & [ Display ] Column Picker (Matching Screenshot 2 & 3) */}
        <div className="px-4 py-2.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-700 font-medium">
              <strong className="text-slate-900 font-bold">{filtered.length}</strong> event{filtered.length === 1 ? "" : "s"} matching
            </span>
            {trafficFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                <span>
                  {trafficFilter === "paid" ? "🎯 Paid Ads" : trafficFilter === "organic" ? "🌿 Organic" : trafficFilter === "reviewer" ? "🛡️ Reviewers" : "🚨 Spoofed"}
                </span>
                <button
                  type="button"
                  onClick={() => { setTrafficFilter("all"); setCurrentPage(1); }}
                  className="hover:text-rose-600 ml-0.5"
                  title="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterType !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                <span className="capitalize">{filterType} Only</span>
                <button
                  type="button"
                  onClick={() => { setFilterType("all"); setCurrentPage(1); }}
                  className="hover:text-rose-600 ml-0.5"
                  title="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                <span>Search: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
                  className="hover:text-rose-600 ml-0.5"
                  title="Remove search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {/* [ Display ] Column Customization Dropdown (Screenshot 3: 130738.png) */}
          <div className="relative" ref={displayRef}>
            <button
              type="button"
              onClick={() => {
                setDisplayDropdownOpen(!displayDropdownOpen);
                setFilterDropdownOpen(false);
                setDateDropdownOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Display</span>
            </button>

            {displayDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-2.5 space-y-1 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 mb-1">
                  <span className="text-xs font-bold text-slate-900">Toggle Columns</span>
                  <button
                    type="button"
                    onClick={() => setDisplayDropdownOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                    title="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {[
                  { key: "deviceId", label: "Device ID" },
                  { key: "date", label: "Date" },
                  { key: "visitorId", label: "Visitor ID" },
                  { key: "ipAddress", label: "IP Address" },
                  { key: "browser", label: "Browser" },
                  { key: "os", label: "OS" },
                  { key: "suspectScore", label: "Suspect Score" },
                  { key: "ipBlocklist", label: "IP Blocklist" },
                  { key: "residentialProxy", label: "Residential Proxy" },
                  { key: "bot", label: "Bot" },
                  { key: "vpn", label: "VPN" },
                  { key: "tor", label: "Tor" },
                  { key: "dch", label: "DCH" },
                  { key: "decision", label: "Decision & Attribution" },
                ].map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key as any)}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between text-slate-700 hover:bg-slate-50"
                  >
                    <span>{col.label}</span>
                    {visibleColumns[col.key as keyof typeof visibleColumns] && (
                      <Check className="h-3.5 w-3.5 text-[#0A5C48]" />
                    )}
                  </button>
                ))}

                <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setDisplayDropdownOpen(false)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Forensic Telemetry Logs Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[1240px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold text-slate-500 bg-[#F8FAFC]">
                {visibleColumns.deviceId && <th className="py-3 px-4 whitespace-nowrap">DEVICE ID</th>}
                {visibleColumns.date && <th className="py-3 px-4 whitespace-nowrap">DATE</th>}
                {visibleColumns.visitorId && <th className="py-3 px-4 whitespace-nowrap">VISITOR ID</th>}
                {visibleColumns.ipAddress && <th className="py-3 px-4 whitespace-nowrap">IP ADDRESS</th>}
                {visibleColumns.browser && <th className="py-3 px-4 whitespace-nowrap">BROWSER</th>}
                {visibleColumns.os && <th className="py-3 px-4 whitespace-nowrap">OS</th>}
                {visibleColumns.suspectScore && <th className="py-3 px-4 whitespace-nowrap">SUSPECT SCORE</th>}
                {visibleColumns.ipBlocklist && <th className="py-3 px-4 whitespace-nowrap">IP BLOCKLIST</th>}
                {visibleColumns.residentialProxy && <th className="py-3 px-4 whitespace-nowrap">RESIDENTIAL PROXY</th>}
                {visibleColumns.bot && <th className="py-3 px-4 whitespace-nowrap">BOT</th>}
                {visibleColumns.vpn && <th className="py-3 px-4 whitespace-nowrap">VPN</th>}
                {visibleColumns.tor && <th className="py-3 px-4 whitespace-nowrap">TOR</th>}
                {visibleColumns.dch && <th className="py-3 px-4 whitespace-nowrap">DCH</th>}
                {visibleColumns.decision && <th className="py-3 px-4 whitespace-nowrap text-right">DECISION & ATTRIBUTION</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((c, i) => {
                const isHuman = c.visitorType === "Human";
                const methodStr = (c.detectionMethod || "").toLowerCase();
                const connTypeStr = (c.connectionType || "").toLowerCase();
                const usageType = (c.usageType || "").toUpperCase();

                const isIpBlocklist = Boolean(
                  c.isBlocklisted ||
                  methodStr.includes("blocklist") ||
                  methodStr.includes("cidr")
                );

                const isResProxy = Boolean(
                  c.isResidentialProxy ||
                  (c.clientSignals as any)?.isResidentialProxy ||
                  (c.clientSignals as any)?.proxyData?.is_residential_proxy ||
                  methodStr.includes("residential proxy") ||
                  methodStr.includes("scraping pool") ||
                  connTypeStr.includes("residential proxy") ||
                  connTypeStr.includes("proxy anonymizer") ||
                  (connTypeStr.includes("proxy") && !connTypeStr.includes("vpn")) ||
                  (methodStr.includes("proxy") && !methodStr.includes("vpn"))
                );

                const isAiBot = Boolean(
                  methodStr.includes("ai scraper") ||
                  methodStr.includes("ai crawler") ||
                  methodStr.includes("gptbot") ||
                  methodStr.includes("claudebot") ||
                  methodStr.includes("bytespider")
                );

                const isGoodBot = Boolean(
                  methodStr.includes("search indexer") ||
                  methodStr.includes("googlebot") ||
                  methodStr.includes("bingbot") ||
                  methodStr.includes("crawler (allowed)") ||
                  methodStr.includes("seo")
                );

                const isBadBot = !isGoodBot && Boolean(
                  !isHuman ||
                  c.action === "Blocked" ||
                  methodStr.includes("crawler") ||
                  methodStr.includes("scraper") ||
                  methodStr.includes("bot signature") ||
                  methodStr.includes("synthetic") ||
                  methodStr.includes("headless") ||
                  methodStr.includes("botnet") ||
                  methodStr.includes("scanner")
                );

                const isVpn = Boolean(
                  c.isVpn ||
                  (c.clientSignals as any)?.isVpn ||
                  (c.clientSignals as any)?.proxyData?.is_vpn ||
                  usageType === "VPN" ||
                  methodStr.includes("vpn") ||
                  connTypeStr.includes("vpn")
                );

                const isTor = Boolean(
                  c.isTor ||
                  (c.clientSignals as any)?.isTor ||
                  (c.clientSignals as any)?.proxyData?.is_tor ||
                  usageType === "TOR" ||
                  methodStr.includes("tor") ||
                  connTypeStr.includes("tor")
                );

                const isDch = Boolean(
                  c.isDatacenter ||
                  (c.clientSignals as any)?.isDatacenter ||
                  (c.clientSignals as any)?.proxyData?.is_data_center ||
                  usageType === "DCH" ||
                  methodStr.includes("datacenter") ||
                  methodStr.includes("dch") ||
                  methodStr.includes("cloud") ||
                  connTypeStr.includes("datacenter") ||
                  connTypeStr.includes("dch") ||
                  connTypeStr.includes("cloud")
                );

                const isPolicyFilter = !isHuman && Boolean(
                  methodStr.includes("device restricted") ||
                  methodStr.includes("os restricted") ||
                  methodStr.includes("geo") ||
                  methodStr.includes("country")
                );

                const isChallenged = !isHuman && !isPolicyFilter && Boolean(
                  methodStr.includes("rate") ||
                  methodStr.includes("tor") ||
                  methodStr.includes("proxy") ||
                  methodStr.includes("vpn")
                );

                const isSpoofed = Boolean(
                  c.trafficType === "spoofed_ad_bot" ||
                  c.adTraffic?.isSpoofed ||
                  methodStr.includes("spoofed ad") ||
                  methodStr.includes("impersonation")
                );

                const isReviewer = Boolean(
                  c.trafficType === "ad_reviewer" ||
                  c.isVerifiedReviewer ||
                  c.adTraffic?.isVerifiedReviewer ||
                  methodStr.includes("verified ad compliance") ||
                  methodStr.includes("ad reviewer") ||
                  methodStr.includes("ad compliance")
                );

                const isPaid = Boolean(
                  c.trafficType === "ad_click" ||
                  c.adNetwork ||
                  c.clickToken ||
                  c.adTraffic?.isAdClick ||
                  c.gclid ||
                  c.fbclid ||
                  c.ttclid ||
                  c.msclkid ||
                  c.twclid ||
                  methodStr.includes("ad campaign")
                );

                const flag = getCountryFlag(c.countryCode);
                const ipStr = c.ip || c.ipAddress || "—";
                const threat = computeThreatScore(c);
                const asnInfo = formatAsnDisplay(c);
                const ispDisplayName = c.isp && c.isp !== "Filtered by Rule" && c.isp !== "Unknown"
                  ? c.isp
                  : isPolicyFilter
                  ? (c.deviceType ? `${c.deviceType} Filter` : "Policy Filtered")
                  : isHuman
                  ? "Residential Broadband"
                  : "Unresolved Carrier";

                const resolvedDeviceId = c.deviceId || `dev_srv_${(c.id || ipStr).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
                const resolvedVisitorId = c.visitorId || `vis_${(resolvedDeviceId.replace(/^dev_(hw_|srv_)?/, "") || c.id || ipStr).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;

                // Suspect Score: 0 - 100 integer score (e.g. 6 for clean human, 78 for proxy, 97 for headless bot)
                const suspectScoreValue = Math.round(threat.score);

                // Forensic OS & Browser Resolution
                const osInfo = getVisitorOS(c);
                const browserInfo = getVisitorBrowser(c);

                // Ad token name
                const adClickToken = c.clickToken || (c.fbclid ? "fbclid" : c.gclid ? "gclid" : c.ttclid ? "ttclid" : c.msclkid ? "msclkid" : null);

                return (
                  <tr
                    key={c.id || i}
                    onClick={() => setSelectedVisitor(c)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {/* 1. Device ID (with 1-click copy) */}
                    {visibleColumns.deviceId && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 group/ev">
                          <span className="font-mono text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            {resolvedDeviceId.length > 15 ? `${resolvedDeviceId.slice(0, 15)}…` : resolvedDeviceId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(resolvedDeviceId, `dev-${c.id || i}`, e)}
                            className="opacity-0 group-hover/ev:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity rounded hover:bg-slate-200/50"
                            title="Copy Device ID"
                          >
                            {copiedId === `dev-${c.id || i}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}

                    {/* 2. Date */}
                    {visibleColumns.date && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-800">
                          {c.timestamp ? format(new Date(c.timestamp), "MMM dd, HH:mm:ss") : "Today, 00:00:00"}
                        </div>
                      </td>
                    )}

                    {/* 3. Visitor ID (with 1-click copy) */}
                    {visibleColumns.visitorId && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 group/vis">
                          <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 font-semibold">
                            {resolvedVisitorId.length > 15 ? `${resolvedVisitorId.slice(0, 15)}…` : resolvedVisitorId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(resolvedVisitorId, `vis-${c.id || i}`, e)}
                            className="opacity-0 group-hover/vis:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity rounded hover:bg-slate-200/50"
                            title="Copy Visitor ID"
                          >
                            {copiedId === `vis-${c.id || i}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}

                    {/* 4. IP Address & Network */}
                    {visibleColumns.ipAddress && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                          <span className="text-base leading-none">{flag}</span>
                          <span>{ipStr}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5" title={`${asnInfo.asnBadge} • ${ispDisplayName}`}>
                          {asnInfo.asnBadge ? `${asnInfo.asnBadge} • ` : ""}{ispDisplayName}
                        </div>
                      </td>
                    )}

                    {/* 5. Browser with genuine logo */}
                    {visibleColumns.browser && (
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <BrowserIcon type={browserInfo.type} />
                          <span className="text-xs font-medium text-slate-800">
                            {browserInfo.name}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* 6. OS with genuine Windows/Apple/Android logo */}
                    {visibleColumns.os && (
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <OsIcon type={osInfo.type} />
                          <span className="text-xs font-medium text-slate-800">
                            {osInfo.name}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* 7. Suspect Score (0 - 100) with colored dot */}
                    {visibleColumns.suspectScore && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-mono font-bold bg-white shadow-2xs">
                          <span className={`w-1.5 h-1.5 rounded-full ${threat.dotClass}`} />
                          <span className="text-slate-900">{suspectScoreValue}</span>
                        </div>
                      </td>
                    )}

                    {/* 8. IP Blocklist */}
                    {visibleColumns.ipBlocklist && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isIpBlocklist ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-xs">No</span>
                        )}
                      </td>
                    )}

                    {/* 9. Residential Proxy */}
                    {visibleColumns.residentialProxy && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isResProxy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-xs">No</span>
                        )}
                      </td>
                    )}

                    {/* 10. Bot */}
                    {visibleColumns.bot && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {(!isHuman || isBadBot || isAiBot) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-xs">No</span>
                        )}
                      </td>
                    )}

                    {/* 11. VPN */}
                    {visibleColumns.vpn && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isVpn ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-xs">No</span>
                        )}
                      </td>
                    )}

                    {/* 12. Tor */}
                    {visibleColumns.tor && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isTor ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-xs">No</span>
                        )}
                      </td>
                    )}

                    {/* 13. DCH */}
                    {visibleColumns.dch && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isDch ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            DCH
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-xs">No</span>
                        )}
                      </td>
                    )}

                    {/* 14. Decision & Attribution */}
                    {visibleColumns.decision && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isPaid && adClickToken && (
                            <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                              {adClickToken}
                            </span>
                          )}
                          {isSpoofed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Spoofed Bot
                            </span>
                          ) : isReviewer ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              Reviewer
                            </span>
                          ) : isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              Paid Allowed
                            </span>
                          ) : (isHuman && c.action !== "Blocked" && !isPolicyFilter) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Allowed (Organic)
                            </span>
                          ) : isChallenged ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              Challenged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Blocked
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-bold text-slate-900">No logs found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try altering your search query or filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Footer Pagination (Matching Screenshot 2: Show [20 v] selector and 1-4 of 4 events) */}
        <div className="p-3 sm:p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 text-slate-800 rounded-md px-2 py-1 text-xs font-semibold shadow-2xs focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              {filtered.length > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filtered.length)} of ${filtered.length} events` : "0 events"}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs"
                title="Previous page"
              >
                &lt;
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs"
                title="Next page"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visitor Details Drawer */}
      <VisitorDetailsDrawer
        visitor={selectedVisitor}
        onClose={() => setSelectedVisitor(null)}
        humanUrl={humanUrl}
        botUrl={botUrl}
      />
    </div>
  );
}
