
import type { ProductType as ConstantProductType } from './constants';

export interface ProductConfig {
  id: number;
  product: ConstantProductType | '';
  readerFeatures: string[];
  streamingFeatures: string[];
  verticals: string[];
  monthlyRate: number;
  pricingType: PricingType;
  discount: DiscountType;
  isActive: boolean;
}

export type PricingType = '' | 'monthly' | 'annual' | 'both';
export type DiscountType = '' | 'free' | '30' | '50';


export interface ReportDataRow {
  name: string;
  values: Record<number, string>; 
  indent: number | null;
}

export interface ReportDataSegment {
  group: string;
  rows: ReportDataRow[];
}

export interface ReportData {
  products: { id: number; name: string; config: ProductConfig }[];
  data: ReportDataSegment[];
}

export interface ProfileProduct {
  id: number;
  name: string;
  product: ConstantProductType | '';
}

export type ReportType = 'tiered' | 'independent';
export type OutputType = 'percentage' | 'population' | 'revenue';

export interface AiConfiguratorInput {
  goals: string;
  constraints: string;
  availableFeatures: string[];
  products: string[];
}

export interface SuggestedBundle {
  bundleName: string;
  features: string[];
  price: number;
  description: string;
}

export interface AiConfiguratorOutput {
  suggestedBundles: SuggestedBundle[];
  reasoning: string;
}

export interface ProductProfileDataItem {
  profile: string;
  variable: string;
  value: string;
}

export interface ProductProfileData {
  productName: string;
  monthlyRate: number;
  populationSize: number;
  tamProportion: number;
  estimatedYr1Revenue: number;
  profileMetrics: ProductProfileDataItem[];
}

export interface SensitivityPoint {
  variation: number;
  newPrice: number;
  takeRate: string; 
  population: string; 
  revenue: string; 
}

// Re-export for convenience
export type { ConstantProductType as ProductType };

export interface MarketFactors {
  awareness: number;
  distribution: number;
  competitive: number;
  marketing: number;
}

