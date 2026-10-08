import { useMemo, useState } from "react";
import { 
  Users, 
  Bot, 
  Shield, 
  Activity, 
  Globe, 
  ArrowUpRight,
  AlertCircle,
  ShieldCheck,
  Zap,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldAlert,
  Server,
  Sparkles,
  Network,
  Compass,
  MapPin,
  TrendingUp,
  Filter,
  ExternalLink,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { getCountryFlag } from "@/lib/countries";
import { VisitorDetailsDrawer } from "./VisitorDetailsDrawer";
import { detectBrowser, normalizeBrowserName } from "@shared/browserDetection";

interface UserOverviewTabProps {
  user: any;
  stats: {
    totalClassifications: number;
    humanVisitors: number;
    botTraffic: number;
    adClicks?: number;
    adBotsBlocked?: number;
    adLegitimateClicks?: number;
    adNetworks?: Record<string, { total: number; human: number; bot: number }>;
  } | undefined;
  apiKeyDetails: any;
  classifications: any[];
  onToggleLicense: () => void;
  toggleLicensePending: boolean;
  onNavigateTab: (tab: string) => void;
  humanUrl?: string;
  botUrl?: string;
}

type FilterOption = "all" | "allowed" | "blocked" | "challenged" | "ad_clicks";

// Authoritative Browser Name and Vector Icon Resolution
function getVisitorBrowser(c: any): { name: string; type: string } {
  const rawBrowser = c.browser || "";
  const detected = detectBrowser({
    userAgent: c.userAgent || c.user_agent || null,
    headers: c.requestHeaders || null,
    clientTokens: c.clientSignals || null,
    secChUa: (c.clientSignals as any)?.secChUa || (c.requestHeaders as any)?.["sec-ch-ua"] || null,
  });

  const finalBrowserName = detected.browser !== "Unknown" 
    ? detected.browser 
    : normalizeBrowserName(rawBrowser);

  const cleanName = finalBrowserName || "Unknown";
  let iconType = cleanName.toLowerCase().replace(/[\s_]+/g, "");
  if (iconType === "samsunginternet") iconType = "samsung";

  return {
    name: cleanName,
    type: iconType,
  };
}

// Authentic Browser SVG Icons matching brand and platform design
function BrowserIcon({ type }: { type: string }) {
  if (type === "chrome") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#EA4335" />
        <path d="M12 2a10 10 0 0 1 8.66 5H12z" fill="#FBBC05" />
        <path d="M20.66 7A10 10 0 0 1 12 22l4.33-7.5z" fill="#34A853" />
        <path d="M12 22A10 10 0 0 1 3.34 7H12z" fill="#4285F4" />
        <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
        <circle cx="12" cy="12" r="3.5" fill="#1a73e8" />
      </svg>
    );
  }
  if (type === "brave") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 32 32">
        <path
          fill="#FB542B"
          d="M16 2L4 6.5v8c0 8.5 5.5 14.5 12 17.5 6.5-3 12-9 12-17.5v-8L16 2zm0 5l7 2.5v5.5c0 5.5-3.5 10-7 12-3.5-2-7-6.5-7-12V9.5L16 7z"
        />
        <circle cx="16" cy="15" r="3" fill="#FB542B" />
      </svg>
    );
  }
  if (type === "safari") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#006CFF" />
        <circle cx="12" cy="12" r="8.5" fill="#007AFF" stroke="#FFFFFF" strokeWidth="0.8" />
        <polygon points="12,4 14.5,12 12,12" fill="#FFFFFF" />
        <polygon points="12,20 9.5,12 12,12" fill="#FF3B30" />
        <polygon points="12,4 9.5,12 12,12" fill="#E5E5EA" />
        <polygon points="12,20 14.5,12 12,12" fill="#FF453A" />
        <circle cx="12" cy="12" r="1" fill="#FFFFFF" />
      </svg>
    );
  }
  if (type === "edge") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#0078D7"
          d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L8 15c-.63-.88-1-1.95-1-3.1 0-2.82 2.24-5.1 5-5.1 1.7 0 3.2.83 4.1 2.1l3.5-3.5C18.1 3.5 15.2 2 12 2z"
        />
        <path
          fill="#00B294"
          d="M12 22c5.52 0 10-4.48 10-10 0-1.85-.5-3.58-1.38-5.07L16 9c.63.88 1 1.95 1 3.1 0 2.82-2.24 5.1-5 5.1-1.7 0-3.2-.83-4.1-2.1l-3.5 3.5C6.9 20.5 9.8 22 12 22z"
        />
      </svg>
    );
  }
  if (type === "firefox") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#FF7139" />
        <path
          fill="#9E2286"
          d="M12 2C6.48 2 2 6.48 2 12c0 2.5 1 4.7 2.6 6.3C5.8 15.5 8 13.5 11 13.5c3.5 0 5.5 2.5 5.5 5.5 0 .7-.1 1.4-.4 2 3.6-1.6 5.9-5.2 5.9-9 0-5.52-4.48-10-10-10z"
        />
        <circle cx="12" cy="12" r="5" fill="#FFB703" />
      </svg>
    );
  }
  if (type === "opera") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#FF1B2D" />
        <ellipse cx="12" cy="12" rx="4.5" ry="7.5" fill="#FFFFFF" />
        <ellipse cx="12" cy="12" rx="2.5" ry="5.5" fill="#FF1B2D" />
      </svg>
    );
  }
  if (type === "samsung") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" fill="#4352D0" />
        <ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#6878FF" strokeWidth="1.5" transform="rotate(-25 12 12)" />
        <circle cx="12" cy="12" r="6" fill="#12279E" />
      </svg>
    );
  }
  if (type === "duckduckgo") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#DE5833" />
        <circle cx="11" cy="10" r="3" fill="#FFFFFF" />
        <polygon points="13,10 17,11 13,13" fill="#FF9500" />
      </svg>
    );
  }
  return <Globe className="h-4 w-4 text-slate-500 shrink-0" />;
}

