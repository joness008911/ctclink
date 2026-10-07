import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bot, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  SlidersHorizontal, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  ChevronDown, 
  ExternalLink, 
  Globe, 
  RefreshCw, 
  Info, 
  Lock, 
  ArrowRight, 
  Layers, 
  Sliders,
  Check,
  AlertTriangle,
  Zap,
  HelpCircle,
  FileCode2,
  Trash2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface AiCrawlerOperator {
  id: string;
  name: string;
  company: string;
  primaryBot: string;
  otherBots?: string[];
  category: "training" | "search_citation" | "archival" | "commercial" | "agent";
  categoryLabel: string;
  description: string;
  defaultInOverview: boolean;
  isPopular?: boolean;
}

// 10 Default Top AI Crawler Operators specified by design
export const DEFAULT_TOP_AI_OPERATORS: AiCrawlerOperator[] = [
  {
    id: "apple",
    name: "Apple",
    company: "Apple Inc.",
    primaryBot: "Applebot",
    otherBots: [],
    category: "search_citation",
    categoryLabel: "AI Search & Siri",
    description: "Indexes web content for Apple Intelligence, Siri suggestions, and Safari Spotlight.",
    defaultInOverview: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    company: "OpenAI, LLC",
    primaryBot: "GPTBot",
    otherBots: ["ChatGPT-User", "OAI-SearchBot"],
    category: "training",
    categoryLabel: "LLM Training & Citations",
    description: "Crawls web pages to train GPT models and fetch live source citations for ChatGPT search answers.",
    defaultInOverview: true,
  },
  {
    id: "internet_archive",
    name: "Internet Archive",
    company: "Internet Archive",
    primaryBot: "archive.org_bot",
    otherBots: ["ia_archiver"],
    category: "archival",
    categoryLabel: "Web Archival",
    description: "Preserves snapshots of the public web for Wayback Machine and non-profit open research.",
    defaultInOverview: true,
  },
  {
    id: "google",
    name: "Google AI",
    company: "Google LLC",
    primaryBot: "Google-Extended",
    otherBots: ["GoogleOther"],
    category: "training",
    categoryLabel: "Gemini Model Training",
    description: "Collects training datasets for Gemini foundation models and Vertex AI research.",
    defaultInOverview: true,
  },
  {
    id: "microsoft",
    name: "Microsoft",
    company: "Microsoft Corporation",
    primaryBot: "BingBot",
    otherBots: ["BingPreview"],
    category: "search_citation",
    categoryLabel: "Copilot & Indexing",
    description: "Feeds conversational answers in Microsoft Copilot, Windows Search, and Bing index.",
    defaultInOverview: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    company: "Anthropic, PBC",
    primaryBot: "ClaudeBot",
    otherBots: ["Claude-Web", "Anthropic-AI"],
    category: "training",
    categoryLabel: "Claude Model Training",
    description: "Harvests web text for training Claude frontier models and real-time prompt verification.",
    defaultInOverview: true,
  },
  {
    id: "bytedance",
    name: "ByteDance",
    company: "ByteDance Ltd.",
    primaryBot: "Bytespider",
    otherBots: ["ByteDance"],
    category: "training",
    categoryLabel: "LLM Content Harvester",
    description: "High-frequency scraper harvesting web copy for TikTok and Doubao generative AI tools.",
    defaultInOverview: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    company: "Perplexity AI, Inc.",
    primaryBot: "PerplexityBot",
    otherBots: ["Perplexity-Search"],
    category: "search_citation",
    categoryLabel: "Real-time AI Search",
    description: "Extracts live citations and grounded facts to generate answers in Perplexity conversational search.",
    defaultInOverview: true,
  },
  {
    id: "common_crawl",
    name: "Common Crawl",
    company: "Common Crawl Foundation",
    primaryBot: "CCBot",
    otherBots: [],
    category: "training",
    categoryLabel: "Open Training Datasets",
    description: "Massive open-source corpus used by hundreds of third-party AI research labs to train open models.",
    defaultInOverview: true,
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    company: "DuckDuckGo, Inc.",
    primaryBot: "DuckAssistBot",
    otherBots: ["DuckDuckBot"],
    category: "search_citation",
    categoryLabel: "Privacy AI Assistant",
    description: "Extracts summary snippets for DuckAssist privacy-first AI answers.",
    defaultInOverview: true,
  },
];

