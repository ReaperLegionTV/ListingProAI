
import React, { useState, useRef, useEffect } from 'react';
import { Platform, OptimizedListing } from './types';
import { optimizeListing, generateListingVideo } from './services/geminiService';
import { Button } from './components/Button';
import { Card } from './components/Card';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.EBAY);
  const [roughTitle, setRoughTitle] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [activeAgent, setActiveAgent] = useState<number>(0);
  const [result, setResult] = useState<OptimizedListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [hasPaidKey, setHasPaidKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasPaidKey(selected);
        } catch (e) {
          console.debug("AI Studio environment not detected");
        }
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isOptimizing || isVideoGenerating) {
      setActiveAgent(isOptimizing ? 1 : 4);
      interval = setInterval(() => {
        if (isOptimizing) {
          setActiveAgent((prev) => (prev < 3 ? prev + 1 : 1));
        }
      }, 2000);
    } else {
      setActiveAgent(0);
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isOptimizing, isVideoGenerating]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasPaidKey(true);
    } else {
      setError("AI Studio integration is required for this action on non-local domains.");
    }
  };

  const handleOptimize = async () => {
    if (!roughTitle && !image) {
      setError('Neural Core: Input required to start optimization.');
      return;
    }
    setIsOptimizing(true);
    setError(null);
    setResult(null);
    try {
      const data = await optimizeListing(platform, roughTitle, zipCode, image || undefined);
      setResult(data);
    } catch (err: any) {
      console.error("Diagnostic Log:", err);
      const msg = err.message?.toLowerCase() || "";
      
      if (msg.includes("401") || msg.includes("403") || msg.includes("api_key") || msg.includes("invalid")) {
        setError('CONFIGURATION ERROR: API Key is missing or invalid. Go to Netlify Settings > Env Variables and ensure API_KEY is set.');
      } else if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
        setError('RATE LIMIT: Too many requests. Please wait 60 seconds and try again.');
      } else if (msg.includes("404")) {
        setError('NOT FOUND: Ensure you have selected a valid project via "Enable Pro Features".');
      } else {
        setError('SYSTEM CONGESTION: The model is currently overloaded. Retrying usually works after a few seconds.');
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!result) return;
    
    if (window.aistudio) {
      const check = await window.aistudio.hasSelectedApiKey();
      if (!check) {
        await handleSelectKey();
      }
    }
    
    setIsVideoGenerating(true);
    setError(null);
    try {
      const videoUri = await generateListingVideo(result.title, image);
      setResult(prev => prev ? { ...prev, videoUri } : null);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setHasPaidKey(false);
        setError('Video synthesis requires a paid Google Cloud project. Please re-select a billing-enabled key.');
      } else {
        setError('Synthesis Engine Timeout. Check your video generation quota in Google Cloud.');
      }
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-darkgrey-900 flex flex-col selection:bg-blood-500 selection:text-white font-['Inter']">
      <header className="bg-darkgrey-900/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blood-500 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-glow">L</div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black text-white tracking-tighter">LISTINGPRO <span className="text-blood-500">AI</span></h1>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Reseller Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {!hasPaidKey && window.aistudio && (
               <Button variant="outline" onClick={handleSelectKey} className="text-[9px] border-blood-500/30 text-blood-400 h-9">
                 ENABLE PRO FEATURES (BYOK)
               </Button>
             )}
             <div className="flex gap-3 items-center bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full ${(isOptimizing || isVideoGenerating) ? 'bg-blood-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {isOptimizing ? 'Researching...' : isVideoGenerating ? 'Rendering...' : 'Neural Link Active'}
                </span>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card title="Listing Injection" glow>
            <div className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Target Marketplace</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-darkgrey-900 rounded-xl border border-white/5">
                  {[Platform.EBAY, Platform.POSHMARK, Platform.ETSY, Platform.FACEBOOK, Platform.AMAZON, Platform.TIKTOK].map((p) => (
                    <button key={p} onClick={() => setPlatform(p)}
                      className={`py-2 rounded-lg transition-all text-[8px] font-black uppercase tracking-wider ${platform === p ? 'bg-blood-500 text-white shadow-glow' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      {p.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={roughTitle}
                  onChange={(e) => setRoughTitle(e.target.value)}
                  placeholder="Paste item title, brand, or bullet points..."
                  className="w-full bg-darkgrey-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700 focus:border-blood-500/50 outline-none min-h-[100px] resize-none"
                />
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Local Zip (Optional)"
                  className="w-full bg-darkgrey-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700"
                />
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()} 
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${image ? 'border-blood-500 bg-blood-500/5' : 'border-white/5 hover:border-blood-500/20'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                {image ? (
                  <div className="relative group">
                    <img src={image} className="h-40 rounded-lg object-contain shadow-2xl" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-black uppercase rounded-lg">Change Visual</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-6 h-6 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-[9px] font-black text-gray-600 uppercase">Product Visual Capture</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-blood-900/30 text-blood-400 text-[10px] font-black rounded-xl border border-blood-500/40 uppercase leading-relaxed animate-pulse">
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{error}</span>
                  </div>
                  <div className="mt-3 flex gap-4 border-t border-blood-500/20 pt-3">
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-white transition-colors">Billing Info</a>
                    {window.aistudio && <button onClick={handleSelectKey} className="hover:text-white transition-colors">Select New Key</button>}
                  </div>
                </div>
              )}

              <Button onClick={handleOptimize} isLoading={isOptimizing} className="w-full py-5 text-[11px] font-black uppercase tracking-[0.3em]">
                {isOptimizing ? 'Consulting Neural Agents' : 'Generate Optimized Listing'}
              </Button>
            </div>
          </Card>

          {(isOptimizing || isVideoGenerating) && (
            <div className="space-y-2">
              {[
                { id: 1, name: 'Brand Researcher', active: isOptimizing && activeAgent === 1 },
                { id: 2, name: 'Market Value Expert', active: isOptimizing && activeAgent === 2 },
                { id: 3, name: 'SEO Content Architect', active: isOptimizing && activeAgent === 3 },
                { id: 4, name: 'Veo Cinema Renderer', active: isVideoGenerating }
              ].map((agent) => (
                <div key={agent.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${agent.active ? 'bg-blood-500/10 border-blood-500/40' : 'bg-darkgrey-800 border-white/5 opacity-30'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'bg-blood-500 animate-pulse' : 'bg-gray-700'}`}></div>
                  <p className="text-[9px] font-black text-white uppercase tracking-wider">{agent.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          {!result && !isOptimizing && !isVideoGenerating && (
            <div className="h-full min-h-[400px] border border-white/5 bg-darkgrey-800/50 rounded-3xl flex flex-col items-center justify-center text-gray-700 p-10 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5">
                <svg className="w-10 h-10 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-gray-600 uppercase tracking-tighter">System Standby</h3>
              <p className="max-w-xs mt-3 text-[10px] text-gray-700 font-black uppercase tracking-[0.2em]">Ready for optimization. All data is processed securely via Gemini 3 Flash.</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card glow title={`${platform} Optimization Hub`}>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest">SEO Header</h4>
                      <button onClick={() => copyToClipboard(result.title)} className="text-[8px] text-gray-500 hover:text-blood-400 font-black uppercase transition-colors">{copySuccess ? 'Copied' : 'Copy'}</button>
                    </div>
                    <p className="text-2xl font-black text-white leading-tight tracking-tight">{result.title}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest mb-3">High-Conversion Description</h4>
                    <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap bg-darkgrey-900/80 p-6 rounded-2xl border border-white/5">
                      {result.description}
                    </div>
                  </div>

                  {result.sources && result.sources.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest mb-3">Grounded Market Intelligence</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] bg-white/5 px-4 py-2 rounded-lg border border-white/5 text-gray-400 hover:text-white hover:border-blood-500/50 transition-all flex items-center gap-1.5"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            {source.title.length > 35 ? source.title.substring(0, 35) + '...' : source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Valuation Strategy">
                  <div className="space-y-3">
                    <span className="text-4xl font-black text-white tracking-tighter">{result.suggestedPrice}</span>
                    <p className="text-[10px] text-gray-500 uppercase font-black leading-relaxed">{result.agentInsights.marketAnalysis}</p>
                  </div>
                </Card>
                
                <Card title="AI Showcase Render">
                  {result.videoUri ? (
                    <div className="space-y-4">
                      <video src={result.videoUri} controls className="w-full rounded-xl border border-white/10 shadow-glow-strong" />
                      <a href={result.videoUri} download className="block text-center text-[9px] font-black text-blood-500 uppercase hover:text-blood-400 transition-colors">Export Cinematic Assets</a>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-[9px] text-gray-600 uppercase font-black leading-relaxed">Synthesize professional video using Veo 3.1 Fast. Requires connected project billing.</p>
                      <Button 
                        variant="outline" 
                        onClick={handleGenerateVideo} 
                        isLoading={isVideoGenerating}
                        className="border-blood-500/30 text-blood-400 hover:bg-blood-500/10 h-12 text-[10px] font-black uppercase tracking-widest"
                      >
                        {isVideoGenerating ? 'Rendering...' : 'Launch Veo Synthesis'}
                      </Button>
                    </div>
                  )}
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button variant="ghost" onClick={() => setResult(null)} className="text-[10px] uppercase font-black px-6">New Optimization</Button>
                <Button 
                  variant="primary" 
                  onClick={() => copyToClipboard(`${result.title}\n\n${result.description}`)} 
                  className="px-10 py-5 text-[11px] uppercase font-black tracking-widest"
                >
                  {copySuccess ? 'Copied to Clipboard' : 'Copy All Content'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-12 border-t border-white/5 text-center bg-darkgrey-900">
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">Enterprise Reseller Intelligence Hub v2.1</p>
        <div className="mt-4 flex justify-center gap-8">
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[9px] text-gray-800 font-black uppercase tracking-widest hover:text-blood-400 transition-colors">Cloud Billing</a>
           <span className="text-gray-900">|</span>
           <span className="text-[9px] text-gray-800 font-black uppercase tracking-widest">Powered by Google Gemini</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
