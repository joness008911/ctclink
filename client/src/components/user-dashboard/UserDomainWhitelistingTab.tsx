import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { 
  Globe, 
  Info,
  Copy, 
  Check, 
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface OriginRulesResponse {
  configured: boolean;
  domainFilterMode: "forbid_all_except" | "allow_all_except";
  allowedDomains: string[];
  apiKeyId: string | null;
  keyName: string | null;
}

export function UserDomainWhitelistingTab() {
  const { toast } = useToast();
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"forbid_all_except" | "allow_all_except">("forbid_all_except");
  const [domainsInput, setDomainsInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Live Origin Test Simulator state
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  // Fetch current user's origin filtering rules
  const { data: rules, isLoading } = useQuery<OriginRulesResponse>({
    queryKey: ["/api/user/origin-rules"],
    refetchOnMount: true,
  });

  // Open modal and pre-fill form
  const handleOpenConfigure = () => {
    if (rules) {
      setFilterMode(rules.domainFilterMode || "forbid_all_except");
      setDomainsInput(rules.allowedDomains ? rules.allowedDomains.join("\n") : "");
    } else {
      setFilterMode("forbid_all_except");
      setDomainsInput("");
    }
    setIsConfigureOpen(true);
  };

  // Save rules mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: { domainFilterMode: string; allowedDomains: string[] }) => {
      const res = await apiRequest("PUT", "/api/user/origin-rules", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/origin-rules"] });
      setIsConfigureOpen(false);
      toast({
        title: "Origin Rules Saved",
        description: data.configured
          ? `Successfully applied origin filtering for ${data.allowedDomains.length} domain pattern(s).`
          : "All websites are now allowed by default.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Save Rules",
        description: err.message || "An unexpected error occurred while saving domain rules.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const parsedDomains = domainsInput
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);

    saveMutation.mutate({
      domainFilterMode: filterMode,
      allowedDomains: parsedDomains,
    });
  };

  const handleCopyDomain = (domain: string, idx: number) => {
    navigator.clipboard.writeText(domain);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({
      title: "Copied to Clipboard",
      description: domain,
    });
  };

  // Run local test simulation against current rules
  const handleTestOrigin = () => {
    if (!testUrl.trim()) return;

    let target = testUrl.trim().toLowerCase();
    try {
      if (target.startsWith("http://") || target.startsWith("https://")) {
        target = new URL(target).hostname;
      } else {
        target = target.split("/")[0].split(":")[0];
      }
    } catch {
      target = target.split("/")[0].split(":")[0];
    }

    const currentDomains = rules?.allowedDomains || [];
    const mode = rules?.domainFilterMode || "forbid_all_except";

    if (currentDomains.length === 0) {
      setTestResult({
        allowed: true,
        reason: "Allowed by default (No origin rules are configured)",
      });
      return;
    }

    let matches = false;
    let matchedRule = "";

    for (const rule of currentDomains) {
      let pattern = rule.trim().toLowerCase();
      try {
        if (pattern.startsWith("http://") || pattern.startsWith("https://")) {
          pattern = new URL(pattern).hostname;
        }
      } catch {}
      pattern = pattern.split("/")[0].split(":")[0];

      if (target === pattern || target === `www.${pattern}`) {
        matches = true;
        matchedRule = rule;
        break;
      }
      if (pattern.startsWith("*.")) {
        const root = pattern.slice(2);
        if (target === root || target.endsWith("." + root)) {
          matches = true;
          matchedRule = rule;
          break;
        }
      }
      if (pattern.endsWith(".*")) {
        const prefix = pattern.slice(0, -2);
        if (target.startsWith(prefix)) {
          matches = true;
          matchedRule = rule;
          break;
        }
      }
    }

    if (mode === "forbid_all_except") {
      if (matches) {
        setTestResult({
          allowed: true,
          reason: `PERMITTED: Matches allowed domain rule (${matchedRule})`,
        });
      } else {
        setTestResult({
          allowed: false,
          reason: `BLOCKED (403 Forbidden): Origin "${target}" is not in your allowed whitelist`,
        });
      }
    } else {
      if (matches) {
        setTestResult({
          allowed: false,
          reason: `BLOCKED (403 Forbidden): Matches blacklisted rule (${matchedRule})`,
        });
      } else {
        setTestResult({
          allowed: true,
          reason: `PERMITTED: Origin "${target}" is not blacklisted`,
        });
      }
    }
  };

  const configured = rules?.configured && (rules?.allowedDomains?.length ?? 0) > 0;
  const isWhitelistMode = rules?.domainFilterMode === "forbid_all_except";

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Top Header Section (Matching Screenshot) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Websites</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter unauthorized identification requests by origin.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleOpenConfigure}
            className="bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold h-9 px-5 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            Configure
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="w-8 h-8 rounded-full border-2 border-[#EA580C] border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading origin rules...</p>
          </div>
        ) : !configured ? (
          /* Empty State: Shown before rules are configured */
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No origin rules</h3>
            <p className="text-xs text-slate-500 mb-6 max-w-sm">
              All websites are allowed by default. Add origin rules to ensure your JavaScript tag only runs on your verified domains.
            </p>
            <Button
              type="button"
              onClick={handleOpenConfigure}
              className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-xs px-5 py-2 shadow-xs transition-all"
            >
              Configure
            </Button>
          </div>
        ) : (
          /* Active Two-Column Card Layout (Matching Screenshot Exactly) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Card: ALLOWED ORIGINS */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  Allowed Origins
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-slate-600">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Requests from these origins are permitted to load protect.js and verify traffic.
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="p-4 flex-1">
                {isWhitelistMode ? (
                  /* Whitelist Mode: Lists each allowed domain */
                  <div className="space-y-2">
                    {rules?.allowedDomains.map((domain, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 transition-colors group"
                      >
                        <span className="text-xs font-mono text-slate-900 truncate" title={domain}>
                          {domain}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyDomain(domain, idx)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy origin"
                        >
                          {copiedIndex === idx ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Blacklist Mode: All websites allowed by default */
                  <div className="text-xs text-slate-600 py-1">
                    All websites are allowed by default
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: FORBIDDEN ORIGINS */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  Forbidden Origins
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-slate-600">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Requests from these origins are blocked with 403 Forbidden to protect your API key.
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="p-4 flex-1">
                {isWhitelistMode ? (
                  /* Whitelist Mode: All other websites are forbidden by default */
                  <div className="text-xs text-slate-600 py-1">
                    All websites are forbidden by default
                  </div>
                ) : (
                  /* Blacklist Mode: Lists each forbidden domain */
                  <div className="space-y-2">
                    {rules?.allowedDomains.map((domain, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 transition-colors group"
                      >
                        <span className="text-xs font-mono text-rose-700 truncate" title={domain}>
                          {domain}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyDomain(domain, idx)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy origin"
                        >
                          {copiedIndex === idx ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Simulator Test Box */}
        {configured && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 mt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EA580C]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Test Origin Rule
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={testUrl}
                onChange={(e) => {
                  setTestUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="e.g. https://domains.com or https://unauthorized-copy.com"
                className="text-xs h-9 font-mono border-slate-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTestOrigin();
                }}
              />
              <Button
                type="button"
                onClick={handleTestOrigin}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-4 shrink-0"
              >
                Test
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2 ${
                  testResult.allowed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                {testResult.allowed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.allowed ? "Allowed" : "Forbidden (403)"}</div>
                  <div className="text-[11px] opacity-90 mt-0.5">{testResult.reason}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configure Rules Modal (Matching Reference Image 1) */}
        <Dialog open={isConfigureOpen} onOpenChange={setIsConfigureOpen}>
          <DialogContent className="max-w-xl bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-lg font-bold text-slate-900">Configure rules</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Filter unauthorized identification requests by origin domain name.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Default Behaviour Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800">Default behaviour</label>
                <Select
                  value={filterMode}
                  onValueChange={(val: any) => setFilterMode(val)}
                >
                  <SelectTrigger className="w-full text-xs h-10 border-slate-300 focus:border-[#EA580C] focus:ring-[#EA580C]">
                    <SelectValue placeholder="Select default behaviour" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg text-xs">
                    <SelectItem value="allow_all_except">
                      Allow all except the websites listed below
                    </SelectItem>
                    <SelectItem value="forbid_all_except">
                      Forbid all except the websites listed below
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Origins Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800">Origins</label>
                <Textarea
                  rows={7}
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  placeholder={"https://domain.com or\nhttps://*.domain.com or\nhttps://23.43.136.*\none per line"}
                  className="font-mono text-xs leading-relaxed border-slate-300 focus:border-[#EA580C] focus:ring-[#EA580C] resize-y placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-500 italic">
                  Origins can contain wildcards (https://*.domain.com)
                </p>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfigureOpen(false)}
                className="text-xs h-9 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold h-9 px-6 shadow-xs"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
