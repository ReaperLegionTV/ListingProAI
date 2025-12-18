
import React, { useState, useRef, useEffect } from 'react';
import { Platform, OptimizedListing } from './types';
import { optimizeListing, generateListingVideo } from './services/geminiService';
import { Button } from './components/Button';
import { Card } from './components/Card';

// Fix: Use AIStudio interface name and readonly modifier to match existing global declarations
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    readonly aistudio: AIStudio;
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
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasPaidKey(selected);
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
      }, 2500);
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
    await window.aistudio.openSelectKey();
    setHasPaidKey(true);
  };

  const handleOptimize = async () => {
    if (!roughTitle && !image) {
      setError('System Error: No payload detected.');
      return;
    }
    setIsOptimizing(true);
    setError(null);
    setResult(null);
    try {
      const data = await optimizeListing(platform, roughTitle, zipCode, image || undefined);
      setResult(data);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setHasPaidKey(false);
        setError('Paid API Key required for this operation. Please select one.');
      } else {
        setError('Neural Link Failure: Agent timeout.');
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!result) return;
    if (!hasPaidKey) {
      await handleSelectKey();
    }
    setIsVideoGenerating(true);
    setError(null);
    try {
      const videoUri = await generateListingVideo(result.title, image);
      setResult(prev => prev ? { ...prev, videoUri } : null);
    } catch (err: any) {
      setError('Video Synthesis Failed. Verify paid project status.');
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
      {/* Header */}
      <header className="bg-darkgrey-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blood-500 to-blood-700 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-glow">L</div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter">LISTINGPRO <span className="text-blood-500">AI</span></h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Reseller Agent Hub</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
             {!hasPaidKey && (
               <Button variant="outline" onClick={handleSelectKey} className="text-[9px] border-blood-500/20 text-blood-400">
                 ENABLE VIDEO (PAID KEY REQ)
               </Button>
             )}
             <div className="flex gap-3 items-center bg-white/5 px-5 py-2.5 rounded-full border border-white/5 shadow-inner">
                <div className={`w-2 h-2 rounded-full ${(isOptimizing || isVideoGenerating) ? 'bg-blood-500 animate-pulse' : 'bg-gray-600'}`}></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {isOptimizing ? `AGENT ${activeAgent} ACTIVE` : isVideoGenerating ? 'CINEMA AGENT RENDERING' : 'SYSTEM STANDBY'}
                </span>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Input Control */}
        <div className="lg:col-span-5 space-y-8">
          <Card title="Listing Injection" glow>
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Target Marketplace</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-darkgrey-900 rounded-2xl border border-white/5">
                  {Object.values(Platform).map((p) => (
                    <button key={p} onClick={() => setPlatform(p)}
                      className={`py-3 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider ${platform === p ? 'bg-blood-500 text-white shadow-glow' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  value={roughTitle}
                  onChange={(e) => setRoughTitle(e.target.value)}
                  placeholder="Rough notes, serial numbers, flaws..."
                  className="w-full bg-darkgrey-900 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-gray-800 focus:border-blood-500/50 outline-none min-h-[120px]"
                />
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Zip Code (Optional)"
                  className="w-full bg-darkgrey-900 border border-white/5 rounded-xl px-5 py-3 text-sm text-white placeholder:text-gray-800"
                />
              </div>

              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${image ? 'border-blood-500 bg-blood-500/5' : 'border-white/5 hover:border-blood-500/30'}`}>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                {image ? <img src={image} className="h-32 rounded-xl object-cover" /> : <p className="text-[10px] font-black text-gray-600 uppercase">Drop Product Photo</p>}
              </div>

              {error && <div className="p-4 bg-blood-900/20 text-blood-400 text-[10px] font-black rounded-xl border border-blood-500/20 uppercase tracking-widest">{error}</div>}

              <Button onClick={handleOptimize} isLoading={isOptimizing} className="w-full py-5 text-xs font-black uppercase tracking-[0.4em]">Initialize Agents</Button>
            </div>
          </Card>

          {(isOptimizing || isVideoGenerating) && (
            <div className="space-y-3">
              {[
                { id: 1, name: 'Lead Researcher', active: isOptimizing && activeAgent === 1 },
                { id: 2, name: 'Market Analyst', active: isOptimizing && activeAgent === 2 },
                { id: 3, name: 'SEO Architect', active: isOptimizing && activeAgent === 3 },
                { id: 4, name: 'Cinematography Agent', active: isVideoGenerating }
              ].map((agent) => (
                <div key={agent.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${agent.active ? 'bg-blood-500/10 border-blood-500/40' : 'bg-darkgrey-800 border-white/5 opacity-40'}`}>
                  <div className={`w-2 h-2 rounded-full ${agent.active ? 'bg-blood-500 animate-ping' : 'bg-gray-700'}`}></div>
                  <p className="text-[10px] font-black text-white uppercase tracking-wider">{agent.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output Console */}
        <div className="lg:col-span-7 space-y-8">
          {!result && !isOptimizing && !isVideoGenerating && (
            <div className="h-full min-h-[500px] border border-white/5 bg-darkgrey-800/50 rounded-[40px] flex flex-col items-center justify-center text-gray-600 p-12 text-center group">
              <h3 className="text-2xl font-black text-gray-500 uppercase tracking-tighter">Neural Core Standby</h3>
              <p className="max-w-xs mt-4 text-[11px] text-gray-700 font-black uppercase tracking-widest">Awaiting multi-modal sensory input.</p>
            </div>
          )}

          {result && (
            <div className="space-y-8">
              <Card glow title={`${platform} Strategy`}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-blood-500 uppercase tracking-widest mb-4">SEO Header</h4>
                    <p className="text-3xl font-black text-white leading-tight tracking-tight">{result.title}</p>
                  </div>
                  <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap bg-darkgrey-900/50 p-6 rounded-3xl border border-white/5">
                    {result.description}
                  </div>

                  {/* Fix: Display mandatory grounding sources from Google Search as required by guidelines */}
                  {result.sources && result.sources.length > 0 && (
                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-[10px] font-black text-blood-500 uppercase tracking-widest mb-4">Market Verification Sources</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5 text-gray-400 hover:text-white hover:border-blood-500/50 transition-all flex items-center gap-2"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card title="Market Value">
                  <div className="space-y-2">
                    <span className="text-4xl font-black text-white">{result.suggestedPrice}</span>
                    <p className="text-[9px] text-gray-500 uppercase font-black">{result.agentInsights.marketAnalysis}</p>
                  </div>
                </Card>
                
                <Card title="Motion Content">
                  {result.videoUri ? (
                    <div className="space-y-4">
                      <video src={result.videoUri} controls className="w-full rounded-xl border border-white/5 shadow-2xl" />
                      <a href={result.videoUri} download className="text-[10px] font-black text-blood-500 uppercase underline">Download Media</a>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-[10px] text-gray-500 uppercase font-black">Generate AI Showcase Video</p>
                      <Button 
                        variant="outline" 
                        onClick={handleGenerateVideo} 
                        isLoading={isVideoGenerating}
                        className="border-blood-500/30 text-blood-400 hover:bg-blood-500/10"
                      >
                        Launch Veo 3.1 Fast Render
                      </Button>
                      {!hasPaidKey && <p className="text-[8px] text-gray-700 font-bold uppercase">Requires Paid Billing Key</p>}
                    </div>
                  )}
                </Card>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={() => setResult(null)} className="text-[10px] uppercase font-black">Reset Terminal</Button>
                <Button variant="primary" onClick={() => copyToClipboard(`${result.title}\n\n${result.description}`)} className="px-12 py-5 text-[10px] uppercase font-black">
                  {copySuccess ? 'LINK COPIED' : 'DEPLOY OPTIMIZATION'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em]">Powered by Gemini 3 Pro & Veo 3.1 Fast</p>
        <p className="mt-2 text-[8px] text-gray-800 font-bold uppercase tracking-widest">
          Billing details: <a href="https://ai.google.dev/gemini-api/docs/billing" className="underline">ai.google.dev/billing</a>
        </p>
      </footer>
    </div>
  );
};

export default App;
