"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { runServerSimulation, getProductProfile, runPriceSensitivityAnalysis } from './actions'; // Import the server action
import type { ProductConfig, ReportData, ReportType, OutputType, ProductProfileData, SensitivityPoint, MarketFactors } from '@/lib/types';
import demographicsSample from '@/data/demographics.json'; // Import sample demographics
import attributeImportanceSample from '@/data/attributeImportance.json';
import partWorthUtilitiesSample from '@/data/partWorthUtilities.json';
import respondentData from '@/data/respondentData.json';
import verticalMappings from '@/data/verticalMapping.json';
import Link from 'next/link';

import coreProductDescriptionsData from '@/data/coreProductDescriptions.json';
import readerFeatureDescriptionsData from '@/data/readerFeatureDescriptions.json';
import streamingFeatureDescriptionsData from '@/data/streamingFeatureDescriptions.json';
import verticalDescriptionsData from '@/data/verticalDescriptions.json';


// Combine feature lists for product card dropdowns
const AVAILABLE_FEATURES_LISTS = {
  reader: Object.keys(readerFeatureDescriptionsData),
  streaming: Object.keys(streamingFeatureDescriptionsData),
  vertical: Object.keys(verticalDescriptionsData),
};

// For "Review Core Products" modal dropdown
const CORE_PRODUCT_TYPES_CONST = Object.keys(coreProductDescriptionsData);


const marketFactorDefinitions: Record<keyof MarketFactors, { title: string; definition: string; considerations: string; guidance: string[]; }> = {
  awareness: { title: "Awareness Reach", definition: "The percentage of your target market that will become aware of your new product/offering through your marketing campaigns and launch activities.", considerations: "How broad and effective will your launch marketing be? Are you entering a crowded market? Is there existing brand recognition?", guidance: ["Low (e.g., 20-40%): Suggests a niche product, limited marketing budget, soft launch, or entering a highly competitive market with low initial visibility.", "Medium (e.g., 50-70%): Represents a standard launch for an established brand with reasonable marketing spend, or a new product with some pre-launch buzz.", "High (e.g., 80-100%): Indicates a major product launch with significant media spend, strong PR, viral potential, or high anticipation."] },
  distribution: { title: "Distribution Coverage", definition: "The percentage of your target market that can realistically access or purchase your product.", considerations: "Is your product available on all key platforms (web, iOS, Android)? Are there any geographical limitations or partnership dependencies?", guidance: ["Low (e.g., 50-70%): Product might be available on limited platforms or have some access barriers.", "Medium (e.g., 75-90%): Good availability across common platforms and channels.", "High (e.g., 95-100%): Ubiquitous access; the product is very easy to find and subscribe to across all relevant channels."] },
  competitive: { title: "Competitive Factors", definition: "How strong is the competition? A high percentage means competitors have minimal negative impact on your ability to convert interested consumers.", considerations: "Are there strong direct alternatives? What is the general market saturation? How differentiated is your offering?", guidance: ["Low (e.g., 70-80%): Highly competitive market with many strong alternatives, or your product has few unique selling propositions.", "Medium (e.g., 85-90%): Standard competitive landscape; your product has some differentiation but faces notable competitors.", "High (e.g., 95-100%): Low direct competition, highly unique offering, or significant market advantage."] },
  marketing: { title: "Marketing Efficiency", definition: "The effectiveness of your marketing messaging and conversion funnels in turning aware and able prospects into actual subscribers.", considerations: "How compelling is your value proposition? How easy is the sign-up process? Is your pricing perceived as fair? How effective are your calls to action?", guidance: ["Low (e.g., 60-70%): Marketing message may not be resonating strongly, conversion funnel might have friction, or pricing could be a barrier.", "Medium (e.g., 75-85%): Solid marketing message and a reasonably smooth conversion process.", "High (e.g., 90-100%): Highly compelling offer, very clear value proposition, and a frictionless sign-up/purchase experience."] }
};

const presetScenarioDefinitions: Record<string, { name: string; description: string; factors: MarketFactors}> = {
  "Conservative Launch": { name: "Conservative Launch", description: "Assumes lower market awareness, more challenging distribution, a tougher competitive environment, and lower marketing conversion efficiency. Use when budget is constrained, market entry is difficult, product is very niche, or a cautious approach is preferred.", factors: { awareness: 50, distribution: 70, competitive: 85, marketing: 70 } },
  "Standard Launch": { name: "Standard Launch", description: "Represents a balanced and realistic set of assumptions for a typical product launch. Use when you have a solid go-to-market plan, reasonable brand recognition, and an average competitive landscape. This is often a good starting point.", factors: { awareness: 70, distribution: 85, competitive: 90, marketing: 80 } },
  "Aggressive Launch": { name: "Aggressive Launch", description: "Assumes high market awareness, excellent distribution, a favorable competitive landscape (or strong differentiation), and highly effective marketing. Use when significant budget is allocated, strong marketing campaigns are planned, there's high anticipation, or you aim for rapid market penetration.", factors: { awareness: 85, distribution: 95, competitive: 95, marketing: 90 } }
};


interface CardData {
  product: string;
  readerFeatures: string[];
  streamingFeatures: string[];
  verticals: string[];
  monthlyRate: number;
  pricingType: string;
  discount: string;
}

const pricingRanges = {
    'CNN Standalone Vertical': { prices: [1.99, 3.99, 5.99, 7.99], min: 1.99, max: 7.99, default: 3.99 },
    'CNN Reader': {
      0: { prices: [3.99, 6.99, 9.99, 14.99], min: 3.99, max: 14.99, default: 6.99 },
      1: { prices: [5.49, 8.49, 11.49, 16.99], min: 5.49, max: 16.99, default: 8.49 },
      2: { prices: [6.99, 10.99, 14.99, 19.49], min: 6.99, max: 19.49, default: 10.99 },
      3: { prices: [8.49, 12.99, 16.99, 21.99], min: 8.49, max: 21.99, default: 12.99 }
    },
    'CNN Streaming': {
      0: { prices: [4.99, 8.49, 11.99, 16.99], min: 4.99, max: 16.99, default: 8.49 },
      1: { prices: [6.49, 9.99, 13.99, 17.99], min: 6.49, max: 17.99, default: 9.99 },
      2: { prices: [7.99, 11.99, 15.99, 21.49], min: 7.99, max: 21.49, default: 11.99 },
      3: { prices: [9.49, 13.99, 17.99, 24.99], min: 9.49, max: 24.99, default: 13.99 }
    },
    'CNN All-Access': {
      0: { prices: [5.99, 11.99, 17.99, 24.99], min: 5.99, max: 24.99, default: 11.99 },
      1: { prices: [7.99, 12.99, 18.99, 25.99], min: 7.99, max: 25.99, default: 12.99 },
      2: { prices: [9.99, 14.99, 21.49, 30.49], min: 9.99, max: 30.49, default: 14.99 },
      3: { prices: [11.99, 16.99, 23.99, 34.99], min: 11.99, max: 34.99, default: 16.99 }
    }
  };

interface DemoData {
  Respondent_ID: string;
  Gender?: string;
  Age_Group?: string;
  Political?: string;
  CNN_Access?: string;
  News_Subs?: number;
  Linear_TV?: string;
  Ad_Preference?: string;
  SG?: number;
  hAgeRecode?: number;
  SE?: number;
  SI?: number;
  S201?: number;
  S214?: number;
  TV5a06?: number;
  TV5b06?: number;
  N312?: number;
  N4_loop_13_N4?: number;
  [key: string]: any;
}

// Calculation functions for conjoint analysis
function calculateSingleProductTotalUtility(productConfig: any, respondentUtilData: any) {
    let utility = 0;

    // 1. Base Product Utility
    const baseProductKey = productConfig.product;
    if (baseProductKey === 'CNN Reader') utility += respondentUtilData.base.reader || 0;
    else if (baseProductKey === 'CNN Streaming') utility += respondentUtilData.base.streaming || 0;
    else if (baseProductKey === 'CNN All-Access') utility += respondentUtilData.base.allAccess || 0;
    else if (baseProductKey === 'CNN Standalone Vertical') utility += respondentUtilData.base.standalone || 0;

    // 2. Features Utility (Bundled - using all_features)
    if (respondentUtilData.all_features) {
        if (baseProductKey === 'CNN Reader' && respondentUtilData.all_features.reader) {
            for (const featUtil of Object.values(respondentUtilData.all_features.reader)) {
                utility += featUtil as number;
            }
        } else if (baseProductKey === 'CNN Streaming' && respondentUtilData.all_features.streaming) {
            for (const featUtil of Object.values(respondentUtilData.all_features.streaming)) {
                utility += featUtil as number;
            }
        } else if (baseProductKey === 'CNN All-Access') {
            if (respondentUtilData.all_features.reader) {
                for (const featUtil of Object.values(respondentUtilData.all_features.reader)) {
                    utility += featUtil as number;
                }
            }
            if (respondentUtilData.all_features.streaming) {
                for (const featUtil of Object.values(respondentUtilData.all_features.streaming)) {
                    utility += featUtil as number;
                }
            }
        }
    }

    // 3. Verticals Utility
    const numberOfSelectedVerticals = productConfig.verticals ? productConfig.verticals.length : 0;
    if (numberOfSelectedVerticals > 0 && respondentUtilData.verticals) {
        productConfig.verticals.forEach((verticalCode: string) => {
            if (respondentUtilData.verticals[verticalCode]) {
                utility += respondentUtilData.verticals[verticalCode];
            }
        });
    }
    
    // Add utility for the count of verticals
    if (respondentUtilData.verticalCount && respondentUtilData.verticalCount[numberOfSelectedVerticals.toString()]) {
        utility += respondentUtilData.verticalCount[numberOfSelectedVerticals.toString()];
    }

    // 4. Pricing Utility
    const P = productConfig.monthlyRate;
    if (respondentUtilData.price) {
        utility += (respondentUtilData.price.linear || 0) * P;
        utility += (respondentUtilData.price.squared || 0) * P * P;
    }

    // 5. Subscription Terms Utility
    const termChoice = productConfig.pricingType;
    const discountType = productConfig.discount;

    if (respondentUtilData.subscription) {
        if (termChoice === 'annual' || termChoice === 'both') {
            utility += respondentUtilData.subscription.is_annual || 0;
        }
        if (termChoice === 'both' && discountType) {
            utility += respondentUtilData.subscription.has_discount || 0;
            
            let discountPercentageValue = 0;
            if (discountType === 'free') discountPercentageValue = 0.0833; // ~1 month free
            else if (discountType === '30') discountPercentageValue = 0.30;
            else if (discountType === '50') discountPercentageValue = 0.50;
            
            utility += (respondentUtilData.subscription.discount_level || 0) * discountPercentageValue;
        }
    }
    
    return utility;
}

