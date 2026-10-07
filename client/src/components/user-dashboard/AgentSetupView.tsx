import React, { useState } from "react";
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
  generateUniversalAgentPrompt,
  generateNextJsAgentPrompt,
  generateCloudflareAgentPrompt,
  generatePhpAgentPrompt,
  generateWordPressAgentPrompt,
  generateShopifyAgentPrompt,
  generateWebflowAgentPrompt,
  generateFramerAgentPrompt,
  generateWixAgentPrompt,
  generateReactAgentPrompt,
  generateGtmAgentPrompt,
} from "@shared/agenticPrompts";
import { DeflectionControlBar } from "./DeflectionControlBar";

export type SupportedAgentStack =
  | "cloudflare"
  | "nextjs"
  | "webflow"
  | "framer"
  | "shopify"
  | "wordpress"
  | "wix"
  | "php"
  | "gtm"
  | "react"
  | "universal";

interface AgentSetupViewProps {
  apiKeyValue: string;
  effectiveEndpoint: string;
  targetStack?: string;
  initialDeflection?: "403" | "404" | "redirect";
  initialBotUrl?: string;
  title?: string;
  description?: string;
  onNavigateToLiveFeed?: () => void;
  onDeflectionChange?: (action: "403" | "404" | "redirect", url?: string) => void;
}

const ARCHITECTURE_LIST: { id: string; label: string; tag: string }[] = [
  { id: "cloudflare", label: "Cloudflare", tag: "Any Host / Worker" },
  { id: "nextjs", label: "Next.js", tag: "Vercel / Render" },
  { id: "webflow", label: "Webflow", tag: "Landing Pages" },
  { id: "framer", label: "Framer", tag: "Startup Sites" },
  { id: "shopify", label: "Shopify", tag: "Storefront" },
  { id: "wordpress", label: "WordPress", tag: "Plugin" },
  { id: "wix", label: "Wix & Squarespace", tag: "Builders" },
  { id: "php", label: "PHP", tag: "index.php Shield" },
  { id: "gtm", label: "Google Tag Manager", tag: "No-Code" },
  { id: "react", label: "HTML / React", tag: "Static Web Tag" },
];

