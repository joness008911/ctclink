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
import { LogOut, Save, ExternalLink, BarChart3, Shield, Link as LinkIcon, Key, Lock, User, Activity, Code, Download, Copy, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import JSZip from 'jszip';

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
  });

  const { data: apiKeyDetails } = useQuery<any>({
    queryKey: ["/api/user/api-key-details"],
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

  const logoutMutation = useMutation({
    mutationFn: userAuthApi.logout,
    onSuccess: () => {
      queryClient.clear();
      // Keep saved credentials for Remember Me feature
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="border-b bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">CleanTraffic</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.username}</p>
            </div>
          </div>
          <Button
            variant="outline"
            data-testid="button-logout"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="account" data-testid="tab-account">
              <User className="w-4 h-4 mr-2" />
              Account & URLs
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="w-4 h-4 mr-2" />
              License & Activity
            </TabsTrigger>
          </TabsList>

          {/* Account & URLs Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium" data-testid="text-username">{user?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={user?.status === 'active' ? 'default' : 'secondary'} data-testid="badge-status">
                      {user?.status}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-change-password">
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Update your account password
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          data-testid="input-current-password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          data-testid="input-new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          data-testid="input-confirm-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                        Cancel
                      </Button>
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

            {/* Redirect URLs Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Redirect URL Configuration
                </CardTitle>
                <CardDescription>
                  Set where humans and bots are redirected to
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="humanUrl">Human Redirect URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="humanUrl"
                      data-testid="input-human-url"
                      type="url"
                      placeholder="https://your-site.com/landing"
                      value={humanUrl || redirectUrls?.humanUrl || ""}
                      onChange={(e) => setHumanUrl(e.target.value)}
                      disabled={updateUrlsMutation.isPending}
                    />
                    {humanUrl && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={humanUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Where legitimate human visitors will be sent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="botUrl">Bot Redirect URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="botUrl"
                      data-testid="input-bot-url"
                      type="url"
                      placeholder="https://google.com"
                      value={botUrl || redirectUrls?.botUrl || ""}
                      onChange={(e) => setBotUrl(e.target.value)}
                      disabled={updateUrlsMutation.isPending}
                    />
                    {botUrl && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={botUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Where datacenter/VPN/proxy traffic will be sent
                  </p>
                </div>

                <Button
                  data-testid="button-save-urls"
                  onClick={handleSaveUrls}
                  disabled={updateUrlsMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUrlsMutation.isPending ? "Saving..." : "Save Redirect URLs"}
                </Button>
              </CardContent>
            </Card>

            {/* PHP Script Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Download PHP Redirect Script
                </CardTitle>
                <CardDescription>
                  Get your custom PHP script to redirect visitors on your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">How it works:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Download the PHP script package (ZIP file)</li>
                    <li>Extract and upload index.php to your website</li>
                    <li>Visitors are classified and redirected immediately (no loading screen)</li>
                    <li>Features: email capture (?, #, $), browser detection, security headers</li>
                    <li>Humans go to: {redirectUrls?.humanUrl || "Default: https://example.com/human"}</li>
                    <li>Bots go to: {redirectUrls?.botUrl || "Default: https://google.com"}</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    data-testid="button-download-script"
                    onClick={async () => {
                      const apiKey = apiKeyValue?.keyValue || 'YOUR-API-KEY';
                      const apiEndpoint = whitelabelData?.domain || window.location.origin;
                      
                      // CleanTraffic PHP script with immediate classification
                      const script = `<?php
/*
 * CleanTraffic Bot Protection Script
 * Generated: ${new Date().toISOString()}
 * 
 * Features:
 * - Immediate classification and redirect (no loading screen)
 * - Server-side browser/device detection from user agent
 * - Email capture from URL parameters (?, #, $)
 * - Security headers (HSTS, CSP, X-Frame-Options)
 * - Query string forwarding to redirect URLs
 * - Redirect URLs configured in your CleanTraffic dashboard
 */

// ============ CONFIGURATION ============
$apiKey = '${apiKey}';
$apiEndpoint = '${apiEndpoint}/api/classify';

// ============ SECURITY HEADERS ============
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
header('Content-Security-Policy: default-src \\'self\\'; script-src \\'self\\' \\'unsafe-inline\\'; style-src \\'self\\' \\'unsafe-inline\\';');

// ============ EXTRACT EMAIL FROM URL ============
function extractEmail() {
    // Support multiple tag formats: ?, #, $
    $url = $_SERVER['REQUEST_URI'] ?? '';
    $email = null;
    
    // Parse query string (?) for email
    if (isset($_GET['e'])) {
        $email = $_GET['e'];
    } elseif (isset($_GET['email'])) {
        $email = $_GET['email'];
    }
    
    // Parse hash fragment (#) - extract from full URL if present
    if (!$email && strpos($url, '#') !== false) {
        $hashPart = substr($url, strpos($url, '#') + 1);
        parse_str($hashPart, $hashParams);
        $email = $hashParams['e'] ?? $hashParams['email'] ?? null;
    }
    
    // Parse custom tag ($) - extract from URL
    if (!$email && strpos($url, '$e=') !== false) {
        preg_match('/\\$e=([^&\\s#]+)/', $url, $matches);
        $email = $matches[1] ?? null;
    } elseif (!$email && strpos($url, '$email=') !== false) {
        preg_match('/\\$email=([^&\\s#]+)/', $url, $matches);
        $email = $matches[1] ?? null;
    }
    
    return $email ? filter_var($email, FILTER_SANITIZE_EMAIL) : null;
}

// ============ DETECT BROWSER FROM USER AGENT ============
function detectBrowser($userAgent) {
    if (stripos($userAgent, 'Firefox') !== false) return 'Firefox';
    if (stripos($userAgent, 'Edg') !== false) return 'Edge';
    if (stripos($userAgent, 'Chrome') !== false) return 'Chrome';
    if (stripos($userAgent, 'Safari') !== false) return 'Safari';
    if (stripos($userAgent, 'MSIE') !== false || stripos($userAgent, 'Trident') !== false) return 'IE';
    return 'Unknown';
}

function detectDevice($userAgent) {
    if (preg_match('/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i', $userAgent)) return 'Tablet';
    if (preg_match('/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i', $userAgent)) return 'Mobile';
    return 'Desktop';
}

// ============ MAIN LOGIC ============
$ip = $_SERVER['REMOTE_ADDR'];
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$email = extractEmail();

// Detect browser and device from user agent (server-side)
$browser = detectBrowser($userAgent);
$device = detectDevice($userAgent);

// Build API request with detected browser and device data
$requestData = [
    'ip' => $ip,
    'userAgent' => $userAgent,
    'browser' => $browser,
    'deviceType' => $device
];

// Include email if captured
if ($email) {
    $requestData['email'] = $email;
}

// Prepare JSON data
$jsonData = json_encode($requestData);

// Initialize cURL with proper configuration
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $apiEndpoint,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $jsonData,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-Key: ' . $apiKey,
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept: application/json',
        'Cache-Control: no-cache'
    ],
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_MAXREDIRS => 0,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Default to Bot if API fails (fail-safe)
$visitorType = 'Bot';
$redirectUrl = null;

// Check for successful API response
if (!$error && $httpCode === 200 && $response) {
    $data = json_decode($response, true);
    if (isset($data['visitor_type'])) {
        $visitorType = $data['visitor_type'];
    }
    
    // Get redirect URL from API response (REQUIRED)
    if (isset($data['redirectUrl'])) {
        $redirectUrl = $data['redirectUrl'];
    }
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

                      // Create ZIP file
                      const zip = new JSZip();
                      zip.file('index.php', script);
                      
                      // Generate ZIP file
                      const zipBlob = await zip.generateAsync({ type: 'blob' });
                      
                      // Download ZIP
                      const url = URL.createObjectURL(zipBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'cleantraffic-script.zip';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Script Downloaded",
                        description: "Extract cleantraffic-script.zip and upload index.php to your website",
                      });
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PHP Script (ZIP)
                  </Button>
                </div>

                {(!redirectUrls?.humanUrl || !redirectUrls?.botUrl) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Please set your redirect URLs above before using the PHP script
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* License & Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            {/* License Management */}
            {apiKeyDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API License Details
                  </CardTitle>
                  <CardDescription>Your API key information and usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">API Key Name</p>
                      <p className="font-medium">{apiKeyDetails.keyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <Badge variant={apiKeyDetails.status === 'active' ? 'default' : 'secondary'}>
                        {apiKeyDetails.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">API Key</p>
                      <p className="font-mono text-sm bg-muted px-2 py-1 rounded">{apiKeyDetails.keyPreview}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Expiration</p>
                      <p className="font-medium capitalize">{apiKeyDetails.expirationPeriod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Usage</p>
                      <p className="font-medium">
                        {apiKeyDetails.callCount.toLocaleString()} / {apiKeyDetails.callLimit.toLocaleString()} calls
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${Math.min((apiKeyDetails.callCount / apiKeyDetails.callLimit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created</p>
                      <p className="text-sm">{new Date(apiKeyDetails.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Traffic Statistics
                </CardTitle>
                <CardDescription>Overview of your classified traffic</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Classifications</p>
                    <p className="text-2xl font-bold" data-testid="stat-total">{stats?.totalClassifications || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Human Visitors</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-humans">
                      {stats?.humanVisitors || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Bot Traffic Blocked</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-bots">
                      {stats?.botTraffic || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Traffic Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Traffic Classifications</CardTitle>
                <CardDescription>Latest 100 traffic classifications</CardDescription>
              </CardHeader>
              <CardContent>
                {classifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No traffic classifications yet</p>
                    <p className="text-sm mt-2">Traffic will appear here once you integrate CleanTraffic</p>
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
                          <TableRow key={c.id || i} data-testid={`row-classification-${i}`}>
                            <TableCell className="text-xs">
                              {new Date(c.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={c.visitorType === 'Human' ? 'default' : 'destructive'}>
                                {c.visitorType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{c.ipAddress}</TableCell>
                            <TableCell className="text-sm" data-testid={`email-${i}`}>{c.email || '-'}</TableCell>
                            <TableCell>{c.country || c.location || '-'}</TableCell>
                            <TableCell className="text-sm">{c.isp || '-'}</TableCell>
                            <TableCell className="text-xs capitalize">{c.deviceType || 'desktop'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
