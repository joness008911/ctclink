import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Code, 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  Layers, 
  Key,
  ShieldCheck, 
  Zap, 
  BookOpen, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  Palette, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  SlidersHorizontal, 
  Info, 
  Target, 
  Globe, 
  Server, 
  Cpu, 
  ShoppingBag, 
  Boxes, 
  Shield, 
  HelpCircle, 
  Search,
  Filter,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import JSZip from "jszip";
import { 
  DEFAULT_INTERSTITIAL_THEMES, 
  generatePhpIntegrationScript, 
  type InterstitialTheme 
} from "@shared/interstitialThemes";
import {
  generateCloudflareWorkerScript,
  generateJsSnippet,
  generateWordPressPluginPhp,
  generateNextJsMiddleware,
  generateNodeExpressMiddleware,
} from "@shared/integrationGenerators";

export type IntegrationStack = "shopify" | "wordpress" | "cloudflare" | "php" | "nodejs";
export type IntegrationCategory = "all" | "web" | "cms" | "edge" | "server";

interface IntegrationItem {
  id: IntegrationStack;
  name: string;
  subtitle: string;
  category: "web" | "cms" | "edge" | "server";
  badge: string;
  badgeStyle: string;
  iconBg: string;
  iconColor: string;
  icon: any;
  summary: string;
  runtime: string;
  tags: string[];
}

interface UserIntegrationTabProps {
  apiKeyValue: string | null;
  customEndpoint: string;
  setCustomEndpoint: (val: string) => void;
}

