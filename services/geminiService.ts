
import { GoogleGenAI } from "@google/genai";
import { Platform, OptimizedListing } from "../types";

const SYSTEM_INSTRUCTION = `You are the ListingPro AI Core, a specialist tool for resellers.
Your mission: Transform rough notes, photos, or descriptions into high-performing marketplace listings.

Workflow:
1. Identify brand, model, condition, and key features.
2. Analyze market context for the specific platform (eBay, Poshmark, etc.).
3. Generate SEO-optimized titles and detailed, persuasive descriptions.
4. Provide a suggested price based on typical market value.

Platform Styles:
- eBay: Professional, keyword-rich, feature-dense.
- Poshmark: Social, friendly, uses emojis, emphasizes brand/style.
- Etsy: Story-driven, highlighting craftsmanship or vintage appeal.
- Facebook: Direct, local-focused, highlight value.
- Amazon: Structured, SKU-like, focus on specs.
- TikTok Shop: Hook-oriented, catchy captions.

Always return a JSON object containing: title, description, hashtags (array), suggestedPrice, agentInsights (object with research and marketAnalysis keys).`;

export async function optimizeListing(
  platform: Platform,
  roughTitle: string,
  zipCode?: string,
  imageData?: string
): Promise<OptimizedListing> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview'; 
  
  const searchPrompt = `Optimize this listing for ${platform}.
  Item Context: "${roughTitle}". 
  Location: ${zipCode || 'General'}.
  ${imageData ? "A photo of the item is provided for visual analysis." : ""}
  
  Return a structured JSON listing optimization with grounding links if applicable.`;

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
    }
  });

  const text = response.text || "";
  let result: any = {};
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  } catch (e) {
    result = {
      title: roughTitle,
      description: text,
      hashtags: [],
      suggestedPrice: "Contact for Quote",
      agentInsights: { research: "Basic scan complete.", marketAnalysis: "Review sources below." }
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
    keywords: result.keywords || [],
    suggestedPrice: result.suggestedPrice || "Market Price",
    agentInsights: result.agentInsights || { research: "Analyzing brand...", marketAnalysis: "Analyzing value..." },
    sources
  } as OptimizedListing;
}