function calculateMarketShares(
    configuredProductObjects: any[],
    allrespondentData: any,
    applyProbabilityThreshold: boolean,
    probabilityThresholdValue: number
) {
    const marketSharesAccumulator: Record<string, number> = {};
    const productIdentifiers = configuredProductObjects.map(p => p.id);

    productIdentifiers.forEach(id => marketSharesAccumulator[id] = 0);
    marketSharesAccumulator['None'] = 0;

    let totalRespondentWeightSum = 0;

    for (const respondentId in allrespondentData) {
        const respondentData = allrespondentData[respondentId];
        const respondentWeight = respondentData.weight || 1;
        totalRespondentWeightSum += respondentWeight;

        const utilitiesForCurrentRespondent: number[] = [];
        const productOrderForProbs: (string | number)[] = [];

        configuredProductObjects.forEach(productConfig => {
            const utility = calculateSingleProductTotalUtility(productConfig, respondentData);
            utilitiesForCurrentRespondent.push(utility);
            productOrderForProbs.push(productConfig.id);
        });

        utilitiesForCurrentRespondent.push(0); // Utility of None
        productOrderForProbs.push('None');

        const expUtilities = utilitiesForCurrentRespondent.map(u => Math.exp(u));
        const sumExpUtilities = expUtilities.reduce((sum, val) => sum + val, 0);

        let probabilities = expUtilities.map(expU => (sumExpUtilities > 0 ? expU / sumExpUtilities : 0));

        if (applyProbabilityThreshold) {
            let newProbabilities = [...probabilities];
            let noneOptionIndex = productOrderForProbs.indexOf('None');
            let probabilityReallocatedToNone = 0;

            for (let i = 0; i < newProbabilities.length; i++) {
                if (productOrderForProbs[i] !== 'None') {
                    if (newProbabilities[i] < probabilityThresholdValue) {
                        probabilityReallocatedToNone += newProbabilities[i];
                        newProbabilities[i] = 0;
                    }
                }
            }
            if (noneOptionIndex !== -1) {
                newProbabilities[noneOptionIndex] += probabilityReallocatedToNone;
            }
            probabilities = newProbabilities;
        }

        probabilities.forEach((prob, index) => {
            const productKey = productOrderForProbs[index];
            marketSharesAccumulator[productKey] += prob * respondentWeight;
        });
    }

    const finalMarketShares: Record<string | number, number> = {};
    for (const productKey in marketSharesAccumulator) {
        if (totalRespondentWeightSum > 0) {
            finalMarketShares[productKey] = (marketSharesAccumulator[productKey] / totalRespondentWeightSum) * 100;
        } else {
            finalMarketShares[productKey] = 0;
        }
    }
    return finalMarketShares;
}

