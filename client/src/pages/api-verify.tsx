import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { userAuthApi } from "@/lib/user-auth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Key, ArrowLeft } from "lucide-react";

export default function ApiVerify() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedCreds = localStorage.getItem('cleantraffic_remember_me');
    console.log("[API Verify] Loading saved credentials:", savedCreds);
    if (savedCreds) {
      try {
        const parsedCreds = JSON.parse(savedCreds);
        console.log("[API Verify] Parsed credentials:", parsedCreds);
        const { apiKey: savedApiKey } = parsedCreds;
        if (savedApiKey) {
          console.log("[API Verify] Setting API key:", savedApiKey);
          setApiKey(savedApiKey);
          setRememberMe(true);
        } else {
          console.log("[API Verify] No saved API key found");
        }
      } catch (e) {
        console.error("[API Verify] Failed to load saved API key:", e);
      }
    } else {
      console.log("[API Verify] No saved credentials found in localStorage");
    }
  }, []);

  const verifyMutation = useMutation({
    mutationFn: (apiKey: string) => userAuthApi.verifyApiKey({ apiKey }),
    onSuccess: (data) => {
      if (rememberMe) {
        const savedCreds = localStorage.getItem('cleantraffic_remember_me');
        let existingCreds = {};
        if (savedCreds) {
          try {
            existingCreds = JSON.parse(savedCreds);
          } catch (e) {
            console.error("Failed to parse saved credentials");
          }
        }
        localStorage.setItem('cleantraffic_remember_me', JSON.stringify({
          ...existingCreds,
          apiKey
        }));
      } else {
        const savedCreds = localStorage.getItem('cleantraffic_remember_me');
        if (savedCreds) {
          try {
            const creds = JSON.parse(savedCreds);
            delete creds.apiKey;
            if (Object.keys(creds).length > 0) {
              localStorage.setItem('cleantraffic_remember_me', JSON.stringify(creds));
            } else {
              localStorage.removeItem('cleantraffic_remember_me');
            }
          } catch (e) {
            console.error("Failed to update saved credentials");
          }
        }
      }
      
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
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-api"
                data-testid="checkbox-remember-api-key"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember-api"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Remember API key on this device
              </label>
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
