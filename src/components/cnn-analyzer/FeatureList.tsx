"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeatureListProps {
  productId: number;
  featureType: 'reader' | 'streaming' | 'vertical';
  features: string[];
  onAddFeatures: () => void;
  onRemoveFeature: (feature: string) => void;
  maxFeatures?: number;
}

export default function FeatureList({
  productId,
  featureType,
  features,
  onAddFeatures,
  onRemoveFeature,
  maxFeatures,
}: FeatureListProps) {
  const capitalizedFeatureType = featureType.charAt(0).toUpperCase() + featureType.slice(1);
  const label = featureType === 'vertical' ? 'Verticals' : `${capitalizedFeatureType} Features`;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">
          {label} ({features.length} selected{maxFeatures ? ` / ${maxFeatures} max` : ''})
        </label>
      </div>
      <Button variant="outline" className="w-full" onClick={onAddFeatures} disabled={maxFeatures !== undefined && features.length >= maxFeatures}>
        + Add {featureType === 'vertical' ? 'Vertical' : 'Feature'}
      </Button>
      {features.length > 0 && (
        <ScrollArea className="h-32 border rounded-md p-2 bg-muted/20">
          <div className="space-y-1">
            {features.map(feature => (
              <div key={feature} className="flex items-center justify-between text-xs p-1.5 bg-background rounded shadow-sm">
                <span>{feature}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveFeature(feature)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
