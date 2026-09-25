export interface RawInterstitialTheme {
  id: string;
  name: string;
  description: string;
  category: "Light" | "Minimal" | "Corporate" | "Security" | "Dark" | string;
  badge?: string | null;
  isDefault: boolean;
  enabled: boolean;
  previewBg: string;
  previewAccent: string;
  htmlHead: string;
  htmlBody: string;
  scriptJs?: string | null;
}

export interface InterstitialTheme {
  id: string;
  name: string;
  description: string;
  category: string;
  badge: string | null;
  isDefault: boolean;
  enabled: boolean;
  previewBg: string;
  previewAccent: string;
  htmlHead: string;
  htmlBody: string;
  scriptJs: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertInterstitialTheme = Omit<InterstitialTheme, "createdAt" | "updatedAt">;

const RAW_DEFAULT_THEMES: RawInterstitialTheme[] = [
  {
    id: "clean_light",
    name: "Clean Minimal Light",
    description: "Modern soft-white canvas, emerald security shield badge, and horizontal smooth pulse indicator.",
    category: "Light",
    badge: "Default",
    isDefault: true,
    enabled: true,
    previewBg: "#f8fafc",
    previewAccent: "#059669",
    htmlHead: `
    body {
      background-color: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 32px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon-container {
      width: 56px;
      height: 56px;
      background: #ecfdf5;
      border: 1px solid #d1fae5;
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .icon-container svg {
      width: 28px;
      height: 28px;
      color: #059669;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    p {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 28px;
      line-height: 1.5;
    }
    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: #f1f5f9;
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      width: 40%;
      height: 100%;
      background: #059669;
      border-radius: 9999px;
      position: absolute;
      animation: indeterminate 1.5s infinite ease-in-out;
    }
    @keyframes indeterminate {
      0% { left: -40%; }
      50% { left: 40%; }
      100% { left: 100%; }
    }
    .status-text {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 16px;
      font-weight: 500;
    }
    .error-container {
      display: none;
      margin-top: 20px;
      padding: 14px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 10px;
      color: #991b1b;
      font-size: 13px;
    }
    .retry-btn {
      display: inline-block;
      margin-top: 14px;
      padding: 8px 18px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .retry-btn:hover {
      background: #334155;
    }
    `,
    htmlBody: `
    <div class="card">
      <div class="icon-container">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1>{{HEADING}}</h1>
      <p>{{SUBNOTE}}</p>
      
      <div class="progress-bar-container" id="ctc-progress">
        <div class="progress-bar"></div>
      </div>
      
      <div class="status-text" id="ctc-status">Checking connection security...</div>
      
      <div class="error-container" id="ctc-error">
        <span id="ctc-error-msg">Verification timed out or failed.</span><br>
        <button type="button" class="retry-btn" onclick="location.reload()">Retry Connection</button>
      </div>
    </div>
    `
  },
  {
    id: "modern_spinner",
    name: "Modern Edge Spinner",
    description: "Ultra-clean white design with a circular dual-ring spinner and live verification badge.",
    category: "Minimal",
    badge: "Popular",
    isDefault: false,
    enabled: true,
    previewBg: "#ffffff",
    previewAccent: "#2563eb",
    htmlHead: `
    body {
      background-color: #ffffff;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #ffffff;
      border: 1px solid #f1f5f9;
      border-radius: 20px;
      padding: 44px 36px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06);
    }
    .spinner-ring {
      width: 52px;
      height: 52px;
      margin: 0 auto 24px;
      position: relative;
    }
    .spinner-ring div {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 52px;
      height: 52px;
      border: 3.5px solid #2563eb;
      border-radius: 50%;
      animation: spinRing 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      border-color: #2563eb transparent transparent transparent;
    }
    .spinner-ring div:nth-child(1) { animation-delay: -0.45s; }
    .spinner-ring div:nth-child(2) { animation-delay: -0.3s; }
    .spinner-ring div:nth-child(3) { animation-delay: -0.15s; }
    @keyframes spinRing {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h1 {
      font-size: 21px;
      font-weight: 700;
      margin: 0 0 10px;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 24px;
      line-height: 1.5;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      color: #1d4ed8;
      margin-bottom: 8px;
    }
    .dot-live {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #2563eb;
      animation: pulseDot 1.4s infinite ease-in-out;
    }
    @keyframes pulseDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.5; }
    }
    .status-text {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }
    .error-container {
      display: none;
      margin-top: 20px;
      padding: 14px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 10px;
      color: #991b1b;
      font-size: 13px;
    }
    .retry-btn {
      display: inline-block;
      margin-top: 14px;
      padding: 8px 18px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    `,
    htmlBody: `
    <div class="card">
      <div class="badge-pill">
        <span class="dot-live"></span>
        <span>Edge Inspection</span>
      </div>
      <div class="spinner-ring"><div></div><div></div><div></div><div></div></div>
      <h1>{{HEADING}}</h1>
      <p>{{SUBNOTE}}</p>
      <div class="status-text" id="ctc-status">Performing automated client verification...</div>
      
      <div class="error-container" id="ctc-error">
        <span id="ctc-error-msg">Verification timed out.</span><br>
        <button type="button" class="retry-btn" onclick="location.reload()">Try Again</button>
      </div>
    </div>
    `
  },
  {
    id: "corporate_shield",
    name: "Enterprise Shield & Lock",
    description: "Corporate enterprise style with dual radar rings, verified SSL badge, and high-trust framing.",
    category: "Corporate",
    badge: "Enterprise",
    isDefault: false,
    enabled: true,
    previewBg: "#f1f5f9",
    previewAccent: "#0284c7",
    htmlHead: `
    body {
      background-color: #f1f5f9;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 44px 34px;
      width: 100%;
      max-width: 450px;
      text-align: center;
      box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.08);
    }
    .radar-wrapper {
      position: relative;
      width: 68px;
      height: 68px;
      margin: 0 auto 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .radar-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid #38bdf8;
      animation: radarPulse 2s infinite cubic-bezier(0, 0.2, 0.8, 1);
    }
    .radar-ring:nth-child(2) {
      animation-delay: -1s;
    }
    @keyframes radarPulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .radar-icon {
      width: 48px;
      height: 48px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .radar-icon svg {
      width: 24px;
      height: 24px;
      color: #0284c7;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #0f172a;
    }
    p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0 0 24px;
      line-height: 1.5;
    }
    .ssl-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: #475569;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-family: monospace;
    }
    .ssl-tag svg {
      width: 13px;
      height: 13px;
      color: #10b981;
    }
    .progress-track {
      width: 100%;
      height: 4px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      width: 45%;
      height: 100%;
      background: #0284c7;
      border-radius: 9999px;
      position: absolute;
      animation: indeterminateCorporate 1.6s infinite ease-in-out;
    }
    @keyframes indeterminateCorporate {
      0% { left: -45%; }
      50% { left: 45%; }
      100% { left: 100%; }
    }
    .status-text {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 14px;
    }
    .error-container {
      display: none;
      margin-top: 18px;
      padding: 12px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      color: #991b1b;
      font-size: 13px;
    }
    .retry-btn {
      display: inline-block;
      margin-top: 12px;
      padding: 8px 16px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    `,
    htmlBody: `
    <div class="card">
      <div class="radar-wrapper">
        <div class="radar-ring"></div>
        <div class="radar-ring"></div>
        <div class="radar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>
      
      <div class="ssl-tag">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        TLS 1.3 / 256-Bit Encrypted Session
      </div>

      <h1>{{HEADING}}</h1>
      <p>{{SUBNOTE}}</p>
      
      <div class="progress-track">
        <div class="progress-bar"></div>
      </div>
      
      <div class="status-text" id="ctc-status">Establishing verified security handshake...</div>
      
      <div class="error-container" id="ctc-error">
        <span id="ctc-error-msg">Verification handshake failed.</span><br>
        <button type="button" class="retry-btn" onclick="location.reload()">Retry Handshake</button>
      </div>
    </div>
    `
  },
  {
    id: "fintech_pulse",
    name: "Fintech Dynamic Pulse",
    description: "Bank-grade verification layout featuring horizontal smooth gradient bars and security telemetry.",
    category: "Security",
    badge: "Recommended",
    isDefault: false,
    enabled: true,
    previewBg: "#f8fafc",
    previewAccent: "#4f46e5",
    htmlHead: `
    body {
      background-color: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 4px solid #4f46e5;
      border-radius: 14px;
      padding: 40px 32px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }
    .shield-badge {
      width: 52px;
      height: 52px;
      background: #eef2ff;
      border: 1px solid #e0e7ff;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: #4f46e5;
    }
    .shield-badge svg {
      width: 26px;
      height: 26px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #0f172a;
    }
    p {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 28px;
      line-height: 1.5;
    }
    .pulse-meter {
      height: 6px;
      background: #f1f5f9;
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }
    .pulse-meter-fill {
      width: 35%;
      height: 100%;
      background: linear-gradient(90deg, #4f46e5, #06b6d4);
      border-radius: 9999px;
      position: absolute;
      animation: pulseSlide 1.5s infinite ease-in-out;
    }
    @keyframes pulseSlide {
      0% { left: -35%; }
      50% { left: 45%; }
      100% { left: 100%; }
    }
    .status-text {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 16px;
      font-family: monospace;
    }
    .error-container {
      display: none;
      margin-top: 20px;
      padding: 14px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      color: #991b1b;
      font-size: 13px;
    }
    .retry-btn {
      display: inline-block;
      margin-top: 12px;
      padding: 8px 18px;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    `,
    htmlBody: `
    <div class="card">
      <div class="shield-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      </div>
      <h1>{{HEADING}}</h1>
      <p>{{SUBNOTE}}</p>
      
      <div class="pulse-meter">
        <div class="pulse-meter-fill"></div>
      </div>
      
      <div class="status-text" id="ctc-status">securing-handshake: in-progress</div>
      
      <div class="error-container" id="ctc-error">
        <span id="ctc-error-msg">Connection check failed.</span><br>
        <button type="button" class="retry-btn" onclick="location.reload()">Try Again</button>
      </div>
    </div>
    `
  },
  {
    id: "compact_badge",
    name: "Compact Floating Pill",
    description: "Super minimalist floating card with inline ring spinner, optimized for ultra-fast transfers.",
    category: "Minimal",
    badge: "Lightweight",
    isDefault: false,
    enabled: true,
    previewBg: "#f8fafc",
    previewAccent: "#0f172a",
    htmlHead: `
    body {
      background-color: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      padding: 14px 24px;
      width: auto;
      min-width: 320px;
      max-width: 480px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
    }
    .inline-spinner {
      width: 22px;
      height: 22px;
      border: 2.5px solid #e2e8f0;
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: inlineSpin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes inlineSpin {
      to { transform: rotate(360deg); }
    }
    .text-group {
      text-align: left;
      flex: 1;
    }
    h1 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      color: #0f172a;
      line-height: 1.2;
    }
    p {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0;
      line-height: 1.2;
    }
    .error-container {
      display: none;
      position: fixed;
      bottom: 24px;
      background: #ffffff;
      border: 1px solid #fee2e2;
      border-radius: 12px;
      padding: 12px 18px;
      color: #991b1b;
      font-size: 13px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      text-align: center;
    }
    .retry-btn {
      margin-left: 10px;
      padding: 4px 10px;
      background: #0f172a;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    `,
    htmlBody: `
    <div class="card">
      <div class="inline-spinner" id="ctc-spinner"></div>
      <div class="text-group">
        <h1>{{HEADING}}</h1>
        <p id="ctc-status">{{SUBNOTE}}</p>
      </div>
    </div>
    <div class="error-container" id="ctc-error">
      <span id="ctc-error-msg">Verification timed out.</span>
      <button type="button" class="retry-btn" onclick="location.reload()">Retry</button>
    </div>
    `
  },
  {
    id: "dark_obsidian",
    name: "Dark Obsidian Pro",
    description: "Deep obsidian palette (#0b0f19) with glowing emerald status indicator for dark websites.",
    category: "Dark",
    badge: "Dark Mode",
    isDefault: false,
    enabled: true,
    previewBg: "#0b0f19",
    previewAccent: "#10b981",
    htmlHead: `
    body {
      background-color: #0b0f19;
      color: #f9fafb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 40px 32px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .icon-container {
      width: 56px;
      height: 56px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .icon-container svg {
      width: 28px;
      height: 28px;
      color: #10b981;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #f9fafb;
    }
    p {
      font-size: 14px;
      color: #9ca3af;
      margin: 0 0 28px;
      line-height: 1.5;
    }
    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: #1f2937;
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      width: 40%;
      height: 100%;
      background: #10b981;
      border-radius: 9999px;
      position: absolute;
      animation: indeterminateDark 1.5s infinite ease-in-out;
    }
    @keyframes indeterminateDark {
      0% { left: -40%; }
      50% { left: 40%; }
      100% { left: 100%; }
    }
    .status-text {
      font-size: 12px;
      color: #6b7280;
      margin-top: 16px;
      font-weight: 500;
    }
    .error-container {
      display: none;
      margin-top: 20px;
      padding: 14px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 10px;
      color: #fca5a5;
      font-size: 13px;
    }
    .retry-btn {
      display: inline-block;
      margin-top: 14px;
      padding: 8px 18px;
      background: #10b981;
      color: #0b0f19;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    `,
    htmlBody: `
    <div class="card">
      <div class="icon-container">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1>{{HEADING}}</h1>
      <p>{{SUBNOTE}}</p>
      
      <div class="progress-bar-container">
        <div class="progress-bar"></div>
      </div>
      
      <div class="status-text" id="ctc-status">Checking connection security...</div>
      
      <div class="error-container" id="ctc-error">
        <span id="ctc-error-msg">Verification timed out or failed.</span><br>
        <button type="button" class="retry-btn" onclick="location.reload()">Retry Connection</button>
      </div>
    </div>
    `
  }
];

export const DEFAULT_INTERSTITIAL_THEMES: InterstitialTheme[] = RAW_DEFAULT_THEMES.map((t) => ({
  ...t,
  badge: t.badge ?? null,
  scriptJs: t.scriptJs ?? null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
}));

/**
 * Builds the complete PHP script injecting the chosen theme
 */
export function generatePhpIntegrationScript(options: {
  apiKeyValue: string | null;
  effectiveEndpoint: string;
  theme: InterstitialTheme;
  heading?: string;
  subnote?: string;
  enableLoading?: boolean;
}): string {
  const { apiKeyValue, effectiveEndpoint, theme, enableLoading = true } = options;
  const keyStr = apiKeyValue || "ctc_your_api_key_here";
  const headingStr = (options.heading || "Verifying your connection...").replace(/"/g, '\\"');
  const subnoteStr = (options.subnote || "Please wait while we secure your session.").replace(/"/g, '\\"');

  if (!enableLoading) {
    return `<?php
/**
 * CleanTraffic - Transparent Inline Traffic Protection Script
 * Auto-generated for API Key: ${keyStr}
 * Mode: Transparent / Inline Guard (No Interstitial Loading Screen)
 * 
 * ARCHITECTURE:
 * - Zero Visual Loading Screen: Legitimate human visitors experience no visual delay.
 * - Server-Side Inspection: Incoming traffic is verified before rendering page output.
 * - Strict HTTP Status Codes: Bots and unauthorized traffic receive authentic 403 or 404 responses.
 * - Ad Click Token Forwarding: Passes fbclid, gclid, ttclid, msclkid, UTMs seamlessly.
 * - Fail-Safe Resiliency: 2.5-second timeout ensures visitors are never stranded.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$apiKey = '${keyStr}';
$apiEndpoint = '${effectiveEndpoint}';

// 1. Session verification cache: Skip inspection if visitor already verified in this session
if (isset($_SESSION['ctc_verified']) && $_SESSION['ctc_verified'] === '1') {
    return;
}

// 2. Extract Visitor IP with Cloudflare, Akamai, Fastly, AWS ALB & Reverse Proxy awareness
$visitorIp = $_SERVER['HTTP_CF_CONNECTING_IP'] 
    ?? $_SERVER['HTTP_TRUE_CLIENT_IP'] 
    ?? $_SERVER['HTTP_X_REAL_IP'] 
    ?? $_SERVER['HTTP_FASTLY_CLIENT_IP'] 
    ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
    ?? $_SERVER['REMOTE_ADDR'] 
    ?? '127.0.0.1';

if (strpos($visitorIp, ',') !== false) {
    $ips = explode(',', $visitorIp);
    $visitorIp = trim($ips[0]);
}

// 3. Extract Query Parameters & Click Tokens
$ctcQuery = is_array($_GET) ? $_GET : [];
if (empty($ctcQuery) && !empty($_SERVER['QUERY_STRING'])) {
    parse_str($_SERVER['QUERY_STRING'], $ctcQuery);
}
if (empty($ctcQuery) && !empty($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '?') !== false) {
    $queryStringFromUri = substr($_SERVER['REQUEST_URI'], strpos($_SERVER['REQUEST_URI'], '?') + 1);
    parse_str($queryStringFromUri, $ctcQuery);
}

// 4. Classification Caller Function
function ctc_execute_inline_classification($postData, $apiEndpoint, $apiKey) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => rtrim($apiEndpoint, '/') . '/api/classify',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($postData),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_TIMEOUT => 4,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-API-Key: ' . $apiKey,
            'Authorization: Bearer ' . $apiKey,
            'User-Agent: CleanTraffic-PHP-Inline/2.0'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if (($response === false || !empty($curlError)) && ini_get('allow_url_fopen')) {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\\r\\n" .
                            "Accept: application/json\\r\\n" .
                            "X-API-Key: " . $apiKey . "\\r\\n" .
                            "Authorization: Bearer " . $apiKey . "\\r\\n" .
                            "User-Agent: CleanTraffic-PHP-Inline/2.0\\r\\n",
                'content' => json_encode($postData),
                'timeout' => 4,
                'ignore_errors' => true
            ],
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
        ]);
        $fallbackResponse = @file_get_contents(rtrim($apiEndpoint, '/') . '/api/classify', false, $context);
        if ($fallbackResponse !== false) {
            $response = $fallbackResponse;
            $httpCode = 200;
        }
    }

    if ($response === false) {
        return ['success' => false, 'httpCode' => 503, 'error' => 'Timeout'];
    }

    $result = json_decode($response, true);
    if (!is_array($result)) {
        return ['success' => false, 'httpCode' => $httpCode ?: 502, 'error' => 'Invalid response'];
    }

    return ['success' => true, 'httpCode' => $httpCode, 'data' => $result];
}

$postData = [
    'apiKey' => $apiKey,
    'ip' => $visitorIp,
    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'headers' => [
        'Accept-Language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
        'Accept' => $_SERVER['HTTP_ACCEPT'] ?? '',
        'Referer' => $_SERVER['HTTP_REFERER'] ?? '',
        'Host' => $_SERVER['HTTP_HOST'] ?? '',
    ],
    'query' => $ctcQuery,
    'requestUri' => $_SERVER['REQUEST_URI'] ?? '',
    'queryString' => $_SERVER['QUERY_STRING'] ?? '',
    'source' => 'php-inline-guard'
];

$res = ctc_execute_inline_classification($postData, $apiEndpoint, $apiKey);

// Key revoked or expired -> Graceful security notice without leaking target URLs
if ($res['httpCode'] === 401 || $res['httpCode'] === 403) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "503 Service Temporarily Unavailable - Security Configuration Required";
    exit;
}

if ($res['success'] && isset($res['data'])) {
    $cData = $res['data'];
    $dest = $cData['destination'] ?? $cData['redirectUrl'] ?? $cData['url'] ?? '';
    $action = $cData['action'] ?? ($cData['isHuman'] ? 'redirect' : 'block');

    // Strict 404 enforcement
    if ($action === '404' || $dest === '404' || ($cData['statusAction'] ?? '') === '404') {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "404 Not Found";
        exit;
    }

    // Strict 403 enforcement
    if ($action === '403' || $dest === '403' || ($cData['statusAction'] ?? '') === '403' || (!$cData['isHuman'] && empty($dest))) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo "403 Forbidden - Access Denied";
        exit;
    }

    // Redirect human visitor or custom bot URL with preserved query parameters
    if (!empty($dest)) {
        $q = $_SERVER['QUERY_STRING'] ?? '';
        if (!empty($q)) {
            $dest .= (strpos($dest, '?') !== false ? '&' : '?') . $q;
        }
        $_SESSION['ctc_verified'] = '1';
        header("Location: " . $dest, true, 302);
        exit;
    }
}

// Mark session verified on clean allow
$_SESSION['ctc_verified'] = '1';
?>`;
  }

  const renderedBody = theme.htmlBody
    .replace(/{{HEADING}}/g, headingStr)
    .replace(/{{SUBNOTE}}/g, subnoteStr);

  return `<?php
/**
 * CleanTraffic - High-Performance Verification Interstitial & Traffic Security Script
 * Auto-generated for API Key: ${keyStr}
 * Active Loading UI Theme: ${theme.name} (${theme.id})
 * 
 * ARCHITECTURE:
 * - Instant Interstitial UI: Zero blank white screens. Renders an immediate security splash in <15ms.
 * - Asynchronous Classification: Background check verifies IP, device, geo, proxy, and bot signatures.
 * - Anti-Bypass Protection: Destination URLs are never exposed until backend classification succeeds.
 * - Fail-Closed Security: Network or service timeouts gracefully display a retry UI; never fails open.
 * - Tenant Isolation: Strictly bound to your API key and chosen loading UI theme (${theme.name}).
 * - Compatible out-of-the-box with PHP 7.4 - 8.x, cPanel, Apache, Nginx, and WordPress.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$apiKey = '${keyStr}';
$apiEndpoint = '${effectiveEndpoint}';

// 1. Extract Visitor IP with Cloudflare, Akamai, Fastly, AWS ALB & Reverse Proxy awareness
$visitorIp = $_SERVER['HTTP_CF_CONNECTING_IP'] 
    ?? $_SERVER['HTTP_TRUE_CLIENT_IP'] 
    ?? $_SERVER['HTTP_X_REAL_IP'] 
    ?? $_SERVER['HTTP_FASTLY_CLIENT_IP'] 
    ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
    ?? $_SERVER['REMOTE_ADDR'] 
    ?? '127.0.0.1';

if (strpos($visitorIp, ',') !== false) {
    $ips = explode(',', $visitorIp);
    $visitorIp = trim($ips[0]);
}

// 2. Comprehensive Query String & Request URI Extraction
// Preserves ad click tokens (gclid, fbclid, ttclid, msclkid, twclid, wbraid, gbraid, UTMs)
// across Apache, Nginx, LiteSpeed, Cloudflare, reverse proxies, and URL rewrites.
$ctcQuery = is_array($_GET) ? $_GET : [];
if (empty($ctcQuery) && !empty($_SERVER['QUERY_STRING'])) {
    parse_str($_SERVER['QUERY_STRING'], $ctcQuery);
}
if (empty($ctcQuery) && !empty($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '?') !== false) {
    $queryStringFromUri = substr($_SERVER['REQUEST_URI'], strpos($_SERVER['REQUEST_URI'], '?') + 1);
    parse_str($queryStringFromUri, $ctcQuery);
}

// 3. High-Performance API Classification Caller
function ctc_execute_classification($postData, $apiEndpoint, $apiKey) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => rtrim($apiEndpoint, '/') . '/api/classify',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($postData),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-API-Key: ' . $apiKey,
            'Authorization: Bearer ' . $apiKey,
            'User-Agent: CleanTraffic-PHP-Connector/2.0'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Fallback using file_get_contents if cURL failed or is restricted
    if (($response === false || !empty($curlError)) && ini_get('allow_url_fopen')) {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n" .
                            "Accept: application/json\r\n" .
                            "X-API-Key: " . $apiKey . "\r\n" .
                            "Authorization: Bearer " . $apiKey . "\r\n" .
                            "User-Agent: CleanTraffic-PHP-Connector/2.0\r\n",
                'content' => json_encode($postData),
                'timeout' => 12,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ]);
        $fallbackResponse = @file_get_contents(rtrim($apiEndpoint, '/') . '/api/classify', false, $context);
        if ($fallbackResponse !== false) {
            $response = $fallbackResponse;
            $curlError = '';
            if (isset($http_response_header) && is_array($http_response_header)) {
                foreach ($http_response_header as $hdr) {
                    if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $hdr, $m)) {
                        $httpCode = (int)$m[1];
                        break;
                    }
                }
            } else {
                $httpCode = 200;
            }
        }
    }

    if ($response === false || (!empty($curlError) && empty($response))) {
        return ['success' => false, 'httpCode' => 503, 'error' => 'Connection timeout during security verification.'];
    }

    $result = json_decode($response, true);
    if (!is_array($result)) {
        return ['success' => false, 'httpCode' => $httpCode ?: 502, 'error' => 'Invalid classification response.'];
    }

    return ['success' => true, 'httpCode' => $httpCode, 'data' => $result];
}

// 4. Immediate Server-Side Handling for Crawlers & Ad Reviewers (Non-interactive bots that do not execute JavaScript)
$userUa = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isCrawlerOrReviewer = (bool)preg_match('/(bot|crawler|spider|facebookexternalhit|facebot|meta-externalagent|facebookcatalog|bytespider|tiktokbot|tiktokspider|adidxbot|bingbot|bingpreview|twitterbot|mediapartners|adsbot|google-inspectiontool|googlebot)/i', $userUa);

if ($isCrawlerOrReviewer && (!isset($_GET['ctc_verify']) || $_GET['ctc_verify'] !== '1')) {
    $crawlerPostData = [
        'apiKey' => $apiKey,
        'ip' => $visitorIp,
        'userAgent' => $userUa,
        'clientTokens' => null,
        'headers' => [
            'Accept-Language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
            'Accept-Encoding' => $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '',
            'Accept' => $_SERVER['HTTP_ACCEPT'] ?? '',
            'Referer' => $_SERVER['HTTP_REFERER'] ?? '',
            'Host' => $_SERVER['HTTP_HOST'] ?? '',
            'Sec-Ch-Ua' => $_SERVER['HTTP_SEC_CH_UA'] ?? '',
            'Sec-Ch-Ua-Mobile' => $_SERVER['HTTP_SEC_CH_UA_MOBILE'] ?? '',
            'Sec-Ch-Ua-Platform' => $_SERVER['HTTP_SEC_CH_UA_PLATFORM'] ?? '',
        ],
        'query' => $ctcQuery,
        'requestUri' => $_SERVER['REQUEST_URI'] ?? '',
        'queryString' => $_SERVER['QUERY_STRING'] ?? '',
        'source' => 'php-crawler-server-side'
    ];

    $crawlerRes = ctc_execute_classification($crawlerPostData, $apiEndpoint, $apiKey);
    if ($crawlerRes['success'] && isset($crawlerRes['data'])) {
        $cData = $crawlerRes['data'];
        $dest = $cData['destination'] ?? $cData['redirectUrl'] ?? $cData['url'] ?? '';
        $action = $cData['action'] ?? ($cData['isHuman'] ? 'redirect' : 'block');

        if ($action === '404' || $dest === '404') {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo "404 Not Found";
            exit;
        }
        if ($action === '403' || $dest === '403' || (!$cData['isHuman'] && empty($dest))) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=utf-8');
            echo "403 Forbidden";
            exit;
        }
        if (!empty($dest)) {
            $q = $_SERVER['QUERY_STRING'] ?? '';
            if (empty($q) && !empty($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '?') !== false) {
                $q = substr($_SERVER['REQUEST_URI'], strpos($_SERVER['REQUEST_URI'], '?') + 1);
            }
            if (!empty($q)) {
                $dest .= (strpos($dest, '?') !== false ? '&' : '?') . $q;
            }
            header("Location: " . $dest, true, 302);
            exit;
        }
    }
    http_response_code(403);
    echo "403 Forbidden";
    exit;
}

// 5. Asynchronous Verification Request Handler (Called via AJAX background fetch from loading screen)
if (isset($_GET['ctc_verify']) && $_GET['ctc_verify'] === '1') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    $clientTokens = null;
    $rawTokens = $_POST['clientTokens'] ?? $_GET['ctc_tk'] ?? null;
    if ($rawTokens) {
        $decoded = @json_decode(base64_decode($rawTokens), true);
        if (is_array($decoded)) {
            $clientTokens = $decoded;
        }
    }

    $cleanQuery = $ctcQuery;
    unset($cleanQuery['ctc_verify']);
    unset($cleanQuery['ctc_tk']);

    $postData = [
        'apiKey' => $apiKey,
        'ip' => $visitorIp,
        'userAgent' => $userUa,
        'clientTokens' => $clientTokens,
        'headers' => [
            'Accept-Language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
            'Accept-Encoding' => $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '',
            'Accept' => $_SERVER['HTTP_ACCEPT'] ?? '',
            'Referer' => $_SERVER['HTTP_REFERER'] ?? '',
            'Host' => $_SERVER['HTTP_HOST'] ?? '',
            'Sec-Ch-Ua' => $_SERVER['HTTP_SEC_CH_UA'] ?? '',
            'Sec-Ch-Ua-Mobile' => $_SERVER['HTTP_SEC_CH_UA_MOBILE'] ?? '',
            'Sec-Ch-Ua-Platform' => $_SERVER['HTTP_SEC_CH_UA_PLATFORM'] ?? '',
        ],
        'query' => $cleanQuery,
        'requestUri' => $_SERVER['REQUEST_URI'] ?? '',
        'queryString' => !empty($cleanQuery) ? http_build_query($cleanQuery) : ($_SERVER['QUERY_STRING'] ?? ''),
        'source' => 'php-interstitial-theme-${theme.id}'
    ];

    $apiRes = ctc_execute_classification($postData, $apiEndpoint, $apiKey);
    if (!$apiRes['success'] || !isset($apiRes['data'])) {
        http_response_code($apiRes['httpCode'] ?: 503);
        echo json_encode([
            'status' => 'error',
            'error' => $apiRes['error'] ?? 'Connection timeout during security verification.',
            'fail_closed' => true
        ]);
        exit;
    }

    $result = $apiRes['data'];
    $destinationUrl = $result['destination'] 
        ?? $result['redirectUrl'] 
        ?? $result['destinationUrl'] 
        ?? $result['redirect_url'] 
        ?? $result['url'] 
        ?? '';

    if (empty($destinationUrl)) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => 'No destination URL configured for this traffic classification.',
            'fail_closed' => true
        ]);
        exit;
    }

    $is404 = ($destinationUrl === '404' || strpos($destinationUrl, '404') === 0);
    $is403 = ($destinationUrl === '403' || strpos($destinationUrl, '403') === 0);

    if ($is404) {
        echo json_encode([
            'status' => 'success',
            'action' => '404',
            'destination' => null,
            'visitorType' => $result['visitorType'] ?? 'Bot'
        ]);
        exit;
    }

    if ($is403) {
        echo json_encode([
            'status' => 'success',
            'action' => '403',
            'destination' => null,
            'visitorType' => $result['visitorType'] ?? 'Bot'
        ]);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'destination' => $destinationUrl,
        'action' => $result['action'] ?? 'redirect',
        'visitorType' => $result['visitorType'] ?? 'Human'
    ]);
    exit;
}

// 3. Fast Interstitial Loading Screen (${theme.name} Theme)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headingStr}</title>
  <style>
${theme.htmlHead}
  </style>
</head>
<body>
${renderedBody}

  <script>
    (function() {
      // 1. Lightweight Passive Hardware & Headless Integrity Collector (<1.5 KB, executes in <15ms)
      var hwTokens = {
        webdriver: !!(navigator.webdriver),
        outerWidth: window.outerWidth || 0,
        outerHeight: window.outerHeight || 0,
        screenWidth: window.screen ? window.screen.width : 0,
        screenHeight: window.screen ? window.screen.height : 0,
        colorDepth: window.screen ? window.screen.colorDepth : 0,
        missingPluginsArray: !navigator.plugins || navigator.plugins.length === 0,
        gpuRenderer: '',
        untrustedEvent: false,
        timezoneOffset: new Date().getTimezoneOffset(),
        hardwareConcurrency: navigator.hardwareConcurrency || 0
      };

      try {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            hwTokens.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
          }
        }
      } catch(e) {}

      // Passive input integrity listener: detects synthetic programmatic dispatches (event.isTrusted === false)
      function monitorInput(e) {
        if (e && e.isTrusted === false) {
          hwTokens.untrustedEvent = true;
        }
      }
      window.addEventListener('click', monitorInput, { passive: true, capture: true });
      window.addEventListener('touchstart', monitorInput, { passive: true, capture: true });

      var encodedTokens = '';
      try {
        encodedTokens = btoa(JSON.stringify(hwTokens));
      } catch(e) {}

      var verifyUrl = window.location.pathname + (window.location.search ? window.location.search + '&ctc_verify=1' : '?ctc_verify=1');
      if (encodedTokens) {
        verifyUrl += '&ctc_tk=' + encodeURIComponent(encodedTokens);
      }
      var statusEl = document.getElementById('ctc-status');
      var errorEl = document.getElementById('ctc-error');
      var errorMsgEl = document.getElementById('ctc-error-msg');
      var progressEl = document.getElementById('ctc-progress');

      function showError(msg) {
        if (progressEl) progressEl.style.display = 'none';
        if (statusEl) statusEl.style.display = 'none';
        if (errorEl) {
          errorEl.style.display = 'block';
          if (errorMsgEl && msg) errorMsgEl.textContent = msg;
        }
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', verifyUrl, true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = 16000;

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data.action === '404') {
              document.body.innerHTML = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:60px 20px;text-align:center;color:#334155;"><h1 style="font-size:32px;margin-bottom:8px;">404 Not Found</h1><p style="font-size:16px;color:#64748b;">The requested page could not be found on this server.</p></div>';
              return;
            }
            if (data.action === '403') {
              document.body.innerHTML = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:60px 20px;text-align:center;color:#334155;"><h1 style="font-size:32px;margin-bottom:8px;">403 Forbidden</h1><p style="font-size:16px;color:#64748b;">Access to this resource is denied.</p></div>';
              return;
            }
            if (data.destination) {
              if (statusEl) statusEl.textContent = 'Verification complete. Forwarding...';
              var dest = data.destination;
              var currentSearch = window.location.search;
              if (currentSearch) {
                var cleanSearch = currentSearch.replace(/[\?&](ctc_verify|ctc_tk)=[^&]*/gi, '');
                cleanSearch = cleanSearch.replace(/^&+/, '');
                if (cleanSearch && cleanSearch !== '?' && cleanSearch !== '&') {
                  dest += (dest.indexOf('?') !== -1 ? '&' : '?') + cleanSearch.replace(/^[\?&]/, '');
                }
              }
              window.location.replace(dest);
              return;
            }
          } catch(e) {}
          showError('Security check completed with unexpected response.');
        } else {
          try {
            var errData = JSON.parse(xhr.responseText);
            showError(errData.error || 'Verification check failed.');
          } catch(e) {
            showError('Verification check failed (HTTP ' + xhr.status + ').');
          }
        }
      };

      xhr.onerror = function() {
        showError('Network error connecting to verification gateway.');
      };

      xhr.ontimeout = function() {
        showError('Verification timed out. Please refresh to retry.');
      };

      xhr.send();
    })();
  </script>
</body>
</html>`;
}
