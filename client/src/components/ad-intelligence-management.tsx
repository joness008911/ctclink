import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  Plus, 
  RotateCcw, 
  Play, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Edit3, 
  Trash2, 
  Network, 
  Bot, 
  Key, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Info,
  Server,
  Zap,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface SerializableAdPlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
  clickTokens: string[];
  crawlerPatterns: string[];
  asns: number[];
  asnKeywords: string[];
  validHostnameRegex?: string;
  description?: string;
}

interface AdPlatformsResponse {
  platforms: SerializableAdPlatformConfig[];
  stats: {
    totalPlatforms: number;
    activePlatforms: number;
    totalBotPatterns: number;
    totalClickTokens: number;
    totalVerifiedAsns: number;
  };
}

export default function AdIntelligenceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [deletePlatformId, setDeletePlatformId] = useState<string | null>(null);

  // Editing form state
  const [editingPlatform, setEditingPlatform] = useState<SerializableAdPlatformConfig | null>(null);

  // Sandbox Tester states
  const [testIp, setTestIp] = useState("66.249.66.1");
  const [testUserAgent, setTestUserAgent] = useState("Mozilla/5.0 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)");
  const [testAsn, setTestAsn] = useState("15169");
  const [testAsnOrg, setTestAsnOrg] = useState("Google LLC");
  const [testUrlOrQuery, setTestUrlOrQuery] = useState("https://example.com/landing?gclid=CjwKCAjw07&utm_source=google&utm_medium=cpc");
  const [testResult, setTestResult] = useState<any | null>(null);

  // Form inputs for Add / Edit
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formClickTokens, setFormClickTokens] = useState("");
  const [formCrawlerPatterns, setFormCrawlerPatterns] = useState("");
  const [formAsns, setFormAsns] = useState("");
  const [formAsnKeywords, setFormAsnKeywords] = useState("");
  const [formHostnameRegex, setFormHostnameRegex] = useState("");

  // 1. Fetch Ad Platforms
  const { data, isLoading, isError, refetch } = useQuery<AdPlatformsResponse>({
    queryKey: ["/api/interface/ad-platforms"],
  });

  const platforms = data?.platforms || [];
  const stats = data?.stats || {
    totalPlatforms: 0,
    activePlatforms: 0,
    totalBotPatterns: 0,
    totalClickTokens: 0,
    totalVerifiedAsns: 0,
  };

  // 2. Save Platforms Mutation
  const savePlatformsMutation = useMutation({
    mutationFn: async (updatedList: SerializableAdPlatformConfig[]) => {
      return apiRequest("POST", "/api/interface/ad-platforms", { platforms: updatedList });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interface/ad-platforms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-platforms"] });
      toast({
        title: "Configuration Saved",
        description: "Ad intelligence platform settings updated successfully.",
      });
      setIsEditDialogOpen(false);
      setIsAddDialogOpen(false);
      setEditingPlatform(null);
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to update ad platforms.",
        variant: "destructive",
      });
    },
  });

  // 3. Reset to Defaults Mutation
  const resetPlatformsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/interface/ad-platforms/reset", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interface/ad-platforms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-platforms"] });
      setIsResetConfirmOpen(false);
      toast({
        title: "Reset Completed",
        description: "Ad platforms restored to default factory definitions.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Reset Failed",
        description: err.message || "Could not reset ad platforms.",
        variant: "destructive",
      });
    },
  });

  // 4. Sandbox Test Verification Mutation
  const testVerificationMutation = useMutation({
    mutationFn: async (payload: {
      ip: string;
      userAgent: string;
      asn?: number;
      asnOrg?: string;
      urlOrQuery?: string;
    }) => {
      const res = await apiRequest("POST", "/api/interface/ad-platforms/test", payload);
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({
        title: "Simulation Finished",
        description: "Verification engine analyzed payload successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Simulation Error",
        description: err.message || "Verification test failed to run.",
        variant: "destructive",
      });
    },
  });

  // Handle Quick Toggle (Active/Disabled)
  const handleTogglePlatform = (id: string, currentStatus: boolean) => {
    const updated = platforms.map((p) => {
      if (p.id === id) {
        return { ...p, enabled: !currentStatus };
      }
      return p;
    });
    savePlatformsMutation.mutate(updated);
  };

  // Open Edit Dialog
  const handleOpenEdit = (p: SerializableAdPlatformConfig) => {
    setEditingPlatform(p);
    setFormId(p.id);
    setFormName(p.name);
    setFormDescription(p.description || "");
    setFormEnabled(p.enabled !== false);
    setFormClickTokens(p.clickTokens.join(", "));
    setFormCrawlerPatterns(p.crawlerPatterns.join("\n"));
    setFormAsns(p.asns.join(", "));
    setFormAsnKeywords(p.asnKeywords.join(", "));
    setFormHostnameRegex(p.validHostnameRegex || "");
    setIsEditDialogOpen(true);
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingPlatform(null);
    setFormId("");
    setFormName("");
    setFormDescription("");
    setFormEnabled(true);
    setFormClickTokens("");
    setFormCrawlerPatterns("");
    setFormAsns("");
    setFormAsnKeywords("");
    setFormHostnameRegex("");
    setIsAddDialogOpen(true);
  };

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlatform) return;

    const parsedTokens = formClickTokens
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const parsedCrawlers = formCrawlerPatterns
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter(Boolean);

    const parsedAsns = formAsns
      .split(",")
      .map((a) => parseInt(a.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const parsedAsnKeywords = formAsnKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const updated = platforms.map((p) => {
      if (p.id === editingPlatform.id) {
        return {
          ...p,
          name: formName.trim(),
          description: formDescription.trim(),
          enabled: formEnabled,
          clickTokens: parsedTokens,
          crawlerPatterns: parsedCrawlers,
          asns: parsedAsns,
          asnKeywords: parsedAsnKeywords,
          validHostnameRegex: formHostnameRegex.trim() || undefined,
        };
      }
      return p;
    });

    savePlatformsMutation.mutate(updated);
  };

  // Submit Add
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = formId.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (!cleanId) {
      toast({
        title: "Validation Error",
        description: "Please specify a valid alphanumeric platform ID.",
        variant: "destructive",
      });
      return;
    }

    if (platforms.some((p) => p.id === cleanId)) {
      toast({
        title: "Duplicate Platform",
        description: `Platform with ID "${cleanId}" already exists.`,
        variant: "destructive",
      });
      return;
    }

    const parsedTokens = formClickTokens
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const parsedCrawlers = formCrawlerPatterns
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter(Boolean);

    const parsedAsns = formAsns
      .split(",")
      .map((a) => parseInt(a.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const parsedAsnKeywords = formAsnKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const newPlatform: SerializableAdPlatformConfig = {
      id: cleanId,
      name: formName.trim() || cleanId,
      description: formDescription.trim() || undefined,
      enabled: formEnabled,
      clickTokens: parsedTokens,
      crawlerPatterns: parsedCrawlers,
      asns: parsedAsns,
      asnKeywords: parsedAsnKeywords,
      validHostnameRegex: formHostnameRegex.trim() || undefined,
    };

    savePlatformsMutation.mutate([...platforms, newPlatform]);
  };

  // Delete Platform
  const handleConfirmDelete = () => {
    if (!deletePlatformId) return;
    const updated = platforms.filter((p) => p.id !== deletePlatformId);
    savePlatformsMutation.mutate(updated);
    setDeletePlatformId(null);
  };

  // Run Sandbox Test
  const handleRunTest = () => {
    if (!testIp.trim()) {
      toast({
        title: "Missing IP",
        description: "Please enter an IP address to test.",
        variant: "destructive",
      });
      return;
    }

    testVerificationMutation.mutate({
      ip: testIp.trim(),
      userAgent: testUserAgent.trim(),
      asn: testAsn ? parseInt(testAsn, 10) : undefined,
      asnOrg: testAsnOrg.trim() || undefined,
      urlOrQuery: testUrlOrQuery.trim() || undefined,
    });
  };

  // Filtered platforms for display
  const filteredPlatforms = platforms.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.clickTokens.some((t) => t.toLowerCase().includes(q)) ||
      p.crawlerPatterns.some((c) => c.toLowerCase().includes(q)) ||
      p.asnKeywords.some((k) => k.toLowerCase().includes(q)) ||
      p.asns.some((a) => a.toString().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Ad Intelligence & Platform Registry
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Configure supported advertising networks, attribution click identifiers (GCLID, FBCLID, TTCLID),
                verified reviewer bot signatures, and network security validation rules.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={resetPlatformsMutation.isPending}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="text-xs font-semibold"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Ad Platform
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Metric Cards Grid */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg border border-border/70">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Active Platforms</span>
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{stats.activePlatforms}</span>
                <span className="text-xs text-muted-foreground">/ {stats.totalPlatforms} total</span>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg border border-border/70">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Click Tokens</span>
                <Key className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{stats.totalClickTokens}</span>
                <span className="text-xs text-muted-foreground">GCLID, FBCLID, etc.</span>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg border border-border/70">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Reviewer Signatures</span>
                <Bot className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{stats.totalBotPatterns}</span>
                <span className="text-xs text-muted-foreground">verified crawlers</span>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg border border-border/70">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Verified ASNs</span>
                <Network className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{stats.totalVerifiedAsns}</span>
                <span className="text-xs text-muted-foreground">network routes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs: Platform List vs. Verification Simulator Sandbox */}
      <Tabs defaultValue="platforms" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="platforms" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Configured Platforms ({platforms.length})
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Test Bot / Click Simulator
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search platforms, tokens, ASNs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* TAB 1: Platforms List */}
        <TabsContent value="platforms" className="space-y-4 mt-0">
          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground border border-dashed">
              <Server className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p>Loading ad intelligence platform registry...</p>
            </Card>
          ) : filteredPlatforms.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border border-dashed">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="font-medium">No ad platforms found matching "{searchQuery}"</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs text-primary"
              >
                Clear search query
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPlatforms.map((platform) => {
                const isSystemDefault = ["google", "meta", "tiktok", "microsoft", "x"].includes(platform.id);
                return (
                  <Card 
                    key={platform.id} 
                    className={`border transition-all ${
                      platform.enabled 
                        ? "border-border shadow-sm hover:border-primary/40" 
                        : "border-border/60 bg-muted/20 opacity-75"
                    }`}
                  >
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base text-foreground">
                              {platform.name}
                            </span>
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                              {platform.id}
                            </Badge>
                            {platform.enabled ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          {platform.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">
                              {platform.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={platform.enabled}
                            onCheckedChange={() => handleTogglePlatform(platform.id, platform.enabled)}
                            disabled={savePlatformsMutation.isPending}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(platform)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {!isSystemDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletePlatformId(platform.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      {/* Click Tokens Section */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3 text-amber-500" />
                            Click Attribution Tokens ({platform.clickTokens.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {platform.clickTokens.map((token) => (
                            <Badge 
                              key={token} 
                              variant="secondary" 
                              className="font-mono text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium"
                            >
                              ?{token}=
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Verified Bot Signatures */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3 text-emerald-500" />
                            Verified Reviewer Signatures ({platform.crawlerPatterns.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {platform.crawlerPatterns.slice(0, 4).map((pattern) => (
                            <Badge 
                              key={pattern} 
                              variant="outline" 
                              className="text-[10px] font-mono bg-background text-foreground/80"
                            >
                              /{pattern}/i
                            </Badge>
                          ))}
                          {platform.crawlerPatterns.length > 4 && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              +{platform.crawlerPatterns.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Network & rDNS Verification Specs */}
                      <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 text-xs space-y-1.5 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Network className="h-3 w-3 text-indigo-500" />
                            ASNs:
                          </span>
                          <span className="font-semibold text-foreground">
                            {platform.asns.length > 0
                              ? platform.asns.map((a) => `AS${a}`).join(", ")
                              : "None specified"}
                          </span>
                        </div>

                        {platform.asnKeywords.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">ASN Match:</span>
                            <span className="text-foreground truncate max-w-[200px]">
                              {platform.asnKeywords.join(", ")}
                            </span>
                          </div>
                        )}

                        {platform.validHostnameRegex ? (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-emerald-500" />
                              Strict rDNS:
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[220px]" title={platform.validHostnameRegex}>
                              {platform.validHostnameRegex}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">rDNS Enforcement:</span>
                            <span className="text-muted-foreground">ASN-only validation</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Sandbox Test Simulator */}
        <TabsContent value="sandbox" className="space-y-4 mt-0">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Interactive Ad Bot & Click Attribution Simulator
              </CardTitle>
              <CardDescription className="text-sm">
                Test any incoming IP address, User-Agent header, and landing URL query against the live ad intelligence engine.
                Verify whether Google, Meta, TikTok, or Bing bots are recognized, authenticated, or flagged as spoofed impersonators.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Preset Test Scenarios */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Quick Test Presets:</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setTestIp("66.249.66.1");
                      setTestUserAgent("Mozilla/5.0 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)");
                      setTestAsn("15169");
                      setTestAsnOrg("Google LLC");
                      setTestUrlOrQuery("https://target.com/page?gclid=EAIaIQobChMI7_test123&utm_source=google");
                    }}
                  >
                    Google Ads Reviewer (Real)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setTestIp("185.220.101.5");
                      setTestUserAgent("Mozilla/5.0 (compatible; AdsBot-Google; +http://www.google.com/adsbot.html)");
                      setTestAsn("200000");
                      setTestAsnOrg("Tor Exit Node / Hosting Provider");
                      setTestUrlOrQuery("https://target.com/page?gclid=fake_click_123");
                    }}
                  >
                    Google Ads Bot Spoof (Hosting / Proxy IP)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setTestIp("31.13.127.1");
                      setTestUserAgent("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)");
                      setTestAsn("32934");
                      setTestAsnOrg("Meta Platforms, Inc.");
                      setTestUrlOrQuery("https://target.com/landing?fbclid=IwAR0b_meta_sample_token");
                    }}
                  >
                    Meta Reviewer & Paid Click
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setTestIp("72.14.204.10");
                      setTestUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1");
                      setTestAsn("7018");
                      setTestAsnOrg("AT&T Services");
                      setTestUrlOrQuery("https://target.com/product?ttclid=E_test_tiktok_paid_click_999&utm_source=tiktok");
                    }}
                  >
                    TikTok Real Visitor Click
                  </Button>
                </div>
              </div>

              {/* Input Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Visitor IP Address *</Label>
                  <Input
                    value={testIp}
                    onChange={(e) => setTestIp(e.target.value)}
                    placeholder="e.g. 66.249.66.1"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Autonomous System (ASN) Number & Org</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={testAsn}
                      onChange={(e) => setTestAsn(e.target.value)}
                      placeholder="e.g. 15169"
                      className="font-mono text-xs col-span-1"
                    />
                    <Input
                      value={testAsnOrg}
                      onChange={(e) => setTestAsnOrg(e.target.value)}
                      placeholder="e.g. Google LLC"
                      className="text-xs col-span-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Visitor User-Agent Header *</Label>
                  <Input
                    value={testUserAgent}
                    onChange={(e) => setTestUserAgent(e.target.value)}
                    placeholder="e.g. Mozilla/5.0 (compatible; AdsBot-Google...)"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Landing Page URL or Query String (Click Parameters)</Label>
                  <Input
                    value={testUrlOrQuery}
                    onChange={(e) => setTestUrlOrQuery(e.target.value)}
                    placeholder="https://mysite.com/shop?gclid=... or ?fbclid=..."
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleRunTest}
                disabled={testVerificationMutation.isPending}
                className="w-full font-semibold"
              >
                <Play className="h-4 w-4 mr-2" />
                {testVerificationMutation.isPending ? "Simulating Engine Check..." : "Execute Verification Test"}
              </Button>

              {/* Simulation Result Output */}
              {testResult && (
                <div className="mt-4 p-4 rounded-lg border border-border bg-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Engine Diagnostic Output
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono">
                      IP: {testIp}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Paid Click Identification */}
                    <div className="p-3 rounded-md bg-muted/40 border border-border/80 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        1. Paid Campaign Click Attribution
                      </div>
                      {testResult.clickInfo?.isAdClick ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500 text-white font-medium text-xs">
                              Paid Ad Click Detected
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              {testResult.clickInfo.platformName}
                            </span>
                          </div>
                          <div className="text-xs font-mono space-y-0.5 text-foreground/90">
                            <div>Token: <span className="text-amber-600 dark:text-amber-400">?{testResult.clickInfo.clickToken}=</span></div>
                            <div className="truncate">Click ID: <span className="text-muted-foreground">{testResult.clickInfo.clickId}</span></div>
                            {testResult.clickInfo.utmSource && (
                              <div>Source: {testResult.clickInfo.utmSource} | Campaign: {testResult.clickInfo.utmCampaign || 'N/A'}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          No ad click tracking parameters found (regular organic / direct visit).
                        </div>
                      )}
                    </div>

                    {/* Crawler Reviewer Verification Verdict */}
                    <div className="p-3 rounded-md bg-muted/40 border border-border/80 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        2. Compliance Reviewer Verification
                      </div>
                      {testResult.reviewerInfo?.isReviewer ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {testResult.reviewerInfo.isVerified ? (
                              <Badge className="bg-emerald-600 text-white font-medium text-xs flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Authenticated Ad Reviewer
                              </Badge>
                            ) : testResult.reviewerInfo.isSpoofed ? (
                              <Badge className="bg-destructive text-white font-medium text-xs flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Spoofed Ad Crawler (Impersonator)
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Unverified Crawler
                              </Badge>
                            )}
                            <span className="text-xs font-semibold">
                              {testResult.reviewerInfo.botName}
                            </span>
                          </div>

                          <div className="text-xs space-y-0.5 text-foreground">
                            <div>
                              Platform: <span className="font-medium">{testResult.reviewerInfo.platformName}</span>
                            </div>
                            <div>
                              Validation Method: <span className="font-mono uppercase font-medium">{testResult.reviewerInfo.verificationMethod}</span>
                              {testResult.reviewerInfo.resolvedHost && (
                                <span className="text-muted-foreground font-mono ml-1">({testResult.reviewerInfo.resolvedHost})</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground pt-1 italic">
                              "{testResult.reviewerInfo.reason}"
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          User-Agent does not match known ad review bots. Evaluated as standard client traffic.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Edit Platform */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Ad Platform: {editingPlatform?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update attribution tokens, verified bot signatures, and network security rules for this ad platform.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Platform Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Google Ads"
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Platform Identifier (Read-only)</Label>
                <Input
                  value={formId}
                  disabled
                  className="font-mono text-xs bg-muted"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Campaign channels and network description..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Enable Platform</Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, this platform will be active in user routing settings and traffic verification.
                </p>
              </div>
              <Switch
                checked={formEnabled}
                onCheckedChange={setFormEnabled}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Click Attribution Tokens (Comma-separated)
              </Label>
              <Input
                value={formClickTokens}
                onChange={(e) => setFormClickTokens(e.target.value)}
                placeholder="gclid, wbraid, gbraid"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Query string parameters that identify paid ad traffic from this network.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Crawler / Reviewer Bot Patterns (One per line or comma-separated)
              </Label>
              <Textarea
                rows={4}
                value={formCrawlerPatterns}
                onChange={(e) => setFormCrawlerPatterns(e.target.value)}
                placeholder="adsbot-google&#10;google-inspectiontool&#10;googlebot"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                User-Agent substring patterns matching official compliance and policy crawlers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Verified ASNs (Numbers)</Label>
                <Input
                  value={formAsns}
                  onChange={(e) => setFormAsns(e.target.value)}
                  placeholder="15169, 19527, 36040"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">ASN Name Keywords</Label>
                <Input
                  value={formAsnKeywords}
                  onChange={(e) => setFormAsnKeywords(e.target.value)}
                  placeholder="google, googlebot"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Valid Hostname Regex for Strict Reverse DNS (Optional)
              </Label>
              <Input
                value={formHostnameRegex}
                onChange={(e) => setFormHostnameRegex(e.target.value)}
                placeholder="e.g. \.(googlebot|google)\.com$"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Enforces PTR reverse DNS lookup so public cloud VPS instances cannot spoof official crawlers.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savePlatformsMutation.isPending}
              >
                {savePlatformsMutation.isPending ? "Saving..." : "Save Platform"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Add New Platform */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add New Ad Platform
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a new advertising network with its tracking parameters and compliance reviewer bot signatures.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Platform Display Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Pinterest Ads"
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Platform ID (Slug) *</Label>
                <Input
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="e.g. pinterest"
                  required
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Pinterest Promoted Pins & Shopping campaigns..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Enable Platform Immediately</Label>
                <p className="text-[11px] text-muted-foreground">
                  Makes this platform available to users and traffic verification right away.
                </p>
              </div>
              <Switch
                checked={formEnabled}
                onCheckedChange={setFormEnabled}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Click Attribution Tokens (Comma-separated)
              </Label>
              <Input
                value={formClickTokens}
                onChange={(e) => setFormClickTokens(e.target.value)}
                placeholder="e.g. epik, _epik"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Crawler Bot Patterns (One per line or comma-separated)
              </Label>
              <Textarea
                rows={3}
                value={formCrawlerPatterns}
                onChange={(e) => setFormCrawlerPatterns(e.target.value)}
                placeholder="pinterestbot&#10;pinterest-crawler"
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Verified ASNs (Comma-separated)</Label>
                <Input
                  value={formAsns}
                  onChange={(e) => setFormAsns(e.target.value)}
                  placeholder="e.g. 54113"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">ASN Name Keywords</Label>
                <Input
                  value={formAsnKeywords}
                  onChange={(e) => setFormAsnKeywords(e.target.value)}
                  placeholder="e.g. pinterest"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Valid Hostname Regex for Strict Reverse DNS (Optional)
              </Label>
              <Input
                value={formHostnameRegex}
                onChange={(e) => setFormHostnameRegex(e.target.value)}
                placeholder="e.g. \.pinterest\.com$"
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savePlatformsMutation.isPending}
              >
                {savePlatformsMutation.isPending ? "Creating..." : "Create Platform"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: Reset to Defaults Confirmation */}
      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Reset Ad Platforms to Defaults?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will restore Google Ads, Meta Ads, TikTok Ads, Microsoft Ads, and X Ads to their calibrated factory
              signatures and remove any custom added platforms or modified regex tokens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetPlatformsMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG: Delete Platform Confirmation */}
      <AlertDialog open={!!deletePlatformId} onOpenChange={(open) => !open && setDeletePlatformId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Custom Ad Platform?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete platform "{deletePlatformId}"? Users targeting this platform will no longer
              have its traffic automatically classified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Platform
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
