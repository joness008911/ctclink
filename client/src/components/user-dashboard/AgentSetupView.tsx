import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Check,
  Maximize2,
  ChevronDown,
  Sparkles,
  Bot,
  ExternalLink,
  Terminal,
  Code2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  generateNextJsAgentPrompt,
  generateCloudflareAgentPrompt,
  generatePhpAgentPrompt,
  generateWordPressAgentPrompt,
  generateShopifyAgentPrompt,
  generateWebflowAgentPrompt,
  generateWixAgentPrompt,
  generateReactAgentPrompt,
  generateJsAgentPrompt,
  generateVueAgentPrompt,
  generateAngularAgentPrompt,
  generatePreactAgentPrompt,
  generateSvelteAgentPrompt,
} from "@shared/agenticPrompts";
import {
  JavaScriptLogo,
  ReactLogo,
  NextJsLogo,
  VueLogo,
  AngularLogo,
  PreactLogo,
  SvelteLogo,
  WixLogo,
  WebflowLogo,
  CloudflareLogo,
  WordPressLogo,
  ShopifyLogo,
  PhpLogo,
} from "./IntegrationLogos";
import { SyncedPolicyBanner } from "./SyncedPolicyBanner";
import type { Ruleset } from "@shared/rulesEngine";

export type SupportedAgentStack =
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
  | "universal";

export type AgentCategory = "all" | "frameworks" | "builders" | "server" | "cms";

interface ArchitectureItem {
  id: string;
  label: string;
  subtitle: string;
  tag: string;
  category: "frameworks" | "builders" | "server" | "cms";
  Logo: React.ComponentType<{ className?: string }>;
}

interface AgentSetupViewProps {
  apiKeyValue: string;
  effectiveEndpoint: string;
  targetStack?: string;
  rulesets?: Ruleset[];
  serverBotUrl?: string;
  title?: string;
  description?: string;
  onNavigateToLiveFeed?: () => void;
  onNavigateToRules?: () => void;
  onSelectStack?: (stack: string) => void;
  // Kept for backward compatibility
  initialDeflection?: "403" | "404" | "redirect";
  initialBotUrl?: string;
  onDeflectionChange?: (action: "403" | "404" | "redirect", url?: string) => void;
}

const ARCHITECTURE_LIST: ArchitectureItem[] = [
  // 1. Web Frameworks & SDKs
  {
    id: "javascript",
    label: "JavaScript",
    subtitle: "Identify visitors on your website",
    tag: "Universal Web",
    category: "frameworks",
    Logo: JavaScriptLogo,
  },
  {
    id: "react",
    label: "React",
    subtitle: "Identify visitors on your React website",
    tag: "React Hook",
    category: "frameworks",
    Logo: ReactLogo,
  },
  {
    id: "nextjs",
    label: "Next.js",
    subtitle: "Identify visitors on your Next.js website",
    tag: "App & Pages Router",
    category: "frameworks",
    Logo: NextJsLogo,
  },
  {
    id: "vue",
    label: "Vue.js",
    subtitle: "Identify visitors on your Vue.js website",
    tag: "Vue 3 / Nuxt",
    category: "frameworks",
    Logo: VueLogo,
  },
  {
    id: "angular",
    label: "Angular",
    subtitle: "Identify visitors on your Angular website",
    tag: "Injectable Service",
    category: "frameworks",
    Logo: AngularLogo,
  },
  {
    id: "preact",
    label: "Preact",
    subtitle: "Identify visitors on your Preact website",
    tag: "Preact Hook",
    category: "frameworks",
    Logo: PreactLogo,
  },
  {
    id: "svelte",
    label: "Svelte",
    subtitle: "Identify visitors on your Svelte website",
    tag: "SvelteKit Store",
    category: "frameworks",
    Logo: SvelteLogo,
  },

  // 2. Site Builders & No-Code
  {
    id: "wix",
    label: "Wix & Squarespace",
    subtitle: "Identify visitors on your Wix or Squarespace site",
    tag: "Custom Code",
    category: "builders",
    Logo: WixLogo,
  },
  {
    id: "webflow",
    label: "Webflow & Framer",
    subtitle: "Identify visitors on Webflow or Framer landing pages",
    tag: "1-Click Custom Code",
    category: "builders",
    Logo: WebflowLogo,
  },

  // 3. Server & Edge Infrastructure
  {
    id: "cloudflare",
    label: "Cloudflare",
    subtitle: "Universal Edge Worker",
    tag: "Edge Worker",
    category: "server",
    Logo: CloudflareLogo,
  },
  {
    id: "php",
    label: "PHP",
    subtitle: "Raw PHP Shield Header",
    tag: "index.php Shield",
    category: "server",
    Logo: PhpLogo,
  },

  // 4. CMS & Platforms
  {
    id: "wordpress",
    label: "WordPress",
    subtitle: "Native WP Plugin & PHP Shield",
    tag: "Plugin",
    category: "cms",
    Logo: WordPressLogo,
  },
  {
    id: "shopify",
    label: "Shopify",
    subtitle: "Storefront Pixel & ScriptTag",
    tag: "Storefront",
    category: "cms",
    Logo: ShopifyLogo,
  },
];

