import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronDown, 
  Info, 
  Calendar,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface SearchIndexerCrawler {
  id: string;
  crawler: string;
  operator: string;
  operatorKey: string;
  category: string;
  tokens: string[];
  description: string;
}

export const SEARCH_INDEXER_CRAWLERS: SearchIndexerCrawler[] = [
  {
    id: "googlebot",
    crawler: "Googlebot",
    operator: "Google LLC",
    operatorKey: "google",
    category: "Search Engine Crawler",
    tokens: ["googlebot"],
    description: "Core Google search engine spider indexing web pages for organic Google Search rankings and rich snippets.",
  },
  {
    id: "google_inspectiontool",
    crawler: "Google Inspection Tool",
    operator: "Google LLC",
    operatorKey: "google",
    category: "Search Engine Crawler",
    tokens: ["google-inspectiontool"],
    description: "Invoked by webmasters in Google Search Console to test live URLs and inspect indexing status.",
  },
  {
    id: "bingbot",
    crawler: "Bingbot",
    operator: "Microsoft Corporation",
    operatorKey: "microsoft",
    category: "Search Engine Crawler",
    tokens: ["bingbot"],
    description: "Powers Microsoft Bing organic search results, Microsoft Copilot grounded web search, and Windows search.",
  },
  {
    id: "bingpreview",
    crawler: "Bing Preview",
    operator: "Microsoft Corporation",
    operatorKey: "microsoft",
    category: "Search Engine Crawler",
    tokens: ["bingpreview"],
    description: "Fetches page previews and snapshots to generate rich visual answer cards across Bing.",
  },
  {
    id: "duckduckbot",
    crawler: "DuckDuckBot",
    operator: "DuckDuckGo, Inc.",
    operatorKey: "duckduckgo",
    category: "Search Engine Crawler",
    tokens: ["duckduckbot"],
    description: "Indexes web resources for DuckDuckGo privacy-first search engine results.",
  },
  {
    id: "baiduspider",
    crawler: "Baidu Spider",
    operator: "Baidu, Inc.",
    operatorKey: "baidu",
    category: "Search Engine Crawler",
    tokens: ["baiduspider", "baidu"],
    description: "Primary search spider indexing content for Baidu search engine in mainland China and Asia-Pacific.",
  },
  {
    id: "yandexbot",
    crawler: "Yandex Bot",
    operator: "Yandex LLC",
    operatorKey: "yandex",
    category: "Search Engine Crawler",
    tokens: ["yandexbot", "yandex"],
    description: "Leading search engine spider indexing web copy across Eastern European and Central Asian markets.",
  },
  {
    id: "petalbot",
    crawler: "Huawei PetalBot",
    operator: "Huawei Technologies",
    operatorKey: "huawei",
    category: "Search Engine Crawler",
    tokens: ["petalbot"],
    description: "Web search crawler powering Petal Search on millions of global Huawei mobile devices.",
  },
  {
    id: "applebot",
    crawler: "Applebot",
    operator: "Apple Inc.",
    operatorKey: "apple",
    category: "Search Engine Crawler",
    tokens: ["applebot"],
    description: "Indexes public internet pages to power Safari Spotlight Search, Siri lookup, and Apple Maps.",
  },
  {
    id: "sogouspider",
    crawler: "Sogou Spider",
    operator: "Sogou Inc.",
    operatorKey: "sogou",
    category: "Search Engine Crawler",
    tokens: ["sogou"],
    description: "Chinese search engine indexer scanning public news, documents, and online publications.",
  },
  {
    id: "seznambot",
    crawler: "SeznamBot",
    operator: "Seznam.cz",
    operatorKey: "seznam",
    category: "Search Engine Crawler",
    tokens: ["seznambot"],
    description: "National search engine spider indexing pages in the Czech Republic and Central Europe.",
  },
  {
    id: "naveryeti",
    crawler: "Naver Yeti",
    operator: "Naver Corporation",
    operatorKey: "naver",
    category: "Search Engine Crawler",
    tokens: ["naverbot", "yeti"],
    description: "Leading search engine spider in South Korea indexing websites for Naver search portals.",
  },
  {
    id: "daumbot",
    crawler: "Daum Bot",
    operator: "Kakao Corp.",
    operatorKey: "daum",
    category: "Search Engine Crawler",
    tokens: ["daumoa"],
    description: "Web crawler powering the Daum search engine and Kakao web portals in South Korea.",
  },
  {
    id: "qwantify",
    crawler: "Qwantify",
    operator: "Qwant",
    operatorKey: "qwant",
    category: "Search Engine Crawler",
    tokens: ["qwantify"],
    description: "European privacy-focused search engine crawler respecting user tracking prevention standards.",
  },
  {
    id: "yahooslurp",
    crawler: "Yahoo Slurp",
    operator: "Yahoo! Inc.",
    operatorKey: "yahoo",
    category: "Search Engine Crawler",
    tokens: ["slurp"],
    description: "Historical and ongoing web spider indexing multimedia and portal feeds for Yahoo! Network.",
  },
  {
    id: "exabot",
    crawler: "Exabot",
    operator: "Dassault Systèmes",
    operatorKey: "exalead",
    category: "Search Engine Crawler",
    tokens: ["exabot"],
    description: "Enterprise semantic indexing spider developed by Exalead for commercial web intelligence.",
  },
];

