
import { GoogleGenAI, Type } from "@google/genai";
import { Platform, OptimizedListing } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are the ListingPro AI Core, a multi-agent reseller intelligence system.
Your workflow:
1. RESEARCH AGENT: Deep dive into item specifications, brand provenance, and technical details.
2. MARKET ANALYST AGENT: Scan global and local marketplaces (using provided zip context) for real-time sales data, competitor pricing, and demand velocity.
3. OPTIMIZATION AGENT: Construct high-conversion metadata tailored for specific platform algorithms.

Platform Specifics:
- eBay: High-intent SEO, 80-char titles, technical specs.
- Poshmark: Stylized, brand-forward, social engagement tags.
- Etsy: Artisanal, material-heavy, story-driven narratives.
- Facebook Marketplace: Localized value props, direct tone, pickup-friendly.
- Amazon: Professional SKU-style titles, benefit-driven bullet points, ASIN-readiness.
- Dropshipping: Emotional hooks, USP-focused, viral-ready ad copy.

Always return valid JSON. Use search results to provide verified price benchmarks.`;

export async function optimizeListing(
  platform: Platform,
  roughTitle: string,
  zipCode?: string,
  imageData?: string
): Promise<OptimizedListing> {
  const model = 'gemini-3-pro-preview';
  
  const searchPrompt = `AGENT DIRECTIVE:
  
  PHASE 1 (RESEARCH): Identify the exact item: "${roughTitle}". 
  PHASE 2 (ANALYSIS): Locate market 'Comps' (Comparable sales). 
  Global context + Local context ${zipCode ? `(Targeting Zip Code: ${zipCode})` : 'Universal'}.
  Check current listings on ${platform} and competitors.
  
  PHASE 3 (SYNTHESIS): Generate optimized listing for ${platform}.
  
  ${imageData ? "Visual data provided via attached image." : "Text-only analysis required."}
  
  REQUIRED JSON SCHEMA:
  {
    "title": "Optimized SEO title",
    "description": "Formatted description (use bullet points if for Amazon)",
    "hashtags": ["tag1", "tag2"],
    "keywords": ["key1", "key2"],
    "suggestedPrice": "Range in USD",
    "agentInsights": {
      "research": "Item identification details",
      "marketAnalysis": "Price competition findings"
    }
  }`;

  const parts: any[] = [{ text: searchPrompt }];
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageData.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedPrice: { type: Type.STRING },
          agentInsights: {
            type: Type.OBJECT,
            properties: {
              research: { type: Type.STRING },
              marketAnalysis: { type: Type.STRING }
            },
            required: ["research", "marketAnalysis"]
          }
        },
        required: ["title", "description", "hashtags", "keywords", "suggestedPrice", "agentInsights"]
      }
    }
  });

  const textOutput = response.text || "{}";
  const result = JSON.parse(textOutput.trim());
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    ?.map((chunk: any) => ({
      title: chunk.web.title || 'Market Source',
      uri: chunk.web.uri
    })) || [];

  return { ...result, sources } as OptimizedListing;
}
