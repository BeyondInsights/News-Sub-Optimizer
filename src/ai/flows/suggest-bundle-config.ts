
'use server';
/**
 * @fileOverview An AI agent that suggests optimal subscription bundle configurations.
 *
 * - suggestBundleConfig - A function that suggests optimal subscription bundle configurations.
 * - SuggestBundleConfigInput - The input type for the suggestBundleConfig function.
 * - SuggestBundleConfigOutput - The return type for the suggestBundleConfig function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBundleConfigInputSchema = z.object({
  goals: z
    .string()
    .describe(
      'The goals for the subscription bundle configuration (e.g., maximize revenue, increase subscriber count). Separate multiple goals using commas.'
    ),
  constraints: z.string().describe('The constraints for the subscription bundle configuration (e.g., target price point, specific features). Separate multiple constraints using commas.'),
  availableFeatures: z.array(z.string()).describe('A list of available features that can be included in the subscription bundles.'),
  products: z.array(z.string()).describe('A list of available products that can be included in the subscription bundles.'),
  optimizationStrategy: z.enum(['general', 'allAccessPortfolio'])
    .optional()
    .default('general')
    .describe('The optimization strategy to use. "general" for broad suggestions, "allAccessPortfolio" for optimizing All-Access and then finding complementary Reader/Streaming products.')
});
export type SuggestBundleConfigInput = z.infer<typeof SuggestBundleConfigInputSchema>;

// Schema for a single suggested bundle (used in both output types)
const BundleObjectSchema = z.object({
  bundleName: z.string().describe('The name of the suggested subscription bundle.'),
  features: z.array(z.string()).describe('A list of features included in the bundle.'),
  price: z.number().describe('The suggested price for the bundle.'),
  description: z.string().describe('A description of the bundle and its target audience.'),
});

// Output schema for the "general" strategy
const GeneralStrategyOutputSchema = z.object({
  strategyUsed: z.literal('general'),
  suggestedBundles: z.array(BundleObjectSchema).describe('A list of suggested subscription bundle configurations.'),
  reasoning: z.string().describe('The AI agent\'s reasoning for the suggested bundles and configurations.'),
});

// Output schema for the "allAccessPortfolio" strategy
const AllAccessPortfolioStrategyOutputSchema = z.object({
  strategyUsed: z.literal('allAccessPortfolio'),
  optimalAllAccess: BundleObjectSchema.extend({
    reasoning: z.string().describe('Reasoning for this All-Access bundle configuration and its optimality.')
  }).describe('The suggested optimal All-Access product.'),
  complementaryReader: BundleObjectSchema.extend({
    reasoning: z.string().describe('Reasoning for this Reader bundle and how it complements All-Access while expanding reach.')
  }).describe('The suggested complementary Reader product.'),
  complementaryStreaming: BundleObjectSchema.extend({
    reasoning: z.string().describe('Reasoning for this Streaming bundle and how it complements All-Access while expanding reach.')
  }).describe('The suggested complementary Streaming product.'),
  overallPortfolioStrategy: z.string().describe('The overall strategy and reasoning behind this portfolio configuration, including how cannibalization is minimized and reach is expanded.'),
});

// Union of output schemas
const SuggestBundleConfigOutputSchema = z.union([
  GeneralStrategyOutputSchema,
  AllAccessPortfolioStrategyOutputSchema
]);
export type SuggestBundleConfigOutput = z.infer<typeof SuggestBundleConfigOutputSchema>;


export async function suggestBundleConfig(input: SuggestBundleConfigInput): Promise<SuggestBundleConfigOutput> {
  return suggestBundleConfigFlow(input);
}

// Prompt for the "general" strategy
const generalStrategyPrompt = ai.definePrompt({
  name: 'generalSuggestBundleConfigPrompt',
  input: {schema: SuggestBundleConfigInputSchema}, // Input is the same
  output: {schema: GeneralStrategyOutputSchema},   // Output uses the general schema
  prompt: `You are an expert in creating and configuring optimal subscription bundles for CNN.

  Based on the goals and constraints provided, suggest optimal subscription bundle configurations.
  Consider the available features and products when creating the bundles.

  Goals: {{{goals}}}
  Constraints: {{{constraints}}}
  Available Features: {{#each availableFeatures}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Available Products: {{#each products}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Suggest a list of subscription bundles, including the bundle name, features, price, and a description of the bundle and its target audience. Explain your reasoning for these bundles.
  Ensure the output field "strategyUsed" is set to "general".
  `,
});

// Prompt for the "allAccessPortfolio" strategy
const allAccessPortfolioStrategyPrompt = ai.definePrompt({
  name: 'allAccessPortfolioSuggestBundleConfigPrompt',
  input: {schema: SuggestBundleConfigInputSchema}, // Input is the same
  output: {schema: AllAccessPortfolioStrategyOutputSchema}, // Output uses the specific portfolio schema
  prompt: `You are an expert in product portfolio strategy for news subscriptions at CNN. Your task is to design a portfolio with 'CNN All-Access' as the flagship product, complemented by 'CNN Reader' and 'CNN Streaming' standalone products.

  Available Features: {{#each availableFeatures}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Base Product Types: {{#each products}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  User Goals: {{{goals}}}
  User Constraints: {{{constraints}}}

  Follow this multi-stage process:

  1.  **Optimal 'CNN All-Access' Product:**
      *   Design an OPTIMAL 'CNN All-Access' product. This product should be feature-rich, appealing to high-value customers, and justify a premium price point. It must include a mix of reader and streaming features, and can optionally include verticals.
      *   Provide: bundleName, features (list), price, description (including target audience), and detailed reasoning for its optimality, considering the user goals and constraints.

  2.  **Complementary 'CNN Reader' Product:**
      *   Based on the optimal 'CNN All-Access' product you just designed, now design a standalone 'CNN Reader' product.
      *   This Reader product should aim to EXPAND OVERALL REACH by appealing to customer segments that might not opt for the All-Access product (e.g., price-sensitive, news-focused users).
      *   Critically, it should be designed to MINIMIZE CANNIBALIZATION of the All-Access product. This means it should offer a distinct value proposition, likely at a lower price point and with a more focused set of Reader-specific features. It should NOT include streaming features. It can include a limited number of verticals if it makes sense for the target audience.
      *   Provide: bundleName, features (list), price, description (including target audience), and detailed reasoning for how it complements All-Access and its value proposition.

  3.  **Complementary 'CNN Streaming' Product:**
      *   Similarly, design a standalone 'CNN Streaming' product to complement the All-Access product.
      *   This Streaming product should also aim to EXPAND OVERALL REACH by targeting segments interested primarily in video content, potentially at a mid-tier price point.
      *   It must also MINIMIZE CANNIBALIZATION of All-Access. It should NOT include comprehensive reader features (though a very basic news text feed might be acceptable if it's a core part of a streaming experience). It can include a limited number of verticals.
      *   Provide: bundleName, features (list), price, description (including target audience), and detailed reasoning for how it complements All-Access and its value proposition.

  4.  **Overall Portfolio Strategy:**
      *   Explain the overall strategy behind this three-product portfolio. How do they work together to maximize CNN's market position, cover different customer needs, expand reach, and manage cannibalization?

  Ensure the output field "strategyUsed" is set to "allAccessPortfolio".
  Structure your output strictly according to the AllAccessPortfolioStrategyOutputSchema.
  `,
});


const suggestBundleConfigFlow = ai.defineFlow(
  {
    name: 'suggestBundleConfigFlow',
    inputSchema: SuggestBundleConfigInputSchema,
    outputSchema: SuggestBundleConfigOutputSchema, // The output can be one of the union types
  },
  async (input) => {
    let result;
    if (input.optimizationStrategy === 'allAccessPortfolio') {
      const {output} = await allAccessPortfolioStrategyPrompt(input);
      result = output;
    } else {
      // Default to general strategy
      const {output} = await generalStrategyPrompt(input);
      result = output;
    }
    
    if (!result) {
      throw new Error("AI failed to generate a response.");
    }
    // Ensure strategyUsed is set if not already
    if (input.optimizationStrategy === 'allAccessPortfolio' && result.strategyUsed !== 'allAccessPortfolio') {
        (result as any).strategyUsed = 'allAccessPortfolio';
    } else if (result.strategyUsed !== 'general') {
        (result as any).strategyUsed = 'general';
    }

    return result!;
  }
);
