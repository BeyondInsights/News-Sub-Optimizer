
export const PRODUCT_TYPES = [
  "CNN Reader",
  "CNN Streaming",
  "CNN All-Access",
  "CNN Standalone Vertical",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

// AVAILABLE_FEATURES is now more of a reference for configuration
// The actual lists for dropdowns and reviews will come from the JSON description files
export const AVAILABLE_FEATURES: Record<string, string[]> = {
  reader: [ // This list will be dynamically populated in page.tsx from readerFeatureDescriptions.json keys
    "Unlimited articles",
    "Short-form video",
    "Subscriber-only articles, newsletters, and podcasts",
    "CNN Reality Check",
    "Podcast Club",
    "News from local providers",
    "\"CNN You\"",
    "CNN Technology Insider",
    "Bonus Subscription",
    "News from global providers",
    "CNN Live Events and Expert Q&A",
    "Ask CNN",
    "Al Anchor",
    "CNN Business & Markets Insider",
    "CNN Archive"
  ],
  streaming: [ // This list will be dynamically populated in page.tsx from streamingFeatureDescriptions.json keys
    "24/7 Live News Channel",
    "Catch Up Channel",
    "CNN Library On-Demand",
    "Curated video playlist channels",
    "Multiview",
    "Personalized Daily Video Briefings",
    "Real-time Fact Checking",
    "CNN You", 
    "Live Q&A with CNN Experts",
    "Live Global Feeds",
    "Customized Local News",
    "Original Short-Form CNN Series",
    "Live Text Commentary from CNN Experts",
    "Interactive video companions",
    "Real-Time News Ticker",
    "Exclusive, Subscriber-Only Events"
  ],
  vertical: [ // This list will be dynamically populated in page.tsx from verticalDescriptions.json keys
    'CNN Longevity',
    'CNN Meditation & Mindfulness',
    'CNN Fitness',
    'CNN Entertainment Tracker',
    'CNN Expert Buying Guide',
    'CNN Personal Finance',
    'CNN Travel',
    'CNN Home',
    'CNN Beauty',
    'CNN Weather & Natural Phenomena'
  ],
};

export const PRICING_RANGES: Record<ProductType | string, any> = {
  'CNN Standalone Vertical': {
    prices: [1.99, 3.99, 5.99, 7.99],
    min: 1.99,
    max: 7.99,
    default: 3.99,
  },
  'CNN Reader': {
    0: { prices: [3.99, 6.99, 9.99, 14.99], min: 3.99, max: 14.99, default: 6.99 },
    1: { prices: [5.49, 8.49, 11.49, 16.99], min: 5.49, max: 16.99, default: 8.49 },
    2: { prices: [6.99, 10.99, 14.99, 19.49], min: 6.99, max: 19.49, default: 10.99 },
    3: { prices: [8.49, 12.99, 16.99, 21.99], min: 8.49, max: 21.99, default: 12.99 },
  },
  'CNN Streaming': {
    0: { prices: [4.99, 8.49, 11.99, 16.99], min: 4.99, max: 16.99, default: 8.49 },
    1: { prices: [6.49, 9.99, 13.99, 17.99], min: 6.49, max: 17.99, default: 9.99 },
    2: { prices: [7.99, 11.99, 15.99, 21.49], min: 7.99, max: 21.49, default: 11.99 },
    3: { prices: [9.49, 13.99, 17.99, 24.99], min: 9.49, max: 24.99, default: 13.99 },
  },
  'CNN All-Access': {
    0: { prices: [5.99, 11.99, 17.99, 24.99], min: 5.99, max: 24.99, default: 11.99 },
    1: { prices: [7.99, 12.99, 18.99, 25.99], min: 7.99, max: 25.99, default: 12.99 },
    2: { prices: [9.99, 14.99, 21.49, 30.49], min: 9.99, max: 30.49, default: 14.99 },
    3: { prices: [11.99, 16.99, 23.99, 34.99], min: 11.99, max: 34.99, default: 16.99 },
  }
};

export const MAX_PRODUCTS = 8;

export const DEMOGRAPHIC_SEGMENTS = [
  { group: 'Total TAM', subgroups: [{ name: 'All Respondents', factor: 1.0, filter: () => true }] }, 
  {
    group: 'News Access & Subscriptions',
    subgroups: [
      { name: 'Regularly Access CNN', factor: 0.60, indent: 0, filter: (demo: any) => demo.CNN_Access === 'Regular' },
      { name: 'Regularly Access CNN & 1+ News Subs', factor: 0.35, indent: 1, filter: (demo: any) => demo.CNN_Access === 'Regular' && demo.News_Subs > 0 },
      { name: 'Regularly Access CNN & 0 News Subs', factor: 0.25, indent: 1, filter: (demo: any) => demo.CNN_Access === 'Regular' && demo.News_Subs === 0 },
      { name: 'Occasionally Access CNN', factor: 0.40, indent: 0, filter: (demo: any) => demo.CNN_Access === 'Occasional' },
      { name: 'Occasionally Access CNN & 1+ News Subs', factor: 0.15, indent: 1, filter: (demo: any) => demo.CNN_Access === 'Occasional' && demo.News_Subs > 0 },
      { name: 'Occasionally Access CNN & 0 News Subs', factor: 0.25, indent: 1, filter: (demo: any) => demo.CNN_Access === 'Occasional' && demo.News_Subs === 0 }
    ]
  },
  {
    group: 'Gender',
    subgroups: [
      { name: 'Men', factor: 0.48, filter: (demo: any) => demo.Gender === 'Male' },
      { name: 'Women', factor: 0.52, filter: (demo: any) => demo.Gender === 'Female' }
    ]
  },
  {
    group: 'Political Party',
    subgroups: [
      { name: 'Democrat', factor: 0.33, filter: (demo: any) => demo.Political === 'Democrat' },
      { name: 'Independent', factor: 0.34, filter: (demo: any) => demo.Political === 'Independent' },
      { name: 'Republican', factor: 0.33, filter: (demo: any) => demo.Political === 'Republican' }
    ]
  },
  {
    group: 'Age Groups',
    subgroups: [
      { name: '18-34', factor: 0.30, filter: (demo: any) => demo.Age_Group === '18-34' },
      { name: '35-49', factor: 0.25, filter: (demo: any) => demo.Age_Group === '35-49' },
      { name: '50-74', factor: 0.45, filter: (demo: any) => demo.Age_Group === '50-74' }
    ]
  },
  {
    group: 'Linear TV Service',
    subgroups: [
      { name: 'Yes', factor: 0.60, filter: (demo: any) => demo.Linear_TV === 'Yes' },
      { name: 'No', factor: 0.40, filter: (demo: any) => demo.Linear_TV === 'No' }
    ]
  },
  {
    group: 'Ad Plan Preference',
    subgroups: [
      { name: 'Full Ads', factor: 0.40, filter: (demo: any) => demo.Ad_Preference === 'Full Ads' },
      { name: '50% Fewer Ads', factor: 0.35, filter: (demo: any) => demo.Ad_Preference === '50% Fewer Ads' },
      { name: 'No Ads', factor: 0.25, filter: (demo: any) => demo.Ad_Preference === 'No Ads' }
    ]
  }
];


export type PricingType = '' | 'monthly' | 'annual' | 'both';
export type DiscountType = '' | 'free' | '30' | '50';

export const INITIAL_PRODUCT_CONFIG = (id: number, isActive = true): import('./types').ProductConfig => ({
  id,
  product: '',
  readerFeatures: [],
  streamingFeatures: [],
  verticals: [],
  monthlyRate: 10,
  pricingType: '',
  discount: '',
  isActive,
});

    
