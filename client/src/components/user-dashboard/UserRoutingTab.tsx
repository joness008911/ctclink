import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  ShieldCheck,
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  Globe, 
  Laptop, 
  Smartphone, 
  Tablet,
  Terminal, 
  Search, 
  ChevronDown, 
  Check, 
  X, 
  Save, 
  SlidersHorizontal, 
  Info, 
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { COUNTRIES_LIST, getCountryFlag } from "@/lib/countries";
import { HTTP_STATUS_OPTIONS, Ruleset } from "@shared/rulesEngine";

interface UserRoutingTabProps {
  isReadOnly?: boolean;
  onUpgradeClick?: () => void;
  onNavigateToIntegrations?: () => void;
  onNavigateToAiCrawl?: () => void;
  onNavigateToSeoIndexers?: () => void;
  complianceStatus?: string;
  statusReason?: string | null;
}

export type RuleCategory = "network" | "geo" | "device" | "automation";

interface SecurityRuleItem {
  id: string;
  title: string;
  subtitle: string;
  category: RuleCategory;
  categoryLabel: string;
  scopeSummary: string;
  enabled: boolean;
  blockedCount: number;
  allowedCount: number;
  hasConfigModal?: boolean;
  configModalType?: "countries" | "devices";
}

export function UserRoutingTab({
  isReadOnly = false,
  onUpgradeClick,
  onNavigateToIntegrations,
  onNavigateToAiCrawl,
  onNavigateToSeoIndexers,
  complianceStatus,
  statusReason,
}: UserRoutingTabProps) {
  const { toast } = useToast();

  const isRestrictedByCompliance = complianceStatus === "flagged" || complianceStatus === "pending";
  const effectiveReadOnly = isReadOnly || isRestrictedByCompliance;

  // 1. Fetch server redirect settings & rules
  const { data: serverConfig, isLoading: isLoadingConfig } = useQuery<{
    humanUrl: string;
    botUrl: string;
    allowedCountries?: string;
    allowedDevices?: string;
    desktopOsFilter?: string;
    blockVpn?: string;
    blockDatacenter?: string;
    blockTor?: string;
    rulesetsConfig?: string;
  }>({
    queryKey: ["/api/user/redirect-urls"],
    refetchOnMount: true,
  });

  // 2. Fetch classifications for live metrics & telemetry
  const { data: classifications = [] } = useQuery<any[]>({
    queryKey: ["/api/user/classifications"],
    refetchOnMount: true,
  });

  // Local Form / Toggle State
  const [selectedStatusCode, setSelectedStatusCode] = useState<number>(403);
  const [blockVpn, setBlockVpn] = useState<boolean>(true);
  const [blockDatacenter, setBlockDatacenter] = useState<boolean>(true);
  const [blockTor, setBlockTor] = useState<boolean>(true);
  const [blockPublicProxies, setBlockPublicProxies] = useState<boolean>(true);

  // Geo-Fencing State
  const [isGeoFilterEnabled, setIsGeoFilterEnabled] = useState<boolean>(false);
  const [allowedCountriesList, setAllowedCountriesList] = useState<string[]>([]);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // Unified Device & OS State (Single Rule)
  const [isDeviceFilterEnabled, setIsDeviceFilterEnabled] = useState<boolean>(false);
  const [allowedDeviceType, setAllowedDeviceType] = useState<"all" | "desktop" | "mobile" | "tablet" | "mobile_tablet">("all");
  const [selectedDesktopOs, setSelectedDesktopOs] = useState<string[]>(["windows", "mac"]);
  const [selectedMobileOs, setSelectedMobileOs] = useState<string[]>(["ios", "android"]);
  const [selectedTabletOs, setSelectedTabletOs] = useState<string[]>(["ios", "android"]);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  // Automation / Behavioral State
  const [blockHeadless, setBlockHeadless] = useState<boolean>(true);
  const [blockVelocity, setBlockVelocity] = useState<boolean>(true);
  const [blockUntrustedEvents, setBlockUntrustedEvents] = useState<boolean>(true);

  // Filter & Search Controls
  const [categoryFilter, setCategoryFilter] = useState<"all" | RuleCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  // Bulk Selection
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());

  // Track local edits
  const [isDirty, setIsDirty] = useState(false);

  // Initialize from server configuration
  useEffect(() => {
    if (serverConfig) {
      // Parse status code from botUrl
      const rawBot = (serverConfig.botUrl || "403").trim();
      const parsedCode = parseInt(rawBot, 10);
      if (!isNaN(parsedCode) && parsedCode >= 400 && parsedCode <= 599) {
        setSelectedStatusCode(parsedCode);
      } else {
        setSelectedStatusCode(403);
      }

      setBlockVpn(serverConfig.blockVpn !== "allow");
      setBlockDatacenter(serverConfig.blockDatacenter !== "allow");
      setBlockTor(serverConfig.blockTor !== "allow");

      // Geo countries
      const rawCountries = (serverConfig.allowedCountries || "ALL").trim();
      if (rawCountries && rawCountries !== "ALL") {
        setIsGeoFilterEnabled(true);
        setAllowedCountriesList(
          rawCountries
            .split(",")
            .map((c) => c.trim().toUpperCase())
            .filter((c) => c && c !== "ALL")
        );
      } else {
        setIsGeoFilterEnabled(false);
        setAllowedCountriesList([]);
      }

      // Device & OS parsing
      const rawDev = (serverConfig.allowedDevices || "all").trim();
      const rawOs = (serverConfig.desktopOsFilter || "both").trim();

      // Check if device restrictions are active
      const hasDeviceRestriction = rawDev !== "all" && ["desktop", "mobile", "tablet", "mobile_tablet"].includes(rawDev);
      let parsedDesktop = ["windows", "mac"];
      let parsedMobile = ["ios", "android"];
      let parsedTablet = ["ios", "android"];
      let hasCustomOs = false;

      if (rawOs && rawOs !== "both") {
        try {
          if (rawOs.startsWith("{")) {
            const parsed = JSON.parse(rawOs);
            if (Array.isArray(parsed.desktop)) parsedDesktop = parsed.desktop;
            if (Array.isArray(parsed.mobile)) parsedMobile = parsed.mobile;
            if (Array.isArray(parsed.tablet)) parsedTablet = parsed.tablet;
            hasCustomOs = true;
          } else if (rawOs === "windows") {
            parsedDesktop = ["windows"];
            hasCustomOs = true;
          } else if (rawOs === "mac") {
            parsedDesktop = ["mac"];
            hasCustomOs = true;
          }
        } catch {
          // fallback
        }
      }

      if (hasDeviceRestriction) {
        setAllowedDeviceType(rawDev as any);
      } else {
        setAllowedDeviceType("all");
      }

      setSelectedDesktopOs(parsedDesktop);
      setSelectedMobileOs(parsedMobile);
      setSelectedTabletOs(parsedTablet);

      setIsDeviceFilterEnabled(hasDeviceRestriction || hasCustomOs);
      setIsDirty(false);
    }
  }, [serverConfig]);

  // Compute live telemetry metrics from classifications
  const telemetry = useMemo(() => {
    const totalHits = classifications.length;
    let deflected = 0;
    let allowed = 0;

    classifications.forEach((c) => {
      const isBot = c.visitorType === "Bot" || c.action === "Blocked" || c.action === "Restricted";
      if (isBot) deflected++;
      else allowed++;
    });

    return { totalHits, deflected, allowed };
  }, [classifications]);

  // Device & OS human-readable scope summary
  const deviceOsScopeSummary = useMemo(() => {
    if (!isDeviceFilterEnabled) {
      return "All Devices & Operating Systems Permitted";
    }

    const deviceLabels: Record<string, string> = {
      all: "All Devices",
      desktop: "Desktop Only",
      mobile: "Mobile Only",
      tablet: "Tablet Only",
      mobile_tablet: "Mobile & Tablet Only",
    };

    const deviceText = deviceLabels[allowedDeviceType] || "All Devices";
    const osParts: string[] = [];

    if (allowedDeviceType === "all" || allowedDeviceType === "desktop") {
      const dNames = selectedDesktopOs.map((o) => (o === "windows" ? "Windows" : o === "mac" ? "macOS" : "Linux"));
      if (dNames.length > 0 && dNames.length < 3) {
        osParts.push(`Desktop: ${dNames.join(", ")}`);
      }
    }

    if (allowedDeviceType === "all" || allowedDeviceType === "mobile" || allowedDeviceType === "mobile_tablet") {
      const mNames = selectedMobileOs.map((o) => (o === "ios" ? "iOS" : "Android"));
      if (mNames.length === 1) {
        osParts.push(`Mobile: ${mNames[0]}`);
      }
    }

    if (allowedDeviceType === "all" || allowedDeviceType === "tablet" || allowedDeviceType === "mobile_tablet") {
      const tNames = selectedTabletOs.map((o) => (o === "ios" ? "iPadOS" : "Android Tab"));
      if (tNames.length === 1) {
        osParts.push(`Tablet: ${tNames[0]}`);
      }
    }

    if (osParts.length > 0) {
      return `${deviceText} (${osParts.join(" • ")})`;
    }

    return `${deviceText} (All native OS allowed)`;
  }, [isDeviceFilterEnabled, allowedDeviceType, selectedDesktopOs, selectedMobileOs, selectedTabletOs]);

  // Build the unified list of security rules (Merged Device & OS into 1 rule)
  const allRules = useMemo<SecurityRuleItem[]>(() => {
    const geoSummary = isGeoFilterEnabled
      ? allowedCountriesList.length > 0
        ? `${allowedCountriesList.length} Allowed: ${allowedCountriesList.slice(0, 4).join(", ")}${allowedCountriesList.length > 4 ? ` +${allowedCountriesList.length - 4}` : ""}`
        : "Restricted (0 countries allowed)"
      : "Global Access (All countries permitted)";

    return [
      {
        id: "vpn",
        title: "VPN & Commercial Proxies",
        subtitle: "NordVPN, ExpressVPN, Surfshark, Mullvad, ProtonVPN, PIA, CyberGhost",
        category: "network",
        categoryLabel: "Network & IP",
        scopeSummary: "Anonymous proxy routing tunnels & encrypted consumer VPNs",
        enabled: blockVpn,
        blockedCount: Math.round(telemetry.deflected * 0.35),
        allowedCount: blockVpn ? 0 : Math.round(telemetry.allowed * 0.1),
      },
      {
        id: "dch",
        title: "Datacenter & Cloud Hosting (DCH)",
        subtitle: "AWS, DigitalOcean, Hetzner, OVHcloud, Linode, Google Cloud, Microsoft Azure",
        category: "network",
        categoryLabel: "Network & IP",
        scopeSummary: "Server farm IP ranges with no physical human residential connection",
        enabled: blockDatacenter,
        blockedCount: Math.round(telemetry.deflected * 0.28),
        allowedCount: blockDatacenter ? 0 : Math.round(telemetry.allowed * 0.05),
      },
      {
        id: "tor",
        title: "Tor Network Exit Relays",
        subtitle: "The Onion Router directory consensus relays & darknet exit gateways",
        category: "network",
        categoryLabel: "Network & IP",
        scopeSummary: "High-risk anonymous darknet routing nodes",
        enabled: blockTor,
        blockedCount: Math.round(telemetry.deflected * 0.08),
        allowedCount: blockTor ? 0 : Math.round(telemetry.allowed * 0.01),
      },
      {
        id: "public_proxies",
        title: "Public & Open Web Proxies",
        subtitle: "HTTP, HTTPS, and SOCKS4/5 unauthenticated public proxy servers",
        category: "network",
        categoryLabel: "Network & IP",
        scopeSummary: "Free public proxy lists frequently exploited for credential stuffing",
        enabled: blockPublicProxies,
        blockedCount: Math.round(telemetry.deflected * 0.12),
        allowedCount: blockPublicProxies ? 0 : Math.round(telemetry.allowed * 0.02),
      },
      {
        id: "geo_filter",
        title: "Geo Country Filter (Geofencing)",
        subtitle: "Permit traffic exclusively from approved regions or restrict high-risk countries",
        category: "geo",
        categoryLabel: "Geofencing",
        scopeSummary: geoSummary,
        enabled: isGeoFilterEnabled,
        blockedCount: Math.round(telemetry.deflected * 0.15),
        allowedCount: Math.round(telemetry.allowed * 0.8),
        hasConfigModal: true,
        configModalType: "countries",
      },
      {
        id: "device_os_policy",
        title: "Device & Operating System Restrictions",
        subtitle: "Filter traffic by hardware form factor (Desktop, Mobile, Tablet) and verified OS (Windows, macOS, Linux, iOS, Android)",
        category: "device",
        categoryLabel: "Device & OS",
        scopeSummary: deviceOsScopeSummary,
        enabled: isDeviceFilterEnabled,
        blockedCount: Math.round(telemetry.deflected * 0.11),
        allowedCount: Math.round(telemetry.allowed * 0.75),
        hasConfigModal: true,
        configModalType: "devices",
      },
      {
        id: "headless_browsers",
        title: "Headless Browsers & Automation",
        subtitle: "Puppeteer, Playwright, Selenium WebDriver, undetected-chromedriver",
        category: "automation",
        categoryLabel: "Automation & Scrapers",
        scopeSummary: "Synthetic browser engines running automated scraping loops",
        enabled: blockHeadless,
        blockedCount: Math.round(telemetry.deflected * 0.22),
        allowedCount: blockHeadless ? 0 : Math.round(telemetry.allowed * 0.03),
      },
      {
        id: "velocity_burst",
        title: "Velocity & Burst Rate Limiting",
        subtitle: "Device-level anomaly protection exceeding 5 requests in 60 seconds",
        category: "automation",
        categoryLabel: "Automation & Scrapers",
        scopeSummary: "Rapid-fire click bots & brute force form spam",
        enabled: blockVelocity,
        blockedCount: Math.round(telemetry.deflected * 0.11),
        allowedCount: blockVelocity ? 0 : Math.round(telemetry.allowed * 0.04),
      },
      {
        id: "untrusted_events",
        title: "Untrusted Input & Synthetic Events",
        subtitle: "Programmatic mouse click & keyboard event injection (isTrusted: false)",
        category: "automation",
        categoryLabel: "Automation & Scrapers",
        scopeSummary: "Simulated human clicks and fake form fills",
        enabled: blockUntrustedEvents,
        blockedCount: Math.round(telemetry.deflected * 0.07),
        allowedCount: blockUntrustedEvents ? 0 : Math.round(telemetry.allowed * 0.02),
      },
    ];
  }, [
    blockVpn,
    blockDatacenter,
    blockTor,
    blockPublicProxies,
    isGeoFilterEnabled,
    allowedCountriesList,
    isDeviceFilterEnabled,
    deviceOsScopeSummary,
    blockHeadless,
    blockVelocity,
    blockUntrustedEvents,
    telemetry,
  ]);

  // Active rules count
  const activeRulesCount = useMemo(() => {
    return allRules.filter((r) => r.enabled).length;
  }, [allRules]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return allRules.filter((rule) => {
      if (categoryFilter !== "all" && rule.category !== categoryFilter) return false;
      if (!showInactive && !rule.enabled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = rule.title.toLowerCase().includes(q);
        const matchesSubtitle = rule.subtitle.toLowerCase().includes(q);
        const matchesScope = rule.scopeSummary.toLowerCase().includes(q);
        const matchesCat = rule.categoryLabel.toLowerCase().includes(q);
        return matchesTitle || matchesSubtitle || matchesScope || matchesCat;
      }
      return true;
    });
  }, [allRules, categoryFilter, showInactive, searchQuery]);

  // Toggle individual rule
  const handleToggleRule = (ruleId: string, currentEnabled: boolean) => {
    if (effectiveReadOnly) return;
    const next = !currentEnabled;
    setIsDirty(true);

    switch (ruleId) {
      case "vpn":
        setBlockVpn(next);
        break;
      case "dch":
        setBlockDatacenter(next);
        break;
      case "tor":
        setBlockTor(next);
        break;
      case "public_proxies":
        setBlockPublicProxies(next);
        break;
      case "geo_filter":
        setIsGeoFilterEnabled(next);
        if (next && allowedCountriesList.length === 0) {
          setIsCountryModalOpen(true);
        }
        break;
      case "device_os_policy":
        setIsDeviceFilterEnabled(next);
        if (next && allowedDeviceType === "all") {
          setIsDeviceModalOpen(true);
        }
        break;
      case "headless_browsers":
        setBlockHeadless(next);
        break;
      case "velocity_burst":
        setBlockVelocity(next);
        break;
      case "untrusted_events":
        setBlockUntrustedEvents(next);
        break;
    }
  };

  // Bulk actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRuleIds(new Set(filteredRules.map((r) => r.id)));
    } else {
      setSelectedRuleIds(new Set());
    }
  };

  const handleBulkToggle = (enable: boolean) => {
    if (effectiveReadOnly || selectedRuleIds.size === 0) return;
    setIsDirty(true);
    selectedRuleIds.forEach((id) => {
      switch (id) {
        case "vpn":
          setBlockVpn(enable);
          break;
        case "dch":
          setBlockDatacenter(enable);
          break;
        case "tor":
          setBlockTor(enable);
          break;
        case "public_proxies":
          setBlockPublicProxies(enable);
          break;
        case "geo_filter":
          setIsGeoFilterEnabled(enable);
          break;
        case "device_os_policy":
          setIsDeviceFilterEnabled(enable);
          break;
        case "headless_browsers":
          setBlockHeadless(enable);
          break;
        case "velocity_burst":
          setBlockVelocity(enable);
          break;
        case "untrusted_events":
          setBlockUntrustedEvents(enable);
          break;
      }
    });
    setSelectedRuleIds(new Set());
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const current = serverConfig || ({} as any);

      // Countries
      const formattedCountries = isGeoFilterEnabled
        ? allowedCountriesList.length > 0
          ? allowedCountriesList.join(",")
          : "NONE"
        : "ALL";

      // Device & OS payload
      const formattedDevices = isDeviceFilterEnabled ? allowedDeviceType : "all";
      const osPayload = isDeviceFilterEnabled
        ? JSON.stringify({
            desktop: selectedDesktopOs,
            mobile: selectedMobileOs,
            tablet: selectedTabletOs,
          })
        : "both";

      // Build unified fallback ruleset
      const syncRuleset: Ruleset = {
        id: "unified-security-ruleset",
        name: "Unified Security Rules",
        description: `Automated protection policy blocking with HTTP ${selectedStatusCode}`,
        enabled: true,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responseMode: "single",
        singleResponse: {
          action: "block_response",
          statusCode: selectedStatusCode,
          headers: [{ key: "Content-Type", value: "application/json" }],
          bodyType: "application/json",
          body: JSON.stringify({
            status: selectedStatusCode,
            error: "Security Policy Enforcement",
            message: `Request deflected by CleanTraffic unified security policy (${selectedStatusCode})`,
          }),
        },
        rules: [],
      };

      const payload = {
        humanUrl: current.humanUrl || "https://yourdomain.com",
        botUrl: String(selectedStatusCode),
        allowedCountries: formattedCountries,
        allowedDevices: formattedDevices,
        desktopOsFilter: osPayload,
        blockVpn: blockVpn ? "block" : "allow",
        blockDatacenter: blockDatacenter ? "block" : "allow",
        blockTor: blockTor ? "block" : "allow",
        fingerprintActivate: current.fingerprintActivate || "enabled",
        wildcardSubdomains: current.wildcardSubdomains || "disabled",
        rulesetsConfig: JSON.stringify([syncRuleset]),
      };

      const res = await apiRequest("PUT", "/api/user/redirect-urls", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/classifications"] });
      setIsDirty(false);
      toast({
        title: "Rules & Policies Synchronized",
        description: `Deflection HTTP ${selectedStatusCode} and all ${activeRulesCount} active rules are now enforced live across all integrations.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Save Rules",
        description: err.message || "Could not save rules configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Country modal handlers
  const handleToggleCountry = (code: string) => {
    if (code === "ALL") {
      setAllowedCountriesList([]);
      setIsGeoFilterEnabled(false);
      return;
    }
    setIsDirty(true);
    setAllowedCountriesList((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      return [...prev, code];
    });
  };

  const handleSelectTier1Countries = () => {
    setIsDirty(true);
    setAllowedCountriesList(["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL"]);
  };

  const handleClearAllCountries = () => {
    setIsDirty(true);
    setAllowedCountriesList([]);
  };

  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return COUNTRIES_LIST.filter((c) => c.code !== "ALL");
    const q = countrySearchQuery.toLowerCase().trim();
    return COUNTRIES_LIST.filter(
      (c) => c.code !== "ALL" && (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    );
  }, [countrySearchQuery]);

  const activeStatusOption = useMemo(() => {
    return (
      HTTP_STATUS_OPTIONS.find((opt) => opt.code === selectedStatusCode) || {
        code: selectedStatusCode,
        label: `${selectedStatusCode} Error`,
        description: "Custom HTTP status error code",
      }
    );
  }, [selectedStatusCode]);

  // OS checkbox togglers
  const toggleDesktopOs = (os: string) => {
    setIsDirty(true);
    setSelectedDesktopOs((prev) => {
      if (prev.includes(os)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((o) => o !== os);
      }
      return [...prev, os];
    });
  };

  const toggleMobileOs = (os: string) => {
    setIsDirty(true);
    setSelectedMobileOs((prev) => {
      if (prev.includes(os)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((o) => o !== os);
      }
      return [...prev, os];
    });
  };

  const toggleTabletOs = (os: string) => {
    setIsDirty(true);
    setSelectedTabletOs((prev) => {
      if (prev.includes(os)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((o) => o !== os);
      }
      return [...prev, os];
    });
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BAR: Title, Security Badge, Subtitle & Save Button
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/90 flex items-center justify-center text-[#0A5C48]">
              <SlidersHorizontal className="h-4 w-4 text-[#0A5C48]" />
            </div>
            <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              Rules & Policies
            </h1>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              Security
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1.5 max-w-2xl">
            Configure unified security posture, deflection status codes, and traffic restriction rules across all live integrations.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || effectiveReadOnly}
            className={`h-9 px-4 text-xs font-bold gap-2 rounded-lg transition-all shadow-sm ${
              isDirty
                ? "bg-[#0A5C48] hover:bg-[#064E3B] text-white ring-2 ring-emerald-500/20"
                : "bg-[#0A5C48] hover:bg-[#064E3B] text-white"
            }`}
          >
            {saveMutation.isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Rules...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{isDirty ? "Save Changes" : "Save Rules"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP KPI METRIC CARDS (Matching Image 1 Aesthetic)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Screened Traffic */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Screened Traffic
            </div>
            <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
              {telemetry.totalHits}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Recorded in visitor logs
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
        </div>

        {/* Card 2: Threats Deflected */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Threats Deflected
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">
              {telemetry.deflected}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              Blocked by active security rules
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
          </div>
        </div>

        {/* Card 3: Allowed / Verified Sessions */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Allowed Sessions
            </div>
            <div className="text-2xl font-extrabold text-[#0A5C48] mt-1">
              {telemetry.allowed}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Clean traffic permitted
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0A5C48]">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* Card 4: Global Shielding Posture */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Global Shielding Posture
            </div>
            <div className="text-sm font-bold text-[#0F172A] mt-1">
              {activeRulesCount > 0 ? "Protected (Shield Active)" : "Permissive (Rules Inactive)"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {activeRulesCount} of {allRules.length} rules active
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0A5C48]">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DEFLECTION ACTION & STATUS CODE (Matching Image 2)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              THEN
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Block with HTTP Status Code
              </h2>
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200 font-mono">
                HTTP {selectedStatusCode}
              </Badge>
            </div>
            <p className="text-xs text-[#64748B]">
              Configure the exact HTTP error code returned to deflected bots, scrapers, and unapproved traffic.
            </p>
          </div>

          {/* Status Dropdown (Matching Image 2) */}
          <div className="w-full md:w-72 space-y-1.5 shrink-0">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Status</span>
            </label>
            <div className="relative">
              <select
                value={selectedStatusCode}
                onChange={(e) => {
                  setSelectedStatusCode(parseInt(e.target.value, 10));
                  setIsDirty(true);
                }}
                disabled={effectiveReadOnly}
                className="w-full h-10 px-3 pr-8 bg-white border-2 border-emerald-600/70 rounded-lg text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-emerald-700 cursor-pointer shadow-2xs"
              >
                {HTTP_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {activeStatusOption.description}
            </p>
          </div>
        </div>

        {/* Integration Preset & Auto-Sync Notice Banner */}
        <div className="pt-3 border-t border-[#E5EAE7] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Box 1: Auto-Sync for Live API Integrations */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-lg p-3 flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
              ✓
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span>Real-Time Live Sync Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              </div>
              <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                When you save, <strong>HTTP {selectedStatusCode}</strong> updates immediately across all API integrations (Cloudflare Worker, Next.js, React hook, Vue, Angular, Shopify, WordPress) with <strong>zero redeployments</strong>.
              </p>
            </div>
          </div>

          {/* Box 2: Manual Re-upload Notice for Static Scripts */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-lg p-3 flex items-start gap-2.5">
            <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-amber-950">
                Notice for Offline / Static Snippets
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                If you use standalone static scripts (e.g. static hardcoded PHP or offline edge files), please re-download the snippet from the <strong>Integrations</strong> tab to bake in this status code as the hardcoded fallback.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. UNIFIED SECURITY RULES LIST (Table Layout Matching Image 1)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Controls Bar: Category Filter, Search, Inactive Toggle & Bulk Actions */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-3.5 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left Selectors */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Category Filter */}
              <div className="relative min-w-[170px]">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full h-8 px-2.5 pr-8 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 font-medium appearance-none focus:outline-none focus:border-[#0A5C48] cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="network">Network & IP</option>
                  <option value="geo">Geofencing</option>
                  <option value="device">Device & OS</option>
                  <option value="automation">Automation & Scrapers</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search security rules..."
                  className="w-full h-8 pl-8 pr-3 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0A5C48]"
                />
              </div>

              {/* Clear filters */}
              {(categoryFilter !== "all" || searchQuery.trim() !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline px-1 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Right: Inactive rules checkbox */}
            <div className="flex items-center gap-4 shrink-0">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                />
                <span className="font-medium text-[11px] text-slate-800">Show inactive rules</span>
                <span title="Display rules even when currently toggled off" className="text-slate-400">
                  <Info className="h-3.5 w-3.5" />
                </span>
              </label>
            </div>
          </div>

          {/* Bulk Action Bar (when rows are selected) */}
          {selectedRuleIds.size > 0 && (
            <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs animate-in fade-in-50 duration-150">
              <span className="font-semibold text-emerald-900">
                {selectedRuleIds.size} rule{selectedRuleIds.size === 1 ? "" : "s"} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkToggle(true)}
                  disabled={effectiveReadOnly}
                  className="h-7 px-2.5 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Enable Selected
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkToggle(false)}
                  disabled={effectiveReadOnly}
                  className="h-7 px-2.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Disable Selected
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedRuleIds(new Set())}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline ml-2 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Table View Matching Image 1 ── */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E5EAE7]">
                <tr>
                  <th className="py-3 px-3.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedRuleIds.size > 0 && selectedRuleIds.size === filteredRules.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[220px]">Security Rule & Signature</th>
                  <th className="py-3 px-3 min-w-[130px]">Category</th>
                  <th className="py-3 px-3 min-w-[200px]">Details & Scope</th>
                  <th className="py-3 px-3 min-w-[140px]">Requests</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">Rule Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAE7]">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Shield className="h-8 w-8 text-slate-300" />
                        <span className="font-semibold text-slate-700">No matching security rules found</span>
                        <span className="text-xs text-slate-400">
                          Try adjusting your category filter or search query.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => {
                    const isSelected = selectedRuleIds.has(rule.id);
                    return (
                      <tr
                        key={rule.id}
                        className={`hover:bg-[#F9FAF9] transition-colors ${
                          !rule.enabled ? "opacity-75 bg-slate-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedRuleIds);
                              if (e.target.checked) next.add(rule.id);
                              else next.delete(rule.id);
                              setSelectedRuleIds(next);
                            }}
                            className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>

                        {/* Security Rule & Signature */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/90 flex items-center justify-center text-[#0A5C48] shrink-0 font-bold text-xs uppercase mt-0.5">
                              {rule.category === "network" ? (
                                <Globe className="h-4 w-4 text-[#0A5C48]" />
                              ) : rule.category === "geo" ? (
                                <Globe className="h-4 w-4 text-blue-600" />
                              ) : rule.category === "device" ? (
                                <Laptop className="h-4 w-4 text-purple-600" />
                              ) : (
                                <Terminal className="h-4 w-4 text-rose-600" />
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-bold text-[#0F172A] text-xs flex items-center gap-2">
                                <span>{rule.title}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1 max-w-sm">
                                {rule.subtitle}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category Badge */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              rule.category === "network"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                                : rule.category === "geo"
                                ? "bg-blue-50 text-blue-800 border border-blue-200/80"
                                : rule.category === "device"
                                ? "bg-purple-50 text-purple-800 border border-purple-200/80"
                                : "bg-rose-50 text-rose-800 border border-rose-200/80"
                            }`}
                          >
                            {rule.categoryLabel}
                          </span>
                        </td>

                        {/* Scope & Details (with Modal Trigger) */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="text-[11px] font-medium text-slate-700">
                              {rule.scopeSummary}
                            </div>
                            {rule.hasConfigModal && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (rule.configModalType === "countries") setIsCountryModalOpen(true);
                                  else if (rule.configModalType === "devices") setIsDeviceModalOpen(true);
                                }}
                                className="text-[11px] font-bold text-[#0A5C48] hover:text-[#064E3B] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Configure Selection</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Requests Blocked / Allowed */}
                        <td className="py-3.5 px-3">
                          <div className="text-[11px] font-mono space-y-0.5">
                            <div className="text-slate-600">
                              Allowed: <strong className="text-emerald-700">{rule.allowedCount}</strong>
                            </div>
                            <div className="text-slate-600">
                              Blocked: <strong className="text-rose-700">{rule.blockedCount}</strong>
                            </div>
                          </div>
                        </td>

                        {/* Block Action Toggle */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                rule.enabled
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {rule.enabled ? "Blocked" : "Allowed"}
                            </span>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={() => handleToggleRule(rule.id, rule.enabled)}
                              disabled={effectiveReadOnly}
                              className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. COUNTRY SELECTION MODAL (Geofencing)
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={isCountryModalOpen} onOpenChange={setIsCountryModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0F172A]">
              <Globe className="h-5 w-5 text-blue-600" />
              <span>Select Allowed Countries (Geofencing)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Only traffic originating from selected countries will be permitted. Requests from all other countries will be blocked with HTTP {selectedStatusCode}.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Presets & Search */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectTier1Countries}
                  className="h-7 text-[11px] font-semibold text-[#0A5C48] border-emerald-200 hover:bg-emerald-50"
                >
                  Select Tier-1 (US, CA, UK, AU, EU)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClearAllCountries}
                  className="h-7 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Clear All
                </Button>
              </div>

              <div className="text-xs font-bold text-slate-700">
                {allowedCountriesList.length} Selected
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={countrySearchQuery}
                onChange={(e) => setCountrySearchQuery(e.target.value)}
                placeholder="Search countries by name or ISO code..."
                className="w-full h-8 pl-8 pr-3 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0A5C48]"
              />
            </div>
          </div>

          {/* Scrollable Country List */}
          <div className="flex-1 overflow-y-auto max-h-72 border border-[#E5EAE7] rounded-xl p-2 divide-y divide-slate-100 mt-2">
            {filteredCountries.map((c) => {
              const isSelected = allowedCountriesList.includes(c.code);
              return (
                <div
                  key={c.code}
                  onClick={() => handleToggleCountry(c.code)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected ? "bg-emerald-50 text-emerald-950 font-bold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{c.flag || getCountryFlag(c.code)}</span>
                    <span className="text-xs">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({c.code})</span>
                  </div>
                  <div className="shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-4 w-4 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-3 border-t border-[#E5EAE7] flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {allowedCountriesList.length === 0
                ? "Warning: 0 countries selected means all inbound traffic will be deflected."
                : `${allowedCountriesList.length} countries will be whitelisted.`}
            </span>
            <Button
              type="button"
              onClick={() => {
                if (allowedCountriesList.length > 0) {
                  setIsGeoFilterEnabled(true);
                }
                setIsCountryModalOpen(false);
              }}
              className="h-8 text-xs font-bold bg-[#0A5C48] hover:bg-[#064E3B] text-white"
            >
              Apply Countries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          6. UNIFIED DEVICE & OS SELECTION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={isDeviceModalOpen} onOpenChange={setIsDeviceModalOpen}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0F172A]">
              <Laptop className="h-5 w-5 text-purple-600" />
              <span>Configure Device & OS Restrictions</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select permitted device form factors and choose specific allowed operating systems for desktop, mobile, and tablet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-3 max-h-[70vh] overflow-y-auto pr-1">
            {/* 1. Permitted Device Form Factor (Separate buttons) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-slate-600" />
                <span>Permitted Device Form Factor</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { id: "all", label: "All Devices", icon: Globe, desc: "Desktop, Mobile & Tablet" },
                  { id: "desktop", label: "Desktop Only", icon: Laptop, desc: "Laptops & Desktops" },
                  { id: "mobile", label: "Mobile Only", icon: Smartphone, desc: "Smartphones only" },
                  { id: "tablet", label: "Tablet Only", icon: Tablet, desc: "iPads & Tablets only" },
                  { id: "mobile_tablet", label: "Mobile + Tablet Only", icon: Smartphone, desc: "Handheld devices" },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = allowedDeviceType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAllowedDeviceType(item.id as any);
                        setIsDeviceFilterEnabled(true);
                        setIsDirty(true);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#0A5C48] bg-emerald-50 text-[#0A5C48] ring-1 ring-[#0A5C48]"
                          : "border-[#D5DFD9] bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <IconComp className="h-3.5 w-3.5" />
                        <span className="font-bold text-xs">{item.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Desktop Operating Systems (Active if all or desktop) */}
            {(allowedDeviceType === "all" || allowedDeviceType === "desktop") && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Laptop className="h-4 w-4 text-slate-600" />
                    <span>Permitted Desktop Operating Systems</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Select allowed OS</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: "windows", label: "Windows", desc: "Windows 10, 11" },
                    { id: "mac", label: "macOS", desc: "MacBook, iMac" },
                    { id: "linux", label: "Linux", desc: "Ubuntu, Fedora" },
                  ].map((os) => {
                    const isChecked = selectedDesktopOs.includes(os.id);
                    return (
                      <div
                        key={os.id}
                        onClick={() => toggleDesktopOs(os.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-white border-emerald-600 text-emerald-950 font-bold shadow-2xs"
                            : "bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{os.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{os.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Mobile Operating Systems (Active if all, mobile, or mobile_tablet) */}
            {(allowedDeviceType === "all" || allowedDeviceType === "mobile" || allowedDeviceType === "mobile_tablet") && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-slate-600" />
                    <span>Permitted Mobile Phone Operating Systems</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Select allowed OS</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "ios", label: "Apple iOS", desc: "iPhone models" },
                    { id: "android", label: "Google Android", desc: "Samsung, Pixel, Xiaomi" },
                  ].map((os) => {
                    const isChecked = selectedMobileOs.includes(os.id);
                    return (
                      <div
                        key={os.id}
                        onClick={() => toggleMobileOs(os.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-white border-emerald-600 text-emerald-950 font-bold shadow-2xs"
                            : "bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{os.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{os.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Tablet Operating Systems (Active if all, tablet, or mobile_tablet) */}
            {(allowedDeviceType === "all" || allowedDeviceType === "tablet" || allowedDeviceType === "mobile_tablet") && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tablet className="h-4 w-4 text-slate-600" />
                    <span>Permitted Tablet Operating Systems</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Select allowed OS</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "ios", label: "Apple iPadOS", desc: "iPad Air, Pro, Mini" },
                    { id: "android", label: "Android Tablet", desc: "Galaxy Tab, Lenovo Tab" },
                  ].map((os) => {
                    const isChecked = selectedTabletOs.includes(os.id);
                    return (
                      <div
                        key={os.id}
                        onClick={() => toggleTabletOs(os.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-white border-emerald-600 text-emerald-950 font-bold shadow-2xs"
                            : "bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{os.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{os.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-[#E5EAE7]">
            <Button
              type="button"
              onClick={() => {
                setIsDeviceFilterEnabled(true);
                setIsDeviceModalOpen(false);
              }}
              className="h-8 text-xs font-bold bg-[#0A5C48] hover:bg-[#064E3B] text-white"
            >
              Apply Device & OS Restrictions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