// Clean sparkline mini chart (solid neutral stroke, no purple/gradients)
function CleanSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const width = 56;
  const height = 22;
  const hasData = data.some((val) => val > 0);
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 4) + 2;
    const y = hasData ? height - (val / max) * (height - 6) - 3 : height - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg className="w-14 h-5.5 shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <path
        d={pathD}
        fill="none"
        stroke={hasData ? "#0A5C48" : "#CBD5E1"}
        strokeWidth={hasData ? "1.5" : "1"}
        strokeDasharray={hasData ? undefined : "2 2"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserSearchIndexersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters & Search State
  const [selectedCrawlerFilter, setSelectedCrawlerFilter] = useState<string>("all");
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [showInactive, setShowInactive] = useState<boolean>(true);
  const [selectedCrawlerIds, setSelectedCrawlerIds] = useState<Set<string>>(new Set());

  // Fetch routing / redirect URLs containing SEO crawler rules
  const { data: redirectUrls, isLoading } = useQuery<any>({
    queryKey: ["/api/user/redirect-urls"],
    refetchOnMount: true,
  });

  // Fetch classifications for live telemetry
  const { data: classifications = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/classifications"],
    refetchInterval: 5000,
  });

  // Blocked list parsing
  const blockedSearchCrawlers = useMemo<string[]>(() => {
    const raw = redirectUrls?.blockedSearchCrawlers || "";
    return raw
      .toLowerCase()
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }, [redirectUrls?.blockedSearchCrawlers]);

  const globalSearchPolicy = redirectUrls?.allowSearchCrawlers ?? "allow";

  // Distinct operators list for dropdown
  const distinctOperators = useMemo<string[]>(() => {
    const set = new Set<string>();
    SEARCH_INDEXER_CRAWLERS.forEach((c) => set.add(c.operator));
    return Array.from(set).sort();
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      allowSearchCrawlers?: string;
      blockedSearchCrawlers?: string;
    }) => {
      const current = redirectUrls || {};
      const body = {
        humanUrl: current.humanUrl || "https://yourdomain.com",
        botUrl: current.botUrl || "",
        allowedCountries: current.allowedCountries || "ALL",
        allowedDevices: current.allowedDevices || "all",
        desktopOsFilter: current.desktopOsFilter || "both",
        blockVpn: current.blockVpn || "block",
        blockDatacenter: current.blockDatacenter || "block",
        blockTor: current.blockTor || "block",
        allowSearchCrawlers: payload.allowSearchCrawlers ?? current.allowSearchCrawlers ?? "allow",
        blockedSearchCrawlers: payload.blockedSearchCrawlers ?? current.blockedSearchCrawlers ?? "",
        blockAiCrawlers: current.blockAiCrawlers || "block",
        allowSocialPreviews: current.allowSocialPreviews || "allow",
        allowedAiBots: current.allowedAiBots || "",
      };

      const res = await apiRequest("POST", "/api/user/redirect-urls", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
      toast({
        title: "Search Indexer Policy Updated",
        description: "Your crawler permissions have taken effect across all edge verification gateways.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update search engine indexer configuration",
        variant: "destructive",
      });
    },
  });

  // Check if a specific crawler is currently blocked
  const isCrawlerBlocked = (crawlerId: string, tokens: string[]) => {
    if (globalSearchPolicy === "block") return true;
    const lowId = crawlerId.toLowerCase();
    const isExplicitlyBlocked = blockedSearchCrawlers.some((blocked) => {
      const low = blocked.toLowerCase();
      return (
        low === lowId ||
        tokens.some((tok) => low.includes(tok.toLowerCase()) || tok.toLowerCase().includes(low))
      );
    });
    return isExplicitlyBlocked;
  };

  // Toggle switch (ON = Blocked, OFF = Allowed)
  const toggleBlockCrawler = (crawlerId: string, tokens: string[]) => {
    const currentlyBlocked = isCrawlerBlocked(crawlerId, tokens);
    const lowerId = crawlerId.toLowerCase();
    let updatedList: string[];

    if (currentlyBlocked) {
      // Unblock -> remove from blocked list
      const tokenSet = new Set([lowerId, ...tokens.map((t) => t.toLowerCase())]);
      updatedList = blockedSearchCrawlers.filter((id) => !tokenSet.has(id));
    } else {
      // Block -> add to blocked list
      const toAdd = [lowerId, ...tokens.map((t) => t.toLowerCase())];
      updatedList = Array.from(new Set([...blockedSearchCrawlers, ...toAdd]));
    }

    saveMutation.mutate({
      blockedSearchCrawlers: updatedList.join(","),
    });
  };

  // Bulk actions on selected checkboxes
  const handleBulkBlock = () => {
    if (selectedCrawlerIds.size === 0) return;
    const toBlockTokens = new Set<string>(blockedSearchCrawlers);
    SEARCH_INDEXER_CRAWLERS
      .filter((c) => selectedCrawlerIds.has(c.id))
      .forEach((c) => {
        toBlockTokens.add(c.id.toLowerCase());
        c.tokens.forEach((t) => toBlockTokens.add(t.toLowerCase()));
      });

    saveMutation.mutate({
      blockedSearchCrawlers: Array.from(toBlockTokens).join(","),
    });
    setSelectedCrawlerIds(new Set());
  };

  const handleBulkAllow = () => {
    if (selectedCrawlerIds.size === 0) return;
    const toUnblockTokens = new Set<string>();
    SEARCH_INDEXER_CRAWLERS
      .filter((c) => selectedCrawlerIds.has(c.id))
      .forEach((c) => {
        toUnblockTokens.add(c.id.toLowerCase());
        c.tokens.forEach((t) => toUnblockTokens.add(t.toLowerCase()));
      });

    const updated = blockedSearchCrawlers.filter((id) => !toUnblockTokens.has(id));
    saveMutation.mutate({
      blockedSearchCrawlers: updated.join(","),
    });
    setSelectedCrawlerIds(new Set());
  };

  // Real traffic metrics computation tied to user API key activity
  const timeWindowMs = 
    timeRange === "24h" ? 24 * 60 * 60 * 1000 :
    timeRange === "30d" ? 30 * 24 * 60 * 60 * 1000 :
    7 * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - timeWindowMs;

  const activeClassifications = useMemo(() => {
    return classifications.filter((c) => {
      const t = c.timestamp ? new Date(c.timestamp).getTime() : 0;
      return t >= cutoffTime;
    });
  }, [classifications, cutoffTime]);

  const crawlerMetrics = useMemo(() => {
    const map: Record<string, { allowed: number; blocked: number; total: number; buckets: number[] }> = {};

    SEARCH_INDEXER_CRAWLERS.forEach((item) => {
      const lowTokens = item.tokens.map((t) => t.toLowerCase());
      const lowId = item.id.toLowerCase();
      const lowCrawler = item.crawler.toLowerCase();
      const matches = activeClassifications.filter((c) => {
        const ua = (c.userAgent || "").toLowerCase();
        const dm = (c.detectionMethod || "").toLowerCase();
        const br = (c.blockReason || "").toLowerCase();
        return (
          lowTokens.some((tok) => ua.includes(tok) || dm.includes(tok) || br.includes(tok)) ||
          ua.includes(lowId) ||
          dm.includes(lowId) ||
          ua.includes(lowCrawler) ||
          dm.includes(lowCrawler)
        );
      });

      const allowed = matches.filter((c) => c.visitorType === "Human").length;
      const blocked = matches.filter((c) => c.visitorType === "Bot").length;

      // 7 sparkline points across the time window
      const buckets = [0, 0, 0, 0, 0, 0, 0];
      matches.forEach((c) => {
        const t = c.timestamp ? new Date(c.timestamp).getTime() : 0;
        const age = Math.max(0, Date.now() - t);
        const idx = Math.min(6, Math.max(0, 6 - Math.floor((age / timeWindowMs) * 7)));
        buckets[idx]++;
      });

      map[item.id] = { allowed, blocked, total: matches.length, buckets };
    });

    return map;
  }, [activeClassifications, timeWindowMs]);

  // Filtered crawlers for table
  const filteredCrawlers = useMemo(() => {
    return SEARCH_INDEXER_CRAWLERS.filter((cr) => {
      // Crawler filter
      if (selectedCrawlerFilter !== "all" && cr.id !== selectedCrawlerFilter) {
        return false;
      }

      // Operator filter
      if (selectedOperatorFilter !== "all" && cr.operator.toLowerCase() !== selectedOperatorFilter.toLowerCase()) {
        return false;
      }

      // Inactive filter
      if (!showInactive) {
        const metrics = crawlerMetrics[cr.id];
        if (!metrics || metrics.total === 0) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCrawlerFilter, selectedOperatorFilter, showInactive, crawlerMetrics]);

  // Bulk selection toggles
  const allFilteredSelected = 
    filteredCrawlers.length > 0 &&
    filteredCrawlers.every((cr) => selectedCrawlerIds.has(cr.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedCrawlerIds(new Set());
    } else {
      setSelectedCrawlerIds(new Set(filteredCrawlers.map((c) => c.id)));
    }
  };

  const toggleSelectCrawler = (id: string) => {
    setSelectedCrawlerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Telemetry summary
  const telemetry = useMemo(() => {
    const seoHits = classifications.filter((c) => {
      const method = (c.detectionMethod || "").toLowerCase();
      const userAgent = (c.userAgent || "").toLowerCase();
      return (
        method.includes("search indexer") ||
        method.includes("search engine") ||
        userAgent.includes("googlebot") ||
        userAgent.includes("bingbot") ||
        userAgent.includes("baiduspider") ||
        userAgent.includes("yandex") ||
        userAgent.includes("duckduckbot")
      );
    });

    const blocked = seoHits.filter((c) => c.visitorType === "Bot").length;
    const allowed = seoHits.filter((c) => c.visitorType === "Human").length;

    return {
      totalHits: seoHits.length,
      blocked,
      allowed,
      totalRegistered: SEARCH_INDEXER_CRAWLERS.length,
    };
  }, [classifications]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP HEADER (Clean Neutral CleanTraffic Styling)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#064E3B] border border-[#047857] flex items-center justify-center text-white shadow-xs shrink-0">
            <Search className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                Search Engine Indexers
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                SEO Governance
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl">
              Control which global search spiders can crawl and index your web pages for organic search rankings without impacting human visitors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
            <Globe className="h-3.5 w-3.5 text-[#0A5C48]" />
            <span>Search Spiders</span>
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. GLOBAL METRICS CARDS (Zero Purple, Clean Neutral Style)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Search Engine Hits */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Search Crawler Hits
            </div>
            <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
              {telemetry.totalHits}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Verified in visitor telemetry
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <Search className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Permitted Indexers */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Permitted SEO Visits
            </div>
            <div className="text-2xl font-extrabold text-[#0A5C48] mt-1">
              {telemetry.allowed}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Indexing public pages
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0A5C48]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Deflected Spiders */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Deflected Spiders
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">
              {telemetry.blocked}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              Deflected per site policy
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Global Posture */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Search Indexing Posture
            </div>
            <div className="text-sm font-bold text-[#0F172A] mt-1">
              {globalSearchPolicy === "allow" ? "Permissive (SEO Preserved)" : "Restricted (All Blocked)"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {blockedSearchCrawlers.length} blocked by granular rule
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0A5C48]">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CONTROLS BAR (Search & Filters)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Select Crawler Dropdown */}
            <div className="relative min-w-[170px]">
              <select
                value={selectedCrawlerFilter}
                onChange={(e) => setSelectedCrawlerFilter(e.target.value)}
                className="w-full h-8 px-2.5 pr-8 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 font-medium appearance-none focus:outline-none focus:border-[#0A5C48] cursor-pointer"
              >
                <option value="all">Select crawler (All)</option>
                {SEARCH_INDEXER_CRAWLERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.crawler}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Select Operator Dropdown */}
            <div className="relative min-w-[160px]">
              <select
                value={selectedOperatorFilter}
                onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                className="w-full h-8 px-2.5 pr-8 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 font-medium appearance-none focus:outline-none focus:border-[#0A5C48] cursor-pointer"
              >
                <option value="all">Select operator (All)</option>
                {distinctOperators.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[#D5DFD9] bg-white text-xs font-medium text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(selectedCrawlerFilter !== "all" || selectedOperatorFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCrawlerFilter("all");
                  setSelectedOperatorFilter("all");
                }}
                className="text-[11px] text-slate-500 hover:text-slate-900 underline px-1 cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Right: Inactive crawlers checkbox */}
          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
              />
              <span className="font-medium text-[11px] text-slate-800">Show inactive crawlers</span>
              <span title="Display registered crawlers even if they have 0 requests in the selected period" className="text-slate-400">
                <Info className="h-3.5 w-3.5" />
              </span>
            </label>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedCrawlerIds.size > 0 && (
          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs animate-in fade-in-50 duration-150">
            <span className="font-semibold text-emerald-900">
              {selectedCrawlerIds.size} indexer{selectedCrawlerIds.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleBulkBlock}
                disabled={saveMutation.isPending}
                className="h-7 px-2.5 text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                Block Selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleBulkAllow}
                disabled={saveMutation.isPending}
                className="h-7 px-2.5 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              >
                Allow Selected
              </Button>
              <button
                type="button"
                onClick={() => setSelectedCrawlerIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SEARCH ENGINE INDEXER DIRECTORY TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5EAE7] bg-[#F8FAF9] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600">Crawler</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Category</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Requests</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right">Block Crawler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAE7]">
              {filteredCrawlers.map((cr) => {
                const isBlocked = isCrawlerBlocked(cr.id, cr.tokens);
                const stats = crawlerMetrics[cr.id] || { allowed: 0, blocked: 0, buckets: [0, 0, 0, 0, 0, 0, 0] };
                const isSelected = selectedCrawlerIds.has(cr.id);

                return (
                  <tr
                    key={cr.id}
                    className={`transition-colors ${
                      isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCrawler(cr.id)}
                        className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Crawler (Name + Operator underneath) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F3] border border-[#D5DFD9] flex items-center justify-center font-bold text-[11px] text-[#0A5C48] shrink-0">
                          {cr.operator.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#0F172A] leading-tight flex items-center gap-1.5">
                            <span>{cr.crawler}</span>
                          </div>
                          <div className="text-[11px] text-[#64748B] font-medium">
                            {cr.operator}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                        {cr.category}
                      </span>
                    </td>

                    {/* Requests: Real Sparkline + Allowed: X, Blocked: Y */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3.5">
                        <CleanSparkline data={stats.buckets} />
                        <div className="text-[11px] leading-tight space-y-0.5">
                          <div className="text-slate-600 font-medium flex items-center gap-1.5">
                            <span>Allowed:</span>
                            <strong className="font-bold text-slate-900">{stats.allowed}</strong>
                          </div>
                          <div className="text-slate-600 font-medium flex items-center gap-1.5">
                            <span>Blocked:</span>
                            <strong className={`font-bold ${stats.blocked > 0 ? "text-rose-700" : "text-slate-900"}`}>
                              {stats.blocked}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Block Crawler: Switch Toggle */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isBlocked
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isBlocked ? "Blocked" : "Allowed"}
                        </span>

                        <Switch
                          checked={isBlocked}
                          onCheckedChange={() => toggleBlockCrawler(cr.id, cr.tokens)}
                          disabled={saveMutation.isPending}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCrawlers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center space-y-2">
                    <Search className="h-8 w-8 text-slate-300 mx-auto" />
                    <div className="text-xs font-semibold text-slate-700">
                      No search engine indexers match your current filters
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Try clearing active filters or enable &quot;Show inactive crawlers&quot;.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
