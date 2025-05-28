
'use server';

import type { ProductConfig, ReportData, ReportDataSegment, ReportDataRow, ReportType, OutputType, ProductProfileData, ProductProfileDataItem, SensitivityPoint, MarketFactors } from '@/lib/types';
import { DEMOGRAPHIC_SEGMENTS } from '@/lib/constants';
import fs from 'fs/promises';
import path from 'path';

interface RespondentUtility {
  Respondent_ID: string;
  Weight: number;
  Base_Reader?: number;
  Base_Streaming?: number;
  Base_AllAccess?: number;  Base_Standalone?: number;
  Price_Linear?: number;
  Price_Squared?: number;
  [key: string]: any;
}

interface ModelParameter {
  Parameter: string;
  Value: number;
  Notes: string;
}

interface DemographicData {
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


const HHI_BANDS: Record<string, { name: string; lower: number; upper: number; width: number }> = {
  '1': { name: "Less than $35,000", lower: 0, upper: 34999, width: 34999 },
  '2': { name: "$35,000 to $49,999", lower: 35000, upper: 49999, width: 14999 },
  '3': { name: "$50,000 to $74,999", lower: 50000, upper: 74999, width: 24999 },
  '4': { name: "$75,000 to $99,999", lower: 75000, upper: 99999, width: 24999 },
  '5': { name: "$100,000 to $124,999", lower: 100000, upper: 124999, width: 24999 },
  '6': { name: "$125,000 to $149,999", lower: 125000, upper: 149999, width: 24999 },
  '7': { name: "$150,000 to $199,999", lower: 150000, upper: 199999, width: 49999 },
  '8': { name: "$200,000 to $299,999", lower: 200000, upper: 299999, width: 99999 },
  '9': { name: "$300,000 or more", lower: 300000, upper: Infinity, width: Infinity }
};

async function loadJsonData<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), 'src', 'data', filename);
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents) as T;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw new Error(`Could not load data file: ${filename}`);
  }
}

export async function runServerSimulation(
  activeProducts: ProductConfig[],
  reportType: ReportType,
  outputType: OutputType,
  marketFactors: MarketFactors 
): Promise<ReportData | null> {
  try {
    const respondentUtilities = await loadJsonData<RespondentUtility[]>('respondentUtilities.json');
    const modelParametersList = await loadJsonData<ModelParameter[]>('modelParameters.json');
    const demographics = await loadJsonData<DemographicData[]>('demographics.json');

    const modelParams: Record<string, number> = {};
    modelParametersList.forEach(p => { modelParams[p.Parameter] = p.Value; });
    const TOTAL_TAM = modelParams['Total_TAM'] || 250000000;
    const productResultsByRespondent: Record<string, Record<number, { probability: number; weight: number }>> = {};

    for (const resp of respondentUtilities) {
      productResultsByRespondent[resp.Respondent_ID] = {};
      for (const productConfig of activeProducts) {
        if (!productConfig.product) continue;
        let utility = 0;
        switch (productConfig.product) {
          case 'CNN Reader': utility += resp.Base_Reader || 0; break;
          case 'CNN Streaming': utility += resp.Base_Streaming || 0; break;
          case 'CNN All-Access': utility += resp.Base_AllAccess || 0; break;
          case 'CNN Standalone Vertical': utility += resp.Base_Standalone || 0; break;
        }
        const lnPrice = Math.log(productConfig.monthlyRate);
        utility += (resp.Price_Linear || 0) * lnPrice;
        if (resp.Price_Squared) { utility += (resp.Price_Squared || 0) * lnPrice * lnPrice; }
        
        // TODO: Add more detailed utility calculations (verticals, features, terms)
        
        const probability = 1 / (1 + Math.exp(-utility));
        productResultsByRespondent[resp.Respondent_ID][productConfig.id] = { probability: probability, weight: resp.Weight || 1 };
      }
    }
    
    const reportSegments: ReportDataSegment[] = DEMOGRAPHIC_SEGMENTS.map(segment => {
      const rows: ReportDataRow[] = segment.subgroups.map(subgroup => {
        const rowValues: Record<number, string> = {};
        activeProducts.forEach(product => {
          if (!product.product) { rowValues[product.id] = 'N/A'; return; }
          let totalWeightedProb = 0;
          let totalWeightInSegment = 0;
          demographics.forEach(demo => {
            const respId = demo.Respondent_ID;
            const respDemoData = productResultsByRespondent[respId];
            if (respDemoData && respDemoData[product.id]) {
              let inSegment = true;
              if (subgroup.filter && !subgroup.filter(demo)) { inSegment = false; }
              if (inSegment) {
                totalWeightedProb += respDemoData[product.id].probability * respDemoData[product.id].weight;
                totalWeightInSegment += respDemoData[product.id].weight;
              }
            }
          });
          
          const avgProbability = totalWeightInSegment > 0 ? totalWeightedProb / totalWeightInSegment : 0;
          
          // Apply market factors
          let finalProbability = avgProbability;
          if (marketFactors) {
            finalProbability *= (marketFactors.awareness / 100);
            finalProbability *= (marketFactors.distribution / 100);
            finalProbability *= (marketFactors.competitive / 100);
            finalProbability *= (marketFactors.marketing / 100);
          }

          const segmentPopulationFactor = subgroup.factor || 1.0;
          const segmentTAM = TOTAL_TAM * segmentPopulationFactor;
          let value: number | string;

          if (outputType === 'percentage') {
            value = (finalProbability * 100).toFixed(2) + '%';
          } else if (outputType === 'population') {
            value = Math.round(segmentTAM * finalProbability).toLocaleString();
          } else { // revenue
            const monthlyRevenue = segmentTAM * finalProbability * product.monthlyRate;
            value = '$' + Math.round(monthlyRevenue).toLocaleString();
          }
          rowValues[product.id] = value.toString();
        });
        return { name: subgroup.name, values: rowValues, indent: subgroup.indent ?? null };
      });
      return { group: segment.group, rows: rows };
    });

    return { products: activeProducts.map(p => ({ id: p.id, name: `Product ${p.id}`, config: p })), data: reportSegments };
  } catch (error) {
    console.error("Server Simulation Error:", error);
    return null;
  }
}

