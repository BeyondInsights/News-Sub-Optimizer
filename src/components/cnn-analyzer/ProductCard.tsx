
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import FeatureList from "./FeatureList";
import PricingConfig from "./PricingConfig";
import { useAppContext } from '@/contexts/AppContext';
import { PRODUCT_TYPES, AVAILABLE_FEATURES, PRICING_RANGES } from '@/lib/constants';
import type { ProductConfig, ProductType as ConstantProductType } from '@/lib/types';

interface ProductCardProps {
  productConfig: ProductConfig;
}

export default function ProductCard({ productConfig }: ProductCardProps) {
  const { updateProductConfig, openFeatureModal } = useAppContext();
  const { id, product, readerFeatures, streamingFeatures, verticals, isActive } = productConfig;

  const handleProductTypeChange = (value: string) => {
    const newProductType = value as ConstantProductType | '';
    let updates: Partial<ProductConfig> = { product: newProductType };
    
    // Reset features and verticals if product type changes to something incompatible or empty
    if (newProductType === '' || newProductType === 'CNN Standalone Vertical') {
        updates = {...updates, readerFeatures: [], streamingFeatures: [], verticals: []};
    } else if (newProductType === 'CNN Reader') {
        updates = {...updates, streamingFeatures: []};
    } else if (newProductType === 'CNN Streaming') {
        updates = {...updates, readerFeatures: []};
    }
    // For All-Access, keep existing compatible features

    // Reset monthlyRate based on new product type and default vertical count (0)
    if (newProductType && newProductType !== "CNN Standalone Vertical") {
        const pricingDetails = PRICING_RANGES[newProductType]?.[0] || { default: 10 };
        updates.monthlyRate = pricingDetails.default;
    } else if (newProductType === "CNN Standalone Vertical") {
        updates.monthlyRate = PRICING_RANGES[newProductType].default;
    }


    updateProductConfig(id, updates);
  };

  const handleUpdatePricing = (updates: Partial<ProductConfig>) => {
    updateProductConfig(id, updates);
  };

  const handleRemoveFeature = (featureType: 'reader' | 'streaming' | 'vertical', feature: string) => {
    const currentFeatures = productConfig[featureType === 'vertical' ? 'verticals' : `${featureType}Features`];
    const updatedFeatures = currentFeatures.filter(f => f !== feature);
    
    let updates: Partial<ProductConfig> = { [featureType === 'vertical' ? 'verticals' : `${featureType}Features`]: updatedFeatures };

    if (featureType === 'vertical' && productConfig.product && productConfig.product !== "CNN Standalone Vertical") {
        const pricingDetails = PRICING_RANGES[productConfig.product]?.[updatedFeatures.length] || PRICING_RANGES[productConfig.product]?.[0] || { default: 10 };
        updates.monthlyRate = pricingDetails.default; // Reset to default for new tier
    }
    updateProductConfig(id, updates);
  };
  
  const renderContent = () => {
    if (!product) return null;

    if (product === 'CNN Standalone Vertical') {
      return (
        <div className="space-y-2 mt-4">
          <Label htmlFor={`vertical-select-${id}`}>Select Vertical</Label>
          <Select
            value={verticals[0] || ""}
            onValueChange={(value) => updateProductConfig(id, { verticals: value ? [value] : [] })}
          >
            <SelectTrigger id={`vertical-select-${id}`}>
              <SelectValue placeholder="Select Vertical" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FEATURES.vertical.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-4">
        {(product === 'CNN Reader' || product === 'CNN All-Access') && (
          <FeatureList
            productId={id}
            featureType="reader"
            features={readerFeatures}
            onAddFeatures={() => openFeatureModal(id, 'reader')}
            onRemoveFeature={(feature) => handleRemoveFeature('reader', feature)}
          />
        )}
        {(product === 'CNN Streaming' || product === 'CNN All-Access') && (
          <FeatureList
            productId={id}
            featureType="streaming"
            features={streamingFeatures}
            onAddFeatures={() => openFeatureModal(id, 'streaming')}
            onRemoveFeature={(feature) => handleRemoveFeature('streaming', feature)}
          />
        )}
        <FeatureList
          productId={id}
          featureType="vertical"
          features={verticals}
          onAddFeatures={() => openFeatureModal(id, 'vertical')}
          onRemoveFeature={(feature) => handleRemoveFeature('vertical', feature)}
          maxFeatures={3}
        />
      </div>
    );
  };

  return (
    <Card className={`w-[380px] min-w-[380px] flex flex-col relative transition-opacity duration-300 ${!isActive ? 'opacity-50 product-card-inactive' : ''}`}>
      <CardHeader className="bg-primary text-primary-foreground text-center p-3">
        <CardTitle className="text-base font-semibold uppercase">
          {product || `Product ${id}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow overflow-y-auto">
        <Label htmlFor={`product-type-select-${id}`}>Base Product</Label>
        <Select value={product || ""} onValueChange={handleProductTypeChange}>
          <SelectTrigger id={`product-type-select-${id}`}>
            <SelectValue placeholder="Select Base Product" />
          </SelectTrigger>
          <SelectContent>
            {/* The SelectItem with value="" was removed from here */}
            {PRODUCT_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {renderContent()}
      </CardContent>
      {product && (
        <CardFooter className="p-4 border-t">
          <PricingConfig productConfig={productConfig} onUpdate={handleUpdatePricing} />
        </CardFooter>
      )}
    </Card>
  );
}
