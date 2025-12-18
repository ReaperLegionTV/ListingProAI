
import { GoogleGenAI } from "@google/genai";
import { Platform, OptimizedListing } from "../types";

const SYSTEM_INSTRUCTION = `You are ListingPro AI, a specialist tool for resellers.
Your mission: Analyze product media (photos or videos) and notes to create professional marketplace listings.

Capabilities:
1. VISION: Watch videos or look at photos to identify brand, model, features, and condition.
2. SEO: Generate high-conversion titles and descriptions for specific platforms.
3. PRICING: Provide market-value estimates.

Platform Context:
- eBay: Professional and specs-heavy.
- Poshmark: Brand-focused and social.
- Etsy: Story-telling and artisanal.
- TikTok/FB: Catchy and value-driven.

Return a valid JSON object: { "title": "...", "description": "...", "hashtags": ["..."], "suggestedPrice": "...", "agentInsights": { "research": "...", "marketAnalysis": "..." } }`;

export async function optimizeListing(
  platform: Platform,
  roughTitle: string,
  zipCode?: string,
  mediaData?: { data: string; mimeType: string }
): Promise<OptimizedListing> {
  // Use the environment variable set in Netlify
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview'; 

  const prompt = `Analyze this ${platform} listing.
  Initial Info: "${roughTitle}". 
  Zip Code: ${zipCode || 'Not provided'}.
  ${mediaData ? "I have attached a " + (mediaData.mimeType.startsWith('video') ? "video clip" : "photo") + " of the item. Use it to extract brand details, condition, and specific features." : ""}
  
  Provide the optimized listing in JSON format.`;

  const parts: any[] = [{ text: prompt }];
  if (mediaData) {
    parts.push({
      inlineData: {
        mimeType: mediaData.mimeType,
        data: mediaData.data.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }], // Available in free tier
    }
  });

  const text = response.text || "";
  let result: any = {};
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  } catch (e) {
    result = {
      title: roughTitle || "New Listing",
      description: text,
      hashtags: [],
      suggestedPrice: "Market Price",
      agentInsights: { research: "Analysis complete.", marketAnalysis: "Check sources below." }
    };
  }
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    ?.map((chunk: any) => ({
      title: chunk.web.title || 'Market Source',
      uri: chunk.web.uri
    })) || [];

  return {
    title: result.title || roughTitle,
    description: result.description || text,
    hashtags: result.hashtags || [],
    keywords: [],
    suggestedPrice: result.suggestedPrice || "Market Price",
    agentInsights: result.agentInsights || { research: "Analyzing...", marketAnalysis: "Analyzing..." },
    sources
  } as OptimizedListing;
}
