import { storage } from "./storage";
import { monitoringService } from "./monitoringService";

export type Ip2LocationErrorType = 
  | 'quota_exhausted' 
  | 'invalid_key' 
  | 'service_down' 
  | 'timeout' 
  | 'network' 
  | 'none';

export type Ip2LocationStatus = 
  | 'healthy' 
  | 'exhausted' 
  | 'invalid_key' 
  | 'degraded' 
  | 'unconfigured';

export interface Ip2LocationHealthState {
  status: Ip2LocationStatus;
  provider: 'ip2location.io' | 'ip2geolocation.io' | 'none';
  lastChecked: string;
  lastSuccess: string | null;
  lastError: {
    code: string | number;
    message: string;
    timestamp: string;
    errorType: Ip2LocationErrorType;
  } | null;
  consecutiveFailures: number;
  latencyMs: number | null;
  totalLookups: number;
  successfulLookups: number;
  failedLookups: number;
  keyPreview: string | null;
  hasKey: boolean;
  alertMessage: string | null;
}

class Ip2LocationHealthMonitor {
  private state: Ip2LocationHealthState = {
    status: 'unconfigured',
    provider: 'ip2location.io',
    lastChecked: new Date().toISOString(),
    lastSuccess: null,
    lastError: null,
    consecutiveFailures: 0,
    latencyMs: null,
    totalLookups: 0,
    successfulLookups: 0,
    failedLookups: 0,
    keyPreview: null,
    hasKey: false,
    alertMessage: null,
  };

  private getEffectiveKeyFn: (() => Promise<string>) | null = null;
  private checkIntervalTimer: NodeJS.Timeout | null = null;
  private isChecking = false;

  // Circuit breaker state: prevents callers from hanging when upstream is known to be dead or out of quota
  private circuitBreakerUntil = 0;
  private readonly CIRCUIT_BREAKER_DURATION_MS = 60000; // 60s cooldown

  constructor() {
    // Attempt to load persisted health snapshot on startup
    this.loadPersistedState().catch((err) => {
      console.warn("[IP2Location Health] Could not load persisted status:", err);
    });
  }

  private async loadPersistedState() {
    try {
      const persisted = await storage.getSetting('ip2location_health_status');
      if (persisted) {
        const parsed = JSON.parse(persisted);
        this.state = {
          ...this.state,
          ...parsed,
          // Retain live in-memory counters
          totalLookups: this.state.totalLookups,
          successfulLookups: this.state.successfulLookups,
          failedLookups: this.state.failedLookups,
        };
      }
    } catch (e) {
      // Non-fatal
    }
  }

  private async persistState() {
    try {
      const snapshot = JSON.stringify({
        status: this.state.status,
        provider: this.state.provider,
        lastChecked: this.state.lastChecked,
        lastSuccess: this.state.lastSuccess,
        lastError: this.state.lastError,
        consecutiveFailures: this.state.consecutiveFailures,
        latencyMs: this.state.latencyMs,
        alertMessage: this.state.alertMessage,
      });
      await storage.setSetting('ip2location_health_status', snapshot);
    } catch (e) {
      // Non-fatal
    }
  }

