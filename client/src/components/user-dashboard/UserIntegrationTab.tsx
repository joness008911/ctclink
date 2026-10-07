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
  MessageSquare,
  User,
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
} from "@shared/integrationGenerators";
import {
  CloudflareLogo,
  ShopifyLogo,
  WordPressLogo,
  NextJsLogo,
  PhpLogo,
  ReactLogo,
  JavaScriptLogo,
  GoogleTagManagerLogo,
  WebflowLogo,
  FramerLogo,
  WixLogo,
} from "./IntegrationLogos";
import { AgentSetupView } from "./AgentSetupView";
import { DeflectionControlBar } from "./DeflectionControlBar";

export type IntegrationStack =
  | "cloudflare"
  | "nextjs"
  | "webflow"
  | "framer"
  | "shopify"
  | "wordpress"
  | "wix"
  | "php"
  | "gtm"
  | "react";

export type IntegrationCategory = "all" | "nocode" | "builders" | "web" | "cms" | "integrations";

interface IntegrationItem {
  id: string;
  targetStack: IntegrationStack;
  name: string;
  subtitle: string;
  category: IntegrationCategory;
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
  const [reactSubTab, setReactSubTab] = useState<"html" | "react">("html");

  // Segmented Setup Mode (Agent setup vs Manual setup - Fingerprint.com style)
  const [setupMode, setSetupMode] = useState<"agent" | "manual">("agent");
  const [detailSetupMode, setDetailSetupMode] = useState<"agent" | "manual">("manual");

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

  // Manual Deflection State (Edge 403, 404, or PHP Fallback Redirect)
  const [manualDeflectionAction, setManualDeflectionAction] = useState<"403" | "404" | "redirect">(() => {
    return userSettings?.botUrl === "404" ? "404" : (userSettings?.botUrl?.startsWith("http") ? "redirect" : "403");
  });
  const [manualBotFallbackUrl, setManualBotFallbackUrl] = useState<string>(
    userSettings?.botUrl?.startsWith("http") ? userSettings.botUrl : "https://google.com"
  );

  useEffect(() => {
    if (userSettings?.botUrl) {
      if (userSettings.botUrl === "404") setManualDeflectionAction("404");
      else if (userSettings.botUrl.startsWith("http")) {
        setManualDeflectionAction("redirect");
        setManualBotFallbackUrl(userSettings.botUrl);
      } else {
        setManualDeflectionAction("403");
      }
    }
  }, [userSettings?.botUrl]);

