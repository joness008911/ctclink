import { storage } from "./storage";
import { cacheService } from "./cacheService";

export interface SystemIncident {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "warning" | "info";
  subsystem: "API Gateway" | "Firestore Database" | "Edge Worker Bypass" | "Cache Service" | "External Lookup";
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
    clickToken?: string | null;
    retryCount?: number | null;
    fallbackMode?: string | null;
    errorStack?: string | null;
  };
  recommendedAction: string;
  resolved: boolean;
  notifiedTelegram: boolean;
}

class MonitoringService {
  private incidents: SystemIncident[] = [];
  private readonly MAX_INCIDENTS = 100;
  private lastAlertTimestampMap = new Map<string, number>();
  private readonly ALERT_DEBOUNCE_MS = 30000; // 30s debounce per incident type to avoid spamming
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startSyntheticHealthChecks();
  }

  private startSyntheticHealthChecks() {
    // Run synthetic self-check every 60 seconds
    this.healthCheckInterval = setInterval(() => {
      void this.performSelfHealthCheck();
    }, 60000);

    if (this.healthCheckInterval.unref) {
      this.healthCheckInterval.unref();
    }
  }

  private async performSelfHealthCheck() {
    const start = Date.now();
    try {
      // 1. Verify in-memory cache responsiveness
      const cacheCheck = cacheService.getDetectionRules();
      const cacheLatency = Date.now() - start;

      if (cacheLatency > 100) {
        this.recordIncident({
          severity: "warning",
          subsystem: "Cache Service",
          title: "In-Memory Cache Latency Spike",
          exactCause: `Local RAM cache response took ${cacheLatency}ms (expected <5ms). Possible Event Loop lag or high CPU usage.`,
          fileLocation: "server/cacheService.ts",
          latencyMs: cacheLatency,
          recommendedAction: "Check server event loop lag and process CPU utilization.",
        });
      }
    } catch (err: any) {
      this.recordIncident({
        severity: "high",
        subsystem: "API Gateway",
        title: "Internal Health Sentinel Exception",
        exactCause: err?.message || String(err),
        fileLocation: "server/monitoringService.ts",
        recommendedAction: "Inspect server process logs for unhandled exceptions.",
      });
    }
  }

  /**
   * Record a new system incident, store in memory, and notify Telegram if configured
   */
  async recordIncident(params: {
    severity: "critical" | "high" | "warning" | "info";
    subsystem: SystemIncident["subsystem"];
    title: string;
    exactCause: string;
    fileLocation?: string;
    httpStatus?: number | null;
    latencyMs?: number | null;
    context?: SystemIncident["context"];
    recommendedAction: string;
  }): Promise<SystemIncident> {
    const id = `INC-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const timestamp = new Date().toISOString();

    const incident: SystemIncident = {
      id,
      timestamp,
      severity: params.severity,
      subsystem: params.subsystem,
      title: params.title,
      exactCause: params.exactCause,
      fileLocation: params.fileLocation,
      httpStatus: params.httpStatus ?? null,
      latencyMs: params.latencyMs ?? null,
      context: params.context || {},
      recommendedAction: params.recommendedAction,
      resolved: false,
      notifiedTelegram: false,
    };

    // Prepend to incidents list (newest first)
    this.incidents.unshift(incident);
    if (this.incidents.length > this.MAX_INCIDENTS) {
      this.incidents = this.incidents.slice(0, this.MAX_INCIDENTS);
    }

    console.warn(`🚨 [MONITORING INCIDENT] [${incident.severity.toUpperCase()}] ${incident.subsystem}: ${incident.title}`);

    // Check debounce and dispatch to Telegram
    const debounceKey = `${incident.subsystem}:${incident.title}`;
    const lastAlert = this.lastAlertTimestampMap.get(debounceKey) || 0;
    const now = Date.now();

    if (now - lastAlert > this.ALERT_DEBOUNCE_MS) {
      this.lastAlertTimestampMap.set(debounceKey, now);
      const sent = await this.dispatchTelegramAlert(incident);
      if (sent) {
        incident.notifiedTelegram = true;
      }
    }

    return incident;
  }

  /**
   * Format and send an incident alert to Telegram
   */
  async dispatchTelegramAlert(incident: SystemIncident): Promise<boolean> {
    try {
      const token = await storage.getSetting("telegram_bot_token");
      const chatId = await storage.getSetting("telegram_chat_id");

      if (!token || !chatId) {
        // Telegram not configured yet; incident remains in dashboard
        return false;
      }

      const cleanToken = token.trim();
      const cleanChatId = chatId.trim();

      const severityEmoji = incident.severity === "critical" ? "🔴 CRITICAL" : incident.severity === "high" ? "🟠 HIGH" : incident.severity === "warning" ? "🟡 WARNING" : "🔵 INFO";

      const messageLines = [
        `🚨 *[CLEANTRAFFIC BACKEND INCIDENT]*`,
        `*Severity:* ${severityEmoji} | *Subsystem:* \`${incident.subsystem}\``,
        `*Incident ID:* \`${incident.id}\``,
        `*Time:* \`${incident.timestamp}\``,
        ``,
        `📌 *Title:* ${incident.title}`,
        `🔍 *Exact Root Cause:*`,
        `\`\`\`\n${incident.exactCause.slice(0, 500)}\n\`\`\``,
      ];

      if (incident.fileLocation) {
        messageLines.push(`📁 *Code Location:* \`${incident.fileLocation}\``);
      }

      if (incident.latencyMs) {
        messageLines.push(`⏱️ *Measured Latency:* \`${incident.latencyMs}ms\``);
      }

      if (incident.context?.url) {
        messageLines.push(`🌐 *Target URL:* \`${incident.context.url}\``);
      }

      if (incident.context?.clientIp) {
        messageLines.push(`👤 *Visitor IP:* \`${incident.context.clientIp}\``);
      }

      if (incident.context?.retryCount) {
        messageLines.push(`🔄 *Auto-Bypass:* \`Triggered on Attempt #${incident.context.retryCount} (Visitor passed to origin)\``);
      }

      messageLines.push(
        ``,
        `🛠️ *Recommended Action:*`,
        `_${incident.recommendedAction}_`,
        ``,
        `📋 *Copy & Paste this alert directly to your developer to fix immediately.*`
      );

      const payload = {
        chat_id: cleanChatId,
        text: messageLines.join("\n"),
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      };

      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as any;
      if (!res.ok || !data.ok) {
        console.error("Failed to send Telegram alert:", data);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error dispatching Telegram alert:", err);
      return false;
    }
  }

  /**
   * Send an immediate test message to verify Telegram credentials
   */
  async sendTelegramTest(token?: string, chatId?: string): Promise<{ success: boolean; message: string }> {
    try {
      const activeToken = token?.trim() || (await storage.getSetting("telegram_bot_token"))?.trim();
      const activeChatId = chatId?.trim() || (await storage.getSetting("telegram_chat_id"))?.trim();

      if (!activeToken) {
        return { success: false, message: "Telegram Bot Token is missing. Please enter your Bot Token from @BotFather." };
      }
      if (!activeChatId) {
        return { success: false, message: "Telegram Chat ID is missing. Please enter your Chat ID from @userinfobot." };
      }

      const testMessage = [
        `✅ *[CLEANTRAFFIC MONITORING CONNECTED]*`,
        `Your Telegram alert channel is successfully configured!`,
        ``,
        `⏱️ *Verified At:* \`${new Date().toISOString()}\``,
        `🛡️ *Status:* Edge Sentinel & Backend Health Monitor Active.`,
        ``,
        `If any backend timeouts, database errors, or edge auto-bypasses occur, you will receive an exact diagnostic report here immediately before users notice.`,
      ].join("\n");

      const res = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: activeChatId,
          text: testMessage,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });

      const data = await res.json() as any;
      if (!res.ok || !data.ok) {
        const errorDesc = data?.description || "Invalid Bot Token or Chat ID";
        return { success: false, message: `Telegram API Error: ${errorDesc}` };
      }

      return { success: true, message: "Test alert delivered successfully to your Telegram!" };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message || String(err)}` };
    }
  }

  /**
   * Generate clean copy-pasteable Markdown report for an incident
   */
  formatDiagnosticReport(incident: SystemIncident): string {
    return [
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
  }

  getIncidents(): SystemIncident[] {
    return this.incidents;
  }

  clearIncidents(): void {
    this.incidents = [];
  }
}

export const monitoringService = new MonitoringService();