  public init(getKeyFn: () => Promise<string>) {
    this.getEffectiveKeyFn = getKeyFn;

    // Run first check after 3 seconds so the server finishes boot
    setTimeout(() => {
      this.runPeriodicHealthCheck().catch((err) => {
        console.warn("[IP2Location Health] Initial probe notice:", err);
      });
    }, 3000);

    // Periodic check every 10 minutes
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
    }
    this.checkIntervalTimer = setInterval(() => {
      this.runPeriodicHealthCheck().catch((err) => {
        console.warn("[IP2Location Health] Periodic probe notice:", err);
      });
    }, 10 * 60 * 1000);
  }

  public getState(): Ip2LocationHealthState {
    return { ...this.state };
  }

  // --- CIRCUIT BREAKER HELPERS ---
  public isCircuitOpen(): boolean {
    if (this.state.status === 'exhausted' || this.state.status === 'invalid_key') {
      return true;
    }
    return Date.now() < this.circuitBreakerUntil;
  }

  public tripCircuitBreaker(durationMs: number = this.CIRCUIT_BREAKER_DURATION_MS): void {
    this.circuitBreakerUntil = Date.now() + durationMs;
  }

  public resetCircuitBreaker(): void {
    this.circuitBreakerUntil = 0;
  }

  public recordSuccess(latencyMs: number, provider: 'ip2location.io' | 'ip2geolocation.io' = 'ip2location.io') {
    this.state.totalLookups++;
    this.state.successfulLookups++;
    this.state.consecutiveFailures = 0;
    this.state.latencyMs = latencyMs;
    this.state.lastSuccess = new Date().toISOString();
    this.state.provider = provider;
    this.resetCircuitBreaker();
    
    // If previously in error/degraded due to transient failures, restore healthy
    if (this.state.status === 'degraded' || this.state.status === 'exhausted' || this.state.status === 'invalid_key') {
      this.state.status = 'healthy';
      this.state.alertMessage = null;
      this.persistState();
    }
  }

  public recordError(
    errorType: Ip2LocationErrorType, 
    code: string | number, 
    message: string,
    provider: 'ip2location.io' | 'ip2geolocation.io' = 'ip2location.io'
  ) {
    this.state.totalLookups++;
    this.state.failedLookups++;
    this.state.consecutiveFailures++;
    this.state.provider = provider;
    this.state.lastError = {
      code,
      message,
      timestamp: new Date().toISOString(),
      errorType,
    };

    if (errorType === 'quota_exhausted') {
      this.state.status = 'exhausted';
      this.state.alertMessage = `IP2Location API quota limit reached: ${message || 'INSUFFICIENT_CREDIT'}. Upstream calls paused for 60s via circuit breaker.`;
      console.error(`🚨 [IP2Location Health Alert] QUOTA EXHAUSTED: ${message} (Code: ${code})`);
      this.tripCircuitBreaker(60000);
      this.persistState();

      // Dispatch critical instant alert to Telegram
      void monitoringService.recordIncident({
        severity: 'critical',
        subsystem: 'External Lookup',
        title: 'IP2Location Quota Exhausted',
        exactCause: `IP2Location API credit balance depleted: ${message || 'INSUFFICIENT_CREDIT'} (Code: ${code}). Upstream requests temporarily paused to protect visitor latency.`,
        fileLocation: 'server/ip2locationHealth.ts',
        recommendedAction: 'Replenish IP2Location credits or upgrade plan at ip2location.io to restore external IP intelligence.',
      });
    } else if (errorType === 'invalid_key') {
      this.state.status = 'invalid_key';
      this.state.alertMessage = `IP2Location API key is invalid or expired: ${message || 'INVALID_API_KEY'}. Please update your key.`;
      console.error(`🚨 [IP2Location Health Alert] INVALID KEY: ${message} (Code: ${code})`);
      this.tripCircuitBreaker(60000);
      this.persistState();

      // Dispatch high severity instant alert to Telegram
      void monitoringService.recordIncident({
        severity: 'high',
        subsystem: 'External Lookup',
        title: 'Invalid IP2Location API Key',
        exactCause: `IP2Location rejected key: ${message || 'INVALID_API_KEY'} (Code: ${code}).`,
        fileLocation: 'server/ip2locationHealth.ts',
        recommendedAction: 'Verify and update your IP2Location API key in Admin Settings.',
      });
    } else if (this.state.consecutiveFailures >= 3) {
      this.state.status = 'degraded';
      this.state.alertMessage = `IP2Location upstream connection degraded: ${message}. Failovers active.`;
      console.warn(`⚠️ [IP2Location Health Alert] Service Degraded: ${message} (Consecutive failures: ${this.state.consecutiveFailures})`);
      this.tripCircuitBreaker(30000); // 30s circuit breaker for repeated network failures
      this.persistState();

      // Dispatch warning alert to Telegram
      void monitoringService.recordIncident({
        severity: 'warning',
        subsystem: 'External Lookup',
        title: 'IP2Location Service Degraded',
        exactCause: `3 consecutive lookups failed: ${message} (Code: ${code}). Upstream requests paused for 30s.`,
        fileLocation: 'server/ip2locationHealth.ts',
        recommendedAction: 'Check network connectivity or status.ip2location.com.',
      });
    }
  }

  public async testKey(apiKey: string): Promise<{
    success: boolean;
    health: Ip2LocationHealthState;
    details?: any;
    message: string;
  }> {
    if (!apiKey || apiKey.trim().length === 0) {
      this.state.status = 'unconfigured';
      this.state.hasKey = false;
      this.state.keyPreview = null;
      this.state.alertMessage = 'No IP2Location API key configured.';
      await this.persistState();
      return {
        success: false,
        health: this.getState(),
        message: 'No API key provided',
      };
    }

    const trimmedKey = apiKey.trim();
    this.state.hasKey = true;
    this.state.keyPreview = trimmedKey.length > 8 
      ? `${trimmedKey.substring(0, 4)}*****${trimmedKey.substring(trimmedKey.length - 4)}` 
      : '****';
    this.state.lastChecked = new Date().toISOString();

    const startTime = Date.now();

    // 1. Test IP2Location.io (Sole Authoritative Provider)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const testUrl = `https://api.ip2location.io/?key=${encodeURIComponent(trimmedKey)}&ip=8.8.8.8`;
      
      const res = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'User-Agent': 'CleanTraffic-HealthCheck/1.0', 'Connection': 'keep-alive' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      this.state.latencyMs = latency;

      let body: any = null;
      try {
        body = await res.json();
      } catch (parseErr) {
        body = null;
      }

      if (res.ok && body && !body.error && (body.country_name || body.country_code)) {
        this.state.status = 'healthy';
        this.state.provider = 'ip2location.io';
        this.state.alertMessage = null;
        this.state.lastSuccess = new Date().toISOString();
        this.state.consecutiveFailures = 0;
        this.resetCircuitBreaker();
        await this.persistState();

        return {
          success: true,
          health: this.getState(),
          details: {
            provider: 'ip2location.io',
            country: body.country_name,
            city: body.city_name,
            isp: body.as || body.isp,
            latencyMs: latency,
          },
          message: `IP2Location API verified successfully (${latency}ms latency).`,
        };
      }

      // Check specific error codes from IP2Location.io
      if (body?.error) {
        const errCode = body.error.error_code;
        const errMsg = body.error.error_message || 'API error';

        if (errCode === 10001 || errMsg.toUpperCase().includes('INSUFFICIENT') || errMsg.toUpperCase().includes('CREDIT') || errMsg.toUpperCase().includes('QUOTA')) {
          this.recordError('quota_exhausted', errCode, errMsg, 'ip2location.io');
          return {
            success: false,
            health: this.getState(),
            message: `Quota Exhausted: ${errMsg} (Code ${errCode}). Please replenish credits or renew plan.`,
          };
        } else if (errCode === 10000 || errMsg.toUpperCase().includes('INVALID_API_KEY')) {
          this.recordError('invalid_key', errCode, errMsg, 'ip2location.io');
          return {
            success: false,
            health: this.getState(),
            message: `Invalid API Key: ${errMsg} (Code ${errCode}). Check your key in the IP2Location dashboard.`,
          };
        } else {
          this.recordError('service_down', errCode, errMsg, 'ip2location.io');
          return {
            success: false,
            health: this.getState(),
            message: `IP2Location error: ${errMsg} (Code ${errCode}).`,
          };
        }
      }

      if (res.status === 429) {
        this.recordError('service_down', 429, 'Rate limit exceeded', 'ip2location.io');
        return {
          success: false,
          health: this.getState(),
          message: 'IP2Location rate limit exceeded (HTTP 429).',
        };
      }

      if (res.status >= 500) {
        this.recordError('service_down', res.status, `Server error HTTP ${res.status}`, 'ip2location.io');
        return {
          success: false,
          health: this.getState(),
          message: `IP2Location upstream server error (HTTP ${res.status}).`,
        };
      }
    } catch (e: any) {
      const isTimeout = e.name === 'AbortError';
      const msg = isTimeout ? 'Request timed out after 5000ms' : (e.message || 'Network error');
      this.recordError(isTimeout ? 'timeout' : 'network', isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR', msg, 'ip2location.io');
      return {
        success: false,
        health: this.getState(),
        message: `Connection error: ${msg}.`,
      };
    }

    await this.persistState();
    return {
      success: false,
      health: this.getState(),
      message: this.state.alertMessage || 'Failed to verify API key with IP2Location.',
    };
  }

  public async runPeriodicHealthCheck(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      if (!this.getEffectiveKeyFn) return;
      const apiKey = await this.getEffectiveKeyFn();
      if (!apiKey || !apiKey.trim()) {
        this.state.status = 'unconfigured';
        this.state.hasKey = false;
        this.state.keyPreview = null;
        this.state.alertMessage = 'No API key configured for geolocation services.';
        await this.persistState();
        return;
      }

      await this.testKey(apiKey);
    } catch (err) {
      console.warn("[IP2Location Health Monitor] Periodic check notice:", err);
    } finally {
      this.isChecking = false;
    }
  }
}

export const ip2LocationHealth = new Ip2LocationHealthMonitor();