// Extended list of additional AI Crawler Operators available in Security
export const ADDITIONAL_AI_OPERATORS: AiCrawlerOperator[] = [
  {
    id: "cohere",
    name: "Cohere AI",
    company: "Cohere Inc.",
    primaryBot: "cohere-ai",
    otherBots: ["cohere-training"],
    category: "training",
    categoryLabel: "Enterprise LLM Training",
    description: "Collects datasets for Cohere Command and enterprise retrieval-augmented generation (RAG) models.",
    defaultInOverview: false,
  },
  {
    id: "mistral",
    name: "Mistral AI",
    company: "Mistral AI",
    primaryBot: "MistralBot",
    otherBots: [],
    category: "training",
    categoryLabel: "European Foundation Models",
    description: "Crawls web resources to train Mistral Large, Le Chat, and open-weights models.",
    defaultInOverview: false,
  },
  {
    id: "meta",
    name: "Meta AI",
    company: "Meta Platforms, Inc.",
    primaryBot: "Meta-ExternalAgent",
    otherBots: ["FacebookBot"],
    category: "training",
    categoryLabel: "Llama AI Training",
    description: "Crawls public sites to train Llama open-source models and Meta AI assistant features.",
    defaultInOverview: false,
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    company: "xAI Corp.",
    primaryBot: "GrokBot",
    otherBots: ["xAI-Search"],
    category: "search_citation",
    categoryLabel: "Grok Real-Time Search",
    description: "Crawls web sources to ground Grok generative answers and train xAI frontier models.",
    defaultInOverview: false,
  },
  {
    id: "amazon",
    name: "Amazon AI",
    company: "Amazon.com, Inc.",
    primaryBot: "Amazonbot",
    otherBots: [],
    category: "commercial",
    categoryLabel: "Alexa & Titan AI",
    description: "Harvests web pages for Amazon Titan models, Rufus shopping assistant, and Alexa search.",
    defaultInOverview: false,
  },
  {
    id: "diffbot",
    name: "Diffbot",
    company: "Diffbot Technologies",
    primaryBot: "Diffbot",
    otherBots: ["DiffbotAI"],
    category: "commercial",
    categoryLabel: "Knowledge Graph Scraper",
    description: "Extracts structured product data and entities for enterprise knowledge bases and AI reasoning.",
    defaultInOverview: false,
  },
  {
    id: "you",
    name: "You.com",
    company: "SuSea, Inc.",
    primaryBot: "YouBot",
    otherBots: [],
    category: "search_citation",
    categoryLabel: "Search Engine Assistant",
    description: "Indexes web resources to power real-time conversational search summaries in You.com.",
    defaultInOverview: false,
  },
  {
    id: "semanticscholar",
    name: "Semantic Scholar",
    company: "Allen Institute for AI",
    primaryBot: "SemanticScholarBot",
    otherBots: [],
    category: "archival",
    categoryLabel: "Scientific Research",
    description: "Indexes academic papers and public scientific literature for non-profit open access search.",
    defaultInOverview: false,
  },
  {
    id: "omgili",
    name: "Omgili",
    company: "Webhose / Enigma",
    primaryBot: "Omgilibot",
    otherBots: [],
    category: "commercial",
    categoryLabel: "Commercial Web Data Feed",
    description: "Aggregates web articles and forum discussions into commercially sold datasets for AI companies.",
    defaultInOverview: false,
  },
  {
    id: "criteo",
    name: "Criteo AI Scraper",
    company: "Criteo SA",
    primaryBot: "CriteoBot",
    otherBots: [],
    category: "commercial",
    categoryLabel: "Ad Intelligence Scraper",
    description: "Harvests product catalog pricing and category taxonomy to train automated ad bidding models.",
    defaultInOverview: false,
  },
];

export interface CloudflareSecurityCrawler {
  id: string;
  crawler: string;
  operator: string;
  operatorKey: string;
  category: "AI Search" | "AI Crawler" | "Archiver" | "AI Assistant" | "Search Engine Crawler";
  tokens: string[];
  description: string;
  defaultInOverview?: boolean;
}

