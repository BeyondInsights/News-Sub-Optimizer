
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suggestBundleConfig } from '@/ai/flows/suggest-bundle-config';
import type { SuggestBundleConfigInput, SuggestBundleConfigOutput, GeneralStrategyOutputSchema, AllAccessPortfolioStrategyOutputSchema } from '@/ai/flows/suggest-bundle-config';
import { AVAILABLE_FEATURES, PRODUCT_TYPES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AiConfiguratorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestBundleConfigOutput | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<SuggestBundleConfigInput>({
    goals: 'Maximize revenue, Increase subscriber count',
    constraints: 'Target price point around $10-$20 for main offerings, ensure distinct value propositions',
    availableFeatures: [...AVAILABLE_FEATURES.reader, ...AVAILABLE_FEATURES.streaming, ...AVAILABLE_FEATURES.vertical],
    products: [...PRODUCT_TYPES],
    optimizationStrategy: 'general', // Default to general strategy
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStrategyChange = (value: 'general' | 'allAccessPortfolio') => {
    setFormData(prev => ({ ...prev, optimizationStrategy: value }));
  };
  
  const handleListChange = (name: 'availableFeatures' | 'products', value: string) => {
    setFormData(prev => ({ ...prev, [name]: value.split(',').map(item => item.trim()).filter(item => item) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const aiResult = await suggestBundleConfig(formData);
      setResult(aiResult);
      toast({
        title: "Suggestions Generated",
        description: "AI has provided bundle configurations.",
      });
    } catch (err) {
      console.error("AI Configurator Error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({
        title: "Error Generating Suggestions",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderBundleCard = (bundle: { bundleName: string; price: number; description: string; features: string[]; reasoning?: string }, titlePrefix: string = "") => (
    <Card className="mb-4 bg-muted/30">
      <CardHeader className="p-4">
        <CardTitle className="text-md">{titlePrefix}{bundle.bundleName} - ${bundle.price.toFixed(2)}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 text-sm space-y-1">
        <p><strong>Description:</strong> {bundle.description}</p>
        <p><strong>Features:</strong> {bundle.features.join(', ')}</p>
        {bundle.reasoning && <p className="mt-2 pt-2 border-t border-muted"><strong>Reasoning:</strong> {bundle.reasoning}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Simulator
        </Link>
      </Button>

      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">AI Subscription Bundle Configurator</CardTitle>
          <CardDescription>Let AI suggest optimal bundle configurations based on your inputs.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="optimizationStrategy" className="text-base">Optimization Strategy</Label>
              <Select
                value={formData.optimizationStrategy}
                onValueChange={handleStrategyChange}
              >
                <SelectTrigger id="optimizationStrategy" className="mt-1">
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Bundle Suggestions</SelectItem>
                  <SelectItem value="allAccessPortfolio">Optimize All-Access Portfolio (All-Access, Reader, Streaming)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Choose how the AI should approach the configuration.</p>
            </div>

            <div>
              <Label htmlFor="goals" className="text-base">Overall Goals</Label>
              <Input
                id="goals"
                name="goals"
                value={formData.goals}
                onChange={handleInputChange}
                placeholder="e.g., Maximize revenue, Increase subscriber count"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate multiple goals with commas. Applies to all strategies.</p>
            </div>

            <div>
              <Label htmlFor="constraints" className="text-base">Overall Constraints</Label>
              <Input
                id="constraints"
                name="constraints"
                value={formData.constraints}
                onChange={handleInputChange}
                placeholder="e.g., Target price for All-Access $15-$25, specific feature mandates"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate multiple constraints with commas. Applies to all strategies.</p>
            </div>
            
            <div>
              <Label htmlFor="availableFeatures" className="text-base">Available Features</Label>
              <Textarea
                id="availableFeatures"
                name="availableFeatures"
                value={formData.availableFeatures.join(', ')}
                onChange={(e) => handleListChange('availableFeatures', e.target.value)}
                placeholder="Feature A, Feature B, Feature C"
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list of all available features for the AI to consider.</p>
            </div>

            <div>
              <Label htmlFor="products" className="text-base">Available Base Product Types</Label>
              <Textarea
                id="products"
                name="products"
                value={formData.products.join(', ')}
                onChange={(e) => handleListChange('products', e.target.value)}
                placeholder="Product Type 1, Product Type 2"
                rows={2}
                className="mt-1"
              />
               <p className="text-xs text-muted-foreground mt-1">Comma-separated list of base product types AI can build upon (e.g., CNN Reader, CNN Streaming, CNN All-Access).</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full py-3 text-lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Suggestions"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {error && (
        <Card className="mt-6 border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">AI Generated Suggestions</CardTitle>
            <CardDescription>Strategy Used: {result.strategyUsed === 'general' ? 'General Bundle Suggestions' : 'All-Access Portfolio Optimization'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.strategyUsed === 'general' && (
              <>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Suggested Bundles:</h3>
                  {(result as GeneralStrategyOutputSchema).suggestedBundles.map((bundle, index) => (
                     renderBundleCard(bundle)
                  ))}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Overall Reasoning:</h3>
                  <p className="text-sm whitespace-pre-wrap">{(result as GeneralStrategyOutputSchema).reasoning}</p>
                </div>
              </>
            )}

            {result.strategyUsed === 'allAccessPortfolio' && (
              <>
                <h3 className="font-semibold text-lg mb-1">Optimal All-Access Product:</h3>
                {renderBundleCard((result as AllAccessPortfolioStrategyOutputSchema).optimalAllAccess)}
                
                <h3 className="font-semibold text-lg mb-1 mt-4">Complementary CNN Reader:</h3>
                {renderBundleCard((result as AllAccessPortfolioStrategyOutputSchema).complementaryReader)}

                <h3 className="font-semibold text-lg mb-1 mt-4">Complementary CNN Streaming:</h3>
                {renderBundleCard((result as AllAccessPortfolioStrategyOutputSchema).complementaryStreaming)}
                
                <div className="mt-4">
                  <h3 className="font-semibold text-lg mb-2">Overall Portfolio Strategy:</h3>
                  <p className="text-sm whitespace-pre-wrap">{(result as AllAccessPortfolioStrategyOutputSchema).overallPortfolioStrategy}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


    