  const updateUrlsMutation = useMutation({
    mutationFn: async (payload: { botUrl: string; humanUrl?: string }) => {
      const res = await apiRequest("POST", "/api/user/urls", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Deflection Action Updated",
        description: "Your bot and rule deflection policy has been updated across all integrations.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to update deflection",
        description: err.message || "Failed to persist deflection setting.",
        variant: "destructive",
      });
    },
  });

  const handleManualDeflectionChange = (action: "403" | "404" | "redirect", url?: string) => {
    setManualDeflectionAction(action);
    const effectiveUrl = url !== undefined ? url : manualBotFallbackUrl;
    if (url !== undefined) setManualBotFallbackUrl(url);

    const payloadBot = action === "redirect" ? (effectiveUrl || "https://google.com") : action;
    updateUrlsMutation.mutate({
      botUrl: payloadBot,
      humanUrl: userSettings?.humanUrl || "https://yourdomain.com",
    });
  };

  const effectiveManualBotTarget = manualDeflectionAction === "redirect" ? manualBotFallbackUrl : manualDeflectionAction;

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
    botTargetUrl: effectiveManualBotTarget,
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
    botTargetUrl: effectiveManualBotTarget,
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

  // Directory integration items definition (100% Websites, Landing Pages & Modern Hosts)
  const integrationDirectory: IntegrationItem[] = useMemo(() => [
    {
      id: "cloudflare",
      targetStack: "cloudflare",
      name: "Cloudflare",
      subtitle: "Universal Edge Worker",
      category: "nocode",
      badge: "Any Host",
      badgeStyle: "bg-orange-50 text-orange-800 border-orange-200",
      LogoComponent: CloudflareLogo,
      summary: "Deploy in front of ANY host (Render, Railway, VPS, Vercel) to stop bots at 300+ Edge POPs before they reach your origin.",
      tags: ["Cloudflare", "Edge", "Render", "Railway", "VPS", "No-Code", "Worker"],
    },
    {
      id: "nextjs",
      targetStack: "nextjs",
      name: "Next.js",
      subtitle: "Edge Middleware",
      category: "web",
      badge: "Edge",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: NextJsLogo,
      summary: "Edge and HTTP middleware for Next.js App & Pages Router on Vercel, Render, or Netlify.",
      tags: ["Next.js", "Vercel", "Render", "Edge", "React", "Server"],
    },
    {
      id: "webflow",
      targetStack: "webflow",
      name: "Webflow",
      subtitle: "Marketing Landing Pages",
      category: "builders",
      badge: "No-Code",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      LogoComponent: WebflowLogo,
      summary: "1-Click Custom Code integration for high-converting Webflow landing pages and marketing sites.",
      tags: ["Webflow", "Landing Page", "Custom Code", "No-Code", "Builders"],
    },
    {
      id: "framer",
      targetStack: "framer",
      name: "Framer",
      subtitle: "Modern Startup Websites",
      category: "builders",
      badge: "1-Click",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      LogoComponent: FramerLogo,
      summary: "Protect your Framer startup website or design portfolio from bot clicks and scrapers in <head>.",
      tags: ["Framer", "Startup", "Landing Page", "Design", "Builders"],
    },
    {
      id: "shopify",
      targetStack: "shopify",
      name: "Shopify",
      subtitle: "Storefront Web Agent",
      category: "cms",
      badge: "Active",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: ShopifyLogo,
      summary: "Add CleanTraffic protection tag to your Shopify store in theme.liquid to protect checkout & ad spend.",
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
      summary: "Dedicated Must-Use plugin (.zip) for blogs, landing pages, and WooCommerce fraud prevention.",
      tags: ["WordPress", "WooCommerce", "Plugin", "PHP", "CMS"],
    },
    {
      id: "wix",
      targetStack: "wix",
      name: "Wix & Squarespace",
      subtitle: "Website Builders",
      category: "builders",
      badge: "No-Code",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: WixLogo,
      summary: "Add bot screening and hardware entropy visitor identification to Wix or Squarespace sites.",
      tags: ["Wix", "Squarespace", "Website Builder", "Custom Code", "Builders"],
    },
    {
      id: "php",
      targetStack: "php",
      name: "PHP",
      subtitle: "index.php Shield",
      category: "web",
      badge: "Redirect Safe",
      badgeStyle: "bg-purple-50 text-purple-800 border-purple-200",
      LogoComponent: PhpLogo,
      summary: "Standalone PHP shield for direct landing page funnels, cPanel, or CyberPanel with custom Redirect URL Deflection.",
      tags: ["PHP", "cPanel", "CyberPanel", "Landing Page", "Funnels"],
    },
    {
      id: "gtm",
      targetStack: "gtm",
      name: "Google Tag Manager",
      subtitle: "Universal Web Tag",
      category: "integrations",
      badge: "Tag",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      LogoComponent: GoogleTagManagerLogo,
      summary: "Add CleanTraffic to any website using Google Tag Manager custom HTML tags with zero code changes.",
      tags: ["GTM", "Google", "Tag", "Analytics", "Integrations"],
    },
    {
      id: "react",
      targetStack: "react",
      name: "HTML / React",
      subtitle: "Static Web Tag & SDK",
      category: "web",
      badge: "Universal",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: ReactLogo,
      summary: "Universal client-side protection snippet and React SDK for static sites, SPAs, and custom landing pages on Render/Railway/S3.",
      tags: ["React", "HTML", "SPA", "Static", "Render", "Railway", "SDK"],
    },
  ], []);

  // Filter integration cards based on search and category
  const filteredIntegrations = useMemo(() => {
    return integrationDirectory.filter((item) => {
      let matchesCategory = true;
      if (activeCategory === "nocode") matchesCategory = item.category === "nocode";
      else if (activeCategory === "builders") matchesCategory = item.category === "builders" || item.category === "nocode";
      else if (activeCategory === "web") matchesCategory = item.category === "web";
      else if (activeCategory === "cms") matchesCategory = item.category === "cms";
      else if (activeCategory === "integrations") matchesCategory = item.category === "integrations";

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

              {/* Segmented Control: Agent setup vs Manual setup (Screenshot Inspo) */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/90 w-fit">
                <button
                  onClick={() => setDetailSetupMode("agent")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    detailSetupMode === "agent"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#F25A2A]" />
                  <span>Agent setup</span>
                </button>
                <button
                  onClick={() => setDetailSetupMode("manual")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    detailSetupMode === "manual"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>Manual setup</span>
                </button>
              </div>

              {detailSetupMode === "agent" ? (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs">
                  <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#F25A2A]" />
                        <span>AI Assistant Setup for {currentItem.name}</span>
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Copy the custom prompt below into Cursor, Claude Code, Windsurf, or Copilot.
                      </p>
                    </div>
                  </div>
                  <AgentSetupView
                    apiKeyValue={apiKeyValue || ""}
                    effectiveEndpoint={effectiveEndpoint}
                    targetStack={selectedIntegration}
                    initialDeflection={userSettings?.botUrl === "404" ? "404" : (userSettings?.botUrl?.startsWith("http") ? "redirect" : "403")}
                    initialBotUrl={userSettings?.botUrl?.startsWith("http") ? userSettings.botUrl : ""}
                    onNavigateToLiveFeed={() => navigate("/dashboard?tab=traffic")}
                    onDeflectionChange={handleManualDeflectionChange}
                  />
                </div>
              ) : (
                <>
                  {/* Deflection Control Bar for Manual Mode */}
                  {selectedIntegration && (
                    <DeflectionControlBar
                      isPhpStack={selectedIntegration === "php"}
                      deflectionAction={
                        (selectedIntegration !== "php" && manualDeflectionAction === "redirect")
                          ? "403"
                          : manualDeflectionAction
                      }
                      botFallbackUrl={manualBotFallbackUrl}
                      onDeflectionChange={handleManualDeflectionChange}
                      className="mb-2"
                    />
                  )}

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

              {/* 5. NEXT.JS EDGE MIDDLEWARE DETAIL PAGE */}
              {selectedIntegration === "nextjs" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <NextJsLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Next.js Edge Middleware</h2>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Edge Native
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Next.js 13/14/15
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Zero-latency Edge Middleware for Next.js App &amp; Pages Router on Vercel, Render, Netlify, or custom VPS. Intercepts bots at the edge before pages or signup/login routes render.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Next.js Edge Middleware executes on every incoming visitor request before pages, static bundles, or server actions run. Legitimate visitors pass through without any redirect or visual delay, while bots and scrapers are cut off at the edge with HTTP 403 Forbidden or 404 Stealth Drop.
                    </p>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#0F172A]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          middleware.ts (Root of Next.js Project)
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCurrentCode(nextJsMiddlewareCode, "Next.js Middleware")}
                        className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy Middleware Code"}</span>
                      </Button>
                    </div>
                    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                      <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                        {nextJsMiddlewareCode}
                      </pre>
                    </div>
                  </div>

                  {/* Drop-in Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Quick Drop-in Setup (Zero External Dependencies):
                    </span>
                    <ol className="list-decimal pl-4 space-y-2 text-[#64748B]">
                      <li>
                        Create or open <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">middleware.ts</code> in the root folder of your Next.js project (next to <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">package.json</code> or inside <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">src/</code>).
                      </li>
                      <li>
                        Paste the code above into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">middleware.ts</code>.
                      </li>
                      <li>
                        Deploy to Vercel, Render, Netlify, or your host. Next.js runs this middleware automatically on every incoming request at the edge.
                      </li>
                    </ol>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Edge Protection Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Zero Backend Complexity:</strong> No npm packages or database hooks required. Uses native Next.js Edge Runtime <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">NextResponse</code>.</li>
                      <li><strong>Protects Before Page Render:</strong> Bots are intercepted before they touch sign up forms, login pages, or expensive SSR routes.</li>
                      <li><strong>No Redirects for Real Users:</strong> Legitimate visitors stay on the exact URL with 0ms visual delay.</li>
                      <li><strong>Instant Deflection:</strong> Configurable 403 Forbidden or 404 Stealth Drop cuts off automated web scrapers.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 6. WEBFLOW MARKETING LANDING PAGES DETAIL PAGE */}
              {selectedIntegration === "webflow" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <WebflowLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Webflow Marketing Landing Pages</h2>
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                            No-Code
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Ad Fraud Defense
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          1-Click Custom Code integration for Webflow marketing sites, high-converting PPC landing pages, and lead forms.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      CleanTraffic screens visitors on your Webflow landing pages using client-side hardware entropy and browser integrity verification. It stops automated bot clicks from draining your Google &amp; Meta ad spend and blocks spam submissions on Webflow forms without any code changes or visual changes to your layout.
                    </p>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#146EF5]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          Webflow Head Code (Project Settings)
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            `<!-- CleanTraffic Webflow Landing Page Shield -->\n<script src="${effectiveEndpoint}/v1/protect.js" data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" async></script>`,
                            "Webflow Snippet"
                          )
                        }
                        className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy Webflow Tag"}</span>
                      </Button>
                    </div>
                    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                      <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
{`<!-- CleanTraffic Webflow Landing Page Shield -->
<script src="${effectiveEndpoint}/v1/protect.js" 
  data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" 
  async>
</script>`}
                      </pre>
                    </div>
                  </div>

                  {/* 3-Step Drop-in Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      3-Step Webflow Integration:
                    </span>
                    <ol className="list-decimal pl-4 space-y-2 text-[#64748B]">
                      <li>
                        Log in to your <strong>Webflow Dashboard</strong> and click <strong>Project Settings</strong> (gear icon) on your site.
                      </li>
                      <li>
                        Navigate to the <strong>Custom Code</strong> tab in the left sidebar.
                      </li>
                      <li>
                        Paste the snippet above into the <strong>Head Code</strong> textarea, click <strong>Save Changes</strong>, and click <strong>Publish</strong> to all domains.
                      </li>
                    </ol>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Webflow Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Ad Spend Protection:</strong> Flags invalid traffic and click farms from Google Ads and Meta campaigns before they drain your budget.</li>
                      <li><strong>Clean Form Submissions:</strong> Eliminates spam bot leads and automated CRM submissions.</li>
                      <li><strong>Zero Layout Shifts:</strong> Executes asynchronously in the background with zero disruption to Webflow animations or styles.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 7. FRAMER STARTUP WEBSITES DETAIL PAGE */}
              {selectedIntegration === "framer" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <FramerLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Framer Modern Startup Websites</h2>
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                            1-Click
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Startup Sites
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Protect your Framer startup website, design portfolio, or product launch page from bot clicks, competitors, and scrapers.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Framer websites run as high-performance React frontends. Adding CleanTraffic into Framer&apos;s Custom Code head injects autonomous hardware identification to classify legitimate humans versus headless automated browsers.
                    </p>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#0055FF]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          Framer Custom Code (Site Settings)
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            `<!-- CleanTraffic Framer Startup Site Shield -->\n<script src="${effectiveEndpoint}/v1/protect.js" data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" async></script>`,
                            "Framer Snippet"
                          )
                        }
                        className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy Framer Tag"}</span>
                      </Button>
                    </div>
                    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                      <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
{`<!-- CleanTraffic Framer Startup Site Shield -->
<script src="${effectiveEndpoint}/v1/protect.js" 
  data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" 
  async>
</script>`}
                      </pre>
                    </div>
                  </div>

                  {/* 3-Step Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      3-Step Framer Integration:
                    </span>
                    <ol className="list-decimal pl-4 space-y-2 text-[#64748B]">
                      <li>
                        In Framer, open your project and click <strong>Site Settings</strong> (gear icon in the top toolbar).
                      </li>
                      <li>
                        Under the <strong>General</strong> tab, scroll down to the <strong>Custom Code</strong> section.
                      </li>
                      <li>
                        Paste the snippet into the <strong>Head Start</strong> box, click <strong>Save</strong>, and click <strong>Publish</strong>.
                      </li>
                    </ol>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Framer Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Instant Live Analytics:</strong> View visitor device entropy and bot attempts in real-time in your dashboard.</li>
                      <li><strong>Zero Performance Degradation:</strong> Lightweight asynchronous agent never blocks visual rendering or CSS animations.</li>
                      <li><strong>Click Fraud Prevention:</strong> Shields startup launch traffic on Product Hunt, X, and paid acquisition.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 8. WIX & SQUARESPACE DETAIL PAGE */}
              {selectedIntegration === "wix" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <WixLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Wix &amp; Squarespace Website Builders</h2>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            No-Code
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Website Builders
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Add bot screening and hardware entropy visitor identification to Wix, Squarespace, and visual site builders.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Wix and Squarespace provide built-in Custom Code injection tools in their site dashboards. Adding CleanTraffic into your site head automatically runs client-side integrity checks on all incoming visitors across all pages.
                    </p>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#0F172A]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          Custom Code Snippet (Head Injection)
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            `<!-- CleanTraffic Wix & Squarespace Shield -->\n<script src="${effectiveEndpoint}/v1/protect.js" data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" async></script>`,
                            "Wix & Squarespace Snippet"
                          )
                        }
                        className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy Snippet"}</span>
                      </Button>
                    </div>
                    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                      <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
{`<!-- CleanTraffic Wix & Squarespace Shield -->
<script src="${effectiveEndpoint}/v1/protect.js" 
  data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" 
  async>
</script>`}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                      <span className="font-bold text-[#0F172A] uppercase tracking-wider block">Wix Setup:</span>
                      <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                        <li>Go to your <strong>Wix Dashboard</strong> &gt; <strong>Settings</strong>.</li>
                        <li>Click <strong>Custom Code</strong> in the Advanced section.</li>
                        <li>Click <strong>+ Add Custom Code</strong>, paste the snippet, choose <strong>Head</strong> and <strong>All Pages</strong>.</li>
                        <li>Click <strong>Apply</strong>.</li>
                      </ol>
                    </div>

                    <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                      <span className="font-bold text-[#0F172A] uppercase tracking-wider block">Squarespace Setup:</span>
                      <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                        <li>In Squarespace, go to <strong>Settings</strong> &gt; <strong>Developer Tools</strong>.</li>
                        <li>Click <strong>Code Injection</strong>.</li>
                        <li>Paste the snippet into the <strong>Header</strong> box.</li>
                        <li>Click <strong>Save</strong> at the top.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Platform Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Zero Coding:</strong> Works out of the box with standard dashboard custom code managers.</li>
                      <li><strong>Store &amp; Booking Protection:</strong> Stops automated inventory scraping and fake bookings.</li>
                      <li><strong>Geo &amp; VPN Detection:</strong> Enforces your security rules across all builder site pages.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 9. GOOGLE TAG MANAGER (GTM) DETAIL PAGE */}
              {selectedIntegration === "gtm" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <GoogleTagManagerLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Google Tag Manager (GTM)</h2>
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                            Tag Manager
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Zero Code Deploy
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Deploy CleanTraffic protection across any website, landing page, or multi-domain marketing campaign via GTM with zero code deployments.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      If your website or landing pages already use Google Tag Manager, you can roll out CleanTraffic in under 60 seconds without redeploying your site codebase or waiting for developers.
                    </p>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#246FDB]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          Custom HTML Tag (GTM Container)
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            `<!-- CleanTraffic Universal Protection Tag for GTM -->\n<script src="${effectiveEndpoint}/v1/protect.js" data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" async></script>`,
                            "GTM Tag"
                          )
                        }
                        className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy GTM Tag"}</span>
                      </Button>
                    </div>
                    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                      <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
{`<!-- CleanTraffic Universal Protection Tag for GTM -->
<script src="${effectiveEndpoint}/v1/protect.js" 
  data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" 
  async>
</script>`}
                      </pre>
                    </div>
                  </div>

                  {/* 3-Step Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      3-Step GTM Deployment:
                    </span>
                    <ol className="list-decimal pl-4 space-y-2 text-[#64748B]">
                      <li>
                        In your <strong>Google Tag Manager Workspace</strong>, click <strong>Tags</strong> &gt; <strong>New</strong>.
                      </li>
                      <li>
                        Click <strong>Tag Configuration</strong>, choose <strong>Custom HTML</strong>, and paste the code above.
                      </li>
                      <li>
                        Click <strong>Triggering</strong>, choose <strong>Initialization - All Pages</strong> (or <strong>All Pages</strong>), save the tag, and click <strong>Submit</strong> to publish your container.
                      </li>
                    </ol>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">GTM Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Instant Multi-Domain Rollout:</strong> One tag protects all subdomains and marketing properties connected to your container.</li>
                      <li><strong>No Engineering Deployments:</strong> Marketing teams can deploy and configure protection immediately.</li>
                      <li><strong>Early Triggering:</strong> Initializing on &apos;Initialization - All Pages&apos; captures visitor entropy at the earliest possible stage.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 10. HTML / REACT STATIC SITES & SDK DETAIL PAGE */}
              {selectedIntegration === "react" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <ReactLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">HTML &amp; React Static Sites &amp; SDK</h2>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Universal Web
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Render / Railway / S3 / Vite
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Universal client-side protection snippet and React hook for static websites, single page applications (SPAs), and custom landing pages hosted on Render, Railway, Vercel, Netlify, or AWS S3.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Text */}
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Overview</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Whether you deploy static HTML landing pages or a modern React / Vite SPA on Render or Railway, CleanTraffic provides a drop-in client tag or a React hook. It performs 100+ hardware entropy signals in the browser, identifying bots before they interact with signup buttons, login forms, or purchase flows.
                    </p>
                  </div>

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setReactSubTab("html")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        reactSubTab === "html"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Static HTML Tag (&lt;head&gt;)
                    </button>
                    <button
                      onClick={() => setReactSubTab("react")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        reactSubTab === "react"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      React Hook (useCleanTraffic)
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#00D8FF]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {reactSubTab === "html" ? "index.html (<head> tag)" : "hooks/useCleanTraffic.ts"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            reactSubTab === "html"
                              ? `<!-- CleanTraffic Universal Web Protection Tag -->\n<script src="${effectiveEndpoint}/v1/protect.js" data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" async></script>`
                              : `import { useEffect, useState } from "react";\n\nexport function useCleanTraffic() {\n  const [visitor, setVisitor] = useState(null);\n\n  useEffect(() => {\n    if (!document.getElementById("cleantraffic-agent")) {\n      const script = document.createElement("script");\n      script.id = "cleantraffic-agent";\n      script.src = "${effectiveEndpoint}/v1/protect.js";\n      script.setAttribute("data-api-key", "${apiKeyValue || "ctc_live_your_api_key_here"}");\n      script.async = true;\n      document.head.appendChild(script);\n    }\n\n    const check = setInterval(() => {\n      if ((window as any).CleanTraffic && typeof (window as any).CleanTraffic.get === "function") {\n        clearInterval(check);\n        (window as any).CleanTraffic.get().then((res: any) => setVisitor(res));\n      }\n    }, 50);\n\n    return () => clearInterval(check);\n  }, []);\n\n  return visitor;\n}`,
                            reactSubTab === "html" ? "HTML Tag" : "React Hook"
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
                        {reactSubTab === "html" ? (
`<!-- CleanTraffic Universal Web Protection Tag (Place inside <head>) -->
<script src="${effectiveEndpoint}/v1/protect.js" 
  data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" 
  async>
</script>`
                        ) : (
`import { useEffect, useState } from "react";

// React hook for CleanTraffic visitor & device identification
export function useCleanTraffic() {
  const [visitor, setVisitor] = useState<{
    visitorId?: string;
    deviceId?: string;
    isHuman?: boolean;
    confidenceScore?: number;
  } | null>(null);

  useEffect(() => {
    // 1. Inject CleanTraffic agent if not already in document
    if (!document.getElementById("cleantraffic-agent")) {
      const script = document.createElement("script");
      script.id = "cleantraffic-agent";
      script.src = "${effectiveEndpoint}/v1/protect.js";
      script.setAttribute("data-api-key", "${apiKeyValue || "ctc_live_your_api_key_here"}");
      script.async = true;
      document.head.appendChild(script);
    }

    // 2. Resolve visitor hardware entropy asynchronously (Fingerprint style)
    const check = setInterval(() => {
      if ((window as any).CleanTraffic && typeof (window as any).CleanTraffic.get === "function") {
        clearInterval(check);
        (window as any).CleanTraffic.get().then((res: any) => {
          setVisitor(res);
        });
      }
    }, 50);

    return () => clearInterval(check);
  }, []);

  return visitor;
}`
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Drop-in Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      {reactSubTab === "html" ? "Static HTML Setup:" : "React App Setup:"}
                    </span>
                    {reactSubTab === "html" ? (
                      <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                        <li>Open your <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">index.html</code> file.</li>
                        <li>Paste the tag above inside the <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">&lt;head&gt;</code> element.</li>
                        <li>Deploy to Render, Railway, Vercel, S3, or your web host. Protection starts immediately.</li>
                      </ol>
                    ) : (
                      <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                        <li>Save the code above into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">src/hooks/useCleanTraffic.ts</code>.</li>
                        <li>Call <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">const visitor = useCleanTraffic()</code> inside your signup page or protected component.</li>
                        <li>Check <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">visitor?.isHuman</code> before allowing form submission.</li>
                      </ol>
                    )}
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Universal Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Works Anywhere:</strong> Deploy on Render, Railway, GitHub Pages, Netlify, Vercel, S3, or custom hosting.</li>
                      <li><strong>Zero Backend Architecture Required:</strong> Intercepts and screens bots on the frontend before any user resources are wasted.</li>
                      <li><strong>Fingerprint-Style SDK API:</strong> Provides clean Promise-based async API <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">window.CleanTraffic.get()</code> for custom frontend checks.</li>
                    </ul>
                  </div>
                </div>
              )}
                </>
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

          {/* Top Segmented Control (Agent setup vs Manual setup - Matching Fingerprint Screenshot) */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-[#E5EAE7] rounded-xl p-3 shadow-xs">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/90 w-fit">
              <button
                onClick={() => setSetupMode("agent")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  setupMode === "agent"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#F25A2A]" />
                <span>Agent setup</span>
              </button>
              <button
                onClick={() => setSetupMode("manual")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  setupMode === "manual"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>Manual setup</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
              {setupMode === "agent" ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-[#F25A2A]" />
                  AI assistant automated prompt (Cursor, Claude Code, Windsurf, Copilot).
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Manual code snippets, edge workers, and downloadable plugins.
                </span>
              )}
            </div>
          </div>

          {setupMode === "agent" ? (
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs">
              <AgentSetupView
                apiKeyValue={apiKeyValue || ""}
                effectiveEndpoint={effectiveEndpoint}
                targetStack="nextjs"
                initialDeflection={userSettings?.botUrl === "404" ? "404" : (userSettings?.botUrl?.startsWith("http") ? "redirect" : "403")}
                initialBotUrl={userSettings?.botUrl?.startsWith("http") ? userSettings.botUrl : ""}
                onNavigateToLiveFeed={() => navigate("/dashboard?tab=traffic")}
                onDeflectionChange={handleManualDeflectionChange}
              />
            </div>
          ) : (
            <>
              {/* Filter Pills (Fingerprint Style) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All" },
                { id: "nocode", label: "Edge & No-Code" },
                { id: "builders", label: "Website Builders" },
                { id: "web", label: "Web Frameworks" },
                { id: "cms", label: "E-Commerce & CMS" },
                { id: "integrations", label: "Tag Managers" },
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
                    if (item.id === "react") setReactSubTab("html");
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
            </>
          )}
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
