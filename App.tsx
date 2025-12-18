
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
    // Fixed: Removed readonly modifier to match all declarations and ensure compatibility
    aistudio: AIStudio;
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
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasPaidKey(selected);
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
      // Assume success as per race-condition rules
      setHasPaidKey(true);
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
      console.error(err);
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API key not valid")) {
        setHasPaidKey(false);
        setError('Market Research requires a verified project. Use "Enable Video/Search" button.');
      } else {
        setError('System Congestion: Please retry in a moment.');
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!result) return;
    
    // Check key before video generation as it's a high-cost task
    const check = await window.aistudio.hasSelectedApiKey();
    if (!check) {
      await handleSelectKey();
    }
    
    setIsVideoGenerating(true);
    setError(null);
    try {
      const videoUri = await generateListingVideo(result.title, image);
      setResult(prev => prev ? { ...prev, videoUri } : null);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setHasPaidKey(false);
        setError('Video synthesis requires a paid project. Re-select billing key.');
      } else {
        setError('Synthesis Engine Timeout. Please check project billing status.');
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
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Reseller Intelligence Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {!hasPaidKey && (
               <Button variant="outline" onClick={handleSelectKey} className="text-[9px] border-blood-500/30 text-blood-400 h-9">
                 UPGRADE TO PRO (FREE READY)
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
        {/* Input Control */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Listing Injection" glow>
            <div className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Marketplace Core</label>
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
                    <img src={image} className="h-24 rounded-lg object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white font-bold uppercase rounded-lg">Change</div>
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
                <div className="p-3 bg-blood-900/20 text-blood-400 text-[9px] font-black rounded-lg border border-blood-500/20 uppercase leading-relaxed">
                  {error}
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block mt-1 underline">Check Billing Status</a>
                </div>
              )}

              <Button onClick={handleOptimize} isLoading={isOptimizing} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em]">
                {isOptimizing ? 'Processing Neural Net' : 'Optimize for ' + platform.split(' ')[0]}
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

        {/* Output Console */}
        <div className="lg:col-span-7 space-y-6">
          {!result && !isOptimizing && !isVideoGenerating && (
            <div className="h-full min-h-[400px] border border-white/5 bg-darkgrey-800/50 rounded-3xl flex flex-col items-center justify-center text-gray-700 p-10 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-gray-600 uppercase tracking-tighter">System Idle</h3>
              <p className="max-w-xs mt-3 text-[10px] text-gray-700 font-black uppercase tracking-[0.2em]">Upload product data to initiate the multi-agent optimization sequence.</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card glow title={`${platform} Strategy Output`}>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest">Optimized Title</h4>
                      <button onClick={() => copyToClipboard(result.title)} className="text-[8px] text-gray-500 hover:text-blood-400 font-bold uppercase">Copy</button>
                    </div>
                    <p className="text-2xl font-black text-white leading-tight tracking-tight">{result.title}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest mb-3">Narrative Description</h4>
                    <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap bg-darkgrey-900/80 p-5 rounded-2xl border border-white/5">
                      {result.description}
                    </div>
                  </div>

                  {result.sources && result.sources.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest mb-3">Market Verification Context</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-white hover:border-blood-500/50 transition-all flex items-center gap-1.5"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                            </svg>
                            {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Market Valuation">
                  <div className="space-y-3">
                    <span className="text-3xl font-black text-white">{result.suggestedPrice}</span>
                    <p className="text-[9px] text-gray-500 uppercase font-black leading-relaxed">{result.agentInsights.marketAnalysis}</p>
                  </div>
                </Card>
                
                <Card title="AI Showcase Video">
                  {result.videoUri ? (
                    <div className="space-y-4">
                      <video src={result.videoUri} controls className="w-full rounded-xl border border-white/10 shadow-xl" />
                      <a href={result.videoUri} download className="block text-center text-[9px] font-black text-blood-500 uppercase hover:text-blood-400 transition-colors">Download Showcase Media</a>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-[9px] text-gray-600 uppercase font-black leading-relaxed">Synthesize a cinematic promo video using Veo 3.1</p>
                      <Button 
                        variant="outline" 
                        onClick={handleGenerateVideo} 
                        isLoading={isVideoGenerating}
                        className="border-blood-500/30 text-blood-400 hover:bg-blood-500/10 h-12"
                      >
                        {isVideoGenerating ? 'Rendering Video...' : 'Launch Veo Render'}
                      </Button>
                      {!hasPaidKey && (
                        <p className="text-[8px] text-gray-700 font-bold uppercase text-center italic">Requires Billing Enabled Project</p>
                      )}
                    </div>
                  )}
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button variant="ghost" onClick={() => setResult(null)} className="text-[9px] uppercase font-black px-6">New Analysis</Button>
                <Button 
                  variant="primary" 
                  onClick={() => copyToClipboard(`${result.title}\n\n${result.description}`)} 
                  className="px-10 py-4 text-[10px] uppercase font-black tracking-widest"
                >
                  {copySuccess ? 'Copied to Clipboard' : 'Copy All Content'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-10 border-t border-white/5 text-center bg-darkgrey-900">
        <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.5em]">Powered by Gemini 3 Flash & Veo 3.1 Fast</p>
        <div className="mt-3 flex justify-center gap-6">
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[8px] text-gray-800 font-bold uppercase tracking-widest hover:text-gray-400">Project Billing</a>
           <span className="text-gray-800">•</span>
           <span className="text-[8px] text-gray-800 font-bold uppercase tracking-widest">Enterprise Reseller v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
