
"use client";

import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo, useEffect } from 'react';
import type { ProductConfig, ReportType, OutputType, ReportData, ProfileProduct, ProductType as ConstantProductType } from '@/lib/types';
import { INITIAL_PRODUCT_CONFIG, MAX_PRODUCTS, PRICING_RANGES, AVAILABLE_FEATURES } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";

interface AppContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  productConfigs: ProductConfig[];
  reportType: ReportType;
  outputType: OutputType;
  isReportConfigSet: boolean;
  reportData: ReportData | null;
  profileProducts: ProfileProduct[]; // Products selected for profile display
  selectedProfileProductsData: ProductConfig[]; // Actual config data for selected profile products

  authenticate: (email: string) => void;
  updateProductConfig: (id: number, updates: Partial<ProductConfig>) => void;
  toggleProductActive: (id: number) => void;
  clearAllSelections: () => void;
  setReportSettings: (reportType: ReportType, outputType: OutputType) => void;
  runSimulation: () => void; // Placeholder, actual calculation will be complex
  setGeneratedReportData: (data: ReportData | null) => void;
  
  // Feature Modal State
  isFeatureModalOpen: boolean;
  openFeatureModal: (productId: number, featureType: 'reader' | 'streaming' | 'vertical') => void;
  closeFeatureModal: () => void;
  currentEditingProduct: { id: number; type: 'reader' | 'streaming' | 'vertical' } | null;
  addSelectedFeaturesToProduct: (features: string[]) => void;

  // Report Config Modal State
  isReportConfigModalOpen: boolean;
  openReportConfigModal: () => void;
  closeReportConfigModal: () => void;

  // Profile Select Modal State
  isProfileSelectModalOpen: boolean;
  openProfileSelectModal: () => void;
  closeProfileSelectModal: () => void;
  setSelectedProfileProductsData: (products: ProductConfig[]) => void;
  
  showBrandedAlert: (title: string, description: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default to true
  const [userEmail, setUserEmail] = useState<string | null>("test@example.com"); // Default email
  
  const initialConfigs = useMemo(() => 
    Array.from({ length: MAX_PRODUCTS }, (_, i) => 
      INITIAL_PRODUCT_CONFIG(i + 1, i < 4) // First 4 active by default
    ), []);
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>(initialConfigs);

  const [reportType, setReportType] = useState<ReportType>('tiered');
  const [outputType, setOutputType] = useState<OutputType>('percentage');
  const [isReportConfigSet, setIsReportConfigSet] = useState(true); // Default to true
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  const [selectedProfileProductsData, setSelectedProfileProductsDataState] = useState<ProductConfig[]>([]);

  // Feature Modal
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [currentEditingProduct, setCurrentEditingProduct] = useState<{ id: number; type: 'reader' | 'streaming' | 'vertical' } | null>(null);

  const openFeatureModal = useCallback((productId: number, featureType: 'reader' | 'streaming' | 'vertical') => {
    setCurrentEditingProduct({ id: productId, type: featureType });
    setIsFeatureModalOpen(true);
  }, []);
  const closeFeatureModal = useCallback(() => setIsFeatureModalOpen(false), []);

  const addSelectedFeaturesToProduct = useCallback((featuresToAdd: string[]) => {
    if (!currentEditingProduct) return;
    const { id, type } = currentEditingProduct;
    setProductConfigs(prev => prev.map(p => {
      if (p.id === id) {
        const currentFeatures = p[type === 'vertical' ? 'verticals' : `${type}Features`];
        const newFeatures = Array.from(new Set([...currentFeatures, ...featuresToAdd]));
        
        if (type === 'vertical' && newFeatures.length > 3) {
          toast({ title: "Maximum Reached", description: "Maximum 3 verticals allowed.", variant: "destructive"});
          return p; // No change if limit exceeded
        }
        
        const updatedProduct = { ...p, [type === 'vertical' ? 'verticals' : `${type}Features`]: newFeatures };

        // If verticals changed, update pricing range
        if (type === 'vertical') {
            const productType = updatedProduct.product;
            if (productType && productType !== "CNN Standalone Vertical") {
                const pricingTier = PRICING_RANGES[productType]?.[newFeatures.length] || PRICING_RANGES[productType]?.[0] || { min: 5, max: 50, default: 10 };
                updatedProduct.monthlyRate = pricingTier.default; // Reset to default for new tier
            }
        }
        return updatedProduct;
      }
      return p;
    }));
  }, [currentEditingProduct, toast]);

  // Report Config Modal
  const [isReportConfigModalOpen, setIsReportConfigModalOpen] = useState(false);
  const openReportConfigModal = useCallback(() => setIsReportConfigModalOpen(true), []);
  const closeReportConfigModal = useCallback(() => setIsReportConfigModalOpen(false), []);

  // Profile Select Modal
  const [isProfileSelectModalOpen, setIsProfileSelectModalOpen] = useState(false);
  const openProfileSelectModal = useCallback(() => setIsProfileSelectModalOpen(true), []);
  const closeProfileSelectModal = useCallback(() => setIsProfileSelectModalOpen(false), []);

  const authenticate = useCallback((email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    // Default report settings (can be changed by user)
    setReportType('tiered');
    setOutputType('percentage');
    setIsReportConfigSet(true); // Consider it set with defaults initially
  }, []);

  // Simulate authentication on load since we're bypassing the form
  useEffect(() => {
    authenticate("test@example.com");
  }, [authenticate]);


  const updateProductConfig = useCallback((id: number, updates: Partial<ProductConfig>) => {
    setProductConfigs(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const toggleProductActive = useCallback((id: number) => {
    setProductConfigs(prev =>
      prev.map(p => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  }, []);

  const clearAllSelections = useCallback(() => {
    setProductConfigs(initialConfigs);
    setReportData(null);
    setSelectedProfileProductsDataState([]);
    // Reset report settings to default or clear them
    setReportType('tiered');
    setOutputType('percentage');
    setIsReportConfigSet(true); // Keep default visible after clear
    toast({ title: "Selections Cleared", description: "All product configurations have been reset." });
  }, [initialConfigs, toast]);

  const setReportSettings = useCallback((newReportType: ReportType, newOutputType: OutputType) => {
    setReportType(newReportType);
    setOutputType(newOutputType);
    setIsReportConfigSet(true);
    toast({ title: "Report Settings Updated", description: `Type: ${newReportType}, Output: ${newOutputType}` });
  }, [toast]);

  const setGeneratedReportData = useCallback((data: ReportData | null) => {
    setReportData(data);
  }, []);

  const runSimulation = useCallback(() => {
    // This is where the complex logic from `calculateReportData` would go.
    // For now, it's a placeholder. The actual calculation happens in `SimulatorPage`
    // and then `setGeneratedReportData` is called.
    console.log("Simulation run triggered with current settings:", reportType, outputType);
    if (!isReportConfigSet) {
      toast({ title: "Configuration Required", description: "Please set report type first.", variant: "destructive" });
      return;
    }
    const activeConfigured = productConfigs.filter(p => p.isActive && p.product);
    if (activeConfigured.length === 0) {
       toast({ title: "Configuration Required", description: "Please configure at least one active product.", variant: "destructive" });
       return;
    }
    // Actual data calculation will be handled in the page component calling this
  }, [reportType, outputType, isReportConfigSet, productConfigs, toast]);
  
  const profileProducts = useMemo(() => productConfigs
    .filter(p => p.isActive && p.product)
    .map(p => ({ id: p.id, name: `Product ${p.id}`, product: p.product as ConstantProductType })), [productConfigs]);

  const showBrandedAlert = useCallback((title: string, description: string) => {
    toast({ title, description });
  }, [toast]);

  const setSelectedProfileProductsData = useCallback((products: ProductConfig[]) => {
    setSelectedProfileProductsDataState(products);
  }, []);


  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        productConfigs,
        reportType,
        outputType,
        isReportConfigSet,
        reportData,
        profileProducts,
        selectedProfileProductsData,
        authenticate,
        updateProductConfig,
        toggleProductActive,
        clearAllSelections,
        setReportSettings,
        runSimulation,
        setGeneratedReportData,
        isFeatureModalOpen,
        openFeatureModal,
        closeFeatureModal,
        currentEditingProduct,
        addSelectedFeaturesToProduct,
        isReportConfigModalOpen,
        openReportConfigModal,
        closeReportConfigModal,
        isProfileSelectModalOpen,
        openProfileSelectModal,
        closeProfileSelectModal,
        setSelectedProfileProductsData,
        showBrandedAlert,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
