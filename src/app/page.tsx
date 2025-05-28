"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { runServerSimulation, getProductProfile, runPriceSensitivityAnalysis } from './actions';
import type { ProductConfig, ReportData, ReportType, OutputType, ProductProfileData, SensitivityPoint, MarketFactors } from '@/lib/types';
import { respondentData, verticalMapping, drnRates } from '@/lib/data';
import Link from 'next/link';
import coreProductDescriptionsData from '@/data/coreProductDescriptions.json';
import readerFeatureDescriptionsData from '@/data/readerFeatureDescriptions.json';
import streamingFeatureDescriptionsData from '@/data/streamingFeatureDescriptions.json';
import verticalDescriptionsData from '@/data/verticalDescriptions.json';
import attributeImportanceSample from '@/data/attributeImportance.json';
import partWorthUtilitiesSample from '@/data/partWorthUtilities.json';

// Allowed emails for access
const ALLOWED_EMAILS = [
  'admin@beyondinsights.com',
  'client@cnn.com',
  // Add more allowed emails here
];

// Brand colors
const BRAND_COLORS = {
  primary: '#CC0000', // CNN Red
  secondary: '#FF6B6B', // Lighter red
  accent: '#1a73e8', // Blue accent
  success: '#28a745',
  warning: '#ffc107',
  info: '#17a2b8',
  purple: '#6f42c1',
  orange: '#fd7e14',
  teal: '#20c997'
};

// About Model content
const ABOUT_MODEL_CONTENT = {
  title: "About the CNN Subscription Model",
  sections: [
    {
      heading: "Model Overview",
      content: "This conjoint analysis model evaluates consumer preferences for CNN subscription products based on features, pricing, and bundling options."
    },
    {
      heading: "Methodology",
      content: "The model uses hierarchical Bayesian estimation with 2,158 respondents representative of the US adult population with minimum household income thresholds."
    },
    {
      heading: "Key Assumptions",
      content: "Market sizing based on 105.6M TAM, probability threshold of 20%, and market realization factors for awareness, distribution, competitive landscape, and marketing efficiency."
    }
  ]
};

// Feature lists
const AVAILABLE_FEATURES_LISTS = {
  reader: Object.keys(readerFeatureDescriptionsData),
  streaming: Object.keys(streamingFeatureDescriptionsData),
  vertical: Object.keys(verticalDescriptionsData),
};

const CORE_PRODUCT_TYPES_CONST = Object.keys(coreProductDescriptionsData);

const marketFactorDefinitions: Record<keyof MarketFactors, { title: string; definition: string; considerations: string; guidance: string[]; }> = {
  awareness: { 
    title: "Awareness Reach", 
    definition: "The percentage of your target market that will become aware of your new product/offering through your marketing campaigns and launch activities.", 
    considerations: "How broad and effective will your launch marketing be? Are you entering a crowded market? Is there existing brand recognition?", 
    guidance: [
      "Low (e.g., 20-40%): Suggests a niche product, limited marketing budget, soft launch, or entering a highly competitive market with low initial visibility.", 
      "Medium (e.g., 50-70%): Represents a standard launch for an established brand with reasonable marketing spend, or a new product with some pre-launch buzz.", 
      "High (e.g., 80-100%): Indicates a major product launch with significant media spend, strong PR, viral potential, or high anticipation."
    ] 
  },
  distribution: { 
    title: "Distribution Coverage", 
    definition: "The percentage of your target market that can realistically access or purchase your product.", 
    considerations: "Is your product available on all key platforms (web, iOS, Android)? Are there any geographical limitations or partnership dependencies?", 
    guidance: [
      "Low (e.g., 50-70%): Product might be available on limited platforms or have some access barriers.", 
      "Medium (e.g., 75-90%): Good availability across common platforms and channels.", 
      "High (e.g., 95-100%): Ubiquitous access; the product is very easy to find and subscribe to across all relevant channels."
    ] 
  },
  competitive: { 
    title: "Competitive Factors", 
    definition: "How strong is the competition? A high percentage means competitors have minimal negative impact on your ability to convert interested consumers.", 
    considerations: "Are there strong direct alternatives? What is the general market saturation? How differentiated is your offering?", 
    guidance: [
      "Low (e.g., 70-80%): Highly competitive market with many strong alternatives, or your product has few unique selling propositions.", 
      "Medium (e.g., 85-90%): Standard competitive landscape; your product has some differentiation but faces notable competitors.", 
      "High (e.g., 95-100%): Low direct competition, highly unique offering, or significant market advantage."
    ] 
  },
  marketing: { 
    title: "Marketing Efficiency", 
    definition: "The effectiveness of your marketing messaging and conversion funnels in turning aware and able prospects into actual subscribers.", 
    considerations: "How compelling is your value proposition? How easy is the sign-up process? Is your pricing perceived as fair? How effective are your calls to action?", 
    guidance: [
      "Low (e.g., 60-70%): Marketing message may not be resonating strongly, conversion funnel might have friction, or pricing could be a barrier.", 
      "Medium (e.g., 75-85%): Solid marketing message and a reasonably smooth conversion process.", 
      "High (e.g., 90-100%): Highly compelling offer, very clear value proposition, and a frictionless sign-up/purchase experience."
    ] 
  }
};

