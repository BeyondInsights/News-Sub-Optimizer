// Static data to avoid import issues - using minimal sample data
export const respondentData = {
    "4": {
      "weight": 1.0,
      "base": { "reader": 0.5, "streaming": 0.3, "allAccess": 0.7, "standalone": 0.2 },
      "price": { "linear": -0.02, "squared": 0.0001 },
      "all_features": {
        "reader": { "f1": 0.1, "f2": 0.1 },
        "streaming": { "f1": 0.1, "f2": 0.1 }
      },
      "verticals": { "D1_1": 0.1, "D1_2": 0.1 },
      "verticalCount": { "1": 0.1, "2": 0.15, "3": 0.2 },
      "subscription": { "is_annual": 0.1, "has_discount": 0.1, "discount_level": 0.1 },
      "demographics": { "Gender": "Male", "Age_Group": "35-49", "Political": "Democrat", "CNN_Access": "Regular" }
    },
    "6": {
      "weight": 1.0,
      "base": { "reader": 0.4, "streaming": 0.5, "allAccess": 0.8, "standalone": 0.3 },
      "price": { "linear": -0.025, "squared": 0.0001 },
      "all_features": {
        "reader": { "f1": 0.15, "f2": 0.1 },
        "streaming": { "f1": 0.1, "f2": 0.15 }
      },
      "verticals": { "D1_1": 0.15, "D1_2": 0.1 },
      "verticalCount": { "1": 0.1, "2": 0.15, "3": 0.2 },
      "subscription": { "is_annual": 0.15, "has_discount": 0.1, "discount_level": 0.1 },
      "demographics": { "Gender": "Female", "Age_Group": "18-34", "Political": "Independent", "CNN_Access": "Occasional" }
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