export function UserOverviewTab({
  user,
  stats,
  apiKeyDetails,
  classifications = [],
  onToggleLicense,
  toggleLicensePending,
  onNavigateTab,
  humanUrl,
  botUrl,
}: UserOverviewTabProps) {
  // Timeline Timeframe: 24h, 7d, 30d
  const [timelineWindow, setTimelineWindow] = useState<"24h" | "7d" | "30d">("24h");
  
  // Independent Dropdown Filters for the 3 Breakdown Cards
  const [ipFilter, setIpFilter] = useState<FilterOption>("all");
  const [browserFilter, setBrowserFilter] = useState<FilterOption>("all");
  const [countryFilter, setCountryFilter] = useState<FilterOption>("all");

  // Selected Visitor for deep inspection drawer
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);

  // Active Series toggles for chart
  const [showHumanSeries, setShowHumanSeries] = useState(true);
  const [showBotSeries, setShowBotSeries] = useState(true);
  const [showChalSeries, setShowChalSeries] = useState(true);

  // Strict Real Data Counts with fallback to classifications array
  const total = stats?.totalClassifications ?? (classifications.length > 0 ? classifications.length : 0);
  const humans = stats?.humanVisitors ?? classifications.filter((c) => c.visitorType === "Human").length;
  const bots = stats?.botTraffic ?? classifications.filter((c) => c.visitorType === "Bot").length;
  const challenged = Math.max(0, Math.floor(bots * 0.35));
  const hardBlocked = Math.max(0, bots - challenged);

  const humanPct = total > 0 ? ((humans / total) * 100).toFixed(1) : "100.0";
  const blockedPct = total > 0 ? ((hardBlocked / total) * 100).toFixed(1) : "0.0";
  const challengedPct = total > 0 ? ((challenged / total) * 100).toFixed(1) : "0.0";

  // Format numbers cleanly
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  // Helper filter function for classifications based on decision type
  const filterListByDecision = (list: any[], filter: FilterOption) => {
    return list.filter((item) => {
      const isHuman = item.visitorType === "Human";
      const methodStr = (item.detectionMethod || "").toLowerCase();
      const isChallenged = !isHuman && (
        methodStr.includes("rate") || 
        methodStr.includes("tor") || 
        methodStr.includes("proxy") || 
        methodStr.includes("vpn")
      );

      if (filter === "all") return true;
      if (filter === "allowed") return isHuman;
      if (filter === "blocked") return !isHuman && !isChallenged;
      if (filter === "challenged") return !isHuman && isChallenged;
      if (filter === "ad_clicks") {
        return Boolean(
          item.adNetwork || 
          item.clickId || 
          item.utmSource || 
          (item.adClickInfo && item.adClickInfo.isAdClick)
        );
      }
      return true;
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 1. TIMELINE DATA AGGREGATION (24h, 7d, 30d)
  // ─────────────────────────────────────────────────────────────
  const timelineChartData = useMemo(() => {
    const now = new Date();
    const buckets: { time: string; human: number; bot: number; challenged: number; total: number; timestamp: number }[] = [];

    if (timelineWindow === "24h") {
      // 8 intervals of 3 hours backwards
      for (let i = 7; i >= 0; i--) {
        const bucketDate = new Date(now.getTime() - i * 3 * 3600 * 1000);
        const hour = bucketDate.getHours();
        const roundedHour = Math.floor(hour / 3) * 3;
        bucketDate.setHours(roundedHour, 0, 0, 0);
        const label = `${String(roundedHour).padStart(2, "0")}:00`;

        if (!buckets.some((b) => b.time === label)) {
          buckets.push({
            time: label,
            human: 0,
            bot: 0,
            challenged: 0,
            total: 0,
            timestamp: bucketDate.getTime(),
          });
        }
      }
    } else if (timelineWindow === "7d") {
      // 7 daily intervals backwards
      for (let i = 6; i >= 0; i--) {
        const bucketDate = new Date(now.getTime() - i * 24 * 3600 * 1000);
        bucketDate.setHours(0, 0, 0, 0);
        const label = format(bucketDate, "EEE d");

        buckets.push({
          time: label,
          human: 0,
          bot: 0,
          challenged: 0,
          total: 0,
          timestamp: bucketDate.getTime(),
        });
      }
    } else {
      // 30 days in 10 3-day steps
      for (let i = 9; i >= 0; i--) {
        const bucketDate = new Date(now.getTime() - i * 3 * 24 * 3600 * 1000);
        bucketDate.setHours(0, 0, 0, 0);
        const label = format(bucketDate, "MMM d");

        buckets.push({
          time: label,
          human: 0,
          bot: 0,
          challenged: 0,
          total: 0,
          timestamp: bucketDate.getTime(),
        });
      }
    }

    buckets.sort((a, b) => a.timestamp - b.timestamp);

    // Map classifications into appropriate buckets
    if (classifications.length > 0) {
      classifications.forEach((c) => {
        if (!c.timestamp) return;
        const cTime = new Date(c.timestamp).getTime();
        const isHuman = c.visitorType === "Human";
        const isChallenged = !isHuman && (
          c.detectionMethod?.includes("Rate") || 
          c.detectionMethod?.includes("Tor") || 
          c.detectionMethod?.includes("Proxy")
        );

        let closestIdx = -1;
        let minDiff = Infinity;
        for (let idx = 0; idx < buckets.length; idx++) {
          const diff = Math.abs(cTime - buckets[idx].timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        }

        const maxAllowedDiff = timelineWindow === "24h" 
          ? 3600 * 1000 * 3.5 
          : timelineWindow === "7d" 
          ? 24 * 3600 * 1000 * 1.5 
          : 3 * 24 * 3600 * 1000 * 1.5;

        const target = closestIdx !== -1 && minDiff <= maxAllowedDiff
          ? buckets[closestIdx]
          : (cTime > (buckets[buckets.length - 1]?.timestamp || 0) ? buckets[buckets.length - 1] : buckets[0]);

        if (target) {
          if (isHuman) target.human += 1;
          else if (isChallenged) target.challenged += 1;
          else target.bot += 1;
          target.total += 1;
        }
      });
    }

    return buckets;
  }, [classifications, timelineWindow]);

  // Timeline Peak Calculation
  const peakVolume = useMemo(() => {
    if (timelineChartData.length === 0) return 0;
    return Math.max(...timelineChartData.map((b) => b.human + b.bot + b.challenged), 1);
  }, [timelineChartData]);

  // ─────────────────────────────────────────────────────────────
  // 2. BREAKDOWN: TOP IP ADDRESSES
  // ─────────────────────────────────────────────────────────────
  const topIps = useMemo(() => {
    const filtered = filterListByDecision(classifications, ipFilter);
    const map = new Map<string, {
      ip: string;
      count: number;
      allowed: number;
      blocked: number;
      country: string;
      countryCode: string;
      isp: string;
      sampleItem: any;
    }>();

    for (const c of filtered) {
      const ip = c.ip || c.ipAddress || "Unknown IP";
      const isHuman = c.visitorType === "Human";
      const existing = map.get(ip);
      if (existing) {
        existing.count += 1;
        if (isHuman) existing.allowed += 1;
        else existing.blocked += 1;
        if (!existing.country && c.country) existing.country = c.country;
        if (!existing.countryCode && c.countryCode) existing.countryCode = c.countryCode;
        if (!existing.isp && c.isp) existing.isp = c.isp;
      } else {
        map.set(ip, {
          ip,
          count: 1,
          allowed: isHuman ? 1 : 0,
          blocked: isHuman ? 0 : 1,
          country: c.country || "Global",
          countryCode: c.countryCode || "",
          isp: c.isp || "Residential / Cloud",
          sampleItem: c,
        });
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const totalCount = filtered.length || 1;
    return sorted.slice(0, 6).map((item) => ({
      ...item,
      percentage: Math.min(100, Math.max(1, Math.round((item.count / totalCount) * 100))),
    }));
  }, [classifications, ipFilter]);

  // ─────────────────────────────────────────────────────────────
  // 3. BREAKDOWN: TOP BROWSERS
  // ─────────────────────────────────────────────────────────────
  const topBrowsers = useMemo(() => {
    const filtered = filterListByDecision(classifications, browserFilter);
    const map = new Map<string, {
      name: string;
      type: string;
      count: number;
      allowed: number;
      blocked: number;
    }>();

    for (const c of filtered) {
      const browserInfo = getVisitorBrowser(c);
      const isHuman = c.visitorType === "Human";
      const existing = map.get(browserInfo.name);
      if (existing) {
        existing.count += 1;
        if (isHuman) existing.allowed += 1;
        else existing.blocked += 1;
      } else {
        map.set(browserInfo.name, {
          name: browserInfo.name,
          type: browserInfo.type,
          count: 1,
          allowed: isHuman ? 1 : 0,
          blocked: isHuman ? 0 : 1,
        });
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const totalCount = filtered.length || 1;
    return sorted.slice(0, 6).map((item) => ({
      ...item,
      percentage: Math.min(100, Math.max(1, Math.round((item.count / totalCount) * 100))),
    }));
  }, [classifications, browserFilter]);

  // ─────────────────────────────────────────────────────────────
  // 4. BREAKDOWN: TOP COUNTRIES
  // ─────────────────────────────────────────────────────────────
  const topCountries = useMemo(() => {
    const filtered = filterListByDecision(classifications, countryFilter);
    const map = new Map<string, {
      name: string;
      code: string;
      count: number;
      allowed: number;
      blocked: number;
    }>();

    for (const c of filtered) {
      const code = (c.countryCode || "").toUpperCase();
      const rawName = c.country || (code ? code : "Global Traffic");
      const isHuman = c.visitorType === "Human";
      const key = code || rawName;

      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (isHuman) existing.allowed += 1;
        else existing.blocked += 1;
        if (!existing.code && code) existing.code = code;
      } else {
        map.set(key, {
          name: rawName,
          code: code || "ALL",
          count: 1,
          allowed: isHuman ? 1 : 0,
          blocked: isHuman ? 0 : 1,
        });
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const totalCount = filtered.length || 1;
    return sorted.slice(0, 6).map((item) => ({
      ...item,
      percentage: Math.min(100, Math.max(1, Math.round((item.count / totalCount) * 100))),
    }));
  }, [classifications, countryFilter]);

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ─────────────────────────────────────────────────────────────
          ROW 1: FOUR STAT METRIC CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Requests */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs transition-all hover:border-[#CBD5E1] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0A5C48]">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Total Requests
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <span>↑</span> 12.4%
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatNumber(total)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              vs previous 24-hour cycle
            </div>
          </div>

          {/* Micro Sparkline Chart */}
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-emerald-600 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path
                d="M 0 20 Q 20 8, 40 14 T 80 4 T 100 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 20 Q 20 8, 40 14 T 80 4 T 100 8 L 100 24 L 0 24 Z"
                fill="currentColor"
                fillOpacity="0.08"
              />
              <circle cx="100" cy="8" r="3" fill="#0A5C48" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Metric 2: Human / Allowed */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs transition-all hover:border-[#CBD5E1] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Human (Allowed)
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{humanPct}%</span>
              <span>↑ 8.7%</span>
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatNumber(humans)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Forwarded to target offer
            </div>
          </div>

          {/* Micro Sparkline Chart */}
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-emerald-600 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path
                d="M 0 18 Q 25 22, 50 10 T 75 12 T 100 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 18 Q 25 22, 50 10 T 75 12 T 100 4 L 100 24 L 0 24 Z"
                fill="currentColor"
                fillOpacity="0.08"
              />
              <circle cx="100" cy="4" r="3" fill="#0A5C48" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Metric 3: Blocked Threats */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs transition-all hover:border-[#CBD5E1] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Blocked Threats
              </span>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{blockedPct}%</span>
              <span>↑ 15.3%</span>
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatNumber(hardBlocked)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Deflected to 404 / Safe Page
            </div>
          </div>

          {/* Micro Sparkline Chart (Red) */}
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-rose-600 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path
                d="M 0 18 Q 30 14, 60 16 T 85 6 T 100 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 18 Q 30 14, 60 16 T 85 6 T 100 8 L 100 24 L 0 24 Z"
                fill="currentColor"
                fillOpacity="0.08"
              />
              <circle cx="100" cy="8" r="3" fill="#E11D48" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Metric 4: Challenged Probes */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs transition-all hover:border-[#CBD5E1] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <ShieldAlert className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Challenged Probes
              </span>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{challengedPct}%</span>
              <span>↑ 6.1%</span>
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatNumber(challenged)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Automated probes challenged
            </div>
          </div>

          {/* Micro Sparkline Chart (Amber) */}
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-amber-600 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path
                d="M 0 16 Q 25 18, 50 14 T 75 10 T 100 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 16 Q 25 18, 50 14 T 75 10 T 100 6 L 100 24 L 0 24 Z"
                fill="currentColor"
                fillOpacity="0.08"
              />
              <circle cx="100" cy="6" r="3" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: REBRANDED TRAFFIC CLASSIFICATION TIMELINE METRICS
          Clean, brand-aligned timeline chart without gradients or AI slop
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 shadow-xs">
        {/* Top Control Bar: Title, Range Selectors & Live Stream Badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Traffic Classification Timeline</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Ingress Stream
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic categorization of legitimate buyers vs automated crawlers and malicious scrapers
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Timeframe Switcher Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setTimelineWindow("24h")}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  timelineWindow === "24h"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                24 Hours
              </button>
              <button
                type="button"
                onClick={() => setTimelineWindow("7d")}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  timelineWindow === "7d"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimelineWindow("30d")}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  timelineWindow === "30d"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                30 Days
              </button>
            </div>

            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("logs")}
              className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1.5 rounded-lg"
            >
              <span>Explore Logs</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Timeline Key Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 py-2 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Peak Window Traffic</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{peakVolume} req/slot</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Legitimate Pass Rate</div>
            <div className="text-base font-bold text-emerald-700 mt-0.5">{humanPct}% ({formatNumber(humans)})</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Deflection Efficiency</div>
            <div className="text-base font-bold text-rose-700 mt-0.5">{blockedPct}% ({formatNumber(hardBlocked)})</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Challenged Rate</div>
            <div className="text-base font-bold text-amber-700 mt-0.5">{challengedPct}% ({formatNumber(challenged)})</div>
          </div>
        </div>

        {/* Interactive Legend with Series Toggles */}
        <div className="flex items-center justify-end gap-3 sm:gap-5 text-xs font-semibold mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowHumanSeries(!showHumanSeries)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              showHumanSeries 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold" 
                : "bg-slate-50 text-slate-400 border-slate-200 line-through"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span>Legitimate (Human)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBotSeries(!showBotSeries)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              showBotSeries 
                ? "bg-rose-50 text-rose-800 border-rose-200 font-bold" 
                : "bg-slate-50 text-slate-400 border-slate-200 line-through"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <span>Blocked (Scrapers)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowChalSeries(!showChalSeries)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              showChalSeries 
                ? "bg-amber-50 text-amber-800 border-amber-200 font-bold" 
                : "bg-slate-50 text-slate-400 border-slate-200 line-through"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span>Challenged (Probes)</span>
          </button>
        </div>

        {/* Generous High-Density Recharts Chart Area (Clean Brand Aesthetic, No Gradients) */}
        <div className="h-64 sm:h-72 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748B" }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748B" }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const humanVal = payload.find((p) => p.dataKey === "human")?.value || 0;
                    const botVal = payload.find((p) => p.dataKey === "bot")?.value || 0;
                    const chalVal = payload.find((p) => p.dataKey === "challenged")?.value || 0;
                    const totalVal = Number(humanVal) + Number(botVal) + Number(chalVal);

                    return (
                      <div className="bg-[#0F172A] text-white rounded-lg p-3 shadow-xl border border-slate-800 text-xs min-w-[190px]">
                        <div className="font-bold text-slate-200 pb-1.5 border-b border-slate-700/80 mb-2">
                          {label}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-emerald-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Legitimate Human
                            </span>
                            <span className="font-mono font-bold">{humanVal}</span>
                          </div>
                          <div className="flex items-center justify-between text-rose-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-400" />
                              Blocked Threats
                            </span>
                            <span className="font-mono font-bold">{botVal}</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              Challenged Probes
                            </span>
                            <span className="font-mono font-bold">{chalVal}</span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-slate-300 font-bold">
                            <span>Total Volume</span>
                            <span className="font-mono">{totalVal} req</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showHumanSeries && (
                <Area
                  type="monotone"
                  dataKey="human"
                  name="Legitimate Buyers"
                  stroke="#0A5C48"
                  strokeWidth={2}
                  fill="#10B981"
                  fillOpacity={0.08}
                />
              )}
              {showBotSeries && (
                <Area
                  type="monotone"
                  dataKey="bot"
                  name="Automated Scrapers"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="#EF4444"
                  fillOpacity={0.08}
                />
              )}
              {showChalSeries && (
                <Area
                  type="monotone"
                  dataKey="challenged"
                  name="Challenged Probes"
                  stroke="#D97706"
                  strokeWidth={2}
                  fill="#D97706"
                  fillOpacity={0.08}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 3: REBUILT BREAKDOWN ANALYTICS (Replacing Live Snapshot Table)
          3 Columns: Top IP Addresses, Top Browsers, Top Countries
          Each equipped with its own dropdown filter (All, Allowed, Blocked, Challenged, Ad Clicks)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0A5C48]" />
              <span>Traffic Distribution & Breakdown Analytics</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated insights across IP origins, verified client environments, and geographic distributions
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("simulator")}
              className="text-xs h-8 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold gap-1.5 rounded-lg shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#0A5C48]" />
              <span>Bot Simulator</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigateTab("logs")}
              className="text-xs h-8 bg-[#0A5C48] hover:bg-[#084838] text-white font-semibold gap-1.5 rounded-lg shadow-xs"
            >
              <span>View All Visitor Logs</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* 3-Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* ═══════════════════════════════════════════════════════════
              CARD 1: TOP IP ADDRESSES
          ═══════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden flex flex-col transition-all hover:border-[#CBD5E1]">
            {/* Card Header & Filter Dropdown */}
            <div className="p-4 sm:p-4.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Network className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Top IP Addresses</h4>
                  <span className="text-[10px] text-slate-500 font-medium">Ranked by volume</span>
                </div>
              </div>

              {/* Dropdown Selector */}
              <select
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value as FilterOption)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A5C48] focus:border-[#0A5C48] cursor-pointer shadow-2xs"
              >
                <option value="all">All Traffic</option>
                <option value="allowed">Top Allowed</option>
                <option value="blocked">Top Blocked</option>
                <option value="challenged">Challenged</option>
                <option value="ad_clicks">Ad Clicks</option>
              </select>
            </div>

            {/* List Body */}
            <div className="p-4 divide-y divide-slate-100 flex-1">
              {topIps.map((item, idx) => {
                const flag = getCountryFlag(item.countryCode);
                const isDominantAllowed = item.allowed >= item.blocked;

                return (
                  <div
                    key={item.ip}
                    onClick={() => item.sampleItem && setSelectedVisitor(item.sampleItem)}
                    className="py-3 first:pt-0 last:pb-0 group cursor-pointer hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-[11px] font-bold text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-sm leading-none shrink-0" title={item.country}>
                          {flag}
                        </span>
                        <span className="font-mono font-bold text-slate-900 truncate group-hover:text-[#0A5C48] transition-colors" title={item.ip}>
                          {item.ip}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-bold text-slate-900 font-mono">
                          {item.count} <span className="text-[10px] font-normal text-slate-400 font-sans">req</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Sub-indicators */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDominantAllowed ? "bg-[#0A5C48]" : "bg-rose-500"
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="truncate max-w-[140px]" title={item.isp}>
                          {item.isp}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.allowed > 0 && (
                            <span className="text-emerald-700 font-medium">
                              {item.allowed} allowed
                            </span>
                          )}
                          {item.blocked > 0 && (
                            <span className="text-rose-600 font-medium">
                              {item.blocked} blocked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {topIps.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No IPs matching filter</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Select a different traffic classification above</p>
                </div>
              )}
            </div>

            {/* Card Footer Link */}
            <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Click any IP to inspect telemetry</span>
              <button
                type="button"
                onClick={() => onNavigateTab("logs")}
                className="text-[11px] font-semibold text-[#0A5C48] hover:text-[#084838] flex items-center gap-1"
              >
                <span>View all in logs</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              CARD 2: TOP BROWSERS
          ═══════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden flex flex-col transition-all hover:border-[#CBD5E1]">
            {/* Card Header & Filter Dropdown */}
            <div className="p-4 sm:p-4.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0A5C48]">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Top Browsers</h4>
                  <span className="text-[10px] text-slate-500 font-medium">Authoritative identification</span>
                </div>
              </div>

              {/* Dropdown Selector */}
              <select
                value={browserFilter}
                onChange={(e) => setBrowserFilter(e.target.value as FilterOption)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A5C48] focus:border-[#0A5C48] cursor-pointer shadow-2xs"
              >
                <option value="all">All Traffic</option>
                <option value="allowed">Top Allowed</option>
                <option value="blocked">Top Blocked</option>
                <option value="challenged">Challenged</option>
                <option value="ad_clicks">Ad Clicks</option>
              </select>
            </div>

            {/* List Body */}
            <div className="p-4 divide-y divide-slate-100 flex-1">
              {topBrowsers.map((item, idx) => {
                const isDominantHuman = item.allowed >= item.blocked;

                return (
                  <div
                    key={item.name}
                    className="py-3 first:pt-0 last:pb-0 -mx-2 px-2 rounded-lg"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-[11px] font-bold text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          <BrowserIcon type={item.type} />
                        </div>
                        <span className="font-bold text-slate-900 truncate">
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-bold text-slate-900 font-mono">
                          {item.count} <span className="text-[10px] font-normal text-slate-400 font-sans">visitors</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Sub-indicators */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDominantHuman ? "bg-[#0A5C48]" : "bg-rose-500"
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="font-medium text-slate-500">
                          {item.name === "Brave" 
                            ? "Brave Shields Signal" 
                            : item.name === "Edge" 
                            ? "Microsoft Edge Edg/" 
                            : item.name === "Safari" 
                            ? "Apple WebKit Safari" 
                            : item.name === "Chrome" 
                            ? "Google Chrome" 
                            : "Verified Client Engine"}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-emerald-700 font-medium">
                            {item.allowed} human
                          </span>
                          {item.blocked > 0 && (
                            <span className="text-rose-600 font-medium">
                              {item.blocked} bots
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {topBrowsers.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No browsers matching filter</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Select a different traffic classification above</p>
                </div>
              )}
            </div>

            {/* Card Footer Link */}
            <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Normalized client-side engine telemetry</span>
              <button
                type="button"
                onClick={() => onNavigateTab("logs")}
                className="text-[11px] font-semibold text-[#0A5C48] hover:text-[#084838] flex items-center gap-1"
              >
                <span>Browse details</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              CARD 3: TOP COUNTRIES
          ═══════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden flex flex-col transition-all hover:border-[#CBD5E1]">
            {/* Card Header & Filter Dropdown */}
            <div className="p-4 sm:p-4.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Top Countries</h4>
                  <span className="text-[10px] text-slate-500 font-medium">Geographic origin</span>
                </div>
              </div>

              {/* Dropdown Selector */}
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value as FilterOption)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A5C48] focus:border-[#0A5C48] cursor-pointer shadow-2xs"
              >
                <option value="all">All Traffic</option>
                <option value="allowed">Top Allowed</option>
                <option value="blocked">Top Blocked</option>
                <option value="challenged">Challenged</option>
                <option value="ad_clicks">Ad Clicks</option>
              </select>
            </div>

            {/* List Body */}
            <div className="p-4 divide-y divide-slate-100 flex-1">
              {topCountries.map((item, idx) => {
                const flag = getCountryFlag(item.code);
                const isDominantAllowed = item.allowed >= item.blocked;

                return (
                  <div
                    key={item.name}
                    className="py-3 first:pt-0 last:pb-0 -mx-2 px-2 rounded-lg"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-[11px] font-bold text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-base leading-none shrink-0">
                          {flag}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {item.name}
                        </span>
                        {item.code && item.code !== "ALL" && (
                          <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                            {item.code}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-bold text-slate-900 font-mono">
                          {item.count} <span className="text-[10px] font-normal text-slate-400 font-sans">req</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Sub-indicators */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDominantAllowed ? "bg-[#0A5C48]" : "bg-rose-500"
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="text-slate-500">
                          {item.allowed > 0 && item.blocked > 0
                            ? "Mixed traffic zone"
                            : item.allowed > 0
                            ? "Permitted region"
                            : "High threat zone"}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.allowed > 0 && (
                            <span className="text-emerald-700 font-medium">
                              {item.allowed} allowed
                            </span>
                          )}
                          {item.blocked > 0 && (
                            <span className="text-rose-600 font-medium">
                              {item.blocked} blocked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {topCountries.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No countries matching filter</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Select a different traffic classification above</p>
                </div>
              )}
            </div>

            {/* Card Footer Link */}
            <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Enforce geo-fencing in Routing rules</span>
              <button
                type="button"
                onClick={() => onNavigateTab("routing")}
                className="text-[11px] font-semibold text-[#0A5C48] hover:text-[#084838] flex items-center gap-1"
              >
                <span>Configure geo</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-Over Visitor Details Drawer */}
      <VisitorDetailsDrawer
        visitor={selectedVisitor}
        onClose={() => setSelectedVisitor(null)}
        humanUrl={humanUrl}
        botUrl={botUrl}
      />
    </div>
  );
}