export function AgentSetupView({
  apiKeyValue,
  effectiveEndpoint,
  targetStack = "cloudflare",
  initialDeflection = "403",
  initialBotUrl = "",
  title,
  description,
  onNavigateToLiveFeed,
  onDeflectionChange,
}: AgentSetupViewProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Normalize initial stack selection
  const normalizeStack = (stack: string): string => {
    if (stack === "universal") return "cloudflare";
    if (stack === "html" || stack === "javascript") return "react";
    if (stack === "nodejs" || stack === "express" || stack === "python") return "cloudflare";
    return stack;
  };

  const [selectedSubStack, setSelectedSubStack] = useState<string>(() => normalizeStack(targetStack));

  // PHP is the ONLY stack with custom redirect URL capability
  const isPhpStack = selectedSubStack === "php";
  const isClientTag = ["webflow", "framer", "shopify", "wix", "gtm", "react"].includes(selectedSubStack);

  // Bot Deflection & Fallback Controls
  const [deflectionAction, setDeflectionAction] = useState<"403" | "404" | "redirect">(() => {
    if (!isPhpStack && initialDeflection === "redirect") {
      return "403";
    }
    return initialDeflection;
  });
  const [botFallbackUrl, setBotFallbackUrl] = useState<string>(initialBotUrl || "https://google.com");

  // Handle stack change: ensure non-PHP stacks don't remain in "redirect" mode
  const handleStackChange = (newStack: string) => {
    const normalized = normalizeStack(newStack);
    setSelectedSubStack(normalized);
    const newIsPhp = normalized === "php";
    if (!newIsPhp && deflectionAction === "redirect") {
      setDeflectionAction("403");
    }
  };

  // Compute active prompt dynamically based on chosen stack & deflection controls
  const activePrompt = React.useMemo(() => {
    const opts = {
      apiKeyValue,
      effectiveEndpoint,
      deflectionAction: isPhpStack ? deflectionAction : (deflectionAction === "redirect" ? "403" : deflectionAction),
      botFallbackUrl: isPhpStack && deflectionAction === "redirect" ? botFallbackUrl : undefined,
    };

    if (selectedSubStack === "cloudflare") return generateCloudflareAgentPrompt(opts);
    if (selectedSubStack === "nextjs") return generateNextJsAgentPrompt(opts);
    if (selectedSubStack === "webflow") return generateWebflowAgentPrompt(opts);
    if (selectedSubStack === "framer") return generateFramerAgentPrompt(opts);
    if (selectedSubStack === "shopify") return generateShopifyAgentPrompt(opts);
    if (selectedSubStack === "wordpress") return generateWordPressAgentPrompt(opts);
    if (selectedSubStack === "wix") return generateWixAgentPrompt(opts);
    if (selectedSubStack === "php") return generatePhpAgentPrompt(opts);
    if (selectedSubStack === "gtm") return generateGtmAgentPrompt(opts);
    if (selectedSubStack === "react") return generateReactAgentPrompt(opts);
    return generateCloudflareAgentPrompt(opts);
  }, [selectedSubStack, isPhpStack, apiKeyValue, effectiveEndpoint, deflectionAction, botFallbackUrl]);

  const handleCopyPrompt = (toolName?: string) => {
    navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
    toast({
      title: toolName ? `Copied for ${toolName}` : "Installation Prompt Copied",
      description: `Configured for ${selectedSubStack.toUpperCase()} with ${deflectionAction.toUpperCase()} deflection. Paste into your AI coding assistant.`,
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

  const activeStackObj = ARCHITECTURE_LIST.find(s => s.id === selectedSubStack) || ARCHITECTURE_LIST[0];

  return (
    <div className="space-y-6">
      
      {/* ── 1. TARGET ARCHITECTURE COMES FIRST (100% Websites, Landing Pages & Modern Hosts) ── */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#0A5C48]">
              <Sparkles className="h-4 w-4 text-[#F25A2A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
                Target Platform / Website Architecture:
              </h4>
              <p className="text-[11px] text-[#64748B]">
                Choose your website platform, landing page builder, or edge reverse proxy (Cloudflare protects ANY host like Render, Railway, etc.).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
            <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Real-time Cloud Sync (~12ms)</span>
          </div>
        </div>

        {/* 1:1 Architecture Selector matching every manual integration */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {ARCHITECTURE_LIST.map((st) => {
            const isSelected = selectedSubStack === st.id;
            return (
              <button
                key={st.id}
                onClick={() => handleStackChange(st.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#0A5C48] text-white shadow-xs font-bold ring-1 ring-[#0A5C48]"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-500"
                }`}>
                  {st.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. BOT & RULE DEFLECTION ACTION COMES SECOND ── */}
      <DeflectionControlBar
        isPhpStack={isPhpStack}
        deflectionAction={deflectionAction}
        botFallbackUrl={botFallbackUrl}
        onDeflectionChange={(action, url) => {
          setDeflectionAction(action);
          if (url !== undefined) setBotFallbackUrl(url);
          if (onDeflectionChange) {
            onDeflectionChange(action, url);
          }
        }}
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
                <h4 className="text-sm font-bold text-[#0F172A]">
                  Copy and run the prompt in your agent
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Install CleanTraffic with zero external npm dependencies. The prompt embeds your active API key, endpoint, certified code, and your chosen{" "}
                  {!isClientTag ? (
                    <strong className="text-slate-800">{deflectionAction.toUpperCase()} deflection action</strong>
                  ) : (
                    <strong className="text-slate-800">non-blocking telemetry mode</strong>
                  )}
                  .
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button
                    onClick={() => handleCopyPrompt()}
                    className="h-9 px-4 bg-[#F25A2A] hover:bg-[#D94E22] text-white font-bold text-xs gap-1.5 rounded-lg shadow-sm"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? "Copied to clipboard" : "Copy prompt"}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 px-3.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold gap-1.5 rounded-lg"
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
                  Your AI assistant acts as a reliable installer, creating the zero-dependency guard file and registering it in your application. Approve the diff.
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
                  Start your app and confirm real humans load normally while bots and policy rule restrictions trigger immediately:
                </p>
                <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Visit your local app in a browser (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">http://localhost:3000</code>) &rarr; Loads HTTP 200 OK.</li>
                  {!isClientTag ? (
                    <li>In terminal, test bot rejection: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">curl -i -A "Googlebot" http://localhost:3000/</code> &rarr; Returns {deflectionAction === '404' ? 'HTTP 404' : deflectionAction === 'redirect' ? 'HTTP 302' : 'HTTP 403'}.</li>
                  ) : (
                    <li>Open browser DevTools Console &rarr; Check that hardware entropy registers without blocking page rendering.</li>
                  )}
                  <li>Check the {onNavigateToLiveFeed ? (
                    <button onClick={onNavigateToLiveFeed} className="text-[#F25A2A] hover:underline font-bold inline-flex items-center gap-0.5">
                      Live Feed <ArrowRight className="h-3 w-3 inline" />
                    </button>
                  ) : <span className="text-[#F25A2A] font-bold">Live Feed</span>} to view real-time visitor evaluation logs.</li>
                </ol>
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
                {!isClientTag ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-mono py-0 h-4">
                    {deflectionAction.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-mono py-0 h-4">
                    TELEMETRY
                  </Badge>
                )}
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
