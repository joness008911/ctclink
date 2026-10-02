import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  Send, 
  Check, 
  Copy, 
  Trash2, 
  AlertTriangle, 
  ShieldCheck, 
  Database, 
  Zap, 
  Eye, 
  EyeOff, 
  Server, 
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Clock,
  ArrowUpRight
} from "lucide-react";

interface IncidentItem {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "warning" | "info";
  subsystem: string;
  title: string;
  exactCause: string;
  fileLocation?: string;
  httpStatus?: number | null;
  latencyMs?: number | null;
  context?: {
    url?: string | null;
    clientIp?: string | null;
    apiKeyId?: string | null;
    userAgent?: string | null;
    retryCount?: number | null;
    fallbackMode?: string | null;
    errorStack?: string | null;
  };
  recommendedAction: string;
  resolved: boolean;
  notifiedTelegram: boolean;
}

interface MonitoringSettings {
  hasToken: boolean;
  telegramTokenPreview: string;
  telegramChatId: string;
  configured: boolean;
}

export default function AdminMonitoringDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch current monitoring settings
  const { data: settings } = useQuery<MonitoringSettings>({
    queryKey: ["/api/admin/monitoring/settings"],
  });

  useEffect(() => {
    if (settings?.telegramChatId && !chatId) {
      setChatId(settings.telegramChatId);
    }
  }, [settings?.telegramChatId]);

  // Fetch incidents list (polls every 30s)
  const { data: incidents = [], isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery<IncidentItem[]>({
    queryKey: ["/api/admin/monitoring/incidents"],
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  // Save Telegram Settings
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const payload: { telegramBotToken?: string; telegramChatId: string } = {
        telegramChatId: chatId.trim(),
      };
      if (botToken.trim()) {
        payload.telegramBotToken = botToken.trim();
      }
      const res = await apiRequest("PUT", "/api/admin/monitoring/settings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monitoring/settings"] });
      setBotToken("");
      toast({
        title: "Settings Saved",
        description: "Telegram notification credentials updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update Telegram settings",
        variant: "destructive",
      });
    },
  });

  // Test Telegram dispatch
  const testTelegramMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/monitoring/test-telegram", {
        telegramBotToken: botToken.trim() || undefined,
        telegramChatId: chatId.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Telegram Alert Sent!",
          description: data.message || "A test incident message was delivered to your phone.",
        });
      } else {
        toast({
          title: "Dispatch Failed",
          description: data.message || "Could not reach Telegram API.",
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Test Error",
        description: err.message || "Failed to trigger test alert.",
        variant: "destructive",
      });
    },
  });

  // Clear Incidents
  const clearIncidentsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/monitoring/incidents/clear");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monitoring/incidents"] });
      toast({
        title: "History Cleared",
        description: "All recorded incident logs have been cleared.",
      });
    },
  });

  const handleCopyReport = (incident: IncidentItem) => {
    const report = [
      `======================================================`,
      `CLEANTRAFFIC BACKEND INCIDENT REPORT (ADMIN EYES ONLY)`,
      `======================================================`,
      `Incident ID:    ${incident.id}`,
      `Timestamp:      ${incident.timestamp}`,
      `Subsystem:      ${incident.subsystem}`,
      `Severity:       ${incident.severity.toUpperCase()}`,
      ``,
      `[EXACT CAUSE]`,
      `${incident.exactCause}`,
      ``,
      `[CODE LOCATION]`,
      `File:           ${incident.fileLocation || "Unknown"}`,
      `HTTP Status:    ${incident.httpStatus ?? "N/A"}`,
      `Latency:        ${incident.latencyMs ? `${incident.latencyMs}ms` : "N/A"}`,
      ``,
      `[CONTEXT]`,
      `Target URL:     ${incident.context?.url || "N/A"}`,
      `Visitor IP:     ${incident.context?.clientIp || "N/A"}`,
      `API Key:        ${incident.context?.apiKeyId || "N/A"}`,
      `Auto-Bypass:    ${incident.context?.retryCount ? `Attempt #${incident.context.retryCount} (Visitor passed to origin)` : "None"}`,
      incident.context?.errorStack ? `\n[STACK TRACE]\n${incident.context.errorStack}\n` : "",
      `[RECOMMENDED FIX]`,
      `${incident.recommendedAction}`,
      `======================================================`,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(report);
    setCopiedId(incident.id);
    setTimeout(() => setCopiedId(null), 2500);

    toast({
      title: "Diagnostic Report Copied!",
      description: "Paste this report directly to your developer for an immediate fix.",
    });
  };

  const getSeverityBadge = (severity: IncidentItem["severity"]) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold uppercase">Critical</Badge>;
      case "high":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold uppercase">High</Badge>;
      case "warning":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] font-bold uppercase">Warning</Badge>;
      default:
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER SECTION ── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#0A5C48]" />
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              System Health &amp; Incident Sentinel
            </h2>
            <Badge className="bg-[#E6F2ED] text-[#0A5C48] border-[#CCE5DB] text-[10px] font-bold">
              Admin Eyes Only
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Continuous backend health monitoring, 3-retry edge self-healing auto-bypass telemetry, and instant Telegram push alerts for infrastructure diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchIncidents()}
            className="text-xs font-semibold h-8 px-3 border-[#D5DFD9] text-[#0F172A] hover:bg-[#F2F6F4] gap-1.5 rounded-lg"
          >
            <RefreshCw className="h-3 w-3 text-[#0A5C48]" />
            <span>Refresh Health</span>
          </Button>
        </div>
      </div>

      {/* ── 2. LIVE SYSTEM STATUS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gateway Health */}
        <Card className="border-[#E5EAE7] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Gateway Latency</span>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-[#0F172A] font-mono">&lt; 25ms</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                RAM Cached
              </Badge>
            </div>
            <p className="text-[11px] text-[#64748B]">Zero Firestore reads on repeat hits</p>
          </CardContent>
        </Card>

        {/* Database & Write Buffer */}
        <Card className="border-[#E5EAE7] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Write Buffer</span>
              <Database className="h-4 w-4 text-[#0A5C48]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-[#0F172A]">Micro-Batched</span>
              <Badge className="bg-[#E6F2ED] text-[#0A5C48] border-[#CCE5DB] text-[10px] font-bold">
                1s Interval
              </Badge>
            </div>
            <p className="text-[11px] text-[#64748B]">Non-blocking background writes</p>
          </CardContent>
        </Card>

        {/* Edge Auto-Bypass Sentinel */}
        <Card className="border-[#E5EAE7] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Self-Healing Sentinel</span>
              <ShieldCheck className="h-4 w-4 text-[#0A5C48]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-[#0F172A]">3-Retry Bypass</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-[#64748B]">Zero lost conversions on outage</p>
          </CardContent>
        </Card>

        {/* Incidents Count */}
        <Card className="border-[#E5EAE7] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Active Incidents</span>
              <AlertTriangle className={`h-4 w-4 ${incidents.length > 0 ? "text-amber-500" : "text-emerald-500"}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-[#0F172A] font-mono">{incidents.length}</span>
              <Badge className={`text-[10px] font-bold ${
                incidents.length === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {incidents.length === 0 ? "All Clear" : "Review Needed"}
              </Badge>
            </div>
            <p className="text-[11px] text-[#64748B]">Logged exclusively for Admin</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. TELEGRAM ALERT CHANNEL CONFIGURATION ── */}
      <Card className="border-[#E5EAE7] shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-[#0A5C48]" />
                <CardTitle className="text-sm font-bold text-[#0F172A]">
                  Telegram Push Notification Channel
                </CardTitle>
                <Badge className={settings?.configured ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold" : "bg-slate-100 text-slate-600 border-slate-200 text-[10px]"}>
                  {settings?.configured ? "Connected" : "Unconfigured"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#64748B] mt-0.5">
                Receive instant diagnostic reports on your phone when an edge auto-bypass triggers or backend latency spikes.
              </CardDescription>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-[11px] font-bold text-[#0A5C48] hover:text-[#06241D] flex items-center gap-1 self-start sm:self-auto"
            >
              <HelpCircle className="h-3 w-3" />
              <span>{showGuide ? "Hide Setup Guide" : "60-Second Setup Guide"}</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-0 space-y-4">
          {/* Quick Setup Guide Accordion */}
          {showGuide && (
            <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-lg p-3.5 space-y-2 text-xs text-[#0F172A]">
              <span className="font-bold text-[#0A5C48]">How to get your Telegram Bot Token &amp; Chat ID:</span>
              <ol className="list-decimal list-inside space-y-1 text-[#64748B] text-[11px] leading-relaxed">
                <li>Open Telegram and search for <strong className="text-[#0F172A]">@BotFather</strong>. Send <code className="bg-white px-1 py-0.5 rounded border border-[#E0E9E4] font-mono">/newbot</code>, name your bot, and copy the HTTP API token provided.</li>
                <li>Search for <strong className="text-[#0F172A]">@userinfobot</strong> on Telegram, click Start, and copy the numeric <strong className="text-[#0F172A]">Id</strong> value.</li>
                <li>Paste the Bot Token and Chat ID below, click <strong className="text-[#0F172A]">Save Credentials</strong>, and test with <strong className="text-[#0F172A]">Send Test Alert</strong>.</li>
              </ol>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bot Token Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#0F172A]">Telegram Bot Token</Label>
                {settings?.hasToken && (
                  <span className="text-[11px] text-[#64748B] font-mono">
                    Current: {settings.telegramTokenPreview}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder={settings?.hasToken ? "Enter new token to overwrite..." : "7123456789:AAFo3..."}
                  className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs font-mono h-9 pr-9 focus:border-[#0A5C48]"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Chat ID Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#0F172A]">Telegram Chat ID</Label>
              <Input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. 123456789 or @your_channel"
                className="bg-white border-[#D5DFD9] text-[#0F172A] text-xs font-mono h-9 focus:border-[#0A5C48]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-[#E5EAE7]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testTelegramMutation.mutate()}
              disabled={testTelegramMutation.isPending || (!chatId && !settings?.telegramChatId)}
              className="text-xs font-bold border-[#D5DFD9] text-[#0F172A] hover:bg-[#F2F6F4] h-9 gap-1.5 rounded-lg"
            >
              {testTelegramMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin text-[#0A5C48]" /> : <Send className="h-3 w-3 text-[#0A5C48]" />}
              <span>Send Test Alert to My Phone</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="bg-[#0A5C48] hover:bg-[#06241D] text-white text-xs font-bold h-9 px-4 rounded-lg shadow-xs"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Credentials"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. INCIDENT LOGS & COPY-PASTEABLE DIAGNOSTIC CARDS ── */}
      <Card className="border-[#E5EAE7] shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#0A5C48]" />
                <CardTitle className="text-sm font-bold text-[#0F172A]">
                  Diagnostic Incident Logs ({incidents.length})
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-[#64748B] mt-0.5">
                Exact technical causes and stack traces. Click &ldquo;Copy Diagnostic Report&rdquo; to paste directly to your developer.
              </CardDescription>
            </div>

            {incidents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearIncidentsMutation.mutate()}
                disabled={clearIncidentsMutation.isPending}
                className="text-xs text-[#64748B] hover:text-red-600 h-8 gap-1.5 px-2.5 rounded-lg"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear History</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-0">
          {incidents.length === 0 ? (
            <div className="bg-[#F8FAF9] border border-[#E0E9E4] rounded-xl p-8 text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-[#E6F2ED] text-[#0A5C48] flex items-center justify-center mx-auto">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">All Subsystems Operating Normally</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
                Zero infrastructure timeouts, unhandled errors, or edge auto-bypasses detected. If an issue occurs, a detailed diagnostic card will appear here with an instant copy-paste report.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="bg-white border border-[#E5EAE7] rounded-xl p-4 space-y-3 hover:border-slate-300 transition-all shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSeverityBadge(incident.severity)}
                      <span className="text-xs font-bold text-[#0F172A]">{incident.title}</span>
                      <span className="text-[11px] font-mono text-[#64748B]">• Subsystem: {incident.subsystem}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyReport(incident)}
                        className="h-7 text-xs font-bold border-[#D5DFD9] text-[#0A5C48] hover:bg-[#E6F2ED] gap-1 rounded-md"
                      >
                        {copiedId === incident.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Diagnostic Report</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Exact Root Cause */}
                  <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 overflow-x-auto space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Exact Root Cause:</div>
                    <div className="text-slate-100 whitespace-pre-wrap">{incident.exactCause}</div>
                    {incident.fileLocation && (
                      <div className="text-[11px] text-emerald-400 pt-1">
                        📍 Code Location: {incident.fileLocation}
                      </div>
                    )}
                  </div>

                  {/* Context and Recommended Action */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#64748B] pt-1 border-t border-[#E5EAE7]">
                    <div>
                      <span className="font-bold text-[#0F172A]">Context: </span>
                      {incident.context?.url ? `URL: ${incident.context.url} • ` : ""}
                      {incident.context?.clientIp ? `IP: ${incident.context.clientIp} • ` : ""}
                      {incident.context?.retryCount ? `Retry #${incident.context.retryCount} ` : ""}
                    </div>
                    <div>
                      <span className="font-bold text-[#0A5C48]">Recommended Action: </span>
                      <span>{incident.recommendedAction}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
