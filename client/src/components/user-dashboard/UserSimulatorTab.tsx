import React, { useState } from "react";
import { 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Smartphone, 
  Monitor, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Info,
  Sparkles,
  Layers,
  Bug,
  Globe,
  Sliders,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { computeThreatScore } from "@/lib/threatScoring";

interface UserSimulatorTabProps {
  apiKey?: string;
  humanUrl?: string;
  botUrl?: string;
}

interface TestScenario {
  id: string;
  title: string;
  category: "human" | "bot";
  description: string;
  icon: any;
  payload: {
    ip?: string;
    userAgent: string;
    acceptLanguage?: string;
    secChUa?: string;
    secChUaPlatform?: string;
    secChUaMobile?: string;
    clientTokens?: {
      webdriver: boolean;
      outerWidth: number;
      outerHeight: number;
      screenWidth: number;
      screenHeight: number;
      colorDepth: number;
      missingPluginsArray: boolean;
      gpuRenderer: string;
      untrustedEvent: boolean;
    };
  };
}

export function UserSimulatorTab({ apiKey, humanUrl, botUrl }: UserSimulatorTabProps) {
  // Preset Scenarios
  const scenarios: TestScenario[] = [
    {
      id: "real-iphone",
      title: "Real iPhone 15 Pro (Human)",
      category: "human",
      description: "Legitimate human visitor holding phone stationary. Zero motion, genuine Apple WebGL GPU, valid Mobile Client Hints.",
      icon: Smartphone,
      payload: {
        ip: "73.189.201.44", // Comcast Residential IP
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: '"Not/A)Brand";v="8", "Chromium";v="126"',
        secChUaPlatform: '"iOS"',
        secChUaMobile: "?1",
        clientTokens: {
          webdriver: false,
          outerWidth: 393,
          outerHeight: 852,
          screenWidth: 393,
          screenHeight: 852,
          colorDepth: 24,
          missingPluginsArray: false,
          gpuRenderer: "Apple GPU",
          untrustedEvent: false,
        },
      },
    },
    {
      id: "real-desktop",
      title: "Real Desktop Chrome (Human)",
      category: "human",
      description: "Authentic desktop user on Windows 11 with Nvidia GPU. Clean residential IP, perfect header harmony.",
      icon: Monitor,
      payload: {
        ip: "108.45.122.91", // Verizon Fios Residential
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        acceptLanguage: "en-US,en;q=0.9,es;q=0.8",
        secChUa: '"Chromium";v="126", "Not/A)Brand";v="24", "Google Chrome";v="126"',
        secChUaPlatform: '"Windows"',
        secChUaMobile: "?0",
        clientTokens: {
          webdriver: false,
          outerWidth: 1920,
          outerHeight: 1040,
          screenWidth: 1920,
          screenHeight: 1080,
          colorDepth: 24,
          missingPluginsArray: false,
          gpuRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)",
          untrustedEvent: false,
        },
      },
    },
    {
      id: "headless-puppeteer",
      title: "Stealth Puppeteer Scraper (Phase 3 Bot)",
      category: "bot",
      description: "Automated scraper running inside a headless Linux cloud container with navigator.webdriver flag exposed.",
      icon: Bug,
      payload: {
        ip: "198.51.100.22",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: '"Chromium";v="126"',
        secChUaPlatform: '"Windows"',
        secChUaMobile: "?0",
        clientTokens: {
          webdriver: true, // 🚨 Trigger
          outerWidth: 0,   // 🚨 Headless geometry
          outerHeight: 0,
          screenWidth: 800,
          screenHeight: 600,
          colorDepth: 24,
          missingPluginsArray: true,
          gpuRenderer: "Google SwiftShader",
          untrustedEvent: false,
        },
      },
    },
    {
      id: "synthetic-click",
      title: "Click-Farm Bot (Fake Click Injection)",
      category: "bot",
      description: "Bot script dispatches synthetic programmatic mouse clicks where event.isTrusted === false.",
      icon: Zap,
      payload: {
        ip: "192.0.2.78",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        acceptLanguage: "en-US,en;q=0.9",
        secChUaPlatform: '"iOS"',
        secChUaMobile: "?1",
        clientTokens: {
          webdriver: false,
          outerWidth: 390,
          outerHeight: 844,
          screenWidth: 390,
          screenHeight: 844,
          colorDepth: 24,
          missingPluginsArray: false,
          gpuRenderer: "Apple GPU",
          untrustedEvent: true, // 🚨 Trigger: Synthetic Click
        },
      },
    },
    {
      id: "client-hints-spoof",
      title: "Spoofed Client Hints (Phase 2 Bot)",
      category: "bot",
      description: "User-Agent claims to be an Apple iPhone, but underlying Chromium Sec-CH-UA-Platform reports Windows.",
      icon: AlertTriangle,
      payload: {
        ip: "203.0.113.50",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: '"Chromium";v="125"',
        secChUaPlatform: '"Windows"', // 🚨 Mismatch: Claims iPhone in UA, but Windows in Client Hints
        secChUaMobile: "?1",
        clientTokens: {
          webdriver: false,
          outerWidth: 390,
          outerHeight: 844,
          screenWidth: 390,
          screenHeight: 844,
          colorDepth: 24,
          missingPluginsArray: false,
          gpuRenderer: "",
          untrustedEvent: false,
        },
      },
    },
    {
      id: "emulated-gpu-mobile",
      title: "Docker Cloud Container Emulating Phone",
      category: "bot",
      description: "Claims to be a mobile Android device, but uses SwiftShader/Mesa software rasterizer inside Docker.",
      icon: Cpu,
      payload: {
        ip: "198.51.100.99",
        userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
        acceptLanguage: "en-US,en;q=0.9",
        secChUaPlatform: '"Android"',
        secChUaMobile: "?1",
        clientTokens: {
          webdriver: false,
          outerWidth: 412,
          outerHeight: 915,
          screenWidth: 412,
          screenHeight: 915,
          colorDepth: 24,
          missingPluginsArray: false,
          gpuRenderer: "Google SwiftShader / llvmpipe (Mesa Offscreen)", // 🚨 Software rasterizer on claimed phone
          untrustedEvent: false,
        },
      },
    },
  ];

  // Active form state
  const [selectedScenario, setSelectedScenario] = useState<string>("real-iphone");
  const [userAgent, setUserAgent] = useState<string>(scenarios[0].payload.userAgent);
  const [ipAddress, setIpAddress] = useState<string>(scenarios[0].payload.ip || "73.189.201.44");
  const [secChUaPlatform, setSecChUaPlatform] = useState<string>(scenarios[0].payload.secChUaPlatform || '"iOS"');
  const [secChUaMobile, setSecChUaMobile] = useState<string>(scenarios[0].payload.secChUaMobile || "?1");
  const [isWebdriver, setIsWebdriver] = useState<boolean>(false);
  const [isUntrustedEvent, setIsUntrustedEvent] = useState<boolean>(false);
  const [outerWidth, setOuterWidth] = useState<number>(393);
  const [outerHeight, setOuterHeight] = useState<number>(852);
  const [gpuRenderer, setGpuRenderer] = useState<string>("Apple GPU");

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyScenario = (scenario: TestScenario) => {
    setSelectedScenario(scenario.id);
    setUserAgent(scenario.payload.userAgent);
    setIpAddress(scenario.payload.ip || "127.0.0.1");
    setSecChUaPlatform(scenario.payload.secChUaPlatform || "");
    setSecChUaMobile(scenario.payload.secChUaMobile || "");
    setIsWebdriver(scenario.payload.clientTokens?.webdriver || false);
    setIsUntrustedEvent(scenario.payload.clientTokens?.untrustedEvent || false);
    setOuterWidth(scenario.payload.clientTokens?.outerWidth ?? 393);
    setOuterHeight(scenario.payload.clientTokens?.outerHeight ?? 852);
    setGpuRenderer(scenario.payload.clientTokens?.gpuRenderer || "");
    setResult(null);
    setError(null);
  };

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        apiKey: apiKey || "demo",
        ip: ipAddress,
        userAgent: userAgent,
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Ch-Ua-Platform": secChUaPlatform,
          "Sec-Ch-Ua-Mobile": secChUaMobile,
        },
        clientTokens: {
          webdriver: isWebdriver,
          outerWidth: Number(outerWidth),
          outerHeight: Number(outerHeight),
          screenWidth: Number(outerWidth) || 393,
          screenHeight: Number(outerHeight) || 852,
          colorDepth: 24,
          gpuRenderer: gpuRenderer,
          untrustedEvent: isUntrustedEvent,
        },
      };

      const res = await fetch("/api/classify/simulate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Simulator-Request": "true"
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 429) {
          throw new Error(errorData?.message || "Rate limit reached: Maximum 10 test simulations per minute to prevent misuse. Please wait a moment.");
        }
        throw new Error(errorData?.message || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Simulation request failed");
    } finally {
      setIsRunning(false);
    }
  };

  const threatInfo = result ? computeThreatScore(result) : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 text-[#0A5C48] border border-emerald-200">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Interactive Bot Defense & Behavioral Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Test and mimic Phase 2 (Client Hints cross-verification) and Phase 3 (DOM/Hardware headless detection) directly against your routing engine with 1-click test scenarios.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-700">Test Sandbox:</span>
          <span>Zero Quota Deducted</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">: </span>
        </div>
      </div>

      {/* Preset Scenarios Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 1: Choose a Test Scenario
          </span>
          <span className="text-xs text-slate-400">Click any preset to auto-populate hardware parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((sc) => {
            const isSelected = selectedScenario === sc.id;
            const Icon = sc.icon;
            const isHuman = sc.category === "human";

            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => applyScenario(sc)}
                className={`text-left p-3.5 rounded-xl border transition-all relative ${
                  isSelected
                    ? "border-[#0A5C48] bg-emerald-50/40 shadow-xs ring-1 ring-[#0A5C48]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg border ${
                        isHuman
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-xs text-slate-900 leading-tight">
                      {sc.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      isHuman
                        ? "bg-emerald-100/70 text-emerald-800 border-emerald-200"
                        : "bg-rose-100/70 text-rose-800 border-rose-200"
                    }`}
                  >
                    {isHuman ? "Human" : "Bot"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {sc.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Parameters & Live Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Customization (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Step 2: Inspect or Tweak Physical Fingerprint Signals
              </span>
            </div>
            <span className="text-[11px] text-slate-400">All fields editable</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Simulated IP Address
              </label>
              <Input
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g. 73.189.201.44"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Client Hints Platform (`Sec-CH-UA-Platform`)
              </label>
              <Input
                value={secChUaPlatform}
                onChange={(e) => setSecChUaPlatform(e.target.value)}
                placeholder='e.g. "iOS", "Windows", "Android"'
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              User-Agent String
            </label>
            <textarea
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              rows={2}
              className="w-full text-[11px] font-mono p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0A5C48]"
            />
          </div>

          {/* Phase 3 Hardware & Behavioral Signals */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#0A5C48]" />
                Phase 3 Browser DOM & Behavioral Toggles
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1.2s Interstitial Ingestion</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Webdriver Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-900">
                    navigator.webdriver
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Selenium / Puppeteer active
                  </div>
                </div>
                <Switch
                  checked={isWebdriver}
                  onCheckedChange={setIsWebdriver}
                />
              </div>

              {/* Synthetic Click Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-900">
                    Fake Click (event.isTrusted = false)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Injected programmatic click
                  </div>
                </div>
                <Switch
                  checked={isUntrustedEvent}
                  onCheckedChange={setIsUntrustedEvent}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Outer Screen Dimensions (W x H)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={outerWidth}
                    onChange={(e) => setOuterWidth(Number(e.target.value))}
                    placeholder="W"
                    className="h-7 text-xs font-mono"
                  />
                  <span className="text-xs text-slate-400">×</span>
                  <Input
                    type="number"
                    value={outerHeight}
                    onChange={(e) => setOuterHeight(Number(e.target.value))}
                    placeholder="H"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Headless servers report 0 × 0
                </span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  WebGL Unmasked GPU Renderer
                </label>
                <Input
                  value={gpuRenderer}
                  onChange={(e) => setGpuRenderer(e.target.value)}
                  placeholder="e.g. Apple GPU, SwiftShader"
                  className="h-7 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Physical GPU vs. software rasterizer
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className="w-full bg-[#0A5C48] hover:bg-[#084A3A] text-white font-semibold text-xs h-9 rounded-lg gap-2 shadow-xs"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing Verification Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Evaluate Live Traffic Verdict</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Live Decision Verdict (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Step 3: Engine Verdict & Live Routing
            </span>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!result && !isRunning && !error && (
            <div className="my-auto py-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
              <p className="text-xs max-w-xs mx-auto">
                Select a scenario and click <strong>"Evaluate Live Traffic Verdict"</strong> to see how your rules, threat score, and destination routing respond in real time.
              </p>
            </div>
          )}

          {isRunning && (
            <div className="my-auto py-12 text-center text-slate-500 space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#0A5C48] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-medium">
                Testing across Tier 1 (Client Hints & Behavioral DOM), Tier 2 (Geo/Device), and Tier 3 (ASN/VPN)...
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4 flex-1">
              {/* Big Decision Badge */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  result.visitorType === "Human"
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-rose-50/70 border-rose-200 text-rose-950"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.visitorType === "Human" ? (
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
                      <XCircle className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold">
                      {result.visitorType === "Human" ? "PASSED: Genuine Human" : "BLOCKED: Bot / Threat"}
                    </div>
                    <div className="text-xs font-medium text-slate-600">
                      Action: {result.action || (result.visitorType === "Human" ? "Allowed" : "Deflected")}
                    </div>
                  </div>
                </div>

                {threatInfo && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Threat Score
                    </div>
                    <div className="text-lg font-mono font-extrabold text-slate-900">
                      {threatInfo.score}
                      <span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Destination URL Routing */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-[#0A5C48]" />
                    Routed Destination
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    HTTP {result.statusCode || 200}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900 break-all select-all font-semibold">
                  {result.redirectUrl || result.redirect_url || (result.visitorType === "Human" ? humanUrl : botUrl) || "No URL configured"}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {result.visitorType === "Human"
                    ? "Legitimate visitor is forwarded straight to your money / offer page."
                    : "Bot or scraper is diverted to safe page or 404 block."}
                </div>
              </div>

              {/* Diagnostic Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50/70 font-semibold text-slate-700">
                  <span>Detection Trigger</span>
                  <span className="font-mono text-slate-900">
                    {result.detection_method || result.detectionMethod || "IP Analysis"}
                  </span>
                </div>

                {result.block_reason && (
                  <div className="flex items-start justify-between p-2.5 bg-rose-50/40 text-rose-900">
                    <span className="font-semibold shrink-0 mr-2">Block Reason</span>
                    <span className="font-medium text-right text-[11px]">
                      {result.block_reason}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-500">Connection Classification</span>
                  <span className="font-medium text-slate-900">
                    {result.connection_type || "Standard Connection"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-500">Device Architecture</span>
                  <span className="font-medium text-slate-900">
                    {result.device_type || "Desktop"} • {result.browser || "Chrome"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
