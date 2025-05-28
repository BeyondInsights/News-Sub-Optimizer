// This file contains all data imports to avoid path issues
import respondentData from '@/data/respondentData.json';
export const respondentData = {} as any; 

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

// DRN rates - update these with your actual calculated rates
export const drnRates = {
  "CNN Reader": 0.25,
  "CNN Streaming": 0.30,
  "CNN All-Access": 0.20,
  "CNN Standalone Vertical": 0.35
};