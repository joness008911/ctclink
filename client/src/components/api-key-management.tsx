import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiKey } from "@shared/schema";

export default function ApiKeyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const { data: apiKeys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
    refetchInterval: 10000,
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data: { keyName: string; keyValue: string }) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setKeyName("");
      setKeyValue("");
      setShowForm(false);
      toast({
        title: "Success",
        description: "API key created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/api-keys/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const generateRandomKey = () => {
    const prefix = "ak_";
    const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setKeyValue(prefix + randomPart);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim() || !keyValue.trim()) {
      toast({
        title: "Error",
        description: "Please provide both key name and value",
        variant: "destructive",
      });
      return;
    }
    createKeyMutation.mutate({ keyName: keyName.trim(), keyValue: keyValue.trim() });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const copyApiUrl = (keyValue: string) => {
    const url = `${window.location.origin}/api/classify?api_key=${keyValue}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "API URL copied to clipboard",
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "*".repeat(key.length);
    return key.substring(0, 4) + "*".repeat(key.length - 8) + key.substring(key.length - 4);
  };

  if (isLoading) {
    return (
      <Card className="shadow border border-border">
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow border border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          <Key className="text-primary mr-2 inline h-5 w-5" />
          API Key Management
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!showForm ? (
          <Button 
            onClick={() => setShowForm(true)}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            data-testid="button-create-api-key"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New API Key
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded-lg p-4">
            <div>
              <Label htmlFor="keyName" className="block text-sm font-medium text-foreground mb-2">
                Key Name
              </Label>
              <Input
                id="keyName"
                type="text"
                placeholder="e.g., Production API"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full"
                data-testid="input-key-name"
                disabled={createKeyMutation.isPending}
              />
            </div>
            
            <div>
              <Label htmlFor="keyValue" className="block text-sm font-medium text-foreground mb-2">
                API Key Value
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="keyValue"
                  type="text"
                  placeholder="ak_example123..."
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  className="flex-1"
                  data-testid="input-key-value"
                  disabled={createKeyMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomKey}
                  disabled={createKeyMutation.isPending}
                  data-testid="button-generate-key"
                >
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                type="submit"
                disabled={createKeyMutation.isPending}
                data-testid="button-save-key"
              >
                {createKeyMutation.isPending ? "Creating..." : "Create Key"}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setKeyName("");
                  setKeyValue("");
                }}
                disabled={createKeyMutation.isPending}
                data-testid="button-cancel-key"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Existing API Keys</h4>
          
          {apiKeys.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Key className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No API keys created yet</p>
              <p className="text-sm">Create your first API key to start using the classification endpoint</p>
            </div>
          ) : (
            apiKeys.map((apiKey) => (
              <div 
                key={apiKey.id} 
                className="border border-border rounded-lg p-4 space-y-3"
                data-testid={`api-key-${apiKey.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-foreground">{apiKey.keyName}</h5>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={apiKey.enabled ? "default" : "secondary"}>
                      {apiKey.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <Badge variant="outline">
                      {apiKey.usageCount} uses
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                    {showKeys[apiKey.id] ? apiKey.keyValue : maskKey(apiKey.keyValue)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleKeyVisibility(apiKey.id)}
                    data-testid={`button-toggle-key-${apiKey.id}`}
                  >
                    {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey.keyValue)}
                    data-testid={`button-copy-key-${apiKey.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyApiUrl(apiKey.keyValue)}
                    className="text-xs"
                    data-testid={`button-copy-url-${apiKey.id}`}
                  >
                    Copy API URL
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteKeyMutation.mutate(apiKey.id)}
                    disabled={deleteKeyMutation.isPending}
                    data-testid={`button-delete-key-${apiKey.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}