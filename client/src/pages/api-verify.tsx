import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { userAuthApi } from "@/lib/user-auth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Key, ArrowLeft } from "lucide-react";

export default function ApiVerify() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");

  const verifyMutation = useMutation({
    mutationFn: (apiKey: string) => userAuthApi.verifyApiKey({ apiKey }),
    onSuccess: (data) => {
      toast({
        title: "API Key Verified",
        description: "Welcome to your CleanTraffic dashboard!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid API key",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      toast({
        title: "Missing API Key",
        description: "Please enter your API key",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate(apiKey);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify API Key</CardTitle>
          <CardDescription className="text-base">
            Enter your API key to complete authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                data-testid="input-api-key"
                type="text"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={verifyMutation.isPending}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Your API key was provided by your administrator
              </p>
            </div>
            <Button
              type="submit"
              data-testid="button-verify"
              className="w-full"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify & Continue"}
            </Button>
          </form>

          <div className="mt-6">
            <Button
              variant="ghost"
              data-testid="button-back"
              className="w-full"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Step 2 of 2: Verify your API key</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
