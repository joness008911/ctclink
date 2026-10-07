import React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Globe, Zap } from "lucide-react";

interface DeflectionControlBarProps {
  isPhpStack: boolean;
  deflectionAction: "403" | "404" | "redirect";
  botFallbackUrl: string;
  onDeflectionChange: (action: "403" | "404" | "redirect", url?: string) => void;
  className?: string;
}

export function DeflectionControlBar({
  isPhpStack,
  deflectionAction,
  botFallbackUrl,
  onDeflectionChange,
  className = "",
}: DeflectionControlBarProps) {
  return (
    <div className={`bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3.5 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#F25A2A] shadow-2xs">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
              Bot &amp; Rule Deflection Action
            </h4>
            <p className="text-[11px] text-[#64748B]">
              {isPhpStack
                ? "Choose how unwanted traffic (bots or restricted visitors) is deflected: return an HTTP error or redirect to a fallback URL."
                : "Choose what blocked bots or rule-restricted visitors see: 403 Forbidden or 404 Stealth Drop. Legitimate humans pass through with 0ms delay without any redirect."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
          <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Real-time Cloud Sync (~12ms)</span>
        </div>
      </div>

      {/* Deflection Action Selector Pills */}
      <div className={`grid grid-cols-1 ${isPhpStack ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-2.5 pt-1`}>
        {/* 403 Forbidden */}
        <button
          type="button"
          onClick={() => onDeflectionChange("403")}
          className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
            deflectionAction === "403"
              ? "bg-white border-[#F25A2A] ring-1 ring-[#F25A2A] shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
          }`}
        >
          <div className={`w-3.5 h-3.5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
            deflectionAction === "403" ? "border-[#F25A2A] bg-[#F25A2A]" : "border-slate-300"
          }`}>
            {deflectionAction === "403" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>403 Forbidden</span>
              <Badge className="bg-red-50 text-red-700 border-red-200 text-[9px] py-0 px-1 font-mono">
                Default
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Authentic edge access denied. Real humans pass through with 0ms delay.
            </p>
          </div>
        </button>

        {/* 404 Stealth Drop */}
        <button
          type="button"
          onClick={() => onDeflectionChange("404")}
          className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
            deflectionAction === "404"
              ? "bg-white border-[#F25A2A] ring-1 ring-[#F25A2A] shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
          }`}
        >
          <div className={`w-3.5 h-3.5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
            deflectionAction === "404" ? "border-[#F25A2A] bg-[#F25A2A]" : "border-slate-300"
          }`}>
            {deflectionAction === "404" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>404 Stealth Drop</span>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] py-0 px-1 font-mono">
                Anti-Scraper
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pretends page does not exist to mislead and exhaust automated scrapers.
            </p>
          </div>
        </button>

        {/* Redirect to URL: ONLY for PHP / WordPress Stack */}
        {isPhpStack && (
          <button
            type="button"
            onClick={() => onDeflectionChange("redirect")}
            className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
              deflectionAction === "redirect"
                ? "bg-white border-[#F25A2A] ring-1 ring-[#F25A2A] shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
              deflectionAction === "redirect" ? "border-[#F25A2A] bg-[#F25A2A]" : "border-slate-300"
            }`}>
              {deflectionAction === "redirect" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Redirect to URL</span>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] py-0 px-1 font-mono">
                  PHP Only
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Redirects blocked traffic to a safe decoy page or clean domain.
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Bot Fallback URL Input (When Redirect Selected in PHP) */}
      {isPhpStack && deflectionAction === "redirect" && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 animate-in fade-in-50 duration-200">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-[#F25A2A]" />
            <span>Bot Fallback Destination URL:</span>
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={botFallbackUrl}
              onChange={(e) => onDeflectionChange("redirect", e.target.value)}
              placeholder="https://google.com or https://safe-decoy.com"
              className="h-8 text-xs font-mono bg-slate-50/50 border-slate-200"
            />
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] whitespace-nowrap h-8 px-2.5">
              302 Redirect
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
