
export enum Platform {
  EBAY = 'eBay',
  POSHMARK = 'Poshmark',
  ETSY = 'Etsy',
  FACEBOOK = 'Facebook Marketplace',
  AMAZON = 'Amazon',
  DROPSHIPPING = 'General Dropshipping'
}

export interface OptimizedListing {
  title: string;
  description: string;
  hashtags: string[];
  suggestedPrice: string;
  keywords: string[];
  agentInsights: {
    research: string;
    marketAnalysis: string;
  };
  sources: { title: string; uri: string }[];
}

export interface OptimizationRequest {
  platform: Platform;
  roughTitle: string;
  zipCode?: string;
  imageData?: string; // base64
}