export async function getProductProfile(productConfig: ProductConfig): Promise<ProductProfileData | null> {
  try {
    const respondentUtilities = await loadJsonData<RespondentUtility[]>('respondentUtilities.json');
    const demographicsData = await loadJsonData<DemographicData[]>('demographics.json');
    const modelParametersList = await loadJsonData<ModelParameter[]>('modelParameters.json');
    const modelParams: Record<string, number> = {};
    modelParametersList.forEach(p => { modelParams[p.Parameter] = p.Value; });
    const TOTAL_TAM = modelParams['Total_TAM'] || 250000000;
    let productChoosersWeightedProbabilities: { demo: DemographicData, prob: number, weight: number }[] = [];
    let totalWeightedProbabilitySumForProduct = 0;

    for (const respUtil of respondentUtilities) { // Added missing loop declaration
      let utility = 0;
      switch (productConfig.product) {
        case 'CNN Reader': utility += respUtil.Base_Reader || 0; break;
        case 'CNN Streaming': utility += respUtil.Base_Streaming || 0; break;
        case 'CNN All-Access': utility += respUtil.Base_AllAccess || 0; break;
        case 'CNN Standalone Vertical': utility += respUtil.Base_Standalone || 0; break;
      }
      const lnPrice = Math.log(productConfig.monthlyRate);
      utility += (respUtil.Price_Linear || 0) * lnPrice;
      if (respUtil.Price_Squared) utility += (respUtil.Price_Squared || 0) * lnPrice * lnPrice;
      const probability = 1 / (1 + Math.exp(-utility));
      const weight = respUtil.Weight || 1;
      const demo = demographicsData.find(d => d.Respondent_ID === respUtil.Respondent_ID);
      if (demo) {
        productChoosersWeightedProbabilities.push({ demo, prob: probability, weight });
        totalWeightedProbabilitySumForProduct += probability * weight;
      }
    } // This is the corresponding closing brace for the added loop
    const totalWeightSum = productChoosersWeightedProbabilities.reduce((sum, item) => sum + item.weight, 0);
    const overallChooserBase = totalWeightSum > 0 ? totalWeightedProbabilitySumForProduct / totalWeightSum * TOTAL_TAM : 0;
    const profileMetrics: ProductProfileDataItem[] = [];
    profileMetrics.push({ profile: "Overall", variable: "Population Size (Est.)", value: overallChooserBase.toLocaleString(undefined, { maximumFractionDigits: 0 }) });
    profileMetrics.push({ profile: "Overall", variable: "TAM Proportion (%)", value: (overallChooserBase / TOTAL_TAM * 100).toFixed(1) });
    profileMetrics.push({ profile: "Overall", variable: "Est. Yr 1 Revenue ($)", value: (overallChooserBase * productConfig.monthlyRate * 12).toLocaleString(undefined, { maximumFractionDigits: 0, style: 'currency', currency: 'USD' }) });
    const calculateSegmentPercentage = (filterFn: (demo: DemographicData) => boolean, variableName: string) => {
      let segmentWeightedProbSum = 0;
      productChoosersWeightedProbabilities.forEach(item => {
        if (filterFn(item.demo)) { segmentWeightedProbSum += item.prob * item.weight; }
      });
      return totalWeightedProbabilitySumForProduct > 0 ? (segmentWeightedProbSum / totalWeightedProbabilitySumForProduct * 100).toFixed(1) : "0.0";
    };
    profileMetrics.push({ profile: "Gender", variable: "Male %", value: calculateSegmentPercentage(d => d.SG === 1, "Male") });
    profileMetrics.push({ profile: "Gender", variable: "Female %", value: calculateSegmentPercentage(d => d.SG === 2, "Female") });
    profileMetrics.push({ profile: "Gender", variable: "Other %", value: calculateSegmentPercentage(d => d.SG === 3, "Other") });
    profileMetrics.push({ profile: "Age", variable: "18-34 %", value: calculateSegmentPercentage(d => d.hAgeRecode === 1, "18-34") });
    profileMetrics.push({ profile: "Age", variable: "35-49 %", value: calculateSegmentPercentage(d => d.hAgeRecode === 2, "35-49") });
    profileMetrics.push({ profile: "Age", variable: "50-64 %", value: calculateSegmentPercentage(d => d.hAgeRecode === 3, "50-64") });
    profileMetrics.push({ profile: "Age", variable: "65+ %", value: calculateSegmentPercentage(d => d.hAgeRecode === 4, "65+") });
    const hhiWeightedValues: { siCode: number, weightedProb: number }[] = [];
    productChoosersWeightedProbabilities.forEach(item => { if (item.demo.SI !== undefined) { hhiWeightedValues.push({ siCode: item.demo.SI, weightedProb: item.prob * item.weight }); } });
    let medianHHIString = "N/A";
    if (hhiWeightedValues.length > 0) {
      const bandFrequencies: Record<string, number> = {};
      for (const bandCode in HHI_BANDS) { bandFrequencies[bandCode] = 0; }
      hhiWeightedValues.forEach(item => { bandFrequencies[item.siCode.toString()] += item.weightedProb; });
      const sortedBandCodes = Object.keys(HHI_BANDS).sort((a, b) => parseInt(a) - parseInt(b));
      const n = hhiWeightedValues.reduce((sum, item) => sum + item.weightedProb, 0);
      let cumulativeFrequency = 0;
      let medianBandCode = null;
      for (const bandCode of sortedBandCodes) {
        if (n / 2 <= cumulativeFrequency + bandFrequencies[bandCode]) { medianBandCode = bandCode; break; }
        cumulativeFrequency += bandFrequencies[bandCode];
      }
      if (medianBandCode) {
        const medianBandInfo = HHI_BANDS[medianBandCode];
        if (medianBandInfo.upper === Infinity) { medianHHIString = "$300,000+"; }
        else { const l = medianBandInfo.lower; const h = medianBandInfo.width; const f = bandFrequencies[medianBandCode]; const C = cumulativeFrequency; const medianValue = l + (h / f) * (n / 2 - C); medianHHIString = medianValue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
      }
    }
    profileMetrics.push({ profile: "Income", variable: "HHI (Median Est.)", value: medianHHIString });
    profileMetrics.push({ profile: "Education", variable: "College Grad+ %", value: calculateSegmentPercentage(d => d.SE === 1 || d.SE === 2, "College Grad+") });
    profileMetrics.push({ profile: "Political Affiliation", variable: "Democrat %", value: calculateSegmentPercentage(d => d.S201 === 1, "Democrat") });
    profileMetrics.push({ profile: "Political Affiliation", variable: "Republican %", value: calculateSegmentPercentage(d => d.S201 === 2, "Republican") });
    profileMetrics.push({ profile: "Political Affiliation", variable: "Independent %", value: calculateSegmentPercentage(d => d.S201 === 3, "Independent") });
    profileMetrics.push({ profile: "CNN Viewership", variable: "Regularly (Daily/Weekly) %", value: calculateSegmentPercentage(d => d.S214 === 1 || d.S214 === 2, "Regularly")});
    profileMetrics.push({ profile: "Linear TV", variable: "Has Linear TV Service %", value: calculateSegmentPercentage(d => d.TV5a06 === 1, "Has Linear TV") });
    profileMetrics.push({ profile: "Ad Preference", variable: "Prefers Ad-Free %", value: calculateSegmentPercentage(d => d.TV5b06 === 3, "Prefers Ad-Free") });
    profileMetrics.push({ profile: "News Subscriptions", variable: "Subscribes to 1+ News %", value: calculateSegmentPercentage(d => (d.N312 || 0) >= 1, "Subscribes to 1+ News")});
    profileMetrics.push({ profile: "Other News Source", variable: "Uses NYT %", value: calculateSegmentPercentage(d => d.N4_loop_13_N4 === 1, "Uses NYT") });
    return { productName: `Product ${productConfig.id} (${productConfig.product})`, monthlyRate: productConfig.monthlyRate, populationSize: overallChooserBase, tamProportion: (overallChooserBase / TOTAL_TAM * 100), estimatedYr1Revenue: (overallChooserBase * productConfig.monthlyRate * 12), profileMetrics: profileMetrics };
  } catch (error) {
    console.error("Get Product Profile Error:", error);
    return null;
  }
}

export async function runPriceSensitivityAnalysis(
  activeProductsConfigs: ProductConfig[],
  targetProductId: number,
  priceVariationsPercentages: number[],
  reportType: ReportType,
  outputType: OutputType 
): Promise<SensitivityPoint[]> {
  const results: SensitivityPoint[] = [];
  const dummyMarketFactors: MarketFactors = { awareness: 100, distribution: 100, competitive: 100, marketing: 100 }; // Use neutral factors for sensitivity

  for (const variation of priceVariationsPercentages) {
    const tempConfigs = activeProductsConfigs.map(p => ({ ...p }));
    const targetProduct = tempConfigs.find(p => p.id === targetProductId);
    if (!targetProduct || !targetProduct.product) continue;
    const originalPrice = targetProduct.monthlyRate;
    const newPrice = originalPrice * (1 + variation / 100);
    targetProduct.monthlyRate = newPrice;

    let takeRate = "N/A", population = "N/A", revenue = "N/A";

    const takeRateSim = await runServerSimulation(tempConfigs, reportType, 'percentage', dummyMarketFactors);
    const takeRateSegment = takeRateSim?.data.find(s => s.group === "Total TAM");
    if (takeRateSegment && takeRateSegment.rows.length > 0) { takeRate = takeRateSegment.rows[0].values[targetProductId]; }

    const populationSim = await runServerSimulation(tempConfigs, reportType, 'population', dummyMarketFactors);
    const populationSegment = populationSim?.data.find(s => s.group === "Total TAM");
    if (populationSegment && populationSegment.rows.length > 0) { population = populationSegment.rows[0].values[targetProductId]; }
    
    const revenueSim = await runServerSimulation(tempConfigs, reportType, 'revenue', dummyMarketFactors);
    const revenueSegment = revenueSim?.data.find(s => s.group === "Total TAM");
    if (revenueSegment && revenueSegment.rows.length > 0) { revenue = revenueSegment.rows[0].values[targetProductId]; }

    results.push({ variation: variation, newPrice: newPrice, takeRate: takeRate, population: population, revenue: revenue });
  }
  return results;
}

    