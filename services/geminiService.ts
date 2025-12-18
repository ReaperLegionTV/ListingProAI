
import { GoogleGenAI, Type } from "@google/genai";
import { Platform, OptimizedListing } from "../types";

const SYSTEM_INSTRUCTION = `You are the ListingPro AI Core, a multi-agent reseller intelligence system.
Your workflow:
1. RESEARCH AGENT: Deep dive into item specifications and brand details.
2. MARKET ANALYST AGENT: Scan global and local marketplaces for real-time sales data.
3. OPTIMIZATION AGENT: Construct high-conversion metadata for resellers.
4. CINEMATOGRAPHY AGENT: Design cinematic prompts for product showcase videos.

Platform Specifics:
- eBay: High-intent SEO with focus on item specifics.
- Poshmark: Stylized, brand-forward, emoji-friendly.
- Etsy: Artisanal, story-driven, vintage-focused.
- Facebook Marketplace: Localized value props, simple and direct.
- Amazon: Professional SKU-style, feature-bullet-point driven.
- Dropshipping: USP-focused hooks for cold traffic.
- TikTok Shop: Hook-driven captions for short-form video.

Always return valid JSON following the provided schema.`;

export async function optimizeListing(
  platform: Platform,
  roughTitle: string,
  zipCode?: string,
  imageData?: string
): Promise<OptimizedListing> {
  // Always create a fresh instance to use the current environment's API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview'; // Flash is fastest and most cost-effective for deployment
  
  const searchPrompt = `AGENT DIRECTIVE:
  Target Item: "${roughTitle}". 
  Target Marketplace: ${platform}.
  Location Context: ${zipCode ? `Local area around ${zipCode}` : 'Global Market'}.
  ${imageData ? "Image analysis required." : "Text-only analysis."}
  
  TASK: Perform market research using Google Search to find current pricing and brand value.
  Generate optimized listing content including SEO title, rich description, pricing strategy, and tags.
  Return the output as a JSON object with properties: title, description, hashtags (array), keywords (array), suggestedPrice, agentInsights (object with research and marketAnalysis).`;

  const parts: any[] = [{ text: searchPrompt }];
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageData.split(',')[1]
      }
    });
  }

  // NOTE: According to Search Grounding guidelines, output text might not be JSON.
  // We remove responseMimeType/responseSchema to ensure search results are prioritized and grounded correctly.
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
  
  // Robustly extract JSON from the potentially grounded text output
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      result = JSON.parse(text);
    }
  } catch (e) {
    console.warn("Could not parse grounded response as JSON, using text extraction", e);
    result = {
      title: roughTitle,
      description: text,
      hashtags: [],
      keywords: [],
      suggestedPrice: "N/A",
      agentInsights: {
        research: "Raw search results provided in description.",
        marketAnalysis: "Refer to grounded sources below."
      }
    };
  }
  
  // Extract grounding sources for transparency and guidelines compliance
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
    suggestedPrice: result.suggestedPrice || "Contact for Quote",
    agentInsights: result.agentInsights || { research: "Analyzing...", marketAnalysis: "Analyzing..." },
    sources
  } as OptimizedListing;
}

export async function generateListingVideo(
  title: string,
  imageData: string | null
): Promise<string> {
  // Veo models require a paid billing key via the BYOK flow in the UI
  let ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A high-end cinematic product showcase video for: "${title}". Professional studio lighting, bokeh background, slow cinematic camera movement. Elegant and expensive feel.`,
    ...(imageData && {
      image: {
        imageBytes: imageData.split(',')[1],
        mimeType: 'image/jpeg'
      }
    }),
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    // Refresh instance right before making an API call to ensure it always uses the most up-to-date API key
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  // Append key for download access as per Veo requirements
  return `${downloadLink}&key=${process.env.API_KEY}`;
}
