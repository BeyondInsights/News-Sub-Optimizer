// src/lib/data.ts
// Temporary working data to prevent crashes until you add real respondentData.json

export const respondentData = {
  // Sample respondents with proper structure
  "4": {
    "weight": 1.0,
    "base": { "reader": 0.5, "streaming": 0.3, "allAccess": 0.7, "standalone": 0.2 },
    "price": { "linear": -0.02, "squared": 0.0001 },
    "all_features": {
      "reader": {},
      "streaming": {}
    },
    "verticals": {
      "D1_1": 0.1,
      "D1_2": 0.15
    },
    "verticalCount": { "1": 0.1, "2": 0.15, "3": 0.2 },
    "subscription": { 
      "is_annual": 0.1, 
      "has_discount": 0.1, 
      "discount_level": 0.1 
    },
    "demographics": { 
      "Gender": "Male", 
      "Age_Group": "35-54", 
      "Political": "Democrat", 
      "CNN_Access": "Regular",
      "News_Subs": 1
    }
  },
  "6": {
    "weight": 1.0,
    "base": { "reader": 0.4, "streaming": 0.5, "allAccess": 0.8, "standalone": 0.3 },
    "price": { "linear": -0.025, "squared": 0.0001 },
    "all_features": {
      "reader": {},
      "streaming": {}
    },
    "verticals": {
      "D1_1": 0.15,
      "D1_3": 0.1
    },
    "verticalCount": { "1": 0.1, "2": 0.15, "3": 0.2 },
    "subscription": { 
      "is_annual": 0.15, 
      "has_discount": 0.1, 
      "discount_level": 0.1 
    },
    "demographics": { 
      "Gender": "Female", 
      "Age_Group": "18-34", 
      "Political": "Independent", 
      "CNN_Access": "Occasional",
      "News_Subs": 0
    }
  },
  "8": {
    "weight": 1.0,
    "base": { "reader": 0.3, "streaming": 0.4, "allAccess": 0.6, "standalone": 0.25 },
    "price": { "linear": -0.022, "squared": 0.0001 },
    "all_features": {
      "reader": {},
      "streaming": {}
    },
    "verticals": {
      "D1_2": 0.12,
      "D1_4": 0.08
    },
    "verticalCount": { "1": 0.1, "2": 0.15, "3": 0.2 },
    "subscription": { 
      "is_annual": 0.12, 
      "has_discount": 0.08, 
      "discount_level": 0.1 
    },
    "demographics": { 
      "Gender": "Male", 
      "Age_Group": "55-74", 
      "Political": "Republican", 
      "CNN_Access": "Regular",
      "News_Subs": 2
    }
  }
};

export const verticalMapping = {
  "CNN Longevity": "D1_1",
  "CNN Meditation & Mindfulness": "D1_2",
  "CNN Fitness": "D1_3",
  "CNN Entertainment Tracker": "D1_4",
  "CNN Expert Buying Guide": "D1_5",
  "CNN Personal Finance": "D1_6",
  "CNN Travel": "D1_7",
  "CNN Home": "D1_8",
  "CNN Beauty": "D1_9",
  "CNN Weather & Natural Phenomena": "D1_10"
};

// DRN rates - these are placeholders, calculate from your CSV
export const drnRates = {
  "CNN Reader": 0.25,
  "CNN Streaming": 0.30,
  "CNN All-Access": 0.20,
  "CNN Standalone Vertical": 0.35
};