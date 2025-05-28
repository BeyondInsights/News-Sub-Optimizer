
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/contexts/AppContext';
import type { ProductConfig } from '@/lib/types';

export default function ProfileSelectModal() {
  const { 
    isProfileSelectModalOpen, 
    closeProfileSelectModal, 
    profileProducts, // List of {id, name, product type} for display
    productConfigs, // Full config data
    setSelectedProfileProductsData,
    showBrandedAlert
  } = useAppContext();
  
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  useEffect(() => {
    if (isProfileSelectModalOpen) {
      setSelectedProductIds([]); // Reset selections when modal opens
    }
  }, [isProfileSelectModalOpen]);

  const handleToggleProduct = (productId: number) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSubmit = () => {
    if (selectedProductIds.length === 0) {
      showBrandedAlert("Selection Required", "Please select at least one product.");
      return;
    }
    const selectedData = productConfigs.filter(p => selectedProductIds.includes(p.id));
    setSelectedProfileProductsData(selectedData);
    closeProfileSelectModal();
  };
  
  return (
    <Dialog open={isProfileSelectModalOpen} onOpenChange={(isOpen) => !isOpen && closeProfileSelectModal()}>
      <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Products for Profile Display</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Choose which products to include in the profile comparison.</p>
        
        {profileProducts.length === 0 ? (
          <p className="p-4 text-center text-muted-foreground">No active products configured to select for profiles.</p>
        ) : (
          <ScrollArea className="pr-4 mt-4"> {/* Removed h-auto and max-h constraints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {profileProducts.map(product => (
                <div
                  key={product.id}
                  className={`flex flex-col items-center justify-center p-3 rounded-md border cursor-pointer hover:bg-muted/50 ${selectedProductIds.includes(product.id) ? 'bg-muted border-primary ring-2 ring-primary' : ''}`}
                  onClick={() => handleToggleProduct(product.id)}
                >
                  <Checkbox
                    id={`profile-product-${product.id}`}
                    checked={selectedProductIds.includes(product.id)}
                    onCheckedChange={() => handleToggleProduct(product.id)}
                    className="mb-2"
                  />
                  <Label htmlFor={`profile-product-${product.id}`} className="text-center cursor-pointer">
                    <span className="font-semibold">{product.name}</span><br/>
                    <span className="text-xs text-muted-foreground">{product.product}</span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={profileProducts.length === 0}>Show Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
