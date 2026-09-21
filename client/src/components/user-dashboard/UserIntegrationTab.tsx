import { useState, useEffect } from "react";
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
  FileCheck
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

export type IntegrationStack = "php" | "cloudflare" | "shopify" | "wordpress" | "nodejs";

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

  // Active stack selector
  const [selectedStack, setSelectedStack] = useState<IntegrationStack>("php");
  const [nodeSubTab, setNodeSubTab] = useState<"nextjs" | "express">("nextjs");

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Themes state (for PHP Interstitial & Universal Loading)
  const [enableLoading, setEnableLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
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

  // 1. Generate dynamic PHP code with active theme and custom copy
  const phpIntegrationCode = generatePhpIntegrationScript({
    apiKeyValue,
    effectiveEndpoint,
    theme: activeTheme,
    heading: customHeading,
    subnote: customSubnote,
    enableLoading,
  });

  // 2. Generate Cloudflare Edge Worker script
  const cloudflareWorkerCode = generateCloudflareWorkerScript({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
    heading: customHeading,
    subnote: customSubnote,
  });

  // 3. Generate JavaScript Snippet (Shopify / Wix / Webflow)
  const jsSnippet = generateJsSnippet({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
    themeId: selectedThemeId,
    heading: customHeading,
    subnote: customSubnote,
  });

  // 4. Generate WordPress Plugin PHP
  const wordPressPluginCode = generateWordPressPluginPhp({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
    heading: customHeading,
    subnote: customSubnote,
  });

  // 5. Generate Next.js & Express Middleware
  const nextJsMiddlewareCode = generateNextJsMiddleware({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
  });

  const nodeExpressMiddlewareCode = generateNodeExpressMiddleware({
    apiKeyValue,
    effectiveEndpoint,
    enableLoading,
  });

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

  // Copy code helper for the active stack
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
        `CleanTraffic - Drop-in Verification Interstitial & Security Package\n\n` +
        `DEPLOYMENT INSTRUCTIONS:\n` +
        `1. Upload index.php to your web server or campaign root (e.g., public_html/promo/index.php).\n` +
        `2. Active Loading Screen Theme: ${activeTheme.name} (${activeTheme.id})\n` +
        `3. Heading Text: "${customHeading}"\n` +
        `4. Ensure PHP 7.4+ with standard cURL extension is enabled.\n` +
        `5. Visitors see the clean verification splash (<15ms) while classification executes in the background.\n` +
        `6. All paid ad click tokens (fbclid, fbclickid, gclid, ttclid, msclkid, twclid, wbraid, gbraid) are automatically captured and forwarded.\n` +
        `7. Testing: Visit https://yourdomain.com/index.php?fbclid=test1234 or ?gclid=test1234\n`
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
        description: `Your customized PHP package with "${activeTheme.name}" has been downloaded.`,
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
        `=== CleanTraffic Security Shield ===\n` +
        `Contributors: CleanTraffic\n` +
        `Tags: security, bot protection, cloaking, ad attribution, firewall\n` +
        `Requires at least: 5.0\n` +
        `Tested up to: 6.5\n` +
        `Stable tag: 2.1.0\n` +
        `License: GPLv2 or later\n\n` +
        `== Description ==\n` +
        `Real-time bot protection, ad attribution, and cloaking shield for WordPress & WooCommerce.\n\n` +
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

  // Categories list for theme filtering
  const categories = ["All", "Light", "Minimal", "Corporate", "Security", "Dark"];
  const filteredThemes = selectedCategory === "All"
    ? themes
    : themes.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Documentation Quick Access Banner */}
      <div className="bg-gradient-to-r from-[#0A3E33] to-[#06241D] rounded-xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-[#145343]">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Complete Multi-Stack Integration & Installation Guides
              </h3>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                5 Platforms
              </span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
              Step-by-step setup guides for cPanel, Cloudflare Edge Workers, Shopify, Wix, WordPress, Vercel, Railway, and custom VPS deployments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          <Button
            onClick={() => navigate("/docs#installation")}
            className="w-full md:w-auto bg-white hover:bg-emerald-50 text-[#06241D] font-bold text-xs h-9 px-4 rounded-lg gap-2 shadow-xs transition-all"
          >
            <span>View All Docs</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#0A5C48]" />
          </Button>
        </div>
      </div>

      {/* Top Banner & API Key */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2.5 tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-[#E6F2ED] border border-[#CCE5DB] flex items-center justify-center text-[#0A5C48]">
                <Code className="h-4 w-4" />
              </div>
              Universal Integration Center
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Choose your platform below to generate pre-authenticated, ready-to-deploy protection code for your website or campaign.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedStack === "php" && (
              <Button
                onClick={handleDownloadPhpZip}
                disabled={!apiKeyValue}
                className="bg-[#0A5C48] hover:bg-[#07382D] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shadow-xs transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Download PHP ZIP
              </Button>
            )}
            {selectedStack === "cloudflare" && (
              <Button
                onClick={handleDownloadCloudflareWorker}
                className="bg-[#F6821F] hover:bg-[#E06D0C] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shadow-xs transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Download worker.js
              </Button>
            )}
            {selectedStack === "wordpress" && (
              <Button
                onClick={handleDownloadWordPressZip}
                disabled={!apiKeyValue}
                className="bg-[#0073AA] hover:bg-[#005A87] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shadow-xs transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Download Plugin ZIP
              </Button>
            )}
          </div>
        </div>

        {/* API Key & Endpoint Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-[#F7FAF8] border border-[#E0E9E4] p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Your Assigned API Key</Label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-[#0A5C48] hover:text-[#06241D] font-semibold flex items-center gap-1 focus:outline-none"
              >
                {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showKey ? "Hide key" : "Reveal key"}</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-[#0A5C48] truncate tracking-wide">
                {apiKeyValue ? (showKey ? apiKeyValue : maskKey(apiKeyValue)) : "Loading key..."}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                  disabled={!apiKeyValue}
                  className="h-7 px-2 text-[#64748B] hover:text-[#0F172A]"
                  title={showKey ? "Hide API key" : "Reveal API key"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
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
          </div>

          <div className="bg-[#F7FAF8] border border-[#E0E9E4] p-3.5 rounded-xl space-y-1">
            <Label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">API Endpoint Host</Label>
            <Input
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="https://your-domain.com"
              className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs font-mono h-8 focus:border-[#0A5C48] focus:ring-1 focus:ring-[#0A5C48]"
            />
          </div>
        </div>

        {/* ── VERIFICATION & LOADING MODE SELECTOR ── */}
        <div className="pt-2 border-t border-[#E5EAE7]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <Label className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5 uppercase tracking-wider">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0A5C48]" />
                Verification & Loading Experience
              </Label>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Choose whether your visitors see an instant security verification screen or experience zero-delay inline inspection.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedThemeChanges && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium animate-pulse">
                  Unsaved mode
                </span>
              )}
              <Button
                onClick={() => saveThemeMutation.mutate()}
                disabled={saveThemeMutation.isPending || !hasUnsavedThemeChanges}
                className={`h-7 px-3 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
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
            {/* Mode A: Loading Screen Interstitial */}
            <div
              onClick={() => handleToggleLoading(true)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                enableLoading
                  ? "bg-emerald-50/70 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/20"
                  : "bg-white border-[#E0E9E4] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    enableLoading ? "bg-[#0A5C48] text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#0F172A]">Interstitial Loading Screen</span>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 ${
                  enableLoading ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {enableLoading ? "Active Mode" : "Optional"}
                </Badge>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                Displays a high-converting security verification animation (&lt;15ms) while evaluating visitor signals and ad click tokens in the background.
              </p>
              <div className="mt-2 text-[10px] text-emerald-800 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Customizable themes, retry button &amp; countdown</span>
              </div>
            </div>

            {/* Mode B: Transparent Inline Protection */}
            <div
              onClick={() => handleToggleLoading(false)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                !enableLoading
                  ? "bg-emerald-50/70 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/20"
                  : "bg-white border-[#E0E9E4] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    !enableLoading ? "bg-[#0A5C48] text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#0F172A]">Transparent Inline Guard</span>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 ${
                  !enableLoading ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {!enableLoading ? "Active Mode" : "Optional"}
                </Badge>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                Zero visual loading screen. Seamlessly inspects traffic inline before rendering page output. Legitimate human visitors experience zero delay.
              </p>
              <div className="mt-2 text-[10px] text-emerald-800 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Strict 404/403 HTTP enforcement for bots</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PLATFORM & STACK SELECTOR TABS ── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedStack("php")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedStack === "php"
                ? "bg-[#0A5C48] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Server className="h-4 w-4" />
            <span>cPanel / PHP (index.php)</span>
            <Badge className={`text-[10px] px-1.5 py-0 rounded ${
              selectedStack === "php" ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              Most Popular
            </Badge>
          </button>

          <button
            onClick={() => setSelectedStack("cloudflare")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedStack === "cloudflare"
                ? "bg-[#F6821F] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Cloudflare Edge Worker</span>
            <Badge className={`text-[10px] px-1.5 py-0 rounded ${
              selectedStack === "cloudflare" ? "bg-[#D96B0F] text-white" : "bg-orange-100 text-orange-800"
            }`}>
              Any Host
            </Badge>
          </button>

          <button
            onClick={() => setSelectedStack("shopify")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedStack === "shopify"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Shopify, Wix & Webflow</span>
            <Badge className={`text-[10px] px-1.5 py-0 rounded ${
              selectedStack === "shopify" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              1-Line JS
            </Badge>
          </button>

          <button
            onClick={() => setSelectedStack("wordpress")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedStack === "wordpress"
                ? "bg-[#0073AA] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>WordPress Plugin</span>
            <Badge className={`text-[10px] px-1.5 py-0 rounded ${
              selectedStack === "wordpress" ? "bg-[#005A87] text-white" : "bg-blue-100 text-blue-800"
            }`}>
              .zip Download
            </Badge>
          </button>

          <button
            onClick={() => setSelectedStack("nodejs")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedStack === "nodejs"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>Node.js / Next.js</span>
            <Badge className={`text-[10px] px-1.5 py-0 rounded ${
              selectedStack === "nodejs" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              Vercel / Railway
            </Badge>
          </button>
        </div>
      </div>

      {/* ── STACK 1: CPANEL / PHP INTERSTITIAL ── */}
      {selectedStack === "php" && (
        <div className="space-y-6">
          {/* Theme customizer */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5EAE7] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <Palette className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
                    Visitor Verification Loading Screen UI
                  </h3>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px] uppercase font-bold">
                    Tenant Isolated
                  </Badge>
                </div>
                <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
                  Choose the instant splash screen shown to visitors on your PHP link while bot classification runs. Each user can pick a distinct theme, preview it in real-time, and save it directly into their generated script.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {hasUnsavedThemeChanges && (
                  <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1 animate-pulse">
                    <Info className="h-3 w-3" /> Unsaved changes
                  </span>
                )}
                <Button
                  onClick={() => saveThemeMutation.mutate()}
                  disabled={saveThemeMutation.isPending || !hasUnsavedThemeChanges}
                  className={`h-9 px-4 text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 ${
                    hasUnsavedThemeChanges
                      ? "bg-[#0A5C48] hover:bg-[#07382D] text-white"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {saveThemeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Save Loading Theme</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

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

            {/* Category filter & Theme Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Available Themes ({filteredThemes.length})
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                        selectedCategory === cat
                          ? "bg-[#0A5C48] text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
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
                          <span>Live Preview</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Architecture Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0A5C48] font-bold text-xs">
                <Zap className="h-4 w-4" />
                1. Zero Blank Screens
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Renders a client loading interstitial in under 15ms while asynchronous classification executes.
              </p>
            </div>

            <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0A5C48] font-bold text-xs">
                <FileCode className="h-4 w-4" />
                2. Self-Contained
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Requires only PHP 7.4+ and cURL. No Composer, external drivers, or database setup needed.
              </p>
            </div>

            <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0A5C48] font-bold text-xs">
                <ShieldCheck className="h-4 w-4" />
                3. Fail-Closed Safety
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                If network timeouts occur, gracefully presents a retry UI rather than exposing your destination.
              </p>
            </div>

            <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0A5C48] font-bold text-xs">
                <Shield className="h-4 w-4" />
                4. Anti-Bypass
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Destination URLs stay completely hidden on the server until classification passes.
              </p>
            </div>

            <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0A5C48] font-bold text-xs">
                <Target className="h-4 w-4" />
                5. Ad Token Preserved
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Preserves gclid, fbclid, ttclid, msclkid, twclid, wbraid, gbraid, and UTMs to your target offer.
              </p>
            </div>
          </div>

          {/* Ad Attribution & Testing Verification Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">How to Test Paid Ad Attribution vs Organic Traffic</h4>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                Live Parameter Engine
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              CleanTraffic isolates paid campaign traffic with click tokens from natural organic visitors. When testing your deployed <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">index.php</code> script, use these campaign query parameters:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs font-mono">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 space-y-1">
                <span className="text-[10px] text-blue-400 font-sans font-bold uppercase tracking-wider block">Meta (Facebook & IG)</span>
                <div className="text-slate-200 select-all break-all text-[11px]">
                  ?fbclid=test_token_123<br/>
                  <span className="text-slate-400 text-[10px] font-sans">Alias: ?fbclickid=test_123</span>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 space-y-1">
                <span className="text-[10px] text-emerald-400 font-sans font-bold uppercase tracking-wider block">Google Ads</span>
                <div className="text-slate-200 select-all break-all text-[11px]">
                  ?gclid=test_gclid_123<br/>
                  <span className="text-slate-400 text-[10px] font-sans">iOS: ?gbraid=... | ?wbraid=...</span>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 space-y-1">
                <span className="text-[10px] text-purple-400 font-sans font-bold uppercase tracking-wider block">TikTok & Microsoft</span>
                <div className="text-slate-200 select-all break-all text-[11px]">
                  ?ttclid=test_ttclid_123<br/>
                  <span className="text-slate-400 text-[10px] font-sans">Bing: ?msclkid=test_msclk_123</span>
                </div>
              </div>
            </div>
          </div>

          {/* PHP Code Preview Box */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#0A5C48]" />
                <span className="text-sm font-bold text-[#0F172A]">index.php Source Code</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                  Theme: {activeTheme.name}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  showKey ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  {showKey ? "Live Key Visible" : "Key Masked in Preview"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg font-semibold"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showKey ? "Mask in Preview" : "Reveal in Preview"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(phpIntegrationCode, "PHP Code")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] hover:text-[#0F172A] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-[#0A5C48]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copied" : "Copy Code"}
                </Button>
              </div>
            </div>

            <div className="bg-[#051C15] border border-[#0F382B] rounded-xl p-4 overflow-x-auto shadow-inner">
              <pre className="font-mono text-xs text-[#C8E0D7] leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                {showKey 
                  ? phpIntegrationCode 
                  : phpIntegrationCode.replace(
                      `$apiKey = '${apiKeyValue || 'ctc_your_api_key_here'}';`,
                      `$apiKey = '${maskKey(apiKeyValue)}'; // Masked in preview. "Copy Code" & ZIP export active key.`
                    )}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── STACK 2: CLOUDFLARE WORKER ── */}
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
                  Runs at Cloudflare's 300+ global edge locations. Intercepts bots, scrapers, and datacenter traffic before requests reach your web host. Compatible with <strong>Shopify, Wix, Vercel, WordPress, Railway, and private VPS</strong>.
                </p>
              </div>

              <Button
                onClick={handleDownloadCloudflareWorker}
                className="bg-[#F6821F] hover:bg-[#E06D0C] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download worker.js
              </Button>
            </div>

            {/* Step-by-Step Guide */}
            <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                2-Minute Cloudflare Deployment Steps:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                  <div className="font-bold text-slate-900">Create Worker</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Log in to Cloudflare &rarr; <strong>Workers & Pages</strong> &rarr; Click <strong>Create Worker</strong>.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                  <div className="font-bold text-slate-900">Paste Script</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Click <strong>Quick Edit</strong>, paste the script below (with your active API key), and click <strong>Save and Deploy</strong>.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                  <div className="font-bold text-slate-900">Add Route</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Go to <strong>Settings &rarr; Domains & Routes &rarr; Add Route</strong>. Set Route to <code className="bg-slate-100 px-1 rounded">*yourdomain.com/*</code>.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">4</span>
                  <div className="font-bold text-slate-900">Live Protection</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Traffic is now filtered at Cloudflare's nearest edge server in &lt;15ms globally.
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
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg font-semibold"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showKey ? "Mask in Preview" : "Reveal in Preview"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(cloudflareWorkerCode, "Cloudflare Worker")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copied" : "Copy Worker Code"}
                </Button>
              </div>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
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

      {/* ── STACK 3: SHOPIFY, WIX & WEBFLOW ── */}
      {selectedStack === "shopify" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">Shopify, Wix, Webflow & Squarespace</h3>
                <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                  Zero Server Access Needed
                </Badge>
              </div>
              <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                For closed SaaS platforms where uploading PHP files is prohibited. Paste this lightweight script tag into your theme header to inspect visitor tokens, detect bot signatures, and enforce real-time routing.
              </p>
            </div>

            {/* Platform Guides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <ShoppingBag className="h-4 w-4 text-emerald-700" />
                  Shopify Installation
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Go to <strong>Online Store &rarr; Themes</strong> in your Shopify Admin.</li>
                  <li>Click the <strong>...</strong> icon and select <strong>Edit Code</strong>.</li>
                  <li>Open <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">layout/theme.liquid</code>.</li>
                  <li>Paste the script tag directly above the closing <code className="bg-white px-1 rounded font-mono text-[11px]">&lt;/head&gt;</code> tag and click Save.</li>
                </ol>
              </div>

              <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <Globe className="h-4 w-4 text-blue-700" />
                  Wix Installation
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Open your Wix Dashboard &rarr; <strong>Settings &rarr; Custom Code</strong>.</li>
                  <li>Click <strong>+ Add Custom Code</strong> in the <strong>Head</strong> section.</li>
                  <li>Paste the script tag, choose <strong>All Pages &rarr; Load once</strong>, and click Apply.</li>
                </ol>
              </div>

              <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <Boxes className="h-4 w-4 text-purple-700" />
                  Webflow & Squarespace
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>In Webflow: <strong>Project Settings &rarr; Custom Code &rarr; Head Code</strong>.</li>
                  <li>In Squarespace: <strong>Settings &rarr; Advanced &rarr; Code Injection</strong>.</li>
                  <li>Paste the script tag into the Header box and save changes.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* 1-Line Script Tag Card */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#0A5C48]" />
                <span className="text-sm font-bold text-[#0F172A]">Option A: 1-Line Script Tag (Recommended)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                  CDN Hosted
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyCurrentCode(jsSnippet.embedTag, "Embed Tag")}
                className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg shadow-xs font-semibold"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? "Copied" : "Copy Script Tag"}
              </Button>
            </div>

            <div className="bg-[#051C15] border border-[#0F382B] rounded-xl p-4 overflow-x-auto shadow-inner">
              <pre className="font-mono text-xs text-[#C8E0D7] leading-relaxed whitespace-pre">
                {jsSnippet.embedTag}
              </pre>
            </div>
          </div>

          {/* Inline Script Card */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-slate-700" />
                <span className="text-sm font-bold text-[#0F172A]">Option B: Inline Autonomous Script</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                  Zero External CDN Dependency
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyCurrentCode(jsSnippet.inlineScript, "Inline Script")}
                className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg shadow-xs font-semibold"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? "Copied" : "Copy Inline Code"}
              </Button>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-64 overflow-y-auto">
                {jsSnippet.inlineScript}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── STACK 4: WORDPRESS PLUGIN ── */}
      {selectedStack === "wordpress" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0073AA]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A]">WordPress & WooCommerce Dedicated Plugin</h3>
                  <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] font-bold">
                    1-Click ZIP Package
                  </Badge>
                </div>
                <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                  Hooks into WordPress's native request lifecycle before themes and heavy page builders load. Protects all blog posts, landing pages, WooCommerce checkout flows, and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">/wp-login.php</code>.
                </p>
              </div>

              <Button
                onClick={handleDownloadWordPressZip}
                disabled={!apiKeyValue}
                className="bg-[#0073AA] hover:bg-[#005A87] text-white text-xs font-bold px-4 h-9 rounded-lg gap-1.5 shrink-0 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download Plugin ZIP
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
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Click the <strong>Download Plugin ZIP</strong> button above to download your pre-configured package.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                  <div className="font-bold text-slate-900">Upload to WP</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Log in to WordPress Admin &rarr; <strong>Plugins &rarr; Add New Plugin &rarr; Upload Plugin</strong>.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                  <div className="font-bold text-slate-900">Activate & Protect</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
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
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg font-semibold"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showKey ? "Mask in Preview" : "Reveal in Preview"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(wordPressPluginCode, "WordPress Plugin")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copied" : "Copy Plugin Code"}
                </Button>
              </div>
            </div>

            <div className="bg-[#051C15] border border-[#0F382B] rounded-xl p-4 overflow-x-auto shadow-inner">
              <pre className="font-mono text-xs text-[#C8E0D7] leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
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

      {/* ── STACK 5: NODE.JS & NEXT.JS ── */}
      {selectedStack === "nodejs" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                  <Cpu className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">Modern Jamstack & Container Runtimes</h3>
                <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                  Vercel / Railway / Render / Fly.io
                </Badge>
              </div>
              <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                Plug CleanTraffic directly into your Next.js Edge Middleware or Express server to protect APIs, SSR applications, and Jamstack frontends before routes execute.
              </p>
            </div>

            {/* Sub-Tabs: Next.js vs Express */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setNodeSubTab("nextjs")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  nodeSubTab === "nextjs"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900 bg-slate-100"
                }`}
              >
                Next.js Middleware (middleware.ts)
              </button>
              <button
                onClick={() => setNodeSubTab("express")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  nodeSubTab === "express"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900 bg-slate-100"
                }`}
              >
                Node.js / Express (middleware.js)
              </button>
            </div>
          </div>

          {/* Next.js View */}
          {nodeSubTab === "nextjs" && (
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-slate-800" />
                  <span className="text-sm font-bold text-[#0F172A]">middleware.ts (Root of Next.js Project)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-800 border-slate-200">
                    Next.js 13 / 14 / 15
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(nextJsMiddlewareCode, "Next.js Middleware")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copied" : "Copy middleware.ts"}
                </Button>
              </div>

              <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                  {nextJsMiddlewareCode}
                </pre>
              </div>
            </div>
          )}

          {/* Express View */}
          {nodeSubTab === "express" && (
            <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-slate-800" />
                  <span className="text-sm font-bold text-[#0F172A]">cleantrafficMiddleware.js (Express Middleware)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-800 border-slate-200">
                    Node.js 18+ / Express
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCurrentCode(nodeExpressMiddlewareCode, "Express Middleware")}
                  className="h-8 text-xs border-[#D5DFD9] bg-white hover:bg-[#F2F6F4] text-[#2D3B35] gap-1.5 rounded-lg shadow-xs font-semibold"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copied" : "Copy Middleware"}
                </Button>
              </div>

              <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre max-h-96 overflow-y-auto">
                  {nodeExpressMiddlewareCode}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LIVE INTERACTIVE PREVIEW MODAL ── */}
      {previewTheme && (
        <Dialog open={!!previewTheme} onOpenChange={(open) => !open && setPreviewTheme(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-900 text-white border-slate-700">
            <DialogHeader className="p-4 bg-slate-800/90 border-b border-slate-700 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full border border-white/40"
                  style={{ backgroundColor: previewTheme.previewAccent }}
                />
                <div>
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    {previewTheme.name}
                    <Badge variant="outline" className="text-slate-300 border-slate-600 text-[10px]">
                      {previewTheme.category}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Live interactive preview of visitor splash screen
                  </DialogDescription>
                </div>
              </div>

              {/* Viewport switch & actions */}
              <div className="flex items-center gap-2 mr-6">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-0.5 flex items-center">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                      previewDevice === "desktop"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                      previewDevice === "mobile"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Mobile
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    handleSelectTheme(previewTheme.id);
                    setPreviewTheme(null);
                    toast({
                      title: "Theme Selected",
                      description: `"${previewTheme.name}" selected. Click "Save Loading Theme" to apply.`,
                    });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 rounded-lg"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Select this Theme
                </Button>
              </div>
            </DialogHeader>

            {/* Preview Frame Container */}
            <div className="bg-slate-950 p-6 flex items-center justify-center min-h-[480px]">
              <div 
                className={`transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-white ${
                  previewDevice === "mobile"
                    ? "w-[360px] h-[640px]"
                    : "w-full h-[520px]"
                }`}
              >
                <iframe
                  title="Theme Preview"
                  src={`/api/user/themes/${previewTheme.id}/preview-html?heading=${encodeURIComponent(customHeading)}&subnote=${encodeURIComponent(customSubnote)}`}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400">
              This screen displays for ~15ms - 1.5s while IP intelligence and anti-bot verification run asynchronously in the background.
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
