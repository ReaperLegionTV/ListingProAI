
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

  useEffect(() => {
    let interval: any;
    if (isOptimizing) {
      setActiveAgent(1);
      interval = setInterval(() => {
        setActiveAgent((prev) => (prev < 3 ? prev + 1 : 1));
      }, 2000);
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
      setError('Please provide a title or photo to begin.');
      return;
    }
    setIsOptimizing(true);
    setError(null);
    setResult(null);
    try {
      const data = await optimizeListing(platform, roughTitle, zipCode, image || undefined);
      setResult(data);
    } catch (err: any) {
      console.error("API Error:", err);
      setError('Unable to reach the optimization core. Please try again in a few seconds.');
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

  return (
    <div className="min-h-screen bg-darkgrey-900 flex flex-col selection:bg-blood-500 selection:text-white font-['Inter']">
      <header className="bg-darkgrey-900/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blood-500 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-glow">L</div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tighter">LISTINGPRO <span className="text-blood-500">AI</span></h1>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Reseller Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex gap-3 items-center bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full ${isOptimizing ? 'bg-blood-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {isOptimizing ? 'Optimizing...' : 'System Ready'}
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
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Marketplace Target</label>
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
                  placeholder="Paste item name, brand, or features..."
                  className="w-full bg-darkgrey-900 border border-white/5 rounded-xl px-4 py-4 text-sm text-white placeholder:text-gray-700 focus:border-blood-500/50 outline-none min-h-[120px] resize-none"
                />
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Location Zip (Optional)"
                  className="w-full bg-darkgrey-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700 focus:border-blood-500/30 outline-none"
                />
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()} 
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${image ? 'border-blood-500 bg-blood-500/5' : 'border-white/10 hover:border-blood-500/20'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                {image ? (
                  <div className="relative group w-full flex justify-center">
                    <img src={image} className="max-h-56 rounded-xl object-contain shadow-xl" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <span className="text-[10px] text-white font-black uppercase tracking-widest">Change Photo</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg className="w-8 h-8 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Upload Item Photo</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-blood-900/20 text-blood-400 text-[10px] font-black rounded-xl border border-blood-500/20 uppercase tracking-wider">
                  {error}
                </div>
              )}

              <Button onClick={handleOptimize} isLoading={isOptimizing} className="w-full py-5 text-[11px] font-black uppercase tracking-[0.4em]">
                {isOptimizing ? 'Processing...' : `Optimize for ${platform.split(' ')[0]}`}
              </Button>
            </div>
          </Card>

          {isOptimizing && (
            <div className="space-y-2">
              {[
                { id: 1, name: 'Market Intelligence', active: activeAgent === 1 },
                { id: 2, name: 'SEO Architect', active: activeAgent === 2 },
                { id: 3, name: 'Final Review', active: activeAgent === 3 }
              ].map((agent) => (
                <div key={agent.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${agent.active ? 'bg-blood-500/10 border-blood-500/40' : 'bg-darkgrey-800 border-white/5 opacity-20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'bg-blood-500 animate-pulse' : 'bg-gray-700'}`}></div>
                  <p className="text-[9px] font-black text-white uppercase tracking-wider">{agent.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          {!result && !isOptimizing && (
            <div className="h-full min-h-[460px] border border-white/5 bg-darkgrey-800/50 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5">
                <svg className="w-8 h-8 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-gray-700 uppercase tracking-tighter">Ready for Scan</h3>
              <p className="max-w-xs mt-3 text-[10px] text-gray-700 font-black uppercase tracking-[0.3em] leading-relaxed">Enter your item details or upload a photo to generate an optimized marketplace listing.</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <Card glow title={`${platform} Optimized Metadata`}>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest">Professional Title</h4>
                      <button onClick={() => copyToClipboard(result.title)} className="text-[9px] text-gray-500 hover:text-white font-black uppercase tracking-wider transition-colors">{copySuccess ? '✓ Copied' : 'Copy'}</button>
                    </div>
                    <p className="text-2xl font-black text-white leading-tight tracking-tighter">{result.title}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest mb-4">SEO Description</h4>
                    <div className="text-gray-400 text-[13px] leading-relaxed whitespace-pre-wrap bg-darkgrey-900/60 p-6 rounded-2xl border border-white/5">
                      {result.description}
                    </div>
                  </div>

                  {result.sources && result.sources.length > 0 && (
                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-[9px] font-black text-blood-500 uppercase tracking-widest mb-4">Market Context</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 text-gray-500 hover:text-white hover:border-blood-500/50 hover:bg-blood-500/5 transition-all flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Pricing Estimate">
                  <div className="space-y-4">
                    <span className="text-4xl font-black text-white tracking-tighter block">{result.suggestedPrice}</span>
                    <p className="text-[10px] text-gray-500 uppercase font-black leading-relaxed tracking-wider">Suggested based on current market trends and recent sales data.</p>
                  </div>
                </Card>
                
                <Card title="Listing Insights">
                   <div className="space-y-4">
                    <p className="text-[11px] text-white/80 font-medium leading-relaxed italic border-l-2 border-blood-500 pl-4">
                      "{result.agentInsights.marketAnalysis}"
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {result.hashtags.map(tag => (
                        <span key={tag} className="text-[9px] font-bold text-blood-400 bg-blood-500/5 px-2 py-1 rounded border border-blood-500/10">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <Button variant="ghost" onClick={() => setResult(null)} className="text-[10px] uppercase font-black px-8">Reset</Button>
                <Button 
                  variant="primary" 
                  onClick={() => copyToClipboard(`${result.title}\n\n${result.description}`)} 
                  className="px-12 py-5 text-[11px] uppercase font-black tracking-[0.3em]"
                >
                  {copySuccess ? 'Content Copied' : 'Copy Full Listing'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-12 border-t border-white/5 text-center bg-darkgrey-900">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
           <p className="text-[10px] font-black text-gray-800 uppercase tracking-[0.6em]">ListingPro AI v2.6</p>
           <div className="flex justify-center items-center gap-8">
              <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest">Powered by Gemini 3 Flash</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