// Comprehensive registry of Cloudflare AI agents & crawlers (Deduplicated with existing)
export const CLOUDFLARE_SECURITY_CRAWLERS: CloudflareSecurityCrawler[] = [
  {
    id: "applebot",
    crawler: "Applebot",
    operator: "Apple",
    operatorKey: "apple",
    category: "AI Search",
    tokens: ["applebot"],
    description: "Indexes web content for Apple Intelligence, Siri suggestions, and Safari Spotlight.",
    defaultInOverview: true,
  },
  {
    id: "archive_org_bot",
    crawler: "archive.org_bot",
    operator: "Internet Archive",
    operatorKey: "internet_archive",
    category: "Archiver",
    tokens: ["archive.org_bot", "ia_archiver"],
    description: "Preserves snapshots of the public web for Wayback Machine and non-profit open research.",
    defaultInOverview: true,
  },
  {
    id: "gptbot",
    crawler: "GPTBot",
    operator: "OpenAI",
    operatorKey: "openai",
    category: "AI Crawler",
    tokens: ["gptbot"],
    description: "Crawls web pages to train GPT frontier foundation models and OpenAI services.",
    defaultInOverview: true,
  },
  {
    id: "amazonbot",
    crawler: "Amazonbot",
    operator: "Amazon",
    operatorKey: "amazon",
    category: "AI Crawler",
    tokens: ["amazonbot"],
    description: "Crawls web pages to train Amazon Bedrock foundation models and Alexa intelligence.",
    defaultInOverview: false,
  },
  {
    id: "anchor_browser",
    crawler: "Anchor Browser",
    operator: "Anchor",
    operatorKey: "anchor",
    category: "AI Crawler",
    tokens: ["anchor browser", "anchor/"],
    description: "Automated browser engine indexing online content for autonomous AI web workflows.",
    defaultInOverview: false,
  },
  {
    id: "arquivo_web_crawler",
    crawler: "Arquivo Web Crawler",
    operator: "Arquivo",
    operatorKey: "arquivo",
    category: "Archiver",
    tokens: ["arquivo-web-crawler", "arquivo"],
    description: "Preserves public European and historical web pages for non-profit open research archives.",
    defaultInOverview: false,
  },
  {
    id: "baidu",
    crawler: "Baidu",
    operator: "Baidu",
    operatorKey: "baidu",
    category: "Search Engine Crawler",
    tokens: ["baiduspider", "baidu"],
    description: "General search engine spider indexing content for the Baidu web and Ernie Bot indexes.",
    defaultInOverview: false,
  },
  {
    id: "bingbot",
    crawler: "BingBot",
    operator: "Microsoft",
    operatorKey: "microsoft",
    category: "Search Engine Crawler",
    tokens: ["bingbot", "bingpreview"],
    description: "Feeds conversational answers in Microsoft Copilot, Windows Search, and Bing index.",
    defaultInOverview: true,
  },
  {
    id: "bytespider",
    crawler: "Bytespider",
    operator: "ByteDance",
    operatorKey: "bytedance",
    category: "AI Crawler",
    tokens: ["bytespider"],
    description: "High-frequency scraper harvesting web copy for TikTok and Doubao generative AI tools.",
    defaultInOverview: true,
  },
  {
    id: "ccbot",
    crawler: "CCBot",
    operator: "Common Crawl",
    operatorKey: "common_crawl",
    category: "AI Crawler",
    tokens: ["ccbot"],
    description: "Massive open-source corpus used by hundreds of third-party AI research labs to train models.",
    defaultInOverview: true,
  },
  {
    id: "chatgpt_user",
    crawler: "ChatGPT-User",
    operator: "OpenAI",
    operatorKey: "openai",
    category: "AI Assistant",
    tokens: ["chatgpt-user"],
    description: "Triggered in real-time when ChatGPT end-users prompt for live source browsing.",
    defaultInOverview: false,
  },
  {
    id: "claude_searchbot",
    crawler: "Claude-SearchBot",
    operator: "Anthropic",
    operatorKey: "anthropic",
    category: "AI Search",
    tokens: ["claude-searchbot"],
    description: "Performs real-time search queries to ground Claude conversational prompt answers with citations.",
    defaultInOverview: false,
  },
  {
    id: "claude_user",
    crawler: "Claude-User",
    operator: "Anthropic",
    operatorKey: "anthropic",
    category: "AI Crawler",
    tokens: ["claude-user"],
    description: "Crawls web pages on behalf of Claude end-user requests and live prompt context fetching.",
    defaultInOverview: false,
  },
  {
    id: "claudebot",
    crawler: "ClaudeBot",
    operator: "Anthropic",
    operatorKey: "anthropic",
    category: "AI Crawler",
    tokens: ["claudebot", "claude-web", "anthropic-ai"],
    description: "Harvests web text for training Claude frontier models and synthetic prompt pipelines.",
    defaultInOverview: true,
  },
  {
    id: "cloudflare_crawler",
    crawler: "Cloudflare Crawler",
    operator: "Cloudflare",
    operatorKey: "cloudflare",
    category: "AI Crawler",
    tokens: ["cloudflare-crawler", "cf-crawl"],
    description: "Automated network bot collecting datasets for Cloudflare Workers AI and Radar indexing.",
    defaultInOverview: false,
  },
  {
    id: "duckassistbot",
    crawler: "DuckAssistBot",
    operator: "DuckDuckGo",
    operatorKey: "duckduckgo",
    category: "AI Assistant",
    tokens: ["duckassistbot", "duckduckbot"],
    description: "Extracts summary snippets for DuckAssist privacy-first AI answers.",
    defaultInOverview: true,
  },
  {
    id: "facebookbot",
    crawler: "FacebookBot",
    operator: "Meta",
    operatorKey: "meta",
    category: "AI Crawler",
    tokens: ["facebookbot"],
    description: "Scrapes web content to improve Meta AI algorithms and Llama foundation model training.",
    defaultInOverview: false,
  },
  {
    id: "google_cloudvertexbot",
    crawler: "Google-CloudVertexBot",
    operator: "Google",
    operatorKey: "google",
    category: "AI Crawler",
    tokens: ["google-cloudvertexbot"],
    description: "Extracts grounded enterprise web context for Google Cloud Vertex AI customer deployments.",
    defaultInOverview: false,
  },
  {
    id: "googlebot",
    crawler: "Googlebot",
    operator: "Google",
    operatorKey: "google",
    category: "Search Engine Crawler",
    tokens: ["googlebot", "google-inspectiontool"],
    description: "Core Google search engine crawler indexing web pages for organic Google Search and Search Console.",
    defaultInOverview: false,
  },
  {
    id: "manus_bot",
    crawler: "Manus Bot",
    operator: "Manus",
    operatorKey: "manus",
    category: "AI Assistant",
    tokens: ["manus bot", "manus-bot", "manus"],
    description: "Autonomous AI agent harvesting web resources to execute multi-step user workflows.",
    defaultInOverview: false,
  },
  {
    id: "meta_externalagent",
    crawler: "Meta-ExternalAgent",
    operator: "Meta",
    operatorKey: "meta",
    category: "AI Crawler",
    tokens: ["meta-externalagent"],
    description: "Indexes public internet pages to train next-generation Llama models and Meta AI assistant.",
    defaultInOverview: false,
  },
  {
    id: "meta_externalfetcher",
    crawler: "Meta-ExternalFetcher",
    operator: "Meta",
    operatorKey: "meta",
    category: "AI Assistant",
    tokens: ["meta-externalfetcher"],
    description: "Real-time fetcher invoked when Meta AI assistant users query live web citations.",
    defaultInOverview: false,
  },
  {
    id: "mistralai_user",
    crawler: "MistralAI-User",
    operator: "Mistral",
    operatorKey: "mistral",
    category: "AI Assistant",
    tokens: ["mistralai-user", "mistralbot"],
    description: "Extracts web citations in real-time on behalf of users in Le Chat conversational app.",
    defaultInOverview: false,
  },
  {
    id: "novellum_ai_crawl",
    crawler: "Novellum AI Crawl",
    operator: "Novellum",
    operatorKey: "novellum",
    category: "AI Crawler",
    tokens: ["novellum"],
    description: "Autonomous web data extraction crawler feeding generative legal and industry models.",
    defaultInOverview: false,
  },
  {
    id: "oai_searchbot",
    crawler: "OAI-SearchBot",
    operator: "OpenAI",
    operatorKey: "openai",
    category: "AI Search",
    tokens: ["oai-searchbot"],
    description: "Indexes web content to surface relevant web citations and source links in ChatGPT Search.",
    defaultInOverview: false,
  },
  {
    id: "perplexity_user",
    crawler: "Perplexity-User",
    operator: "Perplexity",
    operatorKey: "perplexity",
    category: "AI Assistant",
    tokens: ["perplexity-user"],
    description: "Triggered in real-time when Perplexity users ask questions requiring fresh web citations.",
    defaultInOverview: false,
  },
  {
    id: "perplexitybot",
    crawler: "PerplexityBot",
    operator: "Perplexity",
    operatorKey: "perplexity",
    category: "AI Search",
    tokens: ["perplexitybot", "perplexity-search"],
    description: "Extracts live citations and grounded facts to generate answers in Perplexity conversational search.",
    defaultInOverview: true,
  },
  {
    id: "petalbot",
    crawler: "PetalBot",
    operator: "Huawei",
    operatorKey: "huawei",
    category: "AI Crawler",
    tokens: ["petalbot"],
    description: "Crawls web copy for Huawei Petal Search and Celia generative AI assistant.",
    defaultInOverview: false,
  },
  {
    id: "proratainc",
    crawler: "ProRataInc",
    operator: "ProRata.ai",
    operatorKey: "prorata",
    category: "AI Crawler",
    tokens: ["proratainc", "prorata"],
    description: "Crawls online publications to calculate publisher attribution and licensing royalty shares.",
    defaultInOverview: false,
  },
  {
    id: "terracotta_bot",
    crawler: "Terracotta Bot",
    operator: "Ceramic",
    operatorKey: "ceramic",
    category: "Search Engine Crawler",
    tokens: ["terracotta bot", "terracottabot"],
    description: "Decentralized web search spider indexing public data schemas and documentation.",
    defaultInOverview: false,
  },
  {
    id: "tiktok_spider",
    crawler: "TikTok Spider",
    operator: "ByteDance",
    operatorKey: "bytedance",
    category: "AI Crawler",
    tokens: ["tiktok spider", "tiktokspider"],
    description: "Collects contextual web metadata to power TikTok recommendation and search AI features.",
    defaultInOverview: false,
  },
  {
    id: "timpibot",
    crawler: "Timpibot",
    operator: "Timpi",
    operatorKey: "timpi",
    category: "AI Crawler",
    tokens: ["timpibot"],
    description: "Decentralized autonomous search crawler indexing the public web without data harvesting.",
    defaultInOverview: false,
  },
  {
    id: "google_extended",
    crawler: "Google-Extended",
    operator: "Google",
    operatorKey: "google",
    category: "AI Crawler",
    tokens: ["google-extended", "googleother"],
    description: "Collects training datasets for Gemini foundation models and Vertex AI research.",
    defaultInOverview: true,
  },
  {
    id: "cohere_ai",
    crawler: "Cohere AI",
    operator: "Cohere",
    operatorKey: "cohere",
    category: "AI Crawler",
    tokens: ["cohere-ai", "cohere-training"],
    description: "Collects datasets for Cohere Command and enterprise retrieval-augmented generation (RAG) models.",
    defaultInOverview: false,
  },
  {
    id: "grokbot",
    crawler: "GrokBot",
    operator: "xAI",
    operatorKey: "xai",
    category: "AI Crawler",
    tokens: ["grokbot", "xai-search"],
    description: "Scrapes real-time web content to ground answers in xAI Grok models.",
    defaultInOverview: false,
  },
  {
    id: "diffbot",
    crawler: "Diffbot",
    operator: "Diffbot",
    operatorKey: "diffbot",
    category: "AI Crawler",
    tokens: ["diffbot"],
    description: "Uses computer vision and ML to transform web pages into structured knowledge graph entities.",
    defaultInOverview: false,
  },
  {
    id: "semanticscholar",
    crawler: "Semantic Scholar",
    operator: "Allen Institute",
    operatorKey: "allen_institute",
    category: "Archiver",
    tokens: ["semanticscholarbot"],
    description: "Indexes academic papers and scientific literature for non-profit open access research.",
    defaultInOverview: false,
  },
  {
    id: "omgili",
    crawler: "Omgili",
    operator: "Webhose",
    operatorKey: "webhose",
    category: "AI Crawler",
    tokens: ["omgilibot"],
    description: "Aggregates web articles and forum discussions into commercially sold datasets for AI companies.",
    defaultInOverview: false,
  },
  {
    id: "criteo",
    crawler: "CriteoBot",
    operator: "Criteo",
    operatorKey: "criteo",
    category: "AI Crawler",
    tokens: ["criteobot"],
    description: "Harvests product catalog pricing and category taxonomy to train automated ad bidding models.",
    defaultInOverview: false,
  },
];

