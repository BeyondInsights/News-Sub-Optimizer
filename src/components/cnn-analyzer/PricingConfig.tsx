"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PRICING_RANGES } from '@/lib/constants';
import type { ProductConfig, ProductType, PricingType, DiscountType } from '@/lib/types';

interface PricingConfigProps {
  productConfig: ProductConfig;
  onUpdate: (updates: Partial<ProductConfig>) => void;
}

export default function PricingConfig({ productConfig, onUpdate }: PricingConfigProps) {
  const { product, verticals, monthlyRate, pricingType, discount } = productConfig;

  const getPricingDetails = () => {
    if (!product) return { min: 5, max: 50, default: 10, prices: [5,10,25,50] };
    if (product === 'CNN Standalone Vertical') {
      return PRICING_RANGES[product];
    }
    const verticalCount = verticals.length;
    return PRICING_RANGES[product]?.[verticalCount] || PRICING_RANGES[product]?.[0] || { min: 5, max: 50, default: 10, prices: [5,10,25,50] };
  };

  const pricingDetails = getPricingDetails();
  
  // Ensure monthlyRate is within current min/max
  useEffect(() => {
    if (monthlyRate < pricingDetails.min || monthlyRate > pricingDetails.max) {
      onUpdate({ monthlyRate: pricingDetails.default });
    }
  }, [pricingDetails, monthlyRate, onUpdate]);


  const handlePriceChange = (value: number[]) => {
    onUpdate({ monthlyRate: value[0] });
  };

  const handlePricingTypeChange = (type: PricingType) => {
    onUpdate({ pricingType: type, discount: type !== 'both' ? '' : discount });
  };

  const handleDiscountChange = (newDiscount: DiscountType) => {
    onUpdate({ discount: newDiscount });
  };

  const renderPricingDisplay = () => {
    const rate = monthlyRate;
    if (pricingType === 'both' && discount) {
      let year1MonthlyTotal = rate * 12; // Assuming monthly payment means no discount on M2M
      let year1AnnualTotal = rate * 12;

      if (discount === 'free') year1AnnualTotal = rate * 9; // 3 months free on annual
      else if (discount === '30') year1AnnualTotal = rate * 12 * 0.7;
      else if (discount === '50') year1AnnualTotal = rate * 12 * 0.5;

      return (
        <table className="w-full text-xs border-collapse mt-2">
          <thead>
            <tr className="bg-muted/30">
              <th className="border p-1 text-left"></th>
              <th className="border p-1">$/mo</th>
              <th className="border p-1">Month-to-Month (Total)</th>
              <th className="border p-1">12-Mo Sub (Total)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-1 font-semibold">Year 1</td>
              <td className="border p-1 text-center">${rate.toFixed(2)}</td>
              <td className="border p-1 text-center">${year1MonthlyTotal.toFixed(2)}</td>
              <td className="border p-1 text-center">${year1AnnualTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border p-1 font-semibold">Year 2</td>
              <td className="border p-1 text-center">${rate.toFixed(2)}</td>
              <td className="border p-1 text-center">${(rate * 12).toFixed(2)}</td>
              <td className="border p-1 text-center">${(rate * 12).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      );
    }
    return (
      <div className="text-sm mt-2 space-y-1">
        <div><strong>Monthly:</strong> ${rate.toFixed(2)}</div>
        <div className="text-muted-foreground">Inferred Annual: ${(rate * 12).toFixed(2)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-3 mt-3">
      <Label className="text-sm font-medium">Configure Pricing</Label>
      <div className="flex gap-2">
        {(['monthly', 'annual', 'both'] as PricingType[]).map(type => (
          <Button
            key={type}
            variant={pricingType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePricingTypeChange(type)}
            className="flex-1 capitalize"
          >
            {type === 'monthly' ? 'Monthly Only' : type === 'annual' ? 'Annual Only' : type}
          </Button>
        ))}
      </div>

      {pricingType === 'both' && (
        <Card className="bg-muted/20 p-3">
          <CardContent className="p-0">
            <Label className="text-xs font-semibold">Select Discount for Annual Plan</Label>
            <RadioGroup value={discount} onValueChange={(value) => handleDiscountChange(value as DiscountType)} className="mt-2 space-y-1.5">
              {(['free', '30', '50'] as DiscountType[]).map(discOpt => (
                <div key={discOpt} className="flex items-center space-x-2">
                  <RadioGroupItem value={discOpt} id={`discount-${productConfig.id}-${discOpt}`} />
                  <Label htmlFor={`discount-${productConfig.id}-${discOpt}`} className="text-xs">
                    {discOpt === 'free' ? '3 Months Free' : `${discOpt}% off 12-Mo Sub`}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}
      
      <div>
        <Slider
          min={pricingDetails.min}
          max={pricingDetails.max}
          step={ (pricingDetails.prices && pricingDetails.prices.length > 1) ? (pricingDetails.prices[1] - pricingDetails.prices[0]) / 2 : 0.01 } // Allow intermediate values or snap to defined prices
          value={[monthlyRate]}
          onValueChange={handlePriceChange}
          className="my-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${pricingDetails.min.toFixed(2)}/mo</span>
          <span>${pricingDetails.max.toFixed(2)}/mo</span>
        </div>
      </div>

      <div className="p-2 border rounded-md bg-background shadow-inner">
        {renderPricingDisplay()}
      </div>
    </div>
  );
}
