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
  generateReactHook,
  generateNextJsScriptSnippet,
  generateVueSnippet,
  generateAngularSnippet,
  generatePreactSnippet,
  generateSvelteSnippet,
} from "@shared/integrationGenerators";
import {
  CloudflareLogo,
  ShopifyLogo,
  WordPressLogo,
  NextJsLogo,
  PhpLogo,
  ReactLogo,
  JavaScriptLogo,
  WebflowLogo,
  FramerLogo,
  WixLogo,
  VueLogo,
  AngularLogo,
  SvelteLogo,
  PreactLogo,
  SquarespaceLogo,
} from "./IntegrationLogos";
import { AgentSetupView } from "./AgentSetupView";
import { SyncedPolicyBanner } from "./SyncedPolicyBanner";
import type { Ruleset } from "@shared/rulesEngine";

export type IntegrationStack =
  | "javascript"
  | "react"
  | "nextjs"
  | "vue"
  | "angular"
  | "preact"
  | "svelte"
  | "cloudflare"
  | "php"
  | "wordpress"
  | "shopify"
  | "wix"
  | "webflow"
  | "framer";

export type IntegrationCategory = "all" | "frameworks" | "builders" | "server" | "cms";

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
  onNavigateTab?: (tab: string) => void;
}

export function UserIntegrationTab({
  apiKeyValue,
  customEndpoint,
  setCustomEndpoint,
  onNavigateTab,
}: UserIntegrationTabProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to navigate tabs in dashboard or use router
  const handleNavigateToRules = () => {
    if (onNavigateTab) {
      onNavigateTab("routing");
    } else {
      navigate("/user?tab=routing");
    }
  };

  const handleNavigateToLiveFeed = () => {
    if (onNavigateTab) {
      onNavigateTab("live");
    } else {
      navigate("/user?tab=live");
    }
  };

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
  const [reactSubTab, setReactSubTab] = useState<"hook" | "usage">("hook");
  const [nextSubTab, setNextSubTab] = useState<"script" | "middleware">("script");
  const [vueSubTab, setVueSubTab] = useState<"composable" | "usage">("composable");
  const [angularSubTab, setAngularSubTab] = useState<"service" | "usage">("service");
  const [preactSubTab, setPreactSubTab] = useState<"hook" | "usage">("hook");
  const [svelteSubTab, setSvelteSubTab] = useState<"component" | "usage">("component");
  const [jsSubTab, setJsSubTab] = useState<"tag" | "api">("tag");

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

  // Interstitial Loading state (applicable across client scripts and PHP)
  const [enableLoading, setEnableLoading] = useState<boolean>(true);
  const [phpTargetUrl, setPhpTargetUrl] = useState<string>("https://yourdomain.com/landing-page");
  const [phpBotAction, setPhpBotAction] = useState<"403" | "404" | "redirect">("403");
  const [phpBotRedirectUrl, setPhpBotRedirectUrl] = useState<string>("https://google.com");
  const [selectedThemeCategory, setSelectedThemeCategory] = useState<string>("All");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("clean_light");
  const [customHeading, setCustomHeading] = useState<string>("Verifying your connection...");
  const [customSubnote, setCustomSubnote] = useState<string>("Please wait while we secure your session.");
  const [previewTheme, setPreviewTheme] = useState<InterstitialTheme | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [hasUnsavedThemeChanges, setHasUnsavedThemeChanges] = useState<boolean>(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState<boolean>(false);

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
      if (userSettings.humanUrl) {
        setPhpTargetUrl(userSettings.humanUrl);
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

  // Rulesets parsed from user settings to drive live synced status
  const parsedRulesets: Ruleset[] = useMemo(() => {
    if (!userSettings?.rulesetsConfig) return [];
    try {
      const parsed = JSON.parse(userSettings.rulesetsConfig);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [userSettings?.rulesetsConfig]);

  // Effective bot target derived directly from active ruleset or legacy botUrl
  const effectiveManualBotTarget = useMemo(() => {
    const activeRuleset = parsedRulesets.find((r) => r.enabled);
    if (activeRuleset) {
      if (activeRuleset.responseMode === "single" && activeRuleset.singleResponse) {
        const single = activeRuleset.singleResponse;
        if (single.action === "redirect" && single.redirectUrl) return single.redirectUrl.trim();
        if (single.statusCode) return String(single.statusCode);
      } else if (activeRuleset.rules?.length > 0) {
        const activeStep = activeRuleset.rules.find((s) => s.enabled);
        if (activeStep) {
          if (activeStep.action === "redirect" && activeStep.redirectUrl) return activeStep.redirectUrl.trim();
          if (activeStep.statusCode) return String(activeStep.statusCode);
        }
      }
    }
    return userSettings?.botUrl?.trim() || "403";
  }, [parsedRulesets, userSettings?.botUrl]);

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
    phpHumanUrl: phpTargetUrl,
    phpBotAction,
    phpBotRedirectUrl,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 2. Generate Cloudflare Edge Worker script (pure edge worker)
  const cloudflareWorkerCode = generateCloudflareWorkerScript({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
    humanTargetUrl: userSettings?.humanUrl || "",
    botTargetUrl: effectiveManualBotTarget,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 3. Generate JavaScript Snippet (Shopify / Wix / Webflow client-side protect tag)
  const jsSnippet = generateJsSnippet({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
    themeId: selectedThemeId,
    heading: customHeading,
    subnote: customSubnote,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 4. Generate WordPress Plugin PHP (WordPress lifecycle guard)
  const wordPressPluginCode = generateWordPressPluginPhp({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
    heading: customHeading,
    subnote: customSubnote,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 5. Generate Next.js Edge Middleware (pure HTTP edge middleware)
  const nextJsMiddlewareCode = generateNextJsMiddleware({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
    botTargetUrl: effectiveManualBotTarget,
    failMode: protectionFailMode,
    timeoutMs: protectionTimeoutMs,
  });

  // 6. Framework Snippets
  const reactHookCode = generateReactHook({ apiKeyValue, effectiveEndpoint, enableLoading, failMode: protectionFailMode });
  const nextJsScriptCode = generateNextJsScriptSnippet({ apiKeyValue, effectiveEndpoint, enableLoading, failMode: protectionFailMode });
  const vueComposableCode = generateVueSnippet({ apiKeyValue, effectiveEndpoint, enableLoading, failMode: protectionFailMode });
  const angularServiceCode = generateAngularSnippet({ apiKeyValue, effectiveEndpoint, enableLoading, failMode: protectionFailMode });
  const preactHookCode = generatePreactSnippet({ apiKeyValue, effectiveEndpoint, enableLoading, failMode: protectionFailMode });
  const svelteComponentCode = generateSvelteSnippet({ apiKeyValue, effectiveEndpoint, enableLoading, failMode: protectionFailMode });

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
        `2. Protection Mode: Interstitial Loading Verification Shield (${activeTheme.name})\n` +
        `3. Heading Text: "${customHeading}"\n` +
        `4. Ensure PHP 7.4+ with standard cURL extension is enabled.\n` +
        `5. Real human visitors see the clean verification splash (<15ms) while security tokens are validated in the background.\n` +
        `6. All paid ad click tokens (fbclid, gclid, ttclid, msclkid, twclid, wbraid, gbraid) and UTM parameters are automatically captured.\n` +
        `7. Testing: Visit https://yourdomain.com/index.php?gclid=test1234\n`
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleantraffic-${activeTheme.id}-php.zip`;
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
  // Directory integration items definition (Organized by Frameworks, Builders, Server, CMS)
  const integrationDirectory: IntegrationItem[] = useMemo(() => [
    // Web Frameworks & SDKs
    {
      id: "javascript",
      targetStack: "javascript",
      name: "JavaScript",
      subtitle: "Identify visitors on your website",
      category: "frameworks",
      badge: "Universal",
      badgeStyle: "bg-amber-50 text-amber-800 border-amber-200",
      LogoComponent: JavaScriptLogo,
      summary: "Drop-in universal JavaScript agent tag or async Promise SDK for any static website, landing page, or custom HTML app.",
      tags: ["JavaScript", "HTML", "Vanilla", "Static", "Web", "SDK", "Script"],
    },
    {
      id: "react",
      targetStack: "react",
      name: "React",
      subtitle: "Identify visitors on your React website",
      category: "frameworks",
      badge: "Hook",
      badgeStyle: "bg-cyan-50 text-cyan-800 border-cyan-200",
      LogoComponent: ReactLogo,
      summary: "Custom React hook (useCleanTraffic) for React 18 & 19 SPAs, Vite, Create React App, and component trees.",
      tags: ["React", "Vite", "Hook", "SPA", "TypeScript", "Frontend"],
    },
    {
      id: "nextjs",
      targetStack: "nextjs",
      name: "Next.js",
      subtitle: "Identify visitors on your Next.js website",
      category: "frameworks",
      badge: "Edge & Script",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: NextJsLogo,
      summary: "Full Next.js App & Pages Router integration with next/script client agent or zero-latency Edge Middleware.",
      tags: ["Next.js", "Vercel", "Edge", "App Router", "SSR", "Server"],
    },
    {
      id: "vue",
      targetStack: "vue",
      name: "Vue.js",
      subtitle: "Identify visitors on your Vue.js website",
      category: "frameworks",
      badge: "Composable",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: VueLogo,
      summary: "Vue 3 Composition API composable (useCleanTraffic) and Nuxt 3 plugin for visitor identification and bot filtering.",
      tags: ["Vue", "Nuxt", "Vite", "Composable", "Frontend"],
    },
    {
      id: "angular",
      targetStack: "angular",
      name: "Angular",
      subtitle: "Identify visitors on your Angular website",
      category: "frameworks",
      badge: "Service",
      badgeStyle: "bg-red-50 text-red-800 border-red-200",
      LogoComponent: AngularLogo,
      summary: "Injectable CleanTrafficService with SSR guards for Angular 15, 16, 17, and 18 enterprise applications.",
      tags: ["Angular", "TypeScript", "Service", "Enterprise", "SPA"],
    },
    {
      id: "preact",
      targetStack: "preact",
      name: "Preact",
      subtitle: "Identify visitors on your Preact website",
      category: "frameworks",
      badge: "Ultralight",
      badgeStyle: "bg-purple-50 text-purple-800 border-purple-200",
      LogoComponent: PreactLogo,
      summary: "Ultra-lightweight Preact hook for 3KB bundle apps, Deno Fresh, or performant mobile web applications.",
      tags: ["Preact", "Hook", "Mobile", "Fresh", "Lightweight"],
    },
    {
      id: "svelte",
      targetStack: "svelte",
      name: "Svelte",
      subtitle: "Identify visitors on your Svelte website",
      category: "frameworks",
      badge: "Component",
      badgeStyle: "bg-orange-50 text-orange-800 border-orange-200",
      LogoComponent: SvelteLogo,
      summary: "Svelte 4 & Svelte 5 / SvelteKit component with writable store for reactive visitor tracking.",
      tags: ["Svelte", "SvelteKit", "Store", "Reactive", "Vite"],
    },
    // Server & Edge Infrastructure
    {
      id: "cloudflare",
      targetStack: "cloudflare",
      name: "Cloudflare",
      subtitle: "Universal Edge Worker",
      category: "server",
      badge: "Any Host",
      badgeStyle: "bg-orange-50 text-orange-800 border-orange-200",
      LogoComponent: CloudflareLogo,
      summary: "Deploy in front of ANY host (Render, Railway, VPS, Vercel) to stop bots at 300+ Edge POPs before they reach origin.",
      tags: ["Cloudflare", "Edge", "Render", "Railway", "VPS", "Worker"],
    },
    {
      id: "php",
      targetStack: "php",
      name: "PHP",
      subtitle: "index.php Shield & Gateway",
      category: "server",
      badge: "Redirect Safe",
      badgeStyle: "bg-indigo-50 text-indigo-800 border-indigo-200",
      LogoComponent: PhpLogo,
      summary: "Standalone PHP shield for direct landing page funnels, cPanel, or CyberPanel with custom Redirect URL Deflection.",
      tags: ["PHP", "cPanel", "CyberPanel", "Landing Page", "Funnels"],
    },
    // CMS & Platforms
    {
      id: "wordpress",
      targetStack: "wordpress",
      name: "WordPress",
      subtitle: "WordPress & WooCommerce Plugin",
      category: "cms",
      badge: "1-Click Zip",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      LogoComponent: WordPressLogo,
      summary: "Dedicated Must-Use plugin (.zip) for blogs, landing pages, and WooCommerce fraud prevention.",
      tags: ["WordPress", "WooCommerce", "Plugin", "PHP", "CMS"],
    },
    {
      id: "shopify",
      targetStack: "shopify",
      name: "Shopify",
      subtitle: "Storefront Web Pixel & Liquid",
      category: "cms",
      badge: "Active",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      LogoComponent: ShopifyLogo,
      summary: "Add CleanTraffic protection tag to your Shopify store in theme.liquid to protect checkout & ad spend.",
      tags: ["Shopify", "Store", "Liquid", "E-Commerce", "Web"],
    },
    // Site Builders & No-Code CMS
    {
      id: "wix",
      targetStack: "wix",
      name: "Wix & Squarespace",
      subtitle: "Website Builders Custom Code",
      category: "builders",
      badge: "No-Code",
      badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
      LogoComponent: WixLogo,
      summary: "Add bot screening and hardware entropy visitor identification to Wix or Squarespace sites via Custom Code.",
      tags: ["Wix", "Squarespace", "Website Builder", "Custom Code", "Builders"],
    },
    {
      id: "webflow",
      targetStack: "webflow",
      name: "Webflow & Framer",
      subtitle: "Landing Pages & Startup Sites",
      category: "builders",
      badge: "1-Click",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      LogoComponent: WebflowLogo,
      summary: "1-Click Custom Code integration for high-converting Webflow and Framer landing pages and marketing sites.",
      tags: ["Webflow", "Framer", "Landing Page", "Custom Code", "No-Code", "Builders"],
    },
  ], []);

  // Filter integration cards based on search and category
  const filteredIntegrations = useMemo(() => {
    return integrationDirectory.filter((item) => {
      let matchesCategory = true;
      if (activeCategory === "frameworks") matchesCategory = item.category === "frameworks";
      else if (activeCategory === "builders") matchesCategory = item.category === "builders";
      else if (activeCategory === "server") matchesCategory = item.category === "server";
      else if (activeCategory === "cms") matchesCategory = item.category === "cms";

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

  // Reusable Interstitial Theme Customizer Content (shared between PHP sub-tab and universal Dialog)
  const renderThemeCustomizerContent = () => (
    <div className="space-y-5">
      {/* Active Interstitial Loading Banner & Actions */}
      <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className="h-4 w-4 text-[#0A5C48]" />
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Interstitial Loading Verification Shield
              </span>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                &lt;15ms Visual Splash
              </Badge>
            </div>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              Choose your preferred loading style and custom headline/subnote below. Real human visitors see the high-speed security splash while background tokens and client entropy are verified.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewTheme(activeTheme)}
              className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#0F172A] gap-1.5 rounded-lg font-semibold shadow-2xs"
            >
              <Eye className="h-3.5 w-3.5 text-[#0A5C48]" />
              <span>Preview Current Theme</span>
            </Button>

            <Button
              onClick={() => saveThemeMutation.mutate()}
              disabled={saveThemeMutation.isPending || !hasUnsavedThemeChanges}
              className={`h-8 px-4 text-xs font-bold rounded-lg transition-all shadow-2xs ${
                hasUnsavedThemeChanges
                  ? "bg-[#0A5C48] hover:bg-[#07382D] text-white"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              <span>{saveThemeMutation.isPending ? "Saving..." : "Save Preference"}</span>
            </Button>
          </div>
        </div>

        {/* Text Customization Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-[#E0E9E4]">
          <div>
            <Label className="text-xs font-bold text-[#0F172A] flex items-center justify-between">
              <span>Headline Text</span>
              <span className="text-[10px] text-[#64748B] font-normal">Replaces {"{{HEADING}}"}</span>
            </Label>
            <Input
              value={customHeading}
              onChange={(e) => handleHeadingChange(e.target.value)}
              placeholder="Verifying your connection..."
              className="bg-white text-xs h-9 mt-1 border-slate-200 focus-visible:ring-[#0A5C48]"
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-[#0F172A] flex items-center justify-between">
              <span>Subnote Text</span>
              <span className="text-[10px] text-[#64748B] font-normal">Replaces {"{{SUBNOTE}}"}</span>
            </Label>
            <Input
              value={customSubnote}
              onChange={(e) => handleSubnoteChange(e.target.value)}
              placeholder="Please wait while we secure your session."
              className="bg-white text-xs h-9 mt-1 border-slate-200 focus-visible:ring-[#0A5C48]"
            />
          </div>
        </div>
      </div>

      {/* Theme Selector Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#0A5C48]" />
            <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Choose Loading Style ({filteredThemes.length})
            </span>
          </div>
          <span className="text-xs text-[#64748B]">
            Current: <strong className="text-[#0F172A]">{activeTheme.name}</strong>
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["All", "Light", "Minimal", "Corporate", "Security", "Dark"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedThemeCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedThemeCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-[#0A5C48] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Theme Cards Grid with Preview Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {filteredThemes.map((t) => {
            const isSelected = selectedThemeId === t.id;
            return (
              <div
                key={t.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-[#0A5C48] bg-emerald-50/40 ring-1 ring-[#0A5C48] shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: t.previewBg }}
                        title={`Accent: ${t.previewAccent}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: t.previewAccent }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#0F172A] line-clamp-1">{t.name}</span>
                    </div>
                    {isSelected ? (
                      <Badge className="bg-[#0A5C48] text-white text-[10px] font-bold px-1.5 py-0">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 font-medium px-1.5 py-0">
                        {t.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2 min-h-[32px]">
                    {t.description || "Fast security verification interstitial."}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3.5 pt-2.5 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTheme(t);
                    }}
                    className="h-7 text-xs border-slate-200 hover:bg-slate-100 text-slate-700 flex-1 gap-1 font-semibold rounded-md"
                  >
                    <Eye className="h-3 w-3 text-slate-500" />
                    <span>Preview</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSelectTheme(t.id)}
                    className={`h-7 text-xs flex-1 gap-1 font-bold rounded-md ${
                      isSelected
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-default"
                        : "bg-white border border-[#0A5C48] text-[#0A5C48] hover:bg-emerald-50"
                    }`}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : null}
                    <span>{isSelected ? "Selected" : "Choose Style"}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Reusable Interstitial Banner for every integration page
  const renderInterstitialControlBanner = (platformName: string) => (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg border border-slate-300 shadow-2xs shrink-0 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          style={{ backgroundColor: activeTheme.previewBg }}
          title={`Active Style: ${activeTheme.name} (Accent: ${activeTheme.previewAccent})`}
          onClick={() => setPreviewTheme(activeTheme)}
        >
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: activeTheme.previewAccent }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#0F172A]">
              Interstitial Loading Verification
            </span>
            <Badge
              className={
                enableLoading
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold"
                  : "bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-medium"
              }
            >
              {enableLoading ? `Enabled • ${activeTheme.name}` : "Disabled (Passive / Transparent)"}
            </Badge>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            {enableLoading
              ? `Visitors to your ${platformName} site see the "${activeTheme.name}" visual verification splash while tokens are verified in <15ms.`
              : `Passive background verification on ${platformName}. Real humans experience zero loading delay.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewTheme(activeTheme)}
          className="h-7 text-xs border-slate-200 bg-white hover:bg-slate-100 text-slate-700 gap-1.5 rounded-md font-semibold shadow-2xs"
        >
          <Eye className="h-3 w-3 text-slate-500" />
          <span>Preview Screen</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsThemePickerOpen(true)}
          className="h-7 text-xs border-emerald-300 bg-emerald-50/70 text-[#0A5C48] hover:bg-emerald-100/70 gap-1.5 rounded-md font-bold shadow-2xs"
        >
          <Palette className="h-3 w-3 text-[#0A5C48]" />
          <span>Choose Style & Texts</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* VIEW A: DEDICATED DETAIL PAGE (Inspired by Screenshots 2 & 4) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {selectedIntegration && currentItem ? (
        <div className="space-y-6">
          {/* Top Header Strip with Breadcrumb Back Button and Quick Docs/Support Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIntegration(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F172A] transition-colors group px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-[#0A5C48]" />
                <span>Libraries &amp; integrations</span>
              </button>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <span className="font-medium">Active:</span>
                <span className="font-bold text-[#0F172A]">{currentItem.name}</span>
              </div>
            </div>

            {/* Quick Actions: Docs & Support links */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/docs#installation")}
                className="h-8 text-xs border-[#D5DFD9] text-[#0F172A] hover:bg-[#F2F6F4] gap-1.5 rounded-lg font-medium"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#0A5C48]" />
                <span>Docs</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/docs#support")}
                className="h-8 text-xs border-[#D5DFD9] text-[#0F172A] hover:bg-[#F2F6F4] gap-1.5 rounded-lg font-medium"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[#0A5C48]" />
                <span>Support</span>
              </Button>
            </div>
          </div>

          {/* Compact Horizontal Integration Configuration Bar */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-3.5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              {/* Assigned API Key */}
              <div className="flex items-center gap-2.5 bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg px-3 py-1.5">
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Assigned API Key</span>
                  <span className="font-mono text-xs font-bold text-[#0A5C48]">
                    {apiKeyValue ? (showKey ? apiKeyValue : maskKey(apiKeyValue)) : "Loading key..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-xs text-[#0A5C48] hover:text-[#07382D] font-bold p-1 hover:bg-emerald-50 rounded"
                  title={showKey ? "Hide key" : "Reveal key"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyKey}
                  className="h-7 w-7 p-0 text-[#64748B] hover:text-[#0F172A]"
                  title="Copy API Key"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-[#0A5C48]" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Edge Fallback, Timeout & Host controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Fallback */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg p-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase px-1">Fallback:</span>
                  <button
                    type="button"
                    onClick={() => setProtectionFailMode("open")}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      protectionFailMode === "open"
                        ? "bg-white text-[#0A5C48] shadow-2xs border border-emerald-200 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Fail-Open: High availability (allow genuine visitors on API error/timeout)"
                  >
                    Fail-Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setProtectionFailMode("closed")}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      protectionFailMode === "closed"
                        ? "bg-white text-[#0A5C48] shadow-2xs border border-emerald-200 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Fail-Closed: Maximum security (deflects with HTTP status on error)"
                  >
                    Fail-Closed
                  </button>
                </div>

                {/* Loading Screen Toggle */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg p-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase px-1">Loading Screen:</span>
                  <button
                    type="button"
                    onClick={() => setEnableLoading(true)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      enableLoading
                        ? "bg-white text-[#0A5C48] shadow-2xs border border-emerald-200 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Display verifying security progress bar overlay"
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnableLoading(false)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      !enableLoading
                        ? "bg-white text-[#0A5C48] shadow-2xs border border-emerald-200 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Passive background verification (Zero visual delay)"
                  >
                    Disabled
                  </button>
                </div>

                {/* Choose Style & Preview Action Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsThemePickerOpen(true)}
                    className="h-8 text-xs border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 text-[#0A5C48] gap-1 font-bold rounded-lg shadow-2xs"
                    title="Choose Interstitial Loading Style & Texts"
                  >
                    <Palette className="h-3.5 w-3.5 text-[#0A5C48]" />
                    <span>Style: {activeTheme.name}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewTheme(activeTheme)}
                    className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 font-semibold gap-1"
                    title="Instant Live Preview of Active Interstitial Theme"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span>Preview</span>
                  </Button>
                </div>

                {/* Timeout */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg p-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase px-1">Timeout:</span>
                  {[250, 400, 600].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setProtectionTimeoutMs(t)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        protectionTimeoutMs === t
                          ? "bg-[#0A5C48] text-white font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t}ms
                    </button>
                  ))}
                </div>

                {/* Host */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Host:</span>
                  <Input
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="https://your-domain.com"
                    className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs font-mono h-8 w-44"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Full-Width Content Layout */}
          <div className="space-y-6">
            {/* Segmented Control: Manual setup vs Agent setup */}
            <div className="flex items-center justify-between">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/90 w-fit">
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
              </div>
            </div>

            {detailSetupMode === "agent" ? (
              <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs w-full">
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
                    rulesets={parsedRulesets}
                    serverBotUrl={userSettings?.botUrl}
                    onNavigateToLiveFeed={handleNavigateToLiveFeed}
                    onNavigateToRules={handleNavigateToRules}
                    onSelectStack={(stack) => setSelectedIntegration(stack as IntegrationStack)}
                  />
                </div>
              ) : (
                <>
                  {/* Synced Policy Status Banner for Manual Mode */}
                  {selectedIntegration && (
                    <SyncedPolicyBanner
                      rulesets={parsedRulesets}
                      serverBotUrl={userSettings?.botUrl}
                      onNavigateToRules={handleNavigateToRules}
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

                  {renderInterstitialControlBanner("Cloudflare Edge")}

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

                  {renderInterstitialControlBanner("Shopify")}

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

                  {renderInterstitialControlBanner("WordPress")}

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
                      Upload <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">index.php</code> to your web directory or ad campaign root. Visitors see an instant, customizable interstitial loading verification splash (&lt;15ms) while security tokens and client entropy are validated in the background. Automated bots and malicious scrapers are blocked before touching your application.
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
                    <div className="space-y-4">
                      {renderInterstitialControlBanner("PHP Gateway")}
                      {/* PHP Gateway Funnel Configuration */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-[#0A5C48]" />
                            <span>PHP Gateway Funnel Configuration</span>
                          </h4>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                            Preserves fbclid, gclid, utm_*
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Legitimate Buyer Destination */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Allowed Buyer Destination (Human Target URL)
                            </label>
                            <Input
                              value={phpTargetUrl}
                              onChange={(e) => setPhpTargetUrl(e.target.value)}
                              placeholder="https://yourdomain.com/landing-page"
                              className="bg-white border-slate-200 text-xs font-mono h-8"
                            />
                            <p className="text-[10px] text-slate-500">
                              Genuine human buyers will be forwarded here with all query parameters intact.
                            </p>
                          </div>

                          {/* Bot Mitigation Action */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Bot Mitigation Action
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { id: "403", label: "403 Forbidden" },
                                { id: "404", label: "404 Not Found" },
                                { id: "redirect", label: "Decoy URL" },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setPhpBotAction(opt.id as any)}
                                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                                    phpBotAction === opt.id
                                      ? "bg-white border-[#0A5C48] text-[#0A5C48] font-bold shadow-2xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {phpBotAction === "redirect" ? (
                              <Input
                                value={phpBotRedirectUrl}
                                onChange={(e) => setPhpBotRedirectUrl(e.target.value)}
                                placeholder="https://google.com or decoy page"
                                className="bg-white border-slate-200 text-xs font-mono h-8 mt-1.5"
                              />
                            ) : (
                              <p className="text-[10px] text-slate-500">
                                Bots and scrapers receive this HTTP response directly in-place.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

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

                  {phpSubTab === "themes" && renderThemeCustomizerContent()}

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

              {/* 5. NEXT.JS INTEGRATION DETAIL PAGE */}
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
                          <h2 className="text-xl font-bold text-[#0F172A]">Next.js Integration</h2>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            App &amp; Pages Router
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Next.js 13/14/15
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Identify visitors on your Next.js website via client-side <code className="font-mono text-[#0A5C48]">next/script</code> or protect full routes with zero-latency Edge Middleware.
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderInterstitialControlBanner("Next.js")}

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setNextSubTab("script")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        nextSubTab === "script"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Client Script (app/layout.tsx)
                    </button>
                    <button
                      onClick={() => setNextSubTab("middleware")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        nextSubTab === "middleware"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Edge Middleware (middleware.ts)
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#0F172A]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {nextSubTab === "script" ? "app/layout.tsx (or pages/_app.tsx)" : "middleware.ts (Root of Next.js Project)"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            nextSubTab === "script" ? nextJsScriptCode : nextJsMiddlewareCode,
                            nextSubTab === "script" ? "Next.js Script" : "Next.js Middleware"
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
                        {nextSubTab === "script" ? nextJsScriptCode : nextJsMiddlewareCode}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      {nextSubTab === "script" ? "Client Script Setup:" : "Edge Middleware Setup:"}
                    </span>
                    {nextSubTab === "script" ? (
                      <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                        <li>Open your root layout file <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">app/layout.tsx</code> (App Router) or <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">pages/_app.tsx</code> (Pages Router).</li>
                        <li>Import <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">Script from &apos;next/script&apos;</code> and place the tag inside your layout body.</li>
                        <li>The script loads asynchronously after interactive state and begins collecting visitor signals.</li>
                      </ol>
                    ) : (
                      <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                        <li>Create or open <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">middleware.ts</code> in the root folder of your Next.js project.</li>
                        <li>Paste the middleware code into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">middleware.ts</code>.</li>
                        <li>Deploy to Vercel, Render, Netlify, or custom VPS. Every incoming request is screened at the edge before route handlers execute.</li>
                      </ol>
                    )}
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Next.js Benefits</h3>
                    <ul className="text-xs text-[#64748B] space-y-2 list-disc pl-5 leading-relaxed">
                      <li><strong>Dual Layer Architecture:</strong> Run client-side visitor identification or edge route interception seamlessly.</li>
                      <li><strong>Zero Cold-Start Lag:</strong> Edge Middleware executes in sub-millisecond edge workers before SSR renders.</li>
                      <li><strong>Next.js 13, 14 &amp; 15 Ready:</strong> Fully compliant with Turbopack, App Router Server Components, and traditional Pages Router.</li>
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

                  {renderInterstitialControlBanner("Webflow")}

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

                  {renderInterstitialControlBanner("Framer")}

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

                  {renderInterstitialControlBanner("Wix")}

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


              {/* 10. JAVASCRIPT VANILLA / HTML DETAIL PAGE */}
              {selectedIntegration === "javascript" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <JavaScriptLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">JavaScript Universal Web Agent</h2>
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                            Universal Script
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Any HTML / Website
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Identify visitors on your website with a single asynchronous JavaScript tag. Works with any static website, custom landing page, or frontend application.
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderInterstitialControlBanner("JavaScript")}

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setJsSubTab("tag")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        jsSubTab === "tag"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Script Tag (&lt;head&gt;)
                    </button>
                    <button
                      onClick={() => setJsSubTab("api")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        jsSubTab === "api"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Async API (CleanTraffic.get)
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#F7DF1E]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {jsSubTab === "tag" ? "index.html (<head> tag)" : "Custom Script Usage"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            jsSubTab === "tag"
                              ? `<!-- CleanTraffic Universal Web Protection Tag -->\n<script src="${effectiveEndpoint}/v1/protect.js" data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" async></script>`
                              : jsSdkCode,
                            jsSubTab === "tag" ? "JavaScript Tag" : "Async API Script"
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
                        {jsSubTab === "tag" ? (
`<!-- CleanTraffic Universal Web Protection Tag (Place inside <head>) -->
<script src="${effectiveEndpoint}/v1/protect.js" 
  data-api-key="${apiKeyValue || "ctc_live_your_api_key_here"}" 
  async>
</script>`
                        ) : (
                          jsSdkCode
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      3-Step Setup Instructions:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                      <li>Open your website&apos;s HTML template (e.g., <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">index.html</code>).</li>
                      <li>Paste the <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">&lt;script&gt;</code> tag right before <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">&lt;/head&gt;</code>.</li>
                      <li>Deploy your website. CleanTraffic runs passively in the background without slowing down page load.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 11. REACT HOOK DETAIL PAGE */}
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
                          <h2 className="text-xl font-bold text-[#0F172A]">React Integration</h2>
                          <Badge className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] font-bold">
                            React Hook
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            React 18 &amp; 19
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Identify visitors on your React website. Drop the hook into your component layer to detect bots and query device identification.
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderInterstitialControlBanner("React")}

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setReactSubTab("hook")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        reactSubTab === "hook"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Hook (src/hooks/useCleanTraffic.ts)
                    </button>
                    <button
                      onClick={() => setReactSubTab("usage")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        reactSubTab === "usage"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Component Usage (SignupForm.tsx)
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#00D8FF]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {reactSubTab === "hook" ? "src/hooks/useCleanTraffic.ts" : "src/components/SignupForm.tsx"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            reactSubTab === "hook"
                              ? reactHookCode
                              : `import React, { useState } from "react";\nimport { useCleanTraffic } from "../hooks/useCleanTraffic";\n\nexport function SignupForm() {\n  const { visitor, loading } = useCleanTraffic();\n  const [email, setEmail] = useState("");\n  const [errorMsg, setErrorMsg] = useState("");\n\n  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n\n    // Screen bots or fraudulent traffic before submitting\n    if (visitor && !visitor.isHuman) {\n      setErrorMsg("Automated or fraudulent traffic detected.");\n      return;\n    }\n\n    setErrorMsg("");\n    console.log("Submitting account for human visitor:", visitor?.visitorId);\n  };\n\n  return (\n    <form onSubmit={handleSubmit} className="space-y-4">\n      {errorMsg && (\n        <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded">\n          {errorMsg}\n        </div>\n      )}\n      <input \n        type="email" \n        value={email} \n        onChange={(e) => setEmail(e.target.value)} \n        placeholder="Enter your email" \n        required \n      />\n      <button type="submit" disabled={loading}>\n        {loading ? "Verifying security..." : "Create Account"}\n      </button>\n    </form>\n  );\n}`,
                            reactSubTab === "hook" ? "React Hook" : "React Component Usage"
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
                        {reactSubTab === "hook" ? (
                          reactHookCode
                        ) : (
`import React, { useState } from "react";
import { useCleanTraffic } from "../hooks/useCleanTraffic";

export function SignupForm() {
  const { visitor, loading } = useCleanTraffic();
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Screen bots or fraudulent traffic before submitting
    if (visitor && !visitor.isHuman) {
      setErrorMsg("Automated or fraudulent traffic detected.");
      return;
    }

    setErrorMsg("");
    console.log("Submitting account for human visitor:", visitor?.visitorId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded">
          {errorMsg}
        </div>
      )}
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Enter your email" 
        required 
      />
      <button type="submit" disabled={loading}>
        {loading ? "Verifying security..." : "Create Account"}
      </button>
    </form>
  );
}`
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      React Drop-in Setup:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                      <li>Save the hook code into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">src/hooks/useCleanTraffic.ts</code>.</li>
                      <li>Call <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">const &#123; visitor, loading &#125; = useCleanTraffic()</code> in your login, signup, or checkout view.</li>
                      <li>Check <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">visitor?.isHuman</code> before triggering state changes or backend calls.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 12. VUE.JS COMPOSABLE DETAIL PAGE */}
              {selectedIntegration === "vue" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <VueLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Vue.js &amp; Nuxt Integration</h2>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Composition API
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Vue 3 &amp; Nuxt 3
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Identify visitors on your Vue.js website using a Vue 3 composable with reactive refs and Nuxt SSR safeguards.
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderInterstitialControlBanner("Vue.js")}

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setVueSubTab("composable")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        vueSubTab === "composable"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Composable (composables/useCleanTraffic.ts)
                    </button>
                    <button
                      onClick={() => setVueSubTab("usage")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        vueSubTab === "usage"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Component Usage (&lt;script setup&gt;)
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#41B883]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {vueSubTab === "composable" ? "composables/useCleanTraffic.ts" : "components/SignupForm.vue"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            vueSubTab === "composable"
                              ? vueComposableCode
                              : `<script setup>\nimport { ref } from 'vue';\nimport { useCleanTraffic } from '@/composables/useCleanTraffic';\n\nconst { visitor, loading } = useCleanTraffic();\nconst email = ref('');\nconst errorMsg = ref('');\n\nfunction onSubmit() {\n  if (visitor.value && !visitor.value.isHuman) {\n    errorMsg.value = 'Automated or fraudulent traffic detected.';\n    return;\n  }\n  errorMsg.value = '';\n  console.log('Verified human visitor:', visitor.value?.visitorId);\n}\n</script>\n\n<template>\n  <form @submit.prevent="onSubmit" class="space-y-4">\n    <div v-if="errorMsg" class="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded">\n      {{ errorMsg }}\n    </div>\n    <input v-model="email" type="email" placeholder="Enter your email" required />\n    <button :disabled="loading">\n      {{ loading ? 'Verifying security...' : 'Submit' }}\n    </button>\n  </form>\n</template>`,
                            vueSubTab === "composable" ? "Vue Composable" : "Vue Component"
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
                        {vueSubTab === "composable" ? (
                          vueComposableCode
                        ) : (
`<script setup>
import { ref } from 'vue';
import { useCleanTraffic } from '@/composables/useCleanTraffic';

const { visitor, loading } = useCleanTraffic();
const email = ref('');
const errorMsg = ref('');

function onSubmit() {
  if (visitor.value && !visitor.value.isHuman) {
    errorMsg.value = 'Automated or fraudulent traffic detected.';
    return;
  }
  errorMsg.value = '';
  console.log('Verified human visitor:', visitor.value?.visitorId);
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="space-y-4">
    <div v-if="errorMsg" class="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded">
      {{ errorMsg }}
    </div>
    <input v-model="email" type="email" placeholder="Enter your email" required />
    <button :disabled="loading">
      {{ loading ? 'Verifying security...' : 'Submit' }}
    </button>
  </form>
</template>`
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Vue Setup:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                      <li>Save into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">composables/useCleanTraffic.ts</code>. In Nuxt 3, auto-import detects it automatically.</li>
                      <li>In your component, call <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">const &#123; visitor, loading &#125; = useCleanTraffic()</code>.</li>
                      <li>Safely bind <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">visitor.value?.isHuman</code> in template or script setup.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 13. ANGULAR SERVICE DETAIL PAGE */}
              {selectedIntegration === "angular" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <AngularLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Angular Integration</h2>
                          <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px] font-bold">
                            Injectable Service
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Angular 15-18
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Identify visitors on your Angular website using an injectable TypeScript service with Angular Universal SSR guards.
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderInterstitialControlBanner("Angular")}

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setAngularSubTab("service")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        angularSubTab === "service"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Service (cleantraffic.service.ts)
                    </button>
                    <button
                      onClick={() => setAngularSubTab("usage")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        angularSubTab === "usage"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Component Usage (app.component.ts)
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#DD0031]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {angularSubTab === "service" ? "src/app/services/cleantraffic.service.ts" : "src/app/app.component.ts"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            angularSubTab === "service"
                              ? angularServiceCode
                              : `import { Component, OnInit } from '@angular/core';\nimport { CleanTrafficService, CleanTrafficVisitor } from './services/cleantraffic.service';\n\n@Component({\n  selector: 'app-root',\n  template: \`\n    <div *ngIf="visitor">\n      <p>Visitor ID: {{ visitor.visitorId }}</p>\n      <p>Is Human: {{ visitor.isHuman }}</p>\n    </div>\n  \`\n})\nexport class AppComponent implements OnInit {\n  visitor: CleanTrafficVisitor | null = null;\n\n  constructor(private ctc: CleanTrafficService) {}\n\n  async ngOnInit() {\n    this.visitor = await this.ctc.getVisitor();\n  }\n}`,
                            angularSubTab === "service" ? "Angular Service" : "Angular Component"
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
                        {angularSubTab === "service" ? (
                          angularServiceCode
                        ) : (
`import { Component, OnInit } from '@angular/core';
import { CleanTrafficService, CleanTrafficVisitor } from './services/cleantraffic.service';

@Component({
  selector: 'app-root',
  template: \`
    <div *ngIf="visitor">
      <p>Visitor ID: {{ visitor.visitorId }}</p>
      <p>Is Human: {{ visitor.isHuman }}</p>
    </div>
  \`
})
export class AppComponent implements OnInit {
  visitor: CleanTrafficVisitor | null = null;

  constructor(private ctc: CleanTrafficService) {}

  async ngOnInit() {
    this.visitor = await this.ctc.getVisitor();
  }
}`
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Angular Setup:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                      <li>Save into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">src/app/services/cleantraffic.service.ts</code>.</li>
                      <li>Inject <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">CleanTrafficService</code> in your component constructors.</li>
                      <li>Call <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">await this.ctc.getVisitor()</code> on initialization.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 14. PREACT HOOK DETAIL PAGE */}
              {selectedIntegration === "preact" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <PreactLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Preact Integration</h2>
                          <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-bold">
                            Preact Hook
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Lightweight 3KB
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Identify visitors on your Preact website using an ultra-lightweight hook compatible with Preact and Deno Fresh.
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderInterstitialControlBanner("Preact")}

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setPreactSubTab("hook")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        preactSubTab === "hook"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Hook (hooks/useCleanTraffic.js)
                    </button>
                    <button
                      onClick={() => setPreactSubTab("usage")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        preactSubTab === "usage"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Component Usage
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#673AB8]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {preactSubTab === "hook" ? "src/hooks/useCleanTraffic.js" : "src/components/App.jsx"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            preactSubTab === "hook"
                              ? preactHookCode
                              : `import { useCleanTraffic } from "./hooks/useCleanTraffic";\n\nexport function App() {\n  const { visitor, loading } = useCleanTraffic();\n  return (\n    <div>\n      {loading ? "Checking..." : visitor?.isHuman ? "Human Verified" : "Bot Blocked"}\n    </div>\n  );\n}`,
                            preactSubTab === "hook" ? "Preact Hook" : "Preact Component"
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
                        {preactSubTab === "hook" ? (
                          preactHookCode
                        ) : (
`import { useCleanTraffic } from "./hooks/useCleanTraffic";

export function App() {
  const { visitor, loading } = useCleanTraffic();

  return (
    <div>
      {loading ? (
        <span>Checking security...</span>
      ) : (
        <span>Status: {visitor?.isHuman ? "Human Verified" : "Bot Traffic"}</span>
      )}
    </div>
  );
}`
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Preact Setup:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                      <li>Save the hook into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">src/hooks/useCleanTraffic.js</code>.</li>
                      <li>Call <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">useCleanTraffic()</code> in your main component.</li>
                      <li>Access the reactive visitor verdict with 0KB overhead.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 15. SVELTE COMPONENT & STORE DETAIL PAGE */}
              {selectedIntegration === "svelte" && (
                <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                        <SvelteLogo className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#0F172A]">Svelte &amp; SvelteKit Integration</h2>
                          <Badge className="bg-orange-50 text-orange-800 border-orange-200 text-[10px] font-bold">
                            Svelte Component
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Svelte 4 &amp; 5
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                          Identify visitors on your Svelte website using a dedicated component with reactive Svelte stores.
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderInterstitialControlBanner("Svelte")}

                  {/* Subtabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setSvelteSubTab("component")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        svelteSubTab === "component"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Component (CleanTraffic.svelte)
                    </button>
                    <button
                      onClick={() => setSvelteSubTab("usage")}
                      className={`text-xs font-bold pb-1.5 transition-colors relative ${
                        svelteSubTab === "usage"
                          ? "text-[#0A5C48] border-b-2 border-[#0A5C48]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Page Usage (+page.svelte)
                    </button>
                  </div>

                  {/* Code Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#FF3E00]" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {svelteSubTab === "component" ? "src/lib/CleanTraffic.svelte" : "src/routes/+page.svelte"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCurrentCode(
                            svelteSubTab === "component"
                              ? svelteComponentCode
                              : `<script>\n  import CleanTraffic, { visitor, isReady } from '$lib/CleanTraffic.svelte';\n</script>\n\n<CleanTraffic />\n\n{#if $isReady}\n  <p>Visitor ID: {$visitor?.visitorId}</p>\n  <p>Is Human: {$visitor?.isHuman}</p>\n{/if}`,
                            svelteSubTab === "component" ? "Svelte Component" : "Svelte Page Usage"
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
                        {svelteSubTab === "component" ? (
                          svelteComponentCode
                        ) : (
`<script>
  import CleanTraffic, { visitor, isReady } from '$lib/CleanTraffic.svelte';
</script>

<!-- CleanTraffic Visitor Agent -->
<CleanTraffic />

{#if $isReady}
  <div>
    <p>Visitor ID: {$visitor?.visitorId}</p>
    <p>Is Human: {$visitor?.isHuman ? 'Yes' : 'No'}</p>
  </div>
{:else}
  <p>Initializing security check...</p>
{/if}`
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Svelte Setup:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[#64748B]">
                      <li>Save the component into <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">src/lib/CleanTraffic.svelte</code>.</li>
                      <li>Import and mount <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">&lt;CleanTraffic /&gt;</code> in your root layout or target page.</li>
                      <li>Subscribe reactively to <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">$visitor</code> and <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">$isReady</code>.</li>
                    </ol>
                  </div>
                </div>
              )}
                </>
              )}
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
                targetStack={selectedIntegration || "javascript"}
                rulesets={parsedRulesets}
                serverBotUrl={userSettings?.botUrl}
                onNavigateToLiveFeed={handleNavigateToLiveFeed}
                onNavigateToRules={handleNavigateToRules}
                onSelectStack={(stack) => setSelectedIntegration(stack as IntegrationStack)}
              />
            </div>
          ) : (
            <>
              {/* Filter Pills (Fingerprint Style) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All Stacks" },
                { id: "frameworks", label: "Web Frameworks & SDKs" },
                { id: "builders", label: "Site Builders (No-Code)" },
                { id: "server", label: "Server & Edge" },
                { id: "cms", label: "CMS & Platforms" },
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
                    if (item.id === "react") setReactSubTab("hook");
                    if (item.id === "nextjs") setNextSubTab("script");
                    if (item.id === "vue") setVueSubTab("composable");
                    if (item.id === "angular") setAngularSubTab("service");
                    if (item.id === "preact") setPreactSubTab("hook");
                    if (item.id === "svelte") setSvelteSubTab("component");
                    if (item.id === "javascript") setJsSubTab("tag");
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

      {/* Universal Interstitial Theme Picker Dialog (Available for All Integrations) */}
      <Dialog open={isThemePickerOpen} onOpenChange={setIsThemePickerOpen}>
        <DialogContent className="max-w-4xl bg-white border border-[#E5EAE7] p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[#E5EAE7]">
            <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#0A5C48]" />
              <span>Choose &amp; Customize Interstitial Loading Style</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B] mt-0.5">
              Customize the verification loading splash across all integrations (React, Next.js, Cloudflare, Shopify, PHP, JavaScript, WordPress, Webflow, Wix, Vue).
            </DialogDescription>
          </DialogHeader>

          {renderThemeCustomizerContent()}
        </DialogContent>
      </Dialog>

      {/* Theme Live Preview Modal (Accessible across all integrations) */}
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
