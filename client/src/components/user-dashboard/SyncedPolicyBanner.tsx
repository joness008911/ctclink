import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Ruleset } from "@shared/rulesEngine";

interface SyncedPolicyBannerProps {
  rulesets?: Ruleset[];
  serverBotUrl?: string;
  onNavigateToRules?: () => void;
  className?: string;
}

export function SyncedPolicyBanner({
  rulesets = [],
  serverBotUrl = "403",
  onNavigateToRules,
  className = "",
}: SyncedPolicyBannerProps) {
  // Identify the active/enabled ruleset
  const activeRuleset = rulesets.find((r) => r.enabled) || rulesets[0];
  const activeRulesCount = activeRuleset ? activeRuleset.rules.filter((s) => s.enabled).length : 0;
  const isSingleMode = activeRuleset?.responseMode === "single";

  // Derive human-readable active deflection label
  const getDeflectionSummary = () => {
    if (!activeRuleset) {
      if (serverBotUrl === "404") return "Edge 404 Stealth Drop";
      if (serverBotUrl.startsWith("http")) return `Redirect (${serverBotUrl.replace(/^https?:\/\//, "").slice(0, 24)}...)`;
      return "Edge 403 Forbidden";
    }

    if (isSingleMode && activeRuleset.singleResponse) {
      const resp = activeRuleset.singleResponse;
      if (resp.action === "redirect" && resp.redirectUrl) {
        return `Redirect (${resp.redirectUrl.replace(/^https?:\/\//, "").slice(0, 24)}...)`;
      }
      return `Unified HTTP ${resp.statusCode || 403} (${resp.statusCode === 404 ? "Stealth Drop" : "Forbidden"})`;
    }

    // Multi-status: Show summary of active actions
    const statuses = Array.from(new Set(
      activeRuleset.rules
        .filter((r) => r.enabled)
        .map((r) => (r.action === "redirect" && r.redirectUrl ? "Redirect" : `${r.statusCode || 403}`))
    ));

    if (statuses.length > 0) {
      return `Multi-Status (${statuses.join(", ")})`;
    }

    return "Live Edge Policy";
  };

  const deflectionLabel = getDeflectionSummary();

  const handleEditClick = () => {
    if (onNavigateToRules) {
      onNavigateToRules();
    } else {
      const base = window.location.pathname.startsWith("/dashboard") ? "/dashboard" : "/user";
      window.location.href = `${base}?tab=routing`;
    }
  };

  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs transition-all hover:border-slate-300 ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Left: Active Policy Details */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/90 flex items-center justify-center text-[#0A5C48] shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#0F172A] tracking-tight">
                Live Edge Ruleset:
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                {activeRuleset?.name || "Global Protection Rules"}
              </span>
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-medium h-5 px-1.5"
              >
                {activeRulesCount} active rule{activeRulesCount === 1 ? "" : "s"}
              </Badge>
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Zero-Redeploy Synced</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#64748B] flex-wrap">
              <span>Deflection Action:</span>
              <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                {deflectionLabel}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Updates in <strong className="text-slate-700 font-semibold">Rules & Policies</strong> take effect immediately across all live integrations.
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick shortcut button */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center pl-12 md:pl-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEditClick}
            className="h-8 text-xs font-semibold text-[#0A5C48] border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Edit Rules & Policies</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}
