import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, Loader2, Save, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ALL_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "NZ", name: "New Zealand" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "ZA", name: "South Africa" },
  { code: "IL", name: "Israel" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "TR", name: "Turkey" },
  { code: "RU", name: "Russia" },
  { code: "CN", name: "China" },
];

export default function CountryWhitelist() {
  const { toast } = useToast();
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

  const { data: whitelistedCountries = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/countries"],
  });

  const addCountryMutation = useMutation({
    mutationFn: async (country: { countryCode: string; countryName: string }) => {
      return apiRequest("/api/countries", "POST", country);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
  });

  const removeCountryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/countries/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
  });

  const handleSelectAll = () => {
    const whitelistedCodes = new Set(whitelistedCountries.map((c: any) => c.countryCode));
    ALL_COUNTRIES.forEach(country => whitelistedCodes.add(country.code));
    setSelectedCountries(whitelistedCodes);
  };

  const handleDeselectAll = () => {
    setSelectedCountries(new Set());
  };

  const handleToggleCountry = (countryCode: string) => {
    const newSet = new Set(selectedCountries);
    if (newSet.has(countryCode)) {
      newSet.delete(countryCode);
    } else {
      newSet.add(countryCode);
    }
    setSelectedCountries(newSet);
  };

  const handleSaveChanges = async () => {
    const whitelistedCodes = new Set(whitelistedCountries.map((c: any) => c.countryCode));
    
    // Add new countries
    const toAdd = Array.from(selectedCountries).filter(code => !whitelistedCodes.has(code));
    for (const code of toAdd) {
      const country = ALL_COUNTRIES.find(c => c.code === code);
      if (country) {
        await addCountryMutation.mutateAsync({
          countryCode: country.code,
          countryName: country.name,
        });
      }
    }

    // Remove unchecked countries
    const toRemove = whitelistedCountries.filter((c: any) => !selectedCountries.has(c.countryCode));
    for (const country of toRemove) {
      await removeCountryMutation.mutateAsync(country.id);
    }

    toast({
      title: "Success",
      description: `${selectedCountries.size} countries whitelisted`,
    });
  };

  // Initialize selected countries from whitelist
  useState(() => {
    if (whitelistedCountries.length > 0) {
      const codes = new Set(whitelistedCountries.map((c: any) => c.countryCode));
      setSelectedCountries(codes);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Country Whitelist
          </CardTitle>
          <CardDescription>
            Select countries to allow. Visitors from other countries will be blocked.
            {selectedCountries.size === 0 && " (All countries allowed when whitelist is empty)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              data-testid="button-select-all-countries"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Select All
            </Button>
            <Button
              onClick={handleDeselectAll}
              variant="outline"
              size="sm"
              data-testid="button-deselect-all-countries"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deselect All
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {selectedCountries.size} countries selected
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ALL_COUNTRIES.map(country => (
              <div
                key={country.code}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Checkbox
                  id={`country-${country.code}`}
                  checked={selectedCountries.has(country.code)}
                  onCheckedChange={() => handleToggleCountry(country.code)}
                  data-testid={`checkbox-country-${country.code}`}
                />
                <label
                  htmlFor={`country-${country.code}`}
                  className="text-sm font-medium leading-none cursor-pointer select-none"
                >
                  {country.name}
                </label>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedCountries.size > 0 
                ? `${selectedCountries.size} countries will be allowed`
                : "All countries allowed (whitelist empty)"}
            </div>
            <Button
              onClick={handleSaveChanges}
              disabled={addCountryMutation.isPending || removeCountryMutation.isPending}
              data-testid="button-save-country-whitelist"
            >
              {(addCountryMutation.isPending || removeCountryMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
