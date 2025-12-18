
import React, { useState, useRef, useEffect } from 'react';
import { Platform, OptimizedListing } from './types';
import { optimizeListing } from './services/geminiService';
import { Button } from './components/Button';
import { Card } from './components/Card';

const App: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.EBAY);
  const [roughTitle, setRoughTitle] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<number>(0);
  const [result, setResult] = useState<OptimizedListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle agent status during generation
  useEffect(() => {
    let interval: any;
    if (isOptimizing) {
      setActiveAgent(1);
      interval = setInterval(() => {
        setActiveAgent((prev) => (prev < 3 ? prev + 1 : 1));
      }, 2500);
    } else {
      setActiveAgent(0);
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isOptimizing]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOptimize = async () => {
    if (!roughTitle && !image) {
      setError('System Error: No payload detected. Enter text or upload image.');
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setResult(null);
    try {
      const data = await optimizeListing(platform, roughTitle, zipCode, image || undefined);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Neural Link Failure: Agent timeout. Verify API permissions.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const getMarketplaceUrl = (p: Platform) => {
    switch (p) {
      case Platform.EBAY: return 'https://www.ebay.com/sl/sell';
      case Platform.POSHMARK: return 'https://poshmark.com/listing/new';
      case Platform.ETSY: return 'https://www.etsy.com/your/shops/me/listing/create';
      case Platform.FACEBOOK: return 'https://www.facebook.com/marketplace/create/item';
      case Platform.AMAZON: return 'https://sellercentral.amazon.com/product-search';
      case Platform.DROPSHIPPING: return '#';
      default: return '#';
    }
  };

  return (
    <div className="min-h-screen bg-darkgrey-900 flex flex-col selection:bg-blood-500 selection:text-white font-['Inter']">
      {/* Header */}
      <header className="bg-darkgrey-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blood-500 to-blood-700 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-glow">
              L
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter">
                LISTINGPRO <span className="text-blood-500">AI</span>
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Reseller Agent Hub</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
             <div className="flex gap-3 items-center bg-white/5 px-5 py-2.5 rounded-full border border-white/5 shadow-inner">
                <div className={`w-2 h-2 rounded-full ${isOptimizing ? 'bg-blood-500 animate-pulse' : 'bg-gray-600'}`}></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {isOptimizing ? `AGENT ${activeAgent} ACTIVE` : 'NEURAL CORE READY'}
                </span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-8">
          <Card title="Global Configuration" glow>
            <div className="space-y-8">
              {/* Marketplace Selector */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Target Marketplace</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-darkgrey-900 rounded-2xl border border-white/5">
                  {Object.values(Platform).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`py-3 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider ${
                        platform === p 
                        ? 'bg-blood-500 text-white shadow-glow' 
                        : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Injection */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Market Context (Rough Notes)</label>
                    <textarea
                      value={roughTitle}
                      onChange={(e) => setRoughTitle(e.target.value)}
                      placeholder="e.g. Vintage 1994 Pink Floyd Tour Shirt, XL, fading..."
                      className="w-full bg-darkgrey-900 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-gray-800 focus:border-blood-500/50 outline-none transition-all min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Global Location Logic (Zip Code)</label>
                    <div className="relative">
                       <input
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="Local Market Context (Optional)"
                        className="w-full bg-darkgrey-900 border border-white/5 rounded-xl px-5 py-3 text-sm text-white placeholder:text-gray-800 focus:border-blood-500/50 outline-none transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-blood-500/40 uppercase">LOCALIZE</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Modal Input */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Visual Data Stream</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative group border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                    image ? 'border-blood-500 bg-blood-500/5' : 'border-white/5 hover:border-blood-500/30 hover:bg-white/2'
                  }`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  {image ? (
                    <div className="relative w-full aspect-square max-h-[200px] flex justify-center overflow-hidden rounded-2xl">
                      <img src={image} alt="Preview" className="h-full w-full object-cover shadow-2xl transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <span className="text-[10px] font-black text-white uppercase tracking-widest">Replace Sensor Data</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-white/5 rounded-full mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-gray-700 group-hover:text-blood-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] group-hover:text-gray-400 transition-colors">Capture Sensory Data</p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-blood-900/20 text-blood-400 text-[10px] font-black rounded-xl border border-blood-500/20 uppercase tracking-[0.2em] animate-pulse">
                  {error}
                </div>
              )}

              <Button 
                onClick={handleOptimize} 
                isLoading={isOptimizing}
                className="w-full py-5 text-xs uppercase tracking-[0.4em] font-black shadow-glow active:shadow-none"
              >
                Execute Optimization
              </Button>
            </div>
          </Card>

          {/* Real-time Agent HUD */}
          {isOptimizing && (
            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
              {[
                { id: 1, name: 'Lead Researcher', task: 'Brand Authentication' },
                { id: 2, name: 'Market Analyst', task: 'Localized Price Indexing' },
                { id: 3, name: 'SEO Architect', task: 'Platform Core Synthesis' }
              ].map((agent) => (
                <div key={agent.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-700 ${activeAgent === agent.id ? 'bg-blood-500/10 border-blood-500/40 shadow-glow' : 'bg-darkgrey-800 border-white/5 opacity-40'}`}>
                  <div className={`w-2 h-2 rounded-full ${activeAgent === agent.id ? 'bg-blood-500 animate-ping' : 'bg-gray-700'}`}></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white uppercase tracking-wider">{agent.name}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">{agent.task}</p>
                  </div>
                  {activeAgent === agent.id && (
                    <div className="text-[8px] font-black text-blood-500 uppercase tracking-widest">Active</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Output Console */}
        <div className="lg:col-span-7 space-y-8">
          {!result && !isOptimizing && (
            <div className="h-full min-h-[500px] border border-white/5 bg-darkgrey-800/50 rounded-[40px] flex flex-col items-center justify-center text-gray-600 p-12 text-center group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blood-500/5 to-transparent pointer-events-none"></div>
              <div className="w-32 h-32 bg-white/2 rounded-full flex items-center justify-center mb-10 border border-white/5 group-hover:border-blood-500/20 transition-all duration-1000">
                <svg className="w-14 h-14 text-gray-800 opacity-20 group-hover:opacity-40 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-gray-500 uppercase tracking-tighter mb-4">Neural Core Standby</h3>
              <p className="max-w-xs text-[11px] text-gray-700 font-black uppercase tracking-[0.2em] leading-relaxed">
                Connect your sensory inputs and marketplace targets to initiate agent optimization sequence.
              </p>
            </div>
          )}

          {result && !isOptimizing && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-1000">
              {/* Primary Listing Card */}
              <Card glow title={`${platform} Optimization Complete`}>
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-blood-500 uppercase tracking-[0.3em] mb-4">Optimized Core Title</h4>
                    <p className="text-3xl font-black text-white leading-[1.1] tracking-tight border-b border-white/5 pb-6">
                      {result.title}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black text-blood-500 uppercase tracking-[0.3em]">Algorithm Payload</h4>
                      <Button 
                        variant="ghost" 
                        onClick={() => copyToClipboard(result.description)} 
                        className={`h-8 w-8 !p-0 transition-colors ${copySuccess ? 'text-emerald-500' : 'text-gray-400'}`}
                      >
                        {copySuccess ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 8h4m-2-2v4" />
                          </svg>
                        )}
                      </Button>
                    </div>
                    <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap font-medium bg-darkgrey-900/50 p-6 rounded-3xl border border-white/5 border-l-4 border-l-blood-500 shadow-inner">
                      {result.description}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Data & Valuation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card title="Agent Insights">
                  <div className="space-y-4">
                    <div className="p-4 bg-darkgrey-900/50 rounded-2xl border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blood-500/20"></div>
                      <p className="text-[9px] font-black text-blood-500 uppercase tracking-widest mb-2">Research Phase</p>
                      <p className="text-[11px] text-gray-400 font-bold leading-relaxed">{result.agentInsights.research}</p>
                    </div>
                    <div className="p-4 bg-darkgrey-900/50 rounded-2xl border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20"></div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Market Analysis</p>
                      <p className="text-[11px] text-gray-400 font-bold leading-relaxed">{result.agentInsights.marketAnalysis}</p>
                    </div>
                  </div>
                </Card>

                <Card glow title="Strategic Valuation">
                  <div className="space-y-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-2">Suggested Market Velocity Price</span>
                      <span className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-glow">
                        {result.suggestedPrice}
                      </span>
                    </div>
                    {result.sources.length > 0 && (
                      <div className="pt-6 border-t border-white/5">
                        <span className="text-[10px] text-blood-500 uppercase tracking-widest font-black block mb-4">Neural Training Sources (Comps)</span>
                        <div className="space-y-2">
                          {result.sources.slice(0, 4).map((source, i) => (
                            <a 
                              key={i} 
                              href={source.uri} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="group/link flex items-center justify-between p-2 rounded-lg bg-white/2 border border-transparent hover:border-blood-500/30 transition-all"
                            >
                              <span className="text-[10px] text-gray-600 group-hover/link:text-white font-black truncate max-w-[200px]">
                                {source.title}
                              </span>
                              <svg className="w-3 h-3 text-gray-800 group-hover/link:text-blood-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Global Hashtags / Keywords */}
              <Card>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((kw, i) => (
                    <span key={i} className="px-4 py-2 bg-darkgrey-900 text-gray-500 rounded-full text-[9px] font-black border border-white/5 uppercase tracking-wider hover:text-white hover:border-white/20 transition-all cursor-default">
                      {kw}
                    </span>
                  ))}
                  {result.hashtags.map((ht, i) => (
                    <span key={i} className="px-4 py-2 bg-blood-500/10 text-blood-400 rounded-full text-[9px] font-black border border-blood-500/20 uppercase tracking-wider hover:bg-blood-500 transition-all cursor-default">
                      {ht.startsWith('#') ? ht : `#${ht}`}
                    </span>
                  ))}
                </div>
              </Card>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <Button variant="ghost" onClick={() => setResult(null)} className="text-[10px] uppercase tracking-widest font-black">Reset Core</Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="primary" 
                    onClick={() => copyToClipboard(`${result.title}\n\n${result.description}\n\n${result.hashtags.join(' ')}`)} 
                    className={`px-10 py-5 text-[10px] uppercase tracking-[0.4em] font-black min-w-[240px] transition-all duration-300 ${copySuccess ? 'bg-emerald-600 border-emerald-400' : ''}`}
                  >
                    {copySuccess ? 'LINK ESTABLISHED / COPIED' : 'COPY OPTIMIZATION'}
                  </Button>
                  
                  {platform !== Platform.DROPSHIPPING && (
                    <a 
                      href={getMarketplaceUrl(platform)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-white/5 border border-white/10 hover:border-blood-500/50 hover:bg-blood-500/10 text-white rounded-lg flex items-center justify-center px-6 transition-all shadow-glow/20"
                    >
                      <svg className="w-5 h-5 text-blood-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-darkgrey-800 border border-white/10 flex items-center justify-center font-black text-blood-500">L</div>
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em]">PRODUCED BY THE NEURAL FLIP ENGINE</p>
           </div>
           <div className="flex gap-8 text-[9px] font-black text-gray-700 uppercase tracking-widest">
              <span className="hover:text-blood-500 cursor-pointer transition-colors">Documentation</span>
              <span className="hover:text-blood-500 cursor-pointer transition-colors">Security Layer</span>
              <span className="hover:text-blood-500 cursor-pointer transition-colors">V:4.2.0-PRO</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