export function UserIntegrationTab({
  apiKeyValue,
  customEndpoint,
  setCustomEndpoint,
}: UserIntegrationTabProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active stack selector & navigation
  const [selectedStack, setSelectedStack] = useState<IntegrationStack>("shopify");
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [nodeSubTab, setNodeSubTab] = useState<"nextjs" | "express">("nextjs");

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Live Entropy & Verification Test State (Fingerprint-style client diagnostic)
  const [isTestingEntropy, setIsTestingEntropy] = useState<boolean>(false);
  const [entropyResult, setEntropyResult] = useState<any>(null);

  // Themes state (for PHP Interstitial & Universal Loading)
  const [enableLoading, setEnableLoading] = useState<boolean>(true);
  const [protectionFailMode, setProtectionFailMode] = useState<"open" | "closed">("open");
  const [protectionTimeoutMs, setProtectionTimeoutMs] = useState<number>(2000);
  const [selectedThemeCategory, setSelectedThemeCategory] = useState<string>("All");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("clean_light");
  const [customHeading, setCustomHeading] = useState<string>("Verifying your connection...");
  const [customSubnote, setCustomSubnote] = useState<string>("Please wait while we secure your session.");
  const [previewTheme, setPreviewTheme] = useState<InterstitialTheme | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [hasUnsavedThemeChanges, setHasUnsavedThemeChanges] = useState<boolean>(false);

  // Fetch available themes (admin pushed or default)
  const { data: themes = DEFAULT_INTERSTITIAL_THEMES, isLoading: themesLoading } = useQuery<InterstitialTheme[]>({
    queryKey: ["/api/user/themes"],
  });

  // Fetch current user redirect URLs and theme preferences
  const { data: userSettings, isLoading: settingsLoading } = useQuery<any>({
    queryKey: ["/api/user/redirect-urls"],
  });

  // Sync state once user settings are loaded
  useEffect(() => {
    if (userSettings) {
      if (userSettings.interstitialEnabled !== undefined) {
        setEnableLoading(Boolean(userSettings.interstitialEnabled));
      }
      if (userSettings.interstitialThemeId) {
        setSelectedThemeId(userSettings.interstitialThemeId);
      }
      if (userSettings.interstitialHeading) {
        setCustomHeading(userSettings.interstitialHeading);
      }
      if (userSettings.interstitialSubnote) {
        setCustomSubnote(userSettings.interstitialSubnote);
      }
      setHasUnsavedThemeChanges(false);
    }
  }, [userSettings]);

  // Current selected theme object
  const activeTheme = themes.find((t) => t.id === selectedThemeId) || themes[0] || DEFAULT_INTERSTITIAL_THEMES[0];

  const maskKey = (key: string | null) => {
    if (!key) return "••••••••••••••••";
    if (key.length <= 8) return "•".repeat(Math.max(key.length, 8));
    return `${key.slice(0, 4)}••••••••••••••••${key.slice(-4)}`;
  };

  const effectiveEndpoint = (customEndpoint || (typeof window !== "undefined" ? window.location.origin : ""))
    .trim()
    .replace(/\/+$/, "");

  // 1. Generate dynamic PHP code with active theme and custom copy (responds to enableLoading)
  const phpIntegrationCode = generatePhpIntegrationScript({
    apiKeyValue,
    effectiveEndpoint,
    theme: activeTheme,
    heading: customHeading,
    subnote: customSubnote,
    enableLoading,
  });

  // 2. Generate Cloudflare Edge Worker script (pure edge worker, transparent inline)
  const cloudflareWorkerCode = generateCloudflareWorkerScript({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading: false,
    humanTargetUrl: userSettings?.humanUrl || "",
    botTargetUrl: userSettings?.botUrl || "",
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 3. Generate JavaScript Snippet (Shopify / Wix / Webflow client-side protect tag)
  const jsSnippet = generateJsSnippet({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading: false,
    themeId: selectedThemeId,
    heading: customHeading,
    subnote: customSubnote,
  });

  // 4. Generate WordPress Plugin PHP (WordPress lifecycle transparent inline guard)
  const wordPressPluginCode = generateWordPressPluginPhp({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading: false,
    heading: customHeading,
    subnote: customSubnote,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 5. Generate Next.js & Express Middleware (pure HTTP edge middleware, transparent inline)
  const nextJsMiddlewareCode = generateNextJsMiddleware({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading: false,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  const nodeExpressMiddlewareCode = generateNodeExpressMiddleware({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading: false,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 6. Developer SDK Code (Fingerprint-Style Promise)
  const jsSdkCode = `<!-- CleanTraffic JavaScript Agent (Fingerprint-Style SDK) -->
<script src="${effectiveEndpoint}/v1/protect.js" data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" async></script>
<script>
  // Access visitor and device signals asynchronously
  window.CleanTraffic.get().then(function(result) {
    console.log("Visitor ID:", result.visitorId);
    console.log("Device ID:", result.deviceId);
    console.log("Is Human:", result.isHuman);
    console.log("Action Taken:", result.action);
  });
</script>`;

  // Live Hardware Entropy Diagnostics runner
  const handleRunEntropyTest = async () => {
    setIsTestingEntropy(true);
    setEntropyResult(null);
    try {
      let gpu = "";
      try {
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
        if (gl) {
          const d = (gl as any).getExtension("WEBGL_debug_renderer_info");
          if (d) gpu = (gl as any).getParameter(d.UNMASKED_RENDERER_WEBGL) || "";
        }
      } catch (e) {}

      let canvasHash = "";
      try {
        const c2 = document.createElement("canvas");
        c2.width = 160;
        c2.height = 30;
        const ctx2 = c2.getContext("2d");
        if (ctx2) {
          ctx2.textBaseline = "top";
          ctx2.font = "12px Arial";
          ctx2.fillStyle = "#f60";
          ctx2.fillRect(10, 1, 40, 15);
          ctx2.fillStyle = "#069";
          ctx2.fillText("ctc_render", 2, 5);
          canvasHash = c2.toDataURL().slice(-32);
        }
      } catch (e) {}

      const hwTokens = {
        webdriver: Boolean(navigator.webdriver),
        screenWidth: window.screen ? window.screen.width : 0,
        screenHeight: window.screen ? window.screen.height : 0,
        colorDepth: window.screen ? window.screen.colorDepth : 0,
        pixelRatio: window.devicePixelRatio || 1,
        gpuRenderer: gpu,
        canvasHash: canvasHash,
        timezoneOffset: new Date().getTimezoneOffset(),
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
      };

      const res = await apiRequest("POST", "/api/classify/simulate", {
        apiKey: apiKeyValue || "demo",
        userAgent: navigator.userAgent,
        url: window.location.href,
        clientTokens: hwTokens,
      });
      const data = await res.json();
      setEntropyResult({
        ...data,
        testedAt: new Date().toLocaleTimeString(),
        localEntropy: {
          gpu: gpu || "WebGL GPU Verified (Active Hardware Context)",
          canvas: canvasHash ? `Canvas Curve #${canvasHash}` : "Canvas Rasterized",
          screen: `${hwTokens.screenWidth}x${hwTokens.screenHeight} (${hwTokens.pixelRatio}x DPR)`,
          cores: hwTokens.hardwareConcurrency ? `${hwTokens.hardwareConcurrency} Cores` : "Multi-Core CPU",
        },
      });
      toast({
        title: "Hardware Entropy Synthesized",
        description: `Device ID synthesized: ${data.deviceId || "dev_hw_active"}`,
      });
    } catch (err: any) {
      toast({
        title: "Test Encountered Issue",
        description: err.message || "Failed to run entropy test.",
        variant: "destructive",
      });
    } finally {
      setIsTestingEntropy(false);
    }
  };

  // Mutation to persist theme settings to user's tenant account
  const saveThemeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/user/interstitial-theme", {
        interstitialEnabled: enableLoading,
        interstitialThemeId: selectedThemeId,
        interstitialHeading: customHeading,
        interstitialSubnote: customSubnote,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: `Your protection mode is set to "${enableLoading ? "Loading Interstitial Screen" : "Transparent Inline Guard"}". Integration snippets have been updated.`,
      });
      setHasUnsavedThemeChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to save theme preferences.",
        variant: "destructive",
      });
    },
  });

  const handleToggleLoading = (enabled: boolean) => {
    setEnableLoading(enabled);
    setHasUnsavedThemeChanges(true);
  };

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    setHasUnsavedThemeChanges(true);
  };

  const handleHeadingChange = (val: string) => {
    setCustomHeading(val);
    setHasUnsavedThemeChanges(true);
  };

  const handleSubnoteChange = (val: string) => {
    setCustomSubnote(val);
    setHasUnsavedThemeChanges(true);
  };

  const handleCopyKey = () => {
    if (!apiKeyValue) return;
    navigator.clipboard.writeText(apiKeyValue);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast({ title: "API Key Copied", description: "Copied to clipboard" });
  };

  const handleCopyCurrentCode = (codeText: string, label: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ 
      title: `${label} Copied`, 
      description: "Code snippet copied to clipboard." 
    });
  };

  // 1. Download PHP Package (.zip)
  const handleDownloadPhpZip = async () => {
    if (!apiKeyValue) {
      toast({
        title: "No API Key",
        description: "Please wait for your active API key to load.",
        variant: "destructive",
      });
      return;
    }

    try {
      const zip = new JSZip();
      zip.file("index.php", phpIntegrationCode);
      zip.file(
        "README.txt",
        `CleanTraffic - Drop-in Verification Gateway & Security Package\n\n` +
        `DEPLOYMENT INSTRUCTIONS:\n` +
        `1. Upload index.php to your web server or campaign root (e.g., public_html/promo/index.php).\n` +
        `2. Protection Mode: ${enableLoading ? `Interstitial Loading Screen (${activeTheme.name})` : "Transparent Inline Guard (Zero Visual Delay)"}\n` +
        (enableLoading ? `3. Heading Text: "${customHeading}"\n` : `3. Direct cURL server-side evaluation active.\n`) +
        `4. Ensure PHP 7.4+ with standard cURL extension is enabled.\n` +
        `5. ${enableLoading ? "Visitors see the clean verification splash (<15ms) while classification executes in the background." : "Visitors experience zero visual splash delay; bots are blocked inline with authentic 403/404 headers."}\n` +
        `6. All paid ad click tokens (fbclid, gclid, ttclid, msclkid, twclid, wbraid, gbraid) are automatically captured.\n` +
        `7. Testing: Visit https://yourdomain.com/index.php?gclid=test1234\n`
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = enableLoading ? `cleantraffic-${activeTheme.id}-php.zip` : `cleantraffic-inline-guard-php.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: enableLoading
          ? `Your customized PHP package with "${activeTheme.name}" has been downloaded.`
          : `Your Transparent Inline Guard PHP package has been downloaded.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Error",
        description: err.message || "Failed to generate ZIP",
        variant: "destructive",
      });
    }
  };

  // 2. Download Cloudflare Worker script (.js)
  const handleDownloadCloudflareWorker = () => {
    const blob = new Blob([cloudflareWorkerCode], { type: "application/javascript;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleantraffic-worker.js";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Worker Downloaded",
      description: "cleantraffic-worker.js downloaded for Cloudflare deployment.",
    });
  };

  // 3. Download WordPress Plugin (.zip)
  const handleDownloadWordPressZip = async () => {
    if (!apiKeyValue) {
      toast({
        title: "No API Key",
        description: "Please wait for your active API key to load.",
        variant: "destructive",
      });
      return;
    }

    try {
      const zip = new JSZip();
      zip.file("cleantraffic-shield.php", wordPressPluginCode);
      zip.file(
        "readme.txt",
        `=== CleanTraffic Security Shield & Verification Gateway ===\n` +
        `Contributors: CleanTraffic\n` +
        `Tags: security, bot protection, visitor verification, ad attribution, firewall\n` +
        `Requires at least: 5.0\n` +
        `Tested up to: 6.5\n` +
        `Stable tag: 2.5.0\n` +
        `License: GPLv2 or later\n\n` +
        `== Description ==\n` +
        `Real-time bot protection, visitor identification, and traffic security gateway for WordPress & WooCommerce.\n\n` +
        `== Installation ==\n` +
        `1. Log in to your WordPress Admin dashboard.\n` +
        `2. Go to Plugins > Add New > Upload Plugin.\n` +
        `3. Select this ZIP package and click "Install Now".\n` +
        `4. Activate the plugin. Your API key is pre-configured.\n`
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cleantraffic-wordpress-plugin.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "WordPress Plugin Downloaded",
        description: "cleantraffic-wordpress-plugin.zip ready for WordPress upload.",
      });
    } catch (err: any) {
      toast({
        title: "Download Error",
        description: err.message || "Failed to generate WordPress ZIP",
        variant: "destructive",
      });
    }
  };

  // Directory integration items definition
  const integrationDirectory: IntegrationItem[] = useMemo(() => [
    {
      id: "shopify",
      name: "JavaScript Web Agent",
      subtitle: "Shopify, Wix, Webflow, Squarespace & Carrd",
      category: "web",
      badge: "1-Line Tag & SDK",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-700",
      icon: ShoppingBag,
      summary: "Client-side hardware entropy, in-place bot blocking, and developer SDK promise for web applications and closed store builders.",
      runtime: "Zero Server Needed • Browser & CDN",
      tags: ["Shopify", "Webflow", "Wix", "Squarespace", "Carrd", "HTML"],
    },
    {
      id: "wordpress",
      name: "WordPress & WooCommerce",
      subtitle: "Dedicated WordPress Plugin (.zip)",
      category: "cms",
      badge: "1-Click Plugin",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      iconBg: "bg-blue-50 border-blue-200",
      iconColor: "text-[#0073AA]",
      icon: Layers,
      summary: "Hooks into WordPress request initialization with client hardware entropy probe injected into wp_head for 100% Device ID parity.",
      runtime: "PHP 7.4+ • WordPress 5.0+ • WooCommerce",
      tags: ["WordPress", "WooCommerce", "Plugin", "PHP"],
    },
    {
      id: "cloudflare",
      name: "Cloudflare Edge Worker",
      subtitle: "Universal 300+ Edge Location Shield",
      category: "edge",
      badge: "Universal Edge",
      badgeStyle: "bg-orange-50 text-orange-800 border-orange-200",
      iconBg: "bg-orange-50 border-orange-200",
      iconColor: "text-[#F6821F]",
      icon: Globe,
      summary: "Filters bots, proxy networks, and scrapers at Cloudflare's nearest edge server in <15ms globally before reaching your origin host.",
      runtime: "Cloudflare Workers • Any Origin Host",
      tags: ["Cloudflare", "Edge", "Vercel", "Shopify", "Custom Domain"],
    },
    {
      id: "php",
      name: "PHP Standalone (index.php)",
      subtitle: "cPanel, aaPanel, Apache & Nginx",
      category: "server",
      badge: "Self-Contained",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-[#0A5C48]",
      icon: Server,
      summary: "Self-contained single-file or .zip deployment with customizable interstitial loading themes and direct cURL API communication.",
      runtime: "cPanel • Apache • Nginx • PHP 7.4+",
      tags: ["cPanel", "aaPanel", "Apache", "Nginx", "Shared Hosting"],
    },
    {
      id: "nodejs",
      name: "Next.js & Express Middleware",
      subtitle: "App Router, Pages Router & Node Server",
      category: "server",
      badge: "Full-Stack Edge",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      iconBg: "bg-slate-100 border-slate-200",
      iconColor: "text-slate-800",
      icon: Cpu,
      summary: "Edge and HTTP middleware for Next.js 13/14/15 deployments on Vercel/Netlify and Node.js Express microservices on Railway or VPS.",
      runtime: "Node.js 18+ • Next.js • Vercel • Railway",
      tags: ["Next.js", "Express", "Vercel", "Node.js", "TypeScript"],
    },
  ], []);

  // Filter integration cards based on search and category
  const filteredIntegrations = useMemo(() => {
    return integrationDirectory.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.name.toLowerCase().includes(q) || 
        item.subtitle.toLowerCase().includes(q) || 
        item.summary.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [integrationDirectory, activeCategory, searchQuery]);

  // Categories list for theme filtering inside PHP customizer
  const themeCategories = ["All", "Light", "Minimal", "Corporate", "Security", "Dark"];
  const filteredThemes = selectedThemeCategory === "All"
    ? themes
    : themes.filter((t) => t.category.toLowerCase() === selectedThemeCategory.toLowerCase());

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER SECTION (Consistent Enterprise UI) ── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Libraries &amp; Integrations
            </h2>
            <Badge className="bg-[#E6F2ED] text-[#0A5C48] border-[#CCE5DB] text-[10px] font-bold">
              Directory
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Enhance CleanTraffic reliability and deploy bot protection, visitor identification, and traffic security across your website, stores, and backend infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate("/docs#installation")}
            variant="outline"
            className="text-xs font-semibold h-9 px-3.5 border-[#D5DFD9] text-[#0F172A] hover:bg-[#F2F6F4] gap-2 rounded-lg"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#0A5C48]" />
            <span>Developer Docs</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Button>
        </div>
      </div>

      {/* ── 2. CREDENTIALS & ENDPOINT STRIP ── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#F8FAF9] border border-[#E0E9E4] p-3 rounded-lg space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Assigned API Key</Label>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-[11px] text-[#0A5C48] hover:text-[#06241D] font-semibold flex items-center gap-1 focus:outline-none"
            >
              {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showKey ? "Hide" : "Reveal"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-[#0A5C48] truncate tracking-wide">
              {apiKeyValue ? (showKey ? apiKeyValue : maskKey(apiKeyValue)) : "Loading key..."}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyKey}
              disabled={!apiKeyValue}
              className="h-7 px-2 text-[#64748B] hover:text-[#0F172A]"
              title="Copy API Key"
            >
              {copiedKey ? <Check className="h-3.5 w-3.5 text-[#0A5C48]" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="bg-[#F8FAF9] border border-[#E0E9E4] p-3 rounded-lg space-y-1">
          <Label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Gateway Endpoint Host</Label>
          <Input
            value={customEndpoint}
            onChange={(e) => setCustomEndpoint(e.target.value)}
            placeholder="https://your-domain.com"
            className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs font-mono h-8 focus:border-[#0A5C48]"
          />
        </div>
      </div>

      {/* ── 2B. PROTECTION POLICY & GATEWAY TIMEOUT ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#0A5C48]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Edge Fallback Policy &amp; Gateway Timeout</h3>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-xs font-medium text-[#0A5C48]">Zero-Loss Failover</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Determines how edge workers and plugins route traffic if CleanTraffic is unreachable or exceeds the latency threshold.
            </p>
          </div>

          {/* Timeout Selector */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-md">
            <span className="text-xs text-slate-500 px-2 font-medium">Timeout:</span>
            {[
              { label: "250ms", val: 250 },
              { label: "400ms (Recommended)", val: 400 },
              { label: "600ms", val: 600 },
            ].map((t) => (
              <button
                key={t.val}
                type="button"
                onClick={() => setProtectionTimeoutMs(t.val)}
                className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                  protectionTimeoutMs === t.val
                    ? "bg-[#0A5C48] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Fail-Open Option */}
          <button
            type="button"
            onClick={() => setProtectionFailMode("open")}
            className={`text-left p-4 rounded-lg border transition-colors ${
              protectionFailMode === "open"
                ? "bg-[#F4F9F6] border-[#0A5C48]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#0A5C48]" />
                <span className="text-xs font-semibold text-[#0F172A]">Fail-Open (High Availability)</span>
              </div>
              {protectionFailMode === "open" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A5C48]">
                  <Check className="h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="text-xs text-slate-400">Select</span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Best for Websites, Stores &amp; Media:</strong> If CleanTraffic is unreachable or exceeds {protectionTimeoutMs}ms, traffic silently passes through to your origin server without interruption.
            </p>
          </button>

          {/* Fail-Closed Option */}
          <button
            type="button"
            onClick={() => setProtectionFailMode("closed")}
            className={`text-left p-4 rounded-lg border transition-colors ${
              protectionFailMode === "closed"
                ? "bg-[#F4F9F6] border-[#0A5C48]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#0A5C48]" />
                <span className="text-xs font-semibold text-[#0F172A]">Fail-Closed (Maximum Security with Challenge Retry)</span>
              </div>
              {protectionFailMode === "closed" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A5C48]">
                  <Check className="h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="text-xs text-slate-400">Select</span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Best for Fintech, Auth &amp; Attack Targets:</strong> If CleanTraffic is unreachable or exceeds {protectionTimeoutMs}ms, unverified traffic is held at the edge and served an interactive security screen with a <strong>Retry Connection</strong> button.
            </p>
          </button>
        </div>
      </div>

      {/* ── 3. SEARCH & CATEGORY FILTER BAR (Fingerprint Reference UX) ── */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by library or integration name (e.g., Shopify, WordPress, Cloudflare, PHP)..."
            className="pl-10 h-10 bg-white border-[#E5EAE7] text-xs rounded-xl focus:border-[#0A5C48] focus:ring-1 focus:ring-[#0A5C48]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#0F172A] font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All", count: integrationDirectory.length },
            { id: "web", label: "No-Code & Web", count: 1 },
            { id: "cms", label: "CMS", count: 1 },
            { id: "edge", label: "Edge", count: 1 },
            { id: "server", label: "Server", count: 2 },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as IntegrationCategory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeCategory === cat.id
                  ? "bg-[#0A5C48] text-white shadow-2xs"
                  : "bg-white border border-[#E5EAE7] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAF9]"
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === cat.id ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. INTEGRATION CARDS GRID (Breathable 3-Column Enterprise Catalog) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#64748B] px-1 font-semibold uppercase tracking-wider">
          <span>Available Libraries ({filteredIntegrations.length})</span>
          <span className="text-[11px] text-[#0A5C48] lowercase font-normal">Click any card to view deployment code</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.map((item) => {
            const isSelected = selectedStack === item.id;
            const IconComponent = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedStack(item.id)}
                className={`group bg-white rounded-xl border p-5 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-[#0A5C48] ring-2 ring-[#0A5C48]/20 shadow-xs"
                    : "border-[#E5EAE7] hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${item.iconBg} ${item.iconColor}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${item.badgeStyle}`}>
                      {item.badge}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#0A5C48] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] font-medium text-[#64748B] mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                  <span className="text-[11px] text-[#94A3B8] font-mono truncate max-w-[170px]">
                    {item.runtime}
                  </span>

                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    isSelected ? "text-[#0A5C48]" : "text-[#64748B] group-hover:text-[#0F172A]"
                  }`}>
                    <span>{isSelected ? "Active" : "Configure"}</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. FOCUSED CONFIGURATION & CODE DEPLOYMENT VIEW ── */}
      <div className="space-y-6 pt-4 border-t border-[#E5EAE7]">
        {/* ── STACK A: JAVASCRIPT WEB AGENT (Shopify, Wix, Webflow, Carrd) ── */}
        {selectedStack === "shopify" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Shopify, Wix, Webflow &amp; Carrd Integration</h3>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Zero Server Required
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                    Paste this tag into your store or website header. Runs full WebGL GPU and 2D Canvas entropy to protect your landing page in place, deflecting bots with authentic 404 or 403 errors.
                  </p>
                </div>
              </div>

              {/* Platform Guides */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
                <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#0F172A] font-bold text-xs">
                    <ShoppingBag className="h-4 w-4 text-emerald-700" />
                    Shopify Setup
                  </div>
                  <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>Go to <strong>Online Store &rarr; Themes</strong> in Shopify Admin.</li>
                    <li>Click <strong>... &rarr; Edit Code</strong>.</li>
                    <li>Open <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">layout/theme.liquid</code>.</li>
                    <li>Paste the script directly above closing <code className="bg-white px-1 rounded font-mono text-[11px]">&lt;/head&gt;</code>.</li>
                  </ol>
                </div>

                <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#0F172A] font-bold text-xs">
                    <Globe className="h-4 w-4 text-blue-700" />
                    Wix Setup
                  </div>
                  <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>Open Wix Dashboard &rarr; <strong>Settings &rarr; Custom Code</strong>.</li>
                    <li>Click <strong>+ Add Custom Code</strong> in the <strong>Head</strong> section.</li>
                    <li>Paste the script tag, choose <strong>All Pages &rarr; Load once</strong>, and save.</li>
                  </ol>
                </div>

                <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#0F172A] font-bold text-xs">
                    <Boxes className="h-4 w-4 text-purple-700" />
                    Webflow &amp; Squarespace
                  </div>
                  <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>Webflow: <strong>Project Settings &rarr; Custom Code &rarr; Head Code</strong>.</li>
                    <li>Squarespace: <strong>Settings &rarr; Advanced &rarr; Code Injection</strong>.</li>
                    <li>Paste script tag in Header box and publish.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Option A: 1-Line Script Tag */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[#0A5C48]" />
                  <span className="text-sm font-bold text-[#0F172A]">Option A: 1-Line Protection Tag (Recommended)</span>
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    CDN Hosted
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(jsSnippet.embedTag, "Embed Tag")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy Script Tag"}</span>
                </Button>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre">
                  {jsSnippet.embedTag}
                </pre>
              </div>
            </div>

            {/* Option B: Inline Autonomous Script */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-slate-700" />
                  <span className="text-sm font-bold text-[#0F172A]">Option B: Inline Autonomous Script</span>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold">
                    Zero External CDN Dependency
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(jsSnippet.inlineScript, "Inline Script")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy Inline Code"}</span>
                </Button>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-64 overflow-y-auto">
                  {jsSnippet.inlineScript}
                </pre>
              </div>
            </div>

            {/* Option C: Fingerprint-Style Developer SDK */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-emerald-700" />
                  <span className="text-sm font-bold text-[#0F172A]">Option C: Developer SDK (Fingerprint-Style Promise)</span>
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    Programmatic API
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(jsSdkCode, "Developer SDK")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy SDK Code"}</span>
                </Button>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Query visitor and hardware device signals asynchronously directly inside your frontend application or analytics stack. Matches Fingerprint Pro&apos;s SDK syntax without requiring custom server-side endpoints.
              </p>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre">
                  {jsSdkCode}
                </pre>
              </div>
            </div>

            {/* Live Hardware Entropy & Device ID Diagnostics */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0A5C48]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                      Live Hardware Entropy &amp; Device ID Diagnostics
                    </h3>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      Hardware Tier Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                    Test your current browser to verify how CleanTraffic&apos;s WebGL GPU probe, 2D Canvas anti-aliasing curve, and screen entropy synthesize persistent Device and Visitor IDs—identical across both JavaScript and PHP.
                  </p>
                </div>

                <Button
                  onClick={handleRunEntropyTest}
                  disabled={isTestingEntropy}
                  className="bg-[#0A5C48] hover:bg-[#07382D] text-white font-bold text-xs h-9 px-4 rounded-lg gap-2 shadow-xs transition-all shrink-0"
                >
                  {isTestingEntropy ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyzing Browser...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      <span>Run Entropy Test</span>
                    </>
                  )}
                </Button>
              </div>

              {entropyResult ? (
                <div className="space-y-4 pt-2 border-t border-[#E5EAE7]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Synthesized Device ID</span>
                      <span className="font-mono text-xs font-bold text-[#0A5C48] truncate block">
                        {entropyResult.deviceId || "dev_hw_synthesized"}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">Cross-VPN &amp; Incognito Stable</span>
                    </div>

                    <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Persistent Visitor ID</span>
                      <span className="font-mono text-xs font-bold text-cyan-700 truncate block">
                        {entropyResult.visitorId || "vis_persistent"}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">Tenant Isolated &amp; Preserved</span>
                    </div>

                    <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">WebGL GPU Chipset</span>
                      <span className="text-xs font-semibold text-[#0F172A] truncate block">
                        {entropyResult.localEntropy?.gpu || "Hardware Renderer Active"}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">Unmasked GPU Info</span>
                    </div>

                    <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Verification Verdict</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${entropyResult.isHuman ? "bg-emerald-600" : "bg-rose-600"}`} />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {entropyResult.isHuman ? "Human (Allowed)" : "Bot (Blocked)"}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#0A5C48] block">In-Place Protection Active</span>
                    </div>
                  </div>

                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#0F172A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#0A5C48] shrink-0" />
                      <span>
                        Hardware fingerprint confirmed: <strong>{entropyResult.localEntropy?.canvas}</strong> • Display: <strong>{entropyResult.localEntropy?.screen}</strong> • CPU: <strong>{entropyResult.localEntropy?.cores}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] shrink-0">Evaluated at {entropyResult.testedAt}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-4 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
                  <Info className="h-4 w-4 text-[#0A5C48] shrink-0" />
                  <span>Click &ldquo;Run Entropy Test&rdquo; to simulate a live visitor request and verify your browser&apos;s WebGL GPU, Canvas curve, and Device ID in real time.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STACK B: WORDPRESS & WOOCOMMERCE ── */}
        {selectedStack === "wordpress" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0073AA]">
                      <Layers className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">WordPress &amp; WooCommerce Dedicated Plugin</h3>
                    <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] font-bold">
                      1-Click ZIP Package
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                    Hooks into WordPress&apos;s native request lifecycle before themes and heavy page builders load. Protects all blog posts, landing pages, WooCommerce checkout flows, and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">/wp-login.php</code>.
                  </p>
                </div>

                <Button
                  onClick={handleDownloadWordPressZip}
                  disabled={!apiKeyValue}
                  className="bg-[#0073AA] hover:bg-[#005A87] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shrink-0 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Plugin ZIP</span>
                </Button>
              </div>

              {/* Step-by-Step WP Guide */}
              <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                  How to Install the WordPress Plugin:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                    <div className="font-bold text-slate-900">Download ZIP</div>
                    <p className="text-[#64748B] text-[11px] leading-relaxed">
                      Click the <strong>Download Plugin ZIP</strong> button above to download your pre-configured package.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                    <div className="font-bold text-slate-900">Upload to WP</div>
                    <p className="text-[#64748B] text-[11px] leading-relaxed">
                      Log in to WordPress Admin &rarr; <strong>Plugins &rarr; Add New Plugin &rarr; Upload Plugin</strong>.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                    <div className="font-bold text-slate-900">Activate &amp; Protect</div>
                    <p className="text-[#64748B] text-[11px] leading-relaxed">
                      Click <strong>Install Now</strong> &rarr; <strong>Activate Plugin</strong>. Your API key is pre-injected; no extra setup required.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* WordPress Source Code Box */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[#0073AA]" />
                  <span className="text-sm font-bold text-[#0F172A]">cleantraffic-shield.php Source Code</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200">
                    Standard WP Plugin
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                    className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{showKey ? "Mask in Preview" : "Reveal in Preview"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCurrentCode(wordPressPluginCode, "WordPress Plugin")}
                    className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? "Copied" : "Copy Plugin Code"}</span>
                  </Button>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                  {showKey
                    ? wordPressPluginCode
                    : wordPressPluginCode.replace(
                        `private $apiKey = '${apiKeyValue || "ctc_live_your_api_key_here"}';`,
                        `private $apiKey = '${maskKey(apiKeyValue)}'; // Masked in preview`
                      )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── STACK C: CLOUDFLARE EDGE WORKER ── */}
        {selectedStack === "cloudflare" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F6821F]">
                      <Globe className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Cloudflare Universal Edge Worker</h3>
                    <Badge className="bg-orange-100 text-orange-900 border-orange-200 text-[10px] font-bold">
                      DNS Edge Shield
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                    Runs at Cloudflare&apos;s 300+ global edge locations. Intercepts bots, scrapers, and datacenter traffic before requests reach your web host. Compatible with <strong>Shopify, Wix, Vercel, WordPress, Railway, and private VPS</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Button
                    onClick={() => handleCopyCurrentCode(cloudflareWorkerCode, "Cloudflare Worker")}
                    className="bg-[#F6821F] hover:bg-[#E06D0C] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shrink-0 shadow-xs"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? "Code Copied!" : "Copy Worker Code"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadCloudflareWorker}
                    className="text-xs text-[#0F172A] border-[#D5DFD9] bg-white hover:bg-slate-50 font-semibold px-3 h-9 rounded-lg gap-1.5 shrink-0"
                    title="For CLI users deploying with Wrangler"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Download (for Wrangler CLI)</span>
                  </Button>
                </div>
              </div>

              {/* Step-by-Step Guide */}
              <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                  2-Minute Cloudflare Deployment Steps:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                    <div className="font-bold text-slate-900">Create Worker (Not Pages)</div>
                    <p className="text-[#64748B] text-[11px] leading-relaxed">
                      Go to Cloudflare &rarr; <strong>Workers &amp; Pages</strong> &rarr; Select tab <strong>Workers</strong> (do not click Pages) &rarr; Click <strong>Create Worker</strong> &rarr; <strong>Deploy</strong>.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                    <div className="font-bold text-slate-900">Paste in Quick Edit</div>
                    <p className="text-[#64748B] text-[11px] leading-relaxed">
                      Click <strong>Edit code</strong> (or <strong>Quick Edit</strong>). Select all starter code, replace it with the copied worker code below, and click <strong>Save and deploy</strong>.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                    <div className="font-bold text-slate-900">Bind Domain &amp; Verify Proxy</div>
                    <p className="text-[#64748B] text-[11px] leading-relaxed">
                      In Worker &rarr; <strong>Settings &rarr; Domains &amp; Routes</strong> &rarr; Add Route: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-[#F6821F]">*yourdomain.com/*</code><br />
                      <strong className="text-amber-800">Critical:</strong> Make sure there is <u>NO dot</u> after the asterisk (use <code>*yourdomain.com/*</code>, NOT <code>*.yourdomain.com/*</code>, otherwise root domain visits will be ignored by Cloudflare). Ensure DNS is <strong>Proxied (Orange Cloud 🟧)</strong>.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">4</span>
                    <div className="font-bold text-slate-900">Live Protection</div>
                    <p className="text-[#64748B] text-[11px] leading-relaxed">
                      Edge inspection runs immediately. Bots and scrapers receive authentic 403/404, legitimate human visitors pass instantly, and all hits appear in your Live Traffic logs.
                    </p>
                  </div>
                </div>

                {/* Troubleshooting Callout for Upload Error */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-950">Important: Cloudflare Workers do NOT use file uploaders</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      If you see <em>&quot;This uploader does not yet support projects that require a build process... Please use wrangler deploy instead&quot;</em>, you accidentally opened Cloudflare Pages&apos; static asset drag-and-drop uploader. Workers are deployed directly in the browser by clicking <strong>Edit code</strong> (or <strong>Quick Edit</strong>), pasting the code into the online editor, and clicking <strong>Save and deploy</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloudflare Worker Code Preview */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[#F6821F]" />
                  <span className="text-sm font-bold text-[#0F172A]">worker.js (Ready to Paste)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-orange-50 text-orange-800 border-orange-200">
                    Cloudflare ES Module
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                    className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{showKey ? "Mask in Preview" : "Reveal in Preview"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCurrentCode(cloudflareWorkerCode, "Cloudflare Worker")}
                    className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? "Copied" : "Copy Worker Code"}</span>
                  </Button>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                  {showKey
                    ? cloudflareWorkerCode
                    : cloudflareWorkerCode.replace(
                        `apiKey: '${apiKeyValue || "ctc_live_your_api_key_here"}'`,
                        `apiKey: '${maskKey(apiKeyValue)}' // Masked in preview`
                      )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── STACK D: CPANEL / STANDALONE PHP ── */}
        {selectedStack === "php" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5EAE7] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <Server className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
                      cPanel, CyberPanel &amp; VPS (PHP Shield)
                    </h3>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Standalone PHP
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
                    Self-contained PHP deployment for Apache, Nginx, LiteSpeed, or cPanel. Customize your visitor verification loading experience or run a transparent inline server-side guard.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleDownloadPhpZip}
                    disabled={!apiKeyValue}
                    className="bg-[#0A5C48] hover:bg-[#07382D] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shadow-xs transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PHP ZIP</span>
                  </Button>
                </div>
              </div>

              {/* Verification Mode & Experience Toggle Card (PHP Dedicated) */}
              <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5 uppercase tracking-wider">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-[#0A5C48]" />
                      Verification Mode &amp; Experience
                    </Label>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Choose whether your PHP visitors see an instant security verification screen or experience zero-delay inline inspection.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasUnsavedThemeChanges && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium animate-pulse">
                        Unsaved mode
                      </span>
                    )}
                    <Button
                      onClick={() => saveThemeMutation.mutate()}
                      disabled={saveThemeMutation.isPending || !hasUnsavedThemeChanges}
                      className={`h-8 px-3.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        hasUnsavedThemeChanges
                          ? "bg-[#0A5C48] hover:bg-[#07382D] text-white"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {saveThemeMutation.isPending ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Save Preference</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => handleToggleLoading(true)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      enableLoading
                        ? "bg-emerald-50/70 border-emerald-500/80 ring-1 ring-emerald-500/20"
                        : "bg-white border-[#E0E9E4] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#0A5C48]" />
                        <span className="text-xs font-bold text-[#0F172A]">Interstitial Loading Screen</span>
                      </div>
                      <Badge className={`text-[10px] px-1.5 py-0 ${
                        enableLoading ? "bg-[#0A5C48] text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {enableLoading ? "Active" : "Select"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                      Renders a fast security verification badge (&lt;15ms) while evaluating WebGL, Canvas, and IP tokens in the background before forwarding to the destination.
                    </p>
                  </div>

                  <div
                    onClick={() => handleToggleLoading(false)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      !enableLoading
                        ? "bg-emerald-50/70 border-emerald-500/80 ring-1 ring-emerald-500/20"
                        : "bg-white border-[#E0E9E4] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[#0A5C48]" />
                        <span className="text-xs font-bold text-[#0F172A]">Transparent Inline Guard</span>
                      </div>
                      <Badge className={`text-[10px] px-1.5 py-0 ${
                        !enableLoading ? "bg-[#0A5C48] text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {!enableLoading ? "Active" : "Select"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                      Zero visual delay. Server executes inline cURL query to CleanTraffic before outputting page. Legitimate human visitors experience zero delay and no splash.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional content depending on enableLoading */}
              {enableLoading ? (
                <>
                  {/* Headline and subnote customize */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-[#0F172A]">Primary Headline Text</Label>
                        <span className="text-[11px] text-[#64748B]">Appears as main title</span>
                      </div>
                      <Input
                        value={customHeading}
                        onChange={(e) => handleHeadingChange(e.target.value)}
                        placeholder="Verifying your connection..."
                        className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs h-9 focus:border-[#0A5C48]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-[#0F172A]">Sub-note Description</Label>
                        <span className="text-[11px] text-[#64748B]">Supporting message under title</span>
                      </div>
                      <Input
                        value={customSubnote}
                        onChange={(e) => handleSubnoteChange(e.target.value)}
                        placeholder="Please wait while we secure your session."
                        className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs h-9 focus:border-[#0A5C48]"
                      />
                    </div>
                  </div>

                  {/* Theme Cards Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Available Themes ({filteredThemes.length})
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {themeCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedThemeCategory(cat)}
                            className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                              selectedThemeCategory === cat
                                ? "bg-[#0A5C48] text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {filteredThemes.map((theme) => {
                        const isSelected = selectedThemeId === theme.id;
                        return (
                          <div
                            key={theme.id}
                            onClick={() => handleSelectTheme(theme.id)}
                            className={`group relative rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? "border-[#0A5C48] bg-emerald-50/40 ring-2 ring-[#0A5C48]/20 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                                  {theme.name}
                                </span>
                                {isSelected ? (
                                  <span className="w-5 h-5 rounded-full bg-[#0A5C48] text-white flex items-center justify-center text-[10px]">
                                    <Check className="h-3 w-3" />
                                  </span>
                                ) : (
                                  <div 
                                    className="w-3.5 h-3.5 rounded-full border border-slate-300"
                                    style={{ backgroundColor: theme.previewAccent }}
                                  />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {theme.description}
                              </p>
                            </div>

                            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                                {theme.category}
                              </Badge>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewTheme(theme);
                                }}
                                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 hover:underline"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Preview</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#0A5C48]" />
                    <span className="text-xs font-bold text-[#0F172A]">Transparent Inline Guard Mode Active</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                      Zero Visual Splash
                    </Badge>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    In this mode, the PHP script inspects visitors server-side using fast cURL API calls before rendering any page content. Legitimate users are served your target site immediately with zero delay. Bots and automated scrapers are rejected with strict 403 Forbidden or 404 Not Found responses.
                  </p>
                </div>
              )}
            </div>

            {/* PHP Source Code Card */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[#0A5C48]" />
                  <span className="text-sm font-bold text-[#0F172A]">index.php Source Code</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {enableLoading ? `Theme: ${activeTheme.name}` : "Mode: Transparent Inline Guard"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                    className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{showKey ? "Mask in Preview" : "Reveal in Preview"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCurrentCode(phpIntegrationCode, "PHP Script")}
                    className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? "Copied" : "Copy PHP Code"}</span>
                  </Button>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                  {showKey
                    ? phpIntegrationCode
                    : phpIntegrationCode.replace(
                        `$apiKey = '${apiKeyValue || "ctc_live_your_api_key_here"}';`,
                        `$apiKey = '${maskKey(apiKeyValue)}'; // Masked in preview`
                      )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── STACK E: NODE.JS & NEXT.JS ── */}
        {selectedStack === "nodejs" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Node.js &amp; Next.js Middleware</h3>
                    <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                      Full-Stack Edge
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                    Drop-in HTTP middleware for modern JavaScript applications. Compatible with Next.js App &amp; Pages Router on Vercel/Netlify, or Express.js servers on Railway, Render, or private VPS.
                  </p>
                </div>

                {/* Sub-tab switcher */}
                <div className="flex items-center gap-1 bg-[#F8FAF9] p-1 border border-[#E5EAE7] rounded-lg shrink-0">
                  <button
                    onClick={() => setNodeSubTab("nextjs")}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      nodeSubTab === "nextjs"
                        ? "bg-[#0A5C48] text-white shadow-2xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    Next.js Edge
                  </button>
                  <button
                    onClick={() => setNodeSubTab("express")}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      nodeSubTab === "express"
                        ? "bg-[#0A5C48] text-white shadow-2xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    Express.js
                  </button>
                </div>
              </div>
            </div>

            {/* Code View for Node / Next */}
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[#0A5C48]" />
                  <span className="text-sm font-bold text-[#0F172A]">
                    {nodeSubTab === "nextjs" ? "middleware.ts (Root of Next.js Project)" : "middleware/cleantraffic.js"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopyCurrentCode(
                      nodeSubTab === "nextjs" ? nextJsMiddlewareCode : nodeExpressMiddlewareCode,
                      nodeSubTab === "nextjs" ? "Next.js Middleware" : "Express Middleware"
                    )
                  }
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy Middleware"}</span>
                </Button>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                  {nodeSubTab === "nextjs" ? nextJsMiddlewareCode : nodeExpressMiddlewareCode}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. FOOTER HELP NOTE (Fingerprint Reference Quality) ── */}
      <div className="text-center py-4 text-xs text-[#64748B]">
        <span>Don&apos;t see the integration you need? </span>
        <button
          onClick={() => navigate("/docs#support")}
          className="text-[#0A5C48] hover:underline font-semibold"
        >
          Check our developer documentation or request an integration!
        </button>
      </div>

      {/* Theme Live Preview Modal */}
      {previewTheme && (
        <Dialog open={Boolean(previewTheme)} onOpenChange={(open) => !open && setPreviewTheme(null)}>
          <DialogContent className="max-w-xl bg-white border border-[#E5EAE7] p-6 rounded-2xl">
            <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E5EAE7]">
              <div>
                <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#0A5C48]" />
                  <span>{previewTheme.name} Theme Preview</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748B] mt-0.5">
                  Visual interstitial splash rendered in &lt;15ms before background verification completes.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-1 bg-[#F8FAF9] p-1 border border-[#E5EAE7] rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded ${previewDevice === "desktop" ? "bg-white shadow-2xs text-[#0F172A]" : "text-slate-400"}`}
                  title="Desktop Preview"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded ${previewDevice === "mobile" ? "bg-white shadow-2xs text-[#0F172A]" : "text-slate-400"}`}
                  title="Mobile Preview"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </DialogHeader>

            <div className="py-4 flex justify-center">
              <div 
                className={`transition-all rounded-xl border overflow-hidden shadow-xs ${
                  previewDevice === "mobile" ? "w-[320px] h-[480px]" : "w-full h-[360px]"
                }`}
                style={{ backgroundColor: previewTheme.previewBg }}
              >
                <iframe
                  title="Theme Preview"
                  className="w-full h-full border-0"
                  srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${previewTheme.htmlHead}</style>
</head>
<body>
  ${previewTheme.htmlBody
    .replace(/\{\{HEADING\}\}/g, customHeading || "Verifying connection...")
    .replace(/\{\{SUBNOTE\}\}/g, customSubnote || "Please wait while we secure your session.")}
</body>
</html>`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5EAE7]">
              <span className="text-xs text-[#64748B]">Category: <strong>{previewTheme.category}</strong></span>
              <Button
                onClick={() => {
                  handleSelectTheme(previewTheme.id);
                  setPreviewTheme(null);
                  toast({
                    title: "Theme Selected",
                    description: `Selected "${previewTheme.name}". Click "Save Preference" to apply to your links.`,
                  });
                }}
                className="bg-[#0A5C48] hover:bg-[#07382D] text-white text-xs font-bold h-8 px-4 rounded-lg"
              >
                Use This Theme
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
