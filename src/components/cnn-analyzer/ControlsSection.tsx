
"use client";

import { Button } from "@/components/ui/button";
import { Trash2, BarChart3, Play, Users, RotateCcw, Loader2 } from "lucide-react";
import { useAppContext } from '@/contexts/AppContext';
import { MAX_PRODUCTS } from '@/lib/constants';
import { useState } from "react";
import { ConfirmationDialog } from "./AlertDialogs";

interface ControlsSectionProps {
  onRunSimulation: () => void;
  isSimulating: boolean; // New prop
}

export default function ControlsSection({ onRunSimulation, isSimulating }: ControlsSectionProps) {
  const { 
    productConfigs, 
    toggleProductActive, 
    clearAllSelections,
    openReportConfigModal,
    openProfileSelectModal,
    showBrandedAlert
  } = useAppContext();

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const handleClearAll = () => {
    setIsClearConfirmOpen(true);
  };

  const confirmClearAll = () => {
    clearAllSelections();
  };
  
  const handleShowProfiles = () => {
    const activeConfigured = productConfigs.filter(p => p.isActive && p.product);
    if (activeConfigured.length === 0) {
       showBrandedAlert("Configuration Required", "Please configure at least one active product to view profiles.");
       return;
    }
    openProfileSelectModal();
  };

  return (
    <>
      <div className="p-4 bg-card rounded-lg shadow-md mb-4 relative">
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Button onClick={openReportConfigModal} variant="outline" disabled={isSimulating}>
            <BarChart3 className="mr-2 h-4 w-4" /> Set Report Type
          </Button>
          <Button 
            onClick={onRunSimulation} 
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isSimulating}
          >
            {isSimulating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isSimulating ? "Simulating..." : "Run Simulation"}
          </Button>
          <Button onClick={handleShowProfiles} variant="outline" disabled={isSimulating}>
            <Users className="mr-2 h-4 w-4" /> Show Profiles
          </Button>
        </div>

        <h2 className="text-center text-lg font-semibold text-foreground mb-3">
          Select Products to Include in Simulation
        </h2>
        <Button 
          variant="destructive" 
          size="sm" 
          className="absolute right-4 top-4"
          onClick={handleClearAll}
          disabled={isSimulating}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Clear All
        </Button>
        <div className="flex flex-wrap gap-2 justify-center">
          {productConfigs.map(product => (
            <Button
              key={product.id}
              variant={product.isActive ? "default" : "outline"}
              onClick={() => toggleProductActive(product.id)}
              className={`transition-all ${product.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              disabled={isSimulating}
            >
              Product {product.id}
            </Button>
          ))}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearAll}
        title="Clear All Selections?"
        description="Are you sure you want to clear all product configurations and report data? This action cannot be undone."
        confirmText="Yes, Clear All"
      />
    </>
  );
}
