"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductConfig } from '@/lib/types';

interface ProfileDisplayProps {
  selectedProductsData: ProductConfig[];
}

export default function ProfileDisplay({ selectedProductsData }: ProfileDisplayProps) {
  if (selectedProductsData.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Product Profile Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedProductsData.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedProductsData.map(product => (
              <Card key={product.id} className="bg-muted/20">
                <CardHeader className="bg-secondary/30 p-3">
                  <CardTitle className="text-base">Product {product.id}: {product.product}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-xs space-y-1">
                  <p><strong>Monthly Rate:</strong> ${product.monthlyRate.toFixed(2)}</p>
                  <p><strong>Pricing Type:</strong> {product.pricingType || 'N/A'}</p>
                  {product.pricingType === 'both' && <p><strong>Discount:</strong> {product.discount || 'None'}</p>}
                  {product.readerFeatures.length > 0 && <p><strong>Reader:</strong> {product.readerFeatures.join(', ')}</p>}
                  {product.streamingFeatures.length > 0 && <p><strong>Streaming:</strong> {product.streamingFeatures.join(', ')}</p>}
                  {product.verticals.length > 0 && <p><strong>Verticals:</strong> {product.verticals.join(', ')}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Select products via "Show Profiles" to compare.</p>
        )}
      </CardContent>
    </Card>
  );
}