export default function SimulatorPage() {
  // INTERNAL SETTING - Not exposed to users
  // Change this value to adjust the probability threshold
  const PROBABILITY_THRESHOLD = 0.20; // 20% threshold
  const APPLY_THRESHOLD = true;       // Whether to apply threshold at all

  const initialCardSetup = (): Record<number, CardData> => {
    const setup: Record<number, CardData> = {};
    for (let i = 1; i <= 8; i++) {
      setup[i] = {
        product: '',
        readerFeatures: [],
        streamingFeatures: [],
        verticals: [],
        monthlyRate: 10,
        pricingType: '',
        discount: ''
      };
    }
    return setup;
  };

  const [cardDataState, setCardDataState] = useState<Record<number, CardData>>(initialCardSetup());
  const [activeProductsState, setActiveProductsState] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [currentModalDataState, setCurrentModalDataState] = useState<{ cardNum: number; type: 'reader' | 'streaming' | 'vertical' } | null>(null);
  const [currentReportTypeState, setCurrentReportTypeState] = useState<ReportType>('tiered');
  const [currentOutputTypeState, setCurrentOutputTypeState] = useState<OutputType>('percentage');

  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false); // Keep this false to bypass login

  const [featureModalVisible, setFeatureModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [isMarketSizingModalVisible, setIsMarketSizingModalVisible] = useState(false);

  const [modalAvailableFeatures, setModalAvailableFeatures] = useState<string[]>([]);
  const [modalSelectedFeatures, setModalSelectedFeatures] = useState<Record<string, boolean>>({});

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const reportTypeDisplayRef = useRef<HTMLDivElement>(null);

  const [alertModal, setAlertModal] = useState<{ title: string; message: string; onConfirm?: () => void; type: 'alert' | 'confirm' } | null>(null);

  const [profilesDataMap, setProfilesDataMap] = useState<Record<number, ProductProfileData | null>>({});
  const [profileSelectedProducts, setProfileSelectedProducts] = useState<number[]>([]);

  const [demographicsData, setDemographicsData] = useState<DemoData[]>([]);

  const [isSensitivityModalOpen, setIsSensitivityModalOpen] = useState(false);
  const [sensitivityProductId, setSensitivityProductId] = useState<number | null>(null);
  const [sensitivityPriceVariationsInput, setSensitivityPriceVariationsInput] = useState("-20, -10, 0, 10, 20");
  const [sensitivityResults, setSensitivityResults] = useState<SensitivityPoint[] | null>(null);
  const [isAnalyzingSensitivity, setIsAnalyzingSensitivity] = useState(false);
  const [isSensitivityResultsModalOpen, setIsSensitivityResultsModalOpen] = useState(false);

  const [isMarketFactorsModalOpen, setIsMarketFactorsModalOpen] = useState(false);
  const [marketFactors, setMarketFactors] = useState<MarketFactors>({ awareness: 70, distribution: 85, competitive: 90, marketing: 80 });
  const [selectedMarketScenario, setSelectedMarketScenario] = useState<string>("Standard Launch");
  const [baseTakeRateForModalDisplay, setBaseTakeRateForModalDisplay] = useState(8.5); // Example base rate
  const [impactVisualization, setImpactVisualization] = useState("");

  const [marketFactorInfoModalContent, setMarketFactorInfoModalContent] = useState<{ title: string; definition: string; considerations: string; guidance: string[]; } | null>(null);
  const [isPresetInfoModalOpen, setIsPresetInfoModalOpen] = useState(false);

  const [isReviewCoreProductsModalOpen, setIsReviewCoreProductsModalOpen] = useState(false);
  const [selectedCoreProductForReview, setSelectedCoreProductForReview] = useState<string>('');
  const [coreProductDescription, setCoreProductDescription] = useState<string>('');

  const [isReviewFeaturesModalOpen, setIsReviewFeaturesModalOpen] = useState(false);
  const [selectedFeatureTypeForReview, setSelectedFeatureTypeForReview] = useState<'reader' | 'streaming' | ''>('');
  const [selectedFeatureForReview, setSelectedFeatureForReview] = useState<string>('');
  const [featureDescription, setFeatureDescription] = useState<string>('');

  const [isReviewVerticalsModalOpen, setIsReviewVerticalsModalOpen] = useState(false);
  const [selectedVerticalForReview, setSelectedVerticalForReview] = useState<string>('');
  const [verticalDescription, setVerticalDescription] = useState<string>('');
  const [verticalFeaturesForReview, setVerticalFeaturesForReview] = useState<string[]>([]);


  const marketSizingData = [
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30", value: "168,042,784", percentage: "" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices", value: "157,241,160", percentage: "93.6%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs", value: "140,815,333", percentage: "83.8%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs\n+ Accessed News in P7D", value: "136,557,758", percentage: "81.3%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs\n+ Accessed News in P7D\n+ Familiar with CNN", value: "131,557,758", percentage: "78.4%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs\n+ Accessed News in P7D\n+ Familiar with CNN\n+ Non-Rejector of CNN", value: "105,624,640", percentage: "62.9%", note: "(80.1% of rejectors are Republican)" }
  ];

  const showBrandedAlert = useCallback((title: string, message: string) => {
    setAlertModal({ title, message, type: 'alert' });
  }, []);

  const showBrandedConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setAlertModal({ title, message, onConfirm, type: 'confirm' });
  }, []);

  const closeCustomModal = () => {
    setAlertModal(null);
  };

  const handleCustomConfirm = () => {
    if (alertModal && alertModal.onConfirm) {
      alertModal.onConfirm();
    }
    closeCustomModal();
  };

  const getPricingRangeForProduct = useCallback((product: string, verticalCount = 0) => {
    if (!product) return { min: 5, max: 50, default: 10, prices: [5,10,25,50]}; // Fallback
    if (product === 'CNN Standalone Vertical') {
      // @ts-ignore
      return pricingRanges[product as keyof typeof pricingRanges];
    }
    const productPricing = pricingRanges[product as keyof typeof pricingRanges] as any; // Cast for indexing
    if (productPricing && productPricing[verticalCount] !== undefined) {
      return productPricing[verticalCount];
    }
    // Fallback if specific vertical count tier isn't defined, use tier 0
    return productPricing?.[0] || { min: 5, max: 50, default: 10, prices: [5,10,25,50] };
  }, []);

  const updateCardState = useCallback((cardNum: number, updates: Partial<CardData>) => {
    setCardDataState(prev => {
      const currentCard = prev[cardNum];
      const newCard = { ...currentCard, ...updates };

      if (updates.product !== undefined || updates.verticals !== undefined) {
          let verticalCountForPricing = newCard.verticals.length;
          if (newCard.product === 'CNN Standalone Vertical') {
             verticalCountForPricing = newCard.verticals.length > 0 ? 1 : 0; // Standalone treats 1+ as same tier for pricing
          }
          const pricingDetails = getPricingRangeForProduct(newCard.product, verticalCountForPricing);
          newCard.monthlyRate = pricingDetails.default;
      }
      return { ...prev, [cardNum]: newCard };
    });
  }, [getPricingRangeForProduct]);


  const updateCardProductType = useCallback((cardNum: number, productType: string) => {
    const currentCard = cardDataState[cardNum];
    let verticalCountForPricing = 0;
    let updatedVerticals = currentCard.verticals;

    if (productType === 'CNN Standalone Vertical') {
        updatedVerticals = currentCard.verticals.length > 0 ? [currentCard.verticals[0]] : []; // Keep only first if exists
        verticalCountForPricing = updatedVerticals.length > 0 ? 1 : 0;
    } else {
        updatedVerticals = currentCard.verticals; // Keep existing verticals
        verticalCountForPricing = updatedVerticals.length;
    }

    const pricing = getPricingRangeForProduct(productType, verticalCountForPricing);

    let updatedFeatures: Partial<CardData> = {
        product: productType,
        monthlyRate: pricing.default,
        verticals: updatedVerticals
    };

    if (productType === 'CNN Reader') {
      updatedFeatures.streamingFeatures = [];
    } else if (productType === 'CNN Streaming') {
      updatedFeatures.readerFeatures = [];
    } else if (productType === 'CNN Standalone Vertical') {
      updatedFeatures.readerFeatures = [];
      updatedFeatures.streamingFeatures = [];
    }
    updateCardState(cardNum, updatedFeatures);
  }, [cardDataState, getPricingRangeForProduct, updateCardState]);


  const updateStandaloneVertical = useCallback((cardNum: number, verticalName: string) => {
    const currentCard = cardDataState[cardNum];
    if (currentCard.product !== 'CNN Standalone Vertical') return;

    const newVerticals = verticalName ? [verticalName] : []; // Standalone only has one vertical
    const pricing = getPricingRangeForProduct(currentCard.product, newVerticals.length > 0 ? 1:0); // Use 1 if any vertical, 0 if none
    updateCardState(cardNum, { verticals: newVerticals, monthlyRate: pricing.default });
  }, [cardDataState, getPricingRangeForProduct, updateCardState]);


  const updateFeatureList = useCallback((cardNum: number, type: 'reader' | 'streaming' | 'vertical', newFeatures: string[]) => {
    const currentCard = cardDataState[cardNum];
    const featureKey = type === 'vertical' ? 'verticals' : `${type}Features` as keyof CardData;

    let updates: Partial<CardData> = { [featureKey]: newFeatures as any };

    if (type === 'vertical' && currentCard.product && currentCard.product !== 'CNN Standalone Vertical') {
        const pricing = getPricingRangeForProduct(currentCard.product, newFeatures.length);
        updates.monthlyRate = pricing.default;
    } else if (type === 'vertical' && currentCard.product === 'CNN Standalone Vertical') {
        const pricing = getPricingRangeForProduct(currentCard.product, newFeatures.length > 0 ? 1:0);
        updates.monthlyRate = pricing.default;
    }
    updateCardState(cardNum, updates);
  }, [cardDataState, getPricingRangeForProduct, updateCardState]);


  const updatePrice = useCallback((cardNum: number, value: number) => {
    updateCardState(cardNum, { monthlyRate: value });
  }, [updateCardState]);

  const updatePricingType = useCallback((cardNum: number, type: string) => {
    const currentCard = cardDataState[cardNum];
    updateCardState(cardNum, { pricingType: type, discount: type !== 'both' ? '' : currentCard.discount });
  }, [cardDataState, updateCardState]);

  const updateDiscount = useCallback((cardNum: number, discountValue: string) => {
    updateCardState(cardNum, { discount: discountValue });
  }, [updateCardState]);

  const updatePriceDisplayHTML = useCallback((cardNum: number): string => {
    const cardConfig = cardDataState[cardNum];
    if (!cardConfig || !cardConfig.product) return '';

    const rate = cardConfig.monthlyRate;
    const type = cardConfig.pricingType;
    const discount = cardConfig.discount;

    if (type === 'both' && discount) {
      let year1MonthlyTotal = rate * 12;
      let year1AnnualTotal = rate * 12;

      if (discount === 'free') year1AnnualTotal = rate * 9;
      else if (discount === '30') year1AnnualTotal = rate * 12 * 0.7;
      else if (discount === '50') year1AnnualTotal = rate * 12 * 0.5;

      return `
        <table class="pricing-table">
          <thead><tr>
            <th style="width: 20%;"></th>
            <th style="width: 20%;">$/mo</th>
            <th style="width: 30%;">Monthly (Total)</th>
            <th style="width: 30%;">12-Mo Sub (Total)</th>
          </tr></thead>
          <tbody>
            <tr><td><strong>Year 1</strong></td><td>$${rate.toFixed(2)}</td><td>$${year1MonthlyTotal.toFixed(2)}</td><td>$${year1AnnualTotal.toFixed(2)}</td></tr>
            <tr><td><strong>Year 2</strong></td><td>$${rate.toFixed(2)}</td><td>$${(rate * 12).toFixed(2)}</td><td>$${(rate * 12).toFixed(2)}</td></tr>
          </tbody>
        </table>`;
    } else {
      return `
        <div><strong>Monthly:</strong> $${rate.toFixed(2)}</div>
        <div style="color: #666;">Inferred Annual: $${(rate * 12).toFixed(2)}</div>`;
    }
  }, [cardDataState]);

   useEffect(() => {
    Object.keys(cardDataState).forEach(idStr => {
      const cardId = parseInt(idStr);
      const cardElement = document.querySelector(`.card[data-card="${cardId}"] .pricing-display`);
      if (cardElement) {
        cardElement.innerHTML = updatePriceDisplayHTML(cardId);
      }
      const mainCardDiv = document.querySelector(`.card[data-card="${cardId}"]`);
      if (mainCardDiv) {
          mainCardDiv.classList.toggle('inactive', !activeProductsState.has(cardId));
      }
    });
  }, [cardDataState, activeProductsState, updatePriceDisplayHTML]);


  const clearAllSelections = useCallback(() => {
    showBrandedConfirm(
      'Clear All Selections',
      'Are you sure you want to clear all product configurations? This cannot be undone.',
      () => {
        setCardDataState(initialCardSetup());
        setActiveProductsState(new Set([1, 2, 3, 4]));
        setReportData(null);
        setProfilesDataMap({});
        setProfileSelectedProducts([]);
        setCurrentReportTypeState('tiered');
        setCurrentOutputTypeState('percentage');
        if (reportTypeDisplayRef.current) {
          reportTypeDisplayRef.current.innerHTML = `<strong>Report Type:</strong> Tiered Bundles<br /><strong>Output:</strong> Take Rates (%)`;
        }
        showBrandedAlert('Success', 'All selections have been cleared!');
      }
    );
  }, [showBrandedAlert, showBrandedConfirm]);


  const toggleProduct = (cardId: number) => {
    setActiveProductsState(prev => {
      const newActive = new Set(prev);
      if (newActive.has(cardId)) { newActive.delete(cardId); }
      else { newActive.add(cardId); }
      return newActive;
    });
  };

  const addFeaturesModalOpen = (cardId: number, type: 'reader' | 'streaming' | 'vertical') => {
    const cardConfig = cardDataState[cardId];
    if (!cardConfig) return;

    const currentFeaturesKey = type === 'vertical' ? 'verticals' : `${type}Features` as keyof CardData;
    // @ts-ignore
    const currentProductFeatures = cardConfig[currentFeaturesKey] as string[];

    let allPossibleFeaturesForType: string[] = [];
    if (type === 'reader') allPossibleFeaturesForType = AVAILABLE_FEATURES_LISTS.reader;
    else if (type === 'streaming') allPossibleFeaturesForType = AVAILABLE_FEATURES_LISTS.streaming;
    else if (type === 'vertical') allPossibleFeaturesForType = AVAILABLE_FEATURES_LISTS.vertical;


    let available: string[];
    if (type === 'vertical' && cardConfig.product === 'CNN Standalone Vertical') {
      available = allPossibleFeaturesForType;
    } else {
      available = allPossibleFeaturesForType.filter(f => !currentProductFeatures.includes(f));
    }

    if (type === 'vertical' && cardConfig.product !== 'CNN Standalone Vertical' && currentProductFeatures.length >= 3 && !available.some(f => currentProductFeatures.includes(f))) {
        showBrandedAlert('Maximum Reached', 'Maximum 3 verticals allowed for this product type.');
        return;
    }

    if (available.length === 0 && !(type === 'vertical' && cardConfig.product === 'CNN Standalone Vertical')) {
      showBrandedAlert('No More Items', 'No more items available to add for this category.');
      return;
    }

    setCurrentModalDataState({ cardNum: cardId, type });
    setModalAvailableFeatures(available);

    if (type === 'vertical' && cardConfig.product === 'CNN Standalone Vertical' && currentProductFeatures.length > 0) {
      setModalSelectedFeatures({ [currentProductFeatures[0]]: true });
    } else {
      setModalSelectedFeatures({});
    }
    setFeatureModalVisible(true);
  };


  const handleModalFeatureToggle = (featureName: string) => {
    if (!currentModalDataState) return;
    const { type, cardNum } = currentModalDataState;
    const cardConfig = cardDataState[cardNum];
    if (!cardConfig) return;

    const isCurrentlySelectedInModal = modalSelectedFeatures[featureName];

    if (type === 'vertical') {
      if (cardConfig.product === 'CNN Standalone Vertical') {
        if (!isCurrentlySelectedInModal) {
          setModalSelectedFeatures({ [featureName]: true });
        } else {
          setModalSelectedFeatures({});
        }
        return;
      } else {
        const existingVerticalsCount = cardConfig.verticals.length;
        const modalSelectionsCount = Object.values(modalSelectedFeatures).filter(Boolean).length;
        if (!isCurrentlySelectedInModal && (existingVerticalsCount + modalSelectionsCount >= 3)) {
          showBrandedAlert('Maximum Reached', 'Maximum 3 verticals allowed.');
          return;
        }
      }
    }
    setModalSelectedFeatures(prev => ({ ...prev, [featureName]: !prev[featureName] }));
  };


  const handleModalSelectAllFeatures = () => {
    if (!currentModalDataState || !cardDataState[currentModalDataState.cardNum]) return;
    const { type } = currentModalDataState;

    if (type === 'vertical') {
      showBrandedAlert("Action Not Allowed", "Select All is not available for verticals due to item limits and selection rules.");
      return;
    }

    const newSelections: Record<string, boolean> = {};
    modalAvailableFeatures.forEach(f => newSelections[f] = true);
    setModalSelectedFeatures(newSelections);
  };


  const addSelectedFeaturesFromModal = () => {
    if (!currentModalDataState) return;
    const { cardNum, type } = currentModalDataState;
    const cardConfig = cardDataState[cardNum];
    if (!cardConfig) return;

    const featuresToAddFromModal = Object.entries(modalSelectedFeatures)
      .filter(([_, isSelected]) => isSelected)
      .map(([name, _]) => name);

    if (featuresToAddFromModal.length === 0) {
        if (type === 'vertical' && cardConfig.product === 'CNN Standalone Vertical' && cardConfig.verticals.length > 0 && featuresToAddFromModal.length === 0) {
             updateFeatureList(cardNum, type, []);
        }
        setFeatureModalVisible(false);
        return;
    }

    const currentFeaturesKey = (type === 'vertical' ? 'verticals' : `${type}Features`) as keyof CardData;
    let combinedFeatures: string[];

    if (type === 'vertical' && cardConfig.product === 'CNN Standalone Vertical') {
      combinedFeatures = featuresToAddFromModal.length > 0 ? [featuresToAddFromModal[0]] : [];
    } else {
      // @ts-ignore
      const currentProductFeatures = cardConfig[currentFeaturesKey] as string[];
      combinedFeatures = [...currentProductFeatures, ...featuresToAddFromModal];
      combinedFeatures = Array.from(new Set(combinedFeatures));

      if (type === 'vertical' && cardConfig.product !== 'CNN Standalone Vertical' && combinedFeatures.length > 3) {
        showBrandedAlert('Maximum Reached', 'Maximum 3 verticals allowed. Some selections were not added.');
        combinedFeatures = combinedFeatures.slice(0, 3);
      }
    }
    updateFeatureList(cardNum, type, combinedFeatures);
    setFeatureModalVisible(false);
  };


  const removeFeatureFromList = (cardNum: number, type: 'reader' | 'streaming' | 'vertical', featureToRemove: string) => {
    const cardConfig = cardDataState[cardNum];
    if(!cardConfig) return;
    const currentFeaturesKey = (type === 'vertical' ? 'verticals' : `${type}Features`) as keyof CardData;
    // @ts-ignore
    const currentFeatures = cardConfig[currentFeaturesKey] as string[];
    const updatedFeatures = currentFeatures.filter(f => f !== featureToRemove);
    updateFeatureList(cardNum, type, updatedFeatures);
  };


  const handleSetReportType = () => { setReportModalVisible(true); };

  const generateReportFromModal = () => {
    const reportTypeRadio = document.querySelector('input[name="reportTypeRadio"]:checked') as HTMLInputElement;
    const outputTypeRadio = document.querySelector('input[name="outputTypeRadio"]:checked') as HTMLInputElement;

    if (reportTypeRadio && outputTypeRadio) {
      const newReportType = reportTypeRadio.value as ReportType;
      const newOutputType = outputTypeRadio.value as OutputType;
      setCurrentReportTypeState(newReportType);
      setCurrentOutputTypeState(newOutputType);
      if (reportTypeDisplayRef.current) {
        const reportTypeText = newReportType === 'tiered' ? 'Tiered Bundles' : 'Independent Products';
        const outputTypeText = newOutputType === 'percentage' ? 'Take Rates (%)' : newOutputType === 'population' ? 'Population Counts (#)' : 'Revenue ($)';
        reportTypeDisplayRef.current.innerHTML = `<strong>Report Type:</strong> ${reportTypeText}<br /><strong>Output:</strong> ${outputTypeText}`;
      }
    }
    setReportModalVisible(false);
  };


  const handleRunSimulation = async () => {
    if (!currentReportTypeState || !currentOutputTypeState) {
        showBrandedAlert('Configuration Required', 'Please set report type first by clicking "Set Report Type"');
        return;
    }
    console.log("SIMULATION STARTED!");
    const activeConfigured = Array.from(activeProductsState)
        .filter(id => cardDataState[id] && cardDataState[id].product)
        .map(id => {
            const cardData = cardDataState[id];
            // Convert vertical names to D1_x codes
            const verticalCodes = cardData.verticals.map(verticalName => 
                (verticalMappings as any)[verticalName] || verticalName
            );
            
            return {
                id,
                ...cardData,
                verticals: verticalCodes, // Replace names with codes
                isActive: true
            };
        });

    if (activeConfigured.length === 0) {
        showBrandedAlert('Configuration Required', 'Please configure at least one active product before running simulation');
        return;
    }

    setIsSimulating(true);
    setReportData(null);
    
    const reportContainer = document.getElementById('reportContainer');
    const reportContentDiv = document.getElementById('reportContent');
    if (reportContainer && reportContentDiv) {
        reportContentDiv.innerHTML = `<div class="simulation-loading"><div class="spinner"></div>Running simulation...</div>`;
        reportContainer.style.display = 'block';
        reportContainer.scrollIntoView({ behavior: 'smooth' });
    }

    try {
        // Create demographics map for quick lookup
        const demographicsMap = new Map(
            demographicsSample.map(d => [d.sernofx?.toString() || d.Respondent_ID?.toString(), d])
        );

        // Apply market factors
        const TAM_SIZE = 105624640;
        const realizationFactor = (marketFactors.awareness / 100) * 
                                 (marketFactors.distribution / 100) * 
                                 (marketFactors.competitive / 100) * 
                                 (marketFactors.marketing / 100);

        // Create report data structure
        const reportProducts = activeConfigured.map(config => ({
            id: config.id,
            name: `Product ${config.id}`,
            config: config
        }));

        // Format the results based on output type
        const formatValue = (productId: number | string, share: number) => {
            const adjustedShare = share * realizationFactor;
            
            if (currentOutputTypeState === 'percentage') {
                return `${adjustedShare.toFixed(2)}%`;
            } else if (currentOutputTypeState === 'population') {
                const population = Math.round((adjustedShare / 100) * TAM_SIZE);
                return population.toLocaleString();
            } else { // revenue
                const population = Math.round((adjustedShare / 100) * TAM_SIZE);
                const product = activeConfigured.find(p => p.id === productId);
                const monthlyRate = product?.monthlyRate || 0;
                const monthlyRevenue = population * monthlyRate;
                return `$${monthlyRevenue.toLocaleString()}`;
            }
        };

        // Helper function to calculate segment-specific market shares
        const calculateSegmentMarketShares = (
            segment: { name: string; filter: (demo: any) => boolean }
        ) => {
            // Filter respondents by segment
            const segmentRespondents: any = {};
            
            for (const respondentId in respondentData) {
                const demo = demographicsMap.get(respondentId);
                if (demo && segment.filter(demo)) {
                    segmentRespondents[respondentId] = (respondentData as any)[respondentId];
                }
            }
            
            // Calculate market shares for just this segment
            return calculateMarketShares(
                currentReportTypeState === 'independent' ? [activeConfigured[0]] : activeConfigured,
                segmentRespondents,
                APPLY_THRESHOLD,
                PROBABILITY_THRESHOLD
            );
        };

        let reportData: ReportData;
        const allDataGroups = [];

        if (currentReportTypeState === 'independent') {
            // INDEPENDENT MODE: Calculate each product separately
            
            // First, add total market results
            const totalRows: any[] = [];
            
            for (const product of activeConfigured) {
                const singleProductShare = calculateMarketShares(
                    [product],
                    respondentData,
                    APPLY_THRESHOLD,
                    PROBABILITY_THRESHOLD
                );
                
                totalRows.push({
                    name: `${product.product} (Product ${product.id})`,
                    values: {
                        [product.id]: formatValue(product.id, singleProductShare[product.id] || 0)
                    },
                    indent: 0
                });
            }
            
            allDataGroups.push({
                group: 'Total Market - Independent Products',
                rows: totalRows
            });
            
            // Then add demographic segments
            const demographicSegments = [
                {
                    group: 'News Access & Subscriptions',
                    subgroups: [
                        { name: 'Regularly Access CNN', filter: (demo: any) => demo.CNN_Access === 'Regular', indent: 0 },
                        { name: 'Regularly Access CNN & 1+ News Subs', filter: (demo: any) => demo.CNN_Access === 'Regular' && demo.News_Subs > 0, indent: 1 },
                        { name: 'Regularly Access CNN & 0 News Subs', filter: (demo: any) => demo.CNN_Access === 'Regular' && demo.News_Subs === 0, indent: 1 },
                        { name: 'Occasionally Access CNN', filter: (demo: any) => demo.CNN_Access === 'Occasional', indent: 0 },
                        { name: 'Occasionally Access CNN & 1+ News Subs', filter: (demo: any) => demo.CNN_Access === 'Occasional' && demo.News_Subs > 0, indent: 1 },
                        { name: 'Occasionally Access CNN & 0 News Subs', filter: (demo: any) => demo.CNN_Access === 'Occasional' && demo.News_Subs === 0, indent: 1 }
                    ]
                },
                {
                    group: 'Gender',
                    subgroups: [
                        { name: 'Men', filter: (demo: any) => demo.Gender === 'Male' },
                        { name: 'Women', filter: (demo: any) => demo.Gender === 'Female' }
                    ]
                },
                {
                    group: 'Political Party',
                    subgroups: [
                        { name: 'Democrat', filter: (demo: any) => demo.Political === 'Democrat' },
                        { name: 'Independent', filter: (demo: any) => demo.Political === 'Independent' },
                        { name: 'Republican', filter: (demo: any) => demo.Political === 'Republican' }
                    ]
                },
                {
                    group: 'Age Groups',
                    subgroups: [
                        { name: '18-34', filter: (demo: any) => demo.Age_Group === '18-34' },
                        { name: '35-49', filter: (demo: any) => demo.Age_Group === '35-49' },
                        { name: '50-74', filter: (demo: any) => demo.Age_Group === '50-74' }
                    ]
                }
            ];
            
            // Calculate for each demographic segment
            for (const segmentGroup of demographicSegments) {
                const groupRows: any[] = [];
                
                for (const segment of segmentGroup.subgroups) {
                    const rowValues: any = {};
                    
                    // For independent mode, calculate each product separately for this segment
                    for (const product of activeConfigured) {
                        const segmentRespondents: any = {};
                        
                        for (const respondentId in respondentData) {
                            const demo = demographicsMap.get(respondentId);
                            if (demo && segment.filter(demo)) {
                                segmentRespondents[respondentId] = (respondentData as any)[respondentId];
                            }
                        }
                        
                        const segmentShare = calculateMarketShares(
                            [product],
                            segmentRespondents,
                            APPLY_THRESHOLD,
                            PROBABILITY_THRESHOLD
                        );
                        
                        rowValues[product.id] = formatValue(product.id, segmentShare[product.id] || 0);
                    }
                    
                    groupRows.push({
                        name: segment.name,
                        values: rowValues,
                        indent: segment.indent || 0
                    });
                }
                
                allDataGroups.push({
                    group: segmentGroup.group,
                    rows: groupRows
                });
            }
            
        } else {
            // TIERED MODE: All products compete against each other
            
            // First, total market
            const marketShares = calculateMarketShares(
                activeConfigured,
                respondentData,
                APPLY_THRESHOLD,
                PROBABILITY_THRESHOLD
            );

            const totalRows = [
                ...activeConfigured.map(config => ({
                    name: `${config.product} (Product ${config.id})`,
                    values: {
                        [config.id]: formatValue(config.id, marketShares[config.id] || 0)
                    },
                    indent: 0
                })),
                {
                    name: 'None (No Purchase)',
                    values: Object.fromEntries(
                        reportProducts.map(p => [p.id, formatValue('None', marketShares['None'] || 0)])
                    ),
                    indent: 0
                }
            ];
            
            allDataGroups.push({
                group: 'Total Market - Tiered Competition',
                rows: totalRows
            });
            
            // Then demographic segments
            const demographicSegments = [
                {
                    group: 'News Access & Subscriptions',
                    subgroups: [
                        { name: 'Regularly Access CNN', filter: (demo: any) => demo.CNN_Access === 'Regular', indent: 0 },
                        { name: 'Regularly Access CNN & 1+ News Subs', filter: (demo: any) => demo.CNN_Access === 'Regular' && demo.News_Subs > 0, indent: 1 },
                        { name: 'Regularly Access CNN & 0 News Subs', filter: (demo: any) => demo.CNN_Access === 'Regular' && demo.News_Subs === 0, indent: 1 },
                        { name: 'Occasionally Access CNN', filter: (demo: any) => demo.CNN_Access === 'Occasional', indent: 0 },
                        { name: 'Occasionally Access CNN & 1+ News Subs', filter: (demo: any) => demo.CNN_Access === 'Occasional' && demo.News_Subs > 0, indent: 1 },
                        { name: 'Occasionally Access CNN & 0 News Subs', filter: (demo: any) => demo.CNN_Access === 'Occasional' && demo.News_Subs === 0, indent: 1 }
                    ]
                },
                {
                    group: 'Gender',
                    subgroups: [
                        { name: 'Men', filter: (demo: any) => demo.Gender === 'Male' },
                        { name: 'Women', filter: (demo: any) => demo.Gender === 'Female' }
                    ]
                },
                {
                    group: 'Political Party',
                    subgroups: [
                        { name: 'Democrat', filter: (demo: any) => demo.Political === 'Democrat' },
                        { name: 'Independent', filter: (demo: any) => demo.Political === 'Independent' },
                        { name: 'Republican', filter: (demo: any) => demo.Political === 'Republican' }
                    ]
                },
                {
                    group: 'Age Groups',
                    subgroups: [
                        { name: '18-34', filter: (demo: any) => demo.Age_Group === '18-34' },
                        { name: '35-49', filter: (demo: any) => demo.Age_Group === '35-49' },
                        { name: '50-74', filter: (demo: any) => demo.Age_Group === '50-74' }
                    ]
                }
            ];
            
            for (const segmentGroup of demographicSegments) {
                const groupRows: any[] = [];
                
                for (const segment of segmentGroup.subgroups) {
                    const segmentShares = calculateSegmentMarketShares(segment);
                    
                    groupRows.push({
                        name: segment.name,
                        values: Object.fromEntries(
                            activeConfigured.map(config => [
                                config.id,
                                formatValue(config.id, segmentShares[config.id] || 0)
                            ])
                        ),
                        indent: segment.indent || 0
                    });
                }
                
                allDataGroups.push({
                    group: segmentGroup.group,
                    rows: groupRows
                });
            }
        }

        reportData = {
            products: reportProducts,
            data: allDataGroups
        };

        setReportData(reportData);
        
    } catch (error: any) {
        console.error("Simulation error:", error);
        showBrandedAlert("Simulation Error", error.message || "An unexpected error occurred during simulation.");
        if (reportContentDiv) reportContentDiv.innerHTML = '<p style="color:red; text-align:center;">An unexpected error occurred.</p>';
    } finally {
        setIsSimulating(false);
    }
};


  const downloadReport = () => {
    if (!reportData || !reportData.products || reportData.products.length === 0) {
      showBrandedAlert('No Report Data', 'No report data to download.');
      return;
    }
    let csv = [];
    const headers = ["Segment", ...reportData.products.map(p => `"${p.name} (${p.config.product || 'N/A'})"`)];
    csv.push(headers.join(','));

    reportData.data.forEach(segment => {
      csv.push(`"${segment.group}",${Array(reportData.products.length).fill("").join(",")}`);
      segment.rows.forEach(row => {
        const cells = [`"${' '.repeat((row.indent || 0) * 2)}${row.name}"`, ...reportData.products.map(p => `"${row.values[p.id] || ''}"`)];
        csv.push(cells.join(','));
      });
    });

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cnn_simulation_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShowProfiles = async () => {
    const configuredProducts = Array.from(activeProductsState).filter(id => cardDataState[id] && cardDataState[id].product);
    if (configuredProducts.length === 0) {
      showBrandedAlert('Configuration Required', 'Please configure at least one product first!');
      return;
    }
    setProfileSelectedProducts(configuredProducts); // Store IDs for display
    setProfileModalVisible(true);
  };

  const handleProfileProductOptionClick = (productId: number) => {
    const currentSelection = profileSelectedProducts.includes(productId)
      ? profileSelectedProducts.filter(id => id !== productId)
      : [...profileSelectedProducts, productId];

    if (currentSelection.length === 0 && profileSelectedProducts.length > 0) {
      showBrandedAlert('Selection Required', 'At least one product must remain selected.');
      return;
    }
    setProfileSelectedProducts(currentSelection);
  };


  const displaySelectedProfiles = async () => {
    if (profileSelectedProducts.length === 0) {
      showBrandedAlert('Selection Required', 'Please select at least one product!');
      return;
    }
    setIsFetchingProfile(true);
    setProfileModalVisible(false);
    setProfilesDataMap({});

    const profileContainer = document.getElementById('profileContainer');
    const profileContentDiv = document.getElementById('profileContent');

    if (profileContainer && profileContentDiv) {
      profileContainer.style.display = 'block';
      profileContentDiv.innerHTML = `<div class="simulation-loading"><div class="spinner"></div>Fetching profile data...</div>`;
      profileContainer.scrollIntoView({ behavior: 'smooth' });
    }

    const newProfilesData: Record<number, ProductProfileData | null> = {};
    for (const productId of profileSelectedProducts) {
      const productConfigState = cardDataState[productId];
      if (productConfigState && productConfigState.product) {
        const fullProductConfig: ProductConfig = {
          id: productId,
          product: productConfigState.product as any,
          readerFeatures: productConfigState.readerFeatures,
          streamingFeatures: productConfigState.streamingFeatures,
          verticals: productConfigState.verticals,
          monthlyRate: productConfigState.monthlyRate,
          pricingType: productConfigState.pricingType as any,
          discount: productConfigState.discount as any,
          isActive: activeProductsState.has(productId)
        };
        try {
          const profile = await getProductProfile(fullProductConfig);
          newProfilesData[productId] = profile;
        } catch (err: any) {
          console.error(`Error fetching profile for product ${productId}:`, err);
          newProfilesData[productId] = null;
          showBrandedAlert("Profile Error", `Could not fetch profile for Product ${productId}. ${err.message || ''}`);
        }
      }
    }
    setProfilesDataMap(newProfilesData);
    setIsFetchingProfile(false);
  };


  const openSensitivityModal = (productId: number) => {
    const product = cardDataState[productId];
    if (!product || !product.product) {
        showBrandedAlert("Configuration Required", "Please fully configure the product before analyzing price sensitivity.");
        return;
    }
    setSensitivityProductId(productId);
    setIsSensitivityModalOpen(true);
    setSensitivityResults(null);
  };

  const handleRunSensitivity = async () => {
    if (sensitivityProductId === null) return;
    const productConfigData = cardDataState[sensitivityProductId];
    if (!productConfigData || !productConfigData.product) {
      showBrandedAlert("Error", "Selected product for sensitivity analysis is not fully configured.");
      setIsAnalyzingSensitivity(false);
      return;
    }
    setIsAnalyzingSensitivity(true);

    const variations = sensitivityPriceVariationsInput.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (variations.length === 0) {
      showBrandedAlert("Input Error", "Please enter valid comma-separated percentage variations for price.");
      setIsAnalyzingSensitivity(false);
      return;
    }

    const activeProductFullConfigs: ProductConfig[] = Array.from(activeProductsState)
      .filter(id => cardDataState[id] && cardDataState[id].product)
      .map(id => ({ id: id, ...(cardDataState[id] as CardData), isActive: activeProductsState.has(id) } as ProductConfig));

    try {
      const results = await runPriceSensitivityAnalysis(activeProductFullConfigs, sensitivityProductId, variations, currentReportTypeState, currentOutputTypeState);
      setSensitivityResults(results);
      setIsSensitivityModalOpen(false);
      setIsSensitivityResultsModalOpen(true);
    } catch (err: any) {
      console.error("Sensitivity Analysis Error:", err);
      showBrandedAlert("Analysis Error", `Could not run price sensitivity analysis. ${err.message || ''}`);
    } finally {
      setIsAnalyzingSensitivity(false);
    }
  };

  const openMarketFactorsModal = () => {
    const currentScenario = presetScenarioDefinitions[selectedMarketScenario as keyof typeof presetScenarioDefinitions];
    if (selectedMarketScenario !== "Custom" && currentScenario) {
        setMarketFactors(currentScenario.factors);
    }
    setIsMarketFactorsModalOpen(true);
  };
  const closeMarketFactorsModal = () => setIsMarketFactorsModalOpen(false);

  const handleMarketFactorChange = (factorName: keyof MarketFactors, value: string) => {
    setMarketFactors(prev => ({ ...prev, [factorName]: parseInt(value) || 0 }));
    setSelectedMarketScenario("Custom");
  };

  const handleMarketScenarioChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const scenarioName = event.target.value;
    setSelectedMarketScenario(scenarioName);
    if (scenarioName !== "Custom") {
        const scenario = presetScenarioDefinitions[scenarioName as keyof typeof presetScenarioDefinitions];
        if (scenario) {
            setMarketFactors(scenario.factors);
        }
    }
  };

  const applyMarketFactors = () => {
    closeMarketFactorsModal();
    showBrandedAlert("Factors Applied", "Market realization factors have been updated. They will be used in the next simulation run.");
  };

  useEffect(() => {
    let currentRate = baseTakeRateForModalDisplay;
    let vizText = `Base take rate: ${currentRate.toFixed(2)}%<br />`;
    currentRate *= (marketFactors.awareness / 100);
    vizText += `After awareness (${marketFactors.awareness}%): ${currentRate.toFixed(2)}%<br />`;
    currentRate *= (marketFactors.distribution / 100);
    vizText += `After distribution (${marketFactors.distribution}%): ${currentRate.toFixed(2)}%<br />`;
    currentRate *= (marketFactors.competitive / 100);
    vizText += `After competitive (${marketFactors.competitive}%): ${currentRate.toFixed(2)}%<br />`;
    currentRate *= (marketFactors.marketing / 100);
    vizText += `After marketing (${marketFactors.marketing}%): <strong>${currentRate.toFixed(2)}% &larr; Final estimate</strong>`;
    setImpactVisualization(vizText);
  }, [marketFactors, baseTakeRateForModalDisplay]);

  const openMarketFactorInfoModal = (factorKey: keyof MarketFactors) => { setMarketFactorInfoModalContent(marketFactorDefinitions[factorKey]); };
  const closeMarketFactorInfoModal = () => { setMarketFactorInfoModalContent(null); };
  const openPresetInfoModal = () => { setIsPresetInfoModalOpen(true); };
  const closePresetInfoModal = () => { setIsPresetInfoModalOpen(false); };

  const openReviewCoreProductsModal = () => { setSelectedCoreProductForReview(''); setCoreProductDescription(''); setIsReviewCoreProductsModalOpen(true); };
  const handleCoreProductReviewSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productName = e.target.value;
    setSelectedCoreProductForReview(productName);
    if (productName && coreProductDescriptionsData[productName as keyof typeof coreProductDescriptionsData]) {
      setCoreProductDescription(coreProductDescriptionsData[productName as keyof typeof coreProductDescriptionsData] || 'Description not found.');
    } else {
      setCoreProductDescription('');
    }
  };

  const openReviewFeaturesModal = () => { setSelectedFeatureTypeForReview(''); setSelectedFeatureForReview(''); setFeatureDescription(''); setIsReviewFeaturesModalOpen(true); };
  const handleFeatureTypeReviewSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'reader' | 'streaming' | '';
    setSelectedFeatureTypeForReview(type);
    setSelectedFeatureForReview('');
    setFeatureDescription('');
  };

  const handleFeatureReviewSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const featureName = e.target.value;
    setSelectedFeatureForReview(featureName);
    let descriptionSource: Record<string, string> = {};
    if (selectedFeatureTypeForReview === 'reader') {
      descriptionSource = readerFeatureDescriptionsData;
    } else if (selectedFeatureTypeForReview === 'streaming') {
      descriptionSource = streamingFeatureDescriptionsData;
    }

    if (featureName && descriptionSource[featureName]) {
       setFeatureDescription(descriptionSource[featureName] || 'Description not found.');
    } else {
       setFeatureDescription('');
    }
  };


  const openReviewVerticalsModal = () => { setSelectedVerticalForReview(''); setVerticalDescription(''); setVerticalFeaturesForReview([]); setIsReviewVerticalsModalOpen(true); };
  const handleVerticalReviewSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const verticalName = e.target.value;
    setSelectedVerticalForReview(verticalName);
    if (verticalName && verticalDescriptionsData[verticalName as keyof typeof verticalDescriptionsData]) {
      const verticalData = verticalDescriptionsData[verticalName as keyof typeof verticalDescriptionsData] as { concept: string; features: string[] };
      setVerticalDescription(verticalData.concept || 'Description not found.');
      setVerticalFeaturesForReview(verticalData.features || []);
    } else {
      setVerticalDescription('');
      setVerticalFeaturesForReview([]);
    }
  };

  const updateCardUI = useCallback((cardNum: number, productType: string) => {
    const cardElement = document.querySelector(`.card[data-card="${cardNum}"]`);
    if (!cardElement) return;

    const contentDiv = cardElement.querySelector('.content') as HTMLElement;
    const header = cardElement.querySelector('.header') as HTMLElement;
    const productSelect = cardElement.querySelector('.product-select') as HTMLSelectElement;

    if (header) header.textContent = productType || `PRODUCT ${cardNum}`;
    if (productSelect) productSelect.value = productType;

    if (!contentDiv) return;
    contentDiv.innerHTML = '';

    if (!productType) return;

    const currentCardConfig = cardDataState[cardNum];
    let verticalCountForPricing = currentCardConfig.verticals.length;
    if (productType === 'CNN Standalone Vertical') {
        verticalCountForPricing = currentCardConfig.verticals.length > 0 ? 1 : 0;
    }
    const pricing = getPricingRangeForProduct(productType, verticalCountForPricing);

    if (productType === 'CNN Standalone Vertical') {
      const selectElement = document.createElement('select');
      selectElement.className = 'vertical-select'; // Use a class for potential styling
      selectElement.onchange = () => updateStandaloneVertical(cardNum, selectElement.value);
  
      const placeholderOption = document.createElement('option');
      placeholderOption.value = "";
      placeholderOption.textContent = "Select Vertical";
      selectElement.appendChild(placeholderOption);
  
      AVAILABLE_FEATURES_LISTS.vertical.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        if (currentCardConfig.verticals[0] === v) {
          option.selected = true;
        }
        selectElement.appendChild(option);
      });
  
      const label = document.createElement('label');
      label.className = 'content-label'; // Match other labels
      label.textContent = "Select Vertical";
      
      contentDiv.appendChild(label);
      contentDiv.appendChild(selectElement);

    } else {
      let html = '';
      if (productType === 'CNN Reader' || productType === 'CNN All-Access') {
        html += `
          <label class="content-label">Reader Features (<span class="reader-count">${currentCardConfig.readerFeatures.length}</span> selected)</label>
          <button class="add-btn" onclick="window.addFeaturesWrapper(${cardNum}, 'reader')">+ Add</button>
          <div class="feature-list reader-list">
            ${currentCardConfig.readerFeatures.map(f => `<div class="feature-item"><span>${f}</span><span class="remove" onclick="window.removeFeatureWrapper(${cardNum}, 'reader', '${f}')">×</span></div>`).join('')}
          </div>
        `;
      }
      if (productType === 'CNN Streaming' || productType === 'CNN All-Access') {
        html += `
          <label class="content-label">Streaming Features (<span class="streaming-count">${currentCardConfig.streamingFeatures.length}</span> selected)</label>
          <button class="add-btn" onclick="window.addFeaturesWrapper(${cardNum}, 'streaming')">+ Add</button>
          <div class="feature-list streaming-list">
            ${currentCardConfig.streamingFeatures.map(f => `<div class="feature-item"><span>${f}</span><span class="remove" onclick="window.removeFeatureWrapper(${cardNum}, 'streaming', '${f}')">×</span></div>`).join('')}
          </div>
        `;
      }
      html += `
        <label class="content-label">Verticals (<span class="vertical-count">${currentCardConfig.verticals.length}</span> selected)</label>
        <button class="add-btn" onclick="window.addFeaturesWrapper(${cardNum}, 'vertical')">+ Add</button>
        <div class="feature-list vertical-list">
          ${currentCardConfig.verticals.map(f => `<div class="feature-item"><span>${f}</span><span class="remove" onclick="window.removeFeatureWrapper(${cardNum}, 'vertical', '${f}')">×</span></div>`).join('')}
        </div>
      `;
      contentDiv.innerHTML = html;
    }

    contentDiv.innerHTML += `
      <label class="content-label">Configure Pricing (choose Terms + Price)</label>
      <div class="btn-group">
        <button class="${currentCardConfig.pricingType === 'monthly' ? 'active' : ''}" onclick="window.setPricingWrapper(${cardNum}, 'monthly', this)">Monthly Only</button>
        <button class="${currentCardConfig.pricingType === 'annual' ? 'active' : ''}" onclick="window.setPricingWrapper(${cardNum}, 'annual', this)">Annual Only</button>
        <button class="${currentCardConfig.pricingType === 'both' ? 'active' : ''}" onclick="window.setPricingWrapper(${cardNum}, 'both', this)">Both</button>
      </div>
      <div class="discount-section">
        ${currentCardConfig.pricingType === 'both' ? `
          <div class="discount-options">
            <h4>Select Discount</h4><hr />
            <div class="discount-option"><label><input type="radio" name="discount${cardNum}" value="free" ${currentCardConfig.discount === 'free' ? 'checked' : ''} onchange="window.setDiscountWrapper(${cardNum}, 'free')" /> Free Month / 3 Months</label></div>
            <div class="discount-option"><label><input type="radio" name="discount${cardNum}" value="30" ${currentCardConfig.discount === '30' ? 'checked' : ''} onchange="window.setDiscountWrapper(${cardNum}, '30')" /> 30% off 12-Mo Sub</label></div>
            <div class="discount-option"><label><input type="radio" name="discount${cardNum}" value="50" ${currentCardConfig.discount === '50' ? 'checked' : ''} onchange="window.setDiscountWrapper(${cardNum}, '50')" /> 50% off 12-Mo Sub</label></div>
          </div>
        ` : ''}
      </div>
      <input type="range" min="${pricing.min}" max="${pricing.max}" value="${currentCardConfig.monthlyRate}" class="price-slider" step="0.01" oninput="window.updatePriceWrapper(${cardNum}, parseFloat(this.value))" onchange="window.updatePriceWrapper(${cardNum}, parseFloat(this.value))" />
      <div class="price-labels"><span>${pricing.min.toFixed(2)}/mo</span><span>${pricing.max.toFixed(2)}/mo</span></div>
      <div class="pricing-display">${updatePriceDisplayHTML(cardNum)}</div>
    `;
   }, [cardDataState, getPricingRangeForProduct, updatePriceDisplayHTML, updateStandaloneVertical]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).updateCardProductTypeWrapper = (cardNum: number, productType: string) => {
        updateCardProductType(cardNum, productType);
      };
      // No need for handleStandaloneVerticalChangeWrapper on window if using direct React state updates
      (window as any).addFeaturesWrapper = addFeaturesModalOpen;
      (window as any).removeFeatureWrapper = removeFeatureFromList;
      (window as any).setPricingWrapper = (cardNum: number, type: string, btn: HTMLElement) => {
         updatePricingType(cardNum, type);
         // Manually update active class on buttons
         btn.parentElement?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
         btn.classList.add('active');
      };
      (window as any).setDiscountWrapper = (cardNum: number, discount: string) => {
          updateDiscount(cardNum, discount);
      };
      (window as any).updatePriceWrapper = (cardNum: number, value: number) => {
         updatePrice(cardNum, value);
      };
      (window as any).toggleFeature = handleModalFeatureToggle;
      (window as any).selectAllFeatures = handleModalSelectAllFeatures;
      (window as any).addSelectedFeatures = addSelectedFeaturesFromModal;
      (window as any).closeModal = () => setFeatureModalVisible(false);
      (window as any).toggleProfileProduct = handleProfileProductOptionClick;
    }
  }, [updateCardProductType, updateStandaloneVertical, addFeaturesModalOpen, removeFeatureFromList, updatePricingType, updateDiscount, updatePrice, handleModalFeatureToggle, handleModalSelectAllFeatures, addSelectedFeaturesFromModal, handleProfileProductOptionClick]);

  useEffect(() => {
    Object.keys(cardDataState).forEach(idStr => {
        const cardNum = parseInt(idStr);
        updateCardUI(cardNum, cardDataState[cardNum].product);
    });
  }, [cardDataState, updateCardUI]); // updateCardUI is now a dependency

   useEffect(() => {
    if (reportTypeDisplayRef.current) {
      reportTypeDisplayRef.current.innerHTML = `<strong>Report Type:</strong> Tiered Bundles<br /><strong>Output:</strong> Take Rates (%)`;
    }
  }, []);

  useEffect(() => {
    // @ts-ignore
    setDemographicsData(demographicsSample);
  }, []);


  return (
    <>
      {/* Password form JSX is completely removed */}
      <div className="main-header">
        <div className="logo-container">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b1/CNN.svg" alt="CNN" data-ai-hint="news logo" className="cnn-logo"/>
        </div>
        <div className="powered-by-container">
          <span className="powered-by-text">Powered by:</span>
          <img src="https://i.imgur.com/ctwr4oZ.png" alt="BEYOND Insights" data-ai-hint="company logo" className="beyond-logo-inline" />
        </div>
        <h1 className="welcome-title">Welcome to the CNN News Subscription Simulator</h1>
        <p className="welcome-subtitle">Configure up to 8 subscription products and run detailed market simulations</p>
      </div>

      <div className="controls-section">
        <div className="controls-left-area">
           <div className="header-tam-info">
              <div className="tam-display">TAM Universe = 105,624,640<button className="learn-more-link" onClick={() => setIsMarketSizingModalVisible(true)}>Click here to learn more</button></div>
           </div>
           <button className="header-button set-report-button set-report-button-controls" onClick={handleSetReportType} disabled={isSimulating || isAnalyzingSensitivity}><span style={{ marginRight: '5px' }}>📊</span> Set Report Type</button>
           <div className="report-type-display-controls-info" ref={reportTypeDisplayRef}></div>
        </div>
        <button className="clear-button" onClick={clearAllSelections} disabled={isSimulating || isAnalyzingSensitivity}><span style={{ marginRight: '5px' }}>🗑️</span> Clear All Selections</button>

        <div className="header-buttons">
          <button className="header-button run-simulation-button" onClick={handleRunSimulation} disabled={isSimulating || isAnalyzingSensitivity}><span style={{ marginRight: '5px' }}>▶️</span> {isSimulating ? 'Simulating...' : 'Run Simulation'}</button>
          <button className="header-button show-profiles-button" onClick={handleShowProfiles} disabled={isSimulating || isAnalyzingSensitivity}><span style={{ marginRight: '5px' }}>👥</span> Show Profiles</button>
          <button className="header-button market-factors-button" onClick={openMarketFactorsModal} disabled={isSimulating || isAnalyzingSensitivity}>
            <span style={{ marginRight: '5px' }}>⚙️</span> Market Factors
          </button>
          <Link href="/model-insights" className="header-button" style={{ background: '#ffc107', color: '#212529', textDecoration: 'none' }}>
            <span style={{ marginRight: '5px' }}>💡</span> View Model Insights
          </Link>
          <Link href="/ai-configurator" className="header-button" style={{ background: '#17a2b8', color: 'white', textDecoration: 'none' }}>
            <span style={{ marginRight: '5px' }}>🤖</span> AI Configurator
          </Link>
          <button className="header-button" style={{background: '#6f42c1', color: 'white'}} onClick={openReviewCoreProductsModal}><span style={{ marginRight: '5px' }}>📰</span> Review Core News Products</button>
          <button className="header-button" style={{background: '#fd7e14', color: 'white'}} onClick={openReviewFeaturesModal}><span style={{ marginRight: '5px' }}>✨</span> Review Features</button>
          <button className="header-button" style={{background: '#20c997', color: 'white'}} onClick={openReviewVerticalsModal}><span style={{ marginRight: '5px' }}>🌿</span> Review Verticals</button>
        </div>

        <h2 className="controls-section-h2">Select Products to Include in Simulation</h2>
        <div className="product-toggles" id="productToggles">
          {Object.keys(cardDataState).map(idStr => {
            const id = parseInt(idStr);
            return (<button key={id} className={`toggle-btn ${activeProductsState.has(id) ? 'active' : ''}`} onClick={() => toggleProduct(id)} disabled={isSimulating || isAnalyzingSensitivity}>Product {id}</button>);
          })}
        </div>
      </div>

      <div className="card-container">
        {Object.keys(cardDataState).map((cardIdStr) => {
          const cardNum = parseInt(cardIdStr);
          const cardConfig = cardDataState[cardNum];
          return (
            <div className={`card`} data-card={cardNum.toString()} key={cardNum}>
              <div className="header">{cardConfig.product || `PRODUCT ${cardNum}`}</div>
              <select
                className="product-select"
                value={cardConfig.product || ''}
                onChange={(e) => {
                  updateCardProductType(cardNum, e.target.value);
                }}
              >
                <option value="">Select Base Product</option>
                <option value="CNN Reader">CNN Reader</option>
                <option value="CNN Streaming">CNN Streaming</option>
                <option value="CNN All-Access">CNN All-Access</option>
                <option value="CNN Standalone Vertical">CNN Standalone Vertical</option>
              </select>
              <div className="content">
              </div>
            </div>
          );
        })}
      </div>

      {isMarketSizingModalVisible && (
        <div className="market-sizing-modal-overlay" style={{ display: 'flex' }}>
          <div className="market-sizing-modal-content">
            <h2>Market Sizing Information</h2>
            <ul>
              {marketSizingData.map((item, index) => (
                <li key={index} className="market-sizing-step">
                  <div className="market-sizing-criteria" style={{ whiteSpace: 'pre-line' }}>{item.criteria}</div>
                  <div className="market-sizing-value">Population: {item.value}{item.percentage && <span className="market-sizing-percentage"> ({item.percentage})</span>}</div>
                  {item.note && <div className="market-sizing-note">{item.note}</div>}
                </li>
              ))}
            </ul>
            <button onClick={() => setIsMarketSizingModalVisible(false)} className="modal-cancel">Close</button>
          </div>
        </div>
      )}

      {featureModalVisible && currentModalDataState && (
        <div className="modal-overlay" id="featureModal" style={{ display: 'flex' }}>
          <div className="modal">
            <h3 id="modalTitle">Select {currentModalDataState.type === 'reader' ? 'Reader' : currentModalDataState.type === 'streaming' ? 'Streaming' : 'Vertical'} Features</h3>
            {currentModalDataState.type !== 'vertical' && (<div className="select-all"><button onClick={handleModalSelectAllFeatures}>Select All Available</button></div>)}
            <div className="modal-options" id="modalOptions">
              {modalAvailableFeatures.map((f, i) =>
                <div className={`modal-option ${modalSelectedFeatures[f] ? 'selected' : ''}`} key={f} onClick={() => (window as any).toggleFeature(f)}>
                  <input type="checkbox" id={`feature-check-${i}-${f}`} value={f} checked={!!modalSelectedFeatures[f]} readOnly style={{ pointerEvents: 'none' }} />
                  <label htmlFor={`feature-check-${i}-${f}`} style={{ marginLeft: '10px', cursor: 'pointer', fontWeight: 'normal' }}>{i + 1}. {f}</label>
                </div>
              )}
            </div>
            <div className="modal-buttons">
              <button className="modal-add" onClick={(window as any).addSelectedFeatures}>Add Selected</button>
              <button className="modal-cancel" onClick={(window as any).closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {reportModalVisible && (
        <div className="report-modal" id="reportModal" style={{ display: 'flex' }}>
          <div className="report-modal-content">
            <h2>Configure Report</h2>
            <div className="report-option">
              <label>Report Type:</label>
              <div>
                <label><input type="radio" name="reportTypeRadio" value="tiered" defaultChecked={currentReportTypeState === 'tiered'} /> Products Included as Part of Tiered Bundles</label>
                <label><input type="radio" name="reportTypeRadio" value="independent" defaultChecked={currentReportTypeState === 'independent'} /> Each Product as Independent Product</label>
              </div>
            </div>
            <div className="report-option">
              <label>Select Output:</label>
              <div>
                <label><input type="radio" name="outputTypeRadio" value="percentage" defaultChecked={currentOutputTypeState === 'percentage'} /> Take Rates (%)</label>
                <label><input type="radio" name="outputTypeRadio" value="population" defaultChecked={currentOutputTypeState === 'population'} /> Population Counts (#)</label>
                <label><input type="radio" name="outputTypeRadio" value="revenue" defaultChecked={currentOutputTypeState === 'revenue'} /> Revenue ($)</label>
              </div>
            </div>
            <div className="report-buttons">
              <button className="generate-report" onClick={generateReportFromModal}>Set Report Type</button>
              <button className="cancel-report" onClick={() => setReportModalVisible(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    {isMarketFactorsModalOpen && (
        <div className="market-factors-modal-overlay" style={{ display: 'flex' }}>
          <div className="market-factors-modal-content">
            <h2>Market Realization Settings</h2>
            <div className="preset-scenario-select">
              <label htmlFor="scenario-select">Preset Scenario:</label>
              <select id="scenario-select" value={selectedMarketScenario} onChange={handleMarketScenarioChange}>
                <option value="Conservative Launch">Conservative Launch</option>
                <option value="Standard Launch">Standard Launch</option>
                <option value="Aggressive Launch">Aggressive Launch</option>
                <option value="Custom">Custom</option>
              </select>
              <button className="learn-more-btn-inline" onClick={openPresetInfoModal}>
                 <img src="https://i.imgur.com/ctwr4oZ.png" alt="Brand icon" data-ai-hint="flame logo" className="brand-icon-inline" />Definitions
              </button>
            </div>
            <div className="market-factors-sliders">
              {(Object.keys(marketFactors) as Array<keyof MarketFactors>).map(factorKey => (
                <div key={factorKey}>
                  <label
                    htmlFor={`${factorKey}-slider`}
                  >
                    {marketFactorDefinitions[factorKey]?.title || factorKey.charAt(0).toUpperCase() + factorKey.slice(1)}: <span>{marketFactors[factorKey]}%</span>
                    <button className="learn-more-btn-inline" onClick={() => openMarketFactorInfoModal(factorKey)}>
                       <img src="https://i.imgur.com/ctwr4oZ.png" alt="Brand icon" data-ai-hint="flame logo" className="brand-icon-inline" />Learn More
                    </button>
                  </label>
                  <input type="range" id={`${factorKey}-slider`} min="0" max="100" value={marketFactors[factorKey]} onChange={(e) => handleMarketFactorChange(factorKey, e.target.value)} disabled={isAnalyzingSensitivity || isSimulating} />
                </div>
              ))}
            </div>
            <div className="impact-visualization" dangerouslySetInnerHTML={{ __html: impactVisualization }}></div>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={closeMarketFactorsModal} disabled={isAnalyzingSensitivity || isSimulating}>Cancel</button>
              <button className="modal-add" onClick={applyMarketFactors} disabled={isAnalyzingSensitivity || isSimulating}>Apply Factors</button>
            </div>
          </div>
        </div>
      )}

      {marketFactorInfoModalContent && (
         <div className="info-modal-overlay" style={{display: 'flex'}}>
          <div className="info-modal-content">
            <h2>{marketFactorInfoModalContent.title}</h2>
            <h3>Definition:</h3><p>{marketFactorInfoModalContent.definition}</p>
            <h3>Considerations:</h3><p>{marketFactorInfoModalContent.considerations}</p>
            <h3>Guidance:</h3>
            <ul>{marketFactorInfoModalContent.guidance.map((item, index) => <li key={index}>{item}</li>)}</ul>
            <button className="modal-cancel" onClick={closeMarketFactorInfoModal}>Close</button>
          </div>
        </div>
      )}

      {isPresetInfoModalOpen && (
        <div className="info-modal-overlay" style={{ display: 'flex' }}>
          <div className="info-modal-content">
            <h2>Preset Scenario Definitions</h2>
            {(Object.values(presetScenarioDefinitions)).map(scenario => (
              <div key={scenario.name} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                <h3>{scenario.name}</h3>
                <p>{scenario.description}</p>
                <p style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>Example Factors: Awareness: {scenario.factors.awareness}%, Distribution: {scenario.factors.distribution}%, Competitive: {scenario.factors.competitive}%, Marketing: {scenario.factors.marketing}%</p>
              </div>
            ))}
            <button className="modal-cancel" onClick={closePresetInfoModal}>Close</button>
          </div>
        </div>
      )}

    {isReviewCoreProductsModalOpen && (
        <div className="info-modal-overlay" style={{display: 'flex'}}>
            <div className="info-modal-content" style={{maxWidth: '600px'}}>
                <h2>Review Core News Product Concepts</h2>
                <div style={{margin: '20px 0'}}>
                    <label htmlFor="coreProductReviewSelect" style={{display: 'block', marginBottom: '5px'}}>Select Product:</label>
                    <select id="coreProductReviewSelect" className="review-modal-select" value={selectedCoreProductForReview} onChange={handleCoreProductReviewSelect}>
                        <option value="">-- Select a Product --</option>
                        {CORE_PRODUCT_TYPES_CONST.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                {selectedCoreProductForReview && (
                    <div>
                        <h3>{selectedCoreProductForReview}</h3>
                        <p className="review-modal-description">{coreProductDescription}</p>
                    </div>
                )}
                <button className="modal-cancel" onClick={() => setIsReviewCoreProductsModalOpen(false)} style={{marginTop: '20px'}}>Close</button>
            </div>
        </div>
      )}

    {isReviewFeaturesModalOpen && (
        <div className="info-modal-overlay" style={{display: 'flex'}}>
            <div className="info-modal-content" style={{maxWidth: '700px'}}>
                <h2>Review Feature Concepts</h2>
                <div style={{margin: '10px 0'}}>
                    <label htmlFor="featureTypeReviewSelect" style={{display: 'block', marginBottom: '5px'}}>Select Feature Type:</label>
                    <select id="featureTypeReviewSelect" className="review-modal-select" value={selectedFeatureTypeForReview} onChange={handleFeatureTypeReviewSelect}>
                        <option value="">-- Select Feature Type --</option>
                        <option value="reader">Reader Features</option>
                        <option value="streaming">Streaming Features</option>
                    </select>
                </div>

                {selectedFeatureTypeForReview === 'reader' && (
                    <div style={{margin: '10px 0'}}>
                        <label htmlFor="featureReviewSelectReader" style={{display: 'block', marginBottom: '5px'}}>Select Reader Feature:</label>
                        <select id="featureReviewSelectReader" className="review-modal-select" value={selectedFeatureForReview} onChange={handleFeatureReviewSelect}>
                            <option value="">-- Select a Reader Feature --</option>
                            {AVAILABLE_FEATURES_LISTS.reader.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                )}
                {selectedFeatureTypeForReview === 'streaming' && (
                     <div style={{margin: '10px 0'}}>
                        <label htmlFor="featureReviewSelectStreaming" style={{display: 'block', marginBottom: '5px'}}>Select Streaming Feature:</label>
                        <select id="featureReviewSelectStreaming" className="review-modal-select" value={selectedFeatureForReview} onChange={handleFeatureReviewSelect}>
                            <option value="">-- Select a Streaming Feature --</option>
                            {AVAILABLE_FEATURES_LISTS.streaming.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                )}

                {selectedFeatureForReview && (
                    <div style={{marginTop: '15px'}}>
                        <h3>{selectedFeatureForReview}</h3>
                        <p className="review-modal-description">{featureDescription}</p>
                    </div>
                )}
                <button className="modal-cancel" onClick={() => setIsReviewFeaturesModalOpen(false)} style={{marginTop: '20px'}}>Close</button>
            </div>
        </div>
    )}

    {isReviewVerticalsModalOpen && (
      <div className="info-modal-overlay" style={{ display: 'flex' }}>
        <div className="info-modal-content" style={{ maxWidth: '700px' }}>
          <h2>Review Vertical Concepts</h2>
          <div style={{ margin: '20px 0' }}>
            <label htmlFor="verticalReviewSelect" style={{ display: 'block', marginBottom: '5px' }}>Select Vertical:</label>
            <select id="verticalReviewSelect" className="review-modal-select" value={selectedVerticalForReview} onChange={handleVerticalReviewSelect}>
              <option value="">-- Select a Vertical --</option>
              {AVAILABLE_FEATURES_LISTS.vertical.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          {selectedVerticalForReview && verticalDescriptionsData[selectedVerticalForReview as keyof typeof verticalDescriptionsData] && (
            <div>
              <h3>{selectedVerticalForReview}</h3>
              <p className="review-modal-description" style={{ marginBottom: '10px' }}>
                {(verticalDescriptionsData[selectedVerticalForReview as keyof typeof verticalDescriptionsData] as { concept: string }).concept}
              </p>

              {(verticalDescriptionsData[selectedVerticalForReview as keyof typeof verticalDescriptionsData] as { features: string[] }).features.length > 0 && (
                <>
                  <h4 style={{ marginTop: '15px', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Features Include:</h4>
                  <div className="review-modal-description" style={{ fontSize: '13px', paddingLeft: '15px', paddingRight: '15px' }}>
                    {(verticalDescriptionsData[selectedVerticalForReview as keyof typeof verticalDescriptionsData] as { features: string[] }).features.map((featureString, idx) => {
                      const parts = featureString.split(/:(.*)/s); // Split only on the first colon
                      const featureTitle = parts[0];
                      const featureDesc = parts[1] ? parts[1].trim() : '';
                      return (
                        <p key={idx} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                          <strong style={{ color: '#333' }}>{featureTitle}:</strong> {featureDesc}
                        </p>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          <button className="modal-cancel" onClick={() => setIsReviewVerticalsModalOpen(false)} style={{ marginTop: '20px' }}>Close</button>
        </div>
      </div>
    )}

      <div className="profile-modal" id="profileModal" style={{ display: profileModalVisible ? 'flex' : 'none' }}>
          <div className="profile-modal-content">
            <h2>Select Products for Profile Display</h2>
            <p>Choose which products to include in the profile comparison:</p>
            <div className="profile-select-grid" id="profileProductGrid">
              {Array.from(activeProductsState)
                .filter(id => cardDataState[id] && cardDataState[id].product)
                .map(id => (
                  <div
                    key={id}
                    className={`profile-product-option ${profileSelectedProducts.includes(id) ? 'selected' : ''}`}
                    onClick={() => handleProfileProductOptionClick(id)}
                  >
                    <input type="checkbox" id={`profile-checkbox-${id}`}value={id.toString()} checked={profileSelectedProducts.includes(id)} readOnly />
                    <label htmlFor={`profile-checkbox-${id}`}>
                      <div><strong>Product {id}</strong></div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{cardDataState[id].product}</div>
                    </label>
                  </div>
                ))}
            </div>
            <div className="profile-buttons">
              <button className="show-profile-btn" onClick={displaySelectedProfiles} disabled={isFetchingProfile}>{isFetchingProfile ? (<><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px', borderTopColor: 'white', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>Fetching...</>) : 'Show Profile'}</button>
              <button className="cancel-profile" onClick={() => setProfileModalVisible(false)} disabled={isFetchingProfile}>Cancel</button>
            </div>
          </div>
        </div>

      <div className="profile-container" id="profileContainer" style={{ display: Object.keys(profilesDataMap).length > 0 || isFetchingProfile ? 'block' : 'none' }}>
        {isFetchingProfile ? (<div className="simulation-loading"><div className="spinner"></div>Fetching profile data...</div>) : Object.keys(profilesDataMap).length > 0 ? (
          <>
            <div className="profile-header"><h2>Product Profile Comparison</h2></div>
            <div className="profile-content" id="profileContent">
              {profileSelectedProducts.map((productId) => {
                const profile = profilesDataMap[productId];
                if (!profile) return <div key={productId} className="profile-card-display"><p>Profile data not available for Product {productId}.</p></div>;
                const productConfig = cardDataState[productId];
                if (!productConfig) return <div key={productId} className="profile-card-display"><p>Configuration not found for Product {productId}.</p></div>;
                return (
                  <div key={profile.productName} className="profile-card-display">
                    <h3 className="profile-card-title">{profile.productName} (${productConfig.monthlyRate.toFixed(2)})</h3>
                    <div className="profile-metrics-summary">
                      <p><strong>Population Size (Est.):</strong> {profile.populationSize?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 'N/A'}</p>
                      <p><strong>TAM Proportion (%):</strong> {profile.tamProportion?.toFixed(1) || 'N/A'}%</p>
                      <p><strong>Est. Yr 1 Revenue ($):</strong> {profile.estimatedYr1Revenue?.toLocaleString(undefined, { maximumFractionDigits: 0, style: 'currency', currency: 'USD' }) || 'N/A'}</p>
                    </div>
                    <h4 style={{ marginTop: '15px', marginBottom: '5px', fontSize: '0.95em', color: '#555' }}>Detailed Profile Metrics:</h4>
                    <table className="report-table profile-table" style={{ fontSize: '0.85em' }}>
                      <thead><tr><th style={{ width: '30%' }}>Profile Group</th><th style={{ width: '40%' }}>Variable</th><th style={{ width: '30%' }}>Value</th></tr></thead>
                      <tbody>{profile.profileMetrics.map((metric, index) => (<tr key={index}><td>{metric.profile}</td><td>{metric.variable}</td><td>{metric.value}</td></tr>))}</tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </>
        ) : (!isFetchingProfile && <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>Select products via "Show Profiles" to compare.</p>)}
      </div>

      <div className="report-container" id="reportContainer" style={{ display: reportData || isSimulating ? 'block' : 'none' }}>
        <div className="report-header">
          <h2 id="reportTitle">Simulation Report - {currentOutputTypeState === 'percentage' ? 'Take Rates (%)' : currentOutputTypeState === 'population' ? 'Population Counts (#)' : 'Revenue ($)'} ({currentReportTypeState === 'tiered' ? 'Tiered Bundles' : 'Independent Products'})</h2>
          <div><button className="download-btn" onClick={downloadReport} disabled={isSimulating || !reportData}>Download CSV</button></div>
        </div>
        <div id="reportContent">
          {isSimulating && <div className="simulation-loading"><div className="spinner"></div>Running simulation...</div>}
          {reportData && !isSimulating && (
            <table className="report-table">
              <thead><tr><th>Segment</th>{reportData.products.map(p => (<th key={p.id}>{p.name}<br /><small>{p.config.product}</small> <br /><button className="analyze-price-btn" onClick={() => openSensitivityModal(p.id)} disabled={isSimulating || isAnalyzingSensitivity}>Analyze Price</button></th>))}</tr></thead>
              <tbody>
                {reportData.data.map(segment => (
                  <React.Fragment key={segment.group}>
                    <tr className="group-header"><td colSpan={(reportData.products?.length || 0) + 1}>{segment.group}</td></tr>
                    {segment.rows.map(row => {
                      let indentClass = 'sub-row';
                      if (row.indent === 1) indentClass = 'sub-row-indent';
                      else if (row.indent === 0 && segment.group === 'News Access & Subscriptions') indentClass = 'sub-row-parent';
                      return (<tr key={row.name}><td className={indentClass}>{row.name}</td>{reportData.products.map(p => (<td key={p.id} style={{ textAlign: 'center' }}>{row.values[p.id]}</td>))}</tr>);
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
          {!reportData && !isSimulating && <p style={{ textAlign: 'center', padding: '20px' }}>Run a simulation to see the report.</p>}
        </div>
      </div>

      {isSensitivityModalOpen && sensitivityProductId !== null && cardDataState[sensitivityProductId] && (
        <div className="sensitivity-modal-overlay" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="sensitivity-modal-content">
            <h2>Analyze Price Sensitivity for Product {sensitivityProductId} ({cardDataState[sensitivityProductId]?.product})</h2>
            <p>Configure price variations (comma-separated percentages, e.g., -20, -10, 0, 10, 20).</p>
            <div style={{ margin: '20px 0' }}>
              <label htmlFor="priceVariations" style={{ display: 'block', marginBottom: '5px' }}>Price Variations (%):</label>
              <input type="text" id="priceVariations" value={sensitivityPriceVariationsInput} onChange={(e) => setSensitivityPriceVariationsInput(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} disabled={isAnalyzingSensitivity} />
            </div>
            <div className="modal-buttons">
              <button className="modal-add" onClick={handleRunSensitivity} disabled={isAnalyzingSensitivity}>{isAnalyzingSensitivity ? (<><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px', borderTopColor: 'white', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>Analyzing...</>) : 'Run Analysis'}</button>
              <button className="modal-cancel" onClick={() => setIsSensitivityModalOpen(false)} disabled={isAnalyzingSensitivity}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isSensitivityResultsModalOpen && sensitivityResults && sensitivityProductId !== null && cardDataState[sensitivityProductId] && (
        <div className="sensitivity-modal-overlay" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="sensitivity-modal-content results-modal" >
            <h2>Price Sensitivity Results for Product {sensitivityProductId} ({cardDataState[sensitivityProductId]?.product})</h2>
            {isAnalyzingSensitivity ? (<div className="simulation-loading"><div className="spinner"></div>Loading results...</div>) : (
              <table className="report-table" style={{ marginTop: '20px' }}>
                <thead><tr><th>Variation (%)</th><th>New Price ($)</th><th>Take Rate (%)</th><th>Population (#)</th><th>Revenue ($)</th></tr></thead>
                <tbody>{sensitivityResults.map((point, index) => (<tr key={index}><td style={{ textAlign: 'center' }}>{point.variation}%</td><td style={{ textAlign: 'center' }}>${point.newPrice.toFixed(2)}</td><td style={{ textAlign: 'center' }}>{point.takeRate}</td><td style={{ textAlign: 'center' }}>{point.population}</td><td style={{ textAlign: 'center' }}>{point.revenue}</td></tr>))}</tbody>
              </table>
            )}
            <div className="modal-buttons" style={{ marginTop: '20px' }}><button className="modal-cancel" onClick={() => setIsSensitivityResultsModalOpen(false)}>Close</button></div>
          </div>
        </div>
      )}

      {alertModal && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }}>
          <div className="custom-modal">
            <h2>{alertModal.title}</h2>
            <p>{alertModal.message}</p>
            <div className="custom-modal-buttons">
              {alertModal.type === 'confirm' && (<button className="custom-modal-cancel" onClick={closeCustomModal}>Cancel</button>)}
              <button className="custom-modal-confirm" onClick={alertModal.onConfirm ? handleCustomConfirm : closeCustomModal}>{alertModal.type === 'confirm' ? 'Confirm' : 'OK'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}