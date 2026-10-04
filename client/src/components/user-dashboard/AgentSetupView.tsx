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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  generateUniversalAgentPrompt,
  generateExpressAgentPrompt,
  generateNextJsAgentPrompt,
  generateCloudflareAgentPrompt,
  generatePhpAgentPrompt,
  generateWebSnippetAgentPrompt,
} from "@shared/agenticPrompts";

interface AgentSetupViewProps {
  apiKeyValue: string;
  effectiveEndpoint: string;
  targetStack?: "universal" | "nodejs" | "nextjs" | "fastify" | "cloudflare" | "php" | "wordpress" | "shopify" | "html";
  title?: string;
  description?: string;
  onNavigateToLiveFeed?: () => void;
}

export function AgentSetupView({
  apiKeyValue,
  effectiveEndpoint,
  targetStack = "universal",
  title,
  description,
  onNavigateToLiveFeed,
}: AgentSetupViewProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubStack, setSelectedSubStack] = useState<string>(
    targetStack === "nodejs" ? "express" : targetStack
  );

  // Compute active prompt based on selected stack
  const activePrompt = React.useMemo(() => {
    const opts = { apiKeyValue, effectiveEndpoint };
    if (selectedSubStack === "nextjs") return generateNextJsAgentPrompt(opts);
    if (selectedSubStack === "express" || selectedSubStack === "nodejs") return generateExpressAgentPrompt(opts);
    if (selectedSubStack === "cloudflare") return generateCloudflareAgentPrompt(opts);
    if (selectedSubStack === "php" || selectedSubStack === "wordpress") return generatePhpAgentPrompt(opts);
    if (selectedSubStack === "shopify" || selectedSubStack === "html") return generateWebSnippetAgentPrompt(opts);
    return generateUniversalAgentPrompt(opts);
  }, [selectedSubStack, apiKeyValue, effectiveEndpoint]);

  const handleCopyPrompt = (toolName?: string) => {
    navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
    toast({
      title: toolName ? `Copied for ${toolName}` : "Installation Prompt Copied",
      description: "Paste into your AI coding assistant (Cursor, Claude Code, Windsurf, Copilot).",
    });
  };

  const handleOpenCursor = () => {
    handleCopyPrompt("Cursor");
    try {
      // Attempt cursor protocol
      window.location.href = `cursor://anysphere.cursor-always-local/`;
    } catch (e) {
      // Fallback already copied to clipboard
    }
  };

  return (
    <div className="space-y-6">
      {/* Framework Selector (When Universal) */}
      {targetStack === "universal" && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Target Framework:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "universal", label: "Auto-Detect (Universal)" },
              { id: "nextjs", label: "Next.js" },
              { id: "express", label: "Express / Node" },
              { id: "cloudflare", label: "Cloudflare Worker" },
              { id: "php", label: "PHP" },
              { id: "shopify", label: "Shopify / HTML" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedSubStack(st.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedSubStack === st.id
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Layout (Matching Screenshot) */}
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
                  Install CleanTraffic in your app by detecting your framework. If no project exists, your agent asks what to scaffold and defaults to Next.js or Express. Your API key and endpoint are automatically included.
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
                  Review the steps proposed by your AI assistant and approve each change as it generates the zero-dependency middleware or edge worker.
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
                  Send your first event
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Disable any <strong className="text-slate-800">ad blockers</strong> before testing, as local dev ad blockers may suppress analytics requests.
                </p>
                <ol className="text-xs text-[#64748B] space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Start your dev server (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">npm run dev</code>), or ask your agent to do so.</li>
                  <li>Open your app locally in the browser (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">localhost:3000</code>).</li>
                  <li>Check the developer console or visit the {onNavigateToLiveFeed ? (
                    <button onClick={onNavigateToLiveFeed} className="text-[#F25A2A] hover:underline font-bold inline-flex items-center gap-0.5">
                      Live Feed <ArrowRight className="h-3 w-3 inline" />
                    </button>
                  ) : <span className="text-[#F25A2A] font-bold">Live Feed</span>} to view your first verified visitor event.</li>
                </ol>
                <p className="text-[11px] text-slate-400 pt-1">
                  Return to this page to verify threat protection and test automated bot blocking.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Dark Prompt Card (Matching Screenshot) */}
        <div className="lg:col-span-6">
          <div className="bg-[#12161A] border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col">
            
            {/* Header Bar */}
            <div className="bg-[#181D24] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-[11px] font-bold text-slate-200 tracking-wide uppercase">
                  Installation prompt
                </span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-mono py-0 h-4">
                  AI-Ready
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
                Includes API Key: <code className="text-emerald-400 font-mono text-[10px]">{apiKeyValue ? `${apiKeyValue.slice(0, 8)}...` : "ctc_live_..."}</code>
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
              <span>CleanTraffic Agentic Installation Prompt</span>
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