// Visual Sparkline Mini Chart
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const width = 56;
  const height = 22;
  const hasData = data.some((val) => val > 0);
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 4) + 2;
    const y = hasData ? height - (val / max) * (height - 6) - 3 : height - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M ${points[0]} L ${points.join(" L ")} L ${width - 2},${height} L 2,${height} Z`;

  return (
    <svg className="w-14 h-5.5 shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="cfSparklineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A5C48" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0A5C48" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {hasData && <path d={areaD} fill="url(#cfSparklineGrad)" />}
      <path
        d={pathD}
        fill="none"
        stroke={hasData ? "#0A5C48" : "#CBD5E1"}
        strokeWidth={hasData ? "1.5" : "1"}
        strokeDasharray={hasData ? undefined : "2 2"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getCategoryBadgeStyle(category: string) {
  switch (category) {
    case "AI Search":
      return "bg-sky-50 text-sky-800 border-sky-200/80";
    case "AI Crawler":
      return "bg-emerald-50 text-emerald-800 border-emerald-200/80";
    case "Archiver":
      return "bg-purple-50 text-purple-800 border-purple-200/80";
    case "AI Assistant":
      return "bg-amber-50 text-amber-800 border-amber-200/80";
    case "Search Engine Crawler":
      return "bg-slate-100 text-slate-700 border-slate-200/80";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200/80";
  }
}

interface UserAiCrawlTabProps {
  currentSubTab?: "overview" | "security";
  onNavigateTab?: (tab: string) => void;
}

export function UserAiCrawlTab({
  currentSubTab = "overview",
  onNavigateTab,
}: UserAiCrawlTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mode is controlled directly by sidebar selection: Overview is Overview, Security is Security
  const isOverview = currentSubTab === "overview";
  const isSecurity = currentSubTab === "security";

  // Security filters & search matching Cloudflare UI
  const [selectedCrawlerFilter, setSelectedCrawlerFilter] = useState<string>("all");
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [showInactive, setShowInactive] = useState<boolean>(true);
  const [selectedCrawlerIds, setSelectedCrawlerIds] = useState<Set<string>>(new Set());

  // Fetch routing / redirect URLs containing AI crawl rules
  const { data: redirectUrls, isLoading } = useQuery<any>({
    queryKey: ["/api/user/redirect-urls"],
    refetchOnMount: true,
  });

  // Fetch classifications for live telemetry
  const { data: classifications = [] } = useQuery<any[]>({
    queryKey: ["/api/user/classifications"],
    refetchInterval: 30000,
  });

  // Parse allowedAiBots list from backend
  const allowedBotsList = useMemo<string[]>(() => {
    if (!redirectUrls?.allowedAiBots) return [];
    return redirectUrls.allowedAiBots
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);
  }, [redirectUrls?.allowedAiBots]);

  // Global AI toggle: "block" (default shield), "allow" (allow all), or "custom"
  const globalAiPolicy = redirectUrls?.blockAiCrawlers ?? "block";

  // Parse custom user-defined bots
  const customSecurityBots = useMemo<CloudflareSecurityCrawler[]>(() => {
    if (!redirectUrls?.customAiBots) return [];
    try {
      const parsed = JSON.parse(redirectUrls.customAiBots);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          id: item.id || `custom_${item.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
          crawler: item.name,
          operator: item.company || "Custom Operator",
          operatorKey: "custom",
          category: (item.category as any) || "AI Crawler",
          tokens: [item.pattern],
          description: `Custom user-defined rule targeting User-Agent token: "${item.pattern}".`,
          defaultInOverview: false,
        }));
      }
    } catch {
      // fallback
    }
    return [];
  }, [redirectUrls?.customAiBots]);

  // Combined full registry of security crawlers
  const allSecurityCrawlers = useMemo<CloudflareSecurityCrawler[]>(() => {
    return [...CLOUDFLARE_SECURITY_CRAWLERS, ...customSecurityBots];
  }, [customSecurityBots]);

  // Distinct operators list for filter dropdown
  const distinctOperators = useMemo<string[]>(() => {
    const set = new Set<string>();
    allSecurityCrawlers.forEach((c) => set.add(c.operator));
    return Array.from(set).sort();
  }, [allSecurityCrawlers]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      blockAiCrawlers?: string;
      allowedAiBots?: string;
      customAiBots?: string;
      botUrl?: string;
    }) => {
      const current = redirectUrls || {};
      const body = {
        humanUrl: current.humanUrl || "https://yourdomain.com",
        botUrl: payload.botUrl ?? current.botUrl ?? "",
        allowedCountries: current.allowedCountries || "ALL",
        allowedDevices: current.allowedDevices || "all",
        desktopOsFilter: current.desktopOsFilter || "both",
        blockVpn: current.blockVpn || "block",
        blockDatacenter: current.blockDatacenter || "block",
        blockTor: current.blockTor || "block",
        fingerprintActivate: current.fingerprintActivate || "enabled",
        wildcardSubdomains: current.wildcardSubdomains || "disabled",
        allowSearchCrawlers: current.allowSearchCrawlers || "allow",
        blockAiCrawlers: payload.blockAiCrawlers ?? current.blockAiCrawlers ?? "block",
        allowedAiBots: payload.allowedAiBots !== undefined ? payload.allowedAiBots : (current.allowedAiBots || ""),
        customAiBots: payload.customAiBots !== undefined ? payload.customAiBots : (current.customAiBots || ""),
        allowSocialPreviews: current.allowSocialPreviews || "allow",
        protectionMode: current.protectionMode || "hybrid",
        activeAdPlatforms: current.activeAdPlatforms || "google,meta,tiktok,microsoft,x",
      };
      return await apiRequest("PUT", "/api/user/redirect-urls", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
      toast({
        title: "AI Crawl Control Synchronized",
        description: "Your crawler access policies were updated across all edge evaluation nodes.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update AI crawl configuration",
        variant: "destructive",
      });
    },
  });

  // Helper: check if a specific crawler is currently blocked
  const isCrawlerBlocked = (crawlerId: string, tokens: string[]) => {
    if (globalAiPolicy === "allow") return false;
    const isAllowed = allowedBotsList.some((allowed) => {
      const low = allowed.toLowerCase();
      return (
        low === crawlerId.toLowerCase() ||
        tokens.some((tok) => low.includes(tok.toLowerCase()) || tok.toLowerCase().includes(low))
      );
    });
    return !isAllowed;
  };

  // Helper: toggle block crawler switch (ON = Blocked, OFF = Allowed)
  const toggleBlockCrawler = (crawlerId: string, tokens: string[]) => {
    const currentlyBlocked = isCrawlerBlocked(crawlerId, tokens);
    const lowerId = crawlerId.toLowerCase();
    let updatedList: string[];

    if (currentlyBlocked) {
      // User is turning switch OFF (Allowing the crawler) -> Add to allowed
      const toAdd = [lowerId, ...tokens.map((t) => t.toLowerCase())];
      const merged = new Set([...allowedBotsList, ...toAdd]);
      updatedList = Array.from(merged);
    } else {
      // User is turning switch ON (Blocking the crawler) -> Remove from allowed
      const tokenSet = new Set([lowerId, ...tokens.map((t) => t.toLowerCase())]);
      updatedList = allowedBotsList.filter((id) => !tokenSet.has(id));
    }

    saveMutation.mutate({
      allowedAiBots: updatedList.join(","),
    });
  };

  // Bulk actions on selected checkboxes
  const handleBulkBlock = () => {
    if (selectedCrawlerIds.size === 0) return;
    const toBlockTokens = new Set<string>();
    allSecurityCrawlers
      .filter((c) => selectedCrawlerIds.has(c.id))
      .forEach((c) => {
        toBlockTokens.add(c.id.toLowerCase());
        c.tokens.forEach((t) => toBlockTokens.add(t.toLowerCase()));
      });

    const updated = allowedBotsList.filter((id) => !toBlockTokens.has(id));
    saveMutation.mutate({
      allowedAiBots: updated.join(","),
    });
    setSelectedCrawlerIds(new Set());
  };

  const handleBulkAllow = () => {
    if (selectedCrawlerIds.size === 0) return;
    const updated = new Set(allowedBotsList);
    allSecurityCrawlers
      .filter((c) => selectedCrawlerIds.has(c.id))
      .forEach((c) => {
        updated.add(c.id.toLowerCase());
        c.tokens.forEach((t) => updated.add(t.toLowerCase()));
      });
    saveMutation.mutate({
      allowedAiBots: Array.from(updated).join(","),
    });
    setSelectedCrawlerIds(new Set());
  };

  // DYNAMIC OVERVIEW OPERATORS:
  // Shows 10 core operators + any unlisted crawler enabled in Security
  const overviewOperators = useMemo(() => {
    const defaultIds = new Set(DEFAULT_TOP_AI_OPERATORS.map((op) => op.id));
    const result = [...DEFAULT_TOP_AI_OPERATORS];

    // Find all non-default crawlers from security directory that are currently allowed
    const extraAllowed = allSecurityCrawlers.filter((cr) => {
      const isBlocked = isCrawlerBlocked(cr.id, cr.tokens);
      return !defaultIds.has(cr.operatorKey) && !isBlocked;
    }).map((cr) => ({
      id: cr.id,
      name: cr.crawler,
      company: cr.operator,
      primaryBot: cr.tokens[0],
      otherBots: cr.tokens.slice(1),
      category: "training" as const,
      categoryLabel: cr.category,
      description: cr.description,
      defaultInOverview: false,
    }));

    return [...result, ...extraAllowed];
  }, [allSecurityCrawlers, allowedBotsList, globalAiPolicy]);

  // Real traffic metrics computation tied to user API key activity
  const timeWindowMs = 
    timeRange === "24h" ? 24 * 60 * 60 * 1000 :
    timeRange === "30d" ? 30 * 24 * 60 * 60 * 1000 :
    7 * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - timeWindowMs;

  const activeClassifications = useMemo(() => {
    return classifications.filter((c) => {
      const t = c.timestamp ? new Date(c.timestamp).getTime() : 0;
      return t >= cutoffTime;
    });
  }, [classifications, cutoffTime]);

  const crawlerMetrics = useMemo(() => {
    const map: Record<string, { allowed: number; blocked: number; total: number; buckets: number[] }> = {};

    allSecurityCrawlers.forEach((item) => {
      const lowTokens = item.tokens.map((t) => t.toLowerCase());
      const lowId = item.id.toLowerCase();
      const lowCrawler = item.crawler.toLowerCase();
      const matches = activeClassifications.filter((c) => {
        const ua = (c.userAgent || "").toLowerCase();
        const dm = (c.detectionMethod || "").toLowerCase();
        const br = (c.blockReason || "").toLowerCase();
        return (
          lowTokens.some((tok) => ua.includes(tok) || dm.includes(tok) || br.includes(tok)) ||
          ua.includes(lowId) ||
          dm.includes(lowId) ||
          ua.includes(lowCrawler) ||
          dm.includes(lowCrawler)
        );
      });

      const allowed = matches.filter((c) => c.visitorType === "Human").length;
      const blocked = matches.filter((c) => c.visitorType === "Bot").length;

      // 7 sparkline points across the time window
      const buckets = [0, 0, 0, 0, 0, 0, 0];
      matches.forEach((c) => {
        const t = c.timestamp ? new Date(c.timestamp).getTime() : 0;
        const age = Math.max(0, Date.now() - t);
        const idx = Math.min(6, Math.max(0, 6 - Math.floor((age / timeWindowMs) * 7)));
        buckets[idx]++;
      });

      map[item.id] = { allowed, blocked, total: matches.length, buckets };
    });

    return map;
  }, [allSecurityCrawlers, activeClassifications, timeWindowMs]);

  // Filtered crawlers for the Security table
  const filteredSecurityCrawlers = useMemo(() => {
    return allSecurityCrawlers.filter((cr) => {
      // Crawler filter
      if (selectedCrawlerFilter !== "all" && cr.id !== selectedCrawlerFilter) {
        return false;
      }

      // Operator filter
      if (selectedOperatorFilter !== "all" && cr.operator.toLowerCase() !== selectedOperatorFilter.toLowerCase()) {
        return false;
      }

      // Category filter
      if (selectedCategoryFilter !== "all" && cr.category !== selectedCategoryFilter) {
        return false;
      }

      // Inactive filter
      if (!showInactive) {
        const metrics = crawlerMetrics[cr.id];
        if (!metrics || metrics.total === 0) {
          return false;
        }
      }

      return true;
    });
  }, [allSecurityCrawlers, selectedCrawlerFilter, selectedOperatorFilter, selectedCategoryFilter, showInactive, crawlerMetrics]);

  // Bulk selection toggles
  const allFilteredSelected = 
    filteredSecurityCrawlers.length > 0 &&
    filteredSecurityCrawlers.every((cr) => selectedCrawlerIds.has(cr.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedCrawlerIds(new Set());
    } else {
      setSelectedCrawlerIds(new Set(filteredSecurityCrawlers.map((c) => c.id)));
    }
  };

  const toggleSelectCrawler = (id: string) => {
    setSelectedCrawlerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Telemetry summary
  const telemetry = useMemo(() => {
    const aiHits = classifications.filter((c) => {
      const method = (c.detectionMethod || "").toLowerCase();
      const userAgent = (c.userAgent || "").toLowerCase();
      return (
        method.includes("ai crawler") ||
        method.includes("ai scraper") ||
        userAgent.includes("gptbot") ||
        userAgent.includes("claudebot") ||
        userAgent.includes("perplexity") ||
        userAgent.includes("bytespider") ||
        userAgent.includes("ccbot") ||
        userAgent.includes("applebot")
      );
    });

    const blocked = aiHits.filter((c) => c.visitorType === "Bot").length;
    const allowed = aiHits.filter((c) => c.visitorType === "Human").length;

    return {
      totalHits: aiHits.length,
      blocked,
      allowed,
      activeRules: allSecurityCrawlers.length,
    };
  }, [classifications, allSecurityCrawlers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BRAND HEADER (Clean Isolated Page Identity)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5EAE7] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#064E3B] border border-[#047857] flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                AI Crawl Control
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {isOverview ? "Overview" : "Security"}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl">
              {isOverview
                ? "Zero-latency edge shielding against unapproved AI model training scrapers, with active top operator preview."
                : "Manage granular bot permissions, configure deflection status codes, and analyze live crawler requests."}
            </p>
          </div>
        </div>

        {/* Current Page Context Badge (No side-by-side pills) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0A5C48]" />
            <span>{isOverview ? "Overview Page" : "Security Governance"}</span>
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. GLOBAL METRICS & TELEMETRY CARDS (Clean Neutral Style)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total AI Requests */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total AI Crawl Hits
            </div>
            <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
              {telemetry.totalHits}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Recorded in visitor logs
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <Bot className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Scrapers Blocked */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              AI Scrapers Deflected
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">
              {telemetry.blocked}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              Shielded from training theft
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Allowed Crawlers */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Authorized AI Crawlers
            </div>
            <div className="text-2xl font-extrabold text-[#0A5C48] mt-1">
              {telemetry.allowed}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Citation & search permitted
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0A5C48]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Global Policy */}
        <div className="bg-white border border-[#E5EAE7] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              AI Shielding Posture
            </div>
            <div className="text-sm font-bold text-[#0F172A] mt-1">
              {globalAiPolicy === "block" ? "Protected (Shield Active)" : "Permissive (All Allowed)"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {allowedBotsList.length} crawler{allowedBotsList.length === 1 ? "" : "s"} allowed
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0A5C48]">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. VIEW 1: AI CRAWL OVERVIEW (TOP OPERATOR GRID + DYNAMIC PREVIEW)
      ───────────────────────────────────────────────────────────── */}
      {isOverview && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Neutral Integration Callout */}
          <div className="bg-[#F8FAF9] border border-[#D5DFD9] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E6F2ED] border border-[#CCE5DB] flex items-center justify-center text-[#0A5C48] shrink-0">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F172A]">
                  Universal Platform Integration & Dynamic AI Preview
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  CleanTraffic operates without requiring DNS domain transfers. Allowed AI crawlers bypass all geo-fencing and device restrictions (like verified ad reviewers). Disallowed crawlers follow your configured Bot Deflection rule ({redirectUrls?.botUrl ? `"${redirectUrls.botUrl}"` : "e.g. 404, 403, or custom URL"}).
                </div>
              </div>
            </div>
            {onNavigateTab && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab("aicrawl-security")}
                className="h-8 px-3 text-xs font-bold text-[#0A5C48] border-[#CCE5DB] hover:bg-emerald-50 shrink-0"
              >
                Manage in Security <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5EAE7] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                <span>Top AI Crawler Operators</span>
                <span className="text-[11px] font-semibold text-[#64748B]">
                  ({overviewOperators.length} in preview)
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Active crawler engines and model scrapers evaluated against your site. Allowing an unlisted crawler in Security automatically adds it to this preview grid.
              </p>
            </div>
            {onNavigateTab && (
              <Button
                type="button"
                size="sm"
                onClick={() => onNavigateTab("aicrawl-security")}
                className="h-8 px-3.5 text-xs font-bold bg-[#0A5C48] hover:bg-[#064E3B] text-white rounded-lg shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Configure in Security</span>
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </Button>
            )}
          </div>

          {/* Responsive Grid of Cards for Top AI Crawler Operators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {overviewOperators.map((operator) => {
              const allowed = !isCrawlerBlocked(operator.id, [operator.primaryBot, ...(operator.otherBots || [])]);
              const hasMultiple = operator.otherBots && operator.otherBots.length > 0;
              const isDynamicExtra = !operator.defaultInOverview;

              return (
                <div
                  key={operator.id}
                  className={`bg-white border rounded-xl p-4 flex flex-col justify-between space-y-3.5 transition-all shadow-xs hover:shadow-sm ${
                    allowed ? "border-emerald-200/80 bg-emerald-50/10" : "border-[#E5EAE7]"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row: Operator Avatar + Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F3] border border-[#D5DFD9] flex items-center justify-center font-bold text-xs text-[#0A5C48] shrink-0">
                          {operator.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#0F172A] leading-tight">
                            {operator.name}
                          </div>
                          <div className="text-[10px] text-[#64748B] font-medium">
                            {operator.company}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          allowed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {allowed ? "Allowed" : "Blocked"}
                      </span>
                    </div>

                    {/* Bot Badges (e.g. GPTBot, +2) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#F1F5F3] border border-[#D5DFD9] text-[#0A5C48] font-semibold">
                        {operator.primaryBot}
                      </span>
                      {hasMultiple && (
                        <span 
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600"
                          title={operator.otherBots?.join(", ")}
                        >
                          +{operator.otherBots?.length}
                        </span>
                      )}
                      {isDynamicExtra && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          Added from Security
                        </span>
                      )}
                    </div>

                    {/* Category & Description */}
                    <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                      {operator.description}
                    </p>
                  </div>

                  {/* Footer Row: Clean Informative Policy Note & Security Link */}
                  <div className="pt-2.5 border-t border-[#E5EAE7] flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      {allowed ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>Bypasses rules</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Governed by policy
                        </span>
                      )}
                    </span>
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab("aicrawl-security")}
                        className="text-[11px] font-bold text-[#0A5C48] hover:text-[#064E3B] hover:underline flex items-center gap-0.5 transition-colors cursor-pointer"
                      >
                        <span>Manage</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. VIEW 2: AI CRAWL SECURITY (CLOUDFLARE-ALIGNED ARCHITECTURE)
      ───────────────────────────────────────────────────────────── */}
      {isSecurity && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Controls Bar: Select Crawler, Select Operator, Add Filter, Date Range & Inactive Toggle */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left Selectors */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Select Crawler Dropdown */}
                <div className="relative min-w-[170px]">
                  <select
                    value={selectedCrawlerFilter}
                    onChange={(e) => setSelectedCrawlerFilter(e.target.value)}
                    className="w-full h-8 px-2.5 pr-8 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 font-medium appearance-none focus:outline-none focus:border-[#0A5C48] cursor-pointer"
                  >
                    <option value="all">Select crawler (All)</option>
                    {allSecurityCrawlers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.crawler}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Select Operator Dropdown */}
                <div className="relative min-w-[160px]">
                  <select
                    value={selectedOperatorFilter}
                    onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                    className="w-full h-8 px-2.5 pr-8 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 font-medium appearance-none focus:outline-none focus:border-[#0A5C48] cursor-pointer"
                  >
                    <option value="all">Select operator (All)</option>
                    {distinctOperators.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Add Filter (Category Selector) */}
                <div className="relative min-w-[150px]">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full h-8 px-2.5 pr-8 bg-white border border-[#D5DFD9] rounded-lg text-xs text-slate-800 font-medium appearance-none focus:outline-none focus:border-[#0A5C48] cursor-pointer"
                  >
                    <option value="all">+ Add filter (Category)</option>
                    <option value="AI Search">AI Search</option>
                    <option value="AI Crawler">AI Crawler</option>
                    <option value="Archiver">Archiver</option>
                    <option value="AI Assistant">AI Assistant</option>
                    <option value="Search Engine Crawler">Search Engine Crawler</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Date Range Selector with Calendar Icon */}
                <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[#D5DFD9] bg-white text-xs font-medium text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {(selectedCrawlerFilter !== "all" || selectedOperatorFilter !== "all" || selectedCategoryFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCrawlerFilter("all");
                      setSelectedOperatorFilter("all");
                      setSelectedCategoryFilter("all");
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-900 underline px-1 cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Right: Inactive crawlers checkbox */}
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="font-medium text-[11px] text-slate-800">Show inactive crawlers</span>
                  <span title="Display registered crawlers even if they have 0 requests in the selected period" className="text-slate-400">
                    <Info className="h-3.5 w-3.5" />
                  </span>
                </label>
              </div>
            </div>

            {/* Bulk Action Bar (when rows are selected) */}
            {selectedCrawlerIds.size > 0 && (
              <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs animate-in fade-in-50 duration-150">
                <span className="font-semibold text-emerald-900">
                  {selectedCrawlerIds.size} crawler{selectedCrawlerIds.size === 1 ? "" : "s"} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleBulkBlock}
                    disabled={saveMutation.isPending}
                    className="h-7 px-2.5 text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    Block Selected
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleBulkAllow}
                    disabled={saveMutation.isPending}
                    className="h-7 px-2.5 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  >
                    Allow Selected
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedCrawlerIds(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cloudflare-Aligned Security Crawler Directory Table */}
          <div className="bg-white border border-[#E5EAE7] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5EAE7] bg-[#F8FAF9] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold text-slate-600">Crawler</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">Category</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">Requests</th>
                    <th className="py-3 px-4 font-semibold text-slate-600 text-right">Block Crawler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAE7]">
                  {filteredSecurityCrawlers.map((cr) => {
                    const isBlocked = isCrawlerBlocked(cr.id, cr.tokens);
                    const stats = crawlerMetrics[cr.id] || { allowed: 0, blocked: 0, buckets: [0, 0, 0, 0, 0, 0, 0] };
                    const isSelected = selectedCrawlerIds.has(cr.id);
                    const isCustom = cr.id.startsWith("custom_");

                    return (
                      <tr
                        key={cr.id}
                        className={`transition-colors ${
                          isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCrawler(cr.id)}
                            className="rounded border-slate-300 text-[#0A5C48] focus:ring-[#0A5C48] h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>

                        {/* Crawler (Name + Operator underneath) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#F1F5F3] border border-[#D5DFD9] flex items-center justify-center font-bold text-[11px] text-[#0A5C48] shrink-0">
                              {cr.operator.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#0F172A] leading-tight flex items-center gap-1.5">
                                <span>{cr.crawler}</span>
                                {isCustom && (
                                  <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#64748B] font-medium">
                                {cr.operator}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeStyle(
                              cr.category
                            )}`}
                          >
                            {cr.category}
                          </span>
                        </td>

                        {/* Requests: Real Sparkline + Allowed: X, Blocked: Y */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3.5">
                            <Sparkline data={stats.buckets} />
                            <div className="text-[11px] leading-tight space-y-0.5">
                              <div className="text-slate-600 font-medium flex items-center gap-1.5">
                                <span>Allowed:</span>
                                <strong className="font-bold text-slate-900">{stats.allowed}</strong>
                              </div>
                              <div className="text-slate-600 font-medium flex items-center gap-1.5">
                                <span>Blocked:</span>
                                <strong className={`font-bold ${stats.blocked > 0 ? "text-rose-700" : "text-slate-900"}`}>
                                  {stats.blocked}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Block Crawler: Switch Toggle */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isBlocked
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {isBlocked ? "Blocked" : "Allowed"}
                            </span>

                            <Switch
                              checked={isBlocked}
                              onCheckedChange={() => toggleBlockCrawler(cr.id, cr.tokens)}
                              disabled={saveMutation.isPending}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSecurityCrawlers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center space-y-2">
                        <Bot className="h-8 w-8 text-slate-300 mx-auto" />
                        <div className="text-xs font-semibold text-slate-700">
                          No crawlers match your current filters
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Try clearing active filters or enable &quot;Show inactive crawlers&quot;.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
