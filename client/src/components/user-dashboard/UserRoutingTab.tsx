import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Bot, 
  Lock, 
  Globe, 
  Activity, 
  Code, 
  ShieldAlert, 
  Server, 
  Sparkles, 
  Search, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  X, 
  Save, 
  Trash2, 
  Copy, 
  RotateCcw, 
  ArrowLeft, 
  Layers, 
  SlidersHorizontal, 
  Info, 
  ExternalLink, 
  Sliders, 
  AlertCircle, 
  Filter, 
  CheckCircle2, 
  Eye, 
  MoreVertical, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  FolderPlus, 
  ArrowRight,
  Zap,
  Fingerprint
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Ruleset, 
  RuleStep, 
  RuleCondition, 
  RuleField, 
  RuleOperator, 
  RuleAction, 
  HTTP_STATUS_OPTIONS, 
  PREMADE_RULE_TEMPLATES, 
  RULE_FIELD_DEFINITIONS 
} from "@shared/rulesEngine";

interface UserRoutingTabProps {
  isReadOnly?: boolean;
  onUpgradeClick?: () => void;
  onNavigateToAiCrawl?: () => void;
  onNavigateToSeoIndexers?: () => void;
  complianceStatus?: string;
  statusReason?: string | null;
}

export function UserRoutingTab({
  isReadOnly = false,
  onUpgradeClick,
  complianceStatus,
  statusReason,
}: UserRoutingTabProps) {
  const { toast } = useToast();

  const isRestrictedByCompliance = complianceStatus === "flagged" || complianceStatus === "pending";
  const effectiveReadOnly = isReadOnly || isRestrictedByCompliance;

  // View state: "directory" (Rules Engine list), "starter" (Choose template vs scratch), "canvas" (Workflow editor)
  const [activeView, setActiveView] = useState<"directory" | "starter" | "canvas">("directory");
  
  // Ruleset editor tab: "rules" (canvas) or "settings"
  const [editorTab, setEditorTab] = useState<"rules" | "settings">("rules");

  // Template picker modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateModalTab, setTemplateModalTab] = useState<"templates" | "scratch">("templates");

  // Directory search and filter
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "enabled" | "disabled">("all");

  // Current active ruleset being edited
  const [currentRuleset, setCurrentRuleset] = useState<Ruleset | null>(null);
  
  // Selected rule step in canvas for the right inspector drawer
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Dirty state tracker
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Zoom level state
  const [zoomLevel, setZoomLevel] = useState(1);

  // Redirect URLs and rulesets fetched from backend
  const { data: serverConfig, isLoading: isLoadingConfig } = useQuery<{
    humanUrl: string;
    botUrl: string;
    allowedCountries?: string;
    blockVpn?: string;
    rulesetsConfig?: string;
  }>({
    queryKey: ["/api/user/redirect-urls"],
    refetchOnMount: true,
  });

  // Target Destination URLs
  const [humanUrl, setHumanUrl] = useState("");
  const [botUrl, setBotUrl] = useState("");

  // All User Rulesets
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);

  // Initialize rulesets from serverConfig
  useEffect(() => {
    if (serverConfig) {
      setHumanUrl(serverConfig.humanUrl || "https://yourdomain.com");
      setBotUrl(serverConfig.botUrl || "403");

      if (serverConfig.rulesetsConfig) {
        try {
          const parsed = JSON.parse(serverConfig.rulesetsConfig);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRulesets(parsed);
            return;
          }
        } catch (e) {
          console.error("Failed to parse rulesetsConfig:", e);
        }
      }

      // Default seed ruleset: "Block bots" active out of the box
      const defaultTemplate = PREMADE_RULE_TEMPLATES[0];
      const seeded: Ruleset = {
        id: "rs_default_block_bots",
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        enabled: true,
        isDefault: true,
        templateId: defaultTemplate.id,
        tags: defaultTemplate.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rules: defaultTemplate.rules,
      };
      setRulesets([seeded]);
    }
  }, [serverConfig]);

  // Mutation to persist rulesets to backend
  const saveMutation = useMutation({
    mutationFn: async (updatedRulesets: Ruleset[]) => {
      // Find default or first active ruleset to sync legacy parameters
      const activeBotRule = updatedRulesets.find((r) => r.enabled);
      const hasVpnRule = activeBotRule?.rules.some((step) => 
        step.conditions.some((c) => c.field === "vpn" && c.value === "True")
      );

      const payload = {
        humanUrl: humanUrl.trim() || "https://yourdomain.com",
        botUrl: botUrl.trim() || "403",
        blockVpn: hasVpnRule ? "block" : "allow",
        rulesetsConfig: JSON.stringify(updatedRulesets),
      };

      const res = await apiRequest("PUT", "/api/user/redirect-urls", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
      setHasUnsavedChanges(false);
      toast({
        title: "Rules published successfully",
        description: "Your ruleset changes are now enforced live across all integration endpoints.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to save rules",
        description: err.message || "An error occurred while saving your ruleset.",
        variant: "destructive",
      });
    },
  });

  // Filtered rulesets for directory view
  const filteredRulesets = useMemo(() => {
    return rulesets.filter((r) => {
      if (directoryFilter === "enabled" && !r.enabled) return false;
      if (directoryFilter === "disabled" && r.enabled) return false;
      if (directorySearch.trim()) {
        const query = directorySearch.toLowerCase();
        return (
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          (r.tags && r.tags.some((t) => t.toLowerCase().includes(query)))
        );
      }
      return true;
    });
  }, [rulesets, directoryFilter, directorySearch]);

  // Active selected step in canvas
  const selectedStep = useMemo(() => {
    if (!currentRuleset || !selectedStepId) return null;
    return currentRuleset.rules.find((r) => r.id === selectedStepId) || null;
  }, [currentRuleset, selectedStepId]);

  // Open ruleset editor
  const handleOpenRuleset = (rs: Ruleset) => {
    setCurrentRuleset(JSON.parse(JSON.stringify(rs)));
    setSelectedStepId(rs.rules[0]?.id || null);
    setActiveView("canvas");
    setEditorTab("rules");
    setHasUnsavedChanges(false);
  };

  // Toggle ruleset enabled state in directory
  const handleToggleRulesetEnabled = (id: string, newEnabled: boolean) => {
    const updated = rulesets.map((r) => 
      r.id === id ? { ...r, enabled: newEnabled, updatedAt: new Date().toISOString() } : r
    );
    setRulesets(updated);
    saveMutation.mutate(updated);
  };

  // Delete ruleset
  const handleDeleteRuleset = (id: string) => {
    const updated = rulesets.filter((r) => r.id !== id);
    setRulesets(updated);
    saveMutation.mutate(updated);
    toast({
      title: "Ruleset removed",
      description: "The ruleset has been deleted from your deployment.",
    });
  };

  // Create ruleset from template
  const handleSelectTemplate = (templateId: string) => {
    const template = PREMADE_RULE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const newRuleset: Ruleset = {
      id: `rs_${template.id}_${Date.now()}`,
      name: template.name,
      description: template.description,
      enabled: true,
      templateId: template.id,
      tags: template.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rules: JSON.parse(JSON.stringify(template.rules)),
    };

    setCurrentRuleset(newRuleset);
    setSelectedStepId(newRuleset.rules[0]?.id || null);
    setShowTemplateModal(false);
    setActiveView("canvas");
    setEditorTab("rules");
    setHasUnsavedChanges(true);
  };

  // Create ruleset from scratch
  const handleStartFromScratch = () => {
    const newRuleset: Ruleset = {
      id: `rs_custom_${Date.now()}`,
      name: "My Custom Ruleset",
      description: "Custom rule definitions using real-time smart signals.",
      enabled: true,
      tags: ["Custom Defense"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rules: [
        {
          id: `step_${Date.now()}`,
          name: "Browser Bot is Bad",
          stepNumber: 2,
          enabled: true,
          conditions: [
            {
              id: `cond_${Date.now()}`,
              field: "bot_threat",
              operator: "is",
              value: "Bad",
            }
          ],
          action: "block_response",
          statusCode: 403,
          headers: [{ key: "Content-Type", value: "application/json" }],
          bodyType: "application/json",
          body: '{"message": "Blocked by rule"}',
        }
      ],
    };

    setCurrentRuleset(newRuleset);
    setSelectedStepId(newRuleset.rules[0]?.id || null);
    setShowTemplateModal(false);
    setActiveView("canvas");
    setEditorTab("rules");
    setHasUnsavedChanges(true);
  };

  // Save changes in canvas
  const handleSaveCurrentRuleset = () => {
    if (!currentRuleset) return;

    const existingIdx = rulesets.findIndex((r) => r.id === currentRuleset.id);
    let updated: Ruleset[];
    if (existingIdx !== -1) {
      updated = [...rulesets];
      updated[existingIdx] = { ...currentRuleset, updatedAt: new Date().toISOString() };
    } else {
      updated = [...rulesets, { ...currentRuleset, updatedAt: new Date().toISOString() }];
    }

    setRulesets(updated);
    saveMutation.mutate(updated);
  };

  // Add step to current ruleset
  const handleAddStep = () => {
    if (!currentRuleset) return;
    const newStepNumber = currentRuleset.rules.length + 2;
    const newStep: RuleStep = {
      id: `step_${Date.now()}`,
      name: `Step ${newStepNumber}. Block with response`,
      stepNumber: newStepNumber,
      enabled: true,
      conditions: [
        {
          id: `cond_${Date.now()}`,
          field: "vpn",
          operator: "is",
          value: "True",
        }
      ],
      action: "block_response",
      statusCode: 403,
      headers: [{ key: "Content-Type", value: "application/json" }],
      bodyType: "application/json",
      body: '{"message": "Blocked by rule"}',
    };

    const updatedRules = [...currentRuleset.rules, newStep];
    setCurrentRuleset({ ...currentRuleset, rules: updatedRules });
    setSelectedStepId(newStep.id);
    setHasUnsavedChanges(true);
  };

  // Delete step from current ruleset
  const handleDeleteStep = (stepId: string) => {
    if (!currentRuleset) return;
    const updatedRules = currentRuleset.rules.filter((r) => r.id !== stepId);
    // Re-index step numbers
    updatedRules.forEach((r, idx) => {
      r.stepNumber = idx + 2;
    });

    setCurrentRuleset({ ...currentRuleset, rules: updatedRules });
    if (selectedStepId === stepId) {
      setSelectedStepId(updatedRules[0]?.id || null);
    }
    setHasUnsavedChanges(true);
  };

  // Duplicate step
  const handleDuplicateStep = (stepId: string) => {
    if (!currentRuleset) return;
    const target = currentRuleset.rules.find((r) => r.id === stepId);
    if (!target) return;

    const duplicated: RuleStep = {
      ...JSON.parse(JSON.stringify(target)),
      id: `step_${Date.now()}`,
      name: `${target.name} (Copy)`,
      stepNumber: currentRuleset.rules.length + 2,
    };

    const updatedRules = [...currentRuleset.rules, duplicated];
    setCurrentRuleset({ ...currentRuleset, rules: updatedRules });
    setSelectedStepId(duplicated.id);
    setHasUnsavedChanges(true);
  };

  // Update selected step fields
  const handleUpdateStep = (updates: Partial<RuleStep>) => {
    if (!currentRuleset || !selectedStepId) return;
    const updatedRules = currentRuleset.rules.map((r) => 
      r.id === selectedStepId ? { ...r, ...updates } : r
    );
    setCurrentRuleset({ ...currentRuleset, rules: updatedRules });
    setHasUnsavedChanges(true);
  };

  // Add condition to selected step
  const handleAddCondition = () => {
    if (!selectedStep) return;
    const newCond: RuleCondition = {
      id: `cond_${Date.now()}`,
      field: "bot_threat",
      operator: "is",
      value: "Bad",
      logicalOp: "AND",
    };
    const updatedConditions = [...selectedStep.conditions, newCond];
    handleUpdateStep({ conditions: updatedConditions });
  };

  // Remove condition from selected step
  const handleRemoveCondition = (condId: string) => {
    if (!selectedStep) return;
    const updatedConditions = selectedStep.conditions.filter((c) => c.id !== condId);
    handleUpdateStep({ conditions: updatedConditions });
  };

  // Update specific condition
  const handleUpdateCondition = (condId: string, updates: Partial<RuleCondition>) => {
    if (!selectedStep) return;
    const updatedConditions = selectedStep.conditions.map((c) => 
      c.id === condId ? { ...c, ...updates } : c
    );
    handleUpdateStep({ conditions: updatedConditions });
  };

  // Add custom header to selected step
  const handleAddHeader = () => {
    if (!selectedStep) return;
    const updatedHeaders = [...selectedStep.headers, { key: "X-Protected-By", value: "CleanTraffic" }];
    handleUpdateStep({ headers: updatedHeaders });
  };

  // Remove custom header
  const handleRemoveHeader = (index: number) => {
    if (!selectedStep) return;
    const updatedHeaders = selectedStep.headers.filter((_, idx) => idx !== index);
    handleUpdateStep({ headers: updatedHeaders });
  };

  // Update custom header
  const handleUpdateHeader = (index: number, key: string, value: string) => {
    if (!selectedStep) return;
    const updatedHeaders = [...selectedStep.headers];
    updatedHeaders[index] = { key, value };
    handleUpdateStep({ headers: updatedHeaders });
  };

  // Helper icon for condition field
  const getFieldIcon = (field: RuleField) => {
    switch (field) {
      case "bot_threat": return <Bot className="h-3.5 w-3.5 text-blue-600" />;
      case "vpn": return <Shield className="h-3.5 w-3.5 text-emerald-600" />;
      case "datacenter": return <Server className="h-3.5 w-3.5 text-purple-600" />;
      case "country": return <Globe className="h-3.5 w-3.5 text-amber-600" />;
      case "velocity": return <Activity className="h-3.5 w-3.5 text-rose-600" />;
      case "ip_blocklist": return <Lock className="h-3.5 w-3.5 text-red-600" />;
      case "tor_proxy": return <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />;
      case "devtools": return <Code className="h-3.5 w-3.5 text-indigo-600" />;
      default: return <Bot className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // VIEW 1: RULES ENGINE DIRECTORY (Screenshot 3)
  // ═════════════════════════════════════════════════════════════════
  if (activeView === "directory") {
    return (
      <div className="w-full space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Rules Engine
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Deploy no-code rules to protect pages and API endpoints from bots, abuse, and fraud.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="default"
              size="sm"
              onClick={() => setActiveView("starter")}
              className="bg-[#0A5C48] hover:bg-[#084838] text-white text-xs font-semibold h-8.5 px-3.5 rounded-lg gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New ruleset</span>
            </Button>
          </div>
        </div>

        {/* Search Bar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-[#E2E8F0] rounded-xl shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search rulesets..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white rounded-lg"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setDirectoryFilter("all")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                directoryFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setDirectoryFilter("enabled")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                directoryFilter === "enabled"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Enabled
            </button>
            <button
              type="button"
              onClick={() => setDirectoryFilter("disabled")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                directoryFilter === "disabled"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Disabled
            </button>
          </div>
        </div>

        {/* Rulesets Table / List */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-12 py-3 px-5 border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-6 sm:col-span-7">Ruleset</div>
            <div className="col-span-3 sm:col-span-2 text-center">Status</div>
            <div className="col-span-3 sm:col-span-3 text-right">Deployment</div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredRulesets.map((rs) => (
              <div
                key={rs.id}
                className="grid grid-cols-12 items-center py-4 px-5 hover:bg-slate-50/70 transition-colors group"
              >
                {/* Column 1: Ruleset Info */}
                <div className="col-span-6 sm:col-span-7 pr-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenRuleset(rs)}
                      className="text-sm font-bold text-slate-900 hover:text-[#0A5C48] transition-colors text-left truncate"
                    >
                      {rs.name}
                    </button>
                    {rs.isDefault && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {rs.description}
                  </p>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                      {rs.rules.length} {rs.rules.length === 1 ? "rule" : "rules"} active
                    </span>
                    {rs.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Column 2: Status Toggle */}
                <div className="col-span-3 sm:col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rs.enabled}
                      onCheckedChange={(checked) => handleToggleRulesetEnabled(rs.id, checked)}
                      className="data-[state=checked]:bg-[#0A5C48]"
                    />
                    <span className={`text-xs font-semibold ${rs.enabled ? "text-emerald-700" : "text-slate-400"}`}>
                      {rs.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                {/* Column 3: Deployment Status & Actions */}
                <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Global Ingress</span>
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenRuleset(rs)}
                    className="h-8 text-xs border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-lg"
                  >
                    <span>Edit</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
                  </Button>

                  {!rs.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRuleset(rs.id)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete ruleset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredRulesets.length === 0 && (
              <div className="py-16 text-center text-slate-500">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Layers className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">No rulesets yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Create a ruleset to protect pages and API endpoints from bots, abuse, and fraud.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView("starter")}
                  className="text-xs font-semibold border-slate-300 gap-1.5 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5 text-[#0A5C48]" />
                  <span>New ruleset</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // VIEW 2: STARTER SCREEN ("How would you like to start?") (Screenshot 2)
  // ═════════════════════════════════════════════════════════════════
  if (activeView === "starter") {
    return (
      <div className="w-full min-h-[640px] flex flex-col pb-10">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView("directory")}
              className="text-slate-400 hover:text-slate-700 transition-colors text-xs flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Rules Engine</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-900">New Ruleset</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView("directory")}
              className="h-8 text-xs font-semibold text-slate-600 rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Center Prompt Canvas with subtle dot grid */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 border border-[#E2E8F0] rounded-xl bg-white relative overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }}
        >
          <div className="max-w-xl text-center mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              How would you like to start?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select a pre-built industry template or configure custom rule nodes from scratch.
            </p>
          </div>

          {/* Two Large Starter Cards (Matching Screenshot 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
            {/* Card 1: Use a template */}
            <div
              onClick={() => setShowTemplateModal(true)}
              className="bg-white border-2 border-slate-200 hover:border-[#0A5C48] rounded-2xl p-6 sm:p-8 cursor-pointer transition-all hover:shadow-md flex flex-col items-center text-center group"
            >
              <div className="w-24 h-16 bg-slate-50 rounded-xl border border-slate-200 p-2.5 flex flex-col gap-1.5 mb-5 group-hover:scale-105 transition-transform">
                <div className="w-full h-1 bg-slate-200 rounded" />
                <div className="w-3/4 h-1 bg-amber-400 rounded" />
                <div className="w-5/6 h-1 bg-blue-500 rounded" />
                <div className="w-2/3 h-1 bg-rose-500 rounded" />
              </div>

              <h4 className="text-base font-bold text-slate-900 group-hover:text-[#0A5C48] transition-colors">
                Use a template
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pre-built rules by industry and use case
              </p>
            </div>

            {/* Card 2: Start from scratch */}
            <div
              onClick={handleStartFromScratch}
              className="bg-white border-2 border-slate-200 hover:border-[#0A5C48] rounded-2xl p-6 sm:p-8 cursor-pointer transition-all hover:shadow-md flex flex-col items-center text-center group"
            >
              <div className="w-24 h-16 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform text-slate-400 group-hover:text-[#0A5C48]">
                <Plus className="h-6 w-6" />
              </div>

              <h4 className="text-base font-bold text-slate-900 group-hover:text-[#0A5C48] transition-colors">
                Start from scratch
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Build your own ruleset with Smart Signals
              </p>
            </div>
          </div>
        </div>

        {/* Modal: Template Picker (Screenshot 1) */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Top Bar */}
              <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => handleStartFromScratch()}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-900 pb-2 border-b-2 border-transparent transition-colors"
                  >
                    Start from scratch
                  </button>
                  <button
                    type="button"
                    className="text-sm font-bold text-[#0A5C48] pb-2 border-b-2 border-[#0A5C48]"
                  >
                    Templates
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="pl-9 h-9 text-xs border-slate-200 focus:border-[#0A5C48]"
                  />
                </div>
              </div>

              {/* Template Items List (Screenshot 1) */}
              <div className="p-4 space-y-3 overflow-y-auto max-h-[55vh]">
                {PREMADE_RULE_TEMPLATES.filter((tpl) => 
                  !templateSearch.trim() || 
                  tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  tpl.description.toLowerCase().includes(templateSearch.toLowerCase())
                ).map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className="border border-slate-200 hover:border-[#0A5C48] rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50/70 flex flex-col sm:flex-row sm:items-center gap-4 group"
                  >
                    {/* Visual Mini Diagram (Matching Screenshot 1) */}
                    <div className="w-28 h-14 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-center gap-1.5 shrink-0 px-2"
                      style={{
                        backgroundImage: "radial-gradient(#CBD5E1 0.75px, transparent 0.75px)",
                        backgroundSize: "6px 6px"
                      }}
                    >
                      <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <Globe className="h-3 w-3" />
                      </div>
                      <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        <Bot className="h-3 w-3" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        +{tpl.rules.length}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0A5C48] transition-colors">
                        {tpl.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {tpl.description}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {tpl.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#0A5C48] shrink-0 hidden sm:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // VIEW 3: INTERACTIVE FLOW CANVAS & RIGHT INSPECTOR DRAWER (Screenshots 4 & 5)
  // ═════════════════════════════════════════════════════════════════
  if (!currentRuleset) return null;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] min-h-[640px] pb-4">
      {/* ─────────────────────────────────────────────────────────────
          CANVAS TOP NAVBAR (Screenshot 5)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0] bg-white z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm("You have unpublished changes. Discard and return to directory?")) {
                  setActiveView("directory");
                }
              } else {
                setActiveView("directory");
              }
            }}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Rules Engine</span>
            <span className="text-slate-300">/</span>
            <div className="flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-[#0A5C48]" />
              <span className="text-sm font-bold text-slate-900">{currentRuleset.name}</span>
            </div>
          </div>

          {/* Top Tabs: Rules vs Settings */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs ml-2 sm:ml-4">
            <button
              type="button"
              onClick={() => setEditorTab("rules")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                editorTab === "rules"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rules
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("settings")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                editorTab === "settings"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              Unpublished changes
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset current ruleset to last saved version
              const orig = rulesets.find((r) => r.id === currentRuleset.id);
              if (orig) {
                setCurrentRuleset(JSON.parse(JSON.stringify(orig)));
                setHasUnsavedChanges(false);
                toast({ title: "Changes reverted" });
              }
            }}
            disabled={!hasUnsavedChanges}
            className="h-8 text-xs font-semibold border-slate-200 rounded-lg text-slate-600"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            <span>Undo</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSaveCurrentRuleset}
            disabled={saveMutation.isPending}
            className="h-8 text-xs font-semibold bg-[#0A5C48] hover:bg-[#084838] text-white rounded-lg gap-1.5 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saveMutation.isPending ? "Saving..." : "Save"}</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SETTINGS TAB VIEW
      ───────────────────────────────────────────────────────────── */}
      {editorTab === "settings" && (
        <div className="max-w-2xl py-6 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Ruleset Details</h3>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ruleset Name</Label>
              <Input
                type="text"
                value={currentRuleset.name}
                onChange={(e) => {
                  setCurrentRuleset({ ...currentRuleset, name: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Description</Label>
              <textarea
                value={currentRuleset.description}
                onChange={(e) => {
                  setCurrentRuleset({ ...currentRuleset, description: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0A5C48]"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-xs font-semibold text-slate-900">Active Status</Label>
                <p className="text-[11px] text-slate-500">Enable this ruleset across all active integration snippets</p>
              </div>
              <Switch
                checked={currentRuleset.enabled}
                onCheckedChange={(checked) => {
                  setCurrentRuleset({ ...currentRuleset, enabled: checked });
                  setHasUnsavedChanges(true);
                }}
                className="data-[state=checked]:bg-[#0A5C48]"
              />
            </div>
          </div>

          {/* Destinations */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Traffic Routing Targets</h3>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Legitimate Buyer Destination (Human URL)</Label>
              <Input
                type="text"
                value={humanUrl}
                onChange={(e) => {
                  setHumanUrl(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://yourstore.com/target-offer"
                className="text-xs h-9 font-mono"
              />
              <p className="text-[11px] text-slate-500">Where allowed legitimate traffic is forwarded.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Fallback Bot Deflection (URL or HTTP Status)</Label>
              <Input
                type="text"
                value={botUrl}
                onChange={(e) => {
                  setBotUrl(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="403 or https://yourstore.com/safe-page"
                className="text-xs h-9 font-mono"
              />
              <p className="text-[11px] text-slate-500">Fallback destination for deflected automated traffic when not blocked directly.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CANVAS & RIGHT INSPECTOR SPLIT VIEW (Screenshot 5)
      ───────────────────────────────────────────────────────────── */}
      {editorTab === "rules" && (
        <div className="flex-1 flex overflow-hidden border border-[#E2E8F0] rounded-xl mt-3 relative bg-slate-50/50">
          {/* Main Visual Canvas Area */}
          <div 
            className="flex-1 overflow-auto p-8 flex flex-col items-center relative transition-transform duration-200"
            style={{
              backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top center"
            }}
          >
            {/* ─── NODE 1: TOP START NODE (Screenshot 5) ─── */}
            <div className="w-80 bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Fingerprint className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Start</div>
                  <div className="text-xs font-bold text-slate-900">1. Identify Visitors</div>
                </div>
              </div>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Vertical Connector Line 1 */}
            <div className="w-0.5 h-8 bg-slate-300 shrink-0" />

            {/* ─── SEQUENTIAL RULE STEP NODES ─── */}
            {currentRuleset.rules.map((rule, idx) => {
              const isSelected = rule.id === selectedStepId;
              const isLast = idx === currentRuleset.rules.length - 1;

              return (
                <div key={rule.id} className="flex flex-col items-center shrink-0">
                  {/* Rule Card (Screenshot 5) */}
                  <div
                    onClick={() => {
                      setSelectedStepId(rule.id);
                      setIsInspectorOpen(true);
                    }}
                    className={`w-80 bg-white rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-500/10"
                        : "border border-slate-200 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                          {getFieldIcon(rule.conditions[0]?.field || "bot_threat")}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                            {rule.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {rule.stepNumber}. {rule.action === "block_response" ? `Block with response (${rule.statusCode})` : rule.action}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions 3-dots */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateStep(rule.id);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-1"
                        title="Duplicate rule step"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Section IF */}
                    <div className="mb-2">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        If
                      </div>
                      <div className="space-y-1">
                        {rule.conditions.map((cond) => (
                          <div
                            key={cond.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 max-w-full truncate"
                          >
                            {getFieldIcon(cond.field)}
                            <span>{RULE_FIELD_DEFINITIONS[cond.field]?.label || cond.field} is {cond.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section THEN */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Then
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/60 text-[11px] font-semibold text-rose-800">
                        <X className="h-3 w-3 text-rose-600" />
                        <span>
                          {rule.action === "block_response" ? `Block with response (${rule.statusCode})` : rule.action}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Connector Line between steps */}
                  {!isLast && <div className="w-0.5 h-8 bg-slate-300 shrink-0" />}
                </div>
              );
            })}

            {/* Bottom Add Step Button */}
            <div className="w-0.5 h-6 bg-slate-300 shrink-0" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStep}
              className="border-dashed border-2 border-slate-300 hover:border-[#0A5C48] text-slate-600 hover:text-[#0A5C48] bg-white text-xs font-semibold h-8 rounded-lg shrink-0 gap-1.5 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add rule step</span>
            </Button>
          </div>

          {/* Bottom Left Zoom Controls (Screenshot 5) */}
          <div className="absolute left-4 bottom-4 flex items-center bg-white border border-slate-200 rounded-lg shadow-xs p-0.5 z-20">
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
              title="Fit to view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-3.5 bg-slate-200" />
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(0.7, prev - 0.1))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-3.5 bg-slate-200" />
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(1.3, prev + 0.1))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────
              RIGHT INSPECTOR DRAWER (Screenshots 4 & 5)
          ───────────────────────────────────────────────────────── */}
          {isInspectorOpen && selectedStep && (
            <div className="w-80 sm:w-96 bg-white border-l border-[#E2E8F0] shadow-lg flex flex-col z-20 overflow-y-auto">
              {/* Inspector Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    {getFieldIcon(selectedStep.conditions[0]?.field || "bot_threat")}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {selectedStep.name}
                  </h4>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Inspector Body */}
              <div className="p-5 space-y-6 flex-1">
                {/* ─── SECTION IF (Screenshot 5) ─── */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>If</span>
                  </div>

                  {selectedStep.conditions.map((cond, cIdx) => (
                    <div key={cond.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 relative">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-slate-600">Condition {cIdx + 1}</Label>
                        {selectedStep.conditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCondition(cond.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown 1: Field Selector */}
                      <select
                        value={cond.field}
                        onChange={(e) => handleUpdateCondition(cond.id, { field: e.target.value as RuleField })}
                        className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0A5C48]"
                      >
                        {Object.entries(RULE_FIELD_DEFINITIONS).map(([key, def]) => (
                          <option key={key} value={key}>
                            {def.label}
                          </option>
                        ))}
                      </select>

                      {/* Dropdown 2 & 3: Operator and Value */}
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cond.operator}
                          onChange={(e) => handleUpdateCondition(cond.id, { operator: e.target.value as RuleOperator })}
                          className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0A5C48]"
                        >
                          <option value="is">Is</option>
                          <option value="is_not">Is Not</option>
                          <option value="in">In</option>
                          <option value="not_in">Not In</option>
                          <option value="greater_than">Greater than</option>
                        </select>

                        <select
                          value={cond.value}
                          onChange={(e) => handleUpdateCondition(cond.id, { value: e.target.value })}
                          className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0A5C48]"
                        >
                          {RULE_FIELD_DEFINITIONS[cond.field]?.defaultValues.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCondition}
                    className="w-full text-xs font-semibold text-slate-600 border-slate-200 rounded-lg h-8 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add condition</span>
                  </Button>
                </div>

                {/* ─── SECTION THEN (Screenshot 5) ─── */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Then
                  </div>

                  <select
                    value={selectedStep.action}
                    onChange={(e) => handleUpdateStep({ action: e.target.value as RuleAction })}
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0A5C48]"
                  >
                    <option value="block_response">Block with response</option>
                    <option value="redirect">Redirect to URL</option>
                    <option value="challenge">Interactive Challenge</option>
                    <option value="allow">Allow</option>
                  </select>
                </div>

                {/* ─── STATUS CODE SELECTOR (Screenshot 4) ─── */}
                {selectedStep.action === "block_response" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700">Status</Label>
                      <select
                        value={selectedStep.statusCode}
                        onChange={(e) => handleUpdateStep({ statusCode: parseInt(e.target.value) })}
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-[#0A5C48]"
                      >
                        {HTTP_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400">
                        {HTTP_STATUS_OPTIONS.find((o) => o.code === selectedStep.statusCode)?.description}
                      </p>
                    </div>

                    {/* ─── HEADERS (Screenshot 5) ─── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">Headers</Label>
                        <button
                          type="button"
                          onClick={handleAddHeader}
                          className="text-[11px] font-semibold text-[#0A5C48] hover:text-[#084838] flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {selectedStep.headers.map((h, hIdx) => (
                          <div key={hIdx} className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={h.key}
                              onChange={(e) => handleUpdateHeader(hIdx, e.target.value, h.value)}
                              placeholder="Key"
                              className="text-xs h-8 font-mono"
                            />
                            <Input
                              type="text"
                              value={h.value}
                              onChange={(e) => handleUpdateHeader(hIdx, h.key, e.target.value)}
                              placeholder="Value"
                              className="text-xs h-8 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveHeader(hIdx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ─── BODY (Screenshot 5) ─── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">Body</Label>
                        <select
                          value={selectedStep.bodyType}
                          onChange={(e) => handleUpdateStep({ bodyType: e.target.value as any })}
                          className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded px-2 py-0.5"
                        >
                          <option value="application/json">JSON Content-Type: application/json</option>
                          <option value="text/html">HTML Content-Type: text/html</option>
                          <option value="text/plain">Text Content-Type: text/plain</option>
                        </select>
                      </div>

                      <textarea
                        value={selectedStep.body}
                        onChange={(e) => handleUpdateStep({ body: e.target.value })}
                        className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0A5C48]"
                        rows={4}
                      />
                    </div>
                  </>
                )}

                {/* If Redirect */}
                {selectedStep.action === "redirect" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Target Redirect URL</Label>
                    <Input
                      type="text"
                      value={selectedStep.redirectUrl || botUrl}
                      onChange={(e) => handleUpdateStep({ redirectUrl: e.target.value })}
                      placeholder="https://yourstore.com/safe-page"
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                )}

                {/* Delete Step Button */}
                <div className="pt-4 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteStep(selectedStep.id)}
                    className="w-full text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 gap-1.5 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete rule step</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
