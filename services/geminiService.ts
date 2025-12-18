
import { GoogleGenAI, Type } from "@google/genai";
import { Platform, OptimizedListing } from "../types";

// Note: GoogleGenAI is re-instantiated in the generate calls to ensure the latest API Key
// from the session is used, especially for Veo models.

const SYSTEM_INSTRUCTION = `You are the ListingPro AI Core, a multi-agent reseller intelligence system.
Your workflow:
1. RESEARCH AGENT: Deep dive into item specifications and brand details.
2. MARKET ANALYST AGENT: Scan global and local marketplaces for real-time sales data.
3. OPTIMIZATION AGENT: Construct high-conversion metadata.
4. CINEMATOGRAPHY AGENT: Design cinematic prompts for product showcase videos.

Platform Specifics:
- eBay: High-intent SEO.
- Poshmark: Stylized, brand-forward.
- Etsy: Artisanal, story-driven.
- Facebook Marketplace: Localized value props.
- Amazon: Professional SKU-style.
- Dropshipping: USP-focused hooks.
- TikTok Shop: Hook-driven viral captions.

Always return valid JSON.`;

export async function optimizeListing(
  platform: Platform,
  roughTitle: string,
  zipCode?: string,
  imageData?: string
): Promise<OptimizedListing> {
  // Fix: Re-instantiate ai instance right before the call to pick up the latest session key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  const searchPrompt = `AGENT DIRECTIVE:
  Identify: "${roughTitle}". 
  Market: ${zipCode ? `Local Zip ${zipCode}` : 'Global'}.
  Platform: ${platform}.
  
  ${imageData ? "Image data provided." : "Text-only."}
  
  RETURN JSON:
  {
    "title": "Optimized Title",
    "description": "Rich description",
    "hashtags": ["#tag1"],
    "keywords": ["key"],
    "suggestedPrice": "Price Range",
    "agentInsights": {
      "research": "Brand/Item notes",
      "marketAnalysis": "Price competition data"
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

  const result = JSON.parse(response.text?.trim() || "{}");
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    ?.map((chunk: any) => ({
      title: chunk.web.title || 'Market Source',
      uri: chunk.web.uri
    })) || [];

  return { ...result, sources } as OptimizedListing;
}

export async function generateListingVideo(
  title: string,
  imageData: string | null
): Promise<string> {
  // Fix: Re-instantiate ai instance right before the call to pick up the latest session key
  let ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A cinematic product showcase for "${title}". High resolution, elegant lighting, slow pan around the item. Professional advertising style.`,
    ...(imageData && {
      image: {
        imageBytes: imageData.split(',')[1],
        mimeType: 'image/jpeg'
      }
    }),
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16' // Vertical for TikTok/Mobile
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    // Fix: Re-instantiate ai instance before every operation status check to pick up potential key updates
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return `${downloadLink}&key=${process.env.API_KEY}`;
}
