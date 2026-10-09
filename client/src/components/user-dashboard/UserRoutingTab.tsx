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
import { COUNTRIES_LIST, getCountryFlag } from "@/lib/countries";
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

interface UserIpRule {
  id: string;
  ipOrCidr: string;
  label?: string;
  reason?: string;
  enabled: boolean;
  createdAt: string;
}

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
  
  // Top-level subtab for directory view: "rules" | "geofencing" | "ip_lists" | "policies"
  const [mainSubTab, setMainSubTab] = useState<"rules" | "geofencing" | "ip_lists" | "policies">("rules");

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
    allowedDevices?: string;
    desktopOsFilter?: string;
    blockVpn?: string;
    blockDatacenter?: string;
    blockTor?: string;
    rulesetsConfig?: string;
  }>({
    queryKey: ["/api/user/redirect-urls"],
    refetchOnMount: true,
  });

  // Target Destination URLs
  const [humanUrl, setHumanUrl] = useState("");
  const [botUrl, setBotUrl] = useState("");

  // Geo-Fencing state
  const [allowedCountries, setAllowedCountries] = useState("ALL");
  const [countrySearch, setCountrySearch] = useState("");
  const [geoFencingPending, setGeoFencingPending] = useState(false);

  // Device & Traffic Policies state
  const [allowedDevices, setAllowedDevices] = useState("all");
  const [desktopOsFilter, setDesktopOsFilter] = useState("both");
  const [blockVpnSetting, setBlockVpnSetting] = useState("block");
  const [blockDatacenterSetting, setBlockDatacenterSetting] = useState("block");
  const [blockTorSetting, setBlockTorSetting] = useState("block");
  const [policiesPending, setPoliciesPending] = useState(false);

  // IP Access Lists query & state
  const [ipTab, setIpTab] = useState<"blocklist" | "allowlist">("blocklist");
  const [newBlockIp, setNewBlockIp] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [newAllowIp, setNewAllowIp] = useState("");
  const [newAllowLabel, setNewAllowLabel] = useState("");

  const { data: ipRulesData, isLoading: isLoadingIpRules } = useQuery<{
    blocklist: UserIpRule[];
    allowlist: UserIpRule[];
  }>({
    queryKey: ["/api/user/ip-rules"],
    refetchOnMount: true,
  });

  // All User Rulesets
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);

  // Initialize from serverConfig
  useEffect(() => {
    if (serverConfig) {
      setHumanUrl(serverConfig.humanUrl || "https://yourdomain.com");
      setBotUrl(serverConfig.botUrl || "403");
      setAllowedCountries(serverConfig.allowedCountries || "ALL");
      setAllowedDevices(serverConfig.allowedDevices || "all");
      setDesktopOsFilter(serverConfig.desktopOsFilter || "both");
      setBlockVpnSetting(serverConfig.blockVpn || "block");
      setBlockDatacenterSetting(serverConfig.blockDatacenter || "block");
      setBlockTorSetting(serverConfig.blockTor || "block");

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

  // Selected Country codes array
  const selectedCountryCodes = useMemo(() => {
    if (!allowedCountries || allowedCountries.trim().toUpperCase() === "ALL") {
      return ["ALL"];
    }
    return allowedCountries
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }, [allowedCountries]);

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

  // Save IP rules mutation
  const saveIpRulesMutation = useMutation({
    mutationFn: async (payload: { blocklist: UserIpRule[]; allowlist: UserIpRule[] }) => {
      const res = await apiRequest("POST", "/api/user/ip-rules", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/ip-rules"] });
      toast({
        title: "IP Access Lists updated",
        description: "Your custom IP blocklist and allowlist have been saved.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to update IP lists",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  // Handle add to IP Blocklist
  const handleAddBlockIp = () => {
    if (!newBlockIp.trim()) return;
    const currentBlocklist = ipRulesData?.blocklist || [];
    const currentAllowlist = ipRulesData?.allowlist || [];
    const newEntry: UserIpRule = {
      id: `blk_${Date.now()}`,
      ipOrCidr: newBlockIp.trim(),
      reason: newBlockReason.trim() || undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    saveIpRulesMutation.mutate({
      blocklist: [newEntry, ...currentBlocklist],
      allowlist: currentAllowlist,
    });
    setNewBlockIp("");
    setNewBlockReason("");
  };

  // Handle delete from IP Blocklist
  const handleDeleteBlockIp = (id: string) => {
    const currentBlocklist = (ipRulesData?.blocklist || []).filter((i) => i.id !== id);
    const currentAllowlist = ipRulesData?.allowlist || [];
    saveIpRulesMutation.mutate({
      blocklist: currentBlocklist,
      allowlist: currentAllowlist,
    });
  };

  // Handle toggle blocklist entry
  const handleToggleBlockIp = (id: string, enabled: boolean) => {
    const currentBlocklist = (ipRulesData?.blocklist || []).map((i) => 
      i.id === id ? { ...i, enabled } : i
    );
    const currentAllowlist = ipRulesData?.allowlist || [];
    saveIpRulesMutation.mutate({
      blocklist: currentBlocklist,
      allowlist: currentAllowlist,
    });
  };

  // Handle add to IP Allowlist
  const handleAddAllowIp = () => {
    if (!newAllowIp.trim()) return;
    const currentBlocklist = ipRulesData?.blocklist || [];
    const currentAllowlist = ipRulesData?.allowlist || [];
    const newEntry: UserIpRule = {
      id: `alw_${Date.now()}`,
      ipOrCidr: newAllowIp.trim(),
      label: newAllowLabel.trim() || "Trusted Client",
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    saveIpRulesMutation.mutate({
      blocklist: currentBlocklist,
      allowlist: [newEntry, ...currentAllowlist],
    });
    setNewAllowIp("");
    setNewAllowLabel("");
  };

  // Handle delete from IP Allowlist
  const handleDeleteAllowIp = (id: string) => {
    const currentBlocklist = ipRulesData?.blocklist || [];
    const currentAllowlist = (ipRulesData?.allowlist || []).filter((i) => i.id !== id);
    saveIpRulesMutation.mutate({
      blocklist: currentBlocklist,
      allowlist: currentAllowlist,
    });
  };

  // Handle toggle allowlist entry
  const handleToggleAllowIp = (id: string, enabled: boolean) => {
    const currentBlocklist = ipRulesData?.blocklist || [];
    const currentAllowlist = (ipRulesData?.allowlist || []).map((i) => 
      i.id === id ? { ...i, enabled } : i
    );
    saveIpRulesMutation.mutate({
      blocklist: currentBlocklist,
      allowlist: currentAllowlist,
    });
  };

  // Save Geo-Fencing
  const handleSaveGeoFencing = async (newCountryList: string) => {
    setGeoFencingPending(true);
    try {
      const payload = {
        humanUrl: humanUrl.trim() || "https://yourdomain.com",
        botUrl: botUrl.trim() || "403",
        allowedCountries: newCountryList,
      };
      await apiRequest("PUT", "/api/user/redirect-urls", payload);
      setAllowedCountries(newCountryList);
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
      toast({
        title: "Geo-Fencing policy saved",
        description: newCountryList === "ALL" ? "All countries are currently permitted." : `Allowed countries list updated (${newCountryList.split(',').length} countries).`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to save Geo-Fencing",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setGeoFencingPending(false);
    }
  };

  // Save Device & Traffic policies
  const handleSavePolicies = async () => {
    setPoliciesPending(true);
    try {
      const payload = {
        humanUrl: humanUrl.trim() || "https://yourdomain.com",
        botUrl: botUrl.trim() || "403",
        allowedDevices,
        desktopOsFilter,
        blockVpn: blockVpnSetting,
        blockDatacenter: blockDatacenterSetting,
        blockTor: blockTorSetting,
      };
      await apiRequest("PUT", "/api/user/redirect-urls", payload);
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
      toast({
        title: "Policies updated",
        description: "Device and baseline shield policies have been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save policies",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setPoliciesPending(false);
    }
  };

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
  // VIEW 1: RULES ENGINE DIRECTORY & POLICIES (Screenshot 3)
  // ═════════════════════════════════════════════════════════════════
  if (activeView === "directory") {
    const totalIpRulesCount = (ipRulesData?.blocklist?.length || 0) + (ipRulesData?.allowlist?.length || 0);

    return (
      <div className="w-full space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Rules & Policies
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure detection rules, geographic boundaries, custom IP access lists, and device policies.
            </p>
          </div>

          {mainSubTab === "rules" && (
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
          )}
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setMainSubTab("rules")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
              mainSubTab === "rules"
                ? "bg-slate-900 text-white font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Rules Engine</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              mainSubTab === "rules" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
            }`}>
              {rulesets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainSubTab("geofencing")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
              mainSubTab === "geofencing"
                ? "bg-slate-900 text-white font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Geo-Fencing</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              mainSubTab === "geofencing" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
            }`}>
              {allowedCountries === "ALL" ? "Global" : `${selectedCountryCodes.length} allowed`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainSubTab("ip_lists")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
              mainSubTab === "ip_lists"
                ? "bg-slate-900 text-white font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>IP Access Lists</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              mainSubTab === "ip_lists" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
            }`}>
              {totalIpRulesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainSubTab("policies")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
              mainSubTab === "policies"
                ? "bg-slate-900 text-white font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Device & Traffic Policies</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SUBTAB 1: RULES ENGINE DIRECTORY
        ───────────────────────────────────────────────────────────── */}
        {mainSubTab === "rules" && (
          <div className="space-y-6">
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
    )}

        {/* ─────────────────────────────────────────────────────────────
            SUBTAB 2: GEO-FENCING CONFIGURATION
        ───────────────────────────────────────────────────────────── */}
        {mainSubTab === "geofencing" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#0A5C48]" />
                    <span>Geographic Boundary Policy</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select which countries are permitted to view your destination pages. All other traffic triggers your deflection rules.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={geoFencingPending}
                    onClick={() => handleSaveGeoFencing(allowedCountries)}
                    className="bg-[#0A5C48] hover:bg-[#084838] text-white text-xs font-semibold h-8.5 px-4 rounded-lg shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    <span>{geoFencingPending ? "Saving..." : "Save Geo-Fencing"}</span>
                  </Button>
                </div>
              </div>

              {/* Presets Bar */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Quick Regional Presets</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAllowedCountries("ALL")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      allowedCountries === "ALL"
                        ? "bg-[#0A5C48] text-white border-[#0A5C48]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🌐 Global Traffic (Allow All)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllowedCountries("US,CA,GB,AU,NZ")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    🇺🇸 Tier-1 English (US, CA, GB, AU, NZ)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllowedCountries("US,CA,MX")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    🌎 North America (US, CA, MX)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllowedCountries("DE,FR,IT,ES,NL,BE,AT,SE,NO,DK,FI,IE,PL,PT,GR,CH")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    🇪🇺 Core Europe (EU + EFTA)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllowedCountries("JP,KR,SG,AU,NZ,HK,TW")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    🌏 APAC Core (JP, KR, SG, AU, NZ)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllowedCountries("")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white text-slate-500 border-slate-200 hover:text-rose-600 hover:bg-rose-50"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Current Status Banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-900">
                    Active Policy: {allowedCountries === "ALL" ? "All countries allowed (Global)" : `${selectedCountryCodes.length} countries permitted`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {allowedCountries === "ALL" ? "ALL" : allowedCountries || "None selected (Strict Block)"}
                </div>
              </div>

              {/* Selected Tags list */}
              {allowedCountries !== "ALL" && selectedCountryCodes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600">Selected Countries ({selectedCountryCodes.length})</div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {selectedCountryCodes.map((code) => {
                      const item = COUNTRIES_LIST.find((c) => c.code === code);
                      return (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
                        >
                          <span>{item?.flag || getCountryFlag(code)}</span>
                          <span>{item?.name || code}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = selectedCountryCodes.filter((c) => c !== code);
                              setAllowedCountries(remaining.join(","));
                            }}
                            className="text-slate-400 hover:text-rose-600 ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search & Country List */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search countries by name or 2-letter ISO code (e.g., US, Germany)..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="pl-9 h-9 text-xs border-slate-200"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {COUNTRIES_LIST.filter((c) => c.code !== "ALL").filter((c) => 
                    !countrySearch.trim() || 
                    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                    c.code.toLowerCase().includes(countrySearch.toLowerCase())
                  ).map((c) => {
                    const isSelected = allowedCountries !== "ALL" && selectedCountryCodes.includes(c.code);
                    return (
                      <div
                        key={c.code}
                        onClick={() => {
                          if (allowedCountries === "ALL") {
                            setAllowedCountries(c.code);
                          } else {
                            if (isSelected) {
                              const remaining = selectedCountryCodes.filter((item) => item !== c.code);
                              setAllowedCountries(remaining.join(","));
                            } else {
                              setAllowedCountries([...selectedCountryCodes, c.code].join(","));
                            }
                          }
                        }}
                        className={`px-4 py-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-emerald-50/60 font-semibold" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="text-slate-900">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-100 px-1 py-0.2 rounded border border-slate-200/60">
                            {c.code}
                          </span>
                        </div>

                        <div className="flex items-center">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-md bg-[#0A5C48] text-white flex items-center justify-center">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border border-slate-300" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SUBTAB 3: CUSTOM IP ACCESS LISTS (Blocklist & Allowlist)
        ───────────────────────────────────────────────────────────── */}
        {mainSubTab === "ip_lists" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6">
              {/* Header and Sub-Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#0A5C48]" />
                    <span>IP Access Control Lists</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage client-specific IP blocklists for scrapers and IP allowlists for team/QA bypass.
                  </p>
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setIpTab("blocklist")}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      ipTab === "blocklist"
                        ? "bg-slate-900 text-white shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    IP Blocklist ({ipRulesData?.blocklist?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIpTab("allowlist")}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      ipTab === "allowlist"
                        ? "bg-[#0A5C48] text-white shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    IP Allowlist ({ipRulesData?.allowlist?.length || 0})
                  </button>
                </div>
              </div>

              {/* IP Blocklist Tab */}
              {ipTab === "blocklist" && (
                <div className="space-y-6">
                  {/* Add IP Form */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">Add IP to Custom Blocklist</div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">IP Address or CIDR Range</Label>
                        <Input
                          type="text"
                          placeholder="e.g. 198.51.100.1 or 192.168.1.0/24"
                          value={newBlockIp}
                          onChange={(e) => setNewBlockIp(e.target.value)}
                          className="h-8.5 text-xs bg-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">Reason / Note</Label>
                        <Input
                          type="text"
                          placeholder="e.g. Malicious scraper"
                          value={newBlockReason}
                          onChange={(e) => setNewBlockReason(e.target.value)}
                          className="h-8.5 text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end">
                        <Button
                          type="button"
                          onClick={handleAddBlockIp}
                          disabled={!newBlockIp.trim()}
                          className="w-full h-8.5 text-xs font-semibold bg-slate-900 hover:bg-black text-white rounded-lg"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          <span>Add IP</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Blocklist Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 py-2.5 px-4 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-5 sm:col-span-5">IP / CIDR Range</div>
                      <div className="col-span-4 sm:col-span-4">Reason / Note</div>
                      <div className="col-span-3 sm:col-span-3 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {(ipRulesData?.blocklist || []).map((item) => (
                        <div key={item.id} className="grid grid-cols-12 items-center py-3 px-4 hover:bg-slate-50/70 transition-colors">
                          <div className="col-span-5 sm:col-span-5 flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">{item.ipOrCidr}</span>
                            {!item.enabled && (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                Paused
                              </span>
                            )}
                          </div>
                          <div className="col-span-4 sm:col-span-4 text-xs text-slate-500 truncate">
                            {item.reason || "Custom Block"}
                          </div>
                          <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-3">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) => handleToggleBlockIp(item.id, checked)}
                              className="data-[state=checked]:bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteBlockIp(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!ipRulesData?.blocklist || ipRulesData.blocklist.length === 0) && (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          No custom IP blocklist entries. Add an IP or CIDR range above to block specific traffic.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* IP Allowlist Tab */}
              {ipTab === "allowlist" && (
                <div className="space-y-6">
                  {/* Add Allowlist IP Form */}
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/60 space-y-3">
                    <div className="text-xs font-bold text-slate-900">Add IP to Trusted Allowlist (Bypass)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">IP Address or CIDR Range</Label>
                        <Input
                          type="text"
                          placeholder="e.g. 203.0.113.1 or 10.0.0.0/8"
                          value={newAllowIp}
                          onChange={(e) => setNewAllowIp(e.target.value)}
                          className="h-8.5 text-xs bg-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">Label / Name</Label>
                        <Input
                          type="text"
                          placeholder="e.g. Office HQ or QA Team"
                          value={newAllowLabel}
                          onChange={(e) => setNewAllowLabel(e.target.value)}
                          className="h-8.5 text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end">
                        <Button
                          type="button"
                          onClick={handleAddAllowIp}
                          disabled={!newAllowIp.trim()}
                          className="w-full h-8.5 text-xs font-semibold bg-[#0A5C48] hover:bg-[#084838] text-white rounded-lg"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          <span>Allow IP</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Allowlist Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 py-2.5 px-4 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-5 sm:col-span-5">IP / CIDR Range</div>
                      <div className="col-span-4 sm:col-span-4">Label</div>
                      <div className="col-span-3 sm:col-span-3 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {(ipRulesData?.allowlist || []).map((item) => (
                        <div key={item.id} className="grid grid-cols-12 items-center py-3 px-4 hover:bg-slate-50/70 transition-colors">
                          <div className="col-span-5 sm:col-span-5 flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">{item.ipOrCidr}</span>
                            {!item.enabled && (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                Paused
                              </span>
                            )}
                          </div>
                          <div className="col-span-4 sm:col-span-4 text-xs text-slate-500 truncate">
                            {item.label || "Trusted Client"}
                          </div>
                          <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-3">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) => handleToggleAllowIp(item.id, checked)}
                              className="data-[state=checked]:bg-[#0A5C48]"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteAllowIp(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!ipRulesData?.allowlist || ipRulesData.allowlist.length === 0) && (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          No custom IP allowlist entries. Add an IP to bypass bot checks for office or developer testing.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SUBTAB 4: TRAFFIC & DEVICE POLICIES
        ───────────────────────────────────────────────────────────── */}
        {mainSubTab === "policies" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#0A5C48]" />
                    <span>Device & Traffic Policies</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure device-level restrictions, operating system targeting, and baseline threat mitigation.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={policiesPending}
                  onClick={handleSavePolicies}
                  className="bg-[#0A5C48] hover:bg-[#084838] text-white text-xs font-semibold h-8.5 px-4 rounded-lg shadow-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  <span>{policiesPending ? "Saving..." : "Save Policies"}</span>
                </Button>
              </div>

              {/* Target Devices */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Target Device Restrictions</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "all", label: "All Devices" },
                    { id: "desktop", label: "Desktop Only" },
                    { id: "mobile", label: "Mobile Only" },
                    { id: "mobile_tablet", label: "Mobile & Tablet" }
                  ].map((dev) => (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => setAllowedDevices(dev.id)}
                      className={`p-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                        allowedDevices === dev.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {dev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop OS Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Desktop Operating System</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "both", label: "Windows & macOS" },
                    { id: "windows", label: "Windows Only" },
                    { id: "mac", label: "macOS Only" }
                  ].map((os) => (
                    <button
                      key={os.id}
                      type="button"
                      onClick={() => setDesktopOsFilter(os.id)}
                      className={`p-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                        desktopOsFilter === os.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {os.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Baseline Threat Switches */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Block VPN & Anonymizers</div>
                    <div className="text-[11px] text-slate-500">Block visitors routing through commercial VPN tunnels</div>
                  </div>
                  <Switch
                    checked={blockVpnSetting === "block"}
                    onCheckedChange={(checked) => setBlockVpnSetting(checked ? "block" : "allow")}
                    className="data-[state=checked]:bg-[#0A5C48]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Block Datacenter Cloud ASNs</div>
                    <div className="text-[11px] text-slate-500">Block AWS, Azure, Google Cloud, and hosting provider IP ranges</div>
                  </div>
                  <Switch
                    checked={blockDatacenterSetting === "block"}
                    onCheckedChange={(checked) => setBlockDatacenterSetting(checked ? "block" : "allow")}
                    className="data-[state=checked]:bg-[#0A5C48]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Block Tor Exit Nodes</div>
                    <div className="text-[11px] text-slate-500">Block traffic originating from active Tor network relays</div>
                  </div>
                  <Switch
                    checked={blockTorSetting === "block"}
                    onCheckedChange={(checked) => setBlockTorSetting(checked ? "block" : "allow")}
                    className="data-[state=checked]:bg-[#0A5C48]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
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
                        {rule.conditions.map((cond, cIdx) => (
                          <div key={cond.id} className="flex flex-col gap-1">
                            {cIdx > 0 && (
                              <div className="flex items-center gap-1.5 my-0.5">
                                <div className="h-px bg-slate-200 flex-1" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {cond.logicalOp || "AND"}
                                </span>
                                <div className="h-px bg-slate-200 flex-1" />
                              </div>
                            )}
                            <div
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 max-w-full truncate"
                            >
                              {getFieldIcon(cond.field)}
                              <span>{RULE_FIELD_DEFINITIONS[cond.field]?.label || cond.field} is {cond.value}</span>
                            </div>
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
                    <div key={cond.id} className="space-y-2">
                      {cIdx > 0 && (
                        <div className="flex items-center justify-center gap-2 py-1">
                          <div className="h-px bg-slate-200 flex-1" />
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateCondition(cond.id, { logicalOp: "AND" })}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                (cond.logicalOp || "AND") === "AND"
                                  ? "bg-[#0A5C48] text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              AND
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCondition(cond.id, { logicalOp: "OR" })}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                cond.logicalOp === "OR"
                                  ? "bg-[#0A5C48] text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              OR
                            </button>
                          </div>
                          <div className="h-px bg-slate-200 flex-1" />
                        </div>
                      )}

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 relative">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-semibold text-slate-600">
                            Condition {cIdx + 1}
                            {cIdx > 0 && (
                              <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                                ({cond.logicalOp || "AND"})
                              </span>
                            )}
                          </Label>
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

                        {/* Helper info & deep link for Country condition */}
                        {cond.field === "country" && (
                          <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900 flex items-center justify-between">
                            <span>Checks Geo-Fencing allowed list</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveView("directory");
                                setMainSubTab("geofencing");
                              }}
                              className="font-bold underline text-amber-950 hover:text-amber-800"
                            >
                              Configure Geo-Fencing →
                            </button>
                          </div>
                        )}

                        {/* Helper info & deep link for IP Blocklist condition */}
                        {cond.field === "ip_blocklist" && (
                          <div className="p-2 rounded-lg bg-red-50/80 border border-red-200/60 text-[11px] text-red-900 flex items-center justify-between">
                            <span>Checks custom IP blocklist</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveView("directory");
                                setMainSubTab("ip_lists");
                              }}
                              className="font-bold underline text-red-950 hover:text-red-800"
                            >
                              Manage IP Blocklist →
                            </button>
                          </div>
                        )}
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
