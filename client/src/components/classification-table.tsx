import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Bot, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Classification } from "@shared/schema";

export default function ClassificationTable() {
  const { data: classifications = [], isLoading, refetch } = useQuery<Classification[]>({
    queryKey: ["/api/classifications?limit=1000"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
  };

  if (isLoading) {
    return (
      <Card className="xl:col-span-2 shadow border border-border">
        <CardHeader>
          <CardTitle>Recent Classifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded mb-2"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="xl:col-span-2 shadow border border-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">Recent Classifications</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm"
              className="bg-primary text-primary-foreground px-3 py-1 text-sm font-medium"
              onClick={() => refetch()}
              data-testid="button-refresh-classifications"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Live
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-download-classifications"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-4 font-medium text-muted-foreground">Time</th>
              <th className="p-4 font-medium text-muted-foreground">IP Address</th>
              <th className="p-4 font-medium text-muted-foreground">Location</th>
              <th className="p-4 font-medium text-muted-foreground">Type</th>
              <th className="p-4 font-medium text-muted-foreground">Method</th>
              <th className="p-4 font-medium text-muted-foreground">Browser</th>
            </tr>
          </thead>
          <tbody>
            {(!classifications || classifications.length === 0) ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No classifications yet. The table will update automatically as new requests are made to /api/classify
                </td>
              </tr>
            ) : (
              classifications.map((classification: Classification) => (
                <tr 
                  key={classification.id} 
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                  data-testid={`row-classification-${classification.id}`}
                >
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatTime(classification.timestamp)}
                  </td>
                  <td className="p-4 text-sm font-mono">
                    <div className="font-bold text-foreground">{classification.ipAddress}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {classification.deviceId && (
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border" title={`Device ID: ${classification.deviceId}`}>
                          Dev: {classification.deviceId.length > 12 ? `${classification.deviceId.slice(0, 12)}...` : classification.deviceId}
                        </span>
                      )}
                      {classification.visitorId && (
                        <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800" title={`Visitor ID: ${classification.visitorId}`}>
                          Vis: {classification.visitorId.length > 12 ? `${classification.visitorId.slice(0, 12)}...` : classification.visitorId}
                        </span>
                      )}
                      {classification.visitCount && classification.visitCount > 1 ? (
                        <span className="text-[9px] font-sans font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          Returning ({classification.visitCount})
                        </span>
                      ) : (
                        <span className="text-[9px] font-sans font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          1st Visit
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm">{classification.location}</td>
                  <td className="p-4">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                        classification.visitorType === 'Human' ? 'bg-green-600' : 'bg-orange-600'
                      }`}
                    >
                      {classification.visitorType === 'Human' ? (
                        <>
                          <User className="mr-1 h-3 w-3 inline" />
                          Human
                        </>
                      ) : (
                        <>
                          <Bot className="mr-1 h-3 w-3 inline" />
                          Bot
                        </>
                      )}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{classification.detectionMethod}</td>
                  <td className="p-4 text-sm">{classification.browser}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