const CATEGORY_TABS: { id: AgentCategory; label: string }[] = [
  { id: "all", label: "All Stacks" },
  { id: "frameworks", label: "Web Frameworks & SDKs" },
  { id: "builders", label: "Site Builders (No-Code)" },
  { id: "server", label: "Server & Edge" },
  { id: "cms", label: "CMS & Platforms" },
];

export function AgentSetupView({
  apiKeyValue,
  effectiveEndpoint,
  targetStack = "javascript",
  rulesets = [],
  serverBotUrl = "403",
  title,
  description,
  onNavigateToLiveFeed,
  onNavigateToRules,
  onSelectStack,
}: AgentSetupViewProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AgentCategory>("all");

  // Normalize initial stack selection to match supported platforms
  const normalizeStack = (stack?: string): string => {
    if (!stack) return "javascript";
    const s = stack.toLowerCase();
    if (s === "universal" || s === "html") return "javascript";
    if (s === "express" || s === "nodejs" || s === "gtm") return "javascript";
    if (s === "squarespace") return "wix";
    if (s === "framer") return "webflow";
    return s;
  };

  const [selectedSubStack, setSelectedSubStack] = useState<string>(() => normalizeStack(targetStack));

  // Sync state if targetStack changes from parent
  useEffect(() => {
    if (targetStack) {
      setSelectedSubStack(normalizeStack(targetStack));
    }
  }, [targetStack]);

  // Determine active deflection parameters from active ruleset or serverBotUrl
  const activeDeflectionInfo = useMemo(() => {
    const activeRuleset = rulesets.find((r) => r.enabled) || rulesets[0];
    if (activeRuleset) {
      if (activeRuleset.responseMode === "single" && activeRuleset.singleResponse) {
        const single = activeRuleset.singleResponse;
        if (single.action === "redirect" && single.redirectUrl) {
          return { action: "redirect" as const, url: single.redirectUrl.trim() };
        }
        if (single.statusCode === 404) return { action: "404" as const, url: undefined };
        return { action: "403" as const, url: undefined };
      }
      if (activeRuleset.rules?.length > 0) {
        const step = activeRuleset.rules.find((s) => s.enabled);
        if (step?.action === "redirect" && step.redirectUrl) {
          return { action: "redirect" as const, url: step.redirectUrl.trim() };
        }
        if (step?.statusCode === 404) return { action: "404" as const, url: undefined };
      }
    }
    if (serverBotUrl === "404") return { action: "404" as const, url: undefined };
    if (serverBotUrl?.startsWith("http")) return { action: "redirect" as const, url: serverBotUrl.trim() };
    return { action: "403" as const, url: undefined };
  }, [rulesets, serverBotUrl]);

  // Handle stack change & notify parent if callback provided
  const handleStackChange = (newStack: string) => {
    const normalized = normalizeStack(newStack);
    setSelectedSubStack(normalized);
    onSelectStack?.(normalized);
  };

  // Filtered architectures based on active category tab
  const filteredArchitectures = useMemo(() => {
    if (activeCategory === "all") return ARCHITECTURE_LIST;
    return ARCHITECTURE_LIST.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  // Compute active prompt dynamically based on chosen stack & synced ruleset deflection
  const activePrompt = useMemo(() => {
    const isPhpStack = selectedSubStack === "php";
    const opts = {
      apiKeyValue,
      effectiveEndpoint,
      deflectionAction: activeDeflectionInfo.action,
      botFallbackUrl: isPhpStack && activeDeflectionInfo.action === "redirect" ? activeDeflectionInfo.url : undefined,
    };

    if (selectedSubStack === "javascript") return generateJsAgentPrompt(opts);
    if (selectedSubStack === "react") return generateReactAgentPrompt(opts);
    if (selectedSubStack === "nextjs") return generateNextJsAgentPrompt(opts);
    if (selectedSubStack === "vue") return generateVueAgentPrompt(opts);
    if (selectedSubStack === "angular") return generateAngularAgentPrompt(opts);
    if (selectedSubStack === "preact") return generatePreactAgentPrompt(opts);
    if (selectedSubStack === "svelte") return generateSvelteAgentPrompt(opts);
    if (selectedSubStack === "cloudflare") return generateCloudflareAgentPrompt(opts);
    if (selectedSubStack === "php") return generatePhpAgentPrompt(opts);
    if (selectedSubStack === "wordpress") return generateWordPressAgentPrompt(opts);
    if (selectedSubStack === "shopify") return generateShopifyAgentPrompt(opts);
    if (selectedSubStack === "wix" || selectedSubStack === "squarespace") return generateWixAgentPrompt(opts);
    if (selectedSubStack === "webflow" || selectedSubStack === "framer") return generateWebflowAgentPrompt(opts);
    return generateJsAgentPrompt(opts);
  }, [selectedSubStack, apiKeyValue, effectiveEndpoint, activeDeflectionInfo]);

  const handleCopyPrompt = (toolName?: string) => {
    navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
    toast({
      title: toolName ? `Copied for ${toolName}` : "Installation Prompt Copied",
      description: `Configured for ${selectedSubStack.toUpperCase()} with dynamic zero-redeploy edge policies. Paste into your AI coding assistant.`,
    });
  };

  const handleOpenCursor = () => {
    handleCopyPrompt("Cursor");
    try {
      window.location.href = `cursor://anysphere.cursor-always-local/`;
    } catch (e) {
      // Fallback copied to clipboard
    }
  };

  const activeStackObj = ARCHITECTURE_LIST.find((s) => s.id === selectedSubStack) || ARCHITECTURE_LIST[0];

  // Helper flags for customized verification step instructions
  const isClientFramework = ["javascript", "react", "vue", "angular", "preact", "svelte"].includes(selectedSubStack);
  const isSiteBuilder = ["wix", "webflow", "shopify"].includes(selectedSubStack);
  const isServerEdge = ["cloudflare", "php", "wordpress", "nextjs"].includes(selectedSubStack);

  return (
    <div className="space-y-6">
      {/* ── 1. TARGET ARCHITECTURE SELECTOR (Unified with Manual Setup) ── */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#0A5C48]">
              <Sparkles className="h-4 w-4 text-[#F25A2A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
                Select Integration Stack:
              </h4>
              <p className="text-[11px] text-[#64748B]">
                AI Agent setup supports the exact same stacks, builders, and edge platforms as manual integration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
            <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Real-time Cloud Sync (~12ms)</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 pt-1">
          {CATEGORY_TABS.map((cat) => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 ${
                  isCatActive
                    ? "bg-[#0A5C48] text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Stack Buttons Grid with Logos */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {filteredArchitectures.map((st) => {
            const isSelected = selectedSubStack === st.id;
            const LogoIcon = st.Logo;
            return (
              <button
                key={st.id}
                onClick={() => handleStackChange(st.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-[#0A5C48] text-white shadow-xs font-bold ring-1 ring-[#0A5C48]"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <LogoIcon className="h-4 w-4 shrink-0" />
                <span>{st.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-500"
                  }`}
                >
                  {st.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. LIVE SYNCED POLICY BANNER (Rules & Policies is Single Source of Truth) ── */}
      <SyncedPolicyBanner
        rulesets={rulesets}
        serverBotUrl={serverBotUrl}
        onNavigateToRules={onNavigateToRules}
      />

      {/* ── 3. MAIN 2-COLUMN WORKFLOW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 3 Numbered Steps Timeline */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative pl-8 space-y-7 before:absolute before:left-3 before:top-2 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {/* Step 1 */}
            <div className="relative">
              <span className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
                1
              </span>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <span>Copy and run prompt for</span>
                  <span className="text-[#0A5C48]">{activeStackObj.label}</span>
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Install CleanTraffic with zero external npm dependencies. The prompt embeds your active API key, endpoint, certified code, and syncs live with your{" "}
                  <strong className="text-slate-800">Rules &amp; Policies engine</strong>.
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button
                    onClick={() => handleCopyPrompt()}
                    className="h-9 px-4 bg-[#070606] hover:bg-[#1f1d1d] text-white font-bold text-xs gap-1.5 rounded-lg shadow-sm"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? "Copied to clipboard" : "Copy prompt"}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 px-3.5 border-slate-200 bg-[#ffffff] hover:bg-slate-50 text-slate-800 text-xs font-semibold gap-1.5 rounded-lg"
                      >
                        <Code2 className="h-4 w-4 text-slate-600" />
                        <span>Open in Cursor</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 text-xs">
                      <DropdownMenuItem onClick={handleOpenCursor} className="cursor-pointer gap-2 font-medium">
                        <Terminal className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Launch in Cursor</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyPrompt("Claude Code")} className="cursor-pointer gap-2 font-medium">
                        <Bot className="h-3.5 w-3.5 text-orange-500" />
                        <span>Copy for Claude Code</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyPrompt("Windsurf")} className="cursor-pointer gap-2 font-medium">
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                        <span>Copy for Windsurf</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyPrompt("GitHub Copilot")} className="cursor-pointer gap-2 font-medium">
                        <Code2 className="h-3.5 w-3.5 text-purple-500" />
                        <span>Copy for GitHub Copilot</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyPrompt("ChatGPT / Claude")} className="cursor-pointer gap-2 font-medium">
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy for ChatGPT / Web</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <span className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
                2
              </span>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#0F172A]">
                  Follow the steps in your agent
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Your AI assistant acts as a reliable installer, creating the zero-dependency guard file and registering it in your application. Review the generated code and approve the diff.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <span className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
                3
              </span>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[#0F172A]">
                  Test &amp; verify immediate protection
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Start your app and confirm legitimate visitors proceed while bots and policy rule restrictions trigger immediately:
                </p>

                {isClientFramework ? (
                  <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>Start your local dev server (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">npm run dev</code>) and open your browser &rarr; Page loads HTTP 200 smoothly.</li>
                    <li>Open DevTools Console &rarr; Check that visitor telemetry resolves without blocking page rendering: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">isHuman: true, confidenceScore: 0.99</code>.</li>
                    <li>Check the {onNavigateToLiveFeed ? (
                      <button onClick={onNavigateToLiveFeed} className="text-[#F25A2A] hover:underline font-bold inline-flex items-center gap-0.5">
                        Live Feed <ArrowRight className="h-3 w-3 inline" />
                      </button>
                    ) : <span className="text-[#F25A2A] font-bold">Live Feed</span>} to view real-time visitor identification events.</li>
                  </ol>
                ) : isSiteBuilder ? (
                  <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>Publish your changes in your site builder dashboard.</li>
                    <li>Visit your published site in a browser &rarr; Confirm <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">protect.js</code> loads with HTTP 200 in ~12ms for real shoppers.</li>
                    <li>Automated scrapers or restricted devices receive your configured deflection screen in-place ({activeDeflectionInfo.action === '404' ? 'HTTP 404' : activeDeflectionInfo.action === 'redirect' ? 'HTTP 302' : 'HTTP 403'}).</li>
                    <li>Check the {onNavigateToLiveFeed ? (
                      <button onClick={onNavigateToLiveFeed} className="text-[#F25A2A] hover:underline font-bold inline-flex items-center gap-0.5">
                        Live Feed <ArrowRight className="h-3 w-3 inline" />
                      </button>
                    ) : <span className="text-[#F25A2A] font-bold">Live Feed</span>} to see live visitor telemetry.</li>
                  </ol>
                ) : (
                  <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>Visit your local app in a browser (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">http://localhost:3000</code>) &rarr; Loads HTTP 200 OK.</li>
                    <li>In terminal, test bot rejection: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">curl -i -A "Googlebot" http://localhost:3000/</code> &rarr; Returns {activeDeflectionInfo.action === '404' ? 'HTTP 404' : activeDeflectionInfo.action === 'redirect' ? 'HTTP 302' : 'HTTP 403'}.</li>
                    <li>Check the {onNavigateToLiveFeed ? (
                      <button onClick={onNavigateToLiveFeed} className="text-[#F25A2A] hover:underline font-bold inline-flex items-center gap-0.5">
                        Live Feed <ArrowRight className="h-3 w-3 inline" />
                      </button>
                    ) : <span className="text-[#F25A2A] font-bold">Live Feed</span>} to view real-time visitor evaluation logs.</li>
                  </ol>
                )}

                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-[11px] text-emerald-800 flex items-start gap-2 mt-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rule Changes Take Effect Instantly:</strong> When you adjust Device filters (e.g. Block PC) or Country Geofencing in your CleanTraffic dashboard, cloud verdicts apply live in &lt;15ms without needing to reinstall code.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dark Prompt Card */}
        <div className="lg:col-span-6">
          <div className="bg-[#12161A] border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col">
            {/* Header Bar */}
            <div className="bg-[#181D24] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-[11px] font-bold text-slate-200 tracking-wide uppercase">
                  Installation prompt ({activeStackObj.label})
                </span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-mono py-0 h-4">
                  {activeDeflectionInfo.action === "redirect" ? "REDIRECT" : `HTTP ${activeDeflectionInfo.action}`}
                </Badge>
              </div>
              <button
                onClick={() => handleCopyPrompt()}
                title="Copy Prompt"
                className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap select-all selection:bg-emerald-800 selection:text-white">
              {activePrompt}
            </div>

            {/* Footer Bar */}
            <div className="bg-[#181D24] px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                API Key: <code className="text-emerald-400 font-mono text-[10px]">{apiKeyValue ? `${apiKeyValue.slice(0, 8)}...` : "ctc_live_..."}</code>
              </span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-slate-300 hover:text-white font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
                <span>See full prompt</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Prompt Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 bg-[#0F172A] text-slate-100 border-slate-800">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>CleanTraffic Agentic Installation Prompt ({activeStackObj.label})</span>
            </DialogTitle>
            <Button
              size="sm"
              onClick={() => handleCopyPrompt()}
              className="h-8 bg-[#F25A2A] hover:bg-[#D94E22] text-white text-xs font-bold gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy full prompt"}</span>
            </Button>
          </DialogHeader>
          <div className="overflow-y-auto mt-4 p-4 bg-[#080C14] border border-slate-800/80 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {activePrompt}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
