import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Code, Copy, Menu, Server } from "lucide-react";
import Sidebar from "@/components/sidebar";
import StatsCards from "@/components/stats-cards";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();

  const copyApiUrl = () => {
    const apiUrl = `${window.location.origin}/api/classify`;
    navigator.clipboard.writeText(apiUrl);
    toast({
      title: "Copied",
      description: "API URL copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-muted flex">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-background shadow-sm border-b border-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">CleanTraffic Dashboard</h2>
              <p className="text-muted-foreground">Pure, clean visitor data with real-time analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-white rounded-full inline-block mr-2 animate-pulse"></div>
                Live
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="lg:hidden"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview" data-testid="tab-overview">📊 Dashboard</TabsTrigger>
              <TabsTrigger value="client-users" data-testid="tab-client-users">👥 Client Users</TabsTrigger>
              <TabsTrigger value="countries" data-testid="tab-countries">🌍 Countries</TabsTrigger>
              <TabsTrigger value="isp-whitelist" data-testid="tab-isp-whitelist">✅ ISP Whitelist</TabsTrigger>
              <TabsTrigger value="isp-blacklist" data-testid="tab-isp-blacklist">❌ ISP Blacklist</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">📈 Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <StatsCards />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                <ClassificationTable />

                {/* Right Panel */}
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

                  <Ip2GeoKeyManagement />

                  <ApiKeyManagement />

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
              </div>
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
          </Tabs>
        </main>
      </div>
    </div>
  );
}
