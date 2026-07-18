import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Sparkles, 
  Send, 
  Loader, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Terminal, 
  Settings, 
  ArrowRight,
  ShieldCheck,
  Share2
} from 'lucide-react';

export default function SocialAssistant({ user, setRefreshTrigger }) {
  const [promptText, setPromptText] = useState('');
  const [promptRunning, setPromptRunning] = useState(false);
  const [promptStep, setPromptStep] = useState('idle'); // idle, parsing, grounding, generating, saving, done
  const [promptLogs, setPromptLogs] = useState([]);
  const [promptResult, setPromptResult] = useState(null);

  // LinkedIn states
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinName, setLinkedinName] = useState('');
  const [linkedinChecking, setLinkedinChecking] = useState(true);
  const [publishingToLinkedin, setPublishingToLinkedin] = useState(false);

  // Suggestions for prompt canvas
  const promptSuggestions = [
    {
      title: "LinkedIn Article Summary",
      desc: "Summarize the latest memoryOS draft for LinkedIn with key takeaways.",
      text: "Write an engaging LinkedIn post summarizing the latest draft article about memoryOS, highlighting the key features as bullet points."
    },
    {
      title: "Concise Tweet Grounding",
      desc: "Write a short Twitter/X update from your last feed article.",
      text: "Write a concise tweet about the latest article in our feed, adding 1-2 relevant hashtags."
    },
    {
      title: "Instagram Launch Caption",
      desc: "Write a creative Instagram caption matching our latest technology draft.",
      text: "Write a creative Instagram review post about the latest technology article in our database, with engaging hashtags at the bottom."
    }
  ];

  const checkLinkedinStatus = async () => {
    if (!localStorage.getItem('samhita_token')) return;
    try {
      setLinkedinChecking(true);
      const status = await api.auth.getLinkedinStatus();
      setLinkedinConnected(status.connected);
      setLinkedinName(status.name || '');
    } catch (err) {
      console.error("Failed to check LinkedIn status:", err);
    } finally {
      setLinkedinChecking(false);
    }
  };

  useEffect(() => {
    checkLinkedinStatus();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin_success') === 'true') {
      alert("🎉 Successfully connected to LinkedIn!");
      window.history.replaceState({}, document.title, window.location.pathname);
      checkLinkedinStatus();
    } else if (params.get('linkedin_error')) {
      const err = params.get('linkedin_error');
      alert(`⚠️ Failed to connect to LinkedIn: ${err.replace(/_/g, ' ')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnectLinkedin = async () => {
    try {
      const token = localStorage.getItem('samhita_token');
      if (!token) return;
      const res = await api.auth.getLinkedinLoginUrl(token);
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      console.error("Failed to connect LinkedIn:", err);
      alert("Error launching LinkedIn authorization flow.");
    }
  };

  const handleDisconnectLinkedin = async () => {
    if (window.confirm("Are you sure you want to disconnect your LinkedIn profile?")) {
      try {
        await api.auth.disconnectLinkedin();
        setLinkedinConnected(false);
        setLinkedinName('');
        alert("LinkedIn profile disconnected successfully.");
      } catch (err) {
        console.error("Failed to disconnect LinkedIn:", err);
      }
    }
  };

  const handleDirectPublishLinkedin = async (postId) => {
    if (!postId || postId === 'mock_id') {
      alert("Cannot publish mock data directly to LinkedIn. Try generating a real post.");
      return;
    }
    try {
      setPublishingToLinkedin(true);
      const res = await api.publishPostToLinkedin(postId);
      if (res && res.status === 'published') {
        alert("🎉 Successfully published directly to your LinkedIn Feed!");
        if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
      } else {
        alert("LinkedIn posting finished.");
      }
    } catch (err) {
      console.error("Direct posting failed:", err);
      alert("Failed to publish directly: " + (err.response?.data?.detail || err.message));
    } finally {
      setPublishingToLinkedin(false);
    }
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    if (!promptText.trim() || promptRunning) return;

    setPromptRunning(true);
    setPromptResult(null);
    setPromptLogs([]);

    const logMessage = (msg) => {
      setPromptLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    setPromptStep('parsing');
    logMessage("Initializing Prompt Assistant Agent...");
    logMessage(`[Intent Parser Agent] Analyzing user prompt: "${promptText}"`);

    // Run API call in background
    let isRequestDone = false;
    let finalResult = null;

    const apiCallPromise = api.runPromptPipeline(promptText)
      .then((res) => {
        isRequestDone = true;
        finalResult = res;
      })
      .catch((err) => {
        isRequestDone = true;
        finalResult = {
          status: 'error',
          message: err.response?.data?.detail || err.message || 'Unknown network error'
        };
      });

    // Simulate logs stages to show reasoning engine progress
    await new Promise((r) => setTimeout(r, 1500));
    if (!isRequestDone) {
      setPromptStep('grounding');
      logMessage("[Database Grounding Agent] Searching MongoDB collection for matching feed articles...");
      logMessage("[Database Grounding Agent] Parsing and extracting crawled source text for context...");
    }

    await new Promise((r) => setTimeout(r, 2000));
    if (!isRequestDone) {
      setPromptStep('generating');
      logMessage("[Content Tailor Agent] Aligning content to target platform rules & specifications...");
      logMessage("[Content Tailor Agent] Compiling structured JSON layout via Gemini generative API...");
    }

    await new Promise((r) => setTimeout(r, 2000));
    if (!isRequestDone) {
      setPromptStep('saving');
      logMessage("[Publishing Agent] Saving generated post as validation Draft in MongoDB Atlas...");
    }

    await apiCallPromise;

    setPromptStep('done');
    setPromptRunning(false);

    if (finalResult && (finalResult.status === 'success' || finalResult.status === 'partial_success')) {
      setPromptResult(finalResult);
      logMessage("🎉 Prompt-based posting pipeline finished successfully!");
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } else {
      logMessage(`❌ Pipeline terminated: ${finalResult?.message || "Internal Server Error"}`);
      alert("Failed to run prompt assistant: " + (finalResult?.message || "Unknown error"));
    }
  };

  const handleShareClick = (platform, text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("Content copied to clipboard! Opening platform page...");
        if (platform === 'twitter') {
          const encoded = encodeURIComponent(text);
          window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
        } else if (platform === 'linkedin') {
          window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
        } else if (platform === 'instagram') {
          window.open('https://www.instagram.com', '_blank');
        }
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
      });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-primary-400" />
            AI Social Assistant
          </h2>
          <p className="text-xs text-dark-400">Ground your prompt assistant with existing drafts and publish instantly</p>
        </div>

        {/* LinkedIn Connection Status Banner */}
        <div className="bg-dark-900 border border-dark-800 p-3.5 rounded-xl flex items-center justify-between gap-6 shadow-md min-w-[280px]">
          <div className="flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${linkedinConnected ? 'bg-blue-400 animate-pulse' : 'bg-dark-700'}`}></div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-dark-500 block tracking-wider">LinkedIn Direct Posting</span>
              <span className="text-xs font-bold text-white">{linkedinConnected ? linkedinName : 'Not Connected'}</span>
            </div>
          </div>
          {linkedinConnected ? (
            <button 
              onClick={handleDisconnectLinkedin} 
              className="text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={handleConnectLinkedin} 
              className="text-[10px] bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer shadow-sm"
            >
              Connect Profile
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Left Columns (3 span): Textarea Canvas and templates */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-md space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Prompt</h3>
              <p className="text-xs text-dark-500 leading-normal">
                Instruct the reasoning agent to write. You can refer to feed content or drafts (e.g. *"Summarize our latest post"*).
              </p>
            </div>

            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  disabled={promptRunning}
                  placeholder='e.g., "Hey write a linkedin post about our latest memoryOS draft with key insights..."'
                  className="w-full h-40 bg-dark-950 border border-dark-800 hover:border-dark-750 focus:border-primary-500 text-xs text-white p-4 rounded-xl focus:outline-none transition-all disabled:opacity-50 resize-none placeholder:text-dark-600 font-medium leading-relaxed shadow-inner"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-dark-500 font-bold">Grounded with MongoDB drafts & RSS sources</span>
                <button
                  type="submit"
                  disabled={promptRunning || !promptText.trim()}
                  className={`py-2.5 px-6 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                    promptRunning || !promptText.trim()
                      ? 'bg-dark-800 text-dark-500 border border-dark-700 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-500 text-white hover:shadow-primary-600/10 hover:-translate-y-0.5'
                  }`}
                >
                  {promptRunning ? (
                    <>
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      Executing Pipeline...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Generate & Publish Draft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Suggestions / Templates */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-dark-500 block">Need inspiration? Try suggestions</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {promptSuggestions.map((item, index) => (
                <div 
                  key={index}
                  onClick={() => !promptRunning && setPromptText(item.text)}
                  className={`bg-dark-900 border border-dark-800 hover:border-primary-500/40 p-4.5 rounded-xl shadow-sm transition-all duration-200 text-left group cursor-pointer ${
                    promptRunning ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <h4 className="text-xs font-bold text-white flex items-center justify-between">
                    {item.title}
                    <ArrowRight className="h-3 w-3 text-dark-500 group-hover:text-primary-400 transition-colors group-hover:translate-x-0.5" />
                  </h4>
                  <p className="text-[10px] text-dark-500 mt-2 font-medium leading-relaxed leading-normal group-hover:text-dark-400">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Columns (2 span): Output Preview & Processing Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Timeline processing logs */}
          {promptRunning && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5 shadow-md space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary-400" />
                Reasoning Console Log
              </h3>
              
              <div className="bg-dark-950 border border-dark-850 p-4 rounded-xl font-mono text-[10px] text-dark-300 space-y-2 max-h-44 overflow-y-auto">
                {promptLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-dark-500 select-none">&gt;</span>
                    <span className={log.includes('successfully') ? 'text-emerald-400 font-semibold' : ''}>{log}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-primary-400 animate-pulse mt-1">
                  <Loader className="h-2.5 w-2.5 animate-spin" />
                  <span>PromptAgent active...</span>
                </div>
              </div>
            </div>
          )}

          {/* Generated Result Preview */}
          {promptResult && promptResult.post ? (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-md space-y-5 animate-fade-in relative overflow-hidden">
              
              {/* Premium Top Bar */}
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-primary-400 tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Grounded Platform Copy
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
                  Published Draft
                </span>
              </div>

              {/* device preview frame */}
              <div className="bg-dark-950 border border-dark-850 rounded-xl p-4.5 space-y-3.5 relative">
                {/* Meta platform info */}
                <div className="flex items-center justify-between text-[10px] text-dark-500 font-bold border-b border-dark-850/40 pb-2">
                  <span className="capitalize">Target: {promptResult.intent?.platform || 'General'}</span>
                  <span>ID: {promptResult.post_id?.substring(0, 8)}...</span>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-white leading-snug">{promptResult.post.title}</h4>
                  <div className="text-[11px] text-dark-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto pr-1">
                    {promptResult.post.content}
                  </div>
                </div>
              </div>

              {/* Share & Direct Actions */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-extrabold text-dark-500 tracking-wider block">Publishing Intents</span>
                <div className="grid grid-cols-3 gap-3">
                  
                  {linkedinConnected ? (
                    <button
                      onClick={() => handleDirectPublishLinkedin(promptResult.post.id || promptResult.post_id)}
                      disabled={publishingToLinkedin}
                      className="py-2.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[10px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50"
                    >
                      {publishingToLinkedin ? (
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>LI Direct Post</span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleShareClick('linkedin', promptResult.post.content)}
                      className="py-2.5 px-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 hover:text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center justify-center"
                    >
                      LinkedIn Copy
                    </button>
                  )}

                  <button
                    onClick={() => handleShareClick('twitter', promptResult.post.content)}
                    className="py-2.5 px-2 bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/20 text-sky-400 hover:text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  >
                    Twitter/X
                  </button>

                  <button
                    onClick={() => handleShareClick('instagram', promptResult.post.content)}
                    className="py-2.5 px-2 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-500/20 text-pink-400 hover:text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  >
                    Instagram
                  </button>

                </div>
              </div>

            </div>
          ) : (
            !promptRunning && (
              <div className="bg-dark-950 border border-dashed border-dark-800 rounded-xl p-12 text-center text-dark-500 select-none min-h-[300px] flex flex-col justify-center items-center">
                <FileText className="h-10 w-10 text-dark-700 mb-3" />
                <p className="text-xs font-bold text-dark-400">Assistant workspace idle.</p>
                <p className="text-[11px] text-dark-500 max-w-[200px] mt-1 leading-relaxed">
                  Submit a prompt in the canvas to see generated platform-tailored copy.
                </p>
              </div>
            )
          )}

        </div>

      </div>

    </div>
  );
}
