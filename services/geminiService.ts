
import { GoogleGenAI } from "@google/genai";
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
- TikTok Shop: Hook-driven captions for short-form video.

Return output as a JSON-parsable string within the grounded response.`;

export async function optimizeListing(
  platform: Platform,
  roughTitle: string,
  zipCode?: string,
  imageData?: string
): Promise<OptimizedListing> {
  // Always create a new instance to ensure we use the most recent process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Gemini 3 Flash is the recommended model for general text tasks and has higher rate limits
  const model = 'gemini-3-flash-preview'; 
  
  const searchPrompt = `AGENT DIRECTIVE:
  Target Item: "${roughTitle}". 
  Target Marketplace: ${platform}.
  Location Context: ${zipCode ? `Local area around ${zipCode}` : 'Global Market'}.
  ${imageData ? "Analyze product photo for details." : ""}
  
  TASK: Search the web for current market value. 
  Output JSON format: title, description, hashtags (array), keywords (array), suggestedPrice, agentInsights (object).`;

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
      keywords: [],
      suggestedPrice: "Checking Recent Solds...",
      agentInsights: { research: "Market scan complete.", marketAnalysis: "Review sources below." }
    };
  }
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    ?.map((chunk: any) => ({
      title: chunk.web.title || 'Source',
      uri: chunk.web.uri
    })) || [];

  return {
    title: result.title || roughTitle,
    description: result.description || text,
    hashtags: result.hashtags || [],
    keywords: result.keywords || [],
    suggestedPrice: result.suggestedPrice || "Market Value",
    agentInsights: result.agentInsights || { research: "Analyzing...", marketAnalysis: "Analyzing..." },
    sources
  } as OptimizedListing;
}

export async function generateListingVideo(
  title: string,
  imageData: string | null
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Professional cinematic product showcase for: "${title}". High-end studio lighting, clean background, 4k detail.`,
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
    const poller = new GoogleGenAI({ apiKey: process.env.API_KEY });
    operation = await poller.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return `${downloadLink}&key=${process.env.API_KEY}`;
}