const presetScenarioDefinitions: Record<string, { name: string; description: string; factors: MarketFactors}> = {
  "Conservative Launch": { 
    name: "Conservative Launch", 
    description: "Assumes lower market awareness, more challenging distribution, a tougher competitive environment, and lower marketing conversion efficiency. Use when budget is constrained, market entry is difficult, product is very niche, or a cautious approach is preferred.", 
    factors: { awareness: 50, distribution: 70, competitive: 85, marketing: 70 } 
  },
  "Standard Launch": { 
    name: "Standard Launch", 
    description: "Represents a balanced and realistic set of assumptions for a typical product launch. Use when you have a solid go-to-market plan, reasonable brand recognition, and an average competitive landscape. This is often a good starting point.", 
    factors: { awareness: 70, distribution: 85, competitive: 90, marketing: 80 } 
  },
  "Aggressive Launch": { 
    name: "Aggressive Launch", 
    description: "Assumes high market awareness, excellent distribution, a favorable competitive landscape (or strong differentiation), and highly effective marketing. Use when significant budget is allocated, strong marketing campaigns are planned, there's high anticipation, or you aim for rapid market penetration.", 
    factors: { awareness: 85, distribution: 95, competitive: 95, marketing: 90 } 
  }
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

// Calculation functions
function calculateSingleProductTotalUtility(productConfig: any, respondentUtilData: any) {
    let utility = 0;

    // 1. Base Product Utility
    const baseProductKey = productConfig.product;
    if (baseProductKey === 'CNN Reader') utility += respondentUtilData.base?.reader || 0;
    else if (baseProductKey === 'CNN Streaming') utility += respondentUtilData.base?.streaming || 0;
    else if (baseProductKey === 'CNN All-Access') utility += respondentUtilData.base?.allAccess || 0;
    else if (baseProductKey === 'CNN Standalone Vertical') utility += respondentUtilData.base?.standalone || 0;

    // 2. Features Utility
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
            if (discountType === 'free') discountPercentageValue = 0.0833;
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
        const respondent = allrespondentData[respondentId];
        const respondentWeight = respondent.weight || 1;
        totalRespondentWeightSum += respondentWeight;

        const utilitiesForCurrentRespondent: number[] = [];
        const productOrderForProbs: (string | number)[] = [];

        configuredProductObjects.forEach(productConfig => {
            const utility = calculateSingleProductTotalUtility(productConfig, respondent);
            utilitiesForCurrentRespondent.push(utility);
            productOrderForProbs.push(productConfig.id);
        });

        utilitiesForCurrentRespondent.push(0);
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
  // Security state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Internal settings
  const PROBABILITY_THRESHOLD = 0.20;
  const APPLY_THRESHOLD = true;

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

  // All existing state declarations
  const [cardDataState, setCardDataState] = useState<Record<number, CardData>>(initialCardSetup());
  const [activeProductsState, setActiveProductsState] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [currentModalDataState, setCurrentModalDataState] = useState<{ cardNum: number; type: 'reader' | 'streaming' | 'vertical' } | null>(null);
  const [currentReportTypeState, setCurrentReportTypeState] = useState<ReportType>('tiered');
  const [currentOutputTypeState, setCurrentOutputTypeState] = useState<OutputType>('percentage');
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
  const [isSensitivityModalOpen, setIsSensitivityModalOpen] = useState(false);
  const [sensitivityProductId, setSensitivityProductId] = useState<number | null>(null);
  const [sensitivityPriceVariationsInput, setSensitivityPriceVariationsInput] = useState("-20, -10, 0, 10, 20");
  const [sensitivityResults, setSensitivityResults] = useState<SensitivityPoint[] | null>(null);
  const [isAnalyzingSensitivity, setIsAnalyzingSensitivity] = useState(false);
  const [isSensitivityResultsModalOpen, setIsSensitivityResultsModalOpen] = useState(false);
  const [isMarketFactorsModalOpen, setIsMarketFactorsModalOpen] = useState(false);
  const [marketFactors, setMarketFactors] = useState<MarketFactors>({ awareness: 70, distribution: 85, competitive: 90, marketing: 80 });
  const [selectedMarketScenario, setSelectedMarketScenario] = useState<string>("Standard Launch");
  const [baseTakeRateForModalDisplay, setBaseTakeRateForModalDisplay] = useState(8.5);
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
  const [isAboutModelModalOpen, setIsAboutModelModalOpen] = useState(false);
  const [isAttributeScoresModalOpen, setIsAttributeScoresModalOpen] = useState(false);

  const marketSizingData = [
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30", value: "168,042,784", percentage: "" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices", value: "157,241,160", percentage: "93.6%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs", value: "140,815,333", percentage: "83.8%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs\n+ Accessed News in P7D", value: "136,557,758", percentage: "81.3%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs\n+ Accessed News in P7D\n+ Familiar with CNN", value: "131,557,758", percentage: "78.4%" },
    { criteria: "U.S Adults 18-74; Min HHI \n+ $50K if 30-74 or $35K if LT 30 \n+ Own 1+ Key Devices\n+ Sub to Key Sub Srvcs\n+ Accessed News in P7D\n+ Familiar with CNN\n+ Non-Rejector of CNN", value: "105,624,640", percentage: "62.9%", note: "(80.1% of rejectors are Republican)" }
  ];

  // Authentication handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (ALLOWED_EMAILS.includes(loginEmail)) {
      // In production, verify password properly
      if (loginPassword === 'cnn2024') { // Change this password
        setIsAuthenticated(true);
        setShowPasswordForm(false);
      } else {
        showBrandedAlert('Authentication Failed', 'Invalid password.');
      }
    } else {
      showBrandedAlert('Authentication Failed', 'Email not authorized for access.');
    }
  };

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
    if (!product) return { min: 5, max: 50, default: 10, prices: [5,10,25,50]};
    if (product === 'CNN Standalone Vertical') {
      return pricingRanges[product as keyof typeof pricingRanges];
    }
    const productPricing = pricingRanges[product as keyof typeof pricingRanges] as any;
    if (productPricing && productPricing[verticalCount] !== undefined) {
      return productPricing[verticalCount];
    }
    return productPricing?.[0] || { min: 5, max: 50, default: 10, prices: [5,10,25,50] };
  }, []);

  const updateCardState = useCallback((cardNum: number, updates: Partial<CardData>) => {
    setCardDataState(prev => {
      const currentCard = prev[cardNum];
      const newCard = { ...currentCard, ...updates };

      if (updates.product !== undefined || updates.verticals !== undefined) {
          let verticalCountForPricing = newCard.verticals.length;
          if (newCard.product === 'CNN Standalone Vertical') {
             verticalCountForPricing = newCard.verticals.length > 0 ? 1 : 0;
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
        updatedVerticals = currentCard.verticals.length > 0 ? [currentCard.verticals[0]] : [];
        verticalCountForPricing = updatedVerticals.length > 0 ? 1 : 0;
    } else {
        updatedVerticals = currentCard.verticals;
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

    const newVerticals = verticalName ? [verticalName] : [];
    const pricing = getPricingRangeForProduct(currentCard.product, newVerticals.length > 0 ? 1:0);
    updateCardState(cardNum, { verticals: newVerticals, monthlyRate: pricing.default });
  }, [cardDataState, getPricingRangeForProduct, updateCardState]);

  const updateFeatureList = useCallback((cardNum: number, type: 'reader' | 'streaming' | 'vertical', newFeatures: string[]) => {
    const currentCard = cardDataState[cardNum];
    const featureKey = type === 'vertical' ? 'verticals' : `${type}Features` as keyof CardData;

    // Validation for features
    if (type !== 'vertical' && newFeatures.length === 0) {
      showBrandedAlert('Feature Required', 'You must select at least one feature.');
      return;
    }

    let updates: Partial<CardData> = { [featureKey]: newFeatures as any };

    if (type === 'vertical' && currentCard.product && currentCard.product !== 'CNN Standalone Vertical') {
        const pricing = getPricingRangeForProduct(currentCard.product, newFeatures.length);
        updates.monthlyRate = pricing.default;
    } else if (type === 'vertical' && currentCard.product === 'CNN Standalone Vertical') {
        const pricing = getPricingRangeForProduct(currentCard.product, newFeatures.length > 0 ? 1:0);
        updates.monthlyRate = pricing.default;
    }
    updateCardState(cardNum, updates);
  }, [cardDataState, getPricingRangeForProduct, updateCardState, showBrandedAlert]);

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

  // SECTION 1: Replace the entire updateCardUI function with this:

const updateCardUI = useCallback((cardNum: number) => {
  const cardElement = document.querySelector(`.card[data-card="${cardNum}"]`);
  if (!cardElement) return;

  const contentDiv = cardElement.querySelector('.content') as HTMLElement;
  const header = cardElement.querySelector('.card-header') as HTMLElement;
  const productSelect = cardElement.querySelector('.product-select') as HTMLSelectElement;

  const cardConfig = cardDataState[cardNum];
  const productType = cardConfig.product;

  if (header) header.textContent = productType ? `PRODUCT ${cardNum}` : `PRODUCT ${cardNum}`;
  if (productSelect) productSelect.value = productType;

  if (!contentDiv) return;
  
  // Clear content safely
  while (contentDiv.firstChild) {
    contentDiv.firstChild.remove();
  }

  if (!productType) {
    contentDiv.innerHTML = '<div class="text-muted" style="padding: 20px; text-align: center; font-size: 12px; color: #666;">Select a product type to configure</div>';
    return;
  }

  const pricing = getPricingRangeForProduct(productType, cardConfig.verticals.length);
  
  let contentHTML = '<div class="product-config">';

  // Features sections for non-standalone products
  if (productType !== 'CNN Standalone Vertical') {
    // Reader features
    if (productType === 'CNN Reader' || productType === 'CNN All-Access') {
      contentHTML += `
        <div class="feature-section">
          <h4>Reader Features <span class="feature-count">(${cardConfig.readerFeatures.length} selected)</span></h4>
          <div class="feature-display-box">
            <div class="feature-list">
              ${cardConfig.readerFeatures.map(f => `
                <div class="feature-tag">
                  <span>${f}</span>
                  <span class="remove-feature" onclick="window.removeFeatureWrapper(${cardNum}, 'reader', '${f}')">&times;</span>
                </div>
              `).join('')}
            </div>
          </div>
          <button class="add-feature-btn" onclick="window.addFeaturesWrapper(${cardNum}, 'reader')">+ Add</button>
        </div>`;
    }

    // Streaming features
    if (productType === 'CNN Streaming' || productType === 'CNN All-Access') {
      contentHTML += `
        <div class="feature-section">
          <h4>Streaming Features <span class="feature-count">(${cardConfig.streamingFeatures.length} selected)</span></h4>
          <div class="feature-display-box">
            <div class="feature-list">
              ${cardConfig.streamingFeatures.map(f => `
                <div class="feature-tag">
                  <span>${f}</span>
                  <span class="remove-feature" onclick="window.removeFeatureWrapper(${cardNum}, 'streaming', '${f}')">&times;</span>
                </div>
              `).join('')}
            </div>
          </div>
          <button class="add-feature-btn" onclick="window.addFeaturesWrapper(${cardNum}, 'streaming')">+ Add</button>
        </div>`;
    }
  }

  // Verticals section
  contentHTML += `
    <div class="feature-section">
      <h4>${productType === 'CNN Standalone Vertical' ? 'Select Vertical' : 'Verticals'} <span class="feature-count">(${cardConfig.verticals.length} selected)</span></h4>
      ${productType === 'CNN Standalone Vertical' ? `
        <select class="product-select" onchange="window.updateStandaloneVerticalWrapper(${cardNum}, this.value)">
          <option value="">Choose a vertical...</option>
          ${AVAILABLE_FEATURES_LISTS.vertical.map(v => `
            <option value="${v}" ${cardConfig.verticals[0] === v ? 'selected' : ''}>${v}</option>
          `).join('')}
        </select>
      ` : `
        <div class="feature-display-box">
          <div class="feature-list">
            ${cardConfig.verticals.map(v => `
              <div class="feature-tag">
                <span>${v}</span>
                <span class="remove-feature" onclick="window.removeFeatureWrapper(${cardNum}, 'vertical', '${v}')">&times;</span>
              </div>
            `).join('')}
          </div>
        </div>
        <button class="add-feature-btn" onclick="window.addFeaturesWrapper(${cardNum}, 'vertical')">+ Add</button>
      `}
    </div>`;

  // Pricing section
  contentHTML += `
    <div class="pricing-section">
      <h4>Configure Pricing</h4>
      
      <div class="pricing-options">
        <button class="pricing-option-btn ${cardConfig.pricingType === 'monthly' ? 'active' : ''}" 
          onclick="window.updatePricingTypeWrapper(${cardNum}, 'monthly')">
          Monthly Only
        </button>
        <button class="pricing-option-btn ${cardConfig.pricingType === 'annual' ? 'active' : ''}" 
          onclick="window.updatePricingTypeWrapper(${cardNum}, 'annual')">
          Annual Only
        </button>
        <button class="pricing-option-btn ${cardConfig.pricingType === 'both' ? 'active' : ''}" 
          onclick="window.updatePricingTypeWrapper(${cardNum}, 'both')">
          Both
        </button>
      </div>
      
      ${cardConfig.pricingType === 'both' ? `
        <div class="discount-section">
          <h5>Annual Discount:</h5>
          <select onchange="window.updateDiscountWrapper(${cardNum}, this.value)">
            <option value="">Select discount...</option>
            <option value="free" ${cardConfig.discount === 'free' ? 'selected' : ''}>3 Months Free (25% off)</option>
            <option value="30" ${cardConfig.discount === '30' ? 'selected' : ''}>30% Off First Year</option>
            <option value="50" ${cardConfig.discount === '50' ? 'selected' : ''}>50% Off First Year</option>
          </select>
        </div>
      ` : ''}
      
      <div class="price-slider-container">
        <input type="range" 
          min="${pricing.min}" 
          max="${pricing.max}" 
          value="${cardConfig.monthlyRate}" 
          class="price-slider" 
          step="0.01"
          oninput="window.updatePriceWrapper(${cardNum}, parseFloat(this.value))" />
        <div class="price-endpoints">
          <span>$${pricing.min.toFixed(2)}/mo</span>
          <span>$${pricing.max.toFixed(2)}/mo</span>
        </div>
      </div>
      
      <div class="current-price-display">
        <div class="current-price">$${cardConfig.monthlyRate.toFixed(2)} / mo</div>
        <div class="price-label">Monthly: $${cardConfig.monthlyRate.toFixed(2)}</div>
        <div class="price-label">Inferred Annual: $${(cardConfig.monthlyRate * 12).toFixed(2)}</div>
      </div>
      
      <div class="pricing-display" id="pricing-display-${cardNum}">
        ${updatePriceDisplayHTML(cardNum)}
      </div>
    </div>`;

  contentHTML += '</div>';
  contentDiv.innerHTML = contentHTML;
}, [cardDataState, getPricingRangeForProduct, updatePriceDisplayHTML]);

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
      if (newActive.has(cardId)) { 
        newActive.delete(cardId); 
      } else { 
        newActive.add(cardId); 
      }
      return newActive;
    });
  };

  const addFeaturesModalOpen = (cardId: number, type: 'reader' | 'streaming' | 'vertical') => {
    const cardConfig = cardDataState[cardId];
    if (!cardConfig) return;

    const currentFeaturesKey = type === 'vertical' ? 'verticals' : `${type}Features` as keyof CardData;
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
    const currentFeatures = cardConfig[currentFeaturesKey] as string[];
    const updatedFeatures = currentFeatures.filter(f => f !== featureToRemove);
    updateFeatureList(cardNum, type, updatedFeatures);
  };

  const handleSetReportType = () => { 
    setReportModalVisible(true); 
  };

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
    
    const activeConfigured = Array.from(activeProductsState)
        .filter(id => cardDataState[id] && cardDataState[id].product)
        .map(id => {
            const cardData = cardDataState[id];
            const verticalCodes = cardData.verticals.map(verticalName => 
                (verticalMapping as any)[verticalName] || verticalName
            );
            
            return {
                id,
                ...cardData,
                verticals: verticalCodes,
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
            let adjustedShare = share * realizationFactor;
            
            // Apply DRN adjustment
            if (productId !== 'None') {
                const product = activeConfigured.find(p => p.id === productId);
                if (product && drnRates[product.product as keyof typeof drnRates]) {
                    const drnRate = drnRates[product.product as keyof typeof drnRates];
                    adjustedShare = adjustedShare * (1 - drnRate);
                }
            }
            
            if (currentOutputTypeState === 'percentage') {
                return `${adjustedShare.toFixed(2)}%`;
            } else if (currentOutputTypeState === 'population') {
                const population = Math.round((adjustedShare / 100) * TAM_SIZE);
                return population.toLocaleString();
            } else {
                const population = Math.round((adjustedShare / 100) * TAM_SIZE);
                const product = activeConfigured.find(p => p.id === productId);
                const monthlyRate = product?.monthlyRate || 0;
                const monthlyRevenue = population * monthlyRate;
                return `$${monthlyRevenue.toLocaleString()}`;
            }
        };

        let reportData: ReportData;
        const allDataGroups = [];

        if (currentReportTypeState === 'independent') {
            // Independent mode calculation
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
            
        } else {
            // Tiered mode calculation
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
        }

        // Add demographic segments
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
                    { name: '35-54', filter: (demo: any) => demo.Age_Group === '35-54' },
                    { name: '55-74', filter: (demo: any) => demo.Age_Group === '55-74' }
                ]
            }
        ];

        for (const segmentGroup of demographicSegments) {
            const groupRows: any[] = [];
            
            for (const segment of segmentGroup.subgroups) {
                // Calculate segment-specific market shares
                const segmentRespondents: any = {};
                
                for (const respondentId in respondentData) {
                    const respondent = (respondentData as any)[respondentId];
                    if (respondent.demographics && segment.filter(respondent.demographics)) {
                        segmentRespondents[respondentId] = respondent;
                    }
                }
                
                const segmentShares = calculateMarketShares(
                    currentReportTypeState === 'independent' ? [activeConfigured[0]] : activeConfigured,
                    segmentRespondents,
                    APPLY_THRESHOLD,
                    PROBABILITY_THRESHOLD
                );
                
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

        reportData = {
            products: reportProducts,
            data: allDataGroups
        };

        setReportData(reportData);
        
    } catch (error: any) {
        console.error("Simulation error:", error);
        showBrandedAlert("Simulation Error", error.message || "An unexpected error occurred during simulation.");
        if (reportContentDiv) {
            reportContentDiv.innerHTML = '<p style="color:red; text-align:center;">An unexpected error occurred.</p>';
        }
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

  const printReport = () => {
    if (!reportData || !reportData.products || reportData.products.length === 0) {
      showBrandedAlert('No Report Data', 'No report data to print.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CNN Simulation Report</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .group-header { background-color: #e0e0e0; font-weight: bold; }
          .sub-row-indent { padding-left: 30px; }
          @media print {
            body { margin: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>CNN Simulation Report</h1>
        <p>Report Type: ${currentReportTypeState === 'tiered' ? 'Tiered Bundles' : 'Independent Products'}</p>
        <p>Output Type: ${currentOutputTypeState === 'percentage' ? 'Take Rates (%)' : currentOutputTypeState === 'population' ? 'Population Counts (#)' : 'Revenue ($)'}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${document.getElementById('reportContent')?.querySelector('.report-table')?.outerHTML || ''}
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleShowProfiles = async () => {
    const configuredProducts = Array.from(activeProductsState).filter(id => cardDataState[id] && cardDataState[id].product);
    if (configuredProducts.length === 0) {
      showBrandedAlert('Configuration Required', 'Please configure at least one product first!');
      return;
    }
    setProfileSelectedProducts(configuredProducts);
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

  const printProfiles = () => {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent || Object.keys(profilesDataMap).length === 0) {
      showBrandedAlert('No Profile Data', 'No profile data to print.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Product Profile Comparison</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .profile-card-display { 
            border: 1px solid #eee; 
            padding: 15px; 
            margin-bottom: 15px; 
            page-break-inside: avoid;
          }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f2f2f2; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Product Profile Comparison</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${profileContent.innerHTML}
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
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
      .map(id => {
        const cardData = cardDataState[id];
        return {
          id,
          product: cardData.product as any,
          readerFeatures: cardData.readerFeatures,
          streamingFeatures: cardData.streamingFeatures,
          verticals: cardData.verticals,
          monthlyRate: cardData.monthlyRate,
          pricingType: cardData.pricingType as any,
          discount: cardData.discount as any,
          isActive: activeProductsState.has(id)
        };
      });

    try {
      const results = await runPriceSensitivityAnalysis(
        productConfigData as any,
        variations,
        activeProductFullConfigs,
        currentReportTypeState
      );
      setSensitivityResults(results);
      setIsSensitivityModalOpen(false);
      setIsSensitivityResultsModalOpen(true);
    } catch (error: any) {
      showBrandedAlert("Analysis Error", error.message || "Could not complete price sensitivity analysis.");
    } finally {
      setIsAnalyzingSensitivity(false);
    }
  };

  const handleMarketFactorChange = (factor: keyof MarketFactors, value: number) => {
    setMarketFactors(prev => ({ ...prev, [factor]: value }));
  };

  const handlePresetScenarioChange = (scenarioName: string) => {
    setSelectedMarketScenario(scenarioName);
    if (presetScenarioDefinitions[scenarioName]) {
      setMarketFactors(presetScenarioDefinitions[scenarioName].factors);
    }
  };

  const calculateMarketImpact = () => {
    const baseTakeRate = baseTakeRateForModalDisplay;
    const realization = (marketFactors.awareness / 100) * 
                       (marketFactors.distribution / 100) * 
                       (marketFactors.competitive / 100) * 
                       (marketFactors.marketing / 100);
    const adjustedTakeRate = baseTakeRate * realization;
    
    const visualBars = Object.entries(marketFactors).map(([key, value]) => {
      const impact = (value / 100) * (baseTakeRate / 4);
      return `${key}: ${value}% → ${impact.toFixed(2)}%`;
    }).join('\n');

    setImpactVisualization(`
Base Take Rate: ${baseTakeRate.toFixed(2)}%
${visualBars}
Final Take Rate: ${adjustedTakeRate.toFixed(2)}%
    `);
  };

  useEffect(() => {
    calculateMarketImpact();
  }, [marketFactors, baseTakeRateForModalDisplay]);

  const showMarketFactorInfo = (factor: keyof MarketFactors) => {
    setMarketFactorInfoModalContent(marketFactorDefinitions[factor]);
  };

  const handleReviewCoreProductSelect = (productName: string) => {
    setSelectedCoreProductForReview(productName);
    const description = (coreProductDescriptionsData as any)[productName] || '';
    setCoreProductDescription(description);
  };

  const handleReviewFeatureSelect = (featureName: string) => {
    setSelectedFeatureForReview(featureName);
    let description = '';
    if (selectedFeatureTypeForReview === 'reader') {
      description = (readerFeatureDescriptionsData as any)[featureName] || '';
    } else if (selectedFeatureTypeForReview === 'streaming') {
      description = (streamingFeatureDescriptionsData as any)[featureName] || '';
    }
    setFeatureDescription(description);
  };

  const handleReviewVerticalSelect = (verticalName: string) => {
    setSelectedVerticalForReview(verticalName);
    const verticalData = (verticalDescriptionsData as any)[verticalName];
    if (verticalData) {
      setVerticalDescription(verticalData.description || '');
      setVerticalFeaturesForReview(verticalData.features || []);
    } else {
      setVerticalDescription('');
      setVerticalFeaturesForReview([]);
    }
  };

  // Window function wrappers
  useEffect(() => {
    (window as any).updateProductWrapper = (cardNum: number, productType: string) => {
      updateCardProductType(cardNum, productType);
      updateCardUI(cardNum, productType);
    };
    (window as any).updateStandaloneVerticalWrapper = (cardNum: number, verticalName: string) => {
      updateStandaloneVertical(cardNum, verticalName);
    };
    (window as any).updatePriceWrapper = (cardNum: number, value: number) => {
      updatePrice(cardNum, value);
    };
    (window as any).updatePricingTypeWrapper = (cardNum: number, type: string) => {
      updatePricingType(cardNum, type);
    };
    (window as any).updateDiscountWrapper = (cardNum: number, discount: string) => {
      updateDiscount(cardNum, discount);
    };
    (window as any).addFeaturesWrapper = (cardNum: number, type: 'reader' | 'streaming' | 'vertical') => {
      addFeaturesModalOpen(cardNum, type);
    };
    (window as any).removeFeatureWrapper = (cardNum: number, type: 'reader' | 'streaming' | 'vertical', feature: string) => {
      removeFeatureFromList(cardNum, type, feature);
    };
    (window as any).toggleProductWrapper = (cardId: number) => {
      toggleProduct(cardId);
    };
  }, [updateCardProductType, updateStandaloneVertical, updatePrice, updatePricingType, updateDiscount, 
      addFeaturesModalOpen, removeFeatureFromList, toggleProduct, updateCardUI]);

  // Initialize card UIs
  useEffect(() => {
    Object.keys(cardDataState).forEach(idStr => {
      const cardNum = parseInt(idStr);
      updateCardUI(cardNum, cardDataState[cardNum].product);
    });
  }, []);

  // Password protection render
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b1/CNN.svg" alt="CNN" style={{ height: '60px' }} />
          </div>
          <h2>CNN News Subscription Simulator</h2>
          <p>Please sign in to access the simulator</p>
          
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            
            <button type="submit" className="auth-submit-btn">
              Sign In
            </button>
          </form>
          
          <div className="auth-footer">
            <p>© 2024 Beyond Insights. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  // Main app render
  return (
    <div className="simulator-container">
      <header className="header">
        <div className="logo-section">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b1/CNN.svg" alt="CNN" className="cnn-logo" />
          <div className="title-section">
            <h1>CNN News Subscription Simulator</h1>
            <p className="subtitle">Powered by <img src="/beyond-logo.png" alt="BEYOND" className="beyond-logo" /> BEYOND Insights</p>
          </div>
        </div>
        
        <div className="header-controls">
          <button className="control-btn clear-btn" onClick={clearAllSelections}>
            <span style={{ marginRight: '5px' }}>🗑️</span> Clear All
          </button>
          <button className="control-btn report-type-btn" onClick={handleSetReportType}>
            <span style={{ marginRight: '5px' }}>📊</span> Set Report Type
          </button>
          <button className="control-btn run-btn" onClick={handleRunSimulation} disabled={isSimulating}>
            <span style={{ marginRight: '5px' }}>▶️</span> {isSimulating ? 'Running...' : 'Run Simulation'}
          </button>
          <button className="control-btn profiles-btn" onClick={handleShowProfiles}>
            <span style={{ marginRight: '5px' }}>👥</span> Show Profiles
          </button>
          <button className="control-btn market-factors-btn" onClick={() => setIsMarketFactorsModalOpen(true)}>
            <span style={{ marginRight: '5px' }}>📈</span> Market Factors
          </button>
          <button className="control-btn about-btn" onClick={() => setIsAboutModelModalOpen(true)}>
            <span style={{ marginRight: '5px' }}>ℹ️</span> About this Model
          </button>
          <button className="control-btn model-insights-btn" style={{ backgroundColor: BRAND_COLORS.purple }}>
            <span style={{ marginRight: '5px' }}>🧠</span> Model Insights
          </button>
          <button className="control-btn ai-configurator-btn" style={{ backgroundColor: BRAND_COLORS.accent }}>
            <span style={{ marginRight: '5px' }}>🤖</span> AI Configurator
          </button>
        </div>
        
        <div className="report-type-display" ref={reportTypeDisplayRef}>
          <strong>Report Type:</strong> Tiered Bundles<br />
          <strong>Output:</strong> Take Rates (%)
        </div>
      </header>

      <div className="review-buttons-section">
        <button className="review-btn" onClick={() => setIsReviewCoreProductsModalOpen(true)}>
          <span style={{ marginRight: '5px' }}>📦</span> Review Core Products
        </button>
        <button className="review-btn" onClick={() => {
          setIsReviewFeaturesModalOpen(true);
          setSelectedFeatureTypeForReview('');
        }}>
          <span style={{ marginRight: '5px' }}>✨</span> Review Features
        </button>
        <button className="review-btn" onClick={() => setIsReviewVerticalsModalOpen(true)}>
          <span style={{ marginRight: '5px' }}>📰</span> Review Verticals
        </button>
        <button className="review-btn" onClick={() => setIsMarketSizingModalVisible(true)}>
          <span style={{ marginRight: '5px' }}>📊</span> Market Sizing
        </button>
        <button className="review-btn" onClick={() => setIsAttributeScoresModalOpen(true)}>
          <span style={{ marginRight: '5px' }}>📈</span> Attribute Scores
        </button>
      </div>

      <main className="main-content">
        <div className="products-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
            <div key={num} className={`card ${activeProductsState.has(num) ? 'active' : 'inactive'}`} data-card={num}>
              <div className="card-header">
                <button 
                  className={`product-toggle ${activeProductsState.has(num) ? 'active' : ''}`}
                  onClick={() => toggleProduct(num)}
                >
                  {activeProductsState.has(num) ? '✓' : ''}
                </button>
                <h3 className="header">{cardDataState[num].product || `PRODUCT ${num}`}</h3>
              </div>
              
              <div className="card-body">
                <select 
                  className="product-select"
                  value={cardDataState[num].product}
                  onChange={(e) => {
                    updateCardProductType(num, e.target.value);
                    updateCardUI(num, e.target.value);
                  }}
                >
                  <option value="">Select Product Type...</option>
                  {CORE_PRODUCT_TYPES_CONST.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                
                <div className="content">
                  {/* Content populated by updateCardUI */}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div id="reportContainer" style={{ display: 'none', marginTop: '30px' }}>
          <h2>Simulation Results</h2>
          <div className="report-controls">
            <button className="download-btn" onClick={downloadReport} disabled={isSimulating || !reportData}>
              <span style={{ marginRight: '5px' }}>💾</span> Download CSV
            </button>
            <button className="print-btn" onClick={printReport} disabled={isSimulating || !reportData}>
              <span style={{ marginRight: '5px' }}>🖨️</span> Print Report
            </button>
          </div>
          <div id="reportContent">
            {reportData && (
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Segment</th>
                      {reportData.products.map(p => (
                        <th key={p.id}>
                          {p.name}<br />
                          <small>{p.config.product}</small>
                          <br />
                          <button 
                            className="analyze-price-btn"
                            onClick={() => openSensitivityModal(p.id)}
                          >
                            Analyze Price
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((segment, segIdx) => (
                      <React.Fragment key={segIdx}>
                        <tr className="group-header">
                          <td colSpan={reportData.products.length + 1}>{segment.group}</td>
                        </tr>
                        {segment.rows.map((row, rowIdx) => (
                          <tr key={`${segIdx}-${rowIdx}`}>
                            <td className={row.indent ? 'sub-row-indent' : ''}>
                              {row.indent ? '  └ ' : ''}{row.name}
                            </td>
                            {reportData.products.map(p => (
                              <td key={p.id}>{row.values[p.id] || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div id="profileContainer" style={{ display: 'none', marginTop: '30px' }}>
          <h2>Product Profile Comparison</h2>
          <div className="profile-controls">
            <button className="print-btn" onClick={printProfiles} disabled={isFetchingProfile || Object.keys(profilesDataMap).length === 0}>
              <span style={{ marginRight: '5px' }}>🖨️</span> Print Profiles
            </button>
          </div>
          <div id="profileContent">
            {Object.entries(profilesDataMap).map(([productId, profileData]) => (
              <div key={productId} className="profile-card-display">
                {profileData ? (
                  <>
                    <h3>{profileData.productName} - Product {productId}</h3>
                    <div className="profile-summary">
                      <p><strong>Monthly Rate:</strong> ${profileData.monthlyRate.toFixed(2)}</p>
                      <p><strong>TAM Proportion:</strong> {(profileData.tamProportion * 100).toFixed(2)}%</p>
                      <p><strong>Population Size:</strong> {profileData.populationSize.toLocaleString()}</p>
                      <p><strong>Estimated Year 1 Revenue:</strong> ${profileData.estimatedYr1Revenue.toLocaleString()}</p>
                    </div>
                    <table className="profile-metrics-table">
                      <thead>
                        <tr>
                          <th>Profile</th>
                          <th>Variable</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.profileMetrics.map((metric, idx) => (
                          <tr key={idx}>
                            <td>{metric.profile}</td>
                            <td>{metric.variable}</td>
                            <td>{metric.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p>Error loading profile data for Product {productId}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modals */}
      {featureModalVisible && currentModalDataState && (
        <div className="modal-overlay" onClick={() => setFeatureModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add {currentModalDataState.type === 'reader' ? 'Reader' : currentModalDataState.type === 'streaming' ? 'Streaming' : 'Vertical'} Features</h3>
            <div className="modal-body">
              {modalAvailableFeatures.map(feature => (
                <label key={feature} className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={modalSelectedFeatures[feature] || false}
                    onChange={() => handleModalFeatureToggle(feature)}
                  />
                  {feature}
                </label>
              ))}
            </div>
            <div className="modal-footer">
              {currentModalDataState.type !== 'vertical' && (
                <button onClick={handleModalSelectAllFeatures}>Select All</button>
              )}
              <button onClick={addSelectedFeaturesFromModal}>Add Selected</button>
              <button onClick={() => setFeatureModalVisible(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {reportModalVisible && (
        <div className="modal-overlay" onClick={() => setReportModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Configure Report Settings</h3>
            <div className="modal-body">
              <div className="report-type-section">
                <h4>Report Type:</h4>
                <label>
                  <input type="radio" name="reportTypeRadio" value="tiered" defaultChecked />
                  Products Included as Part of Tiered Bundles
                </label>
                <label>
                  <input type="radio" name="reportTypeRadio" value="independent" />
                  Each Product as Independent Product
                </label>
              </div>
              <div className="output-type-section">
                <h4>Output Type:</h4>
                <label>
                  <input type="radio" name="outputTypeRadio" value="percentage" defaultChecked />
                  Take Rates (%)
                </label>
                <label>
                  <input type="radio" name="outputTypeRadio" value="population" />
                  Population Counts (#)
                </label>
                <label>
                  <input type="radio" name="outputTypeRadio" value="revenue" />
                  Revenue ($)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={generateReportFromModal}>Set Report Type</button>
              <button onClick={() => setReportModalVisible(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {profileModalVisible && (
        <div className="modal-overlay" onClick={() => setProfileModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Select Products for Profile Comparison</h3>
            <div className="modal-body">
              {Array.from(activeProductsState)
                .filter(id => cardDataState[id] && cardDataState[id].product)
                .map(id => (
                  <label key={id} className="product-checkbox">
                    <input
                      type="checkbox"
                      checked={profileSelectedProducts.includes(id)}
                      onChange={() => handleProfileProductOptionClick(id)}
                    />
                    Product {id}: {cardDataState[id].product}
                  </label>
                ))}
            </div>
            <div className="modal-footer">
              <button onClick={displaySelectedProfiles}>Show Profiles</button>
              <button onClick={() => setProfileModalVisible(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isSensitivityModalOpen && sensitivityProductId !== null && (
        <div className="modal-overlay" onClick={() => setIsSensitivityModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Price Sensitivity Analysis - Product {sensitivityProductId}</h3>
            <div className="modal-body">
              <p>Product: {cardDataState[sensitivityProductId].product}</p>
              <p>Current Price: ${cardDataState[sensitivityProductId].monthlyRate.toFixed(2)}</p>
              <div className="sensitivity-input">
                <label>
                  Price Variations (comma-separated %):
                  <input
                    type="text"
                    value={sensitivityPriceVariationsInput}
                    onChange={(e) => setSensitivityPriceVariationsInput(e.target.value)}
                    placeholder="-20, -10, 0, 10, 20"
                  />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleRunSensitivity} disabled={isAnalyzingSensitivity}>
                {isAnalyzingSensitivity ? 'Analyzing...' : 'Run Analysis'}
              </button>
              <button onClick={() => setIsSensitivityModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isSensitivityResultsModalOpen && sensitivityResults && (
        <div className="modal-overlay" onClick={() => setIsSensitivityResultsModalOpen(false)}>
          <div className="modal-content sensitivity-results" onClick={e => e.stopPropagation()}>
            <h3>Price Sensitivity Results</h3>
            <div className="modal-body">
              <table className="sensitivity-table">
                <thead>
                  <tr>
                    <th>Price Change</th>
                    <th>New Price</th>
                    <th>Take Rate</th>
                    <th>Population</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityResults.map((point, idx) => (
                    <tr key={idx} className={point.variation === 0 ? 'current-price' : ''}>
                      <td>{point.variation > 0 ? '+' : ''}{point.variation}%</td>
                      <td>${point.newPrice.toFixed(2)}</td>
                      <td>{point.takeRate}</td>
                      <td>{point.population}</td>
                      <td>{point.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsSensitivityResultsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isMarketFactorsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMarketFactorsModalOpen(false)}>
          <div className="modal-content market-factors-modal" onClick={e => e.stopPropagation()}>
            <h3>Market Realization Factors</h3>
            <div className="modal-body">
              <div className="preset-scenarios">
                <h4>Preset Scenarios:</h4>
                <select value={selectedMarketScenario} onChange={(e) => handlePresetScenarioChange(e.target.value)}>
                  {Object.keys(presetScenarioDefinitions).map(scenario => (
                    <option key={scenario} value={scenario}>{scenario}</option>
                  ))}
                </select>
                <button className="info-btn" onClick={() => setIsPresetInfoModalOpen(true)}>?</button>
              </div>

              <div className="market-factors-grid">
                {Object.entries(marketFactors).map(([factor, value]) => (
                  <div key={factor} className="factor-control">
                    <div className="factor-header">
                      <label>{marketFactorDefinitions[factor as keyof MarketFactors].title}</label>
                      <button className="info-btn" onClick={() => showMarketFactorInfo(factor as keyof MarketFactors)}>?</button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => handleMarketFactorChange(factor as keyof MarketFactors, parseInt(e.target.value))}
                    />
                    <span>{value}%</span>
                  </div>
                ))}
              </div>

              <div className="impact-visualization">
                <h4>Market Impact Preview:</h4>
                <pre>{impactVisualization}</pre>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsMarketFactorsModalOpen(false)}>Apply & Close</button>
            </div>
          </div>
        </div>
      )}

      {marketFactorInfoModalContent && (
        <div className="modal-overlay" onClick={() => setMarketFactorInfoModalContent(null)}>
          <div className="modal-content info-modal" onClick={e => e.stopPropagation()}>
            <h3>{marketFactorInfoModalContent.title}</h3>
            <div className="modal-body">
              <p><strong>Definition:</strong> {marketFactorInfoModalContent.definition}</p>
              <p><strong>Considerations:</strong> {marketFactorInfoModalContent.considerations}</p>
              <h4>Guidance:</h4>
              <ul>
                {marketFactorInfoModalContent.guidance.map((guide, idx) => (
                  <li key={idx}>{guide}</li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button onClick={() => setMarketFactorInfoModalContent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isPresetInfoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPresetInfoModalOpen(false)}>
          <div className="modal-content info-modal" onClick={e => e.stopPropagation()}>
            <h3>Market Scenario Presets</h3>
            <div className="modal-body">
              {Object.entries(presetScenarioDefinitions).map(([name, scenario]) => (
                <div key={name} className="scenario-info">
                  <h4>{name}</h4>
                  <p>{scenario.description}</p>
                  <ul>
                    <li>Awareness: {scenario.factors.awareness}%</li>
                    <li>Distribution: {scenario.factors.distribution}%</li>
                    <li>Competitive: {scenario.factors.competitive}%</li>
                    <li>Marketing: {scenario.factors.marketing}%</li>
                  </ul>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsPresetInfoModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isMarketSizingModalVisible && (
        <div className="modal-overlay" onClick={() => setIsMarketSizingModalVisible(false)}>
          <div className="modal-content market-sizing-modal" onClick={e => e.stopPropagation()}>
            <h3>Market Sizing - Total Addressable Market (TAM)</h3>
            <div className="modal-body">
              <table className="market-sizing-table">
                <thead>
                  <tr>
                    <th>Criteria</th>
                    <th>Population</th>
                    <th>% of Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {marketSizingData.map((row, idx) => (
                    <tr key={idx} className={idx === marketSizingData.length - 1 ? 'final-tam' : ''}>
                      <td>{row.criteria}</td>
                      <td>{row.value}</td>
                      <td>{row.percentage}{row.note && <div className="note">{row.note}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsMarketSizingModalVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isReviewCoreProductsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReviewCoreProductsModalOpen(false)}>
          <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
            <h3>Review Core Products</h3>
            <div className="modal-body">
              <div className="review-selector">
                <select value={selectedCoreProductForReview} onChange={(e) => handleReviewCoreProductSelect(e.target.value)}>
                  <option value="">Select a core product...</option>
                  {CORE_PRODUCT_TYPES_CONST.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>
              {coreProductDescription && (
                <div className="description-display">
                  <h4>{selectedCoreProductForReview}</h4>
                  <p>{coreProductDescription}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsReviewCoreProductsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isReviewFeaturesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReviewFeaturesModalOpen(false)}>
          <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
            <h3>Review Features</h3>
            <div className="modal-body">
              {!selectedFeatureTypeForReview ? (
                <div className="feature-type-selector">
                  <button onClick={() => setSelectedFeatureTypeForReview('reader')}>Reader Features</button>
                  <button onClick={() => setSelectedFeatureTypeForReview('streaming')}>Streaming Features</button>
                </div>
              ) : (
                <>
                  <button onClick={() => {
                    setSelectedFeatureTypeForReview('');
                    setSelectedFeatureForReview('');
                    setFeatureDescription('');
                  }}>← Back</button>
                  <div className="review-selector">
                    <select value={selectedFeatureForReview} onChange={(e) => handleReviewFeatureSelect(e.target.value)}>
                      <option value="">Select a {selectedFeatureTypeForReview} feature...</option>
                      {AVAILABLE_FEATURES_LISTS[selectedFeatureTypeForReview].map(feature => (
                        <option key={feature} value={feature}>{feature}</option>
                      ))}
                    </select>
                  </div>
                  {featureDescription && (
                    <div className="description-display">
                      <h4>{selectedFeatureForReview}</h4>
                      <p>{featureDescription}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsReviewFeaturesModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isReviewVerticalsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReviewVerticalsModalOpen(false)}>
          <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
            <h3>Review Verticals</h3>
            <div className="modal-body">
              <div className="review-selector">
                <select value={selectedVerticalForReview} onChange={(e) => handleReviewVerticalSelect(e.target.value)}>
                  <option value="">Select a vertical...</option>
                  {AVAILABLE_FEATURES_LISTS.vertical.map(vertical => (
                    <option key={vertical} value={vertical}>{vertical}</option>
                  ))}
                </select>
              </div>
              {verticalDescription && (
                <div className="description-display">
                  <h4>{selectedVerticalForReview}</h4>
                  <p>{verticalDescription}</p>
                  {verticalFeaturesForReview.length > 0 && (
                    <div className="vertical-features">
                      <h5>Included Features:</h5>
                      <ul>
                        {verticalFeaturesForReview.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsReviewVerticalsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isAboutModelModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAboutModelModalOpen(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()}>
            <h3>{ABOUT_MODEL_CONTENT.title}</h3>
            <div className="modal-body">
              {ABOUT_MODEL_CONTENT.sections.map((section, idx) => (
                <div key={idx} className="about-section">
                  <h4>{section.heading}</h4>
                  <p>{section.content}</p>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsAboutModelModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isAttributeScoresModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAttributeScoresModalOpen(false)}>
          <div className="modal-content attribute-modal" onClick={e => e.stopPropagation()}>
            <h3>Attribute Importance & Part Worth Utilities</h3>
            <div className="modal-body">
              <div className="attribute-tabs">
                <button className="tab-btn active">Importance Scores</button>
                <button className="tab-btn">Part Worth Utilities</button>
              </div>
              
              <div className="attribute-content">
                <h4>Attribute Importance Scores</h4>
                <div className="importance-chart">
                  {Object.entries(attributeImportanceSample).map(([attr, score]) => (
                    <div key={attr} className="importance-bar">
                      <span className="attr-name">{attr}</span>
                      <div className="bar-container">
                        <div className="bar" style={{ width: `${(score as number) * 100}%` }}></div>
                      </div>
                      <span className="score">{((score as number) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsAttributeScoresModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {alertModal && (
        <div className="modal-overlay" onClick={alertModal.type === 'alert' ? closeCustomModal : undefined}>
          <div className="modal-content alert-modal" onClick={e => e.stopPropagation()}>
            <h3>{alertModal.title}</h3>
            <div className="modal-body">
              <p>{alertModal.message}</p>
            </div>
            <div className="modal-footer">
              {alertModal.type === 'confirm' ? (
                <>
                  <button onClick={handleCustomConfirm}>Yes</button>
                  <button onClick={closeCustomModal}>No</button>
                </>
              ) : (
                <button onClick={closeCustomModal}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}