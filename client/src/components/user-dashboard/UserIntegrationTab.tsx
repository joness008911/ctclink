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
  ArrowLeft,
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
  Globe, 
  Server, 
  Cpu, 
  ShoppingBag, 
  Boxes, 
  Shield, 
  Search,
  AlertCircle,
  MessageSquare
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
  generateFastifyHook,
} from "@shared/integrationGenerators";
import {
  CloudflareLogo,
  ShopifyLogo,
  WordPressLogo,
  NextJsLogo,
  NodeJsLogo,
  PhpLogo,
  ReactLogo,
  JavaScriptLogo,
  PythonLogo,
  GoogleTagManagerLogo,
} from "./IntegrationLogos";

export type IntegrationStack = "shopify" | "wordpress" | "cloudflare" | "php" | "nodejs";
export type IntegrationCategory = "all" | "nocode" | "integrations" | "web" | "cms" | "server";

interface IntegrationItem {
  id: string;
  targetStack: IntegrationStack;
  name: string;
  subtitle: string;
  category: "all" | "nocode" | "integrations" | "web" | "cms" | "server";
  badge?: string;
  badgeStyle?: string;
  LogoComponent: React.ComponentType<{ className?: string }>;
  summary: string;
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

  // Navigation: null = Directory View; set to stack = Dedicated Integration Detail View
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationStack | null>(null);

  // Directory filter category & search
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Subtabs inside individual detail pages
  const [webSubTab, setWebSubTab] = useState<"tag" | "inline" | "sdk" | "entropy">("tag");
  const [wpSubTab, setWpSubTab] = useState<"zip" | "code">("zip");
  const [cfSubTab, setCfSubTab] = useState<"quickedit" | "wrangler">("quickedit");
  const [phpSubTab, setPhpSubTab] = useState<"code" | "themes">("code");
  const [nodeSubTab, setNodeSubTab] = useState<"express" | "nextjs" | "fastify">("express");

  // Copy & reveal states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Live Entropy & Verification Test State (Fingerprint-style client diagnostic)
  const [isTestingEntropy, setIsTestingEntropy] = useState<boolean>(false);
  const [entropyResult, setEntropyResult] = useState<any>(null);

  // Global Edge Policy Settings
  const [protectionFailMode, setProtectionFailMode] = useState<"open" | "closed">("open");
  const [protectionTimeoutMs, setProtectionTimeoutMs] = useState<number>(2000);

  // PHP Interstitial & Theme customizer state
  const [enableLoading, setEnableLoading] = useState<boolean>(false);
  const [selectedThemeCategory, setSelectedThemeCategory] = useState<string>("All");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("clean_light");
  const [customHeading, setCustomHeading] = useState<string>("Verifying your connection...");
  const [customSubnote, setCustomSubnote] = useState<string>("Please wait while we secure your session.");
  const [previewTheme, setPreviewTheme] = useState<InterstitialTheme | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [hasUnsavedThemeChanges, setHasUnsavedThemeChanges] = useState<boolean>(false);

  // Fetch available themes (admin pushed or default)
  const { data: themes = DEFAULT_INTERSTITIAL_THEMES } = useQuery<InterstitialTheme[]>({
    queryKey: ["/api/user/themes"],
  });

