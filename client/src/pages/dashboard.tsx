import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Code, Copy, LogOut, Server, Shield, User } from "lucide-react";
import ClassificationTable from "@/components/classification-table";
import DetectionRules from "@/components/detection-rules";
import ApiKeyManagement from "@/components/api-key-management";
import Ip2GeoKeyManagement from "@/components/ip2geo-key-management";
import RedirectUrlManagement from "@/components/redirect-url-management";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import CountryWhitelist from "@/components/country-whitelist";
import IspWhitelist from "@/components/isp-whitelist";
import IspBlacklist from "@/components/isp-blacklist";
import ClientUserManagement from "@/components/client-user-management";
import WhitelabelDomainSettings from "@/components/whitelabel-domain-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type User as AuthUser } from "@/lib/auth";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Logout failed",
        variant: "destructive",
      });
    },
  });

  const copyApiUrl = () => {
    const apiUrl = `${window.location.origin}/api/classify`;
    navigator.clipboard.writeText(apiUrl);
    toast({
      title: "Copied",
      description: "API URL copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm shadow-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-white rounded-full inline-block mr-2 animate-pulse"></div>
                Live
              </div>
              <div className="hidden md:flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{user?.username || 'Admin'}</span>
              </div>
              <Button 
                variant="outline" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview" data-testid="tab-overview">📊 Dashboard</TabsTrigger>
              <TabsTrigger value="client-users" data-testid="tab-client-users">👥 Client Users</TabsTrigger>
              <TabsTrigger value="countries" data-testid="tab-countries">🌍 Countries</TabsTrigger>
              <TabsTrigger value="isp-whitelist" data-testid="tab-isp-whitelist">✅ ISP Whitelist</TabsTrigger>
              <TabsTrigger value="isp-blacklist" data-testid="tab-isp-blacklist">❌ ISP Blacklist</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">📈 Analytics</TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">⚙️ Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <ClassificationTable />
            </TabsContent>

            <TabsContent value="client-users">
              <ClientUserManagement />
            </TabsContent>

            <TabsContent value="countries">
              <CountryWhitelist />
            </TabsContent>

            <TabsContent value="isp-whitelist">
              <IspWhitelist />
            </TabsContent>

            <TabsContent value="isp-blacklist">
              <IspBlacklist />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsDashboard />
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* API Endpoint Info */}
                  <Card className="shadow border border-border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        <Code className="text-primary mr-2 inline h-5 w-5" />
                        API Endpoint
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Classification API
                        </label>
                        <div className="bg-muted rounded-md p-3 font-mono text-sm">
                          <span className="text-green-600 font-medium">POST</span>
                          <span className="ml-2">/api/classify</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-2">
                          <strong>Response:</strong> JSON with IP, location, browser, device type, 
                          visitor type, detection method, and ISP
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
                        onClick={copyApiUrl}
                        data-testid="button-copy-api-url"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy API URL
                      </Button>
                    </CardContent>
                  </Card>

                  <DetectionRules />

                  <RedirectUrlManagement />

                  {/* System Status */}
                  <Card className="shadow border border-border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        <Server className="text-primary mr-2 inline h-5 w-5" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">API Service</span>
                        <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle className="mr-1 h-3 w-3 inline" />
                          Online
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">IP2Geo Service</span>
                        <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle className="mr-1 h-3 w-3 inline" />
                          Connected
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Database</span>
                        <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle className="mr-1 h-3 w-3 inline" />
                          Active
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <Ip2GeoKeyManagement />

                  <ApiKeyManagement />

                  <WhitelabelDomainSettings />
                </div>
              </div>
            </TabsContent>
          </Tabs>
      </main>
    </div>
  );
}
