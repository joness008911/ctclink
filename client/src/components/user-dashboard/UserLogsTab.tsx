import { useState, useMemo } from "react";
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
  CheckCircle2
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

export function UserLogsTab({ classifications = [], humanUrl, botUrl }: UserLogsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "allowed" | "challenged" | "blocked">("all");
  const [trafficFilter, setTrafficFilter] = useState<"all" | "paid" | "organic" | "reviewer" | "spoofed">("all");
  const [dateRangePreset, setDateRangePreset] = useState<"all" | "today" | "24h" | "7d" | "30d" | "custom">("all");
  const [customDate, setCustomDate] = useState<string>("");
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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
      return (
        (c.isp && c.isp.toLowerCase().includes(term)) ||
        (c.ip && c.ip.toLowerCase().includes(term)) ||
        (c.ipAddress && c.ipAddress.toLowerCase().includes(term)) ||
        (c.country && c.country.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term)) ||
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
        escapeCsv(timeStr),
        escapeCsv(item.ip || item.ipAddress || ""),
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
    const filename = `cloaker-traffic-audit-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0A5C48]" />
              Visitor Classification Logs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive telemetry stream with full forensic request breakdowns and date queries
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Pills */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setFilterType("all"); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setFilterType("allowed"); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === "allowed" ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-bold shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Allowed
              </button>
              <button
                type="button"
                onClick={() => { setFilterType("challenged"); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === "challenged" ? "bg-amber-50 text-amber-800 border border-amber-200/60 font-bold shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Challenged
              </button>
              <button
                type="button"
                onClick={() => { setFilterType("blocked"); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === "blocked" ? "bg-rose-50 text-rose-800 border border-rose-200/60 font-bold shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Blocked
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search IP, ISP, ad network, click ID..."
                className="pl-8 text-xs h-8 bg-slate-50 border-slate-200 text-slate-900 rounded-lg placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!filtered || filtered.length === 0}
              className="h-8 text-xs px-3 font-semibold text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg gap-1.5 shadow-2xs"
              title="Download filtered logs as an audit-ready CSV file"
            >
              <Download className="h-3.5 w-3.5 text-[#0A5C48]" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Traffic Attribution Sub-Toolbar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/80 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold mr-1">
              <Sparkles className="h-3.5 w-3.5 text-[#0A5C48]" />
              <span>Traffic Attribution:</span>
            </div>

            {/* Attribution Pills */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
              <button
                type="button"
                onClick={() => { setTrafficFilter("all"); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  trafficFilter === "all" ? "bg-slate-900 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Sources
              </button>
              <button
                type="button"
                onClick={() => { setTrafficFilter("paid"); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  trafficFilter === "paid" ? "bg-blue-600 text-white shadow-2xs font-bold" : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                🎯 Paid Ads Only
              </button>
              <button
                type="button"
                onClick={() => { setTrafficFilter("organic"); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  trafficFilter === "organic" ? "bg-teal-700 text-white shadow-2xs font-bold" : "text-teal-800 hover:bg-teal-50"
                }`}
              >
                🌿 Organic Only
              </button>
              <button
                type="button"
                onClick={() => { setTrafficFilter("reviewer"); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  trafficFilter === "reviewer" ? "bg-indigo-600 text-white shadow-2xs font-bold" : "text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                🛡️ Ad Reviewer Bots
              </button>
              <button
                type="button"
                onClick={() => { setTrafficFilter("spoofed"); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  trafficFilter === "spoofed" ? "bg-rose-600 text-white shadow-2xs font-bold animate-pulse" : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                🚨 Spoofed Crawlers
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filtered.length}</strong> matched log{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Date Filter & Range Control Sub-Toolbar */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Timeframe:</span>
            </div>

            {/* Preset Date Pills */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
              {(
                [
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "24h", label: "24 Hours" },
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDateRangePreset(preset.id);
                    setCustomDate("");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    dateRangePreset === preset.id
                      ? "bg-[#0A5C48] text-white font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">or</span>
              <div className="relative">
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) {
                      setDateRangePreset("custom");
                      setCurrentPage(1);
                    }
                  }}
                  className="h-7 text-xs px-2 py-0.5 bg-white border-slate-200 text-slate-700 rounded-md font-mono"
                />
              </div>

              {dateRangePreset === "custom" && customDate && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate("");
                    setDateRangePreset("all");
                    setCurrentPage(1);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60"
                  title="Clear custom date"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Records Indicator for the Active Filtered View */}
          <div className="text-slate-500 font-medium">
            Found <span className="font-bold text-slate-900">{filtered.length}</span> matching event{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[1060px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold text-slate-500 bg-[#F8FAFC]">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Threat Score</th>
                <th className="py-3 px-4">Network / ASN</th>
                <th className="py-3 px-4">Detection Trigger</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((c, i) => {
                const isHuman = c.visitorType === "Human";
                const methodStr = (c.detectionMethod || "").toLowerCase();
                const isPolicyFilter = !isHuman && (
                  methodStr.includes("device restricted") || 
                  methodStr.includes("os restricted") || 
                  methodStr.includes("geo") || 
                  methodStr.includes("country")
                );
                const isChallenged = !isHuman && !isPolicyFilter && (
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
                const networkClass = getNetworkClassification(c);
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
                const visitCountDisplay = typeof c.visitCount === 'number' && c.visitCount > 0 ? c.visitCount : 1;
                const isReturning = c.isNewVisitor === false || visitCountDisplay > 1;

                return (
                  <tr
                    key={c.id || i}
                    onClick={() => setSelectedVisitor(c)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        {c.timestamp ? format(new Date(c.timestamp), "MMM d, yyyy") : "Today"}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {c.timestamp ? format(new Date(c.timestamp), "HH:mm:ss") : "Just now"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{ipStr}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200" title={`Device ID: ${resolvedDeviceId}`}>
                            Dev: {resolvedDeviceId.length > 14 ? `${resolvedDeviceId.slice(0, 14)}...` : resolvedDeviceId}
                          </span>
                          <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-200/60" title={`Visitor ID: ${resolvedVisitorId}`}>
                            Vis: {resolvedVisitorId.length > 14 ? `${resolvedVisitorId.slice(0, 14)}...` : resolvedVisitorId}
                          </span>
                          {isReturning ? (
                            <span className="text-[9px] font-sans font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                              Returning ({visitCountDisplay} visits)
                            </span>
                          ) : (
                            <span className="text-[9px] font-sans font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              1st Visit
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isSpoofed ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          🚨 Spoofed Bot
                        </span>
                      ) : isReviewer ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                          🛡️ Reviewer Passed
                        </span>
                      ) : isPaid ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          🎯 Paid Allowed
                        </span>
                      ) : isHuman ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                          Allowed (Organic)
                        </span>
                      ) : isPolicyFilter ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Restricted
                        </span>
                      ) : isChallenged ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Challenged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          Blocked
                        </span>
                      )}
                    </td>

                    {/* Threat Score Badge (0-100) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold shadow-2xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${threat.dotClass}`} />
                        <span className="text-slate-900">{threat.score}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">/100</span>
                      </div>
                    </td>

                    {/* Network / ASN & ISP */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {asnInfo.asnBadge}
                          </span>
                          <span className="font-semibold text-slate-900 text-xs truncate" title={c.isp || ispDisplayName}>
                            {ispDisplayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${networkClass.className}`}>
                            {networkClass.label}
                          </span>
                          {c.clickId && (
                            <span className="inline-flex items-center text-[9px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 truncate max-w-[100px]" title={`Click ID: ${c.clickId}`}>
                              {c.clickId.length > 8 ? `${c.clickId.slice(0, 7)}…` : c.clickId}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isHuman 
                              ? "bg-emerald-500" 
                              : isPolicyFilter
                              ? "bg-amber-500"
                              : isChallenged 
                              ? "bg-amber-500" 
                              : "bg-rose-500"
                          }`}
                        />
                        <span className="truncate max-w-[150px] text-xs" title={c.detectionMethod || (isHuman ? "Clean Residential IP" : "Datacenter ASN Probe")}>
                          {c.detectionMethod || (isHuman ? "Clean Residential IP" : "Datacenter ASN Probe")}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-2">
                        {c.deviceType?.toLowerCase().includes("mobile") ? (
                          <Smartphone className="h-4 w-4 text-slate-500" />
                        ) : c.deviceType?.toLowerCase().includes("tablet") ? (
                          <Tablet className="h-4 w-4 text-slate-500" />
                        ) : (
                          <Laptop className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="text-[11px] font-medium text-slate-700">
                          {c.browser || "Chrome"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{flag}</span>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">
                            {c.country || "United States"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {c.city || (c.countryCode ? `Region (${c.countryCode})` : "Global")}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs">
                      <div className={`font-bold ${isHuman ? "text-emerald-700" : isChallenged ? "text-amber-700" : "text-rose-700"}`}>
                        {isHuman ? 200 : isChallenged ? 401 : 403}
                      </div>
                      <div className="text-[10px] text-slate-400">{isHuman ? "61ms" : "12ms"}</div>
                    </td>
                  </tr>
                );
              })}

              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-bold text-slate-900">No logs found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try altering your search query or filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-900">{filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filtered.length}</span> results
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-xs"
            >
              &lt;
            </button>
            <span className="px-3 py-1 rounded-md bg-[#0A5C48] text-white font-bold text-xs">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-xs"
            >
              &gt;
            </button>
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