  // Fetch current user redirect URLs and theme preferences
  const { data: userSettings } = useQuery<any>({
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

  // 1. Generate PHP Integration Script (standalone index.php)
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

  const fastifyHookCode = generateFastifyHook({
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
          ctx2.font = "14px 'Arial'";
          ctx2.fillStyle = "#f60";
          ctx2.fillRect(125, 1, 62, 20);
          ctx2.fillStyle = "#069";
          ctx2.fillText("CleanTraffic,01", 2, 15);
          canvasHash = c2.toDataURL().slice(-24);
        }
      } catch (e) {}

      const entropyPayload = {
        canvas: canvasHash || "cv_rendered",
        gpu: gpu || "webgl_gpu_active",
        screen: `${window.screen?.width || 1920}x${window.screen?.height || 1080}x${window.screen?.colorDepth || 24}`,
        cores: navigator.hardwareConcurrency || 8,
        memory: (navigator as any).deviceMemory || 8,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        platform: navigator.platform || "Win32",
        lang: navigator.language || "en-US",
      };

      const res = await apiRequest("POST", "/api/classify", {
        apiKey: apiKeyValue || "ctc_live_test_key",
        url: window.location.href,
        userAgent: navigator.userAgent,
        ip: "127.0.0.1",
        hardwareEntropy: entropyPayload,
        clientEntropy: entropyPayload,
      });

      const data = await res.json();
      setEntropyResult({
        ...data,
        localEntropy: entropyPayload,
        testedAt: new Date().toLocaleTimeString(),
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

  // Download PHP Package (.zip)
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

  // Download Cloudflare Worker script (.js)
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

  // Download WordPress Plugin (.zip)
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

  // Directory integration items definition (matching Fingerprint structure)
  const integrationDirectory: IntegrationItem[] = useMemo(() => [
    {
      id: "cloudflare",
      targetStack: "cloudflare",
      name: "Cloudflare",
      subtitle: "Cloudflare No-Code Worker",
      category: "nocode",
      badge: "Active",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: CloudflareLogo,
      summary: "Protect your website with CleanTraffic using Cloudflare Workers at 300+ Edge locations.",
      tags: ["Cloudflare", "Edge", "No-Code", "Worker"],
    },
    {
      id: "shopify",
      targetStack: "shopify",
      name: "Shopify",
      subtitle: "Storefront Web Agent",
      category: "web",
      badge: "Active",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: ShopifyLogo,
      summary: "Add CleanTraffic protection tag to your Shopify store with hardware entropy.",
      tags: ["Shopify", "Store", "Liquid", "E-Commerce", "Web"],
    },
    {
      id: "wordpress",
      targetStack: "wordpress",
      name: "WordPress",
      subtitle: "WordPress & WooCommerce",
      category: "cms",
      badge: "1-Click",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      LogoComponent: WordPressLogo,
      summary: "Dedicated plugin (.zip) for blogs, landing pages, and checkout fraud protection.",
      tags: ["WordPress", "WooCommerce", "Plugin", "PHP", "CMS"],
    },
    {
      id: "nextjs",
      targetStack: "nodejs",
      name: "Next.js",
      subtitle: "Edge Middleware",
      category: "server",
      badge: "Edge",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: NextJsLogo,
      summary: "Edge and HTTP middleware for Next.js 13/14/15 App and Pages router on Vercel.",
      tags: ["Next.js", "Vercel", "Edge", "React", "Server"],
    },
    {
      id: "nodejs",
      targetStack: "nodejs",
      name: "Node.js",
      subtitle: "Express Middleware",
      category: "server",
      badge: "Server",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: NodeJsLogo,
      summary: "Integrate CleanTraffic with your Express.js or Node backend microservice.",
      tags: ["Node.js", "Express", "Backend", "API", "Server"],
    },
    {
      id: "php",
      targetStack: "php",
      name: "PHP",
      subtitle: "index.php Shield",
      category: "server",
      badge: "Standalone",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: PhpLogo,
      summary: "Integrate CleanTraffic with your PHP backend, cPanel, or CyberPanel.",
      tags: ["PHP", "cPanel", "Apache", "CyberPanel", "Server"],
    },
    {
      id: "react",
      targetStack: "shopify",
      name: "React",
      subtitle: "Frontend SDK",
      category: "web",
      badge: "Active",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: ReactLogo,
      summary: "Identify visitors and intercept bots on your React website.",
      tags: ["React", "SPA", "Frontend", "SDK", "Web"],
    },
    {
      id: "javascript",
      targetStack: "shopify",
      name: "JavaScript",
      subtitle: "JS Agent",
      category: "web",
      badge: "Active",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: JavaScriptLogo,
      summary: "Universal client-side protection snippet for custom websites and builders.",
      tags: ["JavaScript", "HTML", "Webflow", "Wix", "Web"],
    },
    {
      id: "gtm",
      targetStack: "shopify",
      name: "Google Tag Manager",
      subtitle: "Web Tag",
      category: "integrations",
      badge: "Tag",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      LogoComponent: GoogleTagManagerLogo,
      summary: "Add CleanTraffic to your website using Google Tag Manager custom HTML tags.",
      tags: ["GTM", "Google", "Tag", "Analytics", "Integrations"],
    },
    {
      id: "python",
      targetStack: "nodejs",
      name: "Python",
      subtitle: "Backend Gateway",
      category: "server",
      badge: "Backend",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: PythonLogo,
      summary: "Integrate CleanTraffic verification with your Python backend or API gateway.",
      tags: ["Python", "FastAPI", "Flask", "Backend", "Server"],
    },
  ], []);

  // Filter integration cards based on search and category
  const filteredIntegrations = useMemo(() => {
    return integrationDirectory.filter((item) => {
      let matchesCategory = true;
      if (activeCategory === "nocode") matchesCategory = item.category === "nocode";
      else if (activeCategory === "integrations") matchesCategory = item.category === "nocode" || item.category === "integrations";
      else if (activeCategory === "web") matchesCategory = item.category === "web";
      else if (activeCategory === "cms") matchesCategory = item.category === "cms";
      else if (activeCategory === "server") matchesCategory = item.category === "server";

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

  // Currently open integration item
  const currentItem = useMemo(() => {
    if (!selectedIntegration) return null;
    return integrationDirectory.find(i => i.targetStack === selectedIntegration) || null;
  }, [selectedIntegration, integrationDirectory]);

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* VIEW A: DEDICATED DETAIL PAGE (Inspired by Screenshots 2 & 4) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {selectedIntegration && currentItem ? (
        <div className="space-y-6">
          {/* Breadcrumb Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedIntegration(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F172A] transition-colors group px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-[#0A5C48]" />
              <span>Libraries &amp; integrations</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span className="font-medium">Integration:</span>
              <span className="font-bold text-[#0F172A]">{currentItem.name}</span>
            </div>
          </div>

          {/* Main 2-Column Content Layout (70% Content / 30% Details Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── LEFT COLUMN (70% - lg:col-span-8) ── */}
            <div className="lg:col-span-8 space-y-6">

              {/* 1. CLOUDFLARE EDGE WORKER DETAIL PAGE */}
              {selectedIntegration === "cloudflare" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <CloudflareLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Cloudflare No-Code Worker</h2>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Active
                          </Badge>
                          <Badge className="bg-orange-50 text-orange-800 border-orange-200 text-[10px] font-bold">
                            300+ Edge POPs
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Deploy CleanTraffic at Cloudflare&apos;s global edge. Intercepts bots, scrapers, and click fraud before requests hit your origin web host.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Cloudflare worker runs directly at Cloudflare&apos;s edge locations closest to your visitors. Legitimate human visitors pass directly through to your website with zero visual delay, while bots and unauthorized traffic receive authentic 403 or 404 responses.
                    </p>
                  </div>

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setCfSubTab("quickedit")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        cfSubTab === "quickedit"
                          ? "text-[#F6821F] border-b-2 border-[#F6821F]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Dashboard Quick Edit (Recommended)
                    </button>
                    <button
                      onClick={() => setCfSubTab("wrangler")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        cfSubTab === "wrangler"
                          ? "text-[#F6821F] border-b-2 border-[#F6821F]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Wrangler CLI
                    </button>
                  </div>

                  {/* Code Snippet Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#F6821F]" />
                        <span className="text-xs font-bold text-[#0F172A]">worker.js (Ready to Paste)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-orange-50 text-orange-800 border-orange-200">
                          Cloudflare ES Module
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCurrentCode(cloudflareWorkerCode, "Cloudflare Worker")}
                          className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCode ? "Copied" : "Copy Worker Code"}</span>
                        </Button>
                        {cfSubTab === "wrangler" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadCloudflareWorker}
                            className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-500" />
                            <span>Download .js</span>
                          </Button>
                        )}
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

                  {/* 2-Minute Cloudflare Deployment Steps */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Cloudflare Deployment Steps:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                        <div className="font-bold text-slate-900">Create Worker (Not Pages)</div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          In Cloudflare, go to <strong>Workers &amp; Pages</strong> &rarr; Select tab <strong>Workers</strong> &rarr; Click <strong>Create Worker</strong> &rarr; <strong>Deploy</strong>.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                        <div className="font-bold text-slate-900">Paste in Quick Edit</div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Click <strong>Edit code</strong> (or <strong>Quick Edit</strong>). Replace all starter code with the copied script above, and click <strong>Save and deploy</strong>.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                        <div className="font-bold text-slate-900">Route Domain (*yourdomain.com/*)</div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          In Worker &rarr; <strong>Settings &rarr; Domains &amp; Routes &rarr; Add Route</strong>: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-[#F6821F]">*yourdomain.com/*</code> (Ensure DNS is Proxied 🟧).
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">4</span>
                        <div className="font-bold text-slate-900">Edge Protection Online</div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Traffic is now filtered at the Cloudflare Edge before reaching your web host. Humans pass instantly, bots receive 403/404.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Section (Screenshot 4 Inspo) */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Zero Visual Delay:</strong> Legitimate human visitors experience zero loading screens, interstitial splashes, or redirects.</li>
                      <li><strong>First-Party Session Cookies:</strong> The worker sets <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">ctc_verified=1</code> so subsequent page clicks bypass classification and execute in 0ms.</li>
                      <li><strong>Ad Click Parameter Preservation:</strong> All paid ad click tokens (<code className="bg-slate-100 px-1 rounded text-[11px]">gclid, fbclid, ttclid, msclkid, UTMs</code>) are forwarded smoothly to your destination.</li>
                      <li><strong>Authentic HTTP Edge Responses:</strong> Bots and scrapers receive genuine 403 Forbidden or 404 Not Found at the edge without touching your origin server.</li>
                      <li><strong>Fail-Safe High Availability:</strong> Sub-second timeout fallback ensures your visitors are never stranded even if connectivity fluctuates.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 2. JAVASCRIPT WEB AGENT DETAIL PAGE */}
              {selectedIntegration === "shopify" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <ShopifyLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">JavaScript Web Agent</h2>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Active
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold">
                            Zero Server Needed
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          1-line client-side protection tag and developer SDK for Shopify, Wix, Webflow, Squarespace, and custom HTML landing pages.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Add our snippet to each page you want to protect. The script runs full WebGL GPU and 2D Canvas entropy to protect your landing page in place, deflecting bots with authentic 404 or 403 errors.
                    </p>
                  </div>

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                    <button
                      onClick={() => setWebSubTab("tag")}
                      className={`text-xs font-bold pb-1.5 transition-colors whitespace-nowrap ${
                        webSubTab === "tag"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      1-Line CDN Tag (Recommended)
                    </button>
                    <button
                      onClick={() => setWebSubTab("inline")}
                      className={`text-xs font-bold pb-1.5 transition-colors whitespace-nowrap ${
                        webSubTab === "inline"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Inline Autonomous Script
                    </button>
                    <button
                      onClick={() => setWebSubTab("sdk")}
                      className={`text-xs font-bold pb-1.5 transition-colors whitespace-nowrap ${
                        webSubTab === "sdk"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Developer SDK (Promise)
                    </button>
                    <button
                      onClick={() => setWebSubTab("entropy")}
                      className={`text-xs font-bold pb-1.5 transition-colors whitespace-nowrap ${
                        webSubTab === "entropy"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Hardware Diagnostics
                    </button>
                  </div>

                  {/* Code Display based on SubTab */}
                  {webSubTab === "tag" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">Script Tag</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCurrentCode(jsSnippet.embedTag, "Embed Tag")}
                          className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCode ? "Copied" : "Copy Tag"}</span>
                        </Button>
                      </div>
                      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                        <pre className="font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre">
                          {jsSnippet.embedTag}
                        </pre>
                      </div>
                    </div>
                  )}

                  {webSubTab === "inline" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">Autonomous Inline Code</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCurrentCode(jsSnippet.inlineScript, "Inline Script")}
                          className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
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
                  )}

                  {webSubTab === "sdk" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">Developer SDK (Promise API)</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCurrentCode(jsSdkCode, "Developer SDK")}
                          className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCode ? "Copied" : "Copy SDK Code"}</span>
                        </Button>
                      </div>
                      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                        <pre className="font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre">
                          {jsSdkCode}
                        </pre>
                      </div>
                    </div>
                  )}

                  {webSubTab === "entropy" && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A]">Live Hardware Entropy Test</h4>
                          <p className="text-xs text-[#64748B]">Verify how CleanTraffic synthesizes persistent Device IDs from your browser.</p>
                        </div>
                        <Button
                          onClick={handleRunEntropyTest}
                          disabled={isTestingEntropy}
                          className="bg-[#0A5C48] hover:bg-[#07382D] text-white font-bold text-xs h-9 px-4 rounded-lg gap-2 shrink-0"
                        >
                          {isTestingEntropy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          <span>{isTestingEntropy ? "Testing..." : "Run Entropy Test"}</span>
                        </Button>
                      </div>

                      {entropyResult && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 space-y-1">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase">Device ID</span>
                            <span className="font-mono text-xs font-bold text-[#0A5C48] block truncate">{entropyResult.deviceId || "dev_synthesized"}</span>
                          </div>
                          <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 space-y-1">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase">Visitor Verdict</span>
                            <span className="text-xs font-bold text-[#0F172A] block">{entropyResult.isHuman ? "Human (Passed)" : "Bot (Blocked)"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Platform Quickstart Guides */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Platform Quickstart:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <ShoppingBag className="h-3.5 w-3.5 text-emerald-700" />
                          Shopify
                        </div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Online Store &rarr; Themes &rarr; Edit Code &rarr; <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">layout/theme.liquid</code> &rarr; Paste before <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">&lt;/head&gt;</code>.
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-blue-700" />
                          Wix
                        </div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Dashboard &rarr; Settings &rarr; Custom Code &rarr; Add Custom Code in Head &rarr; All Pages &rarr; Save.
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Boxes className="h-3.5 w-3.5 text-purple-700" />
                          Webflow
                        </div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Project Settings &rarr; Custom Code &rarr; Head Code &rarr; Paste tag &rarr; Publish.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Zero Server Infrastructure:</strong> Works seamlessly on closed store platforms without backend access.</li>
                      <li><strong>Hardware Fingerprinting:</strong> Captures WebGL GPU and 2D canvas curves to generate tamper-resistant Device IDs.</li>
                      <li><strong>Asynchronous SDK:</strong> Promise-based API enables deep integration with Google Analytics, Meta Pixel, and custom apps.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 3. WORDPRESS & WOOCOMMERCE DETAIL PAGE */}
              {selectedIntegration === "wordpress" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <WordPressLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">WordPress &amp; WooCommerce Plugin</h2>
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                            1-Click ZIP Package
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Dedicated WordPress plugin for blogs, landing pages, WooCommerce checkout flows, and login protection.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleDownloadWordPressZip}
                      disabled={!apiKeyValue}
                      className="bg-[#0073AA] hover:bg-[#005A87] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shrink-0 shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download ZIP</span>
                    </Button>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Hooks directly into WordPress&apos;s request lifecycle before heavy themes, database queries, and page builders initialize. Deflects card testers on WooCommerce and stops brute force attacks on <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">/wp-login.php</code>.
                    </p>
                  </div>

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setWpSubTab("zip")}
                      className={`text-xs font-bold pb-1.5 transition-colors ${
                        wpSubTab === "zip"
                          ? "text-[#0073AA] border-b-2 border-[#0073AA]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Plugin ZIP Download
                    </button>
                    <button
                      onClick={() => setWpSubTab("code")}
                      className={`text-xs font-bold pb-1.5 transition-colors ${
                        wpSubTab === "code"
                          ? "text-[#0073AA] border-b-2 border-[#0073AA]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Source Code (cleantraffic-shield.php)
                    </button>
                  </div>

                  {wpSubTab === "code" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">cleantraffic-shield.php Source</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCurrentCode(wordPressPluginCode, "WordPress Plugin")}
                          className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                        </Button>
                      </div>
                      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                        <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                          {wordPressPluginCode}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Installation Steps */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      3-Step WordPress Installation:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                        <div className="font-bold text-slate-900">Download ZIP</div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Download the pre-configured plugin package using the button above.
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                        <div className="font-bold text-slate-900">Upload in WP Admin</div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Plugins &rarr; Add New &rarr; Upload Plugin &rarr; Select ZIP file.
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                        <div className="font-bold text-slate-900">Activate</div>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          Click Activate. Your tenant API key is baked in; no settings configuration needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Lightweight Lifecycle Hook:</strong> Runs before heavy plugins (Elementor, WooCommerce) to preserve server RAM.</li>
                      <li><strong>WooCommerce Fraud Protection:</strong> Intercepts high-velocity checkout fraud and fake account spam.</li>
                      <li><strong>Zero Manual Config:</strong> API keys and routing endpoints are pre-compiled into your ZIP download.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 4. PHP STANDALONE DETAIL PAGE */}
              {selectedIntegration === "php" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <PhpLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">PHP Standalone (index.php)</h2>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            cPanel / CyberPanel / VPS
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Self-contained index.php deployment for Apache, Nginx, or cPanel with optional customizable interstitial themes.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleDownloadPhpZip}
                      disabled={!apiKeyValue}
                      className="bg-[#0A5C48] hover:bg-[#07382D] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shrink-0 shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PHP ZIP</span>
                    </Button>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Upload index.php to your web directory or ad campaign root. Choose between an instant interstitial loading verification splash or a zero-delay transparent inline cURL guard.
                    </p>
                  </div>

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setPhpSubTab("code")}
                      className={`text-xs font-bold pb-1.5 transition-colors ${
                        phpSubTab === "code"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      PHP Code (index.php)
                    </button>
                    <button
                      onClick={() => setPhpSubTab("themes")}
                      className={`text-xs font-bold pb-1.5 transition-colors ${
                        phpSubTab === "themes"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Verification Themes &amp; Customizer
                    </button>
                  </div>

                  {phpSubTab === "code" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">index.php Source</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCurrentCode(phpIntegrationCode, "PHP Script")}
                          className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCode ? "Copied" : "Copy PHP Code"}</span>
                        </Button>
                      </div>
                      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                        <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                          {phpIntegrationCode}
                        </pre>
                      </div>
                    </div>
                  )}

                  {phpSubTab === "themes" && (
                    <div className="space-y-5">
                      {/* Mode Toggle */}
                      <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-[#0F172A] uppercase">Protection Mode</Label>
                          <Button
                            onClick={() => saveThemeMutation.mutate()}
                            disabled={saveThemeMutation.isPending || !hasUnsavedThemeChanges}
                            className={`h-7 px-3 text-xs font-bold rounded-lg ${
                              hasUnsavedThemeChanges ? "bg-[#0A5C48] text-white" : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            Save Preference
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleLoading(false)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              !enableLoading ? "bg-emerald-50 border-[#0A5C48] ring-1 ring-[#0A5C48]" : "bg-white border-slate-200"
                            }`}
                          >
                            <span className="text-xs font-bold text-[#0F172A] block">Transparent Inline Guard</span>
                            <span className="text-[11px] text-[#64748B] block mt-1">Zero visual delay. Legitimate humans see no splash screen.</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLoading(true)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              enableLoading ? "bg-emerald-50 border-[#0A5C48] ring-1 ring-[#0A5C48]" : "bg-white border-slate-200"
                            }`}
                          >
                            <span className="text-xs font-bold text-[#0F172A] block">Interstitial Loading Splash</span>
                            <span className="text-[11px] text-[#64748B] block mt-1">Renders security badge while validating tokens in background.</span>
                          </button>
                        </div>
                      </div>

                      {enableLoading && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs font-bold text-[#0F172A]">Headline Text</Label>
                              <Input
                                value={customHeading}
                                onChange={(e) => handleHeadingChange(e.target.value)}
                                className="bg-white text-xs h-9 mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-bold text-[#0F172A]">Subnote Text</Label>
                              <Input
                                value={customSubnote}
                                onChange={(e) => handleSubnoteChange(e.target.value)}
                                className="bg-white text-xs h-9 mt-1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredThemes.slice(0, 6).map((t) => (
                              <div
                                key={t.id}
                                onClick={() => handleSelectTheme(t.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedThemeId === t.id ? "border-[#0A5C48] bg-emerald-50/50" : "bg-white border-slate-200"
                                }`}
                              >
                                <span className="text-xs font-bold text-[#0F172A] block">{t.name}</span>
                                <span className="text-[10px] text-[#64748B]">{t.category}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deployment Guide */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2 text-xs">
                    <span className="font-bold text-[#0F172A] uppercase tracking-wider block">cPanel / Apache Setup:</span>
                    <ol className="list-decimal pl-4 space-y-1 text-[#64748B]">
                      <li>Upload <code className="bg-white px-1 rounded font-mono text-[11px]">index.php</code> to your webroot (e.g. <code className="bg-white px-1 rounded font-mono text-[11px]">public_html/</code>).</li>
                      <li>Ensure PHP 7.4+ and the standard cURL extension are enabled on your host.</li>
                      <li>Visit your website URL with test parameters to verify real-time protection in your dashboard logs.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 5. NEXT.JS & EXPRESS MIDDLEWARE DETAIL PAGE */}
              {selectedIntegration === "nodejs" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <NextJsLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Next.js &amp; Express Middleware</h2>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Full-Stack Edge
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Edge and HTTP middleware for Next.js 13/14/15 on Vercel/Netlify, or Node Express servers on Railway/VPS.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Intercepts incoming HTTP requests at the edge before route handlers render. Inspects visitor IP, user-agent, and ad click tokens, passing legitimate traffic seamlessly to your Next.js pages or API routes.
                    </p>
                  </div>

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setNodeSubTab("express")}
                      className={`text-xs font-bold pb-1.5 transition-colors ${
                        nodeSubTab === "express"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Express.js (Node 18+)
                    </button>
                    <button
                      onClick={() => setNodeSubTab("nextjs")}
                      className={`text-xs font-bold pb-1.5 transition-colors ${
                        nodeSubTab === "nextjs"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Next.js Edge Middleware
                    </button>
                    <button
                      onClick={() => setNodeSubTab("fastify")}
                      className={`text-xs font-bold pb-1.5 transition-colors ${
                        nodeSubTab === "fastify"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Fastify Plugin
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A]">
                        {nodeSubTab === "nextjs"
                          ? "middleware.ts (Root of Next.js Project)"
                          : nodeSubTab === "fastify"
                          ? "cleantrafficFastify.js"
                          : "middleware/cleantraffic.js"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            nodeSubTab === "nextjs"
                              ? nextJsMiddlewareCode
                              : nodeSubTab === "fastify"
                              ? fastifyHookCode
                              : nodeExpressMiddlewareCode,
                            nodeSubTab === "nextjs"
                              ? "Next.js Middleware"
                              : nodeSubTab === "fastify"
                              ? "Fastify Hook"
                              : "Express Middleware"
                          )
                        }
                        className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                      </Button>
                    </div>
                    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                      <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                        {nodeSubTab === "nextjs"
                          ? nextJsMiddlewareCode
                          : nodeSubTab === "fastify"
                          ? fastifyHookCode
                          : nodeExpressMiddlewareCode}
                      </pre>
                    </div>
                  </div>

                  {/* 2-Step Drop-in Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Quick Drop-in Setup (Zero Dependencies):
                    </span>
                    {nodeSubTab === "express" && (
                      <div className="space-y-2 text-slate-700">
                        <p className="text-[11px] text-[#64748B]">
                          1. Save the code above into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">middleware/cleantraffic.js</code>.
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          2. Register it in your <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">app.js</code> or <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">server.js</code>:
                        </p>
                        <div className="bg-[#0F172A] text-slate-200 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
                          <div>const express = require('express');</div>
                          <div>const cleanTraffic = require('./middleware/cleantraffic');</div>
                          <div className="mt-1">const app = express();</div>
                          <div className="text-emerald-400">app.use(cleanTraffic()); // Zero npm install needed (uses Node 18+ native fetch)</div>
                          <div>app.get('/', (req, res) =&gt; res.send('Protected human landing page'));</div>
                        </div>
                      </div>
                    )}
                    {nodeSubTab === "nextjs" && (
                      <div className="space-y-1 text-slate-700">
                        <p className="text-[11px] text-[#64748B]">
                          Save the code above as <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">middleware.ts</code> in the root folder of your Next.js project.
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          Next.js and Vercel will automatically execute it on every incoming request at the edge before rendering pages or API routes.
                        </p>
                      </div>
                    )}
                    {nodeSubTab === "fastify" && (
                      <div className="space-y-2 text-slate-700">
                        <p className="text-[11px] text-[#64748B]">
                          1. Save the code above into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">cleantrafficFastify.js</code>.
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          2. Register the plugin with your Fastify instance:
                        </p>
                        <div className="bg-[#0F172A] text-slate-200 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
                          <div>const fastify = require('fastify')();</div>
                          <div>const cleanTraffic = require('./cleantrafficFastify');</div>
                          <div className="mt-1 text-emerald-400">fastify.register(cleanTraffic);</div>
                          <div>{"fastify.get('/', async (req, reply) => ({ status: 'Welcome Human' }));"}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Architecture Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Zero External Dependencies:</strong> Built with native Node 18+ <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">fetch</code> and <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">AbortSignal</code>. No <code className="text-slate-800 font-mono text-[11px]">axios</code> or <code className="text-slate-800 font-mono text-[11px]">cookie-parser</code> required.</li>
                      <li><strong>In-Memory Verdict Caching (0ms):</strong> Server-side LRU memory cache ensures repeat page requests resolve in 0.01ms without making external network calls.</li>
                      <li><strong>No Redirects for Human Visitors:</strong> Legitimate traffic stays on <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">https://domain.com</code> (<code className="text-slate-800 font-mono text-[11px]">next()</code>), while scrapers and bots are cut off with authentic HTTP 403/404.</li>
                      <li><strong>Tamper-Proof Security:</strong> Protection is verified in server memory by IP, completely immune to cookie-forgery bypasses.</li>
                      <li><strong>Fail-Open High Availability:</strong> Sub-second timeout ensures visitors are never blocked or delayed if network connectivity fluctuates.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: DETAILS SIDEBAR (Inspired by Screenshot 2) ── */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-[#E5EAE7] rounded-xl p-5 shadow-xs space-y-5">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Details
                </h3>

                {/* Docs & Support Links (Screenshot 2 Inspo) */}
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
                      <BookOpen className="h-4 w-4 text-[#0A5C48]" />
                      <span>Docs</span>
                    </div>
                    <button
                      onClick={() => navigate("/docs#installation")}
                      className="text-[#0A5C48] hover:underline font-bold"
                    >
                      Read
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
                      <MessageSquare className="h-4 w-4 text-[#0A5C48]" />
                      <span>Support</span>
                    </div>
                    <button
                      onClick={() => navigate("/docs#support")}
                      className="text-[#0A5C48] hover:underline font-bold"
                    >
                      Contact us
                    </button>
                  </div>
                </div>

                {/* API Key Box */}
                <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-[#64748B] uppercase">Assigned API Key</Label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[10px] text-[#0A5C48] font-bold flex items-center gap-1"
                    >
                      {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showKey ? "Hide" : "Reveal"}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-[#0A5C48] truncate">
                      {apiKeyValue ? (showKey ? apiKeyValue : maskKey(apiKeyValue)) : "Loading key..."}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyKey}
                      className="h-6 w-6 p-0 text-[#64748B] hover:text-[#0F172A]"
                    >
                      {copiedKey ? <Check className="h-3.5 w-3.5 text-[#0A5C48]" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Fail Mode / Protection Policy */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <Label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Edge Fallback Policy
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProtectionFailMode("open")}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                        protectionFailMode === "open"
                          ? "bg-emerald-50 border-[#0A5C48] text-[#0A5C48] font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      Fail-Open
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">High availability</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProtectionFailMode("closed")}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                        protectionFailMode === "closed"
                          ? "bg-emerald-50 border-[#0A5C48] text-[#0A5C48] font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      Fail-Closed
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Maximum security</span>
                    </button>
                  </div>
                </div>

                {/* Gateway Timeout */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      Timeout Threshold
                    </Label>
                    <span className="text-[11px] font-bold text-[#0F172A]">{protectionTimeoutMs}ms</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "250ms", val: 250 },
                      { label: "400ms", val: 400 },
                      { label: "600ms", val: 600 },
                    ].map((t) => (
                      <button
                        key={t.val}
                        type="button"
                        onClick={() => setProtectionTimeoutMs(t.val)}
                        className={`text-xs py-1.5 rounded border transition-colors font-medium ${
                          protectionTimeoutMs === t.val
                            ? "bg-[#0A5C48] text-white border-[#0A5C48]"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gateway Endpoint */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <Label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    API Endpoint Host
                  </Label>
                  <Input
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="https://your-domain.com"
                    className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs font-mono h-8"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ──────────────────────────────────────────────────────────── */
        /* VIEW B: DIRECTORY GRID VIEW (Inspired by Screenshots 1 & 3) */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Header Strip */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
                Libraries &amp; integrations
              </h2>
              <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
                Deploy bot protection, visitor identification, and traffic security across your website, stores, and backend infrastructure.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => navigate("/docs#installation")}
                variant="outline"
                className="text-xs font-semibold h-9 px-3.5 border-[#D5DFD9] text-[#0F172A] hover:bg-[#F2F6F4] gap-2 rounded-lg"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#0A5C48]" />
                <span>Docs</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </Button>
              <Button
                onClick={() => navigate("/docs#support")}
                variant="outline"
                className="text-xs font-semibold h-9 px-3.5 border-[#D5DFD9] text-[#0F172A] hover:bg-[#F2F6F4] gap-2 rounded-lg"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[#0A5C48]" />
                <span>Support</span>
              </Button>
            </div>
          </div>

          {/* Filter Pills (Fingerprint Style) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All" },
                { id: "nocode", label: "No-Code" },
                { id: "integrations", label: "Integrations" },
                { id: "web", label: "Web" },
                { id: "cms", label: "CMS" },
                { id: "server", label: "Server" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as IntegrationCategory)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    activeCategory === cat.id
                      ? "bg-[#0A5C48] text-white shadow-2xs"
                      : "bg-white border border-[#E5EAE7] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAF9]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="pl-9 h-8 bg-white border-[#E5EAE7] text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Unified Beside-Each-Other Grid (All sitting side by side matching screenshots) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((item) => {
              const Logo = item.LogoComponent;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.id === "react") setWebSubTab("sdk");
                    else if (item.id === "javascript") setWebSubTab("inline");
                    else if (item.id === "shopify" || item.id === "gtm") setWebSubTab("tag");
                    else if (item.id === "nextjs") setNodeSubTab("nextjs");
                    else if (item.id === "nodejs" || item.id === "python") setNodeSubTab("express");
                    setSelectedIntegration(item.targetStack);
                  }}
                  className="group bg-white rounded-xl border border-[#E5EAE7] p-5 cursor-pointer hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between min-h-[145px]"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Authentic Logo Container */}
                      <div className="w-9 h-9 rounded-lg border border-slate-200/90 bg-white flex items-center justify-center p-1.5 shadow-2xs">
                        <Logo className="h-5 w-5" />
                      </div>
                      {item.badge && (
                        <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${item.badgeStyle}`}>
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A] group-hover:text-[#0A5C48] transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[#64748B] mt-1 leading-relaxed line-clamp-2">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Theme Live Preview Modal (only accessed via PHP customizer) */}
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
