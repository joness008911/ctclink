import { useQuery, useMutation } from "@tanstack/react-query";
import { userAuthApi } from "@/lib/user-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  LogOut, Save, ExternalLink, BarChart3, Shield, Link as LinkIcon, Key, Lock, User, 
  Activity, Code, Download, Copy, AlertTriangle, TrendingUp, Globe, Users, Bot,
  Play, Pause, Settings, FileText, CheckCircle2, XCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import JSZip from 'jszip';
import { format } from 'date-fns';

export default function UserDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [humanUrl, setHumanUrl] = useState("");
  const [botUrl, setBotUrl] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user/me"],
    queryFn: userAuthApi.getCurrentUser,
  });

  const { data: stats } = useQuery<{
    totalClassifications: number;
    humanVisitors: number;
    botTraffic: number;
  }>({
    queryKey: ["/api/user/stats"],
    refetchInterval: 30000,
  });

  const { data: redirectUrls, isLoading: urlsLoading } = useQuery<{
    humanUrl: string;
    botUrl: string;
  }>({
    queryKey: ["/api/user/redirect-urls"],
    refetchOnMount: true,
  });

  const { data: classifications = [] } = useQuery<any[]>({
    queryKey: ["/api/user/classifications"],
    refetchInterval: 10000,
  });

  const { data: apiKeyDetails } = useQuery<any>({
    queryKey: ["/api/user/api-key-details"],
    refetchInterval: 30000,
  });

  const { data: apiKeyValue } = useQuery<{ keyValue: string | null }>({
    queryKey: ["/api/user/api-key-value"],
  });

  const { data: whitelabelData } = useQuery<{ domain: string }>({
    queryKey: ["/api/whitelabel-domain"],
  });

  useEffect(() => {
    if (redirectUrls) {
      setHumanUrl(redirectUrls.humanUrl || "");
      setBotUrl(redirectUrls.botUrl || "");
    }
  }, [redirectUrls]);

  const updateUrlsMutation = useMutation({
    mutationFn: async (urls: { humanUrl: string; botUrl: string }) => {
      const response = await apiRequest("PUT", "/api/user/redirect-urls", urls);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "URLs Updated",
        description: "Your redirect URLs have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/redirect-urls"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update redirect URLs",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/user/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const toggleLicenseMutation = useMutation({
    mutationFn: async (pause: boolean) => {
      const endpoint = pause ? `/api/api-keys/${apiKeyDetails?.id}/pause` : `/api/api-keys/${apiKeyDetails?.id}/resume`;
      const response = await apiRequest("POST", endpoint, {});
      return response.json();
    },
    onSuccess: (_, pause) => {
      toast({
        title: pause ? "License Paused" : "License Activated",
        description: pause ? "All visitors will now be redirected to bot URL" : "Normal classification resumed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-key-details"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Operation Failed",
        description: error.message || "Failed to update license status",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: userAuthApi.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
    },
  });

  const handleSaveUrls = () => {
    if (!humanUrl || !botUrl) {
      toast({
        title: "Missing URLs",
        description: "Please enter both human and bot redirect URLs",
        variant: "destructive",
      });
      return;
    }
    updateUrlsMutation.mutate({ humanUrl, botUrl });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleToggleLicense = () => {
    const isPaused = apiKeyDetails?.status === 'paused';
    toggleLicenseMutation.mutate(!isPaused);
  };

  const handleDownloadScript = async () => {
    if (!apiKeyValue?.keyValue) {
      toast({
        title: "Missing API Key",
        description: "No API key available for download",
        variant: "destructive",
      });
      return;
    }

    const apiKey = apiKeyValue.keyValue;
    
    // Handle domain - if it already starts with http/https, use as-is
    // Otherwise, add the https://api. prefix
    let apiEndpoint = window.location.origin;
    if (whitelabelData?.domain) {
      const domain = whitelabelData.domain;
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        apiEndpoint = domain;
      } else {
        apiEndpoint = `https://api.${domain}`;
      }
    }

    const phpContent = `<?php
/*
 * CleanTraffic Bot Protection Script
 * Generated: ${new Date().toISOString()}
 * 
 * Features:
 * - 10-minute session caching (reduces API costs - silent redirect for repeat visitors)
 * - Enhanced bot detection (headless browsers, known bots, suspicious patterns)
 * - Immediate classification and redirect (no loading screen)
 * - Server-side browser/device detection from user agent
 * - Email capture from URL query parameters (?e= or ?email=)
 * - Security headers (HSTS, CSP, X-Frame-Options)
 * - Query string forwarding to redirect URLs
 * - Redirect URLs configured in your CleanTraffic dashboard
 */

// ============ CONFIGURATION ============
$apiKey = '${apiKey}';
$apiEndpoint = '${apiEndpoint}/api/classify';

// ============ SESSION & FINGERPRINTING ============
session_start();

// Create unique visitor fingerprint: IP + User Agent
$visitorIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$visitorUserAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$visitorFingerprint = md5($visitorIp . $visitorUserAgent);

// ============ CHECK SESSION CACHE (10-MINUTE) ============
if (isset($_SESSION['ct_' . $visitorFingerprint])) {
    $cached = $_SESSION['ct_' . $visitorFingerprint];
    $cacheAge = time() - $cached['timestamp'];
    
    // If cache is less than 10 minutes old, use cached redirect
    if ($cacheAge < 600) { // 600 seconds = 10 minutes
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        $cachedUrl = $cached['redirectUrl'];
        if (!empty($_SERVER['QUERY_STRING'])) {
            $separator = (strpos($cachedUrl, '?') !== false) ? '&' : '?';
            $cachedUrl .= $separator . $_SERVER['QUERY_STRING'];
        }
        
        header('Location: ' . $cachedUrl);
        exit;
    } else {
        // Cache expired, clear it
        unset($_SESSION['ct_' . $visitorFingerprint]);
    }
}

// ============ ENHANCED BOT DETECTION ============
function isLikelyBot($userAgent) {
    if (empty($userAgent) || strlen($userAgent) < 10) {
        return true;
    }
    
    $botPatterns = [
        // Headless browsers
        'HeadlessChrome', 'PhantomJS', 'Puppeteer', 'Selenium', 'WebDriver',
        // Known bots
        'Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot',
        'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'WhatsApp',
        // Scrapers
        'Scrapy', 'curl', 'wget', 'python-requests', 'Go-http-client',
        // Other indicators
        'bot', 'crawler', 'spider', 'scraper'
    ];
    
    foreach ($botPatterns as $pattern) {
        if (stripos($userAgent, $pattern) !== false) {
            return true;
        }
    }
    
    return false;
}

$isBot = isLikelyBot($visitorUserAgent);

// ============ EMAIL CAPTURE ============
$email = $_GET['email'] ?? $_GET['e'] ?? null;

// ============ SECURITY HEADERS ============
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Content-Security-Policy: default-src \\'self\\'; frame-ancestors \\'none\\'');

// ============ DEVICE DETECTION ============
function detectDevice($userAgent) {
    if (preg_match('/mobile|android|iphone|ipad|ipod/i', $userAgent)) {
        return 'Mobile';
    } elseif (preg_match('/tablet|ipad/i', $userAgent)) {
        return 'Tablet';
    } else {
        return 'Desktop';
    }
}

function detectBrowser($userAgent) {
    if (preg_match('/MSIE|Trident/i', $userAgent)) return 'Internet Explorer';
    if (preg_match('/Edg/i', $userAgent)) return 'Microsoft Edge';
    if (preg_match('/Chrome/i', $userAgent)) return 'Chrome';
    if (preg_match('/Safari/i', $userAgent) && !preg_match('/Chrome/i', $userAgent)) return 'Safari';
    if (preg_match('/Firefox/i', $userAgent)) return 'Firefox';
    if (preg_match('/Opera|OPR/i', $userAgent)) return 'Opera';
    return 'Unknown';
}

$deviceType = detectDevice($visitorUserAgent);
$browser = detectBrowser($visitorUserAgent);

// ============ API CLASSIFICATION ============
$redirectUrl = null;
$visitorType = null;

$postData = [
    'ip' => $visitorIp,
    'userAgent' => $visitorUserAgent,
    'deviceType' => $deviceType,
    'browser' => $browser,
];

if ($email) {
    $postData['email'] = $email;
}

$ch = curl_init($apiEndpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-API-Key: ' . $apiKey
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $data = json_decode($response, true);
    if ($data && isset($data['visitorType'], $data['redirectUrl'])) {
        $visitorType = $data['visitorType'];
        $redirectUrl = $data['redirectUrl'];
    }
}

// ============ CACHE RESULT FOR 10 MINUTES ============
if ($redirectUrl) {
    // Store classification result in session (10-minute cache)
    $_SESSION['ct_' . $visitorFingerprint] = [
        'redirectUrl' => $redirectUrl,
        'visitorType' => $visitorType,
        'timestamp' => time()
    ];
}

// ============ REDIRECT ============
// Add anti-caching headers for bot protection
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Redirect URL MUST come from API response (set in your CleanTraffic dashboard)
if ($redirectUrl) {
    // Forward all query parameters from incoming URL
    if (!empty($_SERVER['QUERY_STRING'])) {
        $separator = (strpos($redirectUrl, '?') !== false) ? '&' : '?';
        $redirectUrl .= $separator . $_SERVER['QUERY_STRING'];
    }
    
    header('Location: ' . $redirectUrl);
    exit;
} else {
    // API did not return a redirect URL - configuration error
    header('HTTP/1.1 500 Internal Server Error');
    exit('Configuration error: No redirect URL configured in CleanTraffic dashboard');
}
?>`;

    try {
      const zip = new JSZip();
      
      const randomName = Array.from(crypto.getRandomValues(new Uint8Array(14)))
        .map(b => b.toString(36))
        .join('');
      
      zip.file("index.php", phpContent);
      
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${randomName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Script Downloaded",
        description: "PHP script package downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate script package",
        variant: "destructive",
      });
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isLicenseActive = apiKeyDetails?.status === 'active';
  const isLicensePaused = apiKeyDetails?.status === 'paused';
  const isLicenseExpired = apiKeyDetails?.status === 'expired';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">CleanTraffic</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.username}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4" />
              License & Analytics
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2" data-testid="tab-logs">
              <Activity className="h-4 w-4" />
              Classification Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      API License Status
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm max-w-2xl">
                      <strong>Pause/Resume Control:</strong> Temporarily pause your license during testing, maintenance, or when idle. 
                      Paused licenses redirect <strong>all visitors</strong> to your bot URL. This <strong>does not affect your expiration date</strong> - 
                      your license time continues regardless of pause status.
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1.5">Current Status</p>
                      <Badge 
                        variant={isLicenseActive ? "default" : isLicensePaused ? "secondary" : "destructive"}
                        className="text-sm px-3 py-1.5"
                      >
                        {isLicenseActive && <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                        {isLicensePaused && <Pause className="h-4 w-4 mr-1.5" />}
                        {isLicenseExpired && <XCircle className="h-4 w-4 mr-1.5" />}
                        {apiKeyDetails?.status?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </div>
                    <Separator orientation="vertical" className="h-14" />
                    <div className="flex flex-col items-center space-y-1.5">
                      <Label htmlFor="license-toggle" className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                        {isLicensePaused ? (
                          <>
                            <Play className="h-3.5 w-3.5 text-green-600" />
                            <span>Resume</span>
                          </>
                        ) : (
                          <>
                            <Pause className="h-3.5 w-3.5 text-orange-600" />
                            <span>Pause</span>
                          </>
                        )}
                      </Label>
                      <Switch
                        id="license-toggle"
                        checked={isLicenseActive}
                        onCheckedChange={handleToggleLicense}
                        disabled={toggleLicenseMutation.isPending || isLicenseExpired}
                        data-testid="switch-license-toggle"
                        className="scale-110"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">API Key Name</p>
                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">{apiKeyDetails?.keyName || 'N/A'}</p>
                      </div>
                      <Key className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">API Calls Used</p>
                        <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
                          {apiKeyDetails?.callCount || 0} / {apiKeyDetails?.callLimit || 0}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-green-500 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Expiration</p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">
                          {apiKeyDetails?.expirationPeriod === 'unlimited' ? 'Unlimited' : apiKeyDetails?.expirationPeriod || 'N/A'}
                        </p>
                      </div>
                      <Shield className="h-8 w-8 text-purple-500 opacity-50" />
                    </div>
                  </div>
                </div>

                {(isLicensePaused || isLicenseExpired) && (
                  <div className={`${isLicenseExpired ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'} border rounded-lg p-4 flex items-start space-x-3`}>
                    <AlertTriangle className={`h-5 w-5 ${isLicenseExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'} mt-0.5`} />
                    <div className="flex-1">
                      <p className={`font-semibold ${isLicenseExpired ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                        {isLicenseExpired ? '🔒 Service Suspended - License Expired' : '⏸️ Service Paused'}
                      </p>
                      <p className={`text-sm ${isLicenseExpired ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'} mt-1.5`}>
                        {isLicenseExpired ? (
                          'Your license has expired. All traffic is being redirected to the bot URL. Please contact support to renew your license.'
                        ) : (
                          <>
                            All visitors are currently being redirected to your bot URL while your license is paused. 
                            Toggle the switch above to resume normal traffic classification.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-card to-muted/20 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Total Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.totalClassifications || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">All time classifications</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Human Visitors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats?.humanVisitors || 0}</div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {stats?.totalClassifications ? Math.round((stats.humanVisitors / stats.totalClassifications) * 100) : 0}% of traffic
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Bot Traffic
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-900 dark:text-red-100">{stats?.botTraffic || 0}</div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {stats?.totalClassifications ? Math.round((stats.botTraffic / stats.totalClassifications) * 100) : 0}% of traffic
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest visitor classifications</CardDescription>
              </CardHeader>
              <CardContent>
                {classifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No visitors yet. Install the PHP script to start tracking.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classifications.slice(0, 5).map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {c.visitorType === 'Human' ? (
                            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full">
                              <Bot className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{c.visitorType}</p>
                            <p className="text-xs text-muted-foreground">{c.ipAddress}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono">{format(new Date(c.timestamp), 'HH:mm:ss')}</p>
                          <p className="text-xs text-muted-foreground">{c.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Visitor Classification History
                </CardTitle>
                <CardDescription>Detailed log of all visitor classifications</CardDescription>
              </CardHeader>
              <CardContent>
                {classifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No classification data available.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Classification</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>ISP</TableHead>
                          <TableHead>Device</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classifications.map((c: any, i: number) => (
                          <TableRow key={i} data-testid={`row-classification-${i}`}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(c.timestamp), 'MM/dd HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              {c.visitorType === 'Human' ? (
                                <Badge className="bg-green-600 text-white gap-1">
                                  <Users className="h-3 w-3" />
                                  Human
                                </Badge>
                              ) : (
                                <Badge className="bg-red-600 text-white gap-1">
                                  <Bot className="h-3 w-3" />
                                  Bot
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{c.ipAddress}</TableCell>
                            <TableCell className="text-sm">{c.email || '-'}</TableCell>
                            <TableCell className="text-sm">
                              {c.country || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-sm">{c.isp || '-'}</TableCell>
                            <TableCell className="text-sm">{c.deviceType || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Redirect URLs
                </CardTitle>
                <CardDescription>Configure where visitors are sent after classification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="human-url">Human Redirect URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="human-url"
                      type="url"
                      value={humanUrl}
                      onChange={(e) => setHumanUrl(e.target.value)}
                      placeholder="https://example.com/welcome"
                      data-testid="input-human-url"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Where human visitors will be redirected</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bot-url">Bot Redirect URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bot-url"
                      type="url"
                      value={botUrl}
                      onChange={(e) => setBotUrl(e.target.value)}
                      placeholder="https://google.com"
                      data-testid="input-bot-url"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Where bot traffic will be redirected</p>
                </div>

                <Button 
                  onClick={handleSaveUrls}
                  disabled={updateUrlsMutation.isPending}
                  data-testid="button-save-urls"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateUrlsMutation.isPending ? "Saving..." : "Save URLs"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  PHP Script Download
                </CardTitle>
                <CardDescription>Get your customized PHP protection script</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">How it works:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Download the PHP script package (random filename for security)</li>
                    <li>Extract and upload index.php to your website</li>
                    <li>10-minute session cache reduces API costs (repeat visitors redirected silently)</li>
                    <li>Enhanced bot detection: headless browsers, known crawlers, suspicious patterns</li>
                    <li>Email capture from URLs (?e= or ?email=), browser detection, security headers</li>
                    <li>Humans go to: {redirectUrls?.humanUrl || "Default: https://example.com/human"}</li>
                    <li>Bots go to: {redirectUrls?.botUrl || "Default: https://google.com"}</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleDownloadScript}
                    className="gap-2"
                    data-testid="button-download-script"
                  >
                    <Download className="h-4 w-4" />
                    Download Script (ZIP)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Account Settings
                </CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={user?.username || ''} disabled />
                </div>

                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2" data-testid="button-change-password">
                      <Lock className="h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one (min. 8 characters)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          data-testid="input-current-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          data-testid="input-new-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          data-testid="input-confirm-password"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleChangePassword}
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-confirm-password-change"
                      >
                        {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
