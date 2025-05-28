
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/contexts/AppContext';
import { AVAILABLE_FEATURES } from '@/lib/constants';
import type { ProductConfig } from '@/lib/types';

export default function FeatureModal() {
  const { 
    isFeatureModalOpen, 
    closeFeatureModal, 
    currentEditingProduct, 
    productConfigs,
    addSelectedFeaturesToProduct,
    showBrandedAlert
  } = useAppContext();
  
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const product = useMemo(() => 
    currentEditingProduct ? productConfigs.find(p => p.id === currentEditingProduct.id) : null,
    [currentEditingProduct, productConfigs]
  );

  const availableFeaturesForType = useMemo(() => {
    if (!currentEditingProduct || !product) return [];
    const existingFeatures = product[currentEditingProduct.type === 'vertical' ? 'verticals' : `${currentEditingProduct.type}Features`];
    return AVAILABLE_FEATURES[currentEditingProduct.type].filter(f => !existingFeatures.includes(f));
  }, [currentEditingProduct, product]);

  useEffect(() => {
    if (isFeatureModalOpen) {
      setSelectedFeatures([]); // Reset selections when modal opens
    }
  }, [isFeatureModalOpen]);

  const handleToggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  const handleSelectAll = () => {
    if (!currentEditingProduct || !product) return;
    if (currentEditingProduct.type === 'vertical') {
      showBrandedAlert("Action Not Allowed", "Select All is not available for verticals due to the 3-item limit.");
      return;
    }
    setSelectedFeatures(availableFeaturesForType);
  };

  const handleSubmit = () => {
    if (!currentEditingProduct || !product) return;
    
    const currentCount = product[currentEditingProduct.type === 'vertical' ? 'verticals' : `${currentEditingProduct.type}Features`].length;
    if (currentEditingProduct.type === 'vertical' && (currentCount + selectedFeatures.length > 3)) {
      showBrandedAlert("Maximum Reached", `You can only add ${3-currentCount} more vertical(s). Please deselect some.`);
      return;
    }

    addSelectedFeaturesToProduct(selectedFeatures);
    closeFeatureModal();
  };
  
  if (!currentEditingProduct || !product) return null;

  const title = `Select ${currentEditingProduct.type.charAt(0).toUpperCase() + currentEditingProduct.type.slice(1)} Features for Product ${currentEditingProduct.id}`;

  return (
    <Dialog open={isFeatureModalOpen} onOpenChange={(isOpen) => !isOpen && closeFeatureModal()}>
      <DialogContent className="sm:max-w-xl md:max-w-4xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {availableFeaturesForType.length === 0 ? (
          <p className="p-4 text-center text-muted-foreground">No more features available to add for this category.</p>
        ) : (
          <>
            {currentEditingProduct.type !== 'vertical' && (
              <div className="my-2 text-right">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All Available</Button>
              </div>
            )}
            <ScrollArea className="pr-4"> {/* Removed h-auto and max-h constraints */}
              <div className="space-y-2">
                {availableFeaturesForType.map((feature, index) => (
                  <div
                    key={feature}
                    className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 ${selectedFeatures.includes(feature) ? 'bg-muted' : ''}`}
                    onClick={() => handleToggleFeature(feature)}
                  >
                    <Checkbox
                      id={`feature-${index}`}
                      checked={selectedFeatures.includes(feature)}
                      onCheckedChange={() => handleToggleFeature(feature)}
                    />
                    <Label htmlFor={`feature-${index}`} className="flex-1 cursor-pointer">{index + 1}. {feature}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={availableFeaturesForType.length === 0 && selectedFeatures.length === 0}>Add Selected</